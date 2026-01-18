import Trade from '../models/Trade.js'
import TradingAccount from '../models/TradingAccount.js'
import Charges from '../models/Charges.js'
import TradeSettings from '../models/TradeSettings.js'
import AdminLog from '../models/AdminLog.js'
import ibEngine from './ibEngineNew.js'

class TradeEngine {
  constructor() {
    this.CONTRACT_SIZE = 100000
  }

  // Get contract size based on symbol type
  getContractSize(symbol) {
    // Metals - 100 oz for gold, 5000 oz for silver
    if (symbol === 'XAUUSD') return 100
    if (symbol === 'XAGUSD') return 5000
    // Crypto - 1 unit
    if (['BTCUSD', 'ETHUSD', 'LTCUSD', 'XRPUSD', 'BCHUSD'].includes(symbol)) return 1
    // Forex - standard 100,000
    return 100000
  }

  // Calculate execution price with spread
  calculateExecutionPrice(side, bid, ask, spreadValue, spreadType) {
    let spread = spreadValue
    if (spreadType === 'PERCENTAGE') {
      spread = (ask - bid) * (spreadValue / 100)
    }
    
    if (side === 'BUY') {
      return ask + spread
    } else {
      return bid - spread
    }
  }

  // Calculate margin required for a trade
  // Formula: (Lots * Contract Size * Price) / Leverage
  // Example: 0.01 lot XAUUSD at $2650 with 1:100 leverage
  // = (0.01 * 100 * 2650) / 100 = $26.50 margin required
  calculateMargin(quantity, openPrice, leverage, contractSize = this.CONTRACT_SIZE) {
    const leverageNum = parseInt(leverage.toString().replace('1:', '')) || 100
    const margin = (quantity * contractSize * openPrice) / leverageNum
    return Math.round(margin * 100) / 100 // Round to 2 decimal places
  }

  // Calculate commission based on type
  calculateCommission(quantity, openPrice, commissionType, commissionValue, contractSize = this.CONTRACT_SIZE) {
    switch (commissionType) {
      case 'PER_LOT':
        return quantity * commissionValue
      case 'PER_TRADE':
        return commissionValue
      case 'PERCENTAGE':
        const tradeValue = quantity * contractSize * openPrice
        return tradeValue * (commissionValue / 100)
      default:
        return 0
    }
  }

  // Calculate PnL for a trade
  calculatePnl(side, openPrice, currentPrice, quantity, contractSize = this.CONTRACT_SIZE) {
    if (side === 'BUY') {
      return (currentPrice - openPrice) * quantity * contractSize
    } else {
      return (openPrice - currentPrice) * quantity * contractSize
    }
  }

  // Calculate floating PnL including charges
  calculateFloatingPnl(trade, currentBid, currentAsk) {
    const currentPrice = trade.side === 'BUY' ? currentBid : currentAsk
    const rawPnl = this.calculatePnl(trade.side, trade.openPrice, currentPrice, trade.quantity, trade.contractSize)
    return rawPnl - trade.commission - trade.swap
  }

  // Get account financial summary (real-time calculated values)
  async getAccountSummary(tradingAccountId, openTrades, currentPrices) {
    const account = await TradingAccount.findById(tradingAccountId)
    if (!account) throw new Error('Trading account not found')

    let usedMargin = 0
    let floatingPnl = 0

    for (const trade of openTrades) {
      usedMargin += trade.marginUsed
      const prices = currentPrices[trade.symbol]
      if (prices) {
        floatingPnl += this.calculateFloatingPnl(trade, prices.bid, prices.ask)
      }
    }

    const equity = account.balance + account.credit + floatingPnl
    const freeMargin = equity - usedMargin

    return {
      balance: account.balance,
      credit: account.credit,
      equity,
      usedMargin,
      freeMargin,
      floatingPnl,
      marginLevel: usedMargin > 0 ? (equity / usedMargin) * 100 : 0
    }
  }

