import express from 'express'
import Wallet from '../models/Wallet.js'
import Transaction from '../models/Transaction.js'
import TradingAccount from '../models/TradingAccount.js'
import User from '../models/User.js'
import AdminWallet from '../models/AdminWallet.js'
import AdminWalletTransaction from '../models/AdminWalletTransaction.js'
import Bonus from '../models/Bonus.js'
import UserBonus from '../models/UserBonus.js'
import { sendTemplateEmail } from '../services/emailService.js'
import EmailSettings from '../models/EmailSettings.js'

const router = express.Router()

// GET /api/wallet/:userId - Get user wallet
router.get('/:userId', async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ userId: req.params.userId })
    if (!wallet) {
      wallet = new Wallet({ userId: req.params.userId, balance: 0 })
      await wallet.save()
    }
    res.json({ wallet })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching wallet', error: error.message })
  }
})

// POST /api/wallet/deposit - Create deposit request
router.post('/deposit', async (req, res) => {
  try {
    const { userId, amount, paymentMethod, transactionRef, screenshot } = req.body

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' })
    }

    // Get or create wallet
    let wallet = await Wallet.findOne({ userId })
    if (!wallet) {
      wallet = new Wallet({ userId, balance: 0 })
      await wallet.save()
    }

    // Check if this is user's first deposit
    const userTransactions = await Transaction.find({ userId, type: 'Deposit', status: 'Approved' })
    const isFirstDeposit = userTransactions.length === 0

    // Calculate applicable bonus
    let bonusAmount = 0
    let applicableBonus = null

    try {
      // Get all bonuses (simplified query like in bonus routes)
      const bonuses = await Bonus.find({}).sort({ createdAt: -1 })
      console.log('Deposit bonus calculation - found', bonuses.length, 'bonuses, isFirstDeposit:', isFirstDeposit)

      // Find the best applicable bonus
      for (const bonus of bonuses) {
        // Check if bonus is active
        if (bonus.status !== 'ACTIVE') continue
        
        // Check bonus type matches first deposit status
        if (isFirstDeposit && bonus.type !== 'FIRST_DEPOSIT') continue
        if (!isFirstDeposit && bonus.type === 'FIRST_DEPOSIT') continue
        
        if (amount >= bonus.minDeposit) {
          if (bonus.usageLimit && bonus.usedCount >= bonus.usageLimit) {
            continue // Skip if usage limit reached
          }

          let calculatedBonus = 0
          if (bonus.bonusType === 'PERCENTAGE') {
            calculatedBonus = amount * (bonus.bonusValue / 100)
            if (bonus.maxBonus && calculatedBonus > bonus.maxBonus) {
              calculatedBonus = bonus.maxBonus
            }
          } else {
            calculatedBonus = bonus.bonusValue
          }

          if (calculatedBonus > bonusAmount) {
            bonusAmount = calculatedBonus
            applicableBonus = bonus
            console.log('Found applicable bonus:', bonus.name, 'bonusAmount:', calculatedBonus)
          }
        }
      }
    } catch (bonusError) {
      console.error('Bonus calculation error:', bonusError)
      // Continue without bonus if calculation fails
    }

    console.log('Final deposit bonus:', { bonusAmount, applicableBonus: applicableBonus?.name, totalAmount: amount + bonusAmount })

    // Create transaction
    const transaction = new Transaction({
      userId,
      walletId: wallet._id,
      type: 'Deposit',
      amount,
      paymentMethod,
      transactionRef,
      screenshot,
      status: 'Pending',
      bonusAmount,
      totalAmount: amount + bonusAmount,
      bonusId: applicableBonus?._id || null
    })
    await transaction.save()

    // Update pending deposits
    wallet.pendingDeposits += amount
    await wallet.save()

    // Send deposit pending email
    try {
      const user = await User.findById(userId)
      if (user && user.email) {
        const settings = await EmailSettings.findOne()
        await sendTemplateEmail('deposit_pending', user.email, {
          firstName: user.firstName || user.email.split('@')[0],
          amount: amount.toFixed(2),
          transactionId: transaction._id.toString(),
          paymentMethod: paymentMethod || 'Bank Transfer',
          date: new Date().toLocaleString(),
          platformName: settings?.platformName || 'Pipxacpital',
          supportEmail: settings?.supportEmail || 'support@Pipxacpital.com',
          year: new Date().getFullYear().toString()
        })
      }
    } catch (emailError) {
      console.error('Error sending deposit pending email:', emailError)
    }

    res.status(201).json({ 
      message: 'Deposit request submitted', 
      transaction,
      bonusInfo: {
        bonusAmount,
        applicableBonus,
        totalAmount: amount + bonusAmount
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Error creating deposit', error: error.message })
  }
})

// POST /api/wallet/withdraw - Create withdrawal request
router.post('/withdraw', async (req, res) => {
  try {
    const { userId, amount, paymentMethod, bankAccountId, bankAccountDetails } = req.body

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' })
    }

    // Get wallet
    const wallet = await Wallet.findOne({ userId })
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' })
    }

    // Check balance
    if (wallet.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' })
    }

    // Create transaction with bank account details
    const transaction = new Transaction({
      userId,
      walletId: wallet._id,
      type: 'Withdrawal',
      amount,
      paymentMethod,
      status: 'Pending',
      bankAccountId,
      bankAccountDetails
    })
    await transaction.save()

    // Deduct from balance and add to pending
    wallet.balance -= amount
    wallet.pendingWithdrawals += amount
    await wallet.save()

    // Send withdrawal pending email
    try {
      const user = await User.findById(userId)
      if (user && user.email) {
        const settings = await EmailSettings.findOne()
        await sendTemplateEmail('withdrawal_pending', user.email, {
          firstName: user.firstName || user.email.split('@')[0],
          amount: amount.toFixed(2),
          transactionId: transaction._id.toString(),
          paymentMethod: paymentMethod || 'Bank Transfer',
          date: new Date().toLocaleString(),
          platformName: settings?.platformName || 'Pipxacpital',
          supportEmail: settings?.supportEmail || 'support@Pipxacpital.com',
          year: new Date().getFullYear().toString()
        })
      }
    } catch (emailError) {
      console.error('Error sending withdrawal pending email:', emailError)
    }

    res.status(201).json({ message: 'Withdrawal request submitted', transaction })
  } catch (error) {
    res.status(500).json({ message: 'Error creating withdrawal', error: error.message })
  }
})

