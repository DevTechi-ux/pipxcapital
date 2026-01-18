import mongoose from 'mongoose'

const masterTraderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  tradingAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TradingAccount',
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED'],
    default: 'PENDING'
  },
  displayName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  profileImage: {
    type: String,
    default: null
  },
  // Commission settings
  requestedCommissionPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 50
  },
  approvedCommissionPercentage: {
    type: Number,
    default: null
  },
  adminSharePercentage: {
    type: Number,
    default: 30 // Admin takes 30% of commission by default
  },
  // Visibility
  visibility: {
    type: String,
    enum: ['PUBLIC', 'PRIVATE'],
    default: 'PUBLIC'
  },
  // Statistics (updated periodically)
  stats: {
    totalFollowers: { type: Number, default: 0 },
    activeFollowers: { type: Number, default: 0 },
    totalCopiedVolume: { type: Number, default: 0 },
    totalProfitGenerated: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    totalTrades: { type: Number, default: 0 },
    profitableTrades: { type: Number, default: 0 }
  },
  // Commission tracking
  pendingCommission: {
    type: Number,
    default: 0
  },
  totalCommissionEarned: {
    type: Number,
    default: 0
  },
  totalCommissionWithdrawn: {
    type: Number,
    default: 0
  },
  // Requirements met
  kycApproved: {
    type: Boolean,
    default: false
  },
  minimumEquityMet: {
    type: Boolean,
    default: false
  },
  minimumTradesMet: {
    type: Boolean,
    default: false
  },
  // Admin actions
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  rejectedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  }
}, { timestamps: true })

export default mongoose.model('MasterTrader', masterTraderSchema)