  // Validate if trade can be opened
  async validateTradeOpen(tradingAccountId, symbol, side, quantity, openPrice, leverage, contractSize = this.CONTRACT_SIZE) {
    const account = await TradingAccount.findById(tradingAccountId).populate('accountTypeId')
    if (!account) {
      return { valid: false, error: 'Trading account not found' }
    }

    console.log(`Account validation: ID=${tradingAccountId}, Balance=${account.balance}, Credit=${account.credit}, Status=${account.status}`)

    if (account.status !== 'Active') {
      return { valid: false, error: `Account is ${account.status}` }
    }

    // CRITICAL: Check if account has any balance at all
    if (account.balance <= 0 && (account.credit || 0) <= 0) {
      return { valid: false, error: `Insufficient funds. Balance: $${account.balance}, Credit: $${account.credit || 0}. Please deposit to trade.` }
    }

    // Get open trades for margin calculation
    const openTrades = await Trade.find({ tradingAccountId, status: 'OPEN' })
    
    // Get trade settings
    const settings = await TradeSettings.getSettings(account.accountTypeId?._id)

    // Check max open trades
    if (openTrades.length >= settings.maxOpenTradesPerUser) {
      return { valid: false, error: 'Maximum open trades limit reached' }
    }

    // Check max lots
    const totalLots = openTrades.reduce((sum, t) => sum + t.quantity, 0) + quantity
    if (totalLots > settings.maxOpenLotsPerUser) {
      return { valid: false, error: 'Maximum lots limit exceeded' }
    }

    // Calculate margin required for new trade
    const marginRequired = this.calculateMargin(quantity, openPrice, leverage, contractSize)

    // Calculate current used margin from existing trades
    const usedMargin = openTrades.reduce((sum, t) => sum + (t.marginUsed || 0), 0)
    
    // Equity = Balance + Credit (floating PnL is calculated in real-time, not stored)
    // For validation, we use balance + credit as the base
    const equity = account.balance + (account.credit || 0)
    
    // Free margin = Equity - Used Margin
    const freeMargin = equity - usedMargin

    // CRITICAL: Ensure margin required doesn't exceed free margin
    if (marginRequired > freeMargin) {
      return { 
        valid: false, 
        error: `Insufficient margin. Required: $${marginRequired.toFixed(2)}, Available: $${freeMargin.toFixed(2)}` 
      }
    }

    // Additional check: Ensure user has at least the margin amount in their account
    if (marginRequired > equity) {
      return { 
        valid: false, 
        error: `Insufficient equity. Required margin: $${marginRequired.toFixed(2)}, Your equity: $${equity.toFixed(2)}` 
      }
    }

    return { valid: true, marginRequired, freeMargin, usedMargin, equity }
  }

  // Check if market is open for a symbol
  isMarketOpen(symbol) {
    const now = new Date()
    const utcDay = now.getUTCDay() // 0 = Sunday, 6 = Saturday
    const utcHour = now.getUTCHours()
    
    // Crypto markets are always open
    if (['BTCUSD', 'ETHUSD', 'LTCUSD', 'XRPUSD', 'BCHUSD', 'BNBUSD', 'SOLUSD', 'ADAUSD', 'DOGEUSD', 'DOTUSD', 'MATICUSD', 'AVAXUSD', 'LINKUSD'].includes(symbol)) {
      return true
    }
    
    // Forex and Metals: Closed from Friday 22:00 UTC to Sunday 22:00 UTC
    // Saturday (day 6) - fully closed
    if (utcDay === 6) return false
    // Sunday before 22:00 UTC - closed
    if (utcDay === 0 && utcHour < 22) return false
    // Friday after 22:00 UTC - closed
    if (utcDay === 5 && utcHour >= 22) return false
    
    return true
  }

