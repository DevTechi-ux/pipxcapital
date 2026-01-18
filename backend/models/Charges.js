import mongoose from 'mongoose'

const chargesSchema = new mongoose.Schema({
  // Hierarchy level - higher priority overrides lower
  // Priority: USER > INSTRUMENT > SEGMENT > ACCOUNT_TYPE > GLOBAL
  level: {
    type: String,
    enum: ['USER', 'INSTRUMENT', 'SEGMENT', 'ACCOUNT_TYPE', 'GLOBAL'],
    required: true
  },
  // Reference IDs based on level
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  instrumentSymbol: {
    type: String,
    default: null
  },
  segment: {
    type: String,
    enum: ['Forex', 'Crypto', 'Commodities', 'Indices', 'Metals', null],
    default: null
  },
  accountTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AccountType',
    default: null
  },
  
  // ============ SPREAD SETTINGS ============
  // Spread is added to the price (BUY gets higher price, SELL gets lower price)
  // For Forex: Value in PIPS (e.g., 1.5 = 1.5 pips = 0.00015 for EURUSD, 0.015 for USDJPY)
  // For Metals: Value in cents (e.g., 50 = $0.50 for XAUUSD)
  // For Crypto: Value in USD (e.g., 10 = $10 spread)
  spreadType: {
    type: String,
    enum: ['FIXED', 'PERCENTAGE'],
    default: 'FIXED'
  },
  spreadValue: {
    type: Number,
    default: 0
  },
  
  // ============ COMMISSION SETTINGS ============
  // Commission charged per lot on each execution (buy/sell/close)
  commissionType: {
    type: String,
    enum: ['PER_LOT', 'PER_TRADE', 'PERCENTAGE'],
    default: 'PER_LOT'
  },
  commissionValue: {
    type: Number,
    default: 0
  },
  // When to charge commission
  commissionOnBuy: {
    type: Boolean,
    default: true
  },
  commissionOnSell: {
    type: Boolean,
    default: true
  },
  commissionOnClose: {
    type: Boolean,
    default: false
  },
  
  // ============ SWAP SETTINGS ============
  // Overnight fees (charged daily at rollover time)
  swapLong: {
    type: Number,
    default: 0
  },
  swapShort: {
    type: Number,
    default: 0
  },
  swapType: {
    type: String,
    enum: ['POINTS', 'PERCENTAGE'],
    default: 'POINTS'
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true })

// Merges charges from multiple levels - most specific wins for each field
chargesSchema.statics.getChargesForTrade = async function(userId, symbol, segment, accountTypeId) {
  console.log(`Getting charges for: userId=${userId}, symbol=${symbol}, segment=${segment}, accountTypeId=${accountTypeId}`)
  
  // Build query to find all potentially applicable charges
  const allCharges = await this.find({ isActive: true }).sort({ createdAt: -1 })
  
  // Filter charges that apply to this trade
  let applicableCharges = allCharges.filter(charge => {
    // USER level - must match userId
    if (charge.level === 'USER') {
      if (!charge.userId || charge.userId.toString() !== userId?.toString()) return false
      // If instrument is specified, must match
      if (charge.instrumentSymbol && charge.instrumentSymbol !== symbol) return false
      return true
    }
    
    // INSTRUMENT level - must match symbol
    if (charge.level === 'INSTRUMENT') {
      if (charge.instrumentSymbol !== symbol) return false
      // If accountTypeId is specified, must match
      if (charge.accountTypeId && charge.accountTypeId.toString() !== accountTypeId?.toString()) return false
      return true
    }
    
    // ACCOUNT_TYPE level - must match accountTypeId
    if (charge.level === 'ACCOUNT_TYPE') {
      if (!charge.accountTypeId || charge.accountTypeId.toString() !== accountTypeId?.toString()) return false
      // If segment is specified, must match
      if (charge.segment && charge.segment !== segment) return false
      return true
    }
    
    // SEGMENT level - must match segment OR be null (applies to all segments)
    if (charge.level === 'SEGMENT') {
      if (charge.segment && charge.segment !== segment) return false
      return true
    }
    
    // GLOBAL level - always applies
    if (charge.level === 'GLOBAL') {
      return true
    }
    
    return false
  })
  
  // Merge charges at the same level - combine non-zero values from multiple charges
  const chargesByLevel = {}
  for (const charge of applicableCharges) {
    const key = `${charge.level}-${charge.segment || ''}-${charge.instrumentSymbol || ''}-${charge.accountTypeId || ''}`
    const existing = chargesByLevel[key]
    
    if (!existing) {
      // Clone the charge object to avoid modifying the original
      chargesByLevel[key] = { ...charge.toObject ? charge.toObject() : charge }
    } else {
      // Merge non-zero values from this charge into existing
      if (charge.commissionValue > 0 && !existing.commissionValue) {
        existing.commissionValue = charge.commissionValue
        existing.commissionType = charge.commissionType
        existing.commissionOnBuy = charge.commissionOnBuy
        existing.commissionOnSell = charge.commissionOnSell
        existing.commissionOnClose = charge.commissionOnClose
      }
      if (charge.spreadValue > 0 && !existing.spreadValue) {
        existing.spreadValue = charge.spreadValue
        existing.spreadType = charge.spreadType
      }
      if ((charge.swapLong !== 0 || charge.swapShort !== 0) && !existing.swapLong && !existing.swapShort) {
        existing.swapLong = charge.swapLong
        existing.swapShort = charge.swapShort
        existing.swapType = charge.swapType
      }
    }
  }
  
  applicableCharges = Object.values(chargesByLevel)
  console.log(`Found ${applicableCharges.length} applicable charges after merging`)
  
  // Priority order for merging
  const priorityOrder = { 'USER': 1, 'INSTRUMENT': 2, 'ACCOUNT_TYPE': 3, 'SEGMENT': 4, 'GLOBAL': 5 }
  
  // Sort by priority (most specific first)
  applicableCharges.sort((a, b) => priorityOrder[a.level] - priorityOrder[b.level])
  
  // Merge charges - most specific wins for each field
  const result = {
    spreadType: 'FIXED',
    spreadValue: 0,
    commissionType: 'PER_LOT',
    commissionValue: 0,
    commissionOnBuy: true,
    commissionOnSell: true,
    commissionOnClose: false,
    swapLong: 0,
    swapShort: 0,
    swapType: 'POINTS'
  }
  
  // Apply charges from least specific to most specific (so most specific overwrites)
  for (let i = applicableCharges.length - 1; i >= 0; i--) {
    const charge = applicableCharges[i]
    
    // Only overwrite if the charge has a non-zero/non-default value
    if (charge.spreadValue > 0) {
      result.spreadValue = charge.spreadValue
      result.spreadType = charge.spreadType
    }
    if (charge.commissionValue > 0) {
      result.commissionValue = charge.commissionValue
      result.commissionType = charge.commissionType
      result.commissionOnBuy = charge.commissionOnBuy
      result.commissionOnSell = charge.commissionOnSell
      result.commissionOnClose = charge.commissionOnClose
    }
    if (charge.swapLong !== 0 || charge.swapShort !== 0) {
      result.swapLong = charge.swapLong
      result.swapShort = charge.swapShort
      result.swapType = charge.swapType
    }
  }
  
  console.log(`Final charges: spread=${result.spreadValue}, commission=${result.commissionValue}, swapLong=${result.swapLong}, swapShort=${result.swapShort}`)
  
  return result
}

export default mongoose.model('Charges', chargesSchema)
