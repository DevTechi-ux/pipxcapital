import express from 'express'
import IBUser from '../models/IBUser.js'
import IBPlan from '../models/IBPlan.js'
import IBCommission from '../models/IBCommission.js'
import IBReferral from '../models/IBReferral.js'
import IBSettings from '../models/IBSettings.js'
import User from '../models/User.js'
import ibEngine from '../services/ibEngine.js'

const router = express.Router()

// ==================== IB USER ROUTES ====================

// POST /api/ib/apply - Apply to become an IB
router.post('/apply', async (req, res) => {
  try {
    const { userId } = req.body

    // Check if IB system is enabled
    const settings = await IBSettings.getSettings()
    if (!settings.isEnabled || !settings.allowNewApplications) {
      return res.status(400).json({ message: 'IB applications are currently closed' })
    }

    // Check if user already has an IB application
    const existingIB = await IBUser.findOne({ userId })
    if (existingIB) {
      return res.status(400).json({ 
        message: 'You already have an IB application',
        status: existingIB.status
      })
    }

    // Get user
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Check requirements
    if (settings.ibRequirements.kycRequired && !user.kycApproved) {
      return res.status(400).json({ message: 'KYC approval required to become an IB' })
    }

    // Check if user was referred by an IB
    const referral = await IBReferral.findOne({ userId })
    let parentIBId = null
    let level = 1

    if (referral) {
      parentIBId = referral.referredByIBId
      // Calculate level based on parent
      const parentIB = await IBUser.findById(parentIBId)
      if (parentIB) {
        level = parentIB.level + 1
      }
    }

    // Create IB application
    const ibUser = await IBUser.create({
      userId,
      status: settings.autoApprove ? 'ACTIVE' : 'PENDING',
      parentIBId,
      level,
      referralCode: settings.autoApprove ? await IBUser.generateReferralCode() : null
    })

    // If auto-approved, update parent stats
    if (settings.autoApprove && parentIBId) {
      const parentIB = await IBUser.findById(parentIBId)
      if (parentIB) {
        parentIB.stats.directReferrals += 1
        parentIB.stats.totalDownline += 1
        const levelKey = `level${level}Count`
        if (parentIB.stats[levelKey] !== undefined) {
          parentIB.stats[levelKey] += 1
        }
        await parentIB.save()
      }
    }

    res.status(201).json({
      message: settings.autoApprove ? 'IB account activated' : 'IB application submitted',
      ibUser: {
        _id: ibUser._id,
        status: ibUser.status,
        referralCode: ibUser.referralCode
      }
    })

  } catch (error) {
    console.error('Error applying as IB:', error)
    res.status(500).json({ message: 'Error submitting application', error: error.message })
  }
})

// GET /api/ib/my-profile/:userId - Get user's IB profile
router.get('/my-profile/:userId', async (req, res) => {
  try {
    const ibUser = await IBUser.findOne({ userId: req.params.userId })
      .populate('ibPlanId')
      .populate('parentIBId', 'referralCode')

    if (!ibUser) {
      return res.status(404).json({ message: 'IB profile not found' })
    }

    res.json({ ibUser })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching IB profile', error: error.message })
  }
})

