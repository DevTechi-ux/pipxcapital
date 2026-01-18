import express from 'express'
import Charges from '../models/Charges.js'

const router = express.Router()

// GET /api/charges/spreads - Get spreads for all instruments (for display in trading UI)
router.get('/spreads', async (req, res) => {
  try {
    const { userId, accountTypeId } = req.query
    
    // Get all charges that have spread values
    const charges = await Charges.find({ isActive: true, spreadValue: { $gt: 0 } })
      .sort({ level: 1 })
    
    // Build a map of symbol -> spread (respecting hierarchy)
    const spreadMap = {}
    
    // Priority order: USER > INSTRUMENT > ACCOUNT_TYPE > SEGMENT > GLOBAL
    const priorityOrder = { 'USER': 1, 'INSTRUMENT': 2, 'ACCOUNT_TYPE': 3, 'SEGMENT': 4, 'GLOBAL': 5 }
    
    for (const charge of charges) {
      // For instrument-specific charges
      if (charge.instrumentSymbol) {
        const existing = spreadMap[charge.instrumentSymbol]
        if (!existing || priorityOrder[charge.level] < priorityOrder[existing.level]) {
          spreadMap[charge.instrumentSymbol] = {
            spread: charge.spreadValue,
            spreadType: charge.spreadType,
            level: charge.level
          }
        }
      }
      // For segment-level charges, apply to all instruments in that segment
      else if (charge.segment) {
        const segmentSymbols = {
          'Forex': ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD', 'EURGBP', 'EURJPY', 'GBPJPY'],
          'Metals': ['XAUUSD', 'XAGUSD'],
          'Crypto': ['BTCUSD', 'ETHUSD', 'LTCUSD', 'XRPUSD', 'BNBUSD', 'SOLUSD', 'ADAUSD', 'DOGEUSD', 'DOTUSD', 'MATICUSD', 'AVAXUSD', 'LINKUSD'],
          'Indices': ['US30', 'US500', 'NAS100']
        }
        const symbols = segmentSymbols[charge.segment] || []
        for (const symbol of symbols) {
          const existing = spreadMap[symbol]
          if (!existing || priorityOrder[charge.level] < priorityOrder[existing.level]) {
            spreadMap[symbol] = {
              spread: charge.spreadValue,
              spreadType: charge.spreadType,
              level: charge.level
            }
          }
        }
      }
      // For global charges, apply to all instruments that don't have specific settings
      else if (charge.level === 'GLOBAL') {
        const allSymbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD', 'EURGBP', 'EURJPY', 'GBPJPY', 'XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD', 'LTCUSD', 'XRPUSD']
        for (const symbol of allSymbols) {
          if (!spreadMap[symbol]) {
            spreadMap[symbol] = {
              spread: charge.spreadValue,
              spreadType: charge.spreadType,
              level: charge.level
            }
          }
        }
      }
    }
    
    res.json({ success: true, spreads: spreadMap })
  } catch (error) {
    console.error('Error fetching spreads:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/charges - Get all charges with optional filters
router.get('/', async (req, res) => {
  try {
    const { segment, level, instrumentSymbol, userId } = req.query
    
    let query = { isActive: true }
    // Include charges for specific segment OR null segment (applies to all)
    if (segment) {
      query.$or = [{ segment: segment }, { segment: null }]
    }
    if (level) query.level = level
    if (instrumentSymbol) query.instrumentSymbol = instrumentSymbol
    if (userId) query.userId = userId

    const charges = await Charges.find(query)
      .populate('userId', 'name email mobile')
      .sort({ level: 1, createdAt: -1 })
    res.json({ success: true, charges })
  } catch (error) {
    console.error('Error fetching charges:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/charges/:id - Get single charge
router.get('/:id', async (req, res) => {
  try {
    const charge = await Charges.findById(req.params.id)
    if (!charge) {
      return res.status(404).json({ success: false, message: 'Charge not found' })
    }
    res.json({ success: true, charge })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/charges - Create new charge
router.post('/', async (req, res) => {
  try {
    const {
      level,
      userId,
      instrumentSymbol,
      segment,
      accountTypeId,
      spreadType,
      spreadValue,
      commissionType,
      commissionValue,
      commissionOnBuy,
      commissionOnSell,
      commissionOnClose,
      swapLong,
      swapShort,
      swapType
    } = req.body

    if (!level) {
      return res.status(400).json({ success: false, message: 'Level is required' })
    }

    const charge = await Charges.create({
      level,
      userId: userId || null,
      instrumentSymbol: instrumentSymbol || null,
      segment: segment || null,
      accountTypeId: accountTypeId || null,
      spreadType: spreadType || 'FIXED',
      spreadValue: spreadValue || 0,
      commissionType: commissionType || 'PER_LOT',
      commissionValue: commissionValue || 0,
      commissionOnBuy: commissionOnBuy !== false,
      commissionOnSell: commissionOnSell !== false,
      commissionOnClose: commissionOnClose || false,
      swapLong: swapLong || 0,
      swapShort: swapShort || 0,
      swapType: swapType || 'POINTS',
      isActive: true
    })

    res.json({ success: true, message: 'Charge created', charge })
  } catch (error) {
    console.error('Error creating charge:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/charges/:id - Update charge
router.put('/:id', async (req, res) => {
  try {
    const {
      level,
      userId,
      instrumentSymbol,
      segment,
      accountTypeId,
      spreadType,
      spreadValue,
      commissionType,
      commissionValue,
      commissionOnBuy,
      commissionOnSell,
      commissionOnClose,
      swapLong,
      swapShort,
      swapType,
      isActive
    } = req.body

    const charge = await Charges.findById(req.params.id)
    if (!charge) {
      return res.status(404).json({ success: false, message: 'Charge not found' })
    }

    if (level !== undefined) charge.level = level
    if (userId !== undefined) charge.userId = userId || null
    if (instrumentSymbol !== undefined) charge.instrumentSymbol = instrumentSymbol || null
    if (segment !== undefined) charge.segment = segment || null
    if (accountTypeId !== undefined) charge.accountTypeId = accountTypeId || null
    if (spreadType !== undefined) charge.spreadType = spreadType
    if (spreadValue !== undefined) charge.spreadValue = spreadValue
    if (commissionType !== undefined) charge.commissionType = commissionType
    if (commissionValue !== undefined) charge.commissionValue = commissionValue
    if (commissionOnBuy !== undefined) charge.commissionOnBuy = commissionOnBuy
    if (commissionOnSell !== undefined) charge.commissionOnSell = commissionOnSell
    if (commissionOnClose !== undefined) charge.commissionOnClose = commissionOnClose
    if (swapLong !== undefined) charge.swapLong = swapLong
    if (swapShort !== undefined) charge.swapShort = swapShort
    if (swapType !== undefined) charge.swapType = swapType
    if (isActive !== undefined) charge.isActive = isActive

    await charge.save()

    res.json({ success: true, message: 'Charge updated', charge })
  } catch (error) {
    console.error('Error updating charge:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// DELETE /api/charges/:id - Delete charge
router.delete('/:id', async (req, res) => {
  try {
    const charge = await Charges.findById(req.params.id)
    if (!charge) {
      return res.status(404).json({ success: false, message: 'Charge not found' })
    }

    await Charges.findByIdAndDelete(req.params.id)
    res.json({ success: true, message: 'Charge deleted' })
  } catch (error) {
    console.error('Error deleting charge:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
