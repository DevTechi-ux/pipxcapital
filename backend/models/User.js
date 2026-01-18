import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  countryCode: {
    type: String,
    default: '+1'
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6
  },
  walletBalance: {
    type: Number,
    default: 0
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  blockReason: {
    type: String,
    default: ''
  },
  banReason: {
    type: String,
    default: ''
  },
  
  // IB (Introducing Broker) fields
  isIB: {
    type: Boolean,
    default: false
  },
  ibStatus: {
    type: String,
    enum: ['PENDING', 'ACTIVE', 'BLOCKED', null],
    default: null
  },
  ibPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IBPlan',
    default: null
  },
  referralCode: {
    type: String,
    default: null
  },
  parentIBId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  ibLevel: {
    type: Number,
    default: 0
  },
  ibLevelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IBLevel',
    default: null
  },
  ibLevelOrder: {
    type: Number,
    default: 1
  },
  autoUpgradeEnabled: {
    type: Boolean,
    default: true
  },
  referredBy: {
    type: String,
    default: null
  },
  
  // Assigned Admin (for multi-admin system)
  assignedAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  adminUrlSlug: {
    type: String,
    default: null
  },
  
  // Bank Details for Withdrawals
  bankDetails: {
    bankName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    accountHolderName: { type: String, default: '' },
    ifscCode: { type: String, default: '' },
    branchName: { type: String, default: '' }
  },
  upiId: {
    type: String,
    default: ''
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  passwordChangedAt: {
    type: Date,
    default: null
  }
})

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  // Only set passwordChangedAt when updating password (not on new user creation)
  if (!this.isNew) {
    this.passwordChangedAt = new Date()
  }
  next()
})

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

export default mongoose.model('User', userSchema)
