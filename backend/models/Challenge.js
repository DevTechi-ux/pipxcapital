import mongoose from 'mongoose'

const challengeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  stepsCount: {
    type: Number,
    enum: [0, 1, 2],
    required: true,
    default: 2
  },
  fundSize: {
    type: Number,
    required: true
  },
  challengeFee: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  ticketSize: {
    type: Number,
    default: null
  },
  
  // Risk Rules
  rules: {
    maxDailyDrawdownPercent: {
      type: Number,
      default: 5
    },
    maxDailyDrawdownAmount: {
      type: Number,
      default: null
    },
    maxOverallDrawdownPercent: {
      type: Number,
      default: 10
    },
    maxOverallDrawdownAmount: {
      type: Number,
      default: null
    },
    maxLossPerTradePercent: {
      type: Number,
      default: 2
    },
    maxLossPerTradeAmount: {
      type: Number,
      default: null
    },
    
    // Profit Rules
    profitTargetPhase1Percent: {
      type: Number,
      default: 8
    },
    profitTargetPhase2Percent: {
      type: Number,
      default: 5
    },
    
    // Lot Size Rules
    minLotSize: {
      type: Number,
      default: 0.01
    },
    maxLotSize: {
      type: Number,
      default: 100
    },
    
    // Trade Count Rules
    minTradesRequired: {
      type: Number,
      default: 1
    },
    maxTradesPerDay: {
      type: Number,
      default: null
    },
    maxTotalTrades: {
      type: Number,
      default: null
    },
    maxConcurrentTrades: {
      type: Number,
      default: null
    },
    
    // Trade Behavior Rules
    stopLossMandatory: {
      type: Boolean,
      default: true
    },
    takeProfitMandatory: {
      type: Boolean,
      default: false
    },
    minTradeHoldTimeSeconds: {
      type: Number,
      default: 0
    },
    maxTradeHoldTimeSeconds: {
      type: Number,
      default: null
    },
    
    // Weekend/News Trading
    allowWeekendHolding: {
      type: Boolean,
      default: false
    },
    allowNewsTrading: {
      type: Boolean,
      default: true
    },
    
    // Leverage
    maxLeverage: {
      type: Number,
      default: 100
    },
    
    // Allowed Instruments
    allowedSymbols: [{
      type: String
    }],
    allowedSegments: [{
      type: String,
      enum: ['FOREX', 'CRYPTO', 'STOCKS', 'COMMODITIES', 'INDICES']
    }],
    
    // Time Rules
    tradingDaysRequired: {
      type: Number,
      default: null
    },
    challengeExpiryDays: {
      type: Number,
      default: 30
    },
    
    // Trading Hours (24h format)
    tradingHoursStart: {
      type: String,
      default: null
    },
    tradingHoursEnd: {
      type: String,
      default: null
    }
  },
  
  // Funded Account Settings
  fundedSettings: {
    profitSplitPercent: {
      type: Number,
      default: 80
    },
    maxWithdrawalPercent: {
      type: Number,
      default: null
    },
    withdrawalFrequencyDays: {
      type: Number,
      default: 14
    }
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
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

challengeSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

export default mongoose.model('Challenge', challengeSchema)
