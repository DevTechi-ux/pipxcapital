import mongoose from 'mongoose'

const adminSchema = new mongoose.Schema({
  // Basic Info
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    default: ''
  },
  
  // Admin Type
  role: {
    type: String,
    enum: ['SUPER_ADMIN', 'ADMIN'],
    default: 'ADMIN'
  },
  
  // Unique URL slug for this admin's users
  urlSlug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  
  // Company/Brand Info for this admin
  brandName: {
    type: String,
    default: ''
  },
  logo: {
    type: String,
    default: ''
  },
  
  // Parent admin (for sub-admins created by super admin)
  parentAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  
  // Permissions - what features this admin can access/manage
  permissions: {
    // User Management
    canManageUsers: { type: Boolean, default: true },
    canCreateUsers: { type: Boolean, default: true },
    canDeleteUsers: { type: Boolean, default: false },
    canViewUsers: { type: Boolean, default: true },
    
    // Trading Management
    canManageTrades: { type: Boolean, default: true },
    canCloseTrades: { type: Boolean, default: true },
    canModifyTrades: { type: Boolean, default: false },
    
    // Account Management
    canManageAccounts: { type: Boolean, default: true },
    canCreateAccounts: { type: Boolean, default: true },
    canDeleteAccounts: { type: Boolean, default: false },
    canModifyLeverage: { type: Boolean, default: true },
    
    // Wallet/Finance
    canManageDeposits: { type: Boolean, default: true },
    canApproveDeposits: { type: Boolean, default: true },
    canManageWithdrawals: { type: Boolean, default: true },
    canApproveWithdrawals: { type: Boolean, default: true },
    
    // KYC
    canManageKYC: { type: Boolean, default: true },
    canApproveKYC: { type: Boolean, default: true },
    
    // IB Management
    canManageIB: { type: Boolean, default: true },
    canApproveIB: { type: Boolean, default: true },
    
    // Copy Trading
    canManageCopyTrading: { type: Boolean, default: true },
    canApproveMasters: { type: Boolean, default: true },
    
    // Settings
    canManageSymbols: { type: Boolean, default: false },
    canManageGroups: { type: Boolean, default: false },
    canManageSettings: { type: Boolean, default: false },
    canManageTheme: { type: Boolean, default: true },
    
    // Reports
    canViewReports: { type: Boolean, default: true },
    canExportReports: { type: Boolean, default: true },
    
    // Admin Management (only for super admin)
    canManageAdmins: { type: Boolean, default: false },
    canFundAdmins: { type: Boolean, default: false }
  },
  
  // Status
  status: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED', 'PENDING'],
    default: 'ACTIVE'
  },
  
  // Stats
  stats: {
    totalUsers: { type: Number, default: 0 },
    totalDeposits: { type: Number, default: 0 },
    totalWithdrawals: { type: Number, default: 0 },
    totalTrades: { type: Number, default: 0 }
  },
  
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
})

export default mongoose.model('Admin', adminSchema)
