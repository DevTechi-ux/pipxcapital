import express from 'express'
import User from '../models/User.js'
import Wallet from '../models/Wallet.js'
import TradingAccount from '../models/TradingAccount.js'
import AccountType from '../models/AccountType.js'
import Trade from '../models/Trade.js'
import Transaction from '../models/Transaction.js'

const router = express.Router()

// POST /api/wallet-transfer/to-trading - Transfer from User Wallet to Trading Account
router.post('/to-trading', async (req, res) => {
  try {
    const { userId, tradingAccountId, amount } = req.body

    if (!userId || !tradingAccountId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      })
    }

    const transferAmount = parseFloat(amount)
    if (transferAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      })
    }

    // Get user wallet
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Check if user has sufficient balance
    if (user.walletBalance < transferAmount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance'
      })
    }

    // Get trading account with account type
    const tradingAccount = await TradingAccount.findById(tradingAccountId).populate('accountTypeId')
    if (!tradingAccount) {
      return res.status(404).json({
        success: false,
        message: 'Trading account not found'
      })
    }

    // Verify trading account belongs to user
    if (tradingAccount.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Trading account does not belong to this user'
      })
    }

    // Check if account is active
    if (tradingAccount.status !== 'Active') {
      return res.status(400).json({
        success: false,
        message: `Cannot transfer to ${tradingAccount.status} account`
      })
    }

    // Check minimum deposit for first deposit to trading account
    if (tradingAccount.balance === 0 && tradingAccount.accountTypeId?.minDeposit) {
      const minDeposit = tradingAccount.accountTypeId.minDeposit
      if (transferAmount < minDeposit) {
        return res.status(400).json({
          success: false,
          message: `Minimum first deposit for ${tradingAccount.accountTypeId.name} account is $${minDeposit}`
        })
      }
    }

    // Perform transfer
    user.walletBalance -= transferAmount
    tradingAccount.balance += transferAmount

    await user.save()
    await tradingAccount.save()

    // Log transaction
    await Transaction.create({
      userId,
      type: 'Transfer_To_Account',
      amount: transferAmount,
      paymentMethod: 'Internal',
      tradingAccountId,
      tradingAccountName: tradingAccount.accountId || `Account ${tradingAccountId.slice(-6)}`,
      status: 'Completed',
      transactionRef: `TRF${Date.now()}`
    })

    res.json({
      success: true,
      message: 'Transfer successful',
      userWalletBalance: user.walletBalance,
      tradingAccountBalance: tradingAccount.balance
    })
  } catch (error) {
    console.error('Error transferring to trading account:', error)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// POST /api/wallet-transfer/from-trading - Transfer from Trading Account to User Wallet
router.post('/from-trading', async (req, res) => {
  try {
    const { userId, tradingAccountId, amount } = req.body

    if (!userId || !tradingAccountId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      })
    }

    const transferAmount = parseFloat(amount)
    if (transferAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      })
    }

    // Get trading account
    const tradingAccount = await TradingAccount.findById(tradingAccountId)
    if (!tradingAccount) {
      return res.status(404).json({
        success: false,
        message: 'Trading account not found'
      })
    }

    // Verify trading account belongs to user
    if (tradingAccount.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Trading account does not belong to this user'
      })
    }

    // Check if account is active
    if (tradingAccount.status !== 'Active') {
      return res.status(400).json({
        success: false,
        message: `Cannot transfer from ${tradingAccount.status} account`
      })
    }

    // Get open trades to calculate free margin
    const openTrades = await Trade.find({
      tradingAccountId,
      status: 'OPEN'
    })

    // Calculate used margin
    const usedMargin = openTrades.reduce((sum, trade) => sum + trade.marginUsed, 0)
    
    // Calculate floating PnL (simplified - in production use real prices)
    const floatingPnl = openTrades.reduce((sum, trade) => sum + (trade.floatingPnl || 0), 0)

    // Calculate equity and free margin
    const equity = tradingAccount.balance + tradingAccount.credit + floatingPnl
    const freeMargin = equity - usedMargin

    // Check if withdrawal amount is available in free margin
    // Note: Credit cannot be withdrawn
    const withdrawableAmount = Math.min(freeMargin, tradingAccount.balance)

    if (transferAmount > withdrawableAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient free margin. Maximum withdrawable: ${withdrawableAmount.toFixed(2)}`
      })
    }

    // Get user
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Perform transfer
    tradingAccount.balance -= transferAmount
    user.walletBalance += transferAmount

    await tradingAccount.save()
    await user.save()

    // Log transaction
    await Transaction.create({
      userId,
      type: 'Transfer_From_Account',
      amount: transferAmount,
      paymentMethod: 'Internal',
      tradingAccountId,
      tradingAccountName: tradingAccount.accountId || `Account ${tradingAccountId.slice(-6)}`,
      status: 'Completed',
      transactionRef: `TRF${Date.now()}`
    })

    res.json({
      success: true,
      message: 'Transfer successful',
      userWalletBalance: user.walletBalance,
      tradingAccountBalance: tradingAccount.balance
    })
  } catch (error) {
    console.error('Error transferring from trading account:', error)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// GET /api/wallet-transfer/balances/:userId - Get all balances for a user
router.get('/balances/:userId', async (req, res) => {
  try {
    const { userId } = req.params

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    const tradingAccounts = await TradingAccount.find({ userId })
      .populate('accountTypeId', 'name')

    const accountBalances = await Promise.all(
      tradingAccounts.map(async (account) => {
        const openTrades = await Trade.find({
          tradingAccountId: account._id,
          status: 'OPEN'
        })

        const usedMargin = openTrades.reduce((sum, trade) => sum + trade.marginUsed, 0)
        const floatingPnl = openTrades.reduce((sum, trade) => sum + (trade.floatingPnl || 0), 0)
        const equity = account.balance + account.credit + floatingPnl
        const freeMargin = equity - usedMargin

        return {
          accountId: account._id,
          accountNumber: account.accountId,
          accountType: account.accountTypeId?.name || 'Unknown',
          balance: account.balance,
          credit: account.credit,
          equity,
          usedMargin,
          freeMargin,
          floatingPnl,
          status: account.status,
          openTradesCount: openTrades.length
        }
      })
    )

    res.json({
      success: true,
      userWalletBalance: user.walletBalance,
      tradingAccounts: accountBalances
    })
  } catch (error) {
    console.error('Error fetching balances:', error)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

export default router
