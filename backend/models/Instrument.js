import mongoose from 'mongoose'

const instrumentSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true
  },
  segment: {
    type: String,
    enum: ['Forex', 'Crypto', 'Commodities', 'Indices'],
    required: true
  },
  baseCurrency: {
    type: String,
    required: true
  },
  quoteCurrency: {
    type: String,
    required: true
  },
  contractSize: {
    type: Number,
    default: 100000
  },
  pipSize: {
    type: Number,
    default: 0.0001
  },
  pipValue: {
    type: Number,
    default: 10
  },
  minLotSize: {
    type: Number,
    default: 0.01
  },
  maxLotSize: {
    type: Number,
    default: 100
  },
  lotStep: {
    type: Number,
    default: 0.01
  },
  tradingViewSymbol: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true })

export default mongoose.model('Instrument', instrumentSchema)
