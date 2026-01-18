import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import Admin from '../models/Admin.js'
import AdminWallet from '../models/AdminWallet.js'
import AdminWalletTransaction from '../models/AdminWalletTransaction.js'
import User from '../models/User.js'

const router = express.Router()

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// ==================== ADMIN AUTH ====================

// POST /api/admin-mgmt/login - Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    const admin = await Admin.findOne({ email: email.toLowerCase() })
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    if (admin.status !== 'ACTIVE') {
      return res.status(403).json({ message: 'Account is suspended or pending' })
    }

    const isMatch = await bcrypt.compare(password, admin.password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // Update last login
    admin.lastLogin = new Date()
    await admin.save()

    // Get wallet info
    const wallet = await AdminWallet.findOne({ adminId: admin._id })

    const token = jwt.sign(
      { adminId: admin._id, role: admin.role, email: admin.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    res.json({
      success: true,
      token,
      admin: {
        _id: admin._id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
        urlSlug: admin.urlSlug,
        brandName: admin.brandName,
        permissions: admin.permissions,
        walletBalance: wallet?.balance || 0
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message })
  }
})

// ==================== SUPER ADMIN - ADMIN MANAGEMENT ====================

// GET /api/admin-mgmt/admins - Get all admins (super admin only)
router.get('/admins', async (req, res) => {
  try {
    const admins = await Admin.find({ role: 'ADMIN' })
      .select('-password')
      .sort({ createdAt: -1 })

    // Get wallet balances for each admin
    const adminsWithWallets = await Promise.all(admins.map(async (admin) => {
      const wallet = await AdminWallet.findOne({ adminId: admin._id })
      const userCount = await User.countDocuments({ assignedAdmin: admin._id })
      return {
        ...admin.toObject(),
        walletBalance: wallet?.balance || 0,
        totalReceived: wallet?.totalReceived || 0,
        totalGivenToUsers: wallet?.totalGivenToUsers || 0,
        userCount
      }
    }))

    res.json({ success: true, admins: adminsWithWallets })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching admins', error: error.message })
  }
})

// GET /api/admin-mgmt/admins/:id - Get single admin details
router.get('/admins/:id', async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id).select('-password')
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' })
    }

    const wallet = await AdminWallet.findOne({ adminId: admin._id })
    const userCount = await User.countDocuments({ assignedAdmin: admin._id })

    res.json({
      success: true,
      admin: {
        ...admin.toObject(),
        walletBalance: wallet?.balance || 0,
        totalReceived: wallet?.totalReceived || 0,
        totalGivenToUsers: wallet?.totalGivenToUsers || 0,
        userCount
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching admin', error: error.message })
  }
})

// POST /api/admin-mgmt/admins - Create new admin (super admin only)
router.post('/admins', async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      urlSlug,
      brandName,
      permissions
    } = req.body

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !urlSlug) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    // Check if email already exists
    const existingEmail = await Admin.findOne({ email: email.toLowerCase() })
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already exists' })
    }

    // Check if URL slug already exists
    const existingSlug = await Admin.findOne({ urlSlug: urlSlug.toLowerCase() })
    if (existingSlug) {
      return res.status(400).json({ message: 'URL slug already exists' })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create admin
    const admin = new Admin({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      phone: phone || '',
      urlSlug: urlSlug.toLowerCase(),
      brandName: brandName || firstName + "'s Trading",
      role: 'ADMIN',
      permissions: permissions || {}
    })

    await admin.save()

    // Create wallet for admin
    const wallet = new AdminWallet({
      adminId: admin._id,
      balance: 0
    })
    await wallet.save()

    res.json({
      success: true,
      message: 'Admin created successfully',
      admin: {
        _id: admin._id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        urlSlug: admin.urlSlug,
        brandName: admin.brandName,
        permissions: admin.permissions
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Error creating admin', error: error.message })
  }
})

// PUT /api/admin-mgmt/admins/:id - Update admin
router.put('/admins/:id', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      brandName,
      permissions,
      status
    } = req.body

    const admin = await Admin.findById(req.params.id)
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' })
    }

    // Update fields
    if (firstName) admin.firstName = firstName
    if (lastName) admin.lastName = lastName
    if (phone !== undefined) admin.phone = phone
    if (brandName) admin.brandName = brandName
    if (permissions) admin.permissions = { ...admin.permissions, ...permissions }
    if (status) admin.status = status

    await admin.save()

    res.json({
      success: true,
      message: 'Admin updated successfully',
      admin: {
        _id: admin._id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        urlSlug: admin.urlSlug,
        brandName: admin.brandName,
        permissions: admin.permissions,
        status: admin.status
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Error updating admin', error: error.message })
  }
})