// POST /api/wallet/transfer-to-trading - Transfer from wallet to trading account
router.post('/transfer-to-trading', async (req, res) => {
  try {
    const { userId, tradingAccountId, amount } = req.body

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' })
    }

    // Get wallet
    const wallet = await Wallet.findOne({ userId })
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' })
    }

    // Check wallet balance
    if (wallet.balance < amount) {
      return res.status(400).json({ message: 'Insufficient wallet balance' })
    }

    // Get trading account
    const tradingAccount = await TradingAccount.findById(tradingAccountId)
    if (!tradingAccount) {
      return res.status(404).json({ message: 'Trading account not found' })
    }

    // Verify ownership
    if (tradingAccount.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    // Transfer funds
    wallet.balance -= amount
    tradingAccount.balance += amount

    await wallet.save()
    await tradingAccount.save()

    res.json({ 
      message: 'Funds transferred successfully',
      walletBalance: wallet.balance,
      tradingAccountBalance: tradingAccount.balance
    })
  } catch (error) {
    res.status(500).json({ message: 'Error transferring funds', error: error.message })
  }
})

// POST /api/wallet/transfer-from-trading - Transfer from trading account to wallet
router.post('/transfer-from-trading', async (req, res) => {
  try {
    const { userId, tradingAccountId, amount } = req.body

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' })
    }

    // Get trading account
    const tradingAccount = await TradingAccount.findById(tradingAccountId)
    if (!tradingAccount) {
      return res.status(404).json({ message: 'Trading account not found' })
    }

    // Verify ownership
    if (tradingAccount.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    // Check trading account balance
    if (tradingAccount.balance < amount) {
      return res.status(400).json({ message: 'Insufficient trading account balance' })
    }

    // Get or create wallet
    let wallet = await Wallet.findOne({ userId })
    if (!wallet) {
      wallet = new Wallet({ userId, balance: 0 })
    }

    // Transfer funds
    tradingAccount.balance -= amount
    wallet.balance += amount

    await tradingAccount.save()
    await wallet.save()

    res.json({ 
      message: 'Funds transferred successfully',
      walletBalance: wallet.balance,
      tradingAccountBalance: tradingAccount.balance
    })
  } catch (error) {
    res.status(500).json({ message: 'Error transferring funds', error: error.message })
  }
})

// GET /api/wallet/transactions/:userId - Get user transactions
router.get('/transactions/:userId', async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
    res.json({ transactions })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transactions', error: error.message })
  }
})

