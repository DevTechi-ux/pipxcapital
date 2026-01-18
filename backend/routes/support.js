import express from 'express'
import SupportTicket from '../models/SupportTicket.js'
import User from '../models/User.js'

const router = express.Router()

// POST /api/support/create - Create new support ticket
router.post('/create', async (req, res) => {
  try {
    const { userId, subject, category, priority, message } = req.body

    if (!userId || !subject || !message) {
      return res.status(400).json({ success: false, message: 'User ID, subject, and message are required' })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const ticket = await SupportTicket.create({
      userId,
      subject,
      category: category || 'GENERAL',
      priority: priority || 'MEDIUM',
      messages: [{
        sender: 'USER',
        senderId: userId,
        senderName: user.firstName,
        message
      }]
    })

    res.json({
      success: true,
      message: 'Support ticket created successfully',
      ticket
    })
  } catch (error) {
    console.error('Error creating support ticket:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/support/user/:userId - Get user's tickets
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const { status } = req.query

    const query = { userId }
    if (status) query.status = status

    const tickets = await SupportTicket.find(query)
      .sort({ createdAt: -1 })
      .populate('assignedTo', 'firstName email')

    res.json({ success: true, tickets })
  } catch (error) {
    console.error('Error fetching user tickets:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/support/ticket/:ticketId - Get single ticket with messages
router.get('/ticket/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params

    const ticket = await SupportTicket.findOne({ ticketId })
      .populate('userId', 'firstName email')
      .populate('assignedTo', 'firstName email')

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' })
    }

    res.json({ success: true, ticket })
  } catch (error) {
    console.error('Error fetching ticket:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/support/reply/:ticketId - Add reply to ticket
router.post('/reply/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params
    const { senderId, senderType, senderName, message } = req.body

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' })
    }

    const ticket = await SupportTicket.findOne({ ticketId })
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' })
    }

    let finalSenderName = senderName || 'Support'
    let finalSenderId = senderId

    // For user replies, validate the user exists
    if (senderType !== 'ADMIN') {
      if (!senderId) {
        return res.status(400).json({ success: false, message: 'Sender ID is required for user replies' })
      }
      const user = await User.findById(senderId)
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' })
      }
      finalSenderName = user.firstName || 'User'
      finalSenderId = senderId
    } else {
      // For admin replies, use provided name or default
      finalSenderName = senderName || 'Support Team'
      finalSenderId = senderId || ticket.userId // Use ticket user ID as fallback for reference
    }

    ticket.messages.push({
      sender: senderType || 'USER',
      senderId: finalSenderId,
      senderName: finalSenderName,
      message
    })

    // Update status based on who replied
    if (senderType === 'ADMIN') {
      ticket.status = 'WAITING_USER'
    } else {
      if (ticket.status === 'WAITING_USER' || ticket.status === 'RESOLVED') {
        ticket.status = 'IN_PROGRESS'
      }
    }

    await ticket.save()

    // Re-fetch with populated fields
    const updatedTicket = await SupportTicket.findOne({ ticketId })
      .populate('userId', 'firstName lastName email')

    res.json({
      success: true,
      message: 'Reply added successfully',
      ticket: updatedTicket
    })
  } catch (error) {
    console.error('Error adding reply:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// ==================== ADMIN ROUTES ====================

// GET /api/support/admin/all - Get all tickets (admin)
router.get('/admin/all', async (req, res) => {
  try {
    const { status, priority, category, limit = 50, offset = 0 } = req.query

    const query = {}
    if (status) query.status = status
    if (priority) query.priority = priority
    if (category) query.category = category

    const tickets = await SupportTicket.find(query)
      .populate('userId', 'firstName email')
      .populate('assignedTo', 'firstName email')
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))

    const total = await SupportTicket.countDocuments(query)

    res.json({ success: true, tickets, total })
  } catch (error) {
    console.error('Error fetching all tickets:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/support/admin/stats - Get ticket stats
router.get('/admin/stats', async (req, res) => {
  try {
    const stats = await SupportTicket.getStats()
    res.json({ success: true, stats })
  } catch (error) {
    console.error('Error fetching stats:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/support/admin/status/:ticketId - Update ticket status
router.put('/admin/status/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params
    const { status } = req.body

    const ticket = await SupportTicket.findOne({ ticketId })
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' })
    }

    ticket.status = status
    if (status === 'RESOLVED') {
      ticket.resolvedAt = new Date()
    } else if (status === 'CLOSED') {
      ticket.closedAt = new Date()
    }

    await ticket.save()

    res.json({
      success: true,
      message: 'Ticket status updated',
      ticket
    })
  } catch (error) {
    console.error('Error updating ticket status:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/support/admin/assign/:ticketId - Assign ticket to admin
router.put('/admin/assign/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params
    const { adminId } = req.body

    const ticket = await SupportTicket.findOne({ ticketId })
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' })
    }

    ticket.assignedTo = adminId
    if (ticket.status === 'OPEN') {
      ticket.status = 'IN_PROGRESS'
    }

    await ticket.save()

    res.json({
      success: true,
      message: 'Ticket assigned successfully',
      ticket
    })
  } catch (error) {
    console.error('Error assigning ticket:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/support/admin/priority/:ticketId - Update ticket priority
router.put('/admin/priority/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params
    const { priority } = req.body

    const ticket = await SupportTicket.findOneAndUpdate(
      { ticketId },
      { priority },
      { new: true }
    )

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' })
    }

    res.json({
      success: true,
      message: 'Priority updated',
      ticket
    })
  } catch (error) {
    console.error('Error updating priority:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
