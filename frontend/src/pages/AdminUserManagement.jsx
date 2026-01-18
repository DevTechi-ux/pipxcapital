import { useState, useEffect } from 'react'
import AdminLayout from '../components/AdminLayout'
import { API_URL } from '../config/api'
import { 
  Search,
  Mail,
  Phone,
  Calendar,
  MoreHorizontal,
  Trash2,
  Eye,
  RefreshCw,
  Lock,
  Ban,
  DollarSign,
  X,
  Check,
  AlertTriangle,
  User,
  Wallet,
  Shield,
  Edit,
  Gift,
  LogIn,
  CreditCard,
  Plus,
  Minus,
  Key
} from 'lucide-react'

const AdminUserManagement = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [activeTab, setActiveTab] = useState('users')
  const [passwordResetRequests, setPasswordResetRequests] = useState([])
  const [resetRequestStats, setResetRequestStats] = useState({ pending: 0, completed: 0, rejected: 0 })
  const [selectedResetRequest, setSelectedResetRequest] = useState(null)
  const [resetPassword, setResetPassword] = useState('')

  // Form states
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [deductAmount, setDeductAmount] = useState('')
  const [deductReason, setDeductReason] = useState('')
  const [addFundAmount, setAddFundAmount] = useState('')
  const [addFundReason, setAddFundReason] = useState('')
  const [blockReason, setBlockReason] = useState('')
  const [creditAmount, setCreditAmount] = useState('')
  const [creditReason, setCreditReason] = useState('')
  const [userAccounts, setUserAccounts] = useState([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [accountFundAmount, setAccountFundAmount] = useState('')
  const [accountFundReason, setAccountFundReason] = useState('')
  const [userWalletBalance, setUserWalletBalance] = useState(0)
  
  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}')

  useEffect(() => {
    fetchUsers()
    fetchPasswordResetRequests()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/admin/users`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
    setLoading(false)
  }

  const fetchPasswordResetRequests = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/password-reset-requests`)
      if (response.ok) {
        const data = await response.json()
        setPasswordResetRequests(data.requests || [])
        setResetRequestStats(data.stats || { pending: 0, completed: 0, rejected: 0 })
      }
    } catch (error) {
      console.error('Error fetching password reset requests:', error)
    }
  }

  const handleProcessResetRequest = async (requestId, action) => {
    if (action === 'approve' && (!resetPassword || resetPassword.length < 6)) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch(`${API_URL}/admin/password-reset-requests/${requestId}/process`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          newPassword: resetPassword,
          adminRemarks: action === 'approve' ? 'Password reset completed' : 'Request rejected'
        })
      })
      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: data.message })
        setSelectedResetRequest(null)
        setResetPassword('')
        fetchPasswordResetRequests()
      } else {
        setMessage({ type: 'error', text: data.message })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error processing request' })
    }
    setActionLoading(false)
  }

  const filteredUsers = users.filter(user => 
    user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone?.includes(searchTerm)
  )

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const fetchUserAccounts = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/trading-accounts/user/${userId}`)
      if (response.ok) {
        const data = await response.json()
        setUserAccounts(data.accounts || [])
        if (data.accounts?.length > 0) {
          setSelectedAccountId(data.accounts[0]._id)
        }
      }
    } catch (error) {
      console.error('Error fetching user accounts:', error)
    }
  }

  const fetchUserWallet = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/wallet/${userId}`)
      if (response.ok) {
        const data = await response.json()
        setUserWalletBalance(data.wallet?.balance || 0)
      }
    } catch (error) {
      console.error('Error fetching user wallet:', error)
    }
  }

  const openModal = async (type, user) => {
    setSelectedUser(user)
    setModalType(type)
    setShowModal(true)
    setMessage({ type: '', text: '' })
    // Reset form states
    setNewPassword('')
    setConfirmPassword('')
    setDeductAmount('')
    setDeductReason('')
    setAddFundAmount('')
    setAddFundReason('')
    setBlockReason('')
    setCreditAmount('')
    setCreditReason('')
    setUserAccounts([])
    setSelectedAccountId('')
    
    // Fetch user's trading accounts and wallet for view
    if (type === 'credit' || type === 'view') {
      await fetchUserAccounts(user._id)
      await fetchUserWallet(user._id)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedUser(null)
    setModalType(null)
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch(`${API_URL}/admin/users/${selectedUser._id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      })
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Password changed successfully' })
        setTimeout(closeModal, 1500)
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.message || 'Failed to change password' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error changing password' })
    }
    setActionLoading(false)
  }

  const handleDeductFund = async () => {
    if (!deductAmount || parseFloat(deductAmount) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' })
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch(`${API_URL}/admin/users/${selectedUser._id}/deduct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: parseFloat(deductAmount),
          reason: deductReason || 'Admin deduction'
        })
      })
      
      if (response.ok) {
        setMessage({ type: 'success', text: `$${deductAmount} deducted successfully` })
        await fetchUserWallet(selectedUser._id)
        setTimeout(() => {
          setModalType('view')
          fetchUsers()
        }, 1500)
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.message || 'Failed to deduct funds' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error deducting funds' })
    }
    setActionLoading(false)
  }

  const handleAddFund = async () => {
    if (!addFundAmount || parseFloat(addFundAmount) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' })
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch(`${API_URL}/admin/users/${selectedUser._id}/add-fund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: parseFloat(addFundAmount),
          reason: addFundReason || 'Admin fund addition'
        })
      })
      
      if (response.ok) {
        setMessage({ type: 'success', text: `$${addFundAmount} added successfully` })
        await fetchUserWallet(selectedUser._id)
        setTimeout(() => {
          setModalType('view')
          fetchUsers()
        }, 1500)
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.message || 'Failed to add funds' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error adding funds' })
    }
    setActionLoading(false)
  }

  const handleBlockUser = async () => {
    setActionLoading(true)
    try {
      const response = await fetch(`${API_URL}/admin/users/${selectedUser._id}/block`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          blocked: !selectedUser.isBlocked,
          reason: blockReason || 'Blocked by admin'
        })
      })
      
      if (response.ok) {
        setMessage({ type: 'success', text: selectedUser.isBlocked ? 'User unblocked' : 'User blocked' })
        setTimeout(() => {
          closeModal()
          fetchUsers()
        }, 1500)
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.message || 'Failed to update user status' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error updating user status' })
    }
    setActionLoading(false)
  }

  const handleBanUser = async () => {
    setActionLoading(true)
    try {
      const response = await fetch(`${API_URL}/admin/users/${selectedUser._id}/ban`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          banned: !selectedUser.isBanned,
          reason: blockReason || 'Banned by admin'
        })
      })
      
      if (response.ok) {
        setMessage({ type: 'success', text: selectedUser.isBanned ? 'User unbanned' : 'User banned permanently' })
        setTimeout(() => {
          closeModal()
          fetchUsers()
        }, 1500)
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.message || 'Failed to update user status' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error updating user status' })
    }
    setActionLoading(false)
  }

  const handleDeleteUser = async () => {
    setActionLoading(true)
    try {
      const response = await fetch(`${API_URL}/admin/users/${selectedUser._id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'User deleted successfully' })
        setTimeout(() => {
          closeModal()
          fetchUsers()
        }, 1500)
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.message || 'Failed to delete user' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error deleting user' })
    }
    setActionLoading(false)
  }

  const handleAddCredit = async () => {
    if (!creditAmount || parseFloat(creditAmount) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' })
      return
    }
    if (!selectedAccountId) {
      setMessage({ type: 'error', text: 'Please select a trading account' })
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch(`${API_URL}/admin/trading-account/${selectedAccountId}/add-credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: parseFloat(creditAmount),
          reason: creditReason || 'Admin credit/bonus',
          adminId: adminUser._id
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setMessage({ type: 'success', text: `$${creditAmount} credit added successfully` })
        await fetchUserAccounts(selectedUser._id)
        setTimeout(() => {
          setModalType('view')
          fetchUsers()
        }, 1500)
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.message || 'Failed to add credit' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error adding credit' })
    }
    setActionLoading(false)
  }

  // Add fund to trading account
  const handleAddFundToAccount = async () => {
    if (!accountFundAmount || parseFloat(accountFundAmount) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' })
      return
    }
    if (!selectedAccountId) {
      setMessage({ type: 'error', text: 'No account selected' })
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch(`${API_URL}/admin/trading-account/${selectedAccountId}/add-fund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: parseFloat(accountFundAmount),
          reason: accountFundReason || 'Admin fund addition'
        })
      })
      
      if (response.ok) {
        setMessage({ type: 'success', text: `$${accountFundAmount} added to account successfully` })
        await fetchUserAccounts(selectedUser._id)
        setTimeout(() => {
          setModalType('view')
          fetchUsers()
        }, 1500)
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.message || 'Failed to add funds' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error adding funds to account' })
    }
    setActionLoading(false)
  }

  // Deduct fund from trading account
  const handleDeductFromAccount = async () => {
    if (!accountFundAmount || parseFloat(accountFundAmount) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' })
      return
    }
    if (!selectedAccountId) {
      setMessage({ type: 'error', text: 'No account selected' })
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch(`${API_URL}/admin/trading-account/${selectedAccountId}/deduct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: parseFloat(accountFundAmount),
          reason: accountFundReason || 'Admin deduction'
        })
      })
      
      if (response.ok) {
        setMessage({ type: 'success', text: `$${accountFundAmount} deducted from account successfully` })
        await fetchUserAccounts(selectedUser._id)
        setTimeout(() => {
          setModalType('view')
          fetchUsers()
        }, 1500)
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.message || 'Failed to deduct funds' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error deducting funds from account' })
    }
    setActionLoading(false)
  }

  const handleLoginAsUser = async () => {
    setActionLoading(true)
    try {
      const response = await fetch(`${API_URL}/admin/login-as-user/${selectedUser._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: adminUser._id })
      })
      
      if (response.ok) {
        const data = await response.json()
        // Store user data and token, then redirect
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        // Open in new tab
        window.open('/dashboard', '_blank')
        setMessage({ type: 'success', text: 'Logged in as user - opening in new tab' })
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.message || 'Failed to login as user' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error logging in as user' })
    }
    setActionLoading(false)
  }

  const renderModal = () => {
    if (!showModal || !selectedUser) return null

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-dark-800 rounded-2xl w-full max-w-md border border-gray-700 overflow-hidden">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent-green/20 rounded-full flex items-center justify-center">
                <span className="text-accent-green font-medium">
                  {selectedUser.firstName?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <h3 className="text-white font-semibold">{selectedUser.firstName}</h3>
                <p className="text-gray-500 text-sm">{selectedUser.email}</p>
              </div>
            </div>
            <button 
              onClick={closeModal}
              className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
            >
              <X size={18} className="text-gray-400" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-4">
            {/* Message */}
            {message.text && (
              <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                message.type === 'success' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
              }`}>
                {message.type === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
                <span className="text-sm">{message.text}</span>
              </div>
            )}

            {/* View User Details */}
            {modalType === 'view' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-dark-700 p-3 rounded-lg">
                    <p className="text-gray-500 text-xs mb-1">Full Name</p>
                    <p className="text-white">{selectedUser.firstName}</p>
                  </div>
                  <div className="bg-dark-700 p-3 rounded-lg">
                    <p className="text-gray-500 text-xs mb-1">Phone</p>
                    <p className="text-white">{selectedUser.phone || 'N/A'}</p>
                  </div>
                  <div className="bg-dark-700 p-3 rounded-lg">
                    <p className="text-gray-500 text-xs mb-1">Joined</p>
                    <p className="text-white">{formatDate(selectedUser.createdAt)}</p>
                  </div>
                  <div className="bg-dark-700 p-3 rounded-lg">
                    <p className="text-gray-500 text-xs mb-1">Status</p>
                    <p className={`${selectedUser.isBanned ? 'text-red-500' : selectedUser.isBlocked ? 'text-yellow-500' : 'text-green-500'}`}>
                      {selectedUser.isBanned ? 'Banned' : selectedUser.isBlocked ? 'Blocked' : 'Active'}
                    </p>
                  </div>
                </div>
                <div className="bg-dark-700 p-3 rounded-lg">
                  <p className="text-gray-500 text-xs mb-1">Email</p>
                  <p className="text-white">{selectedUser.email}</p>
                </div>
                {/* Wallet Balance with Actions */}
                <div className="bg-gradient-to-r from-green-500/10 to-teal-500/10 border border-green-500/30 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-gray-400 text-xs mb-1">💰 Main Wallet Balance</p>
                      <p className="text-white text-2xl font-bold">${userWalletBalance?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setModalType('addFundWallet')}
                        className="p-2 bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500/30 transition-colors"
                        title="Add to Wallet"
                      >
                        <Plus size={16} />
                      </button>
                      <button 
                        onClick={() => setModalType('deductWallet')}
                        className="p-2 bg-orange-500/20 text-orange-500 rounded-lg hover:bg-orange-500/30 transition-colors"
                        title="Deduct from Wallet"
                      >
                        <Minus size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button 
                    onClick={() => setModalType('password')}
                    className="flex items-center justify-center gap-2 p-3 bg-blue-500/20 text-blue-500 rounded-lg hover:bg-blue-500/30 transition-colors"
                  >
                    <Lock size={16} />
                    <span className="text-sm">Change Password</span>
                  </button>
                  <button 
                    onClick={() => setModalType('addFund')}
                    className="flex items-center justify-center gap-2 p-3 bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500/30 transition-colors"
                  >
                    <Wallet size={16} />
                    <span className="text-sm">Add Fund</span>
                  </button>
                  <button 
                    onClick={() => setModalType('deduct')}
                    className="flex items-center justify-center gap-2 p-3 bg-orange-500/20 text-orange-500 rounded-lg hover:bg-orange-500/30 transition-colors"
                  >
                    <DollarSign size={16} />
                    <span className="text-sm">Deduct Fund</span>
                  </button>
                  <button 
                    onClick={() => setModalType('block')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg transition-colors ${
                      selectedUser.isBlocked 
                        ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30' 
                        : 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30'
                    }`}
                  >
                    <Ban size={16} />
                    <span className="text-sm">{selectedUser.isBlocked ? 'Unblock' : 'Block'}</span>
                  </button>
                  <button 
                    onClick={() => setModalType('ban')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg transition-colors ${
                      selectedUser.isBanned 
                        ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30' 
                        : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                    }`}
                  >
                    <Shield size={16} />
                    <span className="text-sm">{selectedUser.isBanned ? 'Unban' : 'Ban'}</span>
                  </button>
                  <button 
                    onClick={() => setModalType('tradingAccounts')}
                    className="flex items-center justify-center gap-2 p-3 bg-teal-500/20 text-teal-500 rounded-lg hover:bg-teal-500/30 transition-colors"
                  >
                    <CreditCard size={16} />
                    <span className="text-sm">Trading Accounts</span>
                  </button>
                  <button 
                    onClick={handleLoginAsUser}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-2 p-3 bg-cyan-500/20 text-cyan-500 rounded-lg hover:bg-cyan-500/30 transition-colors"
                  >
                    <LogIn size={16} />
                    <span className="text-sm">{actionLoading ? 'Opening...' : 'Login as User'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Trading Accounts Modal */}
            {modalType === 'tradingAccounts' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-teal-500 mb-2">
                  <CreditCard size={20} />
                  <h4 className="font-semibold">Trading Accounts</h4>
                </div>
                {userAccounts.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm bg-dark-700 rounded-lg">
                    No trading accounts found
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                    {userAccounts.map(acc => (
                      <div key={acc._id} className="bg-dark-700 rounded-lg p-4 border border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-white font-medium">{acc.accountId}</p>
                            <p className="text-gray-500 text-xs">{acc.accountTypeId?.name || 'Standard'} • Leverage: {acc.leverage}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-white text-lg font-bold">${acc.balance?.toFixed(2) || '0.00'}</p>
                            {acc.credit > 0 && (
                              <p className="text-purple-400 text-xs">Credit: ${acc.credit?.toFixed(2)}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => { setSelectedAccountId(acc._id); setModalType('addFundAccount'); }}
                            className="flex-1 py-2 text-xs bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500/30 transition-colors flex items-center justify-center gap-1"
                          >
                            <Plus size={14} /> Add Fund
                          </button>
                          <button 
                            onClick={() => { setSelectedAccountId(acc._id); setModalType('deductAccount'); }}
                            className="flex-1 py-2 text-xs bg-orange-500/20 text-orange-500 rounded-lg hover:bg-orange-500/30 transition-colors flex items-center justify-center gap-1"
                          >
                            <Minus size={14} /> Deduct
                          </button>
                          <button 
                            onClick={() => { setSelectedAccountId(acc._id); setModalType('credit'); }}
                            className="flex-1 py-2 text-xs bg-purple-500/20 text-purple-500 rounded-lg hover:bg-purple-500/30 transition-colors flex items-center justify-center gap-1"
                          >
                            <Gift size={14} /> Credit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => setModalType('view')}
                    className="flex-1 py-3 bg-dark-700 text-gray-400 rounded-lg hover:bg-dark-600 transition-colors"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}

            {/* Change Password */}
            {modalType === 'password' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-blue-500 mb-2">
                  <Lock size={20} />
                  <h4 className="font-semibold">Change Password</h4>
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => setModalType('view')}
                    className="flex-1 py-3 bg-dark-700 text-gray-400 rounded-lg hover:bg-dark-600 transition-colors"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleChangePassword}
                    disabled={actionLoading}
                    className="flex-1 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </div>
            )}

            {/* Deduct Fund */}
            {modalType === 'deduct' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-orange-500 mb-2">
                  <DollarSign size={20} />
                  <h4 className="font-semibold">Deduct Funds</h4>
                </div>
                <div className="bg-dark-700 p-3 rounded-lg">
                  <p className="text-gray-500 text-xs mb-1">Current Wallet Balance</p>
                  <p className="text-white text-xl font-bold">${userWalletBalance?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</p>
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Amount to Deduct ($)</label>
                  <input
                    type="number"
                    value={deductAmount}
                    onChange={(e) => setDeductAmount(e.target.value)}
                    placeholder="Enter amount"
                    min="0"
                    step="0.01"
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Reason (Optional)</label>
                  <input
                    type="text"
                    value={deductReason}
                    onChange={(e) => setDeductReason(e.target.value)}
                    placeholder="Enter reason for deduction"
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => setModalType('view')}
                    className="flex-1 py-3 bg-dark-700 text-gray-400 rounded-lg hover:bg-dark-600 transition-colors"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleDeductFund}
                    disabled={actionLoading}
                    className="flex-1 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? 'Processing...' : 'Deduct Fund'}
                  </button>
                </div>
              </div>
            )}

            {/* Add Fund */}
            {modalType === 'addFund' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-500 mb-2">
                  <Wallet size={20} />
                  <h4 className="font-semibold">Add Funds</h4>
                </div>
                <div className="bg-dark-700 p-3 rounded-lg">
                  <p className="text-gray-500 text-xs mb-1">Current Wallet Balance</p>
                  <p className="text-white text-xl font-bold">${userWalletBalance?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</p>
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Amount to Add ($)</label>
                  <input
                    type="number"
                    value={addFundAmount}
                    onChange={(e) => setAddFundAmount(e.target.value)}
                    placeholder="Enter amount"
                    min="0"
                    step="0.01"
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Reason (Optional)</label>
                  <input
                    type="text"
                    value={addFundReason}
                    onChange={(e) => setAddFundReason(e.target.value)}
                    placeholder="Enter reason for adding funds"
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => setModalType('view')}
                    className="flex-1 py-3 bg-dark-700 text-gray-400 rounded-lg hover:bg-dark-600 transition-colors"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleAddFund}
                    disabled={actionLoading}
                    className="flex-1 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? 'Processing...' : 'Add Fund'}
                  </button>
                </div>
              </div>
            )}

            {/* Block User */}
            {modalType === 'block' && (
              <div className="space-y-4">
                <div className={`flex items-center gap-2 ${selectedUser.isBlocked ? 'text-green-500' : 'text-yellow-500'} mb-2`}>
                  <Ban size={20} />
                  <h4 className="font-semibold">{selectedUser.isBlocked ? 'Unblock User' : 'Block User'}</h4>
                </div>
                <p className="text-gray-400 text-sm">
                  {selectedUser.isBlocked 
                    ? 'This will allow the user to access their account again.'
                    : 'Blocking will temporarily prevent the user from logging in and accessing their account.'}
                </p>
                {!selectedUser.isBlocked && (
                  <div>
                    <label className="text-gray-400 text-sm mb-1 block">Reason (Optional)</label>
                    <input
                      type="text"
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      placeholder="Enter reason for blocking"
                      className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => setModalType('view')}
                    className="flex-1 py-3 bg-dark-700 text-gray-400 rounded-lg hover:bg-dark-600 transition-colors"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleBlockUser}
                    disabled={actionLoading}
                    className={`flex-1 py-3 text-white rounded-lg transition-colors disabled:opacity-50 ${
                      selectedUser.isBlocked ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'
                    }`}
                  >
                    {actionLoading ? 'Processing...' : selectedUser.isBlocked ? 'Unblock User' : 'Block User'}
                  </button>
                </div>
              </div>
            )}

            {/* Ban User */}
            {modalType === 'ban' && (
              <div className="space-y-4">
                <div className={`flex items-center gap-2 ${selectedUser.isBanned ? 'text-green-500' : 'text-red-500'} mb-2`}>
                  <Shield size={20} />
                  <h4 className="font-semibold">{selectedUser.isBanned ? 'Unban User' : 'Ban User Permanently'}</h4>
                </div>
                <div className={`p-3 rounded-lg ${selectedUser.isBanned ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                  <p className={`text-sm ${selectedUser.isBanned ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedUser.isBanned 
                      ? 'This will remove the permanent ban and restore user access.'
                      : '⚠️ Warning: Banning is a permanent action. The user will lose all access to their account and funds.'}
                  </p>
                </div>
                {!selectedUser.isBanned && (
                  <div>
                    <label className="text-gray-400 text-sm mb-1 block">Reason (Required)</label>
                    <input
                      type="text"
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      placeholder="Enter reason for banning"
                      className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                    />
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => setModalType('view')}
                    className="flex-1 py-3 bg-dark-700 text-gray-400 rounded-lg hover:bg-dark-600 transition-colors"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleBanUser}
                    disabled={actionLoading || (!selectedUser.isBanned && !blockReason)}
                    className={`flex-1 py-3 text-white rounded-lg transition-colors disabled:opacity-50 ${
                      selectedUser.isBanned ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                    }`}
                  >
                    {actionLoading ? 'Processing...' : selectedUser.isBanned ? 'Unban User' : 'Ban Permanently'}
                  </button>
                </div>
              </div>
            )}

            {/* Add Credit */}
            {modalType === 'credit' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-purple-500 mb-2">
                  <Gift size={20} />
                  <h4 className="font-semibold">Add Credit/Bonus</h4>
                </div>
                <div className="bg-purple-500/10 p-3 rounded-lg">
                  <p className="text-purple-400 text-sm">
                    Credit adds to equity for trading but cannot be withdrawn. Only profits made using credit can be withdrawn.
                  </p>
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Select Trading Account</label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  >
                    {userAccounts.length === 0 && <option value="">No accounts available</option>}
                    {userAccounts.map(acc => (
                      <option key={acc._id} value={acc._id}>
                        {acc.accountId} - Balance: ${acc.balance?.toFixed(2)} | Credit: ${acc.credit?.toFixed(2) || '0.00'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Credit Amount ($)</label>
                  <input
                    type="number"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    placeholder="Enter credit amount"
                    min="0"
                    step="0.01"
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Reason (Optional)</label>
                  <input
                    type="text"
                    value={creditReason}
                    onChange={(e) => setCreditReason(e.target.value)}
                    placeholder="e.g., Deposit bonus, Promotion"
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => setModalType('view')}
                    className="flex-1 py-3 bg-dark-700 text-gray-400 rounded-lg hover:bg-dark-600 transition-colors"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleAddCredit}
                    disabled={actionLoading || !selectedAccountId}
                    className="flex-1 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? 'Processing...' : 'Add Credit'}
                  </button>
                </div>
              </div>
            )}

            {/* Delete User */}
            {modalType === 'delete' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-red-500 mb-2">
                  <Trash2 size={20} />
                  <h4 className="font-semibold">Delete User</h4>
                </div>
                <div className="bg-red-500/10 p-3 rounded-lg">
                  <p className="text-red-400 text-sm">
                    ⚠️ This action cannot be undone. All user data, trading accounts, and transaction history will be permanently deleted.
                  </p>
                </div>
                <p className="text-gray-400 text-sm">
                  Are you sure you want to delete <span className="text-white font-medium">{selectedUser.firstName}</span>'s account?
                </p>
                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={closeModal}
                    className="flex-1 py-3 bg-dark-700 text-gray-400 rounded-lg hover:bg-dark-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDeleteUser}
                    disabled={actionLoading}
                    className="flex-1 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? 'Deleting...' : 'Delete User'}
                  </button>
                </div>
              </div>
            )}

            {/* Add Fund to Wallet */}
            {modalType === 'addFundWallet' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-500 mb-2">
                  <Wallet size={20} />
                  <h4 className="font-semibold">Add Funds to Wallet</h4>
                </div>
                <div className="bg-dark-700 p-3 rounded-lg">
                  <p className="text-gray-500 text-xs mb-1">Current Wallet Balance</p>
                  <p className="text-white text-xl font-bold">${userWalletBalance?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</p>
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Amount to Add ($)</label>
                  <input
                    type="number"
                    value={addFundAmount}
                    onChange={(e) => setAddFundAmount(e.target.value)}
                    placeholder="Enter amount"
                    min="0"
                    step="0.01"
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Reason (Optional)</label>
                  <input
                    type="text"
                    value={addFundReason}
                    onChange={(e) => setAddFundReason(e.target.value)}
                    placeholder="Enter reason"
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => setModalType('view')}
                    className="flex-1 py-3 bg-dark-700 text-gray-400 rounded-lg hover:bg-dark-600 transition-colors"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleAddFund}
                    disabled={actionLoading}
                    className="flex-1 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? 'Processing...' : 'Add to Wallet'}
                  </button>
                </div>
              </div>
            )}

            {/* Deduct from Wallet */}
            {modalType === 'deductWallet' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-orange-500 mb-2">
                  <Wallet size={20} />
                  <h4 className="font-semibold">Deduct from Wallet</h4>
                </div>
                <div className="bg-dark-700 p-3 rounded-lg">
                  <p className="text-gray-500 text-xs mb-1">Current Wallet Balance</p>
                  <p className="text-white text-xl font-bold">${userWalletBalance?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</p>
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Amount to Deduct ($)</label>
                  <input
                    type="number"
                    value={deductAmount}
                    onChange={(e) => setDeductAmount(e.target.value)}
                    placeholder="Enter amount"
                    min="0"
                    step="0.01"
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Reason (Optional)</label>
                  <input
                    type="text"
                    value={deductReason}
                    onChange={(e) => setDeductReason(e.target.value)}
                    placeholder="Enter reason"
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => setModalType('view')}
                    className="flex-1 py-3 bg-dark-700 text-gray-400 rounded-lg hover:bg-dark-600 transition-colors"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleDeductFund}
                    disabled={actionLoading}
                    className="flex-1 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? 'Processing...' : 'Deduct from Wallet'}
                  </button>
                </div>
              </div>
            )}

            {/* Add Fund to Trading Account */}
            {modalType === 'addFundAccount' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-500 mb-2">
                  <DollarSign size={20} />
                  <h4 className="font-semibold">Add Funds to Trading Account</h4>
                </div>
                <div className="bg-dark-700 p-3 rounded-lg">
                  <p className="text-gray-500 text-xs mb-1">Selected Account</p>
                  <p className="text-white font-medium">{userAccounts.find(a => a._id === selectedAccountId)?.accountId || 'N/A'}</p>
                  <p className="text-gray-400 text-sm">Balance: ${userAccounts.find(a => a._id === selectedAccountId)?.balance?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Amount to Add ($)</label>
                  <input
                    type="number"
                    value={accountFundAmount}
                    onChange={(e) => setAccountFundAmount(e.target.value)}
                    placeholder="Enter amount"
                    min="0"
                    step="0.01"
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Reason (Optional)</label>
                  <input
                    type="text"
                    value={accountFundReason}
                    onChange={(e) => setAccountFundReason(e.target.value)}
                    placeholder="Enter reason"
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => { setAccountFundAmount(''); setAccountFundReason(''); setModalType('view'); }}
                    className="flex-1 py-3 bg-dark-700 text-gray-400 rounded-lg hover:bg-dark-600 transition-colors"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleAddFundToAccount}
                    disabled={actionLoading}
                    className="flex-1 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? 'Processing...' : 'Add to Account'}
                  </button>
                </div>
              </div>
            )}

            {/* Deduct from Trading Account */}
            {modalType === 'deductAccount' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-orange-500 mb-2">
                  <DollarSign size={20} />
                  <h4 className="font-semibold">Deduct from Trading Account</h4>
                </div>
                <div className="bg-dark-700 p-3 rounded-lg">
                  <p className="text-gray-500 text-xs mb-1">Selected Account</p>
                  <p className="text-white font-medium">{userAccounts.find(a => a._id === selectedAccountId)?.accountId || 'N/A'}</p>
                  <p className="text-gray-400 text-sm">Balance: ${userAccounts.find(a => a._id === selectedAccountId)?.balance?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Amount to Deduct ($)</label>
                  <input
                    type="number"
                    value={accountFundAmount}
                    onChange={(e) => setAccountFundAmount(e.target.value)}
                    placeholder="Enter amount"
                    min="0"
                    step="0.01"
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Reason (Optional)</label>
                  <input
                    type="text"
                    value={accountFundReason}
                    onChange={(e) => setAccountFundReason(e.target.value)}
                    placeholder="Enter reason"
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => { setAccountFundAmount(''); setAccountFundReason(''); setModalType('view'); }}
                    className="flex-1 py-3 bg-dark-700 text-gray-400 rounded-lg hover:bg-dark-600 transition-colors"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleDeductFromAccount}
                    disabled={actionLoading}
                    className="flex-1 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? 'Processing...' : 'Deduct from Account'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <AdminLayout title="User Management" subtitle="Manage all registered users">
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'users' ? 'bg-blue-500 text-white' : 'bg-dark-700 text-gray-400 hover:text-white'
          }`}
        >
          Users ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('password-reset')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'password-reset' ? 'bg-blue-500 text-white' : 'bg-dark-700 text-gray-400 hover:text-white'
          }`}
        >
          <Key size={16} />
          Password Requests
          {resetRequestStats.pending > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{resetRequestStats.pending}</span>
          )}
        </button>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`mb-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
          {message.text}
        </div>
      )}

      {activeTab === 'password-reset' ? (
        <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-800">
            <div>
              <h2 className="text-white font-semibold text-lg">Password Reset Requests</h2>
              <p className="text-gray-500 text-sm">
                Pending: {resetRequestStats.pending} | Completed: {resetRequestStats.completed} | Rejected: {resetRequestStats.rejected}
              </p>
            </div>
            <button onClick={fetchPasswordResetRequests} className="p-2 bg-dark-700 rounded-lg hover:bg-dark-600">
              <RefreshCw size={18} className="text-gray-400" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            {passwordResetRequests.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No password reset requests</p>
            ) : (
              passwordResetRequests.map(request => (
                <div key={request._id} className="p-4 bg-dark-700 rounded-xl border border-gray-700">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                        <User size={20} className="text-blue-500" />
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {request.userId?.firstName} {request.userId?.lastName}
                        </p>
                        <p className="text-gray-500 text-sm">{request.email}</p>
                        {request.newEmail && (
                          <p className="text-yellow-500 text-xs mt-1">
                            Wants to change email to: {request.newEmail}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs ${
                        request.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-500' :
                        request.status === 'Completed' ? 'bg-green-500/20 text-green-500' :
                        'bg-red-500/20 text-red-500'
                      }`}>
                        {request.status}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {request.status === 'Pending' && (
                    <div className="mt-4 pt-4 border-t border-gray-600">
                      {selectedResetRequest === request._id ? (
                        <div className="space-y-3">
                          <div>
                            <label className="text-gray-400 text-sm mb-1 block">New Password</label>
                            <input
                              type="text"
                              value={resetPassword}
                              onChange={(e) => setResetPassword(e.target.value)}
                              placeholder="Enter new password (min 6 chars)"
                              className="w-full bg-dark-600 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setSelectedResetRequest(null); setResetPassword('') }}
                              className="px-4 py-2 bg-dark-600 text-gray-400 rounded-lg hover:bg-dark-500 text-sm"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleProcessResetRequest(request._id, 'approve')}
                              disabled={actionLoading}
                              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm disabled:opacity-50"
                            >
                              {actionLoading ? 'Processing...' : 'Reset Password'}
                            </button>
                            <button
                              onClick={() => handleProcessResetRequest(request._id, 'reject')}
                              disabled={actionLoading}
                              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                          <p className="text-gray-500 text-xs">
                            After resetting, send the new password to user's email manually.
                          </p>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedResetRequest(request._id)}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                        >
                          Process Request
                        </button>
                      )}
                    </div>
                  )}

                  {request.status !== 'Pending' && request.adminRemarks && (
                    <p className="mt-2 text-gray-500 text-xs">Remarks: {request.adminRemarks}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
      <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 border-b border-gray-800">
          <div>
            <h2 className="text-white font-semibold text-lg">All Users</h2>
            <p className="text-gray-500 text-sm">{users.length} total users</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 bg-dark-700 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
              />
            </div>
            <button 
              onClick={fetchUsers}
              className="p-2 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
              <span className="sm:hidden text-gray-400 text-sm">Refresh</span>
            </button>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="block lg:hidden p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw size={24} className="text-gray-500 animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No users found matching your search' : 'No users registered yet'}
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div 
                key={user._id} 
                className="bg-dark-700 rounded-xl p-4 border border-gray-700"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-accent-green/20 rounded-full flex items-center justify-center">
                      <span className="text-accent-green font-medium text-lg">
                        {user.firstName?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{user.firstName || 'Unknown'}</p>
                      <p className={`text-xs ${user.isBanned ? 'text-red-500' : user.isBlocked ? 'text-yellow-500' : 'text-green-500'}`}>
                        {user.isBanned ? 'Banned' : user.isBlocked ? 'Blocked' : 'Active'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => openModal('view', user)}
                    className="p-2 bg-dark-600 rounded-lg hover:bg-dark-500 transition-colors"
                  >
                    <MoreHorizontal size={18} className="text-gray-400" />
                  </button>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Mail size={14} />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Phone size={14} />
                    <span>{user.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Calendar size={14} />
                    <span>Joined {formatDate(user.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Wallet size={14} />
                    <span className="text-blue-400 text-sm">Click View for balances</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-600">
                  <button 
                    onClick={() => openModal('view', user)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-500/20 text-blue-500 rounded-lg text-sm hover:bg-blue-500/30 transition-colors"
                  >
                    <Eye size={14} />
                    View
                  </button>
                  <button 
                    onClick={() => openModal('password', user)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-purple-500/20 text-purple-500 rounded-lg text-sm hover:bg-purple-500/30 transition-colors"
                  >
                    <Lock size={14} />
                    Password
                  </button>
                  <button 
                    onClick={() => openModal('delete', user)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-red-500/20 text-red-500 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">User</th>
                <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Email</th>
                <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Phone</th>
                <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Balance</th>
                <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Status</th>
                <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Joined</th>
                <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8">
                    <RefreshCw size={24} className="text-gray-500 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">
                    {searchTerm ? 'No users found matching your search' : 'No users registered yet'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user._id} className="border-b border-gray-800 hover:bg-dark-700/50">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-accent-green/20 rounded-full flex items-center justify-center">
                          <span className="text-accent-green font-medium">
                            {user.firstName?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <span className="text-white font-medium">{user.firstName || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Mail size={14} />
                        <span>{user.email}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Phone size={14} />
                        <span>{user.phone || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <button 
                        onClick={() => openModal('view', user)}
                        className="text-blue-400 hover:text-blue-300 text-sm underline"
                      >
                        View Balances
                      </button>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.isBanned 
                          ? 'bg-red-500/20 text-red-500' 
                          : user.isBlocked 
                            ? 'bg-yellow-500/20 text-yellow-500' 
                            : 'bg-green-500/20 text-green-500'
                      }`}>
                        {user.isBanned ? 'Banned' : user.isBlocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-400">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => openModal('view', user)}
                          className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-white"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => openModal('password', user)}
                          className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-blue-500"
                          title="Change Password"
                        >
                          <Lock size={16} />
                        </button>
                        <button 
                          onClick={() => openModal('deduct', user)}
                          className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-orange-500"
                          title="Deduct Fund"
                        >
                          <DollarSign size={16} />
                        </button>
                        <button 
                          onClick={() => openModal('block', user)}
                          className={`p-2 hover:bg-dark-600 rounded-lg transition-colors ${
                            user.isBlocked ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
                          }`}
                          title={user.isBlocked ? 'Unblock User' : 'Block User'}
                        >
                          <Ban size={16} />
                        </button>
                        <button 
                          onClick={() => openModal('delete', user)}
                          className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                          title="Delete User"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Modal */}
      {renderModal()}
    </AdminLayout>
  )
}

export default AdminUserManagement