// PUT /api/admin-mgmt/admins/:id/permissions - Update admin permissions
router.put('/admins/:id/permissions', async (req, res) => {
  try {
    const { permissions } = req.body

    const admin = await Admin.findById(req.params.id)
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' })
    }

    admin.permissions = { ...admin.permissions, ...permissions }
    await admin.save()

    res.json({
      success: true,
      message: 'Permissions updated successfully',
      permissions: admin.permissions
    })
  } catch (error) {
    res.status(500).json({ message: 'Error updating permissions', error: error.message })
  }
})

// PUT /api/admin-mgmt/admins/:id/reset-password - Reset admin password
router.put('/admins/:id/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    const admin = await Admin.findById(req.params.id)
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    admin.password = hashedPassword
    await admin.save()

    res.json({
      success: true,
      message: 'Password reset successfully'
    })
  } catch (error) {
    res.status(500).json({ message: 'Error resetting password', error: error.message })
  }
})

// PUT /api/admin-mgmt/admins/:id/status - Suspend/Activate admin
router.put('/admins/:id/status', async (req, res) => {
  try {
    const { status } = req.body

    const admin = await Admin.findById(req.params.id)
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' })
    }

    admin.status = status
    await admin.save()

    // Also update wallet status if suspending
    if (status === 'SUSPENDED') {
      await AdminWallet.findOneAndUpdate(
        { adminId: admin._id },
        { status: 'FROZEN' }
      )
    } else if (status === 'ACTIVE') {
      await AdminWallet.findOneAndUpdate(
        { adminId: admin._id },
        { status: 'ACTIVE' }
      )
    }

    res.json({
      success: true,
      message: `Admin ${status === 'ACTIVE' ? 'activated' : 'suspended'} successfully`
    })
  } catch (error) {
    res.status(500).json({ message: 'Error updating status', error: error.message })
  }
})

// DELETE /api/admin-mgmt/admins/:id - Delete admin
router.delete('/admins/:id', async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id)
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' })
    }

    // Check if admin has users
    const userCount = await User.countDocuments({ assignedAdmin: admin._id })
    if (userCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete admin with ${userCount} assigned users. Reassign users first.` 
      })
    }

    // Delete wallet
    await AdminWallet.findOneAndDelete({ adminId: admin._id })
    
    // Delete wallet transactions
    await AdminWalletTransaction.deleteMany({ 
      $or: [{ fromAdminId: admin._id }, { toAdminId: admin._id }] 
    })

    // Delete admin
    await Admin.findByIdAndDelete(req.params.id)

    res.json({ success: true, message: 'Admin deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Error deleting admin', error: error.message })
  }
})

// ==================== ADMIN WALLET MANAGEMENT ====================

// GET /api/admin-mgmt/wallet/:adminId - Get admin wallet
router.get('/wallet/:adminId', async (req, res) => {
  try {
    const wallet = await AdminWallet.findOne({ adminId: req.params.adminId })
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' })
    }

    res.json({ success: true, wallet })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching wallet', error: error.message })
  }
})

// POST /api/admin-mgmt/wallet/fund - Fund admin wallet (super admin only)
router.post('/wallet/fund', async (req, res) => {
  try {
    const { adminId, amount, description } = req.body

    if (!adminId || !amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid admin ID or amount' })
    }

    const admin = await Admin.findById(adminId)
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' })
    }

    let wallet = await AdminWallet.findOne({ adminId })
    if (!wallet) {
      wallet = new AdminWallet({ adminId, balance: 0 })
    }

    // Update wallet balance
    wallet.balance += amount
    wallet.totalReceived += amount
    await wallet.save()

    // Create transaction record
    const transaction = new AdminWalletTransaction({
      toAdminId: adminId,
      type: 'SUPER_TO_ADMIN',
      amount,
      balanceAfter: wallet.balance,
      description: description || `Funds added by Super Admin`
    })
    await transaction.save()

    res.json({
      success: true,
      message: `$${amount} added to ${admin.firstName}'s wallet`,
      wallet: {
        balance: wallet.balance,
        totalReceived: wallet.totalReceived
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Error funding wallet', error: error.message })
  }
})

