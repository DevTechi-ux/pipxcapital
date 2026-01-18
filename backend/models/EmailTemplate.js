import mongoose from 'mongoose'

const emailTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  subject: {
    type: String,
    required: true
  },
  htmlContent: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  variables: [{
    type: String
  }],
  isEnabled: {
    type: Boolean,
    default: true
  },
  category: {
    type: String,
    enum: ['verification', 'transaction', 'account', 'notification'],
    default: 'notification'
  }
}, { timestamps: true })

export default mongoose.model('EmailTemplate', emailTemplateSchema)
