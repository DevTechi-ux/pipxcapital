import express from 'express'
import Trade from '../models/Trade.js'
import TradingAccount from '../models/TradingAccount.js'
import ChallengeAccount from '../models/ChallengeAccount.js'
import Charges from '../models/Charges.js'
import tradeEngine from '../services/tradeEngine.js'
import propTradingEngine from '../services/propTradingEngine.js'
import copyTradingEngine from '../services/copyTradingEngine.js'
import ibEngine from '../services/ibEngineNew.js'
import MasterTrader from '../models/MasterTrader.js'

// AllTick API config for fresh price fetching
const ALLTICK_API_TOKEN = process.env.ALLTICK_API_TOKEN || '1b2b3ad1b5c8c28b9d956652ecb4111d-c-app'
const ALLTICK_FOREX_API = 'https://quote.alltick.co/quote-b-api/depth-tick'
const ALLTICK_MAP = { 'XAUUSD': 'GOLD', 'XAGUSD': 'Silver', 'BTCUSD': 'BTCUSDT', 'ETHUSD': 'ETHUSDT' }

// Fetch fresh price from AllTick API
async function getFreshPrice(symbol) {
  try {
    const alltickCode = ALLTICK_MAP[symbol] || symbol
    const query = {
      trace: `fresh-${Date.now()}`,
      data: { symbol_list: [{ code: alltickCode }] }
    }
    const encodedQuery = encodeURIComponent(JSON.stringify(query))
    const url = `${ALLTICK_FOREX_API}?token=${ALLTICK_API_TOKEN}&query=${encodedQuery}`
    
    const response = await fetch(url)
    if (!response.ok) {
      console.log(`[getFreshPrice] AllTick error for ${symbol}: ${response.status}`)
      return null
    }
    const data = await response.json()
    if (data.ret !== 200 || !data.data?.tick_list?.[0]) {
      console.log(`[getFreshPrice] No data for ${symbol}`)
      return null
    }
    const tick = data.data.tick_list[0]
    const bid = tick.bids?.[0]?.price ? parseFloat(tick.bids[0].price) : null
    const ask = tick.asks?.[0]?.price ? parseFloat(tick.asks[0].price) : null
    if (bid && ask) {
      return { bid, ask }
    } else if (bid) {
      return { bid, ask: bid }
    }
    return null
  } catch (e) {
    console.log(`[getFreshPrice] Error for ${symbol}:`, e.message)
    return null
  }
}

const router = express.Router()

