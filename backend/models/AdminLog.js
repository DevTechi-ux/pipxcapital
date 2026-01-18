import mongoose from 'mongoose'

const adminLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: [
      'TRADE_CLOSE',
      'TRADE_MODIFY_SL',
      'TRADE_MODIFY_TP',
      'TRADE_MODIFY_PENDING',
      'TRADE_CANCEL',
      'TRADE_FORCE_CLOSE',
      'ACCOUNT_FREEZE',
      'ACCOUNT_UNFREEZE',
      'CHARGES_UPDATE',
      'SETTINGS_UPDATE',
      'USER_BLOCK',
      'USER_UNBLOCK',
      'USER_BAN',
      'BALANCE_ADJUST',
      'CREDIT_ADJUST',
      'ADD_CREDIT',
      'REMOVE_CREDIT',
      'LOGIN_AS_USER'
    ],
    required: true
  },
  targetType: {
    type: String,
    enum: ['TRADE', 'USER', 'ACCOUNT', 'CHARGES', 'SETTINGS', 'TRADING_ACCOUNT'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  previousValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  reason: {
    type: String,
    default: ''
  },
  ipAddress: {
    type: String,
    default: ''
  }
}, { timestamps: true })

export default mongoose.model('AdminLog', adminLogSchema)
