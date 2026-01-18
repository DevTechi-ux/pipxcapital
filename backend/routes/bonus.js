import express from 'express'
import Bonus from '../models/Bonus.js'
import UserBonus from '../models/UserBonus.js'
import User from '../models/User.js'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Simple auth middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.admin = decoded
    next()
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' })
  }
}

const router = express.Router()

// Get all bonuses
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type } = req.query
    const query = {}
    
    if (status) query.status = status
    if (type) query.type = type

    const bonuses = await Bonus.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Bonus.countDocuments(query)

    res.json({
      success: true,
      data: bonuses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get bonuses error:', error)
    res.status(500).json({ success: false, message: 'Error fetching bonuses' })
  }
})

// Create new bonus
router.post('/', async (req, res) => {
  try {
    const bonusData = {
      ...req.body
    }

    const bonus = new Bonus(bonusData)
    await bonus.save()

    const populatedBonus = await Bonus.findById(bonus._id).populate('createdBy', 'firstName lastName')

    res.json({
      success: true,
      message: 'Bonus created successfully',
      data: populatedBonus
    })
  } catch (error) {
    console.error('Create bonus error:', error)
    res.status(500).json({ success: false, message: 'Error creating bonus' })
  }
})

// Update bonus
router.put('/:id', async (req, res) => {
  try {
    const bonus = await Bonus.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName')

    if (!bonus) {
      return res.status(404).json({ success: false, message: 'Bonus not found' })
    }

    res.json({
      success: true,
      message: 'Bonus updated successfully',
      data: bonus
    })
  } catch (error) {
    console.error('Update bonus error:', error)
    res.status(500).json({ success: false, message: 'Error updating bonus' })
  }
})

// Delete bonus
router.delete('/:id', async (req, res) => {
  try {
    const bonus = await Bonus.findByIdAndDelete(req.params.id)
    
    if (!bonus) {
      return res.status(404).json({ success: false, message: 'Bonus not found' })
    }

    // Also delete all user bonuses associated with this bonus
    await UserBonus.deleteMany({ bonusId: req.params.id })

    res.json({
      success: true,
      message: 'Bonus deleted successfully'
    })
  } catch (error) {
    console.error('Delete bonus error:', error)
    res.status(500).json({ success: false, message: 'Error deleting bonus' })
  }
})

// Get user bonuses
router.get('/user-bonuses', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, userId } = req.query
    const query = {}
    
    if (status) query.status = status
    if (userId) query.userId = userId

    const userBonuses = await UserBonus.find(query)
      .populate('userId', 'firstName lastName email')
      .populate('bonusId', 'name type bonusType')
      .populate('depositId', 'amount status')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await UserBonus.countDocuments(query)

    res.json({
      success: true,
      data: userBonuses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get user bonuses error:', error)
    res.status(500).json({ success: false, message: 'Error fetching user bonuses' })
  }
})

// Calculate bonus for deposit
router.post('/calculate-bonus', async (req, res) => {
  try {
    const { userId, depositAmount, isFirstDeposit } = req.body

    // Find all bonuses
    const bonuses = await Bonus.find({}).sort({ createdAt: -1 })

    let applicableBonus = null
    let bonusAmount = 0

    // Find the best applicable bonus
    for (const bonus of bonuses) {
      // Check if bonus is active
      if (bonus.status !== 'ACTIVE') continue
      
      // Check bonus type matches first deposit status
      if (isFirstDeposit && bonus.type !== 'FIRST_DEPOSIT') continue
      if (!isFirstDeposit && bonus.type === 'FIRST_DEPOSIT') continue
      
      if (depositAmount >= bonus.minDeposit) {
        if (bonus.usageLimit && bonus.usedCount >= bonus.usageLimit) continue

        let calculatedBonus = 0
        if (bonus.bonusType === 'PERCENTAGE') {
          calculatedBonus = depositAmount * (bonus.bonusValue / 100)
          if (bonus.maxBonus && calculatedBonus > bonus.maxBonus) {
            calculatedBonus = bonus.maxBonus
          }
        } else {
          calculatedBonus = bonus.bonusValue
        }

        if (calculatedBonus > bonusAmount) {
          bonusAmount = calculatedBonus
          applicableBonus = bonus
        }
      }
    }

    res.json({
      success: true,
      data: {
        bonusAmount,
        bonus: applicableBonus,
        totalAmount: depositAmount + bonusAmount
      }
    })
  } catch (error) {
    console.error('Calculate bonus error:', error)
    res.status(500).json({ success: false, message: 'Error calculating bonus' })
  }
})