// POST /api/trade/open - Open a new trade
router.post('/open', async (req, res) => {
  try {
    const { 
      userId, 
      tradingAccountId, 
      symbol, 
      segment, 
      side, 
      orderType, 
      quantity, 
      bid, 
      ask, 
      leverage,
      sl, 
      tp 
    } = req.body

    // Validate required fields
    if (!userId || !tradingAccountId || !symbol || !side || !orderType || !quantity) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      })
    }

    // Check if market data is available (bid/ask must be valid numbers > 0)
    if (!bid || !ask || parseFloat(bid) <= 0 || parseFloat(ask) <= 0 || isNaN(parseFloat(bid)) || isNaN(parseFloat(ask))) {
      return res.status(400).json({ 
        success: false, 
        message: 'Market is closed or no price data available. Please try again when market is open.',
        code: 'MARKET_CLOSED'
      })
    }

    // Check for stale prices (if bid equals ask exactly, likely no real data)
    if (parseFloat(bid) === parseFloat(ask) && parseFloat(bid) === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No live market data. Trading is not available at this time.',
        code: 'NO_DATA_FEED'
      })
    }

    // Validate side
    if (!['BUY', 'SELL'].includes(side)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid side. Must be BUY or SELL' 
      })
    }

    // Validate order type
    const validOrderTypes = ['MARKET', 'BUY_LIMIT', 'BUY_STOP', 'SELL_LIMIT', 'SELL_STOP']
    if (!validOrderTypes.includes(orderType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid order type' 
      })
    }

    // Check if this is a challenge account first
    const challengeAccount = await ChallengeAccount.findById(tradingAccountId).populate('challengeId')
    
    if (challengeAccount) {
      // This is a challenge account - use prop trading engine
      const tradeParams = {
        symbol,
        segment: segment || 'Forex',
        side,
        orderType,
        quantity: parseFloat(quantity),
        bid: parseFloat(bid),
        ask: parseFloat(ask),
        sl: sl ? parseFloat(sl) : null,
        tp: tp ? parseFloat(tp) : null
      }

      // Validate trade against challenge rules
      const validation = await propTradingEngine.validateTradeOpen(tradingAccountId, tradeParams)
      if (!validation.valid) {
        // Track violation and check if account should be failed
        const violationResult = await propTradingEngine.handleTradeAttemptViolation(tradingAccountId, validation)
        
        return res.status(400).json({
          success: false,
          message: violationResult.error,
          code: violationResult.code,
          uiAction: violationResult.uiAction,
          accountFailed: violationResult.accountFailed || false,
          failReason: violationResult.failReason || null,
          warningCount: violationResult.warningCount || 0,
          remainingWarnings: violationResult.remainingWarnings || 3
        })
      }

      // Open trade for challenge account
      const trade = await propTradingEngine.openChallengeTrade(
        userId,
        tradingAccountId,
        tradeParams
      )

      return res.json({
        success: true,
        message: 'Challenge trade opened successfully',
        trade,
        isChallengeAccount: true
      })
    }

    // Regular trading account - use standard trade engine
    const trade = await tradeEngine.openTrade(
      userId,
      tradingAccountId,
      symbol,
      segment || 'Forex',
      side,
      orderType,
      parseFloat(quantity),
      parseFloat(bid),
      parseFloat(ask),
      sl ? parseFloat(sl) : null,
      tp ? parseFloat(tp) : null,
      leverage // Pass user-selected leverage
    )

    // Check if this is a master trader and copy to followers
    const master = await MasterTrader.findOne({ 
      tradingAccountId, 
      status: 'ACTIVE' 
    })
    
    let copyResults = []
    if (master) {
      try {
        copyResults = await copyTradingEngine.copyTradeToFollowers(trade, master._id)
        console.log(`Copied trade to ${copyResults.filter(r => r.status === 'SUCCESS').length} followers`)
      } catch (copyError) {
        console.error('Error copying trade to followers:', copyError)
      }
    }

    res.json({
      success: true,
      message: 'Trade opened successfully',
      trade,
      copyResults: copyResults.length > 0 ? copyResults : undefined
    })
  } catch (error) {
    console.error('Error opening trade:', error)
    res.status(400).json({ 
      success: false, 
      message: error.message 
    })
  }
})