// POST /api/admin-mgmt/wallet/deduct - Deduct from admin wallet (super admin only)
router.post('/wallet/deduct', async (req, res) => {
  try {
    const { adminId, amount, description } = req.body

    if (!adminId || !amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid admin ID or amount' })
    }

    const wallet = await AdminWallet.findOne({ adminId })
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' })
    }

    if (wallet.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' })
    }

    wallet.balance -= amount
    await wallet.save()

    // Create transaction record
    const transaction = new AdminWalletTransaction({
      fromAdminId: adminId,
      type: 'ADJUSTMENT',
      amount: -amount,
      balanceAfter: wallet.balance,
      description: description || `Funds deducted by Super Admin`
    })
    await transaction.save()

    res.json({
      success: true,
      message: `$${amount} deducted from wallet`,
      wallet: {
        balance: wallet.balance
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Error deducting from wallet', error: error.message })
  }
})

// GET /api/admin-mgmt/wallet/:adminId/transactions - Get wallet transactions
router.get('/wallet/:adminId/transactions', async (req, res) => {
  try {
    const { limit = 50, type } = req.query

    const query = {
      $or: [
        { fromAdminId: req.params.adminId },
        { toAdminId: req.params.adminId }
      ]
    }

    if (type) query.type = type

    const transactions = await AdminWalletTransaction.find(query)
      .populate('fromAdminId', 'firstName lastName email')
      .populate('toAdminId', 'firstName lastName email')
      .populate('toUserId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))

    res.json({ success: true, transactions })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transactions', error: error.message })
  }
})

// ==================== PUBLIC ROUTES ====================

// GET /api/admin-mgmt/brand/:slug - Get brand info by URL slug (public - for branded login)
router.get('/brand/:slug', async (req, res) => {
  try {
    const admin = await Admin.findOne({ 
      urlSlug: req.params.slug.toLowerCase(),
      status: 'ACTIVE'
    }).select('brandName logo urlSlug _id')

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Brand not found or inactive' })
    }

    res.json({
      success: true,
      brand: {
        brandName: admin.brandName,
        logo: admin.logo,
        urlSlug: admin.urlSlug,
        adminId: admin._id
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching brand', error: error.message })
  }
})

// GET /api/admin-mgmt/by-slug/:slug - Get admin info by URL slug (public)
router.get('/by-slug/:slug', async (req, res) => {
  try {
    const admin = await Admin.findOne({ 
      urlSlug: req.params.slug.toLowerCase(),
      status: 'ACTIVE'
    }).select('brandName logo urlSlug')

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' })
    }

    res.json({
      success: true,
      admin: {
        brandName: admin.brandName,
        logo: admin.logo,
        urlSlug: admin.urlSlug
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching admin', error: error.message })
  }
})

// GET /api/admin-mgmt/check-slug/:slug - Check if URL slug is available
router.get('/check-slug/:slug', async (req, res) => {
  try {
    const existing = await Admin.findOne({ urlSlug: req.params.slug.toLowerCase() })
    res.json({ available: !existing })
  } catch (error) {
    res.status(500).json({ message: 'Error checking slug', error: error.message })
  }
})

// ==================== INITIALIZE SUPER ADMIN ====================

// POST /api/admin-mgmt/init-super-admin - Create initial super admin
router.post('/init-super-admin', async (req, res) => {
  try {
    // Check if super admin already exists
    const existingSuperAdmin = await Admin.findOne({ role: 'SUPER_ADMIN' })
    if (existingSuperAdmin) {
      return res.status(400).json({ message: 'Super admin already exists' })
    }

    const { email, password, firstName, lastName } = req.body

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const superAdmin = new Admin({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      role: 'SUPER_ADMIN',
      urlSlug: 'super-admin',
      brandName: 'Super Admin',
      permissions: {
        canManageUsers: true,
        canCreateUsers: true,
        canDeleteUsers: true,
        canViewUsers: true,
        canManageTrades: true,
        canCloseTrades: true,
        canModifyTrades: true,
        canManageAccounts: true,
        canCreateAccounts: true,
        canDeleteAccounts: true,
        canModifyLeverage: true,
        canManageDeposits: true,
        canApproveDeposits: true,
        canManageWithdrawals: true,
        canApproveWithdrawals: true,
        canManageKYC: true,
        canApproveKYC: true,
        canManageIB: true,
        canApproveIB: true,
        canManageCopyTrading: true,
        canApproveMasters: true,
        canManageSymbols: true,
        canManageGroups: true,
        canManageSettings: true,
        canManageTheme: true,
        canViewReports: true,
        canExportReports: true,
        canManageAdmins: true,
        canFundAdmins: true
      }
    })

    await superAdmin.save()

    // Create wallet for super admin (unlimited funds conceptually)
    const wallet = new AdminWallet({
      adminId: superAdmin._id,
      balance: 999999999 // Unlimited for super admin
    })
    await wallet.save()

    res.json({
      success: true,
      message: 'Super admin created successfully',
      admin: {
        _id: superAdmin._id,
        email: superAdmin.email,
        firstName: superAdmin.firstName,
        lastName: superAdmin.lastName,
        role: superAdmin.role
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Error creating super admin', error: error.message })
  }
})

export default router
