import express from 'express'
import Trade from '../models/Trade.js'
import TradingAccount from '../models/TradingAccount.js'
import ChallengeAccount from '../models/ChallengeAccount.js'
import User from '../models/User.js'
import Charges from '../models/Charges.js'
import TradeSettings from '../models/TradeSettings.js'
import AdminLog from '../models/AdminLog.js'
import tradeEngine from '../services/tradeEngine.js'
import copyTradingEngine from '../services/copyTradingEngine.js'
import MasterTrader from '../models/MasterTrader.js'

const router = express.Router()

// GET /api/admin/trade/all - Get all trades with pagination (for admin dashboard)
router.get('/all', async (req, res) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query

    let query = {}
    if (status) query.status = status

    const total = await Trade.countDocuments(query)
    const trades = await Trade.find(query)
      .populate('userId', 'firstName lastName email')
      .populate('tradingAccountId', 'accountId balance')
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))

    res.json({
      success: true,
      trades,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    })
  } catch (error) {
    console.error('Error fetching trades:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/admin/trade/create - Admin create trade for user
router.post('/create', async (req, res) => {
  try {
    const { userId, tradingAccountId, symbol, side, quantity, openPrice, stopLoss, takeProfit } = req.body

    if (!userId || !tradingAccountId || !symbol || !side || !quantity || !openPrice) {
      return res.status(400).json({ success: false, message: 'Missing required fields' })
    }

    const account = await TradingAccount.findById(tradingAccountId)
    if (!account) {
      return res.status(404).json({ success: false, message: 'Trading account not found' })
    }

    // Get contract size
    const contractSize = tradeEngine.getContractSize(symbol)
    const leverage = account.leverage || '1:100'
    const leverageNum = parseInt(leverage.toString().replace('1:', '')) || 100
    const marginRequired = (quantity * contractSize * openPrice) / leverageNum

    // Generate trade ID
    const tradeId = await Trade.generateTradeId()

    // Create trade
    const trade = await Trade.create({
      userId,
      tradingAccountId,
      tradeId,
      symbol,
      segment: symbol.includes('USD') && symbol.length <= 6 ? 'Forex' : 'Crypto',
      side,
      orderType: 'MARKET',
      quantity,
      openPrice,
      stopLoss: stopLoss || null,
      takeProfit: takeProfit || null,
      marginUsed: marginRequired,
      leverage: leverageNum,
      contractSize,
      spread: 0,
      commission: 0,
      swap: 0,
      floatingPnl: 0,
      status: 'OPEN',
      adminModified: true,
      adminModifiedAt: new Date()
    })

    res.json({ success: true, message: 'Trade created', trade })
  } catch (error) {
    console.error('Error creating trade:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/admin/trade/modify/:tradeId - Admin modify trade SL/TP
router.put('/modify/:tradeId', async (req, res) => {
  try {
    const { tradeId } = req.params
    const { stopLoss, takeProfit } = req.body

    const trade = await Trade.findById(tradeId)
    if (!trade) {
      return res.status(404).json({ success: false, message: 'Trade not found' })
    }

    if (trade.status !== 'OPEN') {
      return res.status(400).json({ success: false, message: 'Trade is not open' })
    }

    if (stopLoss !== undefined) trade.stopLoss = stopLoss
    if (takeProfit !== undefined) trade.takeProfit = takeProfit
    trade.adminModified = true
    trade.adminModifiedAt = new Date()

    await trade.save()

    res.json({ success: true, message: 'Trade modified', trade })
  } catch (error) {
    console.error('Error modifying trade:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/admin/trade/edit/:tradeId - Admin full edit trade (any field)
router.put('/edit/:tradeId', async (req, res) => {
  try {
    const { tradeId } = req.params
    const { openPrice, closePrice, quantity, stopLoss, takeProfit, realizedPnl } = req.body

    const trade = await Trade.findById(tradeId)
    if (!trade) {
      return res.status(404).json({ success: false, message: 'Trade not found' })
    }

    const oldValues = {
      openPrice: trade.openPrice,
      closePrice: trade.closePrice,
      quantity: trade.quantity,
      stopLoss: trade.stopLoss,
      takeProfit: trade.takeProfit,
      realizedPnl: trade.realizedPnl
    }

    // Update fields
    if (openPrice !== undefined) trade.openPrice = openPrice
    if (quantity !== undefined) trade.quantity = quantity
    if (stopLoss !== undefined) trade.stopLoss = stopLoss
    if (takeProfit !== undefined) trade.takeProfit = takeProfit
    
    // If close price is set, update P&L and potentially close the trade
    if (closePrice !== undefined && closePrice !== null && closePrice !== '') {
      trade.closePrice = closePrice
      
      // Auto-calculate P&L if not provided
      if (realizedPnl !== undefined && realizedPnl !== null) {
        trade.realizedPnl = realizedPnl
      } else {
        const contractSize = trade.contractSize || 100
        const pnl = trade.side === 'BUY'
          ? (closePrice - trade.openPrice) * trade.quantity * contractSize
          : (trade.openPrice - closePrice) * trade.quantity * contractSize
        trade.realizedPnl = pnl - (trade.swap || 0)
      }
      
      // If trade was open, close it and update account balance
      if (trade.status === 'OPEN') {
        trade.status = 'CLOSED'
        trade.closedBy = 'ADMIN'
        trade.closedAt = new Date()
        
        // Update account balance with P&L - handle both account types
        let account = null
        if (trade.accountType === 'ChallengeAccount' || trade.isChallengeAccount) {
          account = await ChallengeAccount.findById(trade.tradingAccountId)
        } else {
          account = await TradingAccount.findById(trade.tradingAccountId)
        }
        if (account) {
          account.balance += trade.realizedPnl
          if (account.balance < 0) account.balance = 0
          await account.save()
        }
      }
    } else if (realizedPnl !== undefined && realizedPnl !== null) {
      // Just update P&L without closing
      const oldPnl = trade.realizedPnl || 0
      trade.realizedPnl = realizedPnl
      
      // Adjust account balance if trade is closed - handle both account types
      if (trade.status === 'CLOSED') {
        let account = null
        if (trade.accountType === 'ChallengeAccount' || trade.isChallengeAccount) {
          account = await ChallengeAccount.findById(trade.tradingAccountId)
        } else {
          account = await TradingAccount.findById(trade.tradingAccountId)
        }
        if (account) {
          account.balance = account.balance - oldPnl + realizedPnl
          if (account.balance < 0) account.balance = 0
          await account.save()
        }
      }
    }

    // Recalculate margin if quantity or price changed
    if (openPrice !== undefined || quantity !== undefined) {
      const leverage = trade.leverage || 100
      const contractSize = trade.contractSize || 100
      trade.marginUsed = (trade.quantity * contractSize * trade.openPrice) / leverage
    }

    trade.adminModified = true
    trade.adminModifiedAt = new Date()

    await trade.save()

    res.json({ 
      success: true, 
      message: 'Trade updated successfully', 
      trade,
      changes: {
        old: oldValues,
        new: {
          openPrice: trade.openPrice,
          closePrice: trade.closePrice,
          quantity: trade.quantity,
          stopLoss: trade.stopLoss,
          takeProfit: trade.takeProfit,
          realizedPnl: trade.realizedPnl
        }
      }
    })
  } catch (error) {
    console.error('Error editing trade:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/admin/trade/close/:tradeId - Admin close trade
router.post('/close/:tradeId', async (req, res) => {
  try {
    const { tradeId } = req.params
    const { closePrice, marketPrice } = req.body

    const trade = await Trade.findById(tradeId)
    if (!trade) {
      return res.status(404).json({ success: false, message: 'Trade not found' })
    }

    if (trade.status !== 'OPEN') {
      return res.status(400).json({ success: false, message: 'Trade is not open' })
    }

    // Use closePrice if provided, otherwise use marketPrice, fallback to openPrice
    const finalClosePrice = closePrice || marketPrice || trade.openPrice

    // Calculate PnL
    const rawPnl = trade.side === 'BUY'
      ? (finalClosePrice - trade.openPrice) * trade.quantity * trade.contractSize
      : (trade.openPrice - finalClosePrice) * trade.quantity * trade.contractSize
    const realizedPnl = rawPnl - (trade.swap || 0)

    // Update trade
    trade.closePrice = finalClosePrice
    trade.realizedPnl = realizedPnl
    trade.status = 'CLOSED'
    trade.closedBy = 'ADMIN'
    trade.closedAt = new Date()
    trade.adminModified = true
    trade.adminModifiedAt = new Date()

    await trade.save()

    // Update account balance - handle both TradingAccount and ChallengeAccount
    let account = null
    if (trade.accountType === 'ChallengeAccount' || trade.isChallengeAccount) {
      account = await ChallengeAccount.findById(trade.tradingAccountId)
    } else {
      account = await TradingAccount.findById(trade.tradingAccountId)
    }
    
    if (account) {
      account.balance += realizedPnl
      if (account.balance < 0) account.balance = 0
      await account.save()
    }

    // Check if this is a master trader's trade and close follower trades
    let followerResults = []
    const master = await MasterTrader.findOne({ tradingAccountId: trade.tradingAccountId, status: 'ACTIVE' })
    if (master) {
      console.log(`[AdminTrade] Master trade closed, propagating to followers. TradeId: ${tradeId}, ClosePrice: ${finalClosePrice}`)
      followerResults = await copyTradingEngine.closeFollowerTrades(trade._id, finalClosePrice)
      console.log(`[AdminTrade] Closed ${followerResults.length} follower trades`)
    }

    res.json({    
      success: true, 
      message: 'Trade closed', 
      trade, 
      realizedPnl,
      followersClosed: followerResults.length 
    })
  } catch (error) {
    console.error('Error closing trade:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/admin/trades - Get all trades with filters
router.get('/trades', async (req, res) => {
  try {
    const { 
      status, 
      userId, 
      symbol, 
      side, 
      limit = 50, 
      offset = 0 
    } = req.query

    let query = {}
    if (status) query.status = status
    if (userId) query.userId = userId
    if (symbol) query.symbol = symbol
    if (side) query.side = side

    const trades = await Trade.find(query)
      .populate('userId', 'firstName email')
      .populate('tradingAccountId', 'accountId balance')
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))

    const total = await Trade.countDocuments(query)

    res.json({
      success: true,
      trades,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    })
  } catch (error) {
    console.error('Error fetching trades:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/admin/trades/open - Get all open trades
router.get('/trades/open', async (req, res) => {
  try {
    const trades = await Trade.find({ status: 'OPEN' })
      .populate('userId', 'firstName email')
      .populate('tradingAccountId', 'accountId balance leverage')
      .sort({ openedAt: -1 })

    res.json({
      success: true,
      trades,
      total: trades.length
    })
  } catch (error) {
    console.error('Error fetching open trades:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/admin/trades/close - Admin close a trade
router.post('/trades/close', async (req, res) => {
  try {
    const { tradeId, bid, ask, adminId, reason } = req.body

    if (!tradeId || !bid || !ask || !adminId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      })
    }

    const result = await tradeEngine.closeTrade(
      tradeId,
      parseFloat(bid),
      parseFloat(ask),
      'ADMIN',
      adminId
    )

    // Log the action
    await AdminLog.create({
      adminId,
      action: 'TRADE_CLOSE',
      targetType: 'TRADE',
      targetId: tradeId,
      reason: reason || 'Admin closed trade',
      newValue: { realizedPnl: result.realizedPnl }
    })

    res.json({
      success: true,
      message: 'Trade closed by admin',
      trade: result.trade,
      realizedPnl: result.realizedPnl
    })
  } catch (error) {
    console.error('Error closing trade:', error)
    res.status(400).json({ success: false, message: error.message })
  }
})

// PUT /api/admin/trades/modify - Admin modify trade SL/TP
router.put('/trades/modify', async (req, res) => {
  try {
    const { tradeId, sl, tp, adminId, reason } = req.body

    if (!tradeId || !adminId) {
      return res.status(400).json({
        success: false,
        message: 'Trade ID and Admin ID are required'
      })
    }

    const trade = await tradeEngine.modifyTrade(
      tradeId,
      sl !== undefined ? parseFloat(sl) : null,
      tp !== undefined ? parseFloat(tp) : null,
      adminId
    )

    res.json({
      success: true,
      message: 'Trade modified by admin',
      trade
    })
  } catch (error) {
    console.error('Error modifying trade:', error)
    res.status(400).json({ success: false, message: error.message })
  }
})

// POST /api/admin/trades/force-close-all - Force close all trades for an account
router.post('/trades/force-close-all', async (req, res) => {
  try {
    const { tradingAccountId, adminId, reason, prices } = req.body

    if (!tradingAccountId || !adminId || !prices) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      })
    }

    const openTrades = await Trade.find({ tradingAccountId, status: 'OPEN' })
    const closedTrades = []

    for (const trade of openTrades) {
      const tradePrice = prices[trade.symbol]
      if (tradePrice) {
        const result = await tradeEngine.closeTrade(
          trade._id,
          tradePrice.bid,
          tradePrice.ask,
          'ADMIN',
          adminId
        )
        closedTrades.push(result)
      }
    }

    // Log the action
    await AdminLog.create({
      adminId,
      action: 'TRADE_FORCE_CLOSE',
      targetType: 'ACCOUNT',
      targetId: tradingAccountId,
      reason: reason || 'Admin force closed all trades',
      newValue: { closedCount: closedTrades.length }
    })

    res.json({
      success: true,
      message: `Force closed ${closedTrades.length} trades`,
      closedTrades
    })
  } catch (error) {
    console.error('Error force closing trades:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/admin/account/freeze - Freeze a trading account
router.post('/account/freeze', async (req, res) => {
  try {
    const { tradingAccountId, adminId, reason } = req.body

    if (!tradingAccountId || !adminId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      })
    }

    const account = await TradingAccount.findById(tradingAccountId)
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Trading account not found'
      })
    }

    const previousStatus = account.status
    account.status = 'Frozen'
    account.frozenReason = reason || 'Frozen by admin'
    account.frozenAt = new Date()
    account.frozenBy = adminId
    await account.save()

    // Log the action
    await AdminLog.create({
      adminId,
      action: 'ACCOUNT_FREEZE',
      targetType: 'ACCOUNT',
      targetId: tradingAccountId,
      previousValue: { status: previousStatus },
      newValue: { status: 'Frozen' },
      reason: reason || 'Account frozen by admin'
    })

    res.json({
      success: true,
      message: 'Account frozen successfully',
      account
    })
  } catch (error) {
    console.error('Error freezing account:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/admin/account/unfreeze - Unfreeze a trading account
router.post('/account/unfreeze', async (req, res) => {
  try {
    const { tradingAccountId, adminId } = req.body

    if (!tradingAccountId || !adminId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      })
    }

    const account = await TradingAccount.findById(tradingAccountId)
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Trading account not found'
      })
    }

    account.status = 'Active'
    account.frozenReason = ''
    account.frozenAt = null
    account.frozenBy = null
    await account.save()

    // Log the action
    await AdminLog.create({
      adminId,
      action: 'ACCOUNT_UNFREEZE',
      targetType: 'ACCOUNT',
      targetId: tradingAccountId,
      previousValue: { status: 'Frozen' },
      newValue: { status: 'Active' }
    })

    res.json({
      success: true,
      message: 'Account unfrozen successfully',
      account
    })
  } catch (error) {
    console.error('Error unfreezing account:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/admin/account/credit - Adjust account credit
router.put('/account/credit', async (req, res) => {
  try {
    const { tradingAccountId, adminId, amount, reason } = req.body

    if (!tradingAccountId || !adminId || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      })
    }

    const account = await TradingAccount.findById(tradingAccountId)
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Trading account not found'
      })
    }

    const previousCredit = account.credit
    account.credit = parseFloat(amount)
    await account.save()

    // Log the action
    await AdminLog.create({
      adminId,
      action: 'CREDIT_ADJUST',
      targetType: 'ACCOUNT',
      targetId: tradingAccountId,
      previousValue: { credit: previousCredit },
      newValue: { credit: account.credit },
      reason: reason || 'Credit adjusted by admin'
    })

    res.json({
      success: true,
      message: 'Credit adjusted successfully',
      account
    })
  } catch (error) {
    console.error('Error adjusting credit:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/admin/settings - Get trade settings
router.get('/settings', async (req, res) => {
  try {
    const { accountTypeId, segment } = req.query
    const settings = await TradeSettings.getSettings(accountTypeId, segment)
    res.json({ success: true, settings })
  } catch (error) {
    console.error('Error fetching settings:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/admin/settings - Update trade settings
router.put('/settings', async (req, res) => {
  try {
    const { 
      settingsId,
      stopOutLevel,
      marginCallLevel,
      swapTime,
      swapTimezone,
      tripleSwapDay,
      tradingEnabled,
      maxLeverageGlobal,
      maxOpenTradesPerUser,
      maxOpenLotsPerUser,
      adminId
    } = req.body

    let settings
    if (settingsId) {
      settings = await TradeSettings.findById(settingsId)
    } else {
      settings = await TradeSettings.findOne({ isGlobal: true })
      if (!settings) {
        settings = new TradeSettings({ isGlobal: true })
      }
    }

    const previousValue = settings.toObject()

    if (stopOutLevel !== undefined) settings.stopOutLevel = stopOutLevel
    if (marginCallLevel !== undefined) settings.marginCallLevel = marginCallLevel
    if (swapTime !== undefined) settings.swapTime = swapTime
    if (swapTimezone !== undefined) settings.swapTimezone = swapTimezone
    if (tripleSwapDay !== undefined) settings.tripleSwapDay = tripleSwapDay
    if (tradingEnabled !== undefined) settings.tradingEnabled = tradingEnabled
    if (maxLeverageGlobal !== undefined) settings.maxLeverageGlobal = maxLeverageGlobal
    if (maxOpenTradesPerUser !== undefined) settings.maxOpenTradesPerUser = maxOpenTradesPerUser
    if (maxOpenLotsPerUser !== undefined) settings.maxOpenLotsPerUser = maxOpenLotsPerUser

    await settings.save()

    // Log the action
    if (adminId) {
      await AdminLog.create({
        adminId,
        action: 'SETTINGS_UPDATE',
        targetType: 'SETTINGS',
        targetId: settings._id,
        previousValue,
        newValue: settings.toObject()
      })
    }

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings
    })
  } catch (error) {
    console.error('Error updating settings:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/admin/charges - Get all charges
router.get('/charges', async (req, res) => {
  try {
    const { level, segment, accountTypeId } = req.query
    
    let query = {}
    if (level) query.level = level
    if (segment) query.segment = segment
    if (accountTypeId) query.accountTypeId = accountTypeId

    const charges = await Charges.find(query)
      .populate('userId', 'firstName email')
      .populate('accountTypeId', 'name')
      .sort({ level: 1 })

    res.json({ success: true, charges })
  } catch (error) {
    console.error('Error fetching charges:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/admin/charges - Create new charges
router.post('/charges', async (req, res) => {
  try {
    const {
      level,
      userId,
      instrumentSymbol,
      segment,
      accountTypeId,
      spreadType,
      spreadValue,
      commissionType,
      commissionValue,
      swapLong,
      swapShort,
      swapType,
      adminId
    } = req.body

    if (!level) {
      return res.status(400).json({
        success: false,
        message: 'Level is required'
      })
    }

    const charges = await Charges.create({
      level,
      userId: userId || null,
      instrumentSymbol: instrumentSymbol || null,
      segment: segment || null,
      accountTypeId: accountTypeId || null,
      spreadType: spreadType || 'FIXED',
      spreadValue: spreadValue || 0,
      commissionType: commissionType || 'PER_LOT',
      commissionValue: commissionValue || 0,
      swapLong: swapLong || 0,
      swapShort: swapShort || 0,
      swapType: swapType || 'POINTS'
    })

    // Log the action
    if (adminId) {
      await AdminLog.create({
        adminId,
        action: 'CHARGES_UPDATE',
        targetType: 'CHARGES',
        targetId: charges._id,
        newValue: charges.toObject()
      })
    }

    res.json({
      success: true,
      message: 'Charges created successfully',
      charges
    })
  } catch (error) {
    console.error('Error creating charges:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/admin/charges/:id - Update charges
router.put('/charges/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      spreadType,
      spreadValue,
      commissionType,
      commissionValue,
      swapLong,
      swapShort,
      swapType,
      isActive,
      adminId
    } = req.body

    const charges = await Charges.findById(id)
    if (!charges) {
      return res.status(404).json({
        success: false,
        message: 'Charges not found'
      })
    }

    const previousValue = charges.toObject()

    if (spreadType !== undefined) charges.spreadType = spreadType
    if (spreadValue !== undefined) charges.spreadValue = spreadValue
    if (commissionType !== undefined) charges.commissionType = commissionType
    if (commissionValue !== undefined) charges.commissionValue = commissionValue
    if (swapLong !== undefined) charges.swapLong = swapLong
    if (swapShort !== undefined) charges.swapShort = swapShort
    if (swapType !== undefined) charges.swapType = swapType
    if (isActive !== undefined) charges.isActive = isActive

    await charges.save()

    // Log the action
    if (adminId) {
      await AdminLog.create({
        adminId,
        action: 'CHARGES_UPDATE',
        targetType: 'CHARGES',
        targetId: charges._id,
        previousValue,
        newValue: charges.toObject()
      })
    }

    res.json({
      success: true,
      message: 'Charges updated successfully',
      charges
    })
  } catch (error) {
    console.error('Error updating charges:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// DELETE /api/admin/charges/:id - Delete charges
router.delete('/charges/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { adminId } = req.body

    const charges = await Charges.findByIdAndDelete(id)
    if (!charges) {
      return res.status(404).json({
        success: false,
        message: 'Charges not found'
      })
    }

    // Log the action
    if (adminId) {
      await AdminLog.create({
        adminId,
        action: 'CHARGES_UPDATE',
        targetType: 'CHARGES',
        targetId: id,
        previousValue: charges.toObject(),
        newValue: null
      })
    }

    res.json({
      success: true,
      message: 'Charges deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting charges:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/admin/logs - Get admin action logs
router.get('/logs', async (req, res) => {
  try {
    const { adminId, action, targetType, limit = 50, offset = 0 } = req.query

    let query = {}
    if (adminId) query.adminId = adminId
    if (action) query.action = action
    if (targetType) query.targetType = targetType

    const logs = await AdminLog.find(query)
      .populate('adminId', 'firstName email')
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))

    const total = await AdminLog.countDocuments(query)

    res.json({
      success: true,
      logs,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    })
  } catch (error) {
    console.error('Error fetching logs:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
