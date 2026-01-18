import mongoose from 'mongoose'

const ibPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    default: ''
  },
  // Maximum levels for commission distribution
  maxLevels: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    default: 3
  },
  // Commission type
  commissionType: {
    type: String,
    enum: ['PER_LOT', 'PERCENTAGE'],
    default: 'PER_LOT'
  },
  // Level-wise commission rates
  levelCommissions: {
    level1: { type: Number, default: 5 },  // $5 per lot or 30%
    level2: { type: Number, default: 3 },  // $3 per lot or 20%
    level3: { type: Number, default: 2 },  // $2 per lot or 10%
    level4: { type: Number, default: 1 },  // $1 per lot or 5%
    level5: { type: Number, default: 0.5 } // $0.5 per lot or 2%
  },
  // Commission sources (which charges to share)
  commissionSources: {
    spread: { type: Boolean, default: true },
    commission: { type: Boolean, default: true },
    swap: { type: Boolean, default: false }
  },
  // Minimum requirements
  minWithdrawalAmount: {
    type: Number,
    default: 50
  },
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, { timestamps: true })

// Static method to get default plan
ibPlanSchema.statics.getDefaultPlan = async function() {
  let plan = await this.findOne({ isDefault: true, isActive: true })
  if (!plan) {
    plan = await this.findOne({ isActive: true })
  }
  return plan
}

export default mongoose.model('IBPlan', ibPlanSchema)
