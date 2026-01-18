import mongoose from 'mongoose'

const ibPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  maxLevels: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    default: 3
  },
  commissionType: {
    type: String,
    enum: ['PER_LOT', 'PERCENT'],
    default: 'PER_LOT'
  },
  levels: [{
    level: {
      type: Number,
      required: true
    },
    rate: {
      type: Number,
      required: true,
      default: 0
    }
  }],
  source: {
    spread: {
      type: Boolean,
      default: true
    },
    tradeCommission: {
      type: Boolean,
      default: true
    },
    swap: {
      type: Boolean,
      default: false
    }
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

// Get default plan
ibPlanSchema.statics.getDefaultPlan = async function() {
  let plan = await this.findOne({ name: 'Default', isActive: true })
  if (!plan) {
    plan = await this.create({
      name: 'Default',
      maxLevels: 3,
      commissionType: 'PER_LOT',
      levels: [
        { level: 1, rate: 5 },
        { level: 2, rate: 3 },
        { level: 3, rate: 1 }
      ],
      source: {
        spread: true,
        tradeCommission: true,
        swap: false
      }
    })
  }
  return plan
}

// Get rate for a specific level
ibPlanSchema.methods.getRateForLevel = function(level) {
  const levelConfig = this.levels.find(l => l.level === level)
  return levelConfig ? levelConfig.rate : 0
}

export default mongoose.model('IBPlan', ibPlanSchema)
