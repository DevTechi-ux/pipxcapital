import mongoose from 'mongoose'

const ibLevelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  order: {
    type: Number,
    required: true,
    unique: true
  },
  referralTarget: {
    type: Number,
    required: true,
    default: 0
  },
  commissionRate: {
    type: Number,
    required: true,
    default: 0
  },
  commissionType: {
    type: String,
    enum: ['PER_LOT', 'PERCENT'],
    default: 'PER_LOT'
  },
  // Downline commission distribution (level-wise)
  downlineCommission: {
    level1: { type: Number, default: 0 },
    level2: { type: Number, default: 0 },
    level3: { type: Number, default: 0 },
    level4: { type: Number, default: 0 },
    level5: { type: Number, default: 0 }
  },
  color: {
    type: String,
    default: '#10B981'
  },
  icon: {
    type: String,
    default: 'award'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

// Get all levels sorted by order
ibLevelSchema.statics.getAllLevels = async function() {
  return await this.find({ isActive: true }).sort({ order: 1 })
}

// Get level by order
ibLevelSchema.statics.getLevelByOrder = async function(order) {
  return await this.findOne({ order, isActive: true })
}

// Get next level
ibLevelSchema.statics.getNextLevel = async function(currentOrder) {
  return await this.findOne({ order: currentOrder + 1, isActive: true })
}

// Initialize default levels if none exist
ibLevelSchema.statics.initializeDefaultLevels = async function() {
  const count = await this.countDocuments()
  if (count === 0) {
    const defaultLevels = [
      {
        name: 'Standard',
        order: 1,
        referralTarget: 0,
        commissionRate: 2,
        commissionType: 'PER_LOT',
        downlineCommission: { level1: 2, level2: 1, level3: 0.5, level4: 0.25, level5: 0.1 },
        color: '#6B7280',
        icon: 'user'
      },
      {
        name: 'Bronze',
        order: 2,
        referralTarget: 5,
        commissionRate: 3,
        commissionType: 'PER_LOT',
        downlineCommission: { level1: 3, level2: 1.5, level3: 0.75, level4: 0.35, level5: 0.15 },
        color: '#CD7F32',
        icon: 'award'
      },
      {
        name: 'Silver',
        order: 3,
        referralTarget: 15,
        commissionRate: 4,
        commissionType: 'PER_LOT',
        downlineCommission: { level1: 4, level2: 2, level3: 1, level4: 0.5, level5: 0.25 },
        color: '#C0C0C0',
        icon: 'award'
      },
      {
        name: 'Gold',
        order: 4,
        referralTarget: 30,
        commissionRate: 5,
        commissionType: 'PER_LOT',
        downlineCommission: { level1: 5, level2: 2.5, level3: 1.25, level4: 0.6, level5: 0.3 },
        color: '#FFD700',
        icon: 'trophy'
      },
      {
        name: 'Platinum',
        order: 5,
        referralTarget: 50,
        commissionRate: 7,
        commissionType: 'PER_LOT',
        downlineCommission: { level1: 7, level2: 3.5, level3: 1.75, level4: 0.85, level5: 0.4 },
        color: '#E5E4E2',
        icon: 'crown'
      }
    ]
    
    await this.insertMany(defaultLevels)
    console.log('Default IB levels initialized')
  }
}

export default mongoose.model('IBLevel', ibLevelSchema)
