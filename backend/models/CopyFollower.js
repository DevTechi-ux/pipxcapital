import mongoose from 'mongoose'

const copyFollowerSchema = new mongoose.Schema({
  followerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  masterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MasterTrader',
    required: true
  },
  followerAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TradingAccount',
    required: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'PAUSED', 'STOPPED'],
    default: 'ACTIVE'
  },
  // Copy settings
  copyMode: {
    type: String,
    enum: ['FIXED_LOT', 'BALANCE_BASED', 'EQUITY_BASED', 'MULTIPLIER', 'LOT_MULTIPLIER', 'AUTO'],
    required: true
  },
  copyValue: {
    type: Number,
    required: true,
    min: 0.01
  },
  // Multiplier value (used when copyMode is MULTIPLIER)
  multiplier: {
    type: Number,
    default: 1,
    min: 0.1
  },
  // Risk settings
  maxLotSize: {
    type: Number,
    default: 10 // Maximum lot size per copied trade
  },
  maxDailyLoss: {
    type: Number,
    default: null // Optional daily loss limit
  },
  // Statistics
  stats: {
    totalCopiedTrades: { type: Number, default: 0 },
    totalProfit: { type: Number, default: 0 },
    totalLoss: { type: Number, default: 0 },
    totalCommissionPaid: { type: Number, default: 0 },
    activeCopiedTrades: { type: Number, default: 0 }
  },
  // Daily tracking (reset daily)
  dailyProfit: {
    type: Number,
    default: 0
  },
  dailyLoss: {
    type: Number,
    default: 0
  },
  lastDailyReset: {
    type: Date,
    default: Date.now
  },
  // Timestamps
  startedAt: {
    type: Date,
    default: Date.now
  },
  pausedAt: {
    type: Date,
    default: null
  },
  stoppedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true })

export default mongoose.model('CopyFollower', copyFollowerSchema)
