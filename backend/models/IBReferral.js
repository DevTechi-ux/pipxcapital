import mongoose from 'mongoose'

const ibReferralSchema = new mongoose.Schema({
  // The referred user
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // The IB who referred this user
  referredByIBId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IBUser',
    required: true
  },
  // Referral code used
  referralCode: {
    type: String,
    required: true
  },
  // Level from the referring IB's perspective
  level: {
    type: Number,
    default: 1
  },
  // Status
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE'
  },
  // Stats
  totalTradedVolume: {
    type: Number,
    default: 0
  },
  totalCommissionGenerated: {
    type: Number,
    default: 0
  },
  // First trade date
  firstTradeAt: {
    type: Date,
    default: null
  },
  lastTradeAt: {
    type: Date,
    default: null
  }
}, { timestamps: true })

export default mongoose.model('IBReferral', ibReferralSchema)
