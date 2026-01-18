import Challenge from '../models/Challenge.js'
import ChallengeAccount from '../models/ChallengeAccount.js'
import PropSettings from '../models/PropSettings.js'
import Trade from '../models/Trade.js'
import User from '../models/User.js'
import Charges from '../models/Charges.js'
import { sendTemplateEmail } from '../services/emailService.js'

class PropTradingEngine {
  constructor() {
    this.ERROR_CODES = {
      CHALLENGE_MODE_DISABLED: 'CHALLENGE_MODE_DISABLED',
      CHALLENGE_NOT_FOUND: 'CHALLENGE_NOT_FOUND',
      ACCOUNT_NOT_ACTIVE: 'ACCOUNT_NOT_ACTIVE',
      ACCOUNT_FAILED: 'ACCOUNT_FAILED',
      ACCOUNT_EXPIRED: 'ACCOUNT_EXPIRED',
      SL_MANDATORY: 'SL_MANDATORY',
      MAX_TRADES_PER_DAY: 'MAX_TRADES_PER_DAY',
      MAX_CONCURRENT_TRADES: 'MAX_CONCURRENT_TRADES',
      SYMBOL_NOT_ALLOWED: 'SYMBOL_NOT_ALLOWED',
      SEGMENT_NOT_ALLOWED: 'SEGMENT_NOT_ALLOWED',
      MAX_LOSS_PER_TRADE: 'MAX_LOSS_PER_TRADE',
      MIN_HOLD_TIME: 'MIN_HOLD_TIME',
      DAILY_DRAWDOWN_BREACH: 'DAILY_DRAWDOWN_BREACH',
      OVERALL_DRAWDOWN_BREACH: 'OVERALL_DRAWDOWN_BREACH',
      INSUFFICIENT_MARGIN: 'INSUFFICIENT_MARGIN'
    }
  }

  // Check if challenge mode is enabled
  async isChallengeEnabled() {
    const settings = await PropSettings.getSettings()
    return settings.challengeModeEnabled
  }

  // Create challenge account after payment
  async createChallengeAccount(userId, challengeId, paymentId = null) {
    const challenge = await Challenge.findById(challengeId)
    if (!challenge || !challenge.isActive) {
      throw new Error('Challenge not found or inactive')
    }

    const accountId = await ChallengeAccount.generateAccountId('CH')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + (challenge.rules.challengeExpiryDays || 30))

    const account = await ChallengeAccount.create({
      userId,
      challengeId,
      accountId,
      accountType: 'CHALLENGE',
      currentPhase: 1,
      totalPhases: challenge.stepsCount || 2,
      status: 'ACTIVE',
      initialBalance: challenge.fundSize,
      currentBalance: challenge.fundSize,
      currentEquity: challenge.fundSize,
      phaseStartBalance: challenge.fundSize,
      dayStartEquity: challenge.fundSize,
      lowestEquityToday: challenge.fundSize,
      lowestEquityOverall: challenge.fundSize,
      highestEquity: challenge.fundSize,
      paymentId,
      paymentStatus: paymentId ? 'COMPLETED' : 'PENDING',
      profitSplitPercent: challenge.fundedSettings?.profitSplitPercent || 80,
      expiresAt
    })

