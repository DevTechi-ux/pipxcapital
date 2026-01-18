import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const tradingAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  accountTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AccountType',
    required: true
  },
  accountId: {
    type: String,
    unique: true,
    required: true
  },
  pin: {
    type: String,
    required: true
  },
  balance: {
    type: Number,
    default: 0
  },
  credit: {
    type: Number,
    default: 0
  },
  leverage: {
    type: String,
    required: true
  },
  exposureLimit: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Active', 'Suspended', 'Closed', 'Frozen', 'Archived'],
    default: 'Active'
  },
  frozenReason: {
    type: String,
    default: ''
  },
  frozenAt: {
    type: Date,
    default: null
  },
  frozenBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isDemo: {
    type: Boolean,
    default: false
  }
}, { timestamps: true })

// Hash PIN before saving
tradingAccountSchema.pre('save', async function(next) {
  if (!this.isModified('pin')) return next()
  this.pin = await bcrypt.hash(this.pin, 10)
  next()
})

// Verify PIN
tradingAccountSchema.methods.verifyPin = async function(pin) {
  return await bcrypt.compare(pin, this.pin)
}

// Generate unique account ID (numbers only, 8 digits)
tradingAccountSchema.statics.generateAccountId = async function() {
  const random = Math.floor(10000000 + Math.random() * 90000000)
  const accountId = `${random}`
  const exists = await this.findOne({ accountId })
  if (exists) return this.generateAccountId()
  return accountId
}

export default mongoose.model('TradingAccount', tradingAccountSchema)
