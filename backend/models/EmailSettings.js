import mongoose from 'mongoose'

const emailSettingsSchema = new mongoose.Schema({
  smtpEnabled: {
    type: Boolean,
    default: false
  },
  smtpHost: {
    type: String,
    default: ''
  },
  smtpPort: {
    type: Number,
    default: 587
  },
  smtpUser: {
    type: String,
    default: ''
  },
  smtpPass: {
    type: String,
    default: ''
  },
  smtpSecure: {
    type: Boolean,
    default: false
  },
  fromEmail: {
    type: String,
    default: ''
  },
  fromName: {
    type: String,
    default: 'Trading Platform'
  },
  otpVerificationEnabled: {
    type: Boolean,
    default: true
  },
  otpExpiryMinutes: {
    type: Number,
    default: 10
  }
}, { timestamps: true })

export default mongoose.model('EmailSettings', emailSettingsSchema)
