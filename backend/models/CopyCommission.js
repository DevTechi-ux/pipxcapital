import mongoose from 'mongoose'

const copyCommissionSchema = new mongoose.Schema({
  // References
  masterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MasterTrader',
    required: true
  },
  followerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CopyFollower',
    required: true
  },
  followerUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  followerAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TradingAccount',
    required: true
  },
  // Daily tracking
  tradingDay: {
    type: String, // Format: YYYY-MM-DD
    required: true
  },
  // Profit calculation
  dailyProfit: {
    type: Number,
    required: true
  },
  commissionPercentage: {
    type: Number,
    required: true
  },
  // Commission breakdown
  totalCommission: {
    type: Number,
    required: true
  },
  adminShare: {
    type: Number,
    required: true
  },
  masterShare: {
    type: Number,
    required: true
  },
  adminSharePercentage: {
    type: Number,
    required: true
  },
  // Status
  status: {
    type: String,
    enum: ['PENDING', 'DEDUCTED', 'SETTLED', 'FAILED'],
    default: 'PENDING'
  },
  // Deduction from follower
  deductedAt: {
    type: Date,
    default: null
  },
  deductionError: {
    type: String,
    default: null
  },
  // Settlement to master
  settledAt: {
    type: Date,
    default: null
  },
  settledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { timestamps: true })

export default mongoose.model('CopyCommission', copyCommissionSchema)