  // Open a new trade
  async openTrade(userId, tradingAccountId, symbol, segment, side, orderType, quantity, bid, ask, sl = null, tp = null, userLeverage = null) {
    const account = await TradingAccount.findById(tradingAccountId).populate('accountTypeId')
    if (!account) throw new Error('Trading account not found')

    // Check if market is open
    if (!this.isMarketOpen(symbol)) {
      throw new Error(`Market is closed for ${symbol}. Forex and metals trade Mon-Fri only.`)
    }

    // Validate bid/ask prices are valid
    if (!bid || !ask || bid <= 0 || ask <= 0) {
      throw new Error('Invalid market prices. Please try again.')
    }

    // Get charges for this trade
    const charges = await Charges.getChargesForTrade(userId, symbol, segment, account.accountTypeId?._id)
    console.log(`Charges retrieved: spread=${charges.spreadValue}, commission=${charges.commissionValue}, commissionType=${charges.commissionType}`)

    // Calculate execution price with spread
    const openPrice = this.calculateExecutionPrice(side, bid, ask, charges.spreadValue, charges.spreadType)

    // Get contract size based on symbol
    const contractSize = this.getContractSize(symbol)

    // Use user-selected leverage if provided, otherwise use account's leverage
    // User can select any leverage up to account's max leverage
    const accountMaxLeverage = parseInt(account.leverage.toString().replace('1:', '')) || 100
    let selectedLeverage = accountMaxLeverage
    
    if (userLeverage) {
      const userLeverageNum = parseInt(userLeverage.toString().replace('1:', '')) || accountMaxLeverage
      // User can only use leverage up to account's max
      selectedLeverage = Math.min(userLeverageNum, accountMaxLeverage)
    }
    
    const leverage = `1:${selectedLeverage}`
    const marginRequired = this.calculateMargin(quantity, openPrice, leverage, contractSize)
    
    // Log for debugging
    console.log(`Trade validation: ${quantity} lots ${symbol} @ ${openPrice}, Contract: ${contractSize}, Leverage: ${leverage}, Margin Required: $${marginRequired}`)

    // Validate trade - pass the correct parameters
    const validation = await this.validateTradeOpen(tradingAccountId, symbol, side, quantity, openPrice, leverage, contractSize)
    if (!validation.valid) {
      throw new Error(validation.error)
    }
    
    console.log(`Trade validated: Free Margin: $${validation.freeMargin}, Equity: $${validation.equity}`)

    // Calculate commission based on side and commission settings
    let commission = 0
    const shouldChargeCommission = (side === 'BUY' && charges.commissionOnBuy !== false) || 
                                   (side === 'SELL' && charges.commissionOnSell !== false)
    
    if (shouldChargeCommission && charges.commissionValue > 0) {
      commission = this.calculateCommission(quantity, openPrice, charges.commissionType, charges.commissionValue, contractSize)
    }
    console.log(`Commission calculated: $${commission} (side=${side}, commissionOnBuy=${charges.commissionOnBuy}, commissionOnSell=${charges.commissionOnSell})`)

    // Generate trade ID
    const tradeId = await Trade.generateTradeId()

    // Create trade
    const trade = await Trade.create({
      userId,
      tradingAccountId,
      tradeId,
      symbol,
      segment,
      side,
      orderType,
      quantity,
      openPrice,
      stopLoss: sl,
      takeProfit: tp,
      marginUsed: marginRequired,
      leverage: parseInt(leverage.toString().replace('1:', '')) || 100,
      contractSize: contractSize,
      spread: charges.spreadValue,
      commission,
      swap: 0,
      floatingPnl: 0,
      status: orderType === 'MARKET' ? 'OPEN' : 'PENDING',
      pendingPrice: orderType !== 'MARKET' ? openPrice : null
    })

    // Deduct commission from trading account balance when trade opens
    if (orderType === 'MARKET' && commission > 0) {
      account.balance -= commission
      if (account.balance < 0) account.balance = 0
      await account.save()
    }

    return trade
  }

