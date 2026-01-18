import mongoose from 'mongoose'

const adminWalletTransactionSchema = new mongoose.Schema({
  // From admin (super admin when funding, or the admin when giving to user)
  fromAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  
  // To admin (when super admin funds an admin)
  toAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  
  // To user (when admin funds a user)
  toUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Transaction type
  type: {
    type: String,
    enum: ['SUPER_TO_ADMIN', 'ADMIN_TO_USER', 'ADJUSTMENT', 'REFUND'],
    required: true
  },
  
  amount: {
    type: Number,
    required: true
  },
  
  // Balance after transaction
  balanceAfter: {
    type: Number,
    default: 0
  },
  
  description: {
    type: String,
    default: ''
  },
  
  status: {
    type: String,
    enum: ['COMPLETED', 'PENDING', 'FAILED', 'REVERSED'],
    default: 'COMPLETED'
  },
  
  // Reference to related deposit if applicable
  relatedDepositId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deposit',
    default: null
  }
}, {
  timestamps: true
})

export default mongoose.model('AdminWalletTransaction', adminWalletTransactionSchema)
