import express from 'express'
import TradingAccount from '../models/TradingAccount.js'
import AccountType from '../models/AccountType.js'
import Wallet from '../models/Wallet.js'
import Transaction from '../models/Transaction.js'
import bcrypt from 'bcryptjs'

const router = express.Router()

// GET /api/trading-accounts/user/:userId - Get user's trading accounts
router.get('/user/:userId', async (req, res) => {
  try {
    const accounts = await TradingAccount.find({ userId: req.params.userId })
      .populate('accountTypeId', 'name description minDeposit leverage exposureLimit isDemo')
      .sort({ createdAt: -1 })
    res.json({ success: true, accounts })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching accounts', error: error.message })
  }
})

// GET /api/trading-accounts/all - Get all trading accounts (admin)
router.get('/all', async (req, res) => {
  try {
    const accounts = await TradingAccount.find()
      .populate('userId', 'firstName email')
      .populate('accountTypeId', 'name')
      .sort({ createdAt: -1 })
    res.json({ accounts })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching accounts', error: error.message })
  }
})

// POST /api/trading-accounts - Create trading account
router.post('/', async (req, res) => {
  try {
    const { userId, accountTypeId, pin } = req.body

    // Validate PIN (4 digits)
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ message: 'PIN must be exactly 4 digits' })
    }

    // Get account type
    const accountType = await AccountType.findById(accountTypeId)
    if (!accountType || !accountType.isActive) {
      return res.status(400).json({ message: 'Invalid or inactive account type' })
    }

    // Get or create wallet (no balance check needed - accounts open with zero balance)
    let wallet = await Wallet.findOne({ userId })
    if (!wallet) {
      wallet = new Wallet({ userId, balance: 0 })
      await wallet.save()
    }

    // Generate unique account ID
    const accountId = await TradingAccount.generateAccountId()

    // Determine initial balance - Demo accounts get auto-funded with non-refundable balance
    const initialBalance = accountType.isDemo ? (accountType.demoBalance || 10000) : 0

    // Create trading account
    const tradingAccount = new TradingAccount({
      userId,
      accountTypeId,
      accountId,
      pin,
      balance: initialBalance,
      credit: accountType.isDemo ? initialBalance : 0, // Demo balance is non-refundable (credit)
      leverage: accountType.leverage,
      exposureLimit: accountType.exposureLimit,
      isDemo: accountType.isDemo || false
    })

    await tradingAccount.save()

    // Log demo account creation
    if (accountType.isDemo) {
      await Transaction.create({
        userId,
        type: 'Demo_Credit',
        amount: initialBalance,
        paymentMethod: 'System',
        tradingAccountId: tradingAccount._id,
        tradingAccountName: tradingAccount.accountId,
        status: 'Completed',
        transactionRef: `DEMO${Date.now()}`,
        notes: 'Non-refundable demo account credit'
      })
    }

    res.status(201).json({ 
      success: true,
      message: accountType.isDemo 
        ? `Demo account created with $${initialBalance} non-refundable balance` 
        : 'Trading account created successfully', 
      account: {
        _id: tradingAccount._id,
        accountId: tradingAccount.accountId,
        balance: tradingAccount.balance,
        leverage: tradingAccount.leverage,
        status: tradingAccount.status,
        isDemo: accountType.isDemo || false
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating account', error: error.message })
  }
})

// POST /api/trading-accounts/:id/verify-pin - Verify PIN
router.post('/:id/verify-pin', async (req, res) => {
  try {
    const { pin } = req.body
    const account = await TradingAccount.findById(req.params.id)
    if (!account) {
      return res.status(404).json({ message: 'Account not found' })
    }
    const isValid = await account.verifyPin(pin)
    res.json({ valid: isValid })
  } catch (error) {
    res.status(500).json({ message: 'Error verifying PIN', error: error.message })
  }
})

