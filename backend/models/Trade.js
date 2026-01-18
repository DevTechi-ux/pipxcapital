import mongoose from 'mongoose'

const tradeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tradingAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'accountType',
    required: true
  },
  accountType: {
    type: String,
    enum: ['TradingAccount', 'ChallengeAccount'],
    default: 'TradingAccount'
  },
  isChallengeAccount: {
    type: Boolean,
    default: false
  },
  tradeId: {
    type: String,
    unique: true,
    required: true
  },
  symbol: {
    type: String,
    required: true
  },
  segment: {
    type: String,
    enum: ['Forex', 'Crypto', 'Commodities', 'Indices', 'Metals', 'FOREX', 'CRYPTO', 'COMMODITIES', 'INDICES', 'METALS'],
    required: true
  },
  side: {
    type: String,
    enum: ['BUY', 'SELL'],
    required: true
  },
  orderType: {
    type: String,
    enum: ['MARKET', 'BUY_LIMIT', 'BUY_STOP', 'SELL_LIMIT', 'SELL_STOP'],
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.01
  },
  openPrice: {
    type: Number,
    required: true
  },
  closePrice: {
    type: Number,
    default: null
  },
  currentPrice: {
    type: Number,
    default: null
  },
  stopLoss: {
    type: Number,
    default: null
  },
  sl: {
    type: Number,
    default: null
  },
  takeProfit: {
    type: Number,
    default: null
  },
  tp: {
    type: Number,
    default: null
  },
  marginUsed: {
    type: Number,
    required: true
  },
  leverage: {
    type: Number,
    required: true
  },
  contractSize: {
    type: Number,
    default: 100000
  },
  spread: {
    type: Number,
    default: 0
  },
  commission: {
    type: Number,
    default: 0
  },
  swap: {
    type: Number,
    default: 0
  },
  floatingPnl: {
    type: Number,
    default: 0
  },
  realizedPnl: {
    type: Number,
    default: null
  },
  status: {
    type: String,
    enum: ['OPEN', 'CLOSED', 'PENDING', 'CANCELLED'],
    default: 'OPEN'
  },
  pendingPrice: {
    type: Number,
    default: null
  },
  closedBy: {
    type: String,
    enum: ['USER', 'SL', 'TP', 'STOP_OUT', 'ADMIN', null],
    default: null
  },
  openedAt: {
    type: Date,
    default: Date.now
  },
  closedAt: {
    type: Date,
    default: null
  },
  adminModified: {
    type: Boolean,
    default: false
  },
  adminModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  adminModifiedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true })

// Generate unique trade ID
tradeSchema.statics.generateTradeId = async function() {
  const prefix = 'T'
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.floor(1000 + Math.random() * 9000)
  const tradeId = `${prefix}${timestamp}${random}`
  const exists = await this.findOne({ tradeId })
  if (exists) return this.generateTradeId()
  return tradeId
}

// Calculate PnL for a trade
tradeSchema.methods.calculatePnl = function(currentBid, currentAsk) {
  if (this.status !== 'OPEN') return this.realizedPnl || 0
  
  const currentPrice = this.side === 'BUY' ? currentBid : currentAsk
  let pnl = 0
  
  if (this.side === 'BUY') {
    pnl = (currentPrice - this.openPrice) * this.quantity * this.contractSize
  } else {
    pnl = (this.openPrice - currentPrice) * this.quantity * this.contractSize
  }
  
  // Subtract commission and swap
  pnl = pnl - this.commission - this.swap
  
  return pnl
}

// Check if SL/TP is hit
tradeSchema.methods.checkSlTp = function(currentBid, currentAsk) {
  if (this.status !== 'OPEN') return null
  
  // Check both sl and stopLoss fields
  const sl = this.sl || this.stopLoss
  const tp = this.tp || this.takeProfit
  
  if (this.side === 'BUY') {
    if (sl && currentBid <= sl) return 'SL'
    if (tp && currentBid >= tp) return 'TP'
  } else {
    if (sl && currentAsk >= sl) return 'SL'
    if (tp && currentAsk <= tp) return 'TP'
  }
  
  return null
}

export default mongoose.model('Trade', tradeSchema)