  // Close a trade
  async closeTrade(tradeId, currentBid, currentAsk, closedBy = 'USER', adminId = null) {
    const trade = await Trade.findById(tradeId).populate({ path: 'tradingAccountId', populate: { path: 'accountTypeId' } })
    if (!trade) throw new Error('Trade not found')
    if (trade.status !== 'OPEN') throw new Error('Trade is not open')

    const closePrice = trade.side === 'BUY' ? currentBid : currentAsk
    
    // Get charges to check if commission on close is enabled
    const charges = await Charges.getChargesForTrade(
      trade.userId, 
      trade.symbol, 
      trade.segment, 
      trade.tradingAccountId?.accountTypeId?._id
    )
    
    // Calculate commission on close if enabled
    let closeCommission = 0
    if (charges.commissionOnClose && charges.commissionValue > 0) {
      closeCommission = this.calculateCommission(trade.quantity, closePrice, charges.commissionType, charges.commissionValue, trade.contractSize)
      console.log(`Commission on close: $${closeCommission}`)
    }
    
    // Calculate final PnL (commission already deducted on open, subtract swap and close commission)
    const rawPnl = this.calculatePnl(trade.side, trade.openPrice, closePrice, trade.quantity, trade.contractSize)
    const realizedPnl = rawPnl - trade.swap - closeCommission

    // Update trade
    trade.closePrice = closePrice
    trade.realizedPnl = realizedPnl
    trade.status = 'CLOSED'
    trade.closedBy = closedBy
    trade.closedAt = new Date()

    if (adminId) {
      trade.adminModified = true
      trade.adminModifiedBy = adminId
      trade.adminModifiedAt = new Date()
    }

    await trade.save()

    // Update account balance with proper credit handling
    const account = await TradingAccount.findById(trade.tradingAccountId)
    
    if (realizedPnl >= 0) {
      // Profit: Add to balance only (credit stays the same)
      account.balance += realizedPnl
    } else {
      // Loss: First deduct from balance, then from credit if balance insufficient
      const loss = Math.abs(realizedPnl)
      
      if (account.balance >= loss) {
        // Balance can cover the loss
        account.balance -= loss
      } else {
        // Balance cannot cover the loss - use credit for remaining
        const remainingLoss = loss - account.balance
        account.balance = 0
        
        // Deduct remaining loss from credit
        if (account.credit > 0) {
          account.credit = Math.max(0, (account.credit || 0) - remainingLoss)
        }
      }
    }
    
    await account.save()

    // Log admin action if applicable
    if (adminId) {
      await AdminLog.create({
        adminId,
        action: closedBy === 'ADMIN' ? 'TRADE_CLOSE' : 'TRADE_FORCE_CLOSE',
        targetType: 'TRADE',
        targetId: trade._id,
        previousValue: { status: 'OPEN' },
        newValue: { status: 'CLOSED', realizedPnl }
      })
    }

    // Process IB commission for this trade
    try {
      await ibEngine.processTradeCommission(trade)
    } catch (ibError) {
      console.error('Error processing IB commission:', ibError)
    }

    // Close follower trades if this is a master trade
    this.closeFollowerTradesAsync(trade._id, closePrice)

    return { trade, realizedPnl }
  }

  // Async close follower trades (non-blocking)
  async closeFollowerTradesAsync(masterTradeId, closePrice) {
    try {
      const copyTradingEngine = (await import('./copyTradingEngine.js')).default
      const results = await copyTradingEngine.closeFollowerTrades(masterTradeId, closePrice)
      if (results.length > 0) {
        console.log(`Closed ${results.length} follower trades for master trade ${masterTradeId}`)
      }
    } catch (error) {
      console.error('Error closing follower trades:', error)
    }
  }