// PUT /api/trading-accounts/:id/change-pin - Change PIN
router.put('/:id/change-pin', async (req, res) => {
  try {
    const { currentPin, newPin } = req.body
    const account = await TradingAccount.findById(req.params.id)
    if (!account) {
      return res.status(404).json({ message: 'Account not found' })
    }

    // Verify current PIN
    const isValid = await account.verifyPin(currentPin)
    if (!isValid) {
      return res.status(400).json({ message: 'Current PIN is incorrect' })
    }

    // Validate new PIN
    if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      return res.status(400).json({ message: 'New PIN must be exactly 4 digits' })
    }

    account.pin = newPin
    await account.save()

    res.json({ message: 'PIN changed successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Error changing PIN', error: error.message })
  }
})

// PUT /api/trading-accounts/:id/admin-update - Admin update account
router.put('/:id/admin-update', async (req, res) => {
  try {
    const { leverage, exposureLimit, status } = req.body
    const account = await TradingAccount.findByIdAndUpdate(
      req.params.id,
      { leverage, exposureLimit, status },
      { new: true }
    )
    if (!account) {
      return res.status(404).json({ message: 'Account not found' })
    }
    res.json({ message: 'Account updated', account })
  } catch (error) {
    res.status(500).json({ message: 'Error updating account', error: error.message })
  }
})

// PUT /api/trading-accounts/:id/reset-pin - Admin reset PIN
router.put('/:id/reset-pin', async (req, res) => {
  try {
    const { newPin } = req.body
    if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      return res.status(400).json({ message: 'PIN must be exactly 4 digits' })
    }

    const account = await TradingAccount.findById(req.params.id)
    if (!account) {
      return res.status(404).json({ message: 'Account not found' })
    }

    account.pin = newPin
    await account.save()

    res.json({ message: 'PIN reset successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Error resetting PIN', error: error.message })
  }
})

// POST /api/trading-accounts/:id/transfer - Transfer funds between Main Wallet and Account Wallet
router.post('/:id/transfer', async (req, res) => {
  try {
    const { userId, amount, pin, direction, skipPinVerification } = req.body

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' })
    }

    // Get trading account with account type
    const account = await TradingAccount.findById(req.params.id).populate('accountTypeId')
    if (!account) {
      return res.status(404).json({ message: 'Account not found' })
    }

    // Verify PIN only if not skipped
    if (!skipPinVerification) {
      if (!pin || pin.length !== 4) {
        return res.status(400).json({ message: 'Invalid PIN' })
      }
      const isValidPin = await account.verifyPin(pin)
      if (!isValidPin) {
        return res.status(400).json({ message: 'Incorrect PIN' })
      }
    }

    // Check account status
    if (account.status !== 'Active') {
      return res.status(400).json({ message: 'Account is not active' })
    }

    // Get main wallet
    let wallet = await Wallet.findOne({ userId })
    if (!wallet) {
      wallet = new Wallet({ userId, balance: 0 })
      await wallet.save()
    }

    if (direction === 'deposit') {
      // Transfer from Main Wallet to Account Wallet
      if (wallet.balance < amount) {
        return res.status(400).json({ message: 'Insufficient wallet balance' })
      }

      // Check minimum deposit for first deposit to trading account
      if (account.balance === 0 && account.accountTypeId?.minDeposit) {
        const minDeposit = account.accountTypeId.minDeposit
        if (amount < minDeposit) {
          return res.status(400).json({ 
            message: `Minimum first deposit for ${account.accountTypeId.name} account is $${minDeposit}` 
          })
        }
      }

      wallet.balance -= amount
      account.balance += amount
      
      await wallet.save()
      await account.save()

      // Log transaction
      await Transaction.create({
        userId,
        type: 'Transfer_To_Account',
        amount,
        paymentMethod: 'Internal',
        tradingAccountId: account._id,
        tradingAccountName: account.accountId,
        status: 'Completed',
        transactionRef: `TRF${Date.now()}`
      })

      res.json({ 
        message: 'Funds transferred to account successfully',
        walletBalance: wallet.balance,
        accountBalance: account.balance
      })
    } else if (direction === 'withdraw') {
      // Transfer from Account Wallet to Main Wallet
      if (account.balance < amount) {
        return res.status(400).json({ message: 'Insufficient account balance' })
      }

      account.balance -= amount
      wallet.balance += amount
      
      await account.save()
      await wallet.save()

      // Log transaction
      await Transaction.create({
        userId,
        type: 'Transfer_From_Account',
        amount,
        paymentMethod: 'Internal',
        tradingAccountId: account._id,
        tradingAccountName: account.accountId,
        status: 'Completed',
        transactionRef: `TRF${Date.now()}`
      })

      res.json({ 
        message: 'Funds withdrawn to main wallet successfully',
        walletBalance: wallet.balance,
        accountBalance: account.balance
      })
    } else {
      return res.status(400).json({ message: 'Invalid transfer direction' })
    }
  } catch (error) {
    res.status(500).json({ message: 'Error transferring funds', error: error.message })
  }
})