// GET /api/ib/referral-link/:userId - Get IB referral link
router.get('/referral-link/:userId', async (req, res) => {
  try {
    const ibUser = await IBUser.findOne({ userId: req.params.userId, status: 'ACTIVE' })

    if (!ibUser) {
      return res.status(404).json({ message: 'Active IB profile not found' })
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const referralLink = `${baseUrl}/signup?ref=${ibUser.referralCode}`

    res.json({ 
      referralCode: ibUser.referralCode,
      referralLink
    })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching referral link', error: error.message })
  }
})

// GET /api/ib/my-referrals/:userId - Get IB's direct referrals
router.get('/my-referrals/:userId', async (req, res) => {
  try {
    const ibUser = await IBUser.findOne({ userId: req.params.userId })
    if (!ibUser) {
      return res.status(404).json({ message: 'IB profile not found' })
    }

    const referrals = await IBReferral.find({ referredByIBId: ibUser._id })
      .populate('userId', 'firstName lastName email createdAt')
      .sort({ createdAt: -1 })

    res.json({ referrals })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching referrals', error: error.message })
  }
})

// GET /api/ib/my-downline/:userId - Get IB's full downline tree
router.get('/my-downline/:userId', async (req, res) => {
  try {
    const ibUser = await IBUser.findOne({ userId: req.params.userId })
    if (!ibUser) {
      return res.status(404).json({ message: 'IB profile not found' })
    }

    const downline = await ibEngine.getDownlineTree(ibUser._id)

    res.json({ downline })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching downline', error: error.message })
  }
})

// GET /api/ib/my-commissions/:userId - Get IB's commission history
router.get('/my-commissions/:userId', async (req, res) => {
  try {
    const { limit = 50, status } = req.query

    const ibUser = await IBUser.findOne({ userId: req.params.userId })
    if (!ibUser) {
      return res.status(404).json({ message: 'IB profile not found' })
    }

    const query = { ibUserId: ibUser._id }
    if (status) query.status = status

    const commissions = await IBCommission.find(query)
      .populate('traderId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))

    // Calculate totals
    const totals = await IBCommission.aggregate([
      { $match: { ibUserId: ibUser._id, status: 'CREDITED' } },
      {
        $group: {
          _id: null,
          totalCommission: { $sum: '$commissionAmount' },
          totalTrades: { $sum: 1 }
        }
      }
    ])

    res.json({ 
      commissions,
      totals: totals[0] || { totalCommission: 0, totalTrades: 0 }
    })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching commissions', error: error.message })
  }
})

// POST /api/ib/withdraw - Request withdrawal
router.post('/withdraw', async (req, res) => {
  try {
    const { userId, amount } = req.body

    const ibUser = await IBUser.findOne({ userId })
    if (!ibUser) {
      return res.status(404).json({ message: 'IB profile not found' })
    }

    const result = await ibEngine.processWithdrawal(ibUser._id, amount)

    res.json({
      message: result.status === 'PENDING_APPROVAL' 
        ? 'Withdrawal request submitted for approval' 
        : 'Withdrawal processed successfully',
      ...result
    })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

// ==================== REFERRAL REGISTRATION ====================

// POST /api/ib/register-referral - Register a new user with referral code
router.post('/register-referral', async (req, res) => {
  try {
    const { userId, referralCode } = req.body

    if (!referralCode) {
      return res.status(400).json({ message: 'Referral code required' })
    }

    // Find the IB with this referral code
    const ibUser = await IBUser.findOne({ referralCode, status: 'ACTIVE' })
    if (!ibUser) {
      return res.status(404).json({ message: 'Invalid or inactive referral code' })
    }

    // Check if user already has a referral
    const existingReferral = await IBReferral.findOne({ userId })
    if (existingReferral) {
      return res.status(400).json({ message: 'User already has a referral' })
    }

    // Create referral record
    const referral = await IBReferral.create({
      userId,
      referredByIBId: ibUser._id,
      referralCode,
      level: 1
    })

    // Update IB stats
    ibUser.stats.directReferrals += 1
    ibUser.stats.totalDownline += 1
    ibUser.stats.level1Count += 1
    await ibUser.save()

    res.status(201).json({
      message: 'Referral registered successfully',
      referral: {
        _id: referral._id,
        referredBy: ibUser.referralCode
      }
    })

  } catch (error) {
    console.error('Error registering referral:', error)
    res.status(500).json({ message: 'Error registering referral', error: error.message })
  }
})

// ==================== ADMIN ROUTES ====================

// GET /api/ib/admin/applications - Get pending IB applications
router.get('/admin/applications', async (req, res) => {
  try {
    const applications = await IBUser.find({ status: 'PENDING' })
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })

    res.json({ applications })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching applications', error: error.message })
  }
})

// PUT /api/ib/admin/approve/:id - Approve IB application
router.put('/admin/approve/:id', async (req, res) => {
  try {
    const { adminId, ibPlanId } = req.body

    const ibUser = await IBUser.findById(req.params.id)
    if (!ibUser) {
      return res.status(404).json({ message: 'IB application not found' })
    }

    if (ibUser.status !== 'PENDING') {
      return res.status(400).json({ message: 'Application already processed' })
    }

    // Generate referral code
    const referralCode = await IBUser.generateReferralCode()

    // Get plan
    let plan = null
    if (ibPlanId) {
      plan = await IBPlan.findById(ibPlanId)
    } else {
      plan = await IBPlan.getDefaultPlan()
    }

    ibUser.status = 'ACTIVE'
    ibUser.referralCode = referralCode
    ibUser.ibPlanId = plan?._id || null
    ibUser.approvedBy = adminId
    ibUser.approvedAt = new Date()
    await ibUser.save()

    // Update parent stats if applicable
    if (ibUser.parentIBId) {
      const parentIB = await IBUser.findById(ibUser.parentIBId)
      if (parentIB) {
        parentIB.stats.directReferrals += 1
        parentIB.stats.totalDownline += 1
        await parentIB.save()
      }
    }

    res.json({ 
      message: 'IB approved successfully', 
      ibUser,
      referralCode
    })
  } catch (error) {
    res.status(500).json({ message: 'Error approving IB', error: error.message })
  }
})

// PUT /api/ib/admin/reject/:id - Reject IB application
router.put('/admin/reject/:id', async (req, res) => {
  try {
    const { adminId, rejectionReason } = req.body

    const ibUser = await IBUser.findById(req.params.id)
    if (!ibUser) {
      return res.status(404).json({ message: 'IB application not found' })
    }

    ibUser.status = 'REJECTED'
    ibUser.rejectedBy = adminId
    ibUser.rejectedAt = new Date()
    ibUser.rejectionReason = rejectionReason
    await ibUser.save()

    res.json({ message: 'IB rejected', ibUser })
  } catch (error) {
    res.status(500).json({ message: 'Error rejecting IB', error: error.message })
  }
})

// PUT /api/ib/admin/suspend/:id - Suspend IB
router.put('/admin/suspend/:id', async (req, res) => {
  try {
    const { adminId, reason } = req.body

    const ibUser = await IBUser.findById(req.params.id)
    if (!ibUser) {
      return res.status(404).json({ message: 'IB not found' })
    }

    ibUser.status = 'SUSPENDED'
    await ibUser.save()

    res.json({ message: 'IB suspended', ibUser })
  } catch (error) {
    res.status(500).json({ message: 'Error suspending IB', error: error.message })
  }
})

// POST /api/ib/admin/transfer-referrals - Transfer users to a different IB
router.post('/admin/transfer-referrals', async (req, res) => {
  try {
    const { userIds, targetIBId } = req.body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No users selected' })
    }

    if (!targetIBId) {
      return res.status(400).json({ success: false, message: 'Target IB not specified' })
    }

    // Find the target IB user record
    const targetIBUser = await IBUser.findById(targetIBId).populate('userId', 'email')
    if (!targetIBUser) {
      return res.status(404).json({ success: false, message: 'Target IB not found' })
    }

    // Verify target is an active IB
    if (targetIBUser.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Target IB is not active' })
    }

    let transferredCount = 0

    // Update each user's referral record
    for (const userId of userIds) {
      try {
        // Update user's referredBy to point to new IB
        await User.findByIdAndUpdate(userId, { 
          referredBy: targetIBUser.userId,
          referralCode: targetIBUser.referralCode
        })

        // Update or create IBReferral record - use correct field name referredByIBId
        const existingReferral = await IBReferral.findOne({ userId })
        if (existingReferral) {
          existingReferral.referredByIBId = targetIBUser._id
          existingReferral.referralCode = targetIBUser.referralCode
          await existingReferral.save()
        } else {
          await IBReferral.create({
            referredByIBId: targetIBUser._id,
            userId,
            referralCode: targetIBUser.referralCode,
            level: 1
          })
        }

        transferredCount++
      } catch (err) {
        console.error(`Error transferring user ${userId}:`, err)
      }
    }

    console.log(`[Admin] Transferred ${transferredCount} users to IB ${targetIBUser.referralCode}`)

    res.json({ 
      success: true, 
      message: `Successfully transferred ${transferredCount} users`,
      transferredCount
    })
  } catch (error) {
    console.error('Error transferring referrals:', error)
    res.status(500).json({ success: false, message: 'Error transferring referrals', error: error.message })
  }
})

// GET /api/ib/admin/ibs - Get all IBs
router.get('/admin/ibs', async (req, res) => {
  try {
    const { status } = req.query
    const query = {}
    if (status) query.status = status

    const ibs = await IBUser.find(query)
      .populate('userId', 'firstName lastName email')
      .populate('ibPlanId', 'name')
      .sort({ createdAt: -1 })

    res.json({ ibs })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching IBs', error: error.message })
  }
})

// GET /api/ib/admin/ib/:id - Get IB details with downline
router.get('/admin/ib/:id', async (req, res) => {
  try {
    const ibUser = await IBUser.findById(req.params.id)
      .populate('userId', 'firstName lastName email')
      .populate('ibPlanId')
      .populate('parentIBId', 'referralCode')

    if (!ibUser) {
      return res.status(404).json({ message: 'IB not found' })
    }

    const downline = await ibEngine.getDownlineTree(ibUser._id)

    res.json({ ibUser, downline })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching IB details', error: error.message })
  }
})

// GET /api/ib/admin/commissions - Get all commissions
router.get('/admin/commissions', async (req, res) => {
  try {
    const { status, tradingDay, limit = 100 } = req.query

    const query = {}
    if (status) query.status = status
    if (tradingDay) query.tradingDay = tradingDay

    const commissions = await IBCommission.find(query)
      .populate('ibUserId', 'referralCode')
      .populate('traderId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))

    // Calculate totals
    const totals = await IBCommission.aggregate([
      { $match: { status: 'CREDITED' } },
      {
        $group: {
          _id: null,
          totalCommission: { $sum: '$commissionAmount' },
          totalTrades: { $sum: 1 }
        }
      }
    ])

    res.json({ 
      commissions,
      totals: totals[0] || { totalCommission: 0, totalTrades: 0 }
    })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching commissions', error: error.message })
  }
})

// POST /api/ib/admin/reverse-commission/:id - Reverse a commission
router.post('/admin/reverse-commission/:id', async (req, res) => {
  try {
    const { adminId, reason } = req.body

    const result = await ibEngine.reverseCommission(req.params.id, adminId, reason)

    res.json({ message: 'Commission reversed', ...result })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

// GET /api/ib/admin/pending-withdrawals - Get pending withdrawals
router.get('/admin/pending-withdrawals', async (req, res) => {
  try {
    const ibs = await IBUser.find({ pendingWithdrawal: { $gt: 0 } })
      .populate('userId', 'firstName lastName email')
      .sort({ updatedAt: -1 })

    res.json({ withdrawals: ibs })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pending withdrawals', error: error.message })
  }
})

// PUT /api/ib/admin/approve-withdrawal/:id - Approve withdrawal
router.put('/admin/approve-withdrawal/:id', async (req, res) => {
  try {
    const { adminId } = req.body

    const result = await ibEngine.approveWithdrawal(req.params.id, adminId)

    res.json({ message: 'Withdrawal approved', ...result })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

// PUT /api/ib/admin/reject-withdrawal/:id - Reject withdrawal
router.put('/admin/reject-withdrawal/:id', async (req, res) => {
  try {
    const { adminId, reason } = req.body

    const result = await ibEngine.rejectWithdrawal(req.params.id, adminId, reason)

    res.json({ message: 'Withdrawal rejected', ...result })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

// ==================== IB PLAN ROUTES ====================

// GET /api/ib/admin/plans - Get all IB plans
router.get('/admin/plans', async (req, res) => {
  try {
    const plans = await IBPlan.find().sort({ createdAt: -1 })
    res.json({ plans })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching plans', error: error.message })
  }
})

// POST /api/ib/admin/plans - Create IB plan
router.post('/admin/plans', async (req, res) => {
  try {
    const { name, description, maxLevels, commissionType, levelCommissions, commissionSources, minWithdrawalAmount, isDefault } = req.body

    const plan = await IBPlan.create({
      name,
      description,
      maxLevels: maxLevels || 3,
      commissionType: commissionType || 'PER_LOT',
      levelCommissions: levelCommissions || {},
      commissionSources: commissionSources || {},
      minWithdrawalAmount: minWithdrawalAmount || 50,
      isDefault: isDefault || false
    })

    // If this is default, unset other defaults
    if (isDefault) {
      await IBPlan.updateMany(
        { _id: { $ne: plan._id } },
        { $set: { isDefault: false } }
      )
    }

    res.status(201).json({ message: 'Plan created', plan })
  } catch (error) {
    res.status(500).json({ message: 'Error creating plan', error: error.message })
  }
})

// PUT /api/ib/admin/plans/:id - Update IB plan
router.put('/admin/plans/:id', async (req, res) => {
  try {
    const plan = await IBPlan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )

    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' })
    }

    res.json({ message: 'Plan updated', plan })
  } catch (error) {
    res.status(500).json({ message: 'Error updating plan', error: error.message })
  }
})

// DELETE /api/ib/admin/plans/:id - Delete IB plan
router.delete('/admin/plans/:id', async (req, res) => {
  try {
    // Check if plan is in use
    const inUse = await IBUser.findOne({ ibPlanId: req.params.id })
    if (inUse) {
      return res.status(400).json({ message: 'Plan is in use by IBs' })
    }

    await IBPlan.findByIdAndDelete(req.params.id)
    res.json({ message: 'Plan deleted' })
  } catch (error) {
    res.status(500).json({ message: 'Error deleting plan', error: error.message })
  }
})

// ==================== SETTINGS ROUTES ====================

// GET /api/ib/admin/settings - Get IB settings
router.get('/admin/settings', async (req, res) => {
  try {
    const settings = await IBSettings.getSettings()
    res.json({ settings })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching settings', error: error.message })
  }
})

// PUT /api/ib/admin/settings - Update IB settings
router.put('/admin/settings', async (req, res) => {
  try {
    const settings = await IBSettings.getSettings()
    
    const { ibRequirements, commissionSettings, isEnabled, allowNewApplications, autoApprove } = req.body

    if (ibRequirements) settings.ibRequirements = { ...settings.ibRequirements, ...ibRequirements }
    if (commissionSettings) settings.commissionSettings = { ...settings.commissionSettings, ...commissionSettings }
    if (isEnabled !== undefined) settings.isEnabled = isEnabled
    if (allowNewApplications !== undefined) settings.allowNewApplications = allowNewApplications
    if (autoApprove !== undefined) settings.autoApprove = autoApprove

    await settings.save()

    res.json({ message: 'Settings updated', settings })
  } catch (error) {
    res.status(500).json({ message: 'Error updating settings', error: error.message })
  }
})

// GET /api/ib/admin/dashboard - Get IB dashboard stats
router.get('/admin/dashboard', async (req, res) => {
  try {
    const [
      totalIBs,
      activeIBs,
      pendingApplications,
      totalReferrals
    ] = await Promise.all([
      IBUser.countDocuments(),
      IBUser.countDocuments({ status: 'ACTIVE' }),
      IBUser.countDocuments({ status: 'PENDING' }),
      IBReferral.countDocuments()
    ])

    // Today's stats
    const today = new Date().toISOString().split('T')[0]
    const todayCommissions = await IBCommission.aggregate([
      { $match: { tradingDay: today, status: 'CREDITED' } },
      {
        $group: {
          _id: null,
          totalCommission: { $sum: '$commissionAmount' },
          totalTrades: { $sum: 1 }
        }
      }
    ])

    // Total commissions
    const totalCommissions = await IBCommission.aggregate([
      { $match: { status: 'CREDITED' } },
      {
        $group: {
          _id: null,
          totalCommission: { $sum: '$commissionAmount' },
          totalTrades: { $sum: 1 }
        }
      }
    ])

    // Pending withdrawals
    const pendingWithdrawals = await IBUser.aggregate([
      { $match: { pendingWithdrawal: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          totalPending: { $sum: '$pendingWithdrawal' },
          count: { $sum: 1 }
        }
      }
    ])

    res.json({
      dashboard: {
        ibs: {
          total: totalIBs,
          active: activeIBs,
          pending: pendingApplications
        },
        referrals: {
          total: totalReferrals
        },
        commissions: {
          today: todayCommissions[0] || { totalCommission: 0, totalTrades: 0 },
          total: totalCommissions[0] || { totalCommission: 0, totalTrades: 0 }
        },
        withdrawals: {
          pending: pendingWithdrawals[0] || { totalPending: 0, count: 0 }
        }
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard', error: error.message })
  }
})

export default router
