import express from 'express'
import Challenge from '../models/Challenge.js'
import ChallengeAccount from '../models/ChallengeAccount.js'
import PropSettings from '../models/PropSettings.js'
import Wallet from '../models/Wallet.js'
import Transaction from '../models/Transaction.js'
import propTradingEngine from '../services/propTradingEngine.js'

const router = express.Router()

// ==================== PUBLIC ROUTES ====================

// GET /api/prop/status - Check if challenge mode is enabled
router.get('/status', async (req, res) => {
  try {
    const settings = await PropSettings.getSettings()
    res.json({
      success: true,
      enabled: settings.challengeModeEnabled,
      displayName: settings.displayName,
      description: settings.description
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/prop/challenges - Get available challenges
router.get('/challenges', async (req, res) => {
  try {
    const settings = await PropSettings.getSettings()
    if (!settings.challengeModeEnabled) {
      return res.json({ success: true, challenges: [], enabled: false })
    }

    const challenges = await Challenge.find({ isActive: true })
      .sort({ sortOrder: 1, fundSize: 1 })

    res.json({ success: true, challenges, enabled: true })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/prop/challenge/:id - Get single challenge details
router.get('/challenge/:id', async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id)
    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found' })
    }
    res.json({ success: true, challenge })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ==================== USER ROUTES ====================

// POST /api/prop/buy - Buy a challenge
router.post('/buy', async (req, res) => {
  try {
    const { userId, challengeId } = req.body

    if (!userId || !challengeId) {
      return res.status(400).json({ success: false, message: 'User ID and Challenge ID required' })
    }

    const settings = await PropSettings.getSettings()
    if (!settings.challengeModeEnabled) {
      return res.status(400).json({ 
        success: false, 
        message: 'Challenge mode is currently disabled',
        code: 'CHALLENGE_MODE_DISABLED'
      })
    }

    // Get the challenge to check the fee
    const challenge = await Challenge.findById(challengeId)
    if (!challenge || !challenge.isActive) {
      return res.status(404).json({ success: false, message: 'Challenge not found or inactive' })
    }

    const challengeFee = challenge.challengeFee || 0

    // Get user's wallet
    let wallet = await Wallet.findOne({ userId })
    if (!wallet) {
      wallet = new Wallet({ userId, balance: 0 })
      await wallet.save()
    }

    // Check if user has enough balance
    if (wallet.balance < challengeFee) {
      return res.status(400).json({ 
        success: false, 
        message: `Insufficient balance. Required: $${challengeFee}, Available: $${wallet.balance}`,
        code: 'INSUFFICIENT_BALANCE'
      })
    }

    // Deduct challenge fee from wallet
    wallet.balance -= challengeFee
    await wallet.save()

    // Create transaction record for challenge purchase
    const transaction = new Transaction({
      userId,
      walletId: wallet._id,
      type: 'Challenge_Purchase',
      amount: challengeFee,
      status: 'Approved',
      paymentMethod: 'Wallet',
      description: `Challenge Purchase: ${challenge.name} ($${challenge.fundSize.toLocaleString()} Fund)`,
      processedAt: new Date()
    })
    await transaction.save()

    // Create the challenge account
    const account = await propTradingEngine.createChallengeAccount(userId, challengeId, transaction._id)
    
    // Update transaction with challenge account reference
    transaction.challengeAccountId = account._id
    await transaction.save()

    console.log(`Challenge purchased: ${challenge.name} for $${challengeFee} by user ${userId}`)
    
    res.json({
      success: true,
      message: 'Challenge account created successfully',
      account: {
        _id: account._id,
        accountId: account.accountId,
        status: account.status,
        initialBalance: account.initialBalance,
        expiresAt: account.expiresAt
      },
      transaction: {
        _id: transaction._id,
        amount: challengeFee,
        newBalance: wallet.balance
      }
    })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
})

// GET /api/prop/my-accounts/:userId - Get user's challenge accounts
router.get('/my-accounts/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const { status } = req.query

    let query = { userId }
    if (status) query.status = status

    const accounts = await ChallengeAccount.find(query)
      .populate('challengeId', 'name fundSize stepsCount')
      .sort({ createdAt: -1 })

    res.json({ success: true, accounts })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/prop/account/:accountId - Get challenge account dashboard
router.get('/account/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params
    const dashboard = await propTradingEngine.getAccountDashboard(accountId)
    
    if (!dashboard) {
      return res.status(404).json({ success: false, message: 'Account not found' })
    }

    res.json({ success: true, ...dashboard })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/prop/validate-trade - Validate trade before opening
router.post('/validate-trade', async (req, res) => {
  try {
    const { challengeAccountId, tradeParams } = req.body

    const result = await propTradingEngine.validateTradeOpen(challengeAccountId, tradeParams)
    
    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: result.error,
        code: result.code,
        uiAction: result.uiAction,
        details: result
      })
    }

    res.json({ success: true, message: 'Trade validated' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/prop/validate-close - Validate trade close (for min hold time)
router.post('/validate-close', async (req, res) => {
  try {
    const { challengeAccountId, tradeId } = req.body

    const result = await propTradingEngine.validateTradeClose(challengeAccountId, tradeId)
    
    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: result.error,
        code: result.code,
        uiAction: result.uiAction,
        remainingSeconds: result.remainingSeconds,
        canCloseAt: result.canCloseAt
      })
    }

    res.json({ success: true, message: 'Close validated' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/prop/update-equity - Update real-time equity
router.post('/update-equity', async (req, res) => {
  try {
    const { challengeAccountId, newEquity } = req.body

    const result = await propTradingEngine.updateRealTimeEquity(challengeAccountId, newEquity)
    
    if (!result) {
      return res.status(404).json({ success: false, message: 'Account not found or not active' })
    }

    if (result.breached) {
      return res.json({
        success: true,
        breached: true,
        reason: result.reason,
        code: result.code,
        account: result.account
      })
    }

    res.json({
      success: true,
      breached: false,
      dailyDrawdown: result.dailyDrawdown,
      overallDrawdown: result.overallDrawdown,
      profitPercent: result.profitPercent
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ==================== ADMIN ROUTES ====================

// GET /api/prop/admin/settings - Get prop settings
router.get('/admin/settings', async (req, res) => {
  try {
    const settings = await PropSettings.getSettings()
    res.json({ success: true, settings })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/prop/admin/settings - Update prop settings
router.put('/admin/settings', async (req, res) => {
  try {
    const { challengeModeEnabled, displayName, description, termsAndConditions, adminId } = req.body
    
    const settings = await PropSettings.updateSettings({
      challengeModeEnabled,
      displayName,
      description,
      termsAndConditions
    }, adminId)

    res.json({ success: true, message: 'Settings updated', settings })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/prop/admin/challenges - Create new challenge
router.post('/admin/challenges', async (req, res) => {
  try {
    const challengeData = req.body
    const challenge = await Challenge.create(challengeData)
    res.json({ success: true, message: 'Challenge created', challenge })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
})

// GET /api/prop/admin/challenges - Get all challenges (admin)
router.get('/admin/challenges', async (req, res) => {
  try {
    const challenges = await Challenge.find().sort({ sortOrder: 1, fundSize: 1 })
    res.json({ success: true, challenges })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/prop/admin/challenges/:id - Update challenge
router.put('/admin/challenges/:id', async (req, res) => {
  try {
    const challenge = await Challenge.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    )
    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found' })
    }
    res.json({ success: true, message: 'Challenge updated', challenge })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
})

// DELETE /api/prop/admin/challenges/:id - Delete challenge
router.delete('/admin/challenges/:id', async (req, res) => {
  try {
    const accountsCount = await ChallengeAccount.countDocuments({ challengeId: req.params.id })
    if (accountsCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete. ${accountsCount} accounts are using this challenge.` 
      })
    }

    await Challenge.findByIdAndDelete(req.params.id)
    res.json({ success: true, message: 'Challenge deleted' })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
})

// GET /api/prop/admin/accounts - Get all challenge accounts
router.get('/admin/accounts', async (req, res) => {
  try {
    const { status, challengeId, limit = 50, offset = 0 } = req.query

    let query = {}
    if (status) query.status = status
    if (challengeId) query.challengeId = challengeId

    const accounts = await ChallengeAccount.find(query)
      .populate('userId', 'firstName email')
      .populate('challengeId', 'name fundSize stepsCount')
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))

    const total = await ChallengeAccount.countDocuments(query)

    res.json({ success: true, accounts, total })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/prop/admin/account/:id - Get single account details
router.get('/admin/account/:id', async (req, res) => {
  try {
    const dashboard = await propTradingEngine.getAccountDashboard(req.params.id)
    if (!dashboard) {
      return res.status(404).json({ success: false, message: 'Account not found' })
    }
    res.json({ success: true, ...dashboard })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/prop/admin/force-pass/:id - Force pass a challenge
router.post('/admin/force-pass/:id', async (req, res) => {
  try {
    const { adminId } = req.body
    const result = await propTradingEngine.forcePass(req.params.id, adminId)
    res.json({ 
      success: true, 
      message: 'Challenge force passed',
      account: result.account,
      fundedAccount: result.fundedAccount
    })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
})

// POST /api/prop/admin/force-fail/:id - Force fail a challenge
router.post('/admin/force-fail/:id', async (req, res) => {
  try {
    const { adminId, reason } = req.body
    const account = await propTradingEngine.forceFail(req.params.id, adminId, reason)
    res.json({ success: true, message: 'Challenge force failed', account })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
})

// POST /api/prop/admin/extend-time/:id - Extend challenge time
router.post('/admin/extend-time/:id', async (req, res) => {
  try {
    const { adminId, days } = req.body
    if (!days || days <= 0) {
      return res.status(400).json({ success: false, message: 'Days must be positive' })
    }
    const account = await propTradingEngine.extendTime(req.params.id, days, adminId)
    res.json({ success: true, message: `Extended by ${days} days`, account })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
})

// POST /api/prop/admin/reset/:id - Reset challenge
router.post('/admin/reset/:id', async (req, res) => {
  try {
    const { adminId } = req.body
    const account = await propTradingEngine.resetChallenge(req.params.id, adminId)
    res.json({ success: true, message: 'Challenge reset', account })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
})

// GET /api/prop/admin/dashboard - Admin dashboard stats
router.get('/admin/dashboard', async (req, res) => {
  try {
    const totalChallenges = await Challenge.countDocuments({ isActive: true })
    const totalAccounts = await ChallengeAccount.countDocuments()
    const activeAccounts = await ChallengeAccount.countDocuments({ status: 'ACTIVE' })
    const passedAccounts = await ChallengeAccount.countDocuments({ status: 'PASSED' })
    const failedAccounts = await ChallengeAccount.countDocuments({ status: 'FAILED' })
    const fundedAccounts = await ChallengeAccount.countDocuments({ status: 'FUNDED' })

    const settings = await PropSettings.getSettings()

    res.json({
      success: true,
      stats: {
        challengeModeEnabled: settings.challengeModeEnabled,
        totalChallenges,
        totalAccounts,
        activeAccounts,
        passedAccounts,
        failedAccounts,
        fundedAccounts
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
