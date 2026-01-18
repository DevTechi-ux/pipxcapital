import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  User,
  Wallet,
  FileText,
  Users,
  Copy,
  UserCircle,
  HelpCircle,
  Edit2,
  Camera,
  Upload,
  Sun,
  Moon,
  ArrowLeft,
  Home,
  Lock,
  Eye,
  EyeOff,
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Shield, 
  Save, 
  X, 
  Building2, 
  Smartphone, 
  CreditCard, 
  Trophy,
  LogOut,
  CheckCircle, 
  Clock, 
  XCircle, 
  FileCheck
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { API_URL } from '../config/api'
import logoImage from "../assets/Pipxcapital.png";

const ProfilePage = () => {
  const navigate = useNavigate()
  const { isDarkMode, toggleDarkMode } = useTheme()
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [challengeModeEnabled, setChallengeModeEnabled] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  
  // KYC State
  const [kycStatus, setKycStatus] = useState(null)
  const [kycLoading, setKycLoading] = useState(false)
  const [showKycForm, setShowKycForm] = useState(false)
  const [kycForm, setKycForm] = useState({
    documentType: 'aadhaar',
    documentNumber: '',
    frontImage: '',
    backImage: '',
    selfieImage: ''
  })

  // Bank Account State
  const [userBankAccounts, setUserBankAccounts] = useState([])
  const [showBankForm, setShowBankForm] = useState(false)
  const [bankFormType, setBankFormType] = useState('Bank Transfer')
  const [bankForm, setBankForm] = useState({
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
    ifscCode: '',
    branchName: '',
    upiId: ''
  })
  const [bankLoading, setBankLoading] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    fetchChallengeStatus()
    fetchKycStatus()
    fetchUserBankAccounts()
  }, [])

  // Fetch user's bank accounts
  const fetchUserBankAccounts = async () => {
    try {
      const res = await fetch(`${API_URL}/payment-methods/user-banks/${storedUser._id}`)
      const data = await res.json()
      setUserBankAccounts(data.accounts || [])
    } catch (error) {
      console.error('Error fetching bank accounts:', error)
    }
  }

  // Submit bank account for approval
  const handleBankSubmit = async () => {
    if (bankFormType === 'Bank Transfer') {
      if (!bankForm.bankName || !bankForm.accountNumber || !bankForm.accountHolderName || !bankForm.ifscCode) {
        alert('Please fill all required bank details')
        return
      }
    } else {
      if (!bankForm.upiId) {
        alert('Please enter UPI ID')
        return
      }
    }

    setBankLoading(true)
    try {
      const res = await fetch(`${API_URL}/payment-methods/user-banks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: storedUser._id,
          type: bankFormType,
          ...bankForm
        })
      })
      const data = await res.json()
      if (data.success) {
        alert('Bank account submitted for approval!')
        setShowBankForm(false)
        setBankForm({
          bankName: '',
          accountNumber: '',
          accountHolderName: '',
          ifscCode: '',
          branchName: '',
          upiId: ''
        })
        fetchUserBankAccounts()
      } else {
        alert(data.message || 'Failed to submit bank account')
      }
    } catch (error) {
      console.error('Error submitting bank account:', error)
      alert('Failed to submit bank account')
    }
    setBankLoading(false)
  }

  // Delete bank account
  const handleDeleteBankAccount = async (id) => {
    if (!confirm('Are you sure you want to delete this bank account?')) return
    try {
      const res = await fetch(`${API_URL}/payment-methods/user-banks/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        fetchUserBankAccounts()
      }
    } catch (error) {
      console.error('Error deleting bank account:', error)
    }
  }
  
  // Fetch KYC status
  const fetchKycStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/kyc/status/${storedUser._id}`)
      const data = await res.json()
      if (data.success && data.hasKYC) {
        setKycStatus(data.kyc)
      }
    } catch (error) {
      console.error('Error fetching KYC status:', error)
    }
  }
  
  // Handle file to base64 conversion
  const handleFileChange = (e, field) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setKycForm(prev => ({ ...prev, [field]: reader.result }))
      }
      reader.readAsDataURL(file)
    }
  }
  
  // Submit KYC
  const handleKycSubmit = async () => {
    if (!kycForm.documentNumber || !kycForm.frontImage) {
      alert('Please fill document number and upload front image')
      return
    }
    
    setKycLoading(true)
    try {
      const res = await fetch(`${API_URL}/kyc/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: storedUser._id,
          ...kycForm
        })
      })
      const data = await res.json()
      if (data.success) {
        alert('KYC submitted successfully! Please wait for approval.')
        setShowKycForm(false)
        fetchKycStatus()
      } else {
        alert(data.message || 'Failed to submit KYC')
      }
    } catch (error) {
      console.error('Error submitting KYC:', error)
      alert('Failed to submit KYC')
    }
    setKycLoading(false)
  }

  const fetchChallengeStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/prop/status`)
      const data = await res.json()
      if (data.success) {
        setChallengeModeEnabled(data.enabled)
      }
    } catch (error) {
      console.error('Error fetching challenge status:', error)
    }
  }
  
  const [profile, setProfile] = useState({
    firstName: storedUser.firstName || '',
    lastName: storedUser.lastName || '',
    email: storedUser.email || '',
    phone: storedUser.phone || '',
    address: storedUser.address || '',
    city: storedUser.city || '',
    country: storedUser.country || '',
    dateOfBirth: storedUser.dateOfBirth || '',
    bankDetails: storedUser.bankDetails || {
      bankName: '',
      accountNumber: '',
      accountHolderName: '',
      ifscCode: '',
      branchName: ''
    },
    upiId: storedUser.upiId || ''
  })

  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Account', icon: User, path: '/account' },
    { name: 'Wallet', icon: Wallet, path: '/wallet' },
    { name: 'Orders', icon: FileText, path: '/orders' },
    { name: 'IB', icon: Users, path: '/ib' },
    { name: 'Copytrade', icon: Copy, path: '/copytrade' },
    { name: 'Profile', icon: UserCircle, path: '/profile' },
    { name: 'Support', icon: HelpCircle, path: '/support' },
    { name: 'Instructions', icon: FileText, path: '/instructions' },
  ]

  const handleSave = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/update-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: storedUser._id,
          ...profile
        })
      })
      const data = await res.json()
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user))
        setEditing(false)
        alert('Profile updated successfully!')
      } else {
        alert(data.message || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile')
    }
    setLoading(false)
  }

  const handlePasswordChange = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordData
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Please fill all password fields')
      return
    }
    
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match')
      return
    }
    
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long')
      return
    }
    
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: storedUser._id,
          currentPassword,
          newPassword
        })
      })
      const data = await res.json()
      
      if (data.success) {
        alert('Password changed successfully!')
        setShowPasswordModal(false)
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
        setShowPasswords({
          current: false,
          new: false,
          confirm: false
        })
      } else {
        alert(data.message || 'Failed to change password')
      }
    } catch (error) {
      console.error('Error changing password:', error)
      alert('Failed to change password')
    }
    setLoading(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/user/login')
  }

  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-300 ${isDarkMode ? 'bg-dark-900' : 'bg-gray-100'}`}>
      {/* Mobile Header */}
      {isMobile && (
        <header className={`fixed top-0 left-0 right-0 z-40 px-4 py-3 flex items-center gap-4 ${isDarkMode ? 'bg-dark-800 border-b border-gray-800' : 'bg-white border-b border-gray-200'}`}>
          <button onClick={() => navigate('/mobile')} className={`p-2 -ml-2 rounded-lg ${isDarkMode ? 'hover:bg-dark-700' : 'hover:bg-gray-100'}`}>
            <ArrowLeft size={22} className={isDarkMode ? 'text-white' : 'text-gray-900'} />
          </button>
          <h1 className={`font-semibold text-lg flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Profile</h1>
          <button onClick={toggleDarkMode} className={`p-2 rounded-lg ${isDarkMode ? 'text-yellow-400 hover:bg-dark-700' : 'text-blue-500 hover:bg-gray-100'}`}>
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={() => navigate('/mobile')} className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-dark-700' : 'hover:bg-gray-100'}`}>
            <Home size={20} className="text-gray-400" />
          </button>
        </header>
      )}

      {/* Sidebar - Hidden on Mobile */}
      {!isMobile && (
        <aside 
          className={`${sidebarExpanded ? 'w-48' : 'w-16'} ${isDarkMode ? 'bg-dark-900 border-gray-800' : 'bg-white border-gray-200'} border-r flex flex-col transition-all duration-300`}
          onMouseEnter={() => setSidebarExpanded(true)}
          onMouseLeave={() => setSidebarExpanded(false)}
        >
          <div className="p-4 flex items-center justify-center">
            <img src={logoImage} alt="Pipxacpital" className="h-8 w-auto object-contain" />
          </div>
          <nav className="flex-1 px-2">
            {menuItems.map((item) => (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                  item.name === 'Profile' ? 'bg-accent-green text-black' : isDarkMode ? 'text-gray-400 hover:text-white hover:bg-dark-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <item.icon size={18} className="flex-shrink-0" />
                {sidebarExpanded && <span className="text-sm font-medium">{item.name}</span>}
              </button>
            ))}
          </nav>
          <div className={`p-2 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <button onClick={toggleDarkMode} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 ${isDarkMode ? 'text-yellow-400 hover:bg-dark-700' : 'text-blue-500 hover:bg-gray-100'}`}>
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              {sidebarExpanded && <span className="text-sm">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>}
            </button>
            <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
              <LogOut size={18} />
              {sidebarExpanded && <span className="text-sm">Log Out</span>}
            </button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className={`flex-1 overflow-auto ${isMobile ? 'pt-14' : ''}`}>
        {!isMobile && (
          <header className={`flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <h1 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>My Profile</h1>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 bg-accent-green text-black px-4 py-2 rounded-lg font-medium hover:bg-accent-green/90"
              >
                <Edit2 size={16} />
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isDarkMode ? 'bg-dark-700 text-white hover:bg-dark-600' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'}`}
                >
                  <X size={16} />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center gap-2 bg-accent-green text-black px-4 py-2 rounded-lg font-medium hover:bg-accent-green/90 disabled:opacity-50"
                >
                  <Save size={16} />
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </header>
        )}

        <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
          <div className={`${isMobile ? '' : 'max-w-3xl'}`}>
            {/* Profile Header */}
            <div className={`${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} rounded-xl ${isMobile ? 'p-4' : 'p-6'} border mb-4`}>
              <div className={`flex ${isMobile ? 'flex-col' : ''} items-center gap-4`}>
                <div className="relative">
                  <div className={`${isMobile ? 'w-16 h-16' : 'w-24 h-24'} bg-accent-green/20 rounded-full flex items-center justify-center`}>
                    <span className={`text-accent-green font-bold ${isMobile ? 'text-xl' : 'text-3xl'}`}>
                      {profile.firstName?.charAt(0)}{profile.lastName?.charAt(0)}
                    </span>
                  </div>
                  {editing && (
                    <button className="absolute bottom-0 right-0 w-6 h-6 bg-accent-green rounded-full flex items-center justify-center">
                      <Camera size={12} className="text-black" />
                    </button>
                  )}
                </div>
                <div className={isMobile ? 'text-center' : ''}>
                  <h2 className={`font-bold ${isMobile ? 'text-lg' : 'text-2xl'} ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{profile.firstName} {profile.lastName}</h2>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{profile.email}</p>
                  <div className={`flex ${isMobile ? 'justify-center flex-wrap' : ''} items-center gap-2 mt-2`}>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      kycStatus?.status === 'approved' 
                        ? 'bg-green-500/20 text-green-500' 
                        : kycStatus?.status === 'pending'
                          ? 'bg-yellow-500/20 text-yellow-500'
                          : kycStatus?.status === 'rejected'
                            ? 'bg-red-500/20 text-red-500'
                            : 'bg-gray-500/20 text-gray-500'
                    }`}>
                      {kycStatus?.status === 'approved' ? 'Verified' 
                        : kycStatus?.status === 'pending' ? 'Under Review'
                        : kycStatus?.status === 'rejected' ? 'Rejected'
                        : 'Not Submitted'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-500">
                      Since {storedUser.createdAt ? new Date(storedUser.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Details */}
            <div className={`${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} rounded-xl ${isMobile ? 'p-4' : 'p-6'} border`}>
              <h3 className={`font-semibold ${isMobile ? 'mb-4 text-sm' : 'mb-6'} ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Personal Information</h3>
              
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-2 gap-6'}`}>
                <div>
                  <label className={`text-sm mb-2 block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>First Name</label>
                  {editing ? (
                    <input
                      type="text"
                      value={profile.firstName}
                      onChange={(e) => setProfile({...profile, firstName: e.target.value})}
                      className={`w-full rounded-lg px-4 py-2 border ${isDarkMode ? 'bg-dark-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    />
                  ) : (
                    <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{profile.firstName || '-'}</p>
                  )}
                </div>

                <div>
                  <label className={`text-sm mb-2 block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Last Name</label>
                  {editing ? (
                    <input
                      type="text"
                      value={profile.lastName}
                      onChange={(e) => setProfile({...profile, lastName: e.target.value})}
                      className={`w-full rounded-lg px-4 py-2 border ${isDarkMode ? 'bg-dark-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    />
                  ) : (
                    <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{profile.lastName || '-'}</p>
                  )}
                </div>

                <div>
                  <label className={`text-sm mb-2 block flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <Mail size={14} /> Email
                  </label>
                  <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{profile.email}</p>
                </div>

                <div>
                  <label className={`text-sm mb-2 block flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <Phone size={14} /> Phone
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={profile.phone}
                      onChange={(e) => setProfile({...profile, phone: e.target.value})}
                      className={`w-full rounded-lg px-4 py-2 border ${isDarkMode ? 'bg-dark-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    />
                  ) : (
                    <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{profile.phone || '-'}</p>
                  )}
                </div>

                <div>
                  <label className={`text-sm mb-2 block flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <Calendar size={14} /> Date of Birth
                  </label>
                  {editing ? (
                    <input
                      type="date"
                      value={profile.dateOfBirth}
                      onChange={(e) => setProfile({...profile, dateOfBirth: e.target.value})}
                      className={`w-full rounded-lg px-4 py-2 border ${isDarkMode ? 'bg-dark-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    />
                  ) : (
                    <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{profile.dateOfBirth || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block flex items-center gap-2">
                    <MapPin size={14} /> Country
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={profile.country}
                      onChange={(e) => setProfile({...profile, country: e.target.value})}
                      className={`w-full rounded-lg px-4 py-2 border ${isDarkMode ? 'bg-dark-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    />
                  ) : (
                    <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{profile.country || '-'}</p>
                  )}
                </div>

                <div className="col-span-2">
                  <label className="text-gray-400 text-sm mb-2 block flex items-center gap-2">
                    <MapPin size={14} /> Address
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={profile.address}
                      onChange={(e) => setProfile({...profile, address: e.target.value})}
                      className={`w-full rounded-lg px-4 py-2 border ${isDarkMode ? 'bg-dark-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    />
                  ) : (
                    <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{profile.address || '-'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Bank Details Section */}
            <div className={`${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} rounded-xl p-6 border mt-6`}>
              <h3 className={`font-semibold mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <Building2 size={18} /> Bank Details (For Withdrawals)
              </h3>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Bank Name</label>
                  {editing ? (
                    <input
                      type="text"
                      value={profile.bankDetails?.bankName || ''}
                      onChange={(e) => setProfile({
                        ...profile, 
                        bankDetails: {...profile.bankDetails, bankName: e.target.value}
                      })}
                      placeholder="e.g., HDFC Bank"
                      className={`w-full rounded-lg px-4 py-2 border ${isDarkMode ? 'bg-dark-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    />
                  ) : (
                    <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{profile.bankDetails?.bankName || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Account Holder Name</label>
                  {editing ? (
                    <input
                      type="text"
                      value={profile.bankDetails?.accountHolderName || ''}
                      onChange={(e) => setProfile({
                        ...profile, 
                        bankDetails: {...profile.bankDetails, accountHolderName: e.target.value}
                      })}
                      placeholder="Name as per bank account"
                      className={`w-full rounded-lg px-4 py-2 border ${isDarkMode ? 'bg-dark-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    />
                  ) : (
                    <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{profile.bankDetails?.accountHolderName || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Account Number</label>
                  {editing ? (
                    <input
                      type="text"
                      value={profile.bankDetails?.accountNumber || ''}
                      onChange={(e) => setProfile({
                        ...profile, 
                        bankDetails: {...profile.bankDetails, accountNumber: e.target.value}
                      })}
                      placeholder="Enter account number"
                      className={`w-full rounded-lg px-4 py-2 border ${isDarkMode ? 'bg-dark-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    />
                  ) : (
                    <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{profile.bankDetails?.accountNumber || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">IFSC Code</label>
                  {editing ? (
                    <input
                      type="text"
                      value={profile.bankDetails?.ifscCode || ''}
                      onChange={(e) => setProfile({
                        ...profile, 
                        bankDetails: {...profile.bankDetails, ifscCode: e.target.value.toUpperCase()}
                      })}
                      placeholder="e.g., HDFC0001234"
                      className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-2 text-white uppercase"
                    />
                  ) : (
                    <p className="text-white">{profile.bankDetails?.ifscCode || '-'}</p>
                  )}
                </div>

                <div className="col-span-2">
                  <label className="text-gray-400 text-sm mb-2 block">Branch Name</label>
                  {editing ? (
                    <input
                      type="text"
                      value={profile.bankDetails?.branchName || ''}
                      onChange={(e) => setProfile({
                        ...profile, 
                        bankDetails: {...profile.bankDetails, branchName: e.target.value}
                      })}
                      placeholder="e.g., Mumbai Main Branch"
                      className={`w-full rounded-lg px-4 py-2 border ${isDarkMode ? 'bg-dark-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    />
                  ) : (
                    <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{profile.bankDetails?.branchName || '-'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* UPI Section */}
            <div className={`${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} rounded-xl p-6 border mt-6`}>
              <h3 className={`font-semibold mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <Smartphone size={18} /> UPI Details
              </h3>
              
              <div>
                <label className="text-gray-400 text-sm mb-2 block">UPI ID</label>
                {editing ? (
                  <input
                    type="text"
                    value={profile.upiId || ''}
                    onChange={(e) => setProfile({...profile, upiId: e.target.value})}
                    placeholder="e.g., yourname@upi"
                    className={`w-full rounded-lg px-4 py-2 border ${isDarkMode ? 'bg-dark-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                  />
                ) : (
                  <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{profile.upiId || '-'}</p>
                )}
              </div>

              {!editing && (!profile.bankDetails?.accountNumber && !profile.upiId) && (
                <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-500 text-sm">
                    ⚠️ Please add your bank details or UPI ID to receive withdrawals. Click "Edit Profile" to add.
                  </p>
                </div>
              )}
            </div>

            {/* Withdrawal Accounts Section */}
            <div className={`${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} rounded-xl p-6 border mt-6`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-semibold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <CreditCard size={18} /> Withdrawal Accounts
                </h3>
                <button
                  onClick={() => setShowBankForm(true)}
                  className="px-3 py-1.5 bg-green-500/20 text-green-500 rounded-lg text-sm hover:bg-green-500/30"
                >
                  + Add Account
                </button>
              </div>

              <p className="text-gray-500 text-sm mb-4">
                Add bank accounts or UPI IDs for withdrawals. Accounts require admin approval before use.
              </p>

              {userBankAccounts.length === 0 ? (
                <div className={`p-4 rounded-lg text-center ${isDarkMode ? 'bg-dark-700' : 'bg-gray-100'}`}>
                  <p className="text-gray-500">No withdrawal accounts added yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userBankAccounts.map((acc) => (
                    <div key={acc._id} className={`p-4 rounded-lg border ${isDarkMode ? 'bg-dark-700 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {acc.type === 'Bank Transfer' ? (
                            <Building2 size={20} className="text-blue-500" />
                          ) : (
                            <Smartphone size={20} className="text-purple-500" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {acc.type === 'Bank Transfer' ? acc.bankName : 'UPI'}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                acc.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-500' :
                                acc.status === 'Approved' ? 'bg-green-500/20 text-green-500' :
                                'bg-red-500/20 text-red-500'
                              }`}>
                                {acc.status}
                              </span>
                            </div>
                            {acc.type === 'Bank Transfer' ? (
                              <p className="text-gray-500 text-sm">
                                A/C: {acc.accountNumber} | IFSC: {acc.ifscCode}
                              </p>
                            ) : (
                              <p className="text-purple-400 text-sm font-mono">{acc.upiId}</p>
                            )}
                            {acc.rejectionReason && (
                              <p className="text-red-400 text-xs mt-1">Reason: {acc.rejectionReason}</p>
                            )}
                          </div>
                        </div>
                        {acc.status !== 'Approved' && (
                          <button
                            onClick={() => handleDeleteBankAccount(acc._id)}
                            className="text-gray-500 hover:text-red-500"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bank Account Form Modal */}
            {showBankForm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-dark-800 rounded-xl w-full max-w-md border border-gray-700 max-h-[90vh] overflow-y-auto">
                  <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                    <h3 className="text-white font-semibold">Add Withdrawal Account</h3>
                    <button onClick={() => setShowBankForm(false)} className="text-gray-400 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-4 space-y-4">
                    {/* Type Selection */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setBankFormType('Bank Transfer')}
                        className={`p-3 rounded-lg border flex items-center justify-center gap-2 ${
                          bankFormType === 'Bank Transfer'
                            ? 'border-blue-500 bg-blue-500/20 text-blue-500'
                            : 'border-gray-700 text-gray-400'
                        }`}
                      >
                        <Building2 size={18} /> Bank
                      </button>
                      <button
                        onClick={() => setBankFormType('UPI')}
                        className={`p-3 rounded-lg border flex items-center justify-center gap-2 ${
                          bankFormType === 'UPI'
                            ? 'border-purple-500 bg-purple-500/20 text-purple-500'
                            : 'border-gray-700 text-gray-400'
                        }`}
                      >
                        <Smartphone size={18} /> UPI
                      </button>
                    </div>

                    {bankFormType === 'Bank Transfer' ? (
                      <>
                        <div>
                          <label className="text-gray-400 text-sm block mb-1">Bank Name *</label>
                          <input
                            type="text"
                            value={bankForm.bankName}
                            onChange={(e) => setBankForm({...bankForm, bankName: e.target.value})}
                            placeholder="e.g., HDFC Bank"
                            className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-gray-400 text-sm block mb-1">Account Number *</label>
                          <input
                            type="text"
                            value={bankForm.accountNumber}
                            onChange={(e) => setBankForm({...bankForm, accountNumber: e.target.value})}
                            placeholder="e.g., 1234567890"
                            className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-gray-400 text-sm block mb-1">Account Holder Name *</label>
                          <input
                            type="text"
                            value={bankForm.accountHolderName}
                            onChange={(e) => setBankForm({...bankForm, accountHolderName: e.target.value})}
                            placeholder="e.g., John Doe"
                            className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-gray-400 text-sm block mb-1">IFSC Code *</label>
                          <input
                            type="text"
                            value={bankForm.ifscCode}
                            onChange={(e) => setBankForm({...bankForm, ifscCode: e.target.value.toUpperCase()})}
                            placeholder="e.g., HDFC0001234"
                            className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-white uppercase"
                          />
                        </div>
                        <div>
                          <label className="text-gray-400 text-sm block mb-1">Branch Name</label>
                          <input
                            type="text"
                            value={bankForm.branchName}
                            onChange={(e) => setBankForm({...bankForm, branchName: e.target.value})}
                            placeholder="e.g., Mumbai Main"
                            className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                      </>
                    ) : (
                      <div>
                        <label className="text-gray-400 text-sm block mb-1">UPI ID *</label>
                        <input
                          type="text"
                          value={bankForm.upiId}
                          onChange={(e) => setBankForm({...bankForm, upiId: e.target.value})}
                          placeholder="e.g., yourname@upi"
                          className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                        />
                      </div>
                    )}

                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <p className="text-yellow-500 text-xs">
                        ⚠️ Your account will be reviewed by admin before it can be used for withdrawals.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowBankForm(false)}
                        className="flex-1 py-2 bg-dark-700 text-gray-400 rounded-lg hover:bg-dark-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleBankSubmit}
                        disabled={bankLoading}
                        className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                      >
                        {bankLoading ? 'Submitting...' : 'Submit for Approval'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* KYC Verification Section */}
            <div className={`${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} rounded-xl p-6 border mt-6`}>
              <h3 className={`font-semibold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <FileCheck size={18} /> KYC Verification
              </h3>
              
              {/* KYC Status Display */}
              {kycStatus ? (
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg border ${
                    kycStatus.status === 'approved' 
                      ? 'bg-green-500/10 border-green-500/30' 
                      : kycStatus.status === 'pending'
                        ? 'bg-yellow-500/10 border-yellow-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                  }`}>
                    <div className="flex items-center gap-3">
                      {kycStatus.status === 'approved' && <CheckCircle size={24} className="text-green-500" />}
                      {kycStatus.status === 'pending' && <Clock size={24} className="text-yellow-500" />}
                      {kycStatus.status === 'rejected' && <XCircle size={24} className="text-red-500" />}
                      <div>
                        <p className={`font-medium ${
                          kycStatus.status === 'approved' ? 'text-green-500' 
                            : kycStatus.status === 'pending' ? 'text-yellow-500' 
                            : 'text-red-500'
                        }`}>
                          {kycStatus.status === 'approved' && 'KYC Verified'}
                          {kycStatus.status === 'pending' && 'KYC Under Review'}
                          {kycStatus.status === 'rejected' && 'KYC Rejected'}
                        </p>
                        <p className="text-gray-400 text-sm">
                          Document: {kycStatus.documentType?.replace('_', ' ').toUpperCase()}
                        </p>
                        {kycStatus.status === 'rejected' && kycStatus.rejectionReason && (
                          <p className="text-red-400 text-sm mt-1">Reason: {kycStatus.rejectionReason}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {kycStatus.status === 'rejected' && (
                    <button
                      onClick={() => {
                        setKycForm({ documentType: 'aadhaar', documentNumber: '', frontImage: '', backImage: '', selfieImage: '' })
                        setShowKycForm(true)
                      }}
                      className="w-full py-3 bg-accent-green text-black font-medium rounded-lg hover:bg-accent-green/90"
                    >
                      Resubmit KYC
                    </button>
                  )}
                </div>
              ) : showKycForm ? (
                <div className="space-y-4">
                  {/* Document Type */}
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Document Type</label>
                    <select
                      value={kycForm.documentType}
                      onChange={(e) => setKycForm({ ...kycForm, documentType: e.target.value })}
                      className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    >
                      <option value="aadhaar">Aadhaar Card</option>
                      <option value="pan_card">PAN Card</option>
                      <option value="passport">Passport</option>
                      <option value="driving_license">Driving License</option>
                      <option value="voter_id">Voter ID</option>
                      <option value="national_id">National ID</option>
                    </select>
                  </div>
                  
                  {/* Document Number */}
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Document Number</label>
                    <input
                      type="text"
                      value={kycForm.documentNumber}
                      onChange={(e) => setKycForm({ ...kycForm, documentNumber: e.target.value })}
                      placeholder="Enter document number"
                      className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  
                  {/* Front Image Upload */}
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Front Side of Document *</label>
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-accent-green transition-colors">
                      {kycForm.frontImage ? (
                        <div className="relative">
                          <img src={kycForm.frontImage} alt="Front" className="max-h-32 mx-auto rounded" />
                          <button
                            onClick={() => setKycForm({ ...kycForm, frontImage: '' })}
                            className="absolute top-0 right-0 p-1 bg-red-500 rounded-full"
                          >
                            <X size={14} className="text-white" />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <Upload size={32} className="mx-auto text-gray-500 mb-2" />
                          <p className="text-gray-400 text-sm">Click to upload front side</p>
                          <p className="text-gray-500 text-xs">Max 5MB, JPG/PNG</p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, 'frontImage')}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                  
                  {/* Back Image Upload */}
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Back Side of Document (Optional)</label>
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-accent-green transition-colors">
                      {kycForm.backImage ? (
                        <div className="relative">
                          <img src={kycForm.backImage} alt="Back" className="max-h-32 mx-auto rounded" />
                          <button
                            onClick={() => setKycForm({ ...kycForm, backImage: '' })}
                            className="absolute top-0 right-0 p-1 bg-red-500 rounded-full"
                          >
                            <X size={14} className="text-white" />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <Upload size={32} className="mx-auto text-gray-500 mb-2" />
                          <p className="text-gray-400 text-sm">Click to upload back side</p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, 'backImage')}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                  
                  {/* Selfie Upload */}
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Selfie with Document (Optional)</label>
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-accent-green transition-colors">
                      {kycForm.selfieImage ? (
                        <div className="relative">
                          <img src={kycForm.selfieImage} alt="Selfie" className="max-h-32 mx-auto rounded" />
                          <button
                            onClick={() => setKycForm({ ...kycForm, selfieImage: '' })}
                            className="absolute top-0 right-0 p-1 bg-red-500 rounded-full"
                          >
                            <X size={14} className="text-white" />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <Camera size={32} className="mx-auto text-gray-500 mb-2" />
                          <p className="text-gray-400 text-sm">Click to upload selfie</p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, 'selfieImage')}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                  
                  {/* Submit Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowKycForm(false)}
                      className="flex-1 py-3 bg-dark-700 text-white rounded-lg hover:bg-dark-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleKycSubmit}
                      disabled={kycLoading}
                      className="flex-1 py-3 bg-accent-green text-black font-medium rounded-lg hover:bg-accent-green/90 disabled:opacity-50"
                    >
                      {kycLoading ? 'Submitting...' : 'Submit KYC'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileCheck size={32} className="text-yellow-500" />
                  </div>
                  <p className="text-white font-medium mb-2">KYC Not Submitted</p>
                  <p className="text-gray-400 text-sm mb-4">Complete your KYC verification to unlock all features</p>
                  <button
                    onClick={() => setShowKycForm(true)}
                    className="px-6 py-3 bg-accent-green text-black font-medium rounded-lg hover:bg-accent-green/90"
                  >
                    Start KYC Verification
                  </button>
                </div>
              )}
            </div>

            {/* Security Section */}
            <div className={`${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} rounded-xl p-6 border mt-6`}>
              <h3 className={`font-semibold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <Shield size={18} /> Security
              </h3>
              <div className="space-y-4">
                <div className={`flex items-center justify-between py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div>
                    <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>Password</p>
                    <p className="text-gray-500 text-sm">Last changed: Never</p>
                  </div>
                  <button 
                    onClick={() => setShowPasswordModal(true)}
                    className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    <Lock size={16} />
                    Change
                  </button>
                </div>
                <div className={`flex items-center justify-between py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div>
                    <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>Two-Factor Authentication</p>
                    <p className="text-gray-500 text-sm">Add an extra layer of security</p>
                  </div>
                  <button className="text-accent-green hover:underline text-sm">Enable</button>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>Login History</p>
                    <p className="text-gray-500 text-sm">View recent login activity</p>
                  </div>
                  <button className="text-accent-green hover:underline text-sm">View</button>
                </div>
              </div>
            </div>

            {/* Password Change Modal */}
            {showPasswordModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-dark-800 rounded-xl w-full max-w-md border border-gray-700">
                  <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                    <h3 className="text-white font-semibold">Change Password</h3>
                    <button onClick={() => setShowPasswordModal(false)} className="text-gray-400 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    {/* Current Password */}
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Current Password</label>
                      <div className="relative">
                        <input
                          type={showPasswords.current ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                          className="w-full bg-dark-700 border border-gray-600 rounded-lg pl-4 pr-12 py-3 text-white placeholder-gray-500"
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400"
                        >
                          {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">New Password</label>
                      <div className="relative">
                        <input
                          type={showPasswords.new ? 'text' : 'password'}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                          className="w-full bg-dark-700 border border-gray-600 rounded-lg pl-4 pr-12 py-3 text-white placeholder-gray-500"
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400"
                        >
                          {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showPasswords.confirm ? 'text' : 'password'}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                          className="w-full bg-dark-700 border border-gray-600 rounded-lg pl-4 pr-12 py-3 text-white placeholder-gray-500"
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400"
                        >
                          {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setShowPasswordModal(false)}
                        className="flex-1 py-3 bg-dark-700 text-white rounded-lg hover:bg-dark-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handlePasswordChange}
                        disabled={loading}
                        className="flex-1 py-3 bg-accent-green text-black font-medium rounded-lg hover:bg-accent-green/90 disabled:opacity-50"
                      >
                        {loading ? 'Changing...' : 'Change Password'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default ProfilePage
