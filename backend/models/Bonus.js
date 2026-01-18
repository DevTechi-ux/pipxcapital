import mongoose from 'mongoose'

const bonusSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['FIRST_DEPOSIT', 'DEPOSIT', 'RELOAD', 'SPECIAL'],
    required: true
  },
  bonusType: {
    type: String,
    enum: ['PERCENTAGE', 'FIXED'],
    required: true
  },
  bonusValue: {
    type: Number,
    required: true
  },
  minDeposit: {
    type: Number,
    required: true,
    default: 0
  },
  maxBonus: {
    type: Number,
    default: null
  },
  wagerRequirement: {
    type: Number,
    required: true,
    default: 1 // Multiplier (e.g., 30x = 30)
  },
  maxWithdrawal: {
    type: Number,
    default: null
  },
  duration: {
    type: Number, // in days
    default: 30
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'EXPIRED'],
    default: 'ACTIVE'
  },
  description: {
    type: String,
    default: ''
  },
  terms: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null
  },
  usageLimit: {
    type: Number,
    default: null // null = unlimited
  },
  usedCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
})

// Index for efficient queries
bonusSchema.index({ type: 1, status: 1 })
bonusSchema.index({ status: 1 })

export default mongoose.model('Bonus', bonusSchema)