// POST /api/trade/close - Close a trade
router.post('/close', async (req, res) => {
  try {
    const { tradeId, bid, ask } = req.body

    if (!tradeId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Trade ID is required' 
      })
    }

    // Check if market data is available
    if (!bid || !ask || parseFloat(bid) <= 0 || parseFloat(ask) <= 0 || isNaN(parseFloat(bid)) || isNaN(parseFloat(ask))) {
      return res.status(400).json({ 
        success: false, 
        message: 'Market is closed or no price data available. Cannot close trade.',
        code: 'MARKET_CLOSED'
      })
    }

    // Get trade first to check if it's a challenge or master trade
    const tradeToClose = await Trade.findById(tradeId)
    
    if (!tradeToClose) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trade not found' 
      })
    }

    // Check if this is a challenge account trade
    const challengeAccount = await ChallengeAccount.findById(tradeToClose.tradingAccountId)
    
    if (challengeAccount) {
      // Close trade for challenge account
      const closePrice = tradeToClose.side === 'BUY' ? parseFloat(bid) : parseFloat(ask)
      const rawPnl = tradeToClose.side === 'BUY'
        ? (closePrice - tradeToClose.openPrice) * tradeToClose.quantity * tradeToClose.contractSize
        : (tradeToClose.openPrice - closePrice) * tradeToClose.quantity * tradeToClose.contractSize
      
      // Get charges for commission on close
      const charges = await Charges.getChargesForTrade(
        tradeToClose.userId, 
        tradeToClose.symbol, 
        tradeToClose.segment, 
        null
      )
      
      // Calculate commission on close if enabled
      let closeCommission = 0
      if (charges.commissionOnClose && charges.commissionValue > 0) {
        if (charges.commissionType === 'FIXED') {
          closeCommission = charges.commissionValue
        } else if (charges.commissionType === 'PER_LOT') {
          closeCommission = tradeToClose.quantity * charges.commissionValue
        } else if (charges.commissionType === 'PERCENTAGE') {
          const tradeValue = tradeToClose.quantity * tradeToClose.contractSize * closePrice
          closeCommission = tradeValue * (charges.commissionValue / 100)
        }
      }
      
      // Calculate final PnL (subtract swap and close commission)
      const pnl = rawPnl - (tradeToClose.swap || 0) - closeCommission
      
      // Update trade
      tradeToClose.status = 'CLOSED'
      tradeToClose.closePrice = closePrice
      tradeToClose.closedAt = new Date()
      tradeToClose.realizedPnl = pnl
      tradeToClose.closeReason = 'USER'
      await tradeToClose.save()
      
      // Update challenge account
      await propTradingEngine.onTradeClosed(challengeAccount._id, tradeToClose, pnl)
      
      return res.json({
        success: true,
        message: 'Challenge trade closed successfully',
        trade: tradeToClose,
        realizedPnl: pnl,
        isChallengeAccount: true
      })
    }
    
    // Regular trading account - use standard trade engine
    const result = await tradeEngine.closeTrade(
      tradeId,
      parseFloat(bid),
      parseFloat(ask),
      'USER'
    )

    // Check if this was a master trade and close follower trades
    if (tradeToClose) {
      console.log(`[CopyTrade] Checking if trade ${tradeId} belongs to a master. TradingAccountId: ${tradeToClose.tradingAccountId}`)
      const master = await MasterTrader.findOne({ 
        tradingAccountId: tradeToClose.tradingAccountId, 
        status: 'ACTIVE' 
      })
      
      console.log(`[CopyTrade] Master found: ${master ? master._id : 'NO MASTER FOUND'}`)
      
      if (master) {
        try {
          const closePrice = tradeToClose.side === 'BUY' ? parseFloat(bid) : parseFloat(ask)
          console.log(`[CopyTrade] Calling closeFollowerTrades for master trade ${tradeId} at price ${closePrice}`)
          const copyResults = await copyTradingEngine.closeFollowerTrades(tradeId, closePrice)
          console.log(`[CopyTrade] Closed ${copyResults.length} follower trades for master trade ${tradeId}`)
        } catch (copyError) {
          console.error('[CopyTrade] Error closing follower trades:', copyError)
        }
      }
    }

    // Process IB commission for the closed trade
    try {
      const ibResult = await ibEngine.processTradeCommission(result.trade)
      if (ibResult.processed) {
        console.log(`IB commission processed for trade ${result.trade._id}: ${ibResult.commissions?.length || 0} IBs credited`)
      }
    } catch (ibError) {
      console.error('Error processing IB commission:', ibError)
    }

    res.json({
      success: true,
      message: 'Trade closed successfully',
      trade: result.trade,
      realizedPnl: result.realizedPnl
    })
  } catch (error) {
    console.error('Error closing trade:', error)
    res.status(400).json({ 
      success: false, 
      message: error.message 
    })
  }
})

