import mongoose from 'mongoose'

const ibCommissionSchema = new mongoose.Schema({
  tradeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trade',
    required: true
  },
  traderUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ibUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  level: {
    type: Number,
    required: true
  },
  baseAmount: {
    type: Number,
    required: true,
    default: 0
  },
  commissionAmount: {
    type: Number,
    required: true,
    default: 0
  },
  symbol: {
    type: String,
    required: true
  },
  tradeLotSize: {
    type: Number,
    required: true
  },
  contractSize: {
    type: Number,
    default: 100000
  },
  commissionType: {
    type: String,
    enum: ['PER_LOT', 'PERCENT'],
    required: true
  },
  status: {
    type: String,
    enum: ['CREDITED', 'REVERSED'],
    default: 'CREDITED'
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
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

export default mongoose.model('IBCommission', ibCommissionSchema)
