import mongoose from 'mongoose'

const kycSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  documentType: {
    type: String,
    enum: ['passport', 'driving_license', 'national_id', 'aadhaar', 'pan_card', 'voter_id'],
    required: true
  },
  documentNumber: {
    type: String,
    required: true
  },
  frontImage: {
    type: String,  // Base64 or URL
    required: true
  },
  backImage: {
    type: String,  // Base64 or URL (optional for some docs)
  },
  selfieImage: {
    type: String,  // Base64 or URL
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  rejectionReason: {
    type: String
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  reviewedAt: {
    type: Date
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

const KYC = mongoose.model('KYC', kycSchema)

export default KYC