// PUT /api/trade/modify - Modify trade SL/TP
router.put('/modify', async (req, res) => {
  try {
    const { tradeId, sl, tp } = req.body
    console.log('Modify trade request:', { tradeId, sl, tp })

    if (!tradeId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Trade ID is required' 
      })
    }

    // First check if trade exists
    const existingTrade = await Trade.findById(tradeId)
    if (!existingTrade) {
      console.log('Trade not found:', tradeId)
      return res.status(404).json({ 
        success: false, 
        message: 'Trade not found' 
      })
    }
    console.log('Found trade:', existingTrade.tradeId, existingTrade.status)

    // Parse values and handle NaN
    const parsedSl = sl !== undefined && sl !== null && sl !== '' ? parseFloat(sl) : null
    const parsedTp = tp !== undefined && tp !== null && tp !== '' ? parseFloat(tp) : null
    
    const trade = await tradeEngine.modifyTrade(
      tradeId,
      parsedSl !== null && !isNaN(parsedSl) ? parsedSl : null,
      parsedTp !== null && !isNaN(parsedTp) ? parsedTp : null
    )

    // Mirror SL/TP modification to follower trades
    const master = await MasterTrader.findOne({ 
      tradingAccountId: trade.tradingAccountId, 
      status: 'ACTIVE' 
    })
    
    if (master) {
      try {
        await copyTradingEngine.mirrorSlTpModification(
          tradeId,
          parsedSl,
          parsedTp
        )
        console.log(`Mirrored SL/TP modification to follower trades for ${tradeId}`)
      } catch (copyError) {
        console.error('Error mirroring SL/TP:', copyError)
      }
    }

    res.json({
      success: true,
      message: 'Trade modified successfully',
      trade
    })
  } catch (error) {
    console.error('Error modifying trade:', error)
    res.status(400).json({ 
      success: false, 
      message: error.message 
    })
  }
})

// GET /api/trade/open/:tradingAccountId - Get all open trades for an account
router.get('/open/:tradingAccountId', async (req, res) => {
  try {
    const { tradingAccountId } = req.params

    const trades = await Trade.find({ 
      tradingAccountId, 
      status: 'OPEN' 
    }).sort({ openedAt: -1 })

    res.json({
      success: true,
      trades
    })
  } catch (error) {
    console.error('Error fetching open trades:', error)
    res.status(500).json({ 
      success: false, 
      message: error.message 
    })
  }
})

// GET /api/trade/pending/:tradingAccountId - Get all pending orders for an account
router.get('/pending/:tradingAccountId', async (req, res) => {
  try {
    const { tradingAccountId } = req.params

    const trades = await Trade.find({ 
      tradingAccountId, 
      status: 'PENDING' 
    }).sort({ createdAt: -1 })

    res.json({
      success: true,
      trades
    })
  } catch (error) {
    console.error('Error fetching pending orders:', error)
    res.status(500).json({ 
      success: false, 
      message: error.message 
    })
  }
})

// GET /api/trade/history/:tradingAccountId - Get trade history for an account
router.get('/history/:tradingAccountId', async (req, res) => {
  try {
    const { tradingAccountId } = req.params
    const { limit = 50, offset = 0 } = req.query

    const trades = await Trade.find({ 
      tradingAccountId, 
      status: 'CLOSED' 
    })
      .sort({ closedAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))

    const total = await Trade.countDocuments({ 
      tradingAccountId, 
      status: 'CLOSED' 
    })

    res.json({
      success: true,
      trades,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    })
  } catch (error) {
    console.error('Error fetching trade history:', error)
    res.status(500).json({ 
      success: false, 
      message: error.message 
    })
  }
})

