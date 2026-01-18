import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  User,
  Wallet,
  Users,
  Copy,
  UserCircle,
  HelpCircle,
  FileText,
  LogOut,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  X,
  Check,
  Clock,
  XCircle,
  Building,
  Smartphone,
  QrCode,
  Trophy,
  ArrowRightLeft,
  Send,
  Download,
  ArrowLeft,
  Home,
  Upload,
  Image,
  BookOpen,
  Sun,
  Moon,
  Gift
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { API_URL } from '../config/api'
import logoImage from '../assets/Pipxcapital.png'

const WalletPage = () => {
  const navigate = useNavigate()
  const { isDarkMode, toggleDarkMode } = useTheme()
  const [activeMenu, setActiveMenu] = useState('Wallet')
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [paymentMethods, setPaymentMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null)
  const [amount, setAmount] = useState('')
  const [transactionRef, setTransactionRef] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [challengeModeEnabled, setChallengeModeEnabled] = useState(false)
  const [currencies, setCurrencies] = useState([])
  const [selectedCurrency, setSelectedCurrency] = useState(null)
  const [localAmount, setLocalAmount] = useState('')
  const [screenshot, setScreenshot] = useState(null)
  const [screenshotPreview, setScreenshotPreview] = useState(null)
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false)
  const [userBankAccounts, setUserBankAccounts] = useState([])
  const [selectedBankAccount, setSelectedBankAccount] = useState(null)
  const [bonusInfo, setBonusInfo] = useState(null)
  const [calculatingBonus, setCalculatingBonus] = useState(false)
  const fileInputRef = useRef(null)

  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Account', icon: User, path: '/account' },
    { name: 'Wallet', icon: Wallet, path: '/wallet' },
    { name: 'Orders', icon: BookOpen, path: '/orders' },
    { name: 'IB', icon: Users, path: '/ib' },
    { name: 'Copytrade', icon: Copy, path: '/copytrade' },
    { name: 'Profile', icon: UserCircle, path: '/profile' },
    { name: 'Support', icon: HelpCircle, path: '/support' },
  ]

  // Handle screenshot file selection
  const handleScreenshotChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Screenshot must be less than 5MB')
        return
      }
      setScreenshot(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setScreenshotPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // Download transactions as CSV
  const downloadTransactionsCSV = () => {
    const headers = ['Date', 'Type', 'Amount', 'Method', 'Status', 'Reference']
    const rows = transactions.map(tx => [
      new Date(tx.createdAt).toLocaleString(),
      tx.type,
      tx.amount.toFixed(2),
      tx.paymentMethod || 'Internal',
      tx.status,
      tx.transactionRef || '-'
    ])
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    fetchChallengeStatus()
    if (user._id) {
      fetchWallet()
      fetchTransactions()
      fetchUserBankAccounts()
    }
    fetchPaymentMethods()
    fetchCurrencies()
  }, [user._id])

  const fetchUserBankAccounts = async () => {
    try {
      const res = await fetch(`${API_URL}/payment-methods/user-banks/${user._id}/approved`)
      const data = await res.json()
      setUserBankAccounts(data.accounts || [])
    } catch (error) {
      console.error('Error fetching user bank accounts:', error)
    }
  }

  const fetchCurrencies = async () => {
    try {
      const res = await fetch(`${API_URL}/payment-methods/currencies/active`)
      const data = await res.json()
      setCurrencies(data.currencies || [])
      // Set USD as default if no currencies
      if (!data.currencies || data.currencies.length === 0) {
        setSelectedCurrency({ currency: 'USD', symbol: '$', rateToUSD: 1, markup: 0 })
      }
    } catch (error) {
      console.error('Error fetching currencies:', error)
    }
  }

  // Calculate USD amount from local currency
  const calculateUSDAmount = (localAmt, currency) => {
    if (!currency || currency.currency === 'USD') return localAmt
    const effectiveRate = currency.rateToUSD * (1 + (currency.markup || 0) / 100)
    return localAmt / effectiveRate
  }

  // Calculate local amount from USD
  const calculateLocalAmount = (usdAmt, currency) => {
    if (!currency || currency.currency === 'USD') return usdAmt
    const effectiveRate = currency.rateToUSD * (1 + (currency.markup || 0) / 100)
    return usdAmt * effectiveRate
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

  const calculateBonus = async (amount) => {
    if (!amount || parseFloat(amount) <= 0) {
      setBonusInfo(null)
      return
    }

    setCalculatingBonus(true)
    try {
      // Check if this is user's first deposit by looking at their transaction history
      let isFirstDeposit = false
      try {
        const transactionsRes = await fetch(`${API_URL}/wallet/transactions/${user._id}`)
        const transactionsData = await transactionsRes.json()
        
        if (transactionsData.success && transactionsData.transactions) {
          // Check if user has any approved deposits
          const approvedDeposits = transactionsData.transactions.filter(
            tx => tx.type === 'Deposit' && tx.status === 'Approved'
          )
          isFirstDeposit = approvedDeposits.length === 0
        }
      } catch (error) {
        console.error('Error checking deposit history:', error)
        isFirstDeposit = false // Default to false if we can't check
      }

      const res = await fetch(`${API_URL}/bonus/calculate-bonus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user._id,
          depositAmount: parseFloat(amount),
          isFirstDeposit
        })
      })

      const data = await res.json()
      if (data.success) {
        setBonusInfo(data.data)
      } else {
        setBonusInfo(null)
      }
    } catch (error) {
      console.error('Error calculating bonus:', error)
      setBonusInfo(null)
    } finally {
      setCalculatingBonus(false)
    }
  }

  const fetchWallet = async () => {
    try {
      const res = await fetch(`${API_URL}/wallet/${user._id}`)
      const data = await res.json()
      setWallet(data.wallet)
    } catch (error) {
      console.error('Error fetching wallet:', error)
    }
  }

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/wallet/transactions/${user._id}`)
      const data = await res.json()
      setTransactions(data.transactions || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
    setLoading(false)
  }

  const fetchPaymentMethods = async () => {
    try {
      const res = await fetch(`${API_URL}/payment-methods`)
      const data = await res.json()
      setPaymentMethods(data.paymentMethods || [])
    } catch (error) {
      console.error('Error fetching payment methods:', error)
    }
  }

  const handleDeposit = async () => {
    if (!user._id) {
      setError('Please login to make a deposit')
      return
    }
    if (!localAmount || parseFloat(localAmount) <= 0) {
      setError('Please enter a valid amount')
      return
    }
    if (!selectedPaymentMethod) {
      setError('Please select a payment method')
      return
    }

    // Calculate USD amount from local currency
    const usdAmount = selectedCurrency && selectedCurrency.currency !== 'USD'
      ? calculateUSDAmount(parseFloat(localAmount), selectedCurrency)
      : parseFloat(localAmount)

    try {
      setUploadingScreenshot(true)
      
      // Upload screenshot first if provided
      let screenshotUrl = null
      if (screenshot) {
        const formData = new FormData()
        formData.append('screenshot', screenshot)
        formData.append('userId', user._id)
        
        const uploadRes = await fetch(`${API_URL}/upload/screenshot`, {
          method: 'POST',
          body: formData
        })
        const uploadData = await uploadRes.json()
        if (uploadData.success) {
          screenshotUrl = uploadData.url
        }
      }

      const res = await fetch(`${API_URL}/wallet/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user._id,
          amount: usdAmount,
          localAmount: parseFloat(localAmount),
          currency: selectedCurrency?.currency || 'USD',
          currencySymbol: selectedCurrency?.symbol || '$',
          exchangeRate: selectedCurrency?.rateToUSD || 1,
          markup: selectedCurrency?.markup || 0,
          paymentMethod: selectedPaymentMethod.type,
          transactionRef,
          screenshot: screenshotUrl || screenshotPreview
        })
      })
      const data = await res.json()
      
      if (res.ok) {
        setSuccess('Deposit request submitted successfully!')
        setShowDepositModal(false)
        setAmount('')
        setLocalAmount('')
        setTransactionRef('')
        setSelectedPaymentMethod(null)
        setSelectedCurrency(null)
        setScreenshot(null)
        setScreenshotPreview(null)
        fetchWallet()
        fetchTransactions()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || 'Failed to create deposit')
      }
    } catch (error) {
      console.error('Deposit error:', error)
      setError('Error submitting deposit. Please try again.')
    } finally {
      setUploadingScreenshot(false)
    }
  }

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }
    if (!selectedBankAccount) {
      setError('Please select a withdrawal account')
      return
    }
    if (wallet && parseFloat(amount) > wallet.balance) {
      setError('Insufficient balance')
      return
    }

    try {
      const res = await fetch(`${API_URL}/wallet/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user._id,
          amount: parseFloat(amount),
          paymentMethod: selectedBankAccount.type === 'UPI' ? 'UPI' : 'Bank Transfer',
          bankAccountId: selectedBankAccount._id,
          bankAccountDetails: selectedBankAccount.type === 'UPI' 
            ? { type: 'UPI', upiId: selectedBankAccount.upiId }
            : { type: 'Bank', bankName: selectedBankAccount.bankName, accountNumber: selectedBankAccount.accountNumber, ifscCode: selectedBankAccount.ifscCode }
        })
      })
      const data = await res.json()
      
      if (res.ok) {
        setSuccess('Withdrawal request submitted successfully!')
        setShowWithdrawModal(false)
        setAmount('')
        setSelectedBankAccount(null)
        fetchWallet()
        fetchTransactions()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message)
      }
    } catch (error) {
      setError('Error submitting withdrawal')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/user/login')
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved': 
      case 'Completed': 
        return <Check size={16} className="text-green-500" />
      case 'Rejected': return <XCircle size={16} className="text-red-500" />
      default: return <Clock size={16} className="text-yellow-500" />
    }
  }

  const getPaymentIcon = (type) => {
    switch (type) {
      case 'Bank Transfer': return <Building size={18} />
      case 'UPI': return <Smartphone size={18} />
      case 'QR Code': return <QrCode size={18} />
      default: return <Wallet size={18} />
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className={`h-screen flex transition-colors duration-300 ${isDarkMode ? 'bg-dark-900' : 'bg-gray-100'}`}>
      {/* Mobile Header */}
      {isMobile && (
        <header className={`fixed top-0 left-0 right-0 z-40 px-4 py-3 flex items-center gap-4 ${isDarkMode ? 'bg-dark-800 border-b border-gray-800' : 'bg-white border-b border-gray-200'}`}>
          <button onClick={() => navigate('/mobile')} className={`p-2 -ml-2 rounded-lg ${isDarkMode ? 'hover:bg-dark-700' : 'hover:bg-gray-100'}`}>
            <ArrowLeft size={22} className={isDarkMode ? 'text-white' : 'text-gray-900'} />
          </button>
          <h1 className={`font-semibold text-lg flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Wallet</h1>
          <button onClick={toggleDarkMode} className={`p-2 rounded-lg ${isDarkMode ? 'text-yellow-400 hover:bg-dark-700' : 'text-blue-500 hover:bg-gray-100'}`}>
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={() => navigate('/mobile')} className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-dark-700' : 'hover:bg-gray-100'}`}>
            <Home size={20} className="text-gray-400" />
          </button>
        </header>
      )}

      {/* Collapsible Sidebar - Hidden on Mobile, Fixed */}
      {!isMobile && (
        <aside 
          className={`${sidebarExpanded ? 'w-48' : 'w-16'} ${isDarkMode ? 'bg-dark-900 border-gray-800' : 'bg-white border-gray-200'} border-r flex flex-col h-screen sticky top-0 transition-all duration-300 ease-in-out`}
          onMouseEnter={() => setSidebarExpanded(true)}
          onMouseLeave={() => setSidebarExpanded(false)}
        >
          <div className="p-4 flex items-center justify-center shrink-0">
            <img src={logoImage} alt="Pipxacpital" className="h-8 w-auto object-contain" />
          </div>

          <nav className="flex-1 px-2 overflow-y-auto">
            {menuItems.map((item) => (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                  activeMenu === item.name 
                    ? 'bg-accent-green text-black' 
                    : isDarkMode ? 'text-gray-400 hover:text-white hover:bg-dark-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title={!sidebarExpanded ? item.name : ''}
              >
                <item.icon size={18} className="flex-shrink-0" />
                {sidebarExpanded && <span className="text-sm font-medium whitespace-nowrap">{item.name}</span>}
              </button>
            ))}
          </nav>

          <div className={`p-2 border-t shrink-0 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <button onClick={toggleDarkMode} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${isDarkMode ? 'text-yellow-400 hover:bg-dark-700' : 'text-blue-500 hover:bg-gray-100'}`}>
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              {sidebarExpanded && <span className="text-sm font-medium">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>}
            </button>
            <button 
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors rounded-lg ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
              title={!sidebarExpanded ? 'Log Out' : ''}
            >
              <LogOut size={18} className="flex-shrink-0" />
              {sidebarExpanded && <span className="text-sm font-medium whitespace-nowrap">Log Out</span>}
            </button>
          </div>
        </aside>
      )}

      {/* Main Content - Scrollable */}
      <main className={`flex-1 overflow-y-auto ${isMobile ? 'pt-14' : ''}`}>
        {!isMobile && (
          <header className={`flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <div>
              <h1 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Wallet</h1>
              <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>Manage your funds</p>
            </div>
          </header>
        )}

        <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
          {/* Success/Error Messages */}
          {success && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-500 flex items-center gap-2 text-sm">
              <Check size={18} /> {success}
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-500 text-sm">
              {error}
            </div>
          )}

          {/* Wallet Balance Card */}
          <div className={`${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} rounded-xl ${isMobile ? 'p-4' : 'p-6'} border mb-4`}>
            <div className={`${isMobile ? '' : 'flex items-center justify-between'}`}>
              <div>
                <p className={`text-sm mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>Available Balance</p>
                <p className={`font-bold ${isMobile ? 'text-2xl' : 'text-4xl'} ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>${wallet?.balance?.toLocaleString() || '0.00'}</p>
                <div className={`flex ${isMobile ? 'gap-4' : 'gap-6'} mt-3`}>
                  <div>
                    <p className="text-gray-500 text-xs">Pending Deposits</p>
                    <p className="text-yellow-500 font-medium text-sm">${wallet?.pendingDeposits?.toLocaleString() || '0.00'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Pending Withdrawals</p>
                    <p className="text-orange-500 font-medium text-sm">${wallet?.pendingWithdrawals?.toLocaleString() || '0.00'}</p>
                  </div>
                </div>
              </div>
              <div className={`flex gap-2 ${isMobile ? 'mt-4' : ''}`}>
                <button
                  onClick={() => {
                    setShowDepositModal(true)
                    setError('')
                  }}
                  className={`flex items-center gap-2 bg-accent-green text-black font-medium ${isMobile ? 'px-4 py-2 text-sm' : 'px-6 py-3'} rounded-lg hover:bg-accent-green/90 transition-colors`}
                >
                  <ArrowDownCircle size={isMobile ? 16 : 20} /> Deposit
                </button>
                <button
                  onClick={() => {
                    setShowWithdrawModal(true)
                    setError('')
                  }}
                  className={`flex items-center gap-2 font-medium ${isMobile ? 'px-4 py-2 text-sm' : 'px-6 py-3'} rounded-lg transition-colors border ${isDarkMode ? 'bg-dark-700 text-white hover:bg-dark-600 border-gray-700' : 'bg-gray-100 text-gray-900 hover:bg-gray-200 border-gray-300'}`}
                >
                  <ArrowUpCircle size={isMobile ? 16 : 20} /> Withdraw
                </button>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className={`${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} rounded-xl ${isMobile ? 'p-4' : 'p-5'} border`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Transaction History</h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={downloadTransactionsCSV}
                  disabled={transactions.length === 0}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm disabled:opacity-50 ${isDarkMode ? 'bg-dark-700 hover:bg-dark-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}`}
                >
                  <Download size={14} /> Download
                </button>
                <button 
                  onClick={fetchTransactions}
                  className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-dark-700' : 'hover:bg-gray-100'}`}
                >
                  <RefreshCw size={18} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw size={24} className="text-gray-500 animate-spin" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8">
                <Wallet size={48} className="text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">No transactions yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Type</th>
                      <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Amount</th>
                      <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Bonus</th>
                      <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Total</th>
                      <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Method</th>
                      <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Status</th>
                      <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx._id} className={`border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            {tx.type === 'Deposit' && <ArrowDownCircle size={18} className="text-green-500" />}
                            {tx.type === 'Withdrawal' && <ArrowUpCircle size={18} className="text-red-500" />}
                            {tx.type === 'Transfer_To_Account' && <Send size={18} className="text-blue-500" />}
                            {tx.type === 'Transfer_From_Account' && <Download size={18} className="text-purple-500" />}
                            {tx.type === 'Account_Transfer_Out' && <ArrowUpCircle size={18} className="text-orange-500" />}
                            {tx.type === 'Account_Transfer_In' && <ArrowDownCircle size={18} className="text-teal-500" />}
                            {tx.type === 'Challenge_Purchase' && <ArrowUpCircle size={18} className="text-yellow-500" />}
                            <div>
                              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                                {tx.type === 'Transfer_To_Account' ? 'To Trading Account' : 
                                 tx.type === 'Transfer_From_Account' ? 'From Trading Account' : 
                                 tx.type === 'Account_Transfer_Out' ? 'Account Transfer (Out)' :
                                 tx.type === 'Account_Transfer_In' ? 'Account Transfer (In)' :
                                 tx.type === 'Challenge_Purchase' ? 'Challenge Purchase' :
                                 tx.type}
                              </span>
                              {tx.tradingAccountName && (
                                <p className="text-gray-500 text-xs">{tx.tradingAccountName}</p>
                              )}
                              {tx.type === 'Account_Transfer_Out' && tx.toTradingAccountName && (
                                <p className="text-gray-500 text-xs">→ {tx.toTradingAccountName}</p>
                              )}
                              {tx.type === 'Account_Transfer_In' && tx.fromTradingAccountName && (
                                <p className="text-gray-500 text-xs">← {tx.fromTradingAccountName}</p>
                              )}
                              {tx.type === 'Challenge_Purchase' && tx.description && (
                                <p className="text-gray-500 text-xs">{tx.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className={`py-4 px-4 font-medium ${
                          tx.type === 'Deposit' || tx.type === 'Transfer_From_Account' || tx.type === 'Account_Transfer_In' ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {tx.type === 'Deposit' || tx.type === 'Transfer_From_Account' || tx.type === 'Account_Transfer_In' ? '+' : '-'}${tx.amount.toLocaleString()}
                        </td>
                        <td className="py-4 px-4">
                          {tx.type === 'Deposit' ? (
                            tx.bonusAmount && tx.bonusAmount > 0 ? (
                              <span className="text-green-500 font-medium">+${tx.bonusAmount.toLocaleString()}</span>
                            ) : (
                              <span className="text-gray-500">$0</span>
                            )
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          {tx.type === 'Deposit' ? (
                            <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              ${(tx.totalAmount || (tx.amount + (tx.bonusAmount || 0))).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-gray-400">
                          {tx.type === 'Transfer_To_Account' || tx.type === 'Transfer_From_Account' || tx.type === 'Account_Transfer_Out' || tx.type === 'Account_Transfer_In' ? 'Internal' : tx.paymentMethod}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(tx.status)}
                            <span className={`${
                              tx.status === 'Approved' || tx.status === 'Completed' ? 'text-green-500' :
                              tx.status === 'Rejected' ? 'text-red-500' :
                              'text-yellow-500'
                            }`}>
                              {tx.status}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-gray-400 text-sm">{formatDate(tx.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl p-4 sm:p-6 w-full max-w-lg border max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-dark-800 border-gray-700' : 'bg-white border-gray-300'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Deposit Funds</h3>
              <button 
                onClick={() => {
                  setShowDepositModal(false)
                  setAmount('')
                  setTransactionRef('')
                  setSelectedPaymentMethod(null)
                  setError('')
                }}
                className={isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}
              >
                <X size={20} />
              </button>
            </div>

            {/* Currency Selection */}
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Select Your Currency</label>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-32 sm:max-h-40 overflow-y-auto p-1">
                <button
                  onClick={() => setSelectedCurrency({ currency: 'USD', symbol: '$', rateToUSD: 1, markup: 0 })}
                  className={`p-2 rounded-lg border transition-colors flex flex-col items-center gap-0.5 ${
                    !selectedCurrency || selectedCurrency.currency === 'USD'
                      ? 'border-accent-green bg-accent-green/10'
                      : 'border-gray-700 bg-dark-700 hover:border-gray-600'
                  }`}
                >
                  <span className="text-lg">$</span>
                  <span className="text-white text-[10px]">USD</span>
                </button>
                {currencies.map((curr) => (
                  <button
                    key={curr._id}
                    onClick={() => setSelectedCurrency(curr)}
                    className={`p-2 rounded-lg border transition-colors flex flex-col items-center gap-0.5 ${
                      selectedCurrency?.currency === curr.currency
                        ? 'border-accent-green bg-accent-green/10'
                        : 'border-gray-700 bg-dark-700 hover:border-gray-600'
                    }`}
                  >
                    <span className="text-lg">{curr.symbol}</span>
                    <span className="text-white text-[10px]">{curr.currency}</span>
                  </button>
                ))}
              </div>
              {currencies.length === 0 && (
                <p className="text-gray-500 text-xs mt-1">Only USD available. Admin can add more currencies.</p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">
                Amount {selectedCurrency ? `(${selectedCurrency.symbol} ${selectedCurrency.currency})` : '($ USD)'}
              </label>
              <input
                type="number"
                value={localAmount}
                onChange={(e) => {
                  setLocalAmount(e.target.value)
                  // Calculate bonus when amount changes (only for USD)
                  if (!selectedCurrency || selectedCurrency.currency === 'USD') {
                    calculateBonus(e.target.value)
                  }
                }}
                placeholder={`Enter amount in ${selectedCurrency?.currency || 'USD'}`}
                className={`w-full rounded-lg px-4 py-3 placeholder-gray-500 focus:outline-none focus:border-accent-green border ${isDarkMode ? 'bg-dark-700 border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
              />
              {selectedCurrency && selectedCurrency.currency !== 'USD' && localAmount && parseFloat(localAmount) > 0 && (
                <div className="mt-2 p-3 bg-accent-green/10 rounded-lg border border-accent-green/30">
                  <div className="text-center">
                    <p className="text-gray-400 text-xs mb-1">You will receive</p>
                    <p className="text-green-400 font-bold text-2xl">${calculateUSDAmount(parseFloat(localAmount), selectedCurrency).toFixed(2)} USD</p>
                    <p className="text-gray-500 text-xs mt-2">
                      Exchange Rate: 1 USD = {selectedCurrency.symbol}{(selectedCurrency.rateToUSD * (1 + (selectedCurrency.markup || 0) / 100)).toFixed(2)} {selectedCurrency.currency}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Bonus Display */}
              {(!selectedCurrency || selectedCurrency.currency === 'USD') && localAmount && parseFloat(localAmount) > 0 && (
                <div className="mt-2">
                  {calculatingBonus ? (
                    <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                      <div className="text-center">
                        <p className="text-blue-400 text-xs mb-1">Calculating bonus...</p>
                      </div>
                    </div>
                  ) : bonusInfo && bonusInfo.bonusAmount > 0 ? (
                    <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                      <div className="text-center">
                        <p className="text-green-400 text-xs mb-1 flex items-center justify-center gap-1">
                          <Gift size={12} />
                          Bonus Applied
                        </p>
                        <p className="text-green-400 font-bold text-2xl">+${bonusInfo.bonusAmount.toFixed(2)}</p>
                        <p className="text-white text-sm">Total: ${(parseFloat(localAmount) + bonusInfo.bonusAmount).toFixed(2)}</p>
                        {bonusInfo.bonus && (
                          <p className="text-gray-400 text-xs mt-1">
                            {bonusInfo.bonus.bonusType === 'PERCENTAGE' 
                              ? `${bonusInfo.bonus.bonusValue}% bonus` 
                              : `$${bonusInfo.bonus.bonusValue} bonus`}
                            • {bonusInfo.bonus.wagerRequirement}x wagering
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    localAmount && parseFloat(localAmount) >= 50 && (
                      <div className="p-3 bg-gray-500/10 rounded-lg border border-gray-500/30">
                        <div className="text-center">
                          <p className="text-gray-400 text-xs">No bonus available for this amount</p>
                          <p className="text-gray-500 text-sm">Minimum deposit for bonus: $50</p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}

                          </div>

            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Payment Method</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {paymentMethods.map((method) => (
                  <button
                    key={method._id}
                    onClick={() => setSelectedPaymentMethod(method)}
                    className={`p-4 rounded-lg border transition-colors flex flex-col items-center gap-2 ${
                      selectedPaymentMethod?._id === method._id
                        ? 'border-accent-green bg-accent-green/10'
                        : 'border-gray-700 bg-dark-700 hover:border-gray-600'
                    }`}
                  >
                    {getPaymentIcon(method.type)}
                    <span className="text-white text-sm">{method.type}</span>
                  </button>
                ))}
              </div>
              {paymentMethods.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">No payment methods available</p>
              )}
            </div>

            {selectedPaymentMethod && (
              <div className="mb-4 p-4 bg-dark-700 rounded-lg">
                {selectedPaymentMethod.type === 'Bank Transfer' && (
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-400">Bank: <span className="text-white">{selectedPaymentMethod.bankName}</span></p>
                    <p className="text-gray-400">Account: <span className="text-white">{selectedPaymentMethod.accountNumber}</span></p>
                    <p className="text-gray-400">Name: <span className="text-white">{selectedPaymentMethod.accountHolderName}</span></p>
                    <p className="text-gray-400">IFSC: <span className="text-white">{selectedPaymentMethod.ifscCode}</span></p>
                  </div>
                )}
                {selectedPaymentMethod.type === 'UPI' && (
                  <p className="text-gray-400">UPI ID: <span className="text-white">{selectedPaymentMethod.upiId}</span></p>
                )}
                {selectedPaymentMethod.type === 'QR Code' && selectedPaymentMethod.qrCodeImage && (
                  <img src={selectedPaymentMethod.qrCodeImage} alt="QR Code" className="mx-auto max-w-48" />
                )}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Transaction Reference (Optional)</label>
              <input
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="Enter transaction ID or reference"
                className={`w-full rounded-lg px-4 py-3 placeholder-gray-500 focus:outline-none focus:border-accent-green border ${isDarkMode ? 'bg-dark-700 border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
              />
            </div>

            {/* Screenshot Upload */}
            <div className="mb-6">
              <label className="block text-gray-400 text-sm mb-2">Payment Screenshot (Proof)</label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleScreenshotChange}
                accept="image/*"
                className="hidden"
              />
              {screenshotPreview ? (
                <div className="relative">
                  <img 
                    src={screenshotPreview} 
                    alt="Payment Screenshot" 
                    className="w-full max-h-48 object-contain rounded-lg border border-gray-700"
                  />
                  <button
                    onClick={() => {
                      setScreenshot(null)
                      setScreenshotPreview(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-4 border-2 border-dashed border-gray-700 rounded-lg hover:border-accent-green transition-colors flex flex-col items-center gap-2"
                >
                  <Upload size={24} className="text-gray-500" />
                  <span className="text-gray-400 text-sm">Click to upload payment screenshot</span>
                  <span className="text-gray-600 text-xs">PNG, JPG up to 5MB</span>
                </button>
              )}
            </div>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDepositModal(false)
                  setAmount('')
                  setLocalAmount('')
                  setTransactionRef('')
                  setSelectedPaymentMethod(null)
                  setSelectedCurrency(null)
                  setScreenshot(null)
                  setScreenshotPreview(null)
                  setError('')
                }}
                className="flex-1 bg-dark-700 text-white py-3 rounded-lg hover:bg-dark-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeposit}
                disabled={uploadingScreenshot}
                className="flex-1 bg-accent-green text-black font-medium py-3 rounded-lg hover:bg-accent-green/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploadingScreenshot ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Submitting...
                  </>
                ) : (
                  'Submit Deposit'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl p-4 sm:p-6 w-full max-w-lg border max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-dark-800 border-gray-700' : 'bg-white border-gray-300'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Withdraw Funds</h3>
              <button 
                onClick={() => {
                  setShowWithdrawModal(false)
                  setAmount('')
                  setSelectedBankAccount(null)
                  setError('')
                }}
                className={isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}
              >
                <X size={20} />
              </button>
            </div>

            <div className={`mb-2 p-3 rounded-lg ${isDarkMode ? 'bg-dark-700' : 'bg-gray-100'}`}>
              <p className="text-gray-400 text-sm">Available Balance</p>
              <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>${wallet?.balance?.toLocaleString() || '0.00'}</p>
            </div>

            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Amount</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className={`w-full rounded-lg px-4 py-3 placeholder-gray-500 focus:outline-none focus:border-accent-green border ${isDarkMode ? 'bg-dark-700 border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-400 text-sm mb-2">Select Withdrawal Account</label>
              {userBankAccounts.length === 0 ? (
                <div className="p-4 bg-dark-700 rounded-lg border border-gray-700 text-center">
                  <p className="text-gray-400 mb-3">No approved bank accounts or UPI IDs found.</p>
                  <button
                    onClick={() => {
                      setShowWithdrawModal(false)
                      navigate('/profile')
                    }}
                    className="bg-accent-green text-black px-4 py-2 rounded-lg font-medium hover:bg-accent-green/90 transition-colors"
                  >
                    Add Withdrawal Account
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {userBankAccounts.map((account) => (
                    <button
                      key={account._id}
                      onClick={() => setSelectedBankAccount(account)}
                      className={`w-full p-3 rounded-lg border transition-colors flex items-center gap-3 text-left ${
                        selectedBankAccount?._id === account._id
                          ? 'border-accent-green bg-accent-green/10'
                          : 'border-gray-700 bg-dark-700 hover:border-gray-600'
                      }`}
                    >
                      {account.type === 'UPI' ? (
                        <Smartphone size={20} className="text-blue-400" />
                      ) : (
                        <Building size={20} className="text-purple-400" />
                      )}
                      <div className="flex-1">
                        <p className="text-white font-medium">{account.bankName || 'UPI'}</p>
                        <p className="text-gray-400 text-sm">
                          {account.type === 'UPI' 
                            ? account.upiId 
                            : `A/C: ${account.accountNumber} | IFSC: ${account.ifscCode}`}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowWithdrawModal(false)
                  setAmount('')
                  setSelectedBankAccount(null)
                  setError('')
                }}
                className="flex-1 bg-dark-700 text-white py-3 rounded-lg hover:bg-dark-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdraw}
                className="flex-1 bg-accent-green text-black font-medium py-3 rounded-lg hover:bg-accent-green/90 transition-colors"
              >
                Submit Withdrawal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WalletPage