    return account
  }

  // Validate trade open request for challenge account
  async validateTradeOpen(challengeAccountId, tradeParams) {
    const account = await ChallengeAccount.findById(challengeAccountId)
      .populate('challengeId')
    
    if (!account) {
      return { valid: false, error: 'Challenge account not found', code: 'ACCOUNT_NOT_FOUND' }
    }

    const challenge = account.challengeId
    const rules = challenge.rules

    // Check account status
    if (account.status === 'FAILED') {
      return { valid: false, error: 'Challenge account has failed', code: this.ERROR_CODES.ACCOUNT_FAILED }
    }
    if (account.status === 'EXPIRED') {
      return { valid: false, error: 'Challenge has expired', code: this.ERROR_CODES.ACCOUNT_EXPIRED }
    }
    if (account.status !== 'ACTIVE' && account.status !== 'FUNDED') {
      return { valid: false, error: 'Challenge account is not active', code: this.ERROR_CODES.ACCOUNT_NOT_ACTIVE }
    }

    // Check expiry
    if (new Date() > account.expiresAt) {
      account.status = 'EXPIRED'
      await account.save()
      return { valid: false, error: 'Challenge has expired', code: this.ERROR_CODES.ACCOUNT_EXPIRED }
    }

    // Check stop loss mandatory
    if (rules.stopLossMandatory && !tradeParams.sl && !tradeParams.stopLoss) {
      return { 
        valid: false, 
        error: 'Stop Loss is mandatory for this challenge', 
        code: this.ERROR_CODES.SL_MANDATORY,
        uiAction: 'SHOW_SL_POPUP'
      }
    }

    // Check max trades per day
    if (rules.maxTradesPerDay && account.tradesToday >= rules.maxTradesPerDay) {
      return { 
        valid: false, 
        error: `Maximum ${rules.maxTradesPerDay} trades per day allowed`, 
        code: this.ERROR_CODES.MAX_TRADES_PER_DAY,
        uiAction: 'DISABLE_TRADE_BUTTON'
      }
    }

    // Check max concurrent trades
    if (rules.maxConcurrentTrades && account.openTradesCount >= rules.maxConcurrentTrades) {
      return { 
        valid: false, 
        error: `Maximum ${rules.maxConcurrentTrades} concurrent trades allowed`, 
        code: this.ERROR_CODES.MAX_CONCURRENT_TRADES,
        uiAction: 'DISABLE_TRADE_BUTTON'
      }
    }

    // Check allowed symbols - only validate if explicitly set and not empty
    // If allowedSymbols is not set or empty, allow all symbols
    if (rules.allowedSymbols && Array.isArray(rules.allowedSymbols) && rules.allowedSymbols.length > 0) {
      if (!rules.allowedSymbols.includes(tradeParams.symbol)) {
        return { 
          valid: false, 
          error: `Symbol ${tradeParams.symbol} is not allowed for this challenge`, 
          code: this.ERROR_CODES.SYMBOL_NOT_ALLOWED,
          uiAction: 'SHOW_SYMBOL_WARNING'
        }
      }
    }
    // If no symbols specified, all symbols are allowed by default

    // Check allowed segments - only validate if explicitly set and not empty
    // If allowedSegments is not set or empty, allow all segments
    if (rules.allowedSegments && Array.isArray(rules.allowedSegments) && rules.allowedSegments.length > 0) {
      // Map frontend segment names to database values
      const segmentMapping = {
        'Forex': 'FOREX',
        'Crypto': 'CRYPTO',
        'Metals': 'COMMODITIES',
        'Stocks': 'STOCKS',
        'Indices': 'INDICES',
        'FOREX': 'FOREX',
        'CRYPTO': 'CRYPTO',
        'COMMODITIES': 'COMMODITIES',
        'STOCKS': 'STOCKS',
        'INDICES': 'INDICES'
      }
      const mappedSegment = segmentMapping[tradeParams.segment] || tradeParams.segment?.toUpperCase()
      
      if (!rules.allowedSegments.includes(mappedSegment)) {
        return { 
          valid: false, 
          error: `Segment ${tradeParams.segment} is not allowed for this challenge`, 
          code: this.ERROR_CODES.SEGMENT_NOT_ALLOWED,
          uiAction: 'SHOW_SEGMENT_WARNING'
        }
      }
    }
    // If no segments specified, all segments are allowed by default

    // Check max loss per trade (if SL is set)
    const stopLossValue = tradeParams.sl || tradeParams.stopLoss
    if (stopLossValue && rules.maxLossPerTradePercent) {
      const potentialLoss = this.calculatePotentialLoss({ ...tradeParams, stopLoss: stopLossValue })
      const maxLossAmount = (rules.maxLossPerTradePercent / 100) * account.currentEquity
      
      if (potentialLoss > maxLossAmount) {
        return { 
          valid: false, 
          error: `Potential loss exceeds ${rules.maxLossPerTradePercent}% limit. Adjust your stop loss.`, 
          code: this.ERROR_CODES.MAX_LOSS_PER_TRADE,
          uiAction: 'SHOW_LOSS_WARNING',
          maxAllowedLoss: maxLossAmount
        }
      }
    }

    // Check margin
    const marginRequired = this.calculateMargin(tradeParams, account)
    if (marginRequired > account.currentEquity * 0.9) {
      return { 
        valid: false, 
        error: 'Insufficient margin for this trade', 
        code: this.ERROR_CODES.INSUFFICIENT_MARGIN,
        uiAction: 'SHOW_MARGIN_WARNING'
      }
    }

    return { valid: true, account, challenge }
  }

  // Calculate execution price with spread
  calculateExecutionPrice(side, bid, ask, spreadValue, spreadType) {
    let spread = spreadValue || 0
    if (spreadType === 'PERCENTAGE') {
      spread = (ask - bid) * (spreadValue / 100)
    }
    
    if (side === 'BUY') {
      return ask + spread
    } else {
      return bid - spread
    }
  }

  // Calculate commission
  calculateCommission(quantity, price, commissionType, commissionValue, contractSize) {
    if (commissionType === 'FIXED') {
      return commissionValue
    } else if (commissionType === 'PER_LOT') {
      return quantity * commissionValue
    } else if (commissionType === 'PERCENTAGE') {
      const tradeValue = quantity * contractSize * price
      return tradeValue * (commissionValue / 100)
    }
    return 0
  }

  // Open a trade for challenge account
  async openChallengeTrade(userId, challengeAccountId, tradeParams) {
    const account = await ChallengeAccount.findById(challengeAccountId)
      .populate('challengeId')
    
    if (!account) {
      throw new Error('Challenge account not found')
    }

    const challenge = account.challengeId
    const rules = challenge.rules

    const { symbol, segment, side, orderType, quantity, bid, ask, sl, tp } = tradeParams

    // Get charges for this trade (use default charges for challenge accounts)
    const charges = await Charges.getChargesForTrade(userId, symbol, segment || 'Forex', null)
    
    // Calculate execution price with spread
    const openPrice = this.calculateExecutionPrice(side, bid, ask, charges.spreadValue, charges.spreadType)

    // Get contract size based on symbol
    const contractSize = this.getContractSize(symbol)
    
    // Calculate margin
    const leverage = rules.maxLeverage || 100
    const marginRequired = (quantity * contractSize * openPrice) / leverage

    // Calculate commission on open
    let commission = 0
    const shouldChargeCommission = (side === 'BUY' && charges.commissionOnBuy !== false) || 
                                   (side === 'SELL' && charges.commissionOnSell !== false)
    if (shouldChargeCommission && charges.commissionValue > 0) {
      commission = this.calculateCommission(quantity, openPrice, charges.commissionType, charges.commissionValue, contractSize)
    }

    // Generate trade ID
    const tradeId = `CH${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    // Create trade
    const trade = await Trade.create({
      userId,
      tradingAccountId: challengeAccountId,
      accountType: 'ChallengeAccount',
      isChallengeAccount: true,
      tradeId,
      symbol,
      segment: segment || 'Forex',
      side,
      orderType,
      quantity,
      openPrice,
      currentPrice: openPrice,
      marginUsed: marginRequired,
      contractSize,
      leverage: leverage,
      spread: charges.spreadValue || 0,
      status: 'OPEN',
      openedAt: new Date(),
      sl: sl || null,
      tp: tp || null,
      stopLoss: sl || null,
      takeProfit: tp || null,
      commission,
      swap: 0
    })

    // Update challenge account stats
    await this.onTradeOpened(challengeAccountId, trade)

    return trade
  }

  // Get contract size based on symbol
  getContractSize(symbol) {
    if (symbol === 'XAUUSD') return 100
    if (symbol === 'XAGUSD') return 5000
    if (['BTCUSD', 'ETHUSD', 'LTCUSD', 'XRPUSD', 'BCHUSD'].includes(symbol)) return 1
    return 100000
  }

  // Validate trade close request
  async validateTradeClose(challengeAccountId, tradeId) {
    const account = await ChallengeAccount.findById(challengeAccountId)
      .populate('challengeId')
    
    if (!account) {
      return { valid: false, error: 'Challenge account not found' }
    }

    const challenge = account.challengeId
    const rules = challenge.rules
    const trade = await Trade.findById(tradeId)

    if (!trade) {
      return { valid: false, error: 'Trade not found' }
    }

    // Check minimum hold time
    if (rules.minTradeHoldTimeSeconds > 0) {
      const holdTime = (Date.now() - new Date(trade.openedAt).getTime()) / 1000
      
      if (holdTime < rules.minTradeHoldTimeSeconds) {
        const remainingSeconds = Math.ceil(rules.minTradeHoldTimeSeconds - holdTime)
        return { 
          valid: false, 
          error: `Minimum hold time not met. Wait ${remainingSeconds} more seconds.`, 
          code: this.ERROR_CODES.MIN_HOLD_TIME,
          uiAction: 'DISABLE_CLOSE_BUTTON',
          remainingSeconds,
          canCloseAt: new Date(new Date(trade.openedAt).getTime() + rules.minTradeHoldTimeSeconds * 1000)
        }
      }
    }

    return { valid: true, account, trade }
  }

  // Called after trade opens
  async onTradeOpened(challengeAccountId, trade) {
    const account = await ChallengeAccount.findById(challengeAccountId)
    if (!account) return

    account.openTradesCount += 1
    account.tradesToday += 1
    account.totalTrades += 1
    
    // Check if new trading day
    const today = new Date().toDateString()
    const lastDay = account.lastTradingDay ? account.lastTradingDay.toDateString() : null
    
    if (today !== lastDay) {
      account.tradingDaysCount += 1
      account.lastTradingDay = new Date()
      account.tradesToday = 1
      account.dayStartEquity = account.currentEquity
      account.lowestEquityToday = account.currentEquity
    }

    await account.save()
    return account
  }

  // Called after trade closes - CRITICAL for rule enforcement
  async onTradeClosed(challengeAccountId, trade, closePnL) {
    const account = await ChallengeAccount.findById(challengeAccountId)
      .populate('challengeId')
    
    if (!account) return null

    const challenge = account.challengeId
    const rules = challenge.rules

    // Update balance and equity
    account.currentBalance += closePnL
    account.currentEquity = account.currentBalance
    account.openTradesCount = Math.max(0, account.openTradesCount - 1)

    // Update equity tracking
    await account.updateEquity(account.currentEquity)

    // Check drawdown breaches
    const drawdownCheck = await this.checkDrawdownBreach(account, rules)
    if (drawdownCheck.breached) {
      return { account, failed: true, reason: drawdownCheck.reason }
    }

    // Check profit target (for phase progression)
    const profitCheck = await this.checkProfitTarget(account, challenge)
    if (profitCheck.targetReached) {
      return { account, phaseCompleted: true, nextPhase: profitCheck.nextPhase }
    }

    await account.save()
    return { account, failed: false }
  }

  // Real-time equity update (called on price changes)
  async updateRealTimeEquity(challengeAccountId, newEquity) {
    const account = await ChallengeAccount.findById(challengeAccountId)
      .populate('challengeId')
    
    if (!account || account.status !== 'ACTIVE') return null

    const rules = account.challengeId.rules

    // Update equity
    await account.updateEquity(newEquity)

    // Check for immediate drawdown breach
    const drawdownCheck = await this.checkDrawdownBreach(account, rules)
    if (drawdownCheck.breached) {
      return { 
        account, 
        breached: true, 
        reason: drawdownCheck.reason,
        code: drawdownCheck.code
      }
    }

    return { 
      account, 
      breached: false,
      dailyDrawdown: account.currentDailyDrawdownPercent,
      overallDrawdown: account.currentOverallDrawdownPercent,
      profitPercent: account.currentProfitPercent
    }
  }

  // Check drawdown breach
  async checkDrawdownBreach(account, rules) {
    let breachReason = null
    let breachCode = null

    // Daily drawdown check
    if (rules.maxDailyDrawdownPercent) {
      if (account.currentDailyDrawdownPercent >= rules.maxDailyDrawdownPercent) {
        breachReason = `Daily drawdown limit (${rules.maxDailyDrawdownPercent}%) exceeded`
        breachCode = this.ERROR_CODES.DAILY_DRAWDOWN_BREACH
        await account.addViolation(
          'DAILY_DRAWDOWN_BREACH',
          `Daily drawdown of ${account.currentDailyDrawdownPercent.toFixed(2)}% exceeded limit of ${rules.maxDailyDrawdownPercent}%`,
          'FAIL'
        )
      }
    }

    // Overall drawdown check
    if (!breachReason && rules.maxOverallDrawdownPercent) {
      if (account.currentOverallDrawdownPercent >= rules.maxOverallDrawdownPercent) {
        breachReason = `Overall drawdown limit (${rules.maxOverallDrawdownPercent}%) exceeded`
        breachCode = this.ERROR_CODES.OVERALL_DRAWDOWN_BREACH
        await account.addViolation(
          'OVERALL_DRAWDOWN_BREACH',
          `Overall drawdown of ${account.currentOverallDrawdownPercent.toFixed(2)}% exceeded limit of ${rules.maxOverallDrawdownPercent}%`,
          'FAIL'
        )
      }
    }

    // If breached, fail the account and send email
    if (breachReason) {
      account.status = 'FAILED'
      account.failedAt = new Date()
      account.failReason = breachReason
      await account.save()

      // Send failure email
      try {
        const user = await User.findById(account.userId)
        const challenge = await Challenge.findById(account.challengeId._id || account.challengeId)
        if (user && challenge) {
          await sendTemplateEmail('challenge_failed', user.email, {
            firstName: user.firstName || user.email.split('@')[0],
            challengeName: challenge.name,
            fundSize: `$${challenge.fundSize.toLocaleString()}`,
            accountId: account.accountId,
            failureReason: breachReason,
            failureDate: account.failedAt.toLocaleDateString(),
            platformName: 'Pipxacpital',
            loginUrl: 'http://localhost:5173/login',
            supportEmail: 'support@Pipxacpital.com',
            year: new Date().getFullYear().toString()
          })
          console.log(`Challenge failure email sent to ${user.email} for drawdown breach`)
        }
      } catch (emailError) {
        console.error('Failed to send challenge failure email:', emailError)
      }

      return { 
        breached: true, 
        reason: breachReason,
        code: breachCode
      }
    }

    return { breached: false }
  }

  // Check profit target for phase progression
  async checkProfitTarget(account, challenge) {
    const rules = challenge.rules
    
    // Zero step (instant fund) - no profit target
    if (challenge.stepsCount === 0) {
      return { targetReached: false }
    }

    let targetPercent = 0
    if (account.currentPhase === 1) {
      targetPercent = rules.profitTargetPhase1Percent || 8
    } else if (account.currentPhase === 2) {
      targetPercent = rules.profitTargetPhase2Percent || 5
    }

    if (account.currentProfitPercent >= targetPercent) {
      // Check if any violations
      if (account.violations.some(v => v.severity === 'FAIL')) {
        return { targetReached: false }
      }

      // Phase completed
      if (account.currentPhase < account.totalPhases) {
        // Move to next phase
        account.currentPhase += 1
        account.phaseStartBalance = account.currentEquity
        account.currentProfitPercent = 0
        account.currentDailyDrawdownPercent = 0
        account.maxDailyDrawdownHit = 0
        await account.save()
        
        return { targetReached: true, nextPhase: account.currentPhase, funded: false }
      } else {
        // Challenge passed - create funded account
        account.status = 'PASSED'
        account.passedAt = new Date()
        await account.save()
        
        // Send completion email
        try {
          const user = await User.findById(account.userId)
          if (user) {
            await sendTemplateEmail('challenge_completed', user.email, {
              firstName: user.firstName || user.email.split('@')[0],
              challengeName: challenge.name,
              fundSize: `$${challenge.fundSize.toLocaleString()}`,
              accountId: account.accountId,
              completionDate: account.passedAt.toLocaleDateString(),
              platformName: 'Pipxacpital',
              loginUrl: 'http://localhost:5173/login',
              supportEmail: 'support@Pipxacpital.com',
              year: new Date().getFullYear().toString()
            })
          }
        } catch (emailError) {
          console.error('Failed to send challenge completion email:', emailError)
        }
        
        // Create funded account
        const fundedAccount = await this.createFundedAccount(account)
        
        return { targetReached: true, funded: true, fundedAccount }
      }
    }

    return { targetReached: false }
  }

  // Create funded account after passing challenge
  async createFundedAccount(challengeAccount) {
    const challenge = await Challenge.findById(challengeAccount.challengeId)
    const accountId = await ChallengeAccount.generateAccountId('FND')
    
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1) // Funded accounts last 1 year

    const fundedAccount = await ChallengeAccount.create({
      userId: challengeAccount.userId,
      challengeId: challengeAccount.challengeId,
      accountId,
      accountType: 'FUNDED',
      currentPhase: 0,
      totalPhases: 0,
      status: 'FUNDED',
      initialBalance: challenge.fundSize,
      currentBalance: challenge.fundSize,
      currentEquity: challenge.fundSize,
      phaseStartBalance: challenge.fundSize,
      dayStartEquity: challenge.fundSize,
      lowestEquityToday: challenge.fundSize,
      lowestEquityOverall: challenge.fundSize,
      highestEquity: challenge.fundSize,
      profitSplitPercent: challenge.fundedSettings?.profitSplitPercent || 80,
      paymentStatus: 'COMPLETED',
      expiresAt
    })

    // Link to original challenge account
    challengeAccount.fundedAccountId = fundedAccount._id
    await challengeAccount.save()

    return fundedAccount
  }

  // Admin actions
  async forcePass(challengeAccountId, adminId) {
    const account = await ChallengeAccount.findById(challengeAccountId)
    if (!account) throw new Error('Account not found')

    account.status = 'PASSED'
    account.passedAt = new Date()
    account.violations.push({
      rule: 'ADMIN_FORCE_PASS',
      description: `Forced pass by admin ${adminId}`,
      severity: 'WARNING'
    })
    await account.save()

    // Send completion email
    try {
      const user = await User.findById(account.userId)
      const challenge = await Challenge.findById(account.challengeId)
      if (user && challenge) {
        await sendTemplateEmail('challenge_completed', user.email, {
          firstName: user.firstName || user.email.split('@')[0],
          challengeName: challenge.name,
          fundSize: `$${challenge.fundSize.toLocaleString()}`,
          accountId: account.accountId,
          completionDate: account.passedAt.toLocaleDateString(),
          platformName: 'Pipxacpital',
          loginUrl: 'http://localhost:5173/login',
          supportEmail: 'support@Pipxacpital.com',
          year: new Date().getFullYear().toString()
        })
        console.log(`Challenge completion email sent to ${user.email} (admin force pass)`)
      }
    } catch (emailError) {
      console.error('Failed to send challenge completion email:', emailError)
    }

    // Create funded account
    const fundedAccount = await this.createFundedAccount(account)
    return { account, fundedAccount }
  }

  async forceFail(challengeAccountId, adminId, reason = '') {
    const account = await ChallengeAccount.findById(challengeAccountId)
    if (!account) throw new Error('Account not found')

    account.status = 'FAILED'
    account.failedAt = new Date()
    account.failReason = reason || 'Admin force fail'
    account.violations.push({
      type: 'ADMIN_FAIL',
      description: account.failReason,
      severity: 'FAIL',
      timestamp: new Date()
    })
    await account.save()
    
    // Send failure email
    try {
      const user = await User.findById(account.userId)
      const challenge = await Challenge.findById(account.challengeId)
      if (user && challenge) {
        await sendTemplateEmail('challenge_failed', user.email, {
          firstName: user.firstName || user.email.split('@')[0],
          challengeName: challenge.name,
          fundSize: `$${challenge.fundSize.toLocaleString()}`,
          accountId: account.accountId,
          failureReason: account.failReason,
          failureDate: account.failedAt.toLocaleDateString(),
          platformName: 'Pipxacpital',
          loginUrl: 'http://localhost:5173/login',
          supportEmail: 'support@Pipxacpital.com',
          year: new Date().getFullYear().toString()
        })
      }
    } catch (emailError) {
      console.error('Failed to send challenge failure email:', emailError)
    }
    return account
  }

  async extendTime(challengeAccountId, days, adminId) {
    const account = await ChallengeAccount.findById(challengeAccountId)
    if (!account) throw new Error('Account not found')

    const newExpiry = new Date(account.expiresAt)
    newExpiry.setDate(newExpiry.getDate() + days)
    account.expiresAt = newExpiry
    
    account.violations.push({
      rule: 'ADMIN_EXTEND_TIME',
      description: `Extended ${days} days by admin ${adminId}`,
      severity: 'WARNING'
    })
    await account.save()
    return account
  }

  async resetChallenge(challengeAccountId, adminId) {
    const account = await ChallengeAccount.findById(challengeAccountId)
      .populate('challengeId')
    if (!account) throw new Error('Account not found')

    const challenge = account.challengeId
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + (challenge.rules.challengeExpiryDays || 30))

    account.status = 'ACTIVE'
    account.currentPhase = 1
    account.currentBalance = challenge.fundSize
    account.currentEquity = challenge.fundSize
    account.phaseStartBalance = challenge.fundSize
    account.dayStartEquity = challenge.fundSize
    account.lowestEquityToday = challenge.fundSize
    account.lowestEquityOverall = challenge.fundSize
    account.highestEquity = challenge.fundSize
    account.currentDailyDrawdownPercent = 0
    account.currentOverallDrawdownPercent = 0
    account.maxDailyDrawdownHit = 0
    account.maxOverallDrawdownHit = 0
    account.currentProfitPercent = 0
    account.totalProfitLoss = 0
    account.tradesToday = 0
    account.openTradesCount = 0
    account.totalTrades = 0
    account.tradingDaysCount = 0
    account.warningsCount = 0
    account.failReason = null
    account.failedAt = null
    account.passedAt = null
    account.expiresAt = expiresAt
    account.violations = [{
      rule: 'ADMIN_RESET',
      description: `Challenge reset by admin ${adminId}`,
      severity: 'WARNING'
    }]
    
    await account.save()
    return account
  }

  // Check and trigger SL/TP for all open challenge trades
  async checkSlTpForAllTrades(prices) {
    const openTrades = await Trade.find({ 
      isChallengeAccount: true, 
      status: 'OPEN' 
    })

    if (openTrades.length > 0) {
      console.log(`[Challenge SL/TP] Checking ${openTrades.length} open challenge trades`)
    }

    const closedTrades = []

    for (const trade of openTrades) {
      const priceData = prices[trade.symbol]
      if (!priceData) {
        console.log(`[Challenge SL/TP] No price data for ${trade.symbol}`)
        continue
      }

      const bid = priceData.bid
      const ask = priceData.ask || priceData.bid // Fallback to bid if ask not available
      const sl = trade.sl || trade.stopLoss
      const tp = trade.tp || trade.takeProfit

      // Debug log for each trade with SL/TP
      if (sl || tp) {
        console.log(`[Challenge SL/TP] Trade ${trade.tradeId}: ${trade.side} ${trade.symbol} | bid=${bid} ask=${ask} | SL=${sl} TP=${tp}`)
        
        // Check if SL/TP would trigger
        if (trade.side === 'SELL') {
          console.log(`[Challenge SL/TP] SELL check: ask(${ask}) >= sl(${sl}) = ${ask >= sl}, ask(${ask}) <= tp(${tp}) = ${ask <= tp}`)
        } else {
          console.log(`[Challenge SL/TP] BUY check: bid(${bid}) <= sl(${sl}) = ${bid <= sl}, bid(${bid}) >= tp(${tp}) = ${bid >= tp}`)
        }
      }

      let shouldClose = false
      let closeReason = null
      let closePrice = null

      if (trade.side === 'BUY') {
        // For BUY: SL triggers when bid <= SL, TP triggers when bid >= TP
        if (sl && bid <= sl) {
          shouldClose = true
          closeReason = 'SL'
          closePrice = bid
        } else if (tp && bid >= tp) {
          shouldClose = true
          closeReason = 'TP'
          closePrice = bid
        }
      } else {
        // For SELL: SL triggers when ask >= SL, TP triggers when ask <= TP
        if (sl && ask >= sl) {
          shouldClose = true
          closeReason = 'SL'
          closePrice = ask
        } else if (tp && ask <= tp) {
          shouldClose = true
          closeReason = 'TP'
          closePrice = ask
        }
      }

      if (shouldClose) {
        console.log(`Challenge trade ${trade.tradeId} ${closeReason} triggered: ${trade.side} ${trade.symbol} at ${closePrice}`)
        
        // Calculate PnL
        const pnl = trade.side === 'BUY'
          ? (closePrice - trade.openPrice) * trade.quantity * trade.contractSize
          : (trade.openPrice - closePrice) * trade.quantity * trade.contractSize

        // Update trade
        trade.status = 'CLOSED'
        trade.closePrice = closePrice
        trade.closedAt = new Date()
        trade.realizedPnl = pnl
        trade.closedBy = closeReason
        await trade.save()

        // Update challenge account
        await this.onTradeClosed(trade.tradingAccountId, trade, pnl)

        closedTrades.push({ trade, reason: closeReason, pnl })
        console.log(`Challenge trade closed with PnL: $${pnl.toFixed(2)}`)
      }
    }

    return closedTrades
  }

  // Track rule violation and fail account if repeated
  async trackRuleViolation(challengeAccountId, ruleCode, description) {
    const account = await ChallengeAccount.findById(challengeAccountId)
      .populate('challengeId')
    
    if (!account) return null

    // Add violation
    await account.addViolation(ruleCode, description, 'WARNING')
    account.warningsCount += 1

    // Check if max warnings exceeded (fail after 3 warnings of same type)
    const sameTypeViolations = account.violations.filter(v => v.rule === ruleCode)
    
    if (sameTypeViolations.length >= 3) {
      // Fail the account
      account.status = 'FAILED'
      account.failedAt = new Date()
      account.failReason = `Repeated rule violation: ${description}`
      await account.addViolation(ruleCode, `Account failed due to repeated violations (${sameTypeViolations.length} times)`, 'FAIL')
      await account.save()
      
      // Send failure email
      try {
        const user = await User.findById(account.userId)
        const challenge = await Challenge.findById(account.challengeId)
        if (user && challenge) {
          await sendTemplateEmail('challenge_failed', user.email, {
            firstName: user.firstName || user.email.split('@')[0],
            challengeName: challenge.name,
            fundSize: `$${challenge.fundSize.toLocaleString()}`,
            accountId: account.accountId,
            failureReason: account.failReason,
            failureDate: account.failedAt.toLocaleDateString(),
            platformName: 'Pipxacpital',
            loginUrl: 'http://localhost:5173/login',
            supportEmail: 'support@Pipxacpital.com',
            year: new Date().getFullYear().toString()
          })
        }
      } catch (emailError) {
        console.error('Failed to send challenge failure email:', emailError)
      }
      
      return { 
        account, 
        failed: true, 
        reason: `Account failed: Exceeded maximum warnings for ${ruleCode}`,
        violationCount: sameTypeViolations.length
      }
    }

    await account.save()
    return { 
      account, 
      failed: false, 
      warningCount: account.warningsCount,
      sameTypeCount: sameTypeViolations.length,
      remainingWarnings: 3 - sameTypeViolations.length
    }
  }

  // Validate and handle rule violation on trade attempt
  async handleTradeAttemptViolation(challengeAccountId, validationResult) {
    if (validationResult.valid) return validationResult

    const account = await ChallengeAccount.findById(challengeAccountId)
    if (!account) return validationResult

    // Track the violation
    const violationResult = await this.trackRuleViolation(
      challengeAccountId,
      validationResult.code,
      validationResult.error
    )

    if (violationResult && violationResult.failed) {
      return {
        ...validationResult,
        accountFailed: true,
        failReason: violationResult.reason
      }
    }

    return {
      ...validationResult,
      warningCount: violationResult?.warningCount || 0,
      remainingWarnings: violationResult?.remainingWarnings || 3
    }
  }

  // Helper methods
  calculatePotentialLoss(tradeParams) {
    const { side, openPrice, stopLoss, quantity, contractSize = 100000 } = tradeParams
    if (!stopLoss) return 0
    
    const priceDiff = side === 'BUY' 
      ? openPrice - stopLoss 
      : stopLoss - openPrice
    
    return Math.abs(priceDiff * quantity * contractSize)
  }

  calculateMargin(tradeParams, account) {
    const { quantity, openPrice, leverage = 100, contractSize = 100000 } = tradeParams
    return (quantity * openPrice * contractSize) / leverage
  }

  // Get challenge account dashboard data
  async getAccountDashboard(challengeAccountId) {
    const account = await ChallengeAccount.findById(challengeAccountId)
      .populate('challengeId')
      .populate('userId', 'firstName email')
    
    if (!account) return null

    const challenge = account.challengeId
    const rules = challenge.rules

    // Calculate remaining time
    const now = new Date()
    const remainingMs = account.expiresAt - now
    const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)))

    // Calculate target progress
    let targetPercent = 0
    if (account.currentPhase === 1) {
      targetPercent = rules.profitTargetPhase1Percent || 8
    } else if (account.currentPhase === 2) {
      targetPercent = rules.profitTargetPhase2Percent || 5
    }
    const targetProgress = Math.min(100, (account.currentProfitPercent / targetPercent) * 100)

    return {
      account: {
        _id: account._id,
        accountId: account.accountId,
        accountType: account.accountType,
        status: account.status,
        currentPhase: account.currentPhase,
        totalPhases: account.totalPhases
      },
      balance: {
        initial: account.initialBalance,
        current: account.currentBalance,
        equity: account.currentEquity,
        profitLoss: account.totalProfitLoss
      },
      drawdown: {
        dailyUsed: account.currentDailyDrawdownPercent,
        dailyMax: rules.maxDailyDrawdownPercent,
        dailyRemaining: Math.max(0, rules.maxDailyDrawdownPercent - account.currentDailyDrawdownPercent),
        overallUsed: account.currentOverallDrawdownPercent,
        overallMax: rules.maxOverallDrawdownPercent,
        overallRemaining: Math.max(0, rules.maxOverallDrawdownPercent - account.currentOverallDrawdownPercent)
      },
      profit: {
        currentPercent: account.currentProfitPercent,
        targetPercent,
        targetProgress,
        amountToTarget: (targetPercent / 100) * account.phaseStartBalance - account.totalProfitLoss
      },
      trades: {
        today: account.tradesToday,
        maxPerDay: rules.maxTradesPerDay,
        openCount: account.openTradesCount,
        maxConcurrent: rules.maxConcurrentTrades,
        total: account.totalTrades,
        tradingDays: account.tradingDaysCount,
        requiredDays: rules.tradingDaysRequired
      },
      rules: {
        stopLossMandatory: rules.stopLossMandatory,
        minHoldTimeSeconds: rules.minTradeHoldTimeSeconds,
        allowedSymbols: rules.allowedSymbols,
        allowedSegments: rules.allowedSegments,
        maxLeverage: rules.maxLeverage || 100,
        minLotSize: rules.minLotSize || 0.01,
        maxLotSize: rules.maxLotSize || 100
      },
      time: {
        expiresAt: account.expiresAt,
        remainingDays,
        createdAt: account.createdAt
      },
      violations: account.violations,
      warningsCount: account.warningsCount,
      challenge: {
        _id: challenge._id,
        name: challenge.name,
        fundSize: challenge.fundSize,
        stepsCount: challenge.stepsCount
      }
    }
  }
}

export default new PropTradingEngine()
