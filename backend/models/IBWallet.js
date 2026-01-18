import mongoose from 'mongoose'

const ibWalletSchema = new mongoose.Schema({
  ibUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0
  },
  totalEarned: {
    type: Number,
    default: 0
  },
  totalWithdrawn: {
    type: Number,
    default: 0
  },
  pendingWithdrawal: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

// Credit commission to wallet
ibWalletSchema.methods.creditCommission = async function(amount) {
  this.balance += amount
  this.totalEarned += amount
  this.lastUpdated = new Date()
  await this.save()
  return this
}

// Request withdrawal
ibWalletSchema.methods.requestWithdrawal = async function(amount) {
  if (amount > this.balance) {
    throw new Error('Insufficient balance')
  }
  this.balance -= amount
  this.pendingWithdrawal += amount
  this.lastUpdated = new Date()
  await this.save()
  return this
}

// Complete withdrawal
ibWalletSchema.methods.completeWithdrawal = async function(amount) {
  this.pendingWithdrawal -= amount
  this.totalWithdrawn += amount
  this.lastUpdated = new Date()
  await this.save()
  return this
}

// Cancel withdrawal (refund)
ibWalletSchema.methods.cancelWithdrawal = async function(amount) {
  this.pendingWithdrawal -= amount
  this.balance += amount
  this.lastUpdated = new Date()
  await this.save()
  return this
}

// Reverse commission (admin action)
ibWalletSchema.methods.reverseCommission = async function(amount) {
  this.balance -= amount
  this.totalEarned -= amount
  if (this.balance < 0) this.balance = 0
  if (this.totalEarned < 0) this.totalEarned = 0
  this.lastUpdated = new Date()
  await this.save()
  return this
}

// Get or create wallet for IB user
ibWalletSchema.statics.getOrCreateWallet = async function(ibUserId) {
  let wallet = await this.findOne({ ibUserId })
  if (!wallet) {
    wallet = await this.create({ ibUserId })
  }
  return wallet
}

export default mongoose.model('IBWallet', ibWalletSchema)
