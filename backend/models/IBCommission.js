import mongoose from 'mongoose'

const ibCommissionSchema = new mongoose.Schema({
  // IB who receives the commission
  ibUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IBUser',
    required: true
  },
  // The trader whose trade generated this commission
  traderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // The trade that generated this commission
  tradeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trade',
    required: true
  },
  // Level in the hierarchy (1 = direct referral)
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  // Trade details
  symbol: {
    type: String,
    required: true
  },
  tradeLotSize: {
    type: Number,
    required: true
  },
  tradeVolume: {
    type: Number,
    required: true
  },
  // Commission calculation
  commissionType: {
    type: String,
    enum: ['PER_LOT', 'PERCENTAGE'],
    required: true
  },
  commissionRate: {
    type: Number,
    required: true
  },
  // Source breakdown
  sourceBreakdown: {
    fromSpread: { type: Number, default: 0 },
    fromCommission: { type: Number, default: 0 },
    fromSwap: { type: Number, default: 0 }
  },
  // Total commission earned
  commissionAmount: {
    type: Number,
    required: true
  },
  // Status
  status: {
    type: String,
    enum: ['PENDING', 'CREDITED', 'REVERSED'],
    default: 'CREDITED'
  },
  // Tracking
  tradingDay: {
    type: String, // Format: YYYY-MM-DD
    required: true
  },
  creditedAt: {
    type: Date,
    default: Date.now
  },
  reversedAt: {
    type: Date,
    default: null
  },
  reversedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reversalReason: {
    type: String,
    default: null
  }
}, { timestamps: true })

export default mongoose.model('IBCommission', ibCommissionSchema)
