import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['USER', 'ADMIN'],
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  attachments: [{
    filename: String,
    url: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
})

const supportTicketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['GENERAL', 'DEPOSIT', 'WITHDRAWAL', 'TRADING', 'ACCOUNT', 'TECHNICAL', 'OTHER'],
    default: 'GENERAL'
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM'
  },
  status: {
    type: String,
    enum: ['OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED'],
    default: 'OPEN'
  },
  messages: [messageSchema],
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  closedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
})

// Generate ticket ID
supportTicketSchema.pre('save', async function(next) {
  if (!this.ticketId) {
    const count = await mongoose.model('SupportTicket').countDocuments()
    this.ticketId = `TKT${String(count + 1).padStart(6, '0')}`
  }
  next()
})

// Static method to get ticket stats
supportTicketSchema.statics.getStats = async function() {
  const total = await this.countDocuments()
  const open = await this.countDocuments({ status: 'OPEN' })
  const inProgress = await this.countDocuments({ status: 'IN_PROGRESS' })
  const resolved = await this.countDocuments({ status: 'RESOLVED' })
  const closed = await this.countDocuments({ status: 'CLOSED' })
  
  return { total, open, inProgress, resolved, closed }
}

export default mongoose.model('SupportTicket', supportTicketSchema)
