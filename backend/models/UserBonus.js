import mongoose from 'mongoose'

const userBonusSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bonusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bonus',
    required: true
  },
  depositId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deposit',
    required: false
  },
  bonusAmount: {
    type: Number,
    required: true
  },
  wagerRequirement: {
    type: Number,
    required: true
  },
  remainingWager: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED'],
    default: 'PENDING'
  },
  activatedAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  maxWithdrawal: {
    type: Number,
    default: null
  },
  withdrawnAmount: {
    type: Number,
    default: 0
  },
  tradingDays: {
    type: Number,
    default: 0
  },
  lastWagerUpdate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

// Index for efficient queries
userBonusSchema.index({ userId: 1, status: 1 })
userBonusSchema.index({ status: 1 })
userBonusSchema.index({ expiresAt: 1 })

export default mongoose.model('UserBonus', userBonusSchema)