// POST /api/trading-accounts/account-transfer - Transfer between trading accounts
router.post('/account-transfer', async (req, res) => {
  try {
    const { userId, fromAccountId, toAccountId, amount, pin, skipPinVerification } = req.body

    if (!fromAccountId || !toAccountId) {
      return res.status(400).json({ message: 'Both source and target accounts are required' })
    }

    if (fromAccountId === toAccountId) {
      return res.status(400).json({ message: 'Cannot transfer to the same account' })
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid transfer amount' })
    }

    // Get source account
    const fromAccount = await TradingAccount.findById(fromAccountId)
    if (!fromAccount) {
      return res.status(404).json({ message: 'Source account not found' })
    }

    // Verify ownership
    if (fromAccount.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized access to source account' })
    }

    // Verify PIN if required
    if (!skipPinVerification) {
      const isPinValid = await bcrypt.compare(pin, fromAccount.pin)
      if (!isPinValid) {
        return res.status(401).json({ message: 'Invalid PIN' })
      }
    }

    // Check source account status and balance
    if (fromAccount.status !== 'Active') {
      return res.status(400).json({ message: 'Source account is not active' })
    }

    if (fromAccount.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance in source account' })
    }

    // Get target account
    const toAccount = await TradingAccount.findById(toAccountId)
    if (!toAccount) {
      return res.status(404).json({ message: 'Target account not found' })
    }

    // Verify target account ownership
    if (toAccount.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized access to target account' })
    }

    if (toAccount.status !== 'Active') {
      return res.status(400).json({ message: 'Target account is not active' })
    }

    // Perform transfer
    fromAccount.balance -= amount
    toAccount.balance += amount

    await fromAccount.save()
    await toAccount.save()

    // Log transaction for sender (debit)
    await Transaction.create({
      userId,
      type: 'Account_Transfer_Out',
      amount,
      paymentMethod: 'Internal',
      tradingAccountId: fromAccount._id,
      tradingAccountName: fromAccount.accountId,
      toTradingAccountId: toAccount._id,
      toTradingAccountName: toAccount.accountId,
      status: 'Completed',
      transactionRef: `ACCTRF${Date.now()}`
    })

    // Log transaction for receiver (credit)
    await Transaction.create({
      userId,
      type: 'Account_Transfer_In',
      amount,
      paymentMethod: 'Internal',
      tradingAccountId: toAccount._id,
      tradingAccountName: toAccount.accountId,
      fromTradingAccountId: fromAccount._id,
      fromTradingAccountName: fromAccount.accountId,
      status: 'Completed',
      transactionRef: `ACCTRF${Date.now()}`
    })

    console.log(`[Account Transfer] ${fromAccount.accountId} -> ${toAccount.accountId}: $${amount}`)

    res.json({
      success: true,
      message: `$${amount} transferred from ${fromAccount.accountId} to ${toAccount.accountId}`,
      fromAccountBalance: fromAccount.balance,
      toAccountBalance: toAccount.balance
    })
  } catch (error) {
    console.error('Account transfer error:', error)
    res.status(500).json({ message: 'Error transferring funds', error: error.message })
  }
})