// GET /api/wallet/transactions/all - Get all transactions (admin)
router.get('/admin/transactions', async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
    res.json({ transactions })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transactions', error: error.message })
  }
})

// PUT /api/wallet/admin/approve/:id - Approve transaction (admin)
router.put('/admin/approve/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' })
    }

    if (transaction.status !== 'Pending') {
      return res.status(400).json({ message: 'Transaction already processed' })
    }

    const wallet = await Wallet.findById(transaction.walletId)

    if (transaction.type === 'Deposit') {
      // Add deposit amount + bonus to wallet balance
      const totalToAdd = transaction.amount + (transaction.bonusAmount || 0)
      console.log('Approving deposit - amount:', transaction.amount, 'bonus:', transaction.bonusAmount, 'totalToAdd:', totalToAdd)
      wallet.balance += totalToAdd
      if (wallet.pendingDeposits) wallet.pendingDeposits -= transaction.amount
    } else {
      if (wallet.pendingWithdrawals) wallet.pendingWithdrawals -= transaction.amount
    }

    transaction.status = 'Approved'
    transaction.processedAt = new Date()

    await wallet.save()
    await transaction.save()

    // Activate bonus if this is a deposit with bonus
    if (transaction.type === 'Deposit' && transaction.bonusAmount > 0 && transaction.bonusId) {
      try {
        // Get the bonus to use its actual wager requirement and duration
        const bonus = await Bonus.findById(transaction.bonusId)
        const wagerMultiplier = bonus?.wagerRequirement || 30
        const durationDays = bonus?.duration || 30

        const userBonus = new UserBonus({
          userId: transaction.userId,
          bonusId: transaction.bonusId,
          depositId: transaction._id,
          bonusAmount: transaction.bonusAmount,
          wagerRequirement: wagerMultiplier * transaction.bonusAmount,
          remainingWager: wagerMultiplier * transaction.bonusAmount,
          status: 'ACTIVE',
          activatedAt: new Date(),
          expiresAt: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
          maxWithdrawal: bonus?.maxWithdrawal || null
        })
        await userBonus.save()

        // Update bonus usage count
        await Bonus.findByIdAndUpdate(transaction.bonusId, { $inc: { usedCount: 1 } })

        console.log(`Bonus activated: $${transaction.bonusAmount} (${wagerMultiplier}x wager) for user ${transaction.userId}`)
      } catch (bonusError) {
        console.error('Error activating bonus:', bonusError)
        // Don't fail the transaction if bonus activation fails
      }
    }

    // Send email notification
    try {
      const user = await User.findById(transaction.userId)
      if (user && user.email) {
        const settings = await EmailSettings.findOne()
        const templateSlug = transaction.type === 'Deposit' ? 'deposit_success' : 'withdrawal_success'
        await sendTemplateEmail(templateSlug, user.email, {
          firstName: user.firstName || user.email.split('@')[0],
          amount: transaction.amount.toFixed(2),
          transactionId: transaction._id.toString(),
          paymentMethod: transaction.paymentMethod || 'Wallet',
          date: new Date().toLocaleString(),
          newBalance: wallet.balance.toFixed(2),
          platformName: settings?.platformName || 'Pipxacpital',
          supportEmail: settings?.supportEmail || 'support@Pipxacpital.com',
          year: new Date().getFullYear().toString()
        })
      }
    } catch (emailError) {
      console.error('Error sending transaction email:', emailError)
    }

    res.json({ message: 'Transaction approved', transaction })
  } catch (error) {
    res.status(500).json({ message: 'Error approving transaction', error: error.message })
  }
})

// PUT /api/wallet/admin/reject/:id - Reject transaction (admin)
router.put('/admin/reject/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' })
    }

    if (transaction.status !== 'Pending') {
      return res.status(400).json({ message: 'Transaction already processed' })
    }

    const wallet = await Wallet.findById(transaction.walletId)

    if (transaction.type === 'Deposit') {
      if (wallet.pendingDeposits) wallet.pendingDeposits -= transaction.amount
    } else {
      // Refund withdrawal amount
      wallet.balance += transaction.amount
      if (wallet.pendingWithdrawals) wallet.pendingWithdrawals -= transaction.amount
    }

    transaction.status = 'Rejected'
    transaction.processedAt = new Date()

    await wallet.save()
    await transaction.save()

    res.json({ message: 'Transaction rejected', transaction })
  } catch (error) {
    res.status(500).json({ message: 'Error rejecting transaction', error: error.message })
  }
})

