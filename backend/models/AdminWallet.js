import mongoose from 'mongoose'

const adminWalletSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    unique: true
  },
  
  // Available balance for funding users
  balance: {
    type: Number,
    default: 0
  },
  
  // Total funds received from super admin
  totalReceived: {
    type: Number,
    default: 0
  },
  
  // Total funds given to users as deposits
  totalGivenToUsers: {
    type: Number,
    default: 0
  },
  
  // Currency
  currency: {
    type: String,
    default: 'USD'
  },
  
  status: {
    type: String,
    enum: ['ACTIVE', 'FROZEN', 'SUSPENDED'],
    default: 'ACTIVE'
  }
}, {
  timestamps: true
})

export default mongoose.model('AdminWallet', adminWalletSchema)