// PUT /api/trading-accounts/:id/archive - Archive a trading account
router.put('/:id/archive', async (req, res) => {
  try {
    const { forceArchive } = req.body || {}
    const account = await TradingAccount.findById(req.params.id)
    
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' })
    }

    // Check if account has open trades
    const Trade = (await import('../models/Trade.js')).default
    const openTrades = await Trade.countDocuments({ tradingAccountId: account._id, status: 'OPEN' })
    
    if (openTrades > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot archive account with ${openTrades} open trade(s). Please close all trades first.` 
      })
    }

    // Check if account has balance - require withdrawal first
    if (account.balance > 0 && !forceArchive) {
      return res.status(400).json({ 
        success: false, 
        requiresWithdrawal: true,
        balance: account.balance,
        message: `Please withdraw $${account.balance.toFixed(2)} from this account before archiving.` 
      })
    }

    // Archive the account
    account.status = 'Archived'
    await account.save()

    res.json({ 
      success: true, 
      message: 'Account archived successfully',
      account
    })
  } catch (error) {
    console.error('Archive account error:', error)
    res.status(500).json({ success: false, message: 'Error archiving account', error: error.message })
  }
})

// PUT /api/trading-accounts/:id/unarchive - Restore an archived account
router.put('/:id/unarchive', async (req, res) => {
  try {
    const account = await TradingAccount.findById(req.params.id)
    
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' })
    }

    if (account.status !== 'Archived') {
      return res.status(400).json({ success: false, message: 'Account is not archived' })
    }

    // Restore the account
    account.status = 'Active'
    await account.save()

    res.json({ 
      success: true, 
      message: 'Account restored successfully',
      account
    })
  } catch (error) {
    console.error('Unarchive account error:', error)
    res.status(500).json({ success: false, message: 'Error restoring account', error: error.message })
  }
})

// DELETE /api/trading-accounts/:id - Permanently delete an account
router.delete('/:id', async (req, res) => {
  try {
    const account = await TradingAccount.findById(req.params.id)
    
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' })
    }

    // Only allow deletion of archived accounts
    if (account.status !== 'Archived') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only archived accounts can be permanently deleted. Archive the account first.' 
      })
    }

    // Check for any trades
    const Trade = (await import('../models/Trade.js')).default
    const tradeCount = await Trade.countDocuments({ tradingAccountId: account._id })
    
    if (tradeCount > 0) {
      // Delete all trades for this account
      await Trade.deleteMany({ tradingAccountId: account._id })
    }

    // Delete the account
    await TradingAccount.findByIdAndDelete(req.params.id)

    res.json({ 
      success: true, 
      message: 'Account deleted permanently'
    })
  } catch (error) {
    console.error('Delete account error:', error)
    res.status(500).json({ success: false, message: 'Error deleting account', error: error.message })
  }
})

// POST /api/trading-accounts/:id/reset-demo - Reset demo account to initial balance
router.post('/:id/reset-demo', async (req, res) => {
  try {
    const account = await TradingAccount.findById(req.params.id).populate('accountTypeId')
    
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' })
    }

    // Check if this is a demo account
    if (!account.isDemo) {
      return res.status(400).json({ success: false, message: 'Only demo accounts can be reset' })
    }

    // Close all open trades for this account
    const Trade = (await import('../models/Trade.js')).default
    await Trade.updateMany(
      { tradingAccountId: account._id, status: 'OPEN' },
      { 
        status: 'CLOSED', 
        closedBy: 'DEMO_RESET',
        closedAt: new Date(),
        realizedPnl: 0
      }
    )

    // Get initial demo balance from account type
    const initialBalance = account.accountTypeId?.demoBalance || 10000

    // Reset account balance
    account.balance = initialBalance
    account.credit = initialBalance
    await account.save()

    // Log the reset
    await Transaction.create({
      userId: account.userId,
      type: 'Demo_Reset',
      amount: initialBalance,
      paymentMethod: 'System',
      tradingAccountId: account._id,
      tradingAccountName: account.accountId,
      status: 'Completed',
      transactionRef: `DEMORESET${Date.now()}`,
      notes: 'Demo account reset to initial balance'
    })

    res.json({ 
      success: true, 
      message: `Demo account reset successfully. Balance: $${initialBalance}`,
      balance: initialBalance
    })
  } catch (error) {
    console.error('Demo reset error:', error)
    res.status(500).json({ success: false, message: 'Error resetting demo account', error: error.message })
  }
})

export default router
