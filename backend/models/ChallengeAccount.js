import mongoose from 'mongoose'

const challengeAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  challengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
    required: true
  },
  accountId: {
    type: String,
    unique: true,
    required: true
  },
  
  // Account Type
  accountType: {
    type: String,
    enum: ['CHALLENGE', 'FUNDED'],
    default: 'CHALLENGE'
  },
  
  // Phase tracking
  currentPhase: {
    type: Number,
    default: 1
  },
  totalPhases: {
    type: Number,
    required: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['ACTIVE', 'PASSED', 'FAILED', 'FUNDED', 'EXPIRED'],
    default: 'ACTIVE'
  },
  failReason: {
    type: String,
    default: null
  },
  failedAt: {
    type: Date,
    default: null
  },
  passedAt: {
    type: Date,
    default: null
  },
  
  // Balance tracking
  initialBalance: {
    type: Number,
    required: true
  },
  currentBalance: {
    type: Number,
    required: true
  },
  currentEquity: {
    type: Number,
    required: true
  },
  
  // Phase start values (for drawdown calculation)
  phaseStartBalance: {
    type: Number,
    required: true
  },
  dayStartEquity: {
    type: Number,
    default: null
  },
  lowestEquityToday: {
    type: Number,
    default: null
  },
  lowestEquityOverall: {
    type: Number,
    default: null
  },
  highestEquity: {
    type: Number,
    default: null
  },
  
  // Drawdown tracking
  currentDailyDrawdownPercent: {
    type: Number,
    default: 0
  },
  currentOverallDrawdownPercent: {
    type: Number,
    default: 0
  },
  maxDailyDrawdownHit: {
    type: Number,
    default: 0
  },
  maxOverallDrawdownHit: {
    type: Number,
    default: 0
  },
  
  // Profit tracking
  currentProfitPercent: {
    type: Number,
    default: 0
  },
  totalProfitLoss: {
    type: Number,
    default: 0
  },
  
  // Trade tracking
  tradesToday: {
    type: Number,
    default: 0
  },
  openTradesCount: {
    type: Number,
    default: 0
  },
  totalTrades: {
    type: Number,
    default: 0
  },
  tradingDaysCount: {
    type: Number,
    default: 0
  },
  lastTradingDay: {
    type: Date,
    default: null
  },
  
  // Rule violations
  violations: [{
    rule: String,
    description: String,
    severity: {
      type: String,
      enum: ['WARNING', 'FAIL']
    },
    tradeId: mongoose.Schema.Types.ObjectId,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  warningsCount: {
    type: Number,
    default: 0
  },
  
  // Payment
  paymentId: {
    type: String,
    default: null
  },
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'REFUNDED'],
    default: 'PENDING'
  },
  
  // Funded account specific
  fundedAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChallengeAccount',
    default: null
  },
  profitSplitPercent: {
    type: Number,
    default: 80
  },
  totalWithdrawn: {
    type: Number,
    default: 0
  },
  lastWithdrawalDate: {
    type: Date,
    default: null
  },
  
  // Timestamps
  expiresAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

// Generate unique account ID
challengeAccountSchema.statics.generateAccountId = async function(type = 'CH') {
  const prefix = type === 'FUNDED' ? 'FND' : 'CH'
  const random = Math.floor(100000 + Math.random() * 900000)
  const accountId = `${prefix}${random}`
  
  const exists = await this.findOne({ accountId })
  if (exists) {
    return this.generateAccountId(type)
  }
  return accountId
}

// Update equity and check drawdowns
challengeAccountSchema.methods.updateEquity = async function(newEquity) {
  const Challenge = mongoose.model('Challenge')
  const challenge = await Challenge.findById(this.challengeId)
  
  this.currentEquity = newEquity
  
  // Track lowest equity today
  if (this.lowestEquityToday === null || newEquity < this.lowestEquityToday) {
    this.lowestEquityToday = newEquity
  }
  
  // Track lowest equity overall
  if (this.lowestEquityOverall === null || newEquity < this.lowestEquityOverall) {
    this.lowestEquityOverall = newEquity
  }
  
  // Track highest equity
  if (this.highestEquity === null || newEquity > this.highestEquity) {
    this.highestEquity = newEquity
  }
  
  // Calculate daily drawdown
  if (this.dayStartEquity) {
    const dailyDD = ((this.dayStartEquity - this.lowestEquityToday) / this.dayStartEquity) * 100
    this.currentDailyDrawdownPercent = Math.max(0, dailyDD)
    if (dailyDD > this.maxDailyDrawdownHit) {
      this.maxDailyDrawdownHit = dailyDD
    }
  }
  
  // Calculate overall drawdown
  const overallDD = ((this.initialBalance - this.lowestEquityOverall) / this.initialBalance) * 100
  this.currentOverallDrawdownPercent = Math.max(0, overallDD)
  if (overallDD > this.maxOverallDrawdownHit) {
    this.maxOverallDrawdownHit = overallDD
  }
  
  // Calculate profit
  this.currentProfitPercent = ((newEquity - this.phaseStartBalance) / this.phaseStartBalance) * 100
  this.totalProfitLoss = newEquity - this.initialBalance
  
  this.updatedAt = new Date()
  await this.save()
  
  return {
    dailyDrawdown: this.currentDailyDrawdownPercent,
    overallDrawdown: this.currentOverallDrawdownPercent,
    profitPercent: this.currentProfitPercent
  }
}

// Reset daily stats (called at start of each trading day)
challengeAccountSchema.methods.resetDailyStats = async function() {
  this.dayStartEquity = this.currentEquity
  this.lowestEquityToday = this.currentEquity
  this.tradesToday = 0
  this.currentDailyDrawdownPercent = 0
  
  // Check if this is a new trading day
  const today = new Date().toDateString()
  const lastDay = this.lastTradingDay ? this.lastTradingDay.toDateString() : null
  
  if (today !== lastDay) {
    this.tradingDaysCount += 1
    this.lastTradingDay = new Date()
  }
  
  await this.save()
}

// Add violation
challengeAccountSchema.methods.addViolation = async function(rule, description, severity, tradeId = null) {
  this.violations.push({
    rule,
    description,
    severity,
    tradeId,
    timestamp: new Date()
  })
  
  if (severity === 'WARNING') {
    this.warningsCount += 1
  }
  
  if (severity === 'FAIL') {
    this.status = 'FAILED'
    this.failReason = `${rule}: ${description}`
    this.failedAt = new Date()
  }
  
  await this.save()
  return this
}

export default mongoose.model('ChallengeAccount', challengeAccountSchema)