  // Modify trade SL/TP
  async modifyTrade(tradeId, sl = null, tp = null, adminId = null) {
    const trade = await Trade.findById(tradeId)
    if (!trade) throw new Error('Trade not found')
    if (trade.status !== 'OPEN') throw new Error('Trade is not open')

    const previousValue = { stopLoss: trade.stopLoss, takeProfit: trade.takeProfit }

    // Update both stopLoss/takeProfit and sl/tp fields for compatibility
    // Handle NaN values - treat as null
    if (sl !== null && !isNaN(sl)) {
      trade.stopLoss = sl
      trade.sl = sl
    }
    if (tp !== null && !isNaN(tp)) {
      trade.takeProfit = tp
      trade.tp = tp
    }

    if (adminId) {
      trade.adminModified = true
      trade.adminModifiedBy = adminId
      trade.adminModifiedAt = new Date()
    }

    await trade.save()

    // Log admin action
    if (adminId) {
      await AdminLog.create({
        adminId,
        action: sl !== null ? 'TRADE_MODIFY_SL' : 'TRADE_MODIFY_TP',
        targetType: 'TRADE',
        targetId: trade._id,
        previousValue,
        newValue: { stopLoss: trade.stopLoss, takeProfit: trade.takeProfit }
      })
    }

    return trade
  }

  // Check and execute stop-out
  async checkStopOut(tradingAccountId, currentPrices) {
    const account = await TradingAccount.findById(tradingAccountId).populate('accountTypeId')
    if (!account) return null

    const openTrades = await Trade.find({ tradingAccountId, status: 'OPEN' })
    if (openTrades.length === 0) return null

    const settings = await TradeSettings.getSettings(account.accountTypeId?._id)
    const summary = await this.getAccountSummary(tradingAccountId, openTrades, currentPrices)

    // CRITICAL: Check if equity is negative or zero - immediate stop out
    // Also check if margin level is below stop-out level (default 20%)
    const stopOutLevel = settings.stopOutLevel || 20
    const shouldStopOut = 
      summary.equity <= 0 || 
      summary.freeMargin < 0 ||
      (summary.marginLevel > 0 && summary.marginLevel <= stopOutLevel)

    if (shouldStopOut) {
      console.log(`STOP OUT TRIGGERED for account ${tradingAccountId}: Equity=${summary.equity}, FreeMargin=${summary.freeMargin}, MarginLevel=${summary.marginLevel}%`)
      
      // Force close all trades
      const closedTrades = []
      for (const trade of openTrades) {
        const prices = currentPrices[trade.symbol]
        if (prices) {
          try {
            const result = await this.closeTrade(trade._id, prices.bid, prices.ask, 'STOP_OUT')
            closedTrades.push(result)
          } catch (err) {
            console.error(`Error closing trade ${trade.tradeId} during stop out:`, err)
          }
        }
      }

      // Reset account balance if negative
      const finalAccount = await TradingAccount.findById(tradingAccountId)
      if (finalAccount.balance < 0) {
        finalAccount.balance = 0
      }
      await finalAccount.save()

      return { 
        stopOutTriggered: true, 
        closedTrades,
        reason: summary.equity <= 0 ? 'EQUITY_ZERO' : summary.freeMargin < 0 ? 'NEGATIVE_FREE_MARGIN' : 'MARGIN_LEVEL',
        finalEquity: summary.equity,
        finalMarginLevel: summary.marginLevel
      }
    }

    return { stopOutTriggered: false }
  }

