import mongoose from 'mongoose'

const currencySchema = new mongoose.Schema({
  currency: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  symbol: {
    type: String,
    required: true,
    trim: true
  },
  rateToUSD: {
    type: Number,
    required: true,
    min: 0
  },
  markup: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

// Calculate effective rate with markup
currencySchema.virtual('effectiveRate').get(function() {
  return this.rateToUSD * (1 + this.markup / 100)
})

// Convert USD to this currency (what user pays)
currencySchema.methods.convertFromUSD = function(usdAmount) {
  const effectiveRate = this.rateToUSD * (1 + this.markup / 100)
  return usdAmount * effectiveRate
}

// Convert this currency to USD (what goes to wallet)
currencySchema.methods.convertToUSD = function(localAmount) {
  const effectiveRate = this.rateToUSD * (1 + this.markup / 100)
  return localAmount / effectiveRate
}

currencySchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

export default mongoose.model('Currency', currencySchema)
