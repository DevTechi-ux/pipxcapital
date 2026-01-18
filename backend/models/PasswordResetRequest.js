import mongoose from 'mongoose'

const passwordResetRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true
  },
  newEmail: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Rejected'],
    default: 'Pending'
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: {
    type: Date
  },
  adminRemarks: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
})

export default mongoose.model('PasswordResetRequest', passwordResetRequestSchema)
