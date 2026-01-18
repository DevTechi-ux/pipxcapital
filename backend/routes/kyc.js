import express from 'express'
import KYC from '../models/KYC.js'
import User from '../models/User.js'
import { sendTemplateEmail } from '../services/emailService.js'
import EmailSettings from '../models/EmailSettings.js'

const router = express.Router()

// POST /api/kyc/submit - Submit KYC documents
router.post('/submit', async (req, res) => {
  try {
    const { userId, documentType, documentNumber, frontImage, backImage, selfieImage } = req.body

    if (!userId || !documentType || !documentNumber || !frontImage) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, documentType, documentNumber, frontImage'
      })
    }

    // Check if user already has a pending or approved KYC
    const existingKYC = await KYC.findOne({ 
      userId, 
      status: { $in: ['pending', 'approved'] } 
    })

    if (existingKYC) {
      if (existingKYC.status === 'approved') {
        return res.status(400).json({
          success: false,
          message: 'Your KYC is already approved'
        })
      }
      return res.status(400).json({
        success: false,
        message: 'You already have a pending KYC submission. Please wait for review.'
      })
    }

    const kyc = new KYC({
      userId,
      documentType,
      documentNumber,
      frontImage,
      backImage,
      selfieImage,
      status: 'pending',
      submittedAt: new Date()
    })

    await kyc.save()

    // Send KYC submitted email
    try {
      const user = await User.findById(userId)
      if (user && user.email) {
        const settings = await EmailSettings.findOne()
        await sendTemplateEmail('kyc_submitted', user.email, {
          firstName: user.firstName || user.email.split('@')[0],
          email: user.email,
          documentType: documentType,
          submittedAt: new Date().toLocaleString(),
          platformName: settings?.platformName || 'Pipxacpital',
          supportEmail: settings?.supportEmail || 'support@Pipxacpital.com',
          year: new Date().getFullYear().toString()
        })
      }
    } catch (emailError) {
      console.error('Error sending KYC submission email:', emailError)
    }

    res.json({
      success: true,
      message: 'KYC documents submitted successfully. Please wait for approval.',
      kyc: {
        _id: kyc._id,
        status: kyc.status,
        documentType: kyc.documentType,
        submittedAt: kyc.submittedAt
      }
    })
  } catch (error) {
    console.error('Error submitting KYC:', error)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// GET /api/kyc/status/:userId - Get KYC status for a user
router.get('/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params

    const kyc = await KYC.findOne({ userId }).sort({ createdAt: -1 })

    if (!kyc) {
      return res.json({
        success: true,
        hasKYC: false,
        status: null
      })
    }

    res.json({
      success: true,
      hasKYC: true,
      kyc: {
        _id: kyc._id,
        status: kyc.status,
        documentType: kyc.documentType,
        submittedAt: kyc.submittedAt,
        reviewedAt: kyc.reviewedAt,
        rejectionReason: kyc.rejectionReason
      }
    })
  } catch (error) {
    console.error('Error fetching KYC status:', error)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// GET /api/kyc/all - Get all KYC submissions (Admin)
router.get('/all', async (req, res) => {
  try {
    const { status } = req.query

    const filter = {}
    if (status && status !== 'all') {
      filter.status = status
    }

    const kycList = await KYC.find(filter)
      .populate('userId', 'firstName lastName email phone')
      .sort({ submittedAt: -1 })

    // Get stats
    const totalCount = await KYC.countDocuments()
    const pendingCount = await KYC.countDocuments({ status: 'pending' })
    const approvedCount = await KYC.countDocuments({ status: 'approved' })
    const rejectedCount = await KYC.countDocuments({ status: 'rejected' })

    res.json({
      success: true,
      kycList: kycList.map(kyc => ({
        _id: kyc._id,
        user: kyc.userId ? {
          _id: kyc.userId._id,
          name: `${kyc.userId.firstName || ''} ${kyc.userId.lastName || ''}`.trim() || 'Unknown',
          email: kyc.userId.email,
          phone: kyc.userId.phone
        } : { name: 'Unknown', email: 'N/A' },
        documentType: kyc.documentType,
        documentNumber: kyc.documentNumber,
        frontImage: kyc.frontImage,
        backImage: kyc.backImage,
        selfieImage: kyc.selfieImage,
        status: kyc.status,
        submittedAt: kyc.submittedAt,
        reviewedAt: kyc.reviewedAt,
        rejectionReason: kyc.rejectionReason
      })),
      stats: {
        total: totalCount,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount
      }
    })
  } catch (error) {
    console.error('Error fetching KYC list:', error)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// PUT /api/kyc/approve/:kycId - Approve KYC (Admin)
router.put('/approve/:kycId', async (req, res) => {
  try {
    const { kycId } = req.params

    const kyc = await KYC.findById(kycId)
    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: 'KYC submission not found'
      })
    }

    if (kyc.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `KYC is already ${kyc.status}`
      })
    }

    kyc.status = 'approved'
    kyc.reviewedAt = new Date()
    await kyc.save()

    // Update user's kycApproved status
    const user = await User.findByIdAndUpdate(kyc.userId, { kycApproved: true }, { new: true })

    // Send KYC approved email
    try {
      if (user && user.email) {
        console.log('Sending KYC approved email to:', user.email)
        const settings = await EmailSettings.findOne()
        const emailResult = await sendTemplateEmail('kyc_approved', user.email, {
          firstName: user.firstName || user.email.split('@')[0],
          email: user.email,
          documentType: kyc.documentType,
          approvedAt: new Date().toLocaleString(),
          platformName: settings?.platformName || 'Pipxacpital',
          loginUrl: settings?.loginUrl || 'https://Pipxacpital.com/login',
          supportEmail: settings?.supportEmail || 'support@Pipxacpital.com',
          year: new Date().getFullYear().toString()
        })
        console.log('KYC approved email result:', emailResult)
      } else {
        console.log('User not found or no email for KYC approval notification')
      }
    } catch (emailError) {
      console.error('Error sending KYC approval email:', emailError)
    }

    res.json({
      success: true,
      message: 'KYC approved successfully',
      kyc
    })
  } catch (error) {
    console.error('Error approving KYC:', error)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// PUT /api/kyc/reject/:kycId - Reject KYC (Admin)
router.put('/reject/:kycId', async (req, res) => {
  try {
    const { kycId } = req.params
    const { reason } = req.body

    const kyc = await KYC.findById(kycId)
    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: 'KYC submission not found'
      })
    }

    if (kyc.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `KYC is already ${kyc.status}`
      })
    }

    kyc.status = 'rejected'
    kyc.rejectionReason = reason || 'Documents not acceptable'
    kyc.reviewedAt = new Date()
    await kyc.save()

    // Send KYC rejected email
    try {
      const user = await User.findById(kyc.userId)
      if (user && user.email) {
        const settings = await EmailSettings.findOne()
        await sendTemplateEmail('kyc_rejected', user.email, {
          firstName: user.firstName || user.email.split('@')[0],
          email: user.email,
          documentType: kyc.documentType,
          rejectionReason: kyc.rejectionReason,
          rejectedAt: new Date().toLocaleString(),
          platformName: settings?.platformName || 'Pipxacpital',
          loginUrl: settings?.loginUrl || 'https://Pipxacpital.com/login',
          supportEmail: settings?.supportEmail || 'support@Pipxacpital.com',
          year: new Date().getFullYear().toString()
        })
      }
    } catch (emailError) {
      console.error('Error sending KYC rejection email:', emailError)
    }

    res.json({
      success: true,
      message: 'KYC rejected',
      kyc
    })
  } catch (error) {
    console.error('Error rejecting KYC:', error)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// GET /api/kyc/view/:kycId - View KYC documents (Admin)
router.get('/view/:kycId', async (req, res) => {
  try {
    const { kycId } = req.params

    const kyc = await KYC.findById(kycId).populate('userId', 'firstName lastName email phone')

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: 'KYC submission not found'
      })
    }

    res.json({
      success: true,
      kyc: {
        _id: kyc._id,
        user: kyc.userId ? {
          name: `${kyc.userId.firstName || ''} ${kyc.userId.lastName || ''}`.trim(),
          email: kyc.userId.email,
          phone: kyc.userId.phone
        } : null,
        documentType: kyc.documentType,
        documentNumber: kyc.documentNumber,
        frontImage: kyc.frontImage,
        backImage: kyc.backImage,
        selfieImage: kyc.selfieImage,
        status: kyc.status,
        submittedAt: kyc.submittedAt,
        reviewedAt: kyc.reviewedAt,
        rejectionReason: kyc.rejectionReason
      }
    })
  } catch (error) {
    console.error('Error viewing KYC:', error)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

export default router