  // Check SL/TP for all open trades (non-challenge only)
  async checkSlTpForAllTrades(currentPrices) {
    // Only check non-challenge trades (challenge trades are handled by propTradingEngine)
    const openTrades = await Trade.find({ status: 'OPEN', isChallengeAccount: { $ne: true } })
    const triggeredTrades = []

    if (openTrades.length > 0) {
      console.log(`[Regular SL/TP] Checking ${openTrades.length} open regular trades`)
    }

    for (const trade of openTrades) {
      const prices = currentPrices[trade.symbol]
      if (!prices) {
        console.log(`[Regular SL/TP] No price data for ${trade.symbol}`)
        continue
      }

      const sl = trade.sl || trade.stopLoss
      const tp = trade.tp || trade.takeProfit
      const bid = prices.bid
      const ask = prices.ask || prices.bid // Fallback to bid if ask not available

      // Only log if SL or TP is actually set (not null)
      if (sl || tp) {
        // Minimal logging - only show when close to triggering
        const slTrigger = trade.side === 'BUY' ? (sl && bid <= sl) : (sl && ask >= sl)
        const tpTrigger = trade.side === 'BUY' ? (tp && bid >= tp) : (tp && ask <= tp)
        
        if (slTrigger || tpTrigger) {
          console.log(`[Regular SL/TP] Trade ${trade.tradeId}: ${trade.side} ${trade.symbol} | bid=${bid} ask=${ask} | SL=${sl || 'none'} TP=${tp || 'none'}`)
        }
      }

      const trigger = trade.checkSlTp(bid, ask)
      if (trigger) {
        console.log(`[Regular SL/TP] TRIGGERED! Trade ${trade.tradeId}: ${trigger} at bid=${prices.bid}, ask=${prices.ask}`)
        const result = await this.closeTrade(trade._id, prices.bid, prices.ask, trigger)
        triggeredTrades.push({ trade: result.trade, trigger, pnl: result.realizedPnl })
      }
    }

    return triggeredTrades
  }

  // Check and execute pending orders when price is reached
  async checkPendingOrders(currentPrices) {
    const pendingTrades = await Trade.find({ status: 'PENDING' })
    const executedTrades = []

    for (const trade of pendingTrades) {
      const prices = currentPrices[trade.symbol]
      if (!prices) continue

      let shouldExecute = false
      const currentBid = prices.bid
      const currentAsk = prices.ask

      switch (trade.orderType) {
        case 'BUY_LIMIT':
          // Execute when ask price drops to or below pending price
          if (currentAsk <= trade.pendingPrice) shouldExecute = true
          break
        case 'BUY_STOP':
          // Execute when ask price rises to or above pending price
          if (currentAsk >= trade.pendingPrice) shouldExecute = true
          break
        case 'SELL_LIMIT':
          // Execute when bid price rises to or above pending price
          if (currentBid >= trade.pendingPrice) shouldExecute = true
          break
        case 'SELL_STOP':
          // Execute when bid price drops to or below pending price
          if (currentBid <= trade.pendingPrice) shouldExecute = true
          break
      }

      if (shouldExecute) {
        try {
          // Update trade to OPEN status
          trade.status = 'OPEN'
          trade.openPrice = trade.side === 'BUY' ? currentAsk : currentBid
          trade.openedAt = new Date()
          await trade.save()

          executedTrades.push({
            trade,
            executedAt: new Date(),
            executionPrice: trade.openPrice
          })

          console.log(`Pending order ${trade.tradeId} executed at ${trade.openPrice}`)
        } catch (error) {
          console.error(`Error executing pending order ${trade.tradeId}:`, error)
        }
      }
    }

    return executedTrades
  }

  // Apply swap to all open trades (called at rollover time)
  async applySwap() {
    const openTrades = await Trade.find({ status: 'OPEN' }).populate({
      path: 'tradingAccountId',
      populate: { path: 'accountTypeId' }
    })

    for (const trade of openTrades) {
      const charges = await Charges.getChargesForTrade(
        trade.userId,
        trade.symbol,
        trade.segment,
        trade.tradingAccountId?.accountTypeId?._id
      )

      const swapRate = trade.side === 'BUY' ? charges.swapLong : charges.swapShort
      let swapAmount = 0

      if (charges.swapType === 'POINTS') {
        swapAmount = trade.quantity * trade.contractSize * swapRate
      } else {
        // Percentage of trade value
        const tradeValue = trade.quantity * trade.contractSize * trade.openPrice
        swapAmount = tradeValue * (swapRate / 100)
      }

      trade.swap += swapAmount
      await trade.save()
    }
  }
}

export default new TradeEngine()
