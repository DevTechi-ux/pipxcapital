import mongoose from 'mongoose'

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet'
  },
  type: {
    type: String,
    enum: ['Deposit', 'Withdrawal', 'Transfer_To_Account', 'Transfer_From_Account', 'Account_Transfer_Out', 'Account_Transfer_In', 'Demo_Credit', 'Demo_Reset', 'Challenge_Purchase'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['Bank Transfer', 'UPI', 'QR Code', 'Internal', 'System', 'Wallet'],
    default: 'Internal'
  },
  description: {
    type: String,
    default: ''
  },
  challengeAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChallengeAccount'
  },
  // For internal transfers
  tradingAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TradingAccount'
  },
  tradingAccountName: {
    type: String,
    default: ''
  },
  // For account-to-account transfers
  toTradingAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TradingAccount'
  },
  toTradingAccountName: {
    type: String,
    default: ''
  },
  fromTradingAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TradingAccount'
  },
  fromTradingAccountName: {
    type: String,
    default: ''
  },
  transactionRef: {
    type: String,
    default: ''
  },
  screenshot: {
    type: String,
    default: ''
  },
  bankAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserBankAccount'
  },
  bankAccountDetails: {
    type: {
      type: String,
      enum: ['Bank', 'UPI']
    },
    bankName: String,
    accountNumber: String,
    ifscCode: String,
    upiId: String
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Completed'],
    default: 'Pending'
  },
  adminRemarks: {
    type: String,
    default: ''
  },
  processedAt: {
    type: Date
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Bonus related fields
  bonusAmount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  bonusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bonus'
  }
}, { timestamps: true })

export default mongoose.model('Transaction', transactionSchema)
