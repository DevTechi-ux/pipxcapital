import mongoose from 'mongoose'

const userBankAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['Bank Transfer', 'UPI'],
    required: true
  },
  // Bank Transfer fields
  bankName: {
    type: String,
    default: ''
  },
  accountNumber: {
    type: String,
    default: ''
  },
  accountHolderName: {
    type: String,
    default: ''
  },
  ifscCode: {
    type: String,
    default: ''
  },
  branchName: {
    type: String,
    default: ''
  },
  // UPI fields
  upiId: {
    type: String,
    default: ''
  },
  // Status
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  isActive: {
    type: Boolean,
    default: false
  },
  // Admin actions
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  approvedAt: {
    type: Date
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  rejectedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

userBankAccountSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

export default mongoose.model('UserBankAccount', userBankAccountSchema)
