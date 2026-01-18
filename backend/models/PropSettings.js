import mongoose from 'mongoose'

const propSettingsSchema = new mongoose.Schema({
  challengeModeEnabled: {
    type: Boolean,
    default: false
  },
  displayName: {
    type: String,
    default: 'Prop Trading Challenge'
  },
  description: {
    type: String,
    default: 'Trade with our capital. Pass the challenge and get funded.'
  },
  termsAndConditions: {
    type: String,
    default: ''
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
})

// Singleton pattern - only one settings document
propSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne()
  if (!settings) {
    settings = await this.create({})
  }
  return settings
}

propSettingsSchema.statics.updateSettings = async function(updates, adminId) {
  let settings = await this.findOne()
  if (!settings) {
    settings = new this({})
  }
  
  Object.assign(settings, updates)
  settings.updatedAt = new Date()
  settings.updatedBy = adminId
  await settings.save()
  return settings
}

export default mongoose.model('PropSettings', propSettingsSchema)