// POST /api/bonus/create-default-bonuses - Create default bonuses
router.post('/create-default-bonuses', async (req, res) => {
  try {
    // Check if bonuses already exist
    const existingBonuses = await Bonus.countDocuments()
    if (existingBonuses > 0) {
      return res.json({ success: true, message: 'Default bonuses already exist' })
    }

    // Create default bonuses
    const defaultBonuses = [
      {
        name: 'First Deposit Bonus',
        type: 'FIRST_DEPOSIT',
        bonusType: 'PERCENTAGE',
        bonusValue: 100,
        minDeposit: 100,
        maxBonus: 500,
        wagerRequirement: 30,
        duration: 30,
        status: 'ACTIVE',
        description: '100% bonus on your first deposit up to $500',
        terms: '30x wagering requirement applies. Bonus expires after 30 days.'
      },
      {
        name: 'Regular Deposit Bonus',
        type: 'DEPOSIT',
        bonusType: 'PERCENTAGE',
        bonusValue: 50,
        minDeposit: 50,
        maxBonus: 200,
        wagerRequirement: 25,
        duration: 30,
        status: 'ACTIVE',
        description: '50% bonus on regular deposits up to $200',
        terms: '25x wagering requirement applies. Bonus expires after 30 days.'
      },
      {
        name: 'Reload Bonus',
        type: 'RELOAD',
        bonusType: 'FIXED',
        bonusValue: 25,
        minDeposit: 100,
        maxBonus: null,
        wagerRequirement: 20,
        duration: 14,
        status: 'ACTIVE',
        description: '$25 fixed bonus on deposits of $100 or more',
        terms: '20x wagering requirement applies. Bonus expires after 14 days.'
      }
    ]

    const createdBonuses = await Bonus.insertMany(defaultBonuses)

    res.json({
      success: true,
      message: 'Default bonuses created successfully',
      data: createdBonuses
    })
  } catch (error) {
    console.error('Create default bonuses error:', error)
    res.status(500).json({ success: false, message: 'Error creating default bonuses' })
  }
})

// Activate bonus for user
router.post('/activate-bonus', async (req, res) => {
  try {
    const { userId, bonusId, depositId, bonusAmount } = req.body

    const bonus = await Bonus.findById(bonusId)
    if (!bonus) {
      return res.status(404).json({ success: false, message: 'Bonus not found' })
    }

    // Create user bonus
    const userBonus = new UserBonus({
      userId,
      bonusId,
      depositId,
      bonusAmount,
      wagerRequirement: bonus.wagerRequirement * bonusAmount,
      remainingWager: bonus.wagerRequirement * bonusAmount,
      status: 'ACTIVE',
      activatedAt: new Date(),
      expiresAt: bonus.duration ? new Date(Date.now() + bonus.duration * 24 * 60 * 60 * 1000) : null,
      maxWithdrawal: bonus.maxWithdrawal
    })

    await userBonus.save()

    // Update bonus usage count
    await Bonus.findByIdAndUpdate(bonusId, { $inc: { usedCount: 1 } })

    const populatedUserBonus = await UserBonus.findById(userBonus._id)
      .populate('userId', 'firstName lastName email')
      .populate('bonusId', 'name type')

    res.json({
      success: true,
      message: 'Bonus activated successfully',
      data: populatedUserBonus
    })
  } catch (error) {
    console.error('Activate bonus error:', error)
    res.status(500).json({ success: false, message: 'Error activating bonus' })
  }
})

export default router