// GET /api/trade/summary/:tradingAccountId - Get account summary with real-time values
router.get('/summary/:tradingAccountId', async (req, res) => {
  try {
    const { tradingAccountId } = req.params
    const { prices } = req.query // JSON string of current prices

    // Check for regular trading account first
    let account = await TradingAccount.findById(tradingAccountId)
    let isChallengeAccount = false
    
    // If not found, check for challenge account
    if (!account) {
      const challengeAcc = await ChallengeAccount.findById(tradingAccountId)
      if (challengeAcc) {
        account = {
          balance: challengeAcc.currentBalance,
          credit: 0,
          equity: challengeAcc.currentEquity
        }
        isChallengeAccount = true
      }
    }
    
    if (!account) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trading account not found' 
      })
    }

    const openTrades = await Trade.find({ 
      tradingAccountId, 
      status: 'OPEN' 
    })

    let currentPrices = {}
    if (prices) {
      try {
        currentPrices = JSON.parse(prices)
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Calculate used margin from open trades
    const usedMargin = openTrades.reduce((sum, t) => sum + (t.marginUsed || 0), 0)
    
    // Calculate floating PnL from current prices
    let floatingPnl = 0
    for (const trade of openTrades) {
      const priceData = currentPrices[trade.symbol]
      if (priceData) {
        const currentPrice = trade.side === 'BUY' ? priceData.bid : priceData.ask
        const pnl = trade.side === 'BUY'
          ? (currentPrice - trade.openPrice) * trade.quantity * trade.contractSize
          : (trade.openPrice - currentPrice) * trade.quantity * trade.contractSize
        floatingPnl += pnl
      }
    }

    // Calculate equity and free margin
    const balance = account.balance || 0
    const credit = account.credit || 0
    const equity = balance + credit + floatingPnl
    const freeMargin = equity - usedMargin
    const marginLevel = usedMargin > 0 ? (equity / usedMargin) * 100 : 0

    res.json({
      success: true,
      summary: {
        balance: Math.round(balance * 100) / 100,
        credit: Math.round(credit * 100) / 100,
        equity: Math.round(equity * 100) / 100,
        usedMargin: Math.round(usedMargin * 100) / 100,
        freeMargin: Math.round(freeMargin * 100) / 100,
        floatingPnl: Math.round(floatingPnl * 100) / 100,
        marginLevel: Math.round(marginLevel * 100) / 100
      },
      openTradesCount: openTrades.length
    })
  } catch (error) {
    console.error('Error fetching account summary:', error)
    res.status(500).json({ 
      success: false, 
      message: error.message 
    })
  }
})

// POST /api/trade/check-stopout - Check and execute stop out if needed
router.post('/check-stopout', async (req, res) => {
  try {
    const { tradingAccountId, prices } = req.body

    if (!tradingAccountId) {
      return res.status(400).json({ success: false, message: 'Trading account ID required' })
    }

    let currentPrices = {}
    if (prices) {
      try {
        currentPrices = typeof prices === 'string' ? JSON.parse(prices) : prices
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Check if this is a challenge account
    const challengeAccount = await ChallengeAccount.findById(tradingAccountId)
    if (challengeAccount) {
      // For challenge accounts, check drawdown breach instead of stop out
      // This is handled by propTradingEngine during trade close
      return res.json({ success: true, stopOutTriggered: false, isChallengeAccount: true })
    }

    const result = await tradeEngine.checkStopOut(tradingAccountId, currentPrices)
    
    if (result && result.stopOutTriggered) {
      return res.json({
        success: true,
        stopOutTriggered: true,
        reason: result.reason,
        closedTradesCount: result.closedTrades?.length || 0,
        message: `STOP OUT: All trades closed due to ${result.reason}`
      })
    }

    res.json({ success: true, stopOutTriggered: false })
  } catch (error) {
    console.error('Error checking stop out:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/trade/cancel - Cancel a pending order
router.post('/cancel', async (req, res) => {
  try {
    const { tradeId } = req.body

    if (!tradeId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Trade ID is required' 
      })
    }

    const trade = await Trade.findById(tradeId)
    if (!trade) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trade not found' 
      })
    }

    if (trade.status !== 'PENDING') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only pending orders can be cancelled' 
      })
    }

    trade.status = 'CANCELLED'
    trade.closedAt = new Date()
    trade.closedBy = 'USER'
    await trade.save()

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      trade
    })
  } catch (error) {
    console.error('Error cancelling order:', error)
    res.status(500).json({ 
      success: false, 
      message: error.message 
    })
  }
})