// PUT /api/wallet/transaction/:id/approve - Approve transaction (admin)
router.put('/transaction/:id/approve', async (req, res) => {
  try {
    const { adminRemarks } = req.body
    const transaction = await Transaction.findById(req.params.id)
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' })
    }

    if (transaction.status !== 'Pending') {
      return res.status(400).json({ message: 'Transaction already processed' })
    }

    const wallet = await Wallet.findById(transaction.walletId)

    if (transaction.type === 'Deposit') {
      // Add deposit amount + bonus to wallet balance
      const totalToAdd = transaction.amount + (transaction.bonusAmount || 0)
      console.log('Approving deposit - amount:', transaction.amount, 'bonus:', transaction.bonusAmount, 'totalToAdd:', totalToAdd)
      wallet.balance += totalToAdd
      wallet.pendingDeposits -= transaction.amount
    } else {
      wallet.pendingWithdrawals -= transaction.amount
    }

    transaction.status = 'Approved'
    transaction.adminRemarks = adminRemarks || ''
    transaction.processedAt = new Date()

    await wallet.save()
    await transaction.save()

    // Activate bonus if this is a deposit with bonus
    if (transaction.type === 'Deposit' && transaction.bonusAmount > 0 && transaction.bonusId) {
      try {
        const bonus = await Bonus.findById(transaction.bonusId)
        const wagerMultiplier = bonus?.wagerRequirement || 30
        const durationDays = bonus?.duration || 30

        const userBonus = new UserBonus({
          userId: transaction.userId,
          bonusId: transaction.bonusId,
          depositId: transaction._id,
          bonusAmount: transaction.bonusAmount,
          wagerRequirement: wagerMultiplier * transaction.bonusAmount,
          remainingWager: wagerMultiplier * transaction.bonusAmount,
          status: 'ACTIVE',
          activatedAt: new Date(),
          expiresAt: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
          maxWithdrawal: bonus?.maxWithdrawal || null
        })
        await userBonus.save()

        await Bonus.findByIdAndUpdate(transaction.bonusId, { $inc: { usedCount: 1 } })
        console.log(`Bonus activated: $${transaction.bonusAmount} for user ${transaction.userId}`)
      } catch (bonusError) {
        console.error('Error activating bonus:', bonusError)
      }
    }

    // Send email notification
    try {
      const user = await User.findById(transaction.userId)
      if (user && user.email) {
        const settings = await EmailSettings.findOne()
        const templateSlug = transaction.type === 'Deposit' ? 'deposit_success' : 'withdrawal_success'
        await sendTemplateEmail(templateSlug, user.email, {
          firstName: user.firstName || user.email.split('@')[0],
          amount: transaction.amount.toFixed(2),
          transactionId: transaction._id.toString(),
          paymentMethod: transaction.paymentMethod || 'Wallet',
          date: new Date().toLocaleString(),
          newBalance: wallet.balance.toFixed(2),
          platformName: settings?.platformName || 'Pipxacpital',
          supportEmail: settings?.supportEmail || 'support@Pipxacpital.com',
          year: new Date().getFullYear().toString()
        })
      }
    } catch (emailError) {
      console.error('Error sending transaction email:', emailError)
    }

    res.json({ message: 'Transaction approved', transaction })
  } catch (error) {
    res.status(500).json({ message: 'Error approving transaction', error: error.message })
  }
})

// PUT /api/wallet/transaction/:id/reject - Reject transaction (admin)
router.put('/transaction/:id/reject', async (req, res) => {
  try {
    const { adminRemarks } = req.body
    const transaction = await Transaction.findById(req.params.id)
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' })
    }

    if (transaction.status !== 'Pending') {
      return res.status(400).json({ message: 'Transaction already processed' })
    }

    const wallet = await Wallet.findById(transaction.walletId)

    if (transaction.type === 'Deposit') {
      wallet.pendingDeposits -= transaction.amount
    } else {
      // Refund withdrawal amount
      wallet.balance += transaction.amount
      wallet.pendingWithdrawals -= transaction.amount
    }

    transaction.status = 'Rejected'
    transaction.adminRemarks = adminRemarks || ''
    transaction.processedAt = new Date()

    await wallet.save()
    await transaction.save()

    res.json({ message: 'Transaction rejected', transaction })
  } catch (error) {
    res.status(500).json({ message: 'Error rejecting transaction', error: error.message })
  }
})

export default router
