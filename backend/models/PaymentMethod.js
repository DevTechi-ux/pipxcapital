import mongoose from 'mongoose'

const paymentMethodSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Bank Transfer', 'UPI', 'QR Code'],
    required: true
  },
  // Bank Transfer fields
  bankName: {
    type: String
  },
  accountNumber: {
    type: String
  },
  accountHolderName: {
    type: String
  },
  ifscCode: {
    type: String
  },
  // UPI fields
  upiId: {
    type: String
  },
  // QR Code fields
  qrCodeImage: {
    type: String
  },
  // Common fields
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true })

export default mongoose.model('PaymentMethod', paymentMethodSchema)
