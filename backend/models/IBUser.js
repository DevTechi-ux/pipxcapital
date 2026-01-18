import mongoose from 'mongoose'

const ibUserSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED'],
    default: 'PENDING'
  },
  // Referral code (unique)
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  // Parent IB (who referred this IB)
  parentIBId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IBUser',
    default: null
  },
  // Level in the hierarchy (1 = direct referral of root IB)
  level: {
    type: Number,
    default: 1
  },
  // IB Plan assigned by admin
  ibPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IBPlan',
    default: null
  },
  // Wallet for IB commissions
  ibWalletBalance: {
    type: Number,
    default: 0
  },
  pendingWithdrawal: {
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
  // Statistics
  stats: {
    directReferrals: { type: Number, default: 0 },
    totalDownline: { type: Number, default: 0 },
    level1Count: { type: Number, default: 0 },
    level2Count: { type: Number, default: 0 },
    level3Count: { type: Number, default: 0 },
    level4Count: { type: Number, default: 0 },
    level5Count: { type: Number, default: 0 },
    totalTradedVolume: { type: Number, default: 0 },
    todayCommission: { type: Number, default: 0 },
    lastCommissionDate: { type: Date, default: null }
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

// Generate unique referral code
ibUserSchema.statics.generateReferralCode = async function() {
  const prefix = 'IB'
  const random = Math.floor(10000 + Math.random() * 90000)
  const code = `${prefix}${random}`
  const exists = await this.findOne({ referralCode: code })
  if (exists) return this.generateReferralCode()
  return code
}

// Get full upline chain (up to max levels)
ibUserSchema.methods.getUplineChain = async function(maxLevels = 5) {
  const chain = []
  let currentIB = this
  
  for (let i = 0; i < maxLevels; i++) {
    if (!currentIB.parentIBId) break
    
    const parentIB = await mongoose.model('IBUser').findById(currentIB.parentIBId)
      .populate('userId', 'firstName lastName email')
      .populate('ibPlanId')
    
    if (!parentIB || parentIB.status !== 'ACTIVE') break
    
    chain.push({
      ibUser: parentIB,
      level: i + 1
    })
    
    currentIB = parentIB
  }
  
  return chain
}

export default mongoose.model('IBUser', ibUserSchema)