// GET /api/trade/debug-open - Debug endpoint to see all open trades with SL/TP
router.get('/debug-open', async (req, res) => {
  try {
    const openTrades = await Trade.find({ status: 'OPEN' })
    res.json({
      success: true,
      count: openTrades.length,
      trades: openTrades.map(t => ({
        tradeId: t.tradeId,
        symbol: t.symbol,
        side: t.side,
        openPrice: t.openPrice,
        sl: t.sl,
        stopLoss: t.stopLoss,
        tp: t.tp,
        takeProfit: t.takeProfit,
        isChallengeAccount: t.isChallengeAccount,
        status: t.status
      }))
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/trade/check-sltp - Check and trigger SL/TP for all trades
router.post('/check-sltp', async (req, res) => {
  try {
    const { prices } = req.body
    console.log(`[SL/TP Check] Endpoint called`)

    if (!prices || typeof prices !== 'object') {
      return res.status(400).json({ 
        success: false, 
        message: 'Prices object is required' 
      })
    }

    // Find all open trades with SL/TP to get their symbols
    const tradesWithSlTp = await Trade.find({
      status: 'OPEN',
      $or: [
        { sl: { $ne: null } },
        { stopLoss: { $ne: null } },
        { tp: { $ne: null } },
        { takeProfit: { $ne: null } }
      ]
    }).select('symbol')
    
    // Get unique symbols that need fresh prices
    const symbolsNeedingFreshPrices = [...new Set(tradesWithSlTp.map(t => t.symbol))]
    
    // Fetch fresh prices for symbols with SL/TP trades
    const freshPrices = { ...prices }
    for (const symbol of symbolsNeedingFreshPrices) {
      const freshPrice = await getFreshPrice(symbol)
      if (freshPrice) {
        freshPrices[symbol] = freshPrice
        console.log(`[SL/TP Check] Fresh price for ${symbol}: bid=${freshPrice.bid}, ask=${freshPrice.ask}`)
      }
    }

    // Debug: Log prices
    const xauPrice = freshPrices['XAUUSD']
    if (xauPrice) {
      console.log(`[SL/TP Check] XAUUSD bid=${xauPrice.bid}, ask=${xauPrice.ask}`)
    }

    // Check SL/TP for all open challenge trades
    const closedChallengeTrades = await propTradingEngine.checkSlTpForAllTrades(freshPrices)
    
    // Check SL/TP for all regular trades
    const closedRegularTrades = await tradeEngine.checkSlTpForAllTrades(freshPrices)

    const allClosedTrades = [...closedChallengeTrades, ...closedRegularTrades]

    res.json({
      success: true,
      closedCount: allClosedTrades.length,
      closedTrades: allClosedTrades.map(ct => ({
        tradeId: ct.trade.tradeId,
        symbol: ct.trade.symbol,
        reason: ct.trigger || ct.reason,
        pnl: ct.pnl
      }))
    })
  } catch (error) {
    console.error('Error checking SL/TP:', error)
    res.status(500).json({ 
      success: false, 
      message: error.message 
    })
  }
})

// POST /api/trade/check-pending - Check and execute pending orders when price is reached
router.post('/check-pending', async (req, res) => {
  try {
    const { prices } = req.body

    if (!prices || typeof prices !== 'object') {
      return res.status(400).json({ 
        success: false, 
        message: 'Prices object is required' 
      })
    }

    // Check pending orders for execution
    const executedTrades = await tradeEngine.checkPendingOrders(prices)

    res.json({
      success: true,
      executedCount: executedTrades.length,
      executedTrades: executedTrades.map(et => ({
        tradeId: et.trade.tradeId,
        symbol: et.trade.symbol,
        side: et.trade.side,
        orderType: et.trade.orderType,
        executionPrice: et.executionPrice,
        executedAt: et.executedAt
      }))
    })
  } catch (error) {
    console.error('Error checking pending orders:', error)
    res.status(500).json({ 
      success: false, 
      message: error.message 
    })
  }
})

export default router
