import mongoose from 'mongoose'

const ibSettingsSchema = new mongoose.Schema({
  settingsType: {
    type: String,
    default: 'GLOBAL',
    unique: true
  },
  // IB Requirements
  ibRequirements: {
    kycRequired: { type: Boolean, default: true },
    minAccountAge: { type: Number, default: 0 }, // Days
    minBalance: { type: Number, default: 0 }
  },
  // Commission settings
  commissionSettings: {
    settlementType: { type: String, enum: ['REALTIME', 'DAILY'], default: 'REALTIME' },
    minWithdrawalAmount: { type: Number, default: 50 },
    withdrawalApprovalRequired: { type: Boolean, default: true }
  },
  // Feature toggles
  isEnabled: {
    type: Boolean,
    default: true
  },
  allowNewApplications: {
    type: Boolean,
    default: true
  },
  autoApprove: {
    type: Boolean,
    default: false
  }
}, { timestamps: true })

// Static method to get settings
ibSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne({ settingsType: 'GLOBAL' })
  if (!settings) {
    settings = await this.create({ settingsType: 'GLOBAL' })
  }
  return settings
}

export default mongoose.model('IBSettings', ibSettingsSchema)
