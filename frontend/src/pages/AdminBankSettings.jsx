import { useState, useEffect } from 'react'
import AdminLayout from '../components/AdminLayout'
import { 
  Building2,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  CreditCard,
  Globe,
  QrCode,
  RefreshCw,
  Upload,
  Smartphone,
  DollarSign,
  Percent
} from 'lucide-react'
import { API_URL } from '../config/api'

const AdminBankSettings = () => {
  const [paymentMethods, setPaymentMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingMethod, setEditingMethod] = useState(null)
  const [form, setForm] = useState({
    type: 'Bank Transfer',
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
    ifscCode: '',
    upiId: '',
    qrCodeImage: '',
    isActive: true
  })
  
  // Currency markup states
  const [currencyMarkups, setCurrencyMarkups] = useState([])
  const [showCurrencyModal, setShowCurrencyModal] = useState(false)
  const [editingCurrency, setEditingCurrency] = useState(null)
  const [currencyForm, setCurrencyForm] = useState({
    currency: 'INR',
    symbol: '₹',
    rateToUSD: 83,
    markup: 0,
    isActive: true
  })

  // Bank requests states
  const [activeTab, setActiveTab] = useState('methods') // methods, requests
  const [bankRequests, setBankRequests] = useState([])
  const [requestStats, setRequestStats] = useState({ pending: 0, approved: 0, rejected: 0 })
  const [requestFilter, setRequestFilter] = useState('Pending')

  useEffect(() => {
    fetchPaymentMethods()
    fetchCurrencyMarkups()
    fetchBankRequests()
    fetchRequestStats()
  }, [])

  useEffect(() => {
    fetchBankRequests()
  }, [requestFilter])

  const fetchBankRequests = async () => {
    try {
      const res = await fetch(`${API_URL}/payment-methods/admin/bank-requests?status=${requestFilter}`)
      const data = await res.json()
      setBankRequests(data.requests || [])
    } catch (error) {
      console.error('Error fetching bank requests:', error)
    }
  }

  const fetchRequestStats = async () => {
    try {
      const res = await fetch(`${API_URL}/payment-methods/admin/bank-requests/stats`)
      const data = await res.json()
      setRequestStats(data.stats || { pending: 0, approved: 0, rejected: 0 })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleApproveRequest = async (id) => {
    try {
      const res = await fetch(`${API_URL}/payment-methods/admin/bank-requests/${id}/approve`, {
        method: 'PUT'
      })
      const data = await res.json()
      if (data.success) {
        alert('Bank account approved!')
        fetchBankRequests()
        fetchRequestStats()
      }
    } catch (error) {
      alert('Error approving request')
    }
  }

  const handleRejectRequest = async (id) => {
    const reason = prompt('Enter rejection reason:')
    if (!reason) return

    try {
      const res = await fetch(`${API_URL}/payment-methods/admin/bank-requests/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })
      const data = await res.json()
      if (data.success) {
        alert('Bank account rejected!')
        fetchBankRequests()
        fetchRequestStats()
      }
    } catch (error) {
      alert('Error rejecting request')
    }
  }

  const fetchCurrencyMarkups = async () => {
    try {
      const res = await fetch(`${API_URL}/payment-methods/currencies`)
      const data = await res.json()
      setCurrencyMarkups(data.currencies || [])
    } catch (error) {
      console.error('Error fetching currencies:', error)
    }
  }

  // Common currencies with symbols
  const commonCurrencies = [
    { currency: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { currency: 'EUR', symbol: '€', name: 'Euro' },
    { currency: 'GBP', symbol: '£', name: 'British Pound' },
    { currency: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { currency: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { currency: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { currency: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
    { currency: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { currency: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
    { currency: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
    { currency: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
    { currency: 'THB', symbol: '฿', name: 'Thai Baht' },
    { currency: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
    { currency: 'PHP', symbol: '₱', name: 'Philippine Peso' },
    { currency: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
    { currency: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
    { currency: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
    { currency: 'ZAR', symbol: 'R', name: 'South African Rand' },
    { currency: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
    { currency: 'MXN', symbol: '$', name: 'Mexican Peso' },
  ]

  // Fetch live exchange rates
  const fetchLiveRates = async () => {
    try {
      const res = await fetch(`${API_URL}/payment-methods/currencies/live-rates`)
      const data = await res.json()
      if (data.success && data.rates) {
        alert(`Live rates fetched! ${Object.keys(data.rates).length} currencies updated.`)
        fetchCurrencyMarkups()
      } else {
        alert(data.message || 'Failed to fetch live rates')
      }
    } catch (error) {
      console.error('Error fetching live rates:', error)
      alert('Error fetching live rates')
    }
  }

  // Add all common currencies with live rates
  const addAllCurrencies = async () => {
    if (!confirm('This will add all common currencies with live exchange rates. Continue?')) return
    
    try {
      const res = await fetch(`${API_URL}/payment-methods/currencies/add-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currencies: commonCurrencies })
      })
      const data = await res.json()
      if (data.success) {
        alert(`Added ${data.addedCount} currencies with live rates!`)
        fetchCurrencyMarkups()
      } else {
        alert(data.message || 'Failed to add currencies')
      }
    } catch (error) {
      console.error('Error adding currencies:', error)
      alert('Error adding currencies')
    }
  }

  // Update single currency with live rate
  const updateLiveRate = async (currencyCode) => {
    try {
      const res = await fetch(`${API_URL}/payment-methods/currencies/update-rate/${currencyCode}`, {
        method: 'PUT'
      })
      const data = await res.json()
      if (data.success) {
        alert(`${currencyCode} rate updated to ${data.rate}`)
        fetchCurrencyMarkups()
      } else {
        alert(data.message || 'Failed to update rate')
      }
    } catch (error) {
      alert('Error updating rate')
    }
  }

  const handleSaveCurrency = async () => {
    try {
      const url = editingCurrency 
        ? `${API_URL}/payment-methods/currencies/${editingCurrency._id}`
        : `${API_URL}/payment-methods/currencies`
      const method = editingCurrency ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currencyForm)
      })
      const data = await res.json()
      
      if (res.ok) {
        alert(editingCurrency ? 'Currency updated!' : 'Currency added!')
        setShowCurrencyModal(false)
        setEditingCurrency(null)
        resetCurrencyForm()
        fetchCurrencyMarkups()
      } else {
        alert(data.message || 'Error saving currency')
      }
    } catch (error) {
      alert('Error saving currency')
    }
  }

  const handleDeleteCurrency = async (id) => {
    if (!confirm('Are you sure you want to delete this currency?')) return
    try {
      const res = await fetch(`${API_URL}/payment-methods/currencies/${id}`, { method: 'DELETE' })
      if (res.ok) {
        alert('Currency deleted!')
        fetchCurrencyMarkups()
      }
    } catch (error) {
      alert('Error deleting currency')
    }
  }

  const openEditCurrencyModal = (currency) => {
    setEditingCurrency(currency)
    setCurrencyForm({
      currency: currency.currency,
      symbol: currency.symbol,
      rateToUSD: currency.rateToUSD,
      markup: currency.markup || 0,
      isActive: currency.isActive
    })
    setShowCurrencyModal(true)
  }

  const resetCurrencyForm = () => {
    setCurrencyForm({
      currency: 'INR',
      symbol: '₹',
      rateToUSD: 83,
      markup: 0,
      isActive: true
    })
  }

  const fetchPaymentMethods = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/payment-methods/all`)
      const data = await res.json()
      setPaymentMethods(data.paymentMethods || [])
    } catch (error) {
      console.error('Error fetching payment methods:', error)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    try {
      const url = editingMethod 
        ? `${API_URL}/payment-methods/${editingMethod._id}`
        : `${API_URL}/payment-methods`
      const method = editingMethod ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      
      if (res.ok) {
        alert(editingMethod ? 'Payment method updated!' : 'Payment method created!')
        setShowAddModal(false)
        setEditingMethod(null)
        resetForm()
        fetchPaymentMethods()
      } else {
        alert(data.message || 'Error saving payment method')
      }
    } catch (error) {
      alert('Error saving payment method')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return
    try {
      const res = await fetch(`${API_URL}/payment-methods/${id}`, { method: 'DELETE' })
      if (res.ok) {
        alert('Payment method deleted!')
        fetchPaymentMethods()
      }
    } catch (error) {
      alert('Error deleting payment method')
    }
  }

  const handleToggleStatus = async (method) => {
    try {
      await fetch(`${API_URL}/payment-methods/${method._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !method.isActive })
      })
      fetchPaymentMethods()
    } catch (error) {
      alert('Error updating status')
    }
  }

  const openEditModal = (method) => {
    setEditingMethod(method)
    setForm({
      type: method.type,
      bankName: method.bankName || '',
      accountNumber: method.accountNumber || '',
      accountHolderName: method.accountHolderName || '',
      ifscCode: method.ifscCode || '',
      upiId: method.upiId || '',
      qrCodeImage: method.qrCodeImage || '',
      isActive: method.isActive
    })
    setShowAddModal(true)
  }

  const resetForm = () => {
    setForm({
      type: 'Bank Transfer',
      bankName: '',
      accountNumber: '',
      accountHolderName: '',
      ifscCode: '',
      upiId: '',
      qrCodeImage: '',
      isActive: true
    })
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setForm({ ...form, qrCodeImage: reader.result })
      }
      reader.readAsDataURL(file)
    }
  }

  const bankMethods = paymentMethods.filter(m => m.type === 'Bank Transfer')
  const upiMethods = paymentMethods.filter(m => m.type === 'UPI')
  const qrMethods = paymentMethods.filter(m => m.type === 'QR Code')

  return (
    <AdminLayout title="Bank Settings" subtitle="Manage bank accounts and payment methods">
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('methods')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'methods' 
              ? 'bg-blue-500 text-white' 
              : 'bg-dark-800 text-gray-400 hover:text-white'
          }`}
        >
          Payment Methods
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'requests' 
              ? 'bg-blue-500 text-white' 
              : 'bg-dark-800 text-gray-400 hover:text-white'
          }`}
        >
          Bank Requests
          {requestStats.pending > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
              {requestStats.pending}
            </span>
          )}
        </button>
      </div>

      {/* Bank Requests Tab */}
      {activeTab === 'requests' && (
        <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 border-b border-gray-800">
            <div>
              <h2 className="text-white font-semibold text-lg">User Bank/UPI Requests</h2>
              <p className="text-gray-500 text-sm">Approve or reject user bank account submissions</p>
            </div>
            <div className="flex gap-2">
              {['Pending', 'Approved', 'Rejected'].map(status => (
                <button
                  key={status}
                  onClick={() => setRequestFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    requestFilter === status
                      ? status === 'Pending' ? 'bg-yellow-500 text-black' :
                        status === 'Approved' ? 'bg-green-500 text-white' :
                        'bg-red-500 text-white'
                      : 'bg-dark-700 text-gray-400 hover:text-white'
                  }`}
                >
                  {status} ({requestStats[status.toLowerCase()] || 0})
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 space-y-3">
            {bankRequests.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No {requestFilter.toLowerCase()} requests</p>
            ) : (
              bankRequests.map((req) => (
                <div key={req._id} className="bg-dark-700 rounded-xl p-4 border border-gray-700">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          req.type === 'Bank Transfer' ? 'bg-blue-500/20 text-blue-500' : 'bg-purple-500/20 text-purple-500'
                        }`}>
                          {req.type}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          req.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-500' :
                          req.status === 'Approved' ? 'bg-green-500/20 text-green-500' :
                          'bg-red-500/20 text-red-500'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-white font-medium">{req.userId?.firstName} {req.userId?.lastName}</p>
                        <p className="text-gray-500 text-sm">{req.userId?.email}</p>
                        <p className="text-gray-500 text-xs font-mono">User ID: {req.userId?._id}</p>
                      </div>

                      {req.type === 'Bank Transfer' ? (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-gray-500">Bank Name</p>
                            <p className="text-white">{req.bankName}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Account Number</p>
                            <p className="text-white font-mono">{req.accountNumber}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Account Holder</p>
                            <p className="text-white">{req.accountHolderName}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">IFSC Code</p>
                            <p className="text-white font-mono">{req.ifscCode}</p>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-gray-500 text-sm">UPI ID</p>
                          <p className="text-purple-400 font-mono text-lg">{req.upiId}</p>
                        </div>
                      )}

                      {req.rejectionReason && (
                        <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                          <p className="text-red-400 text-sm">Rejection Reason: {req.rejectionReason}</p>
                        </div>
                      )}

                      <p className="text-gray-500 text-xs mt-3">
                        Submitted: {new Date(req.createdAt).toLocaleString()}
                      </p>
                    </div>

                    {req.status === 'Pending' && (
                      <div className="flex sm:flex-col gap-2">
                        <button
                          onClick={() => handleApproveRequest(req._id)}
                          className="flex-1 sm:flex-none px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-1"
                        >
                          <Check size={16} /> Approve
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req._id)}
                          className="flex-1 sm:flex-none px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-1"
                        >
                          <X size={16} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Payment Methods Tab */}
      {activeTab === 'methods' && (
        <>
          {/* Header Actions */}
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={fetchPaymentMethods}
              className="p-2 bg-dark-800 hover:bg-dark-700 rounded-lg text-gray-400"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={() => { resetForm(); setEditingMethod(null); setShowAddModal(true) }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus size={16} />
              Add Payment Method
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw size={24} className="animate-spin text-gray-500" />
            </div>
          ) : (
            <>
              {/* Bank Accounts */}
          <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden mb-6">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Building2 size={20} className="text-blue-500" />
                </div>
                <div>
                  <h2 className="text-white font-semibold">Bank Accounts</h2>
                  <p className="text-gray-500 text-sm">Bank transfer deposit methods</p>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {bankMethods.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No bank accounts added yet</p>
              ) : (
                bankMethods.map((bank) => (
                  <div key={bank._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-dark-700 rounded-xl border border-gray-700">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-dark-600 rounded-lg flex items-center justify-center">
                        <Building2 size={24} className="text-blue-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{bank.bankName}</p>
                        <p className="text-gray-500 text-sm">A/C: {bank.accountNumber} | IFSC: {bank.ifscCode}</p>
                        <p className="text-gray-500 text-sm">Holder: {bank.accountHolderName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleStatus(bank)}
                        className={`px-3 py-1 rounded-full text-xs ${
                          bank.isActive ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {bank.isActive ? 'Active' : 'Inactive'}
                      </button>
                      <button 
                        onClick={() => openEditModal(bank)}
                        className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-white"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(bank._id)}
                        className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* UPI Methods */}
          <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden mb-6">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Smartphone size={20} className="text-purple-500" />
                </div>
                <div>
                  <h2 className="text-white font-semibold">UPI IDs</h2>
                  <p className="text-gray-500 text-sm">UPI payment methods</p>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {upiMethods.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No UPI IDs added yet</p>
              ) : (
                upiMethods.map((upi) => (
                  <div key={upi._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-dark-700 rounded-xl border border-gray-700">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-dark-600 rounded-lg flex items-center justify-center">
                        <Smartphone size={24} className="text-purple-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">UPI ID</p>
                        <p className="text-purple-400 text-lg font-mono">{upi.upiId}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleStatus(upi)}
                        className={`px-3 py-1 rounded-full text-xs ${
                          upi.isActive ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {upi.isActive ? 'Active' : 'Inactive'}
                      </button>
                      <button 
                        onClick={() => openEditModal(upi)}
                        className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-white"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(upi._id)}
                        className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* QR Codes */}
          <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <QrCode size={20} className="text-orange-500" />
                </div>
                <div>
                  <h2 className="text-white font-semibold">QR Codes</h2>
                  <p className="text-gray-500 text-sm">QR code payment methods</p>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {qrMethods.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No QR codes added yet</p>
              ) : (
                qrMethods.map((qr) => (
                  <div key={qr._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-dark-700 rounded-xl border border-gray-700">
                    <div className="flex items-center gap-4">
                      {qr.qrCodeImage ? (
                        <img src={qr.qrCodeImage} alt="QR Code" className="w-16 h-16 rounded-lg object-cover" />
                      ) : (
                        <div className="w-16 h-16 bg-dark-600 rounded-lg flex items-center justify-center">
                          <QrCode size={32} className="text-orange-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-white font-medium">QR Code Payment</p>
                        <p className="text-gray-500 text-sm">Scan to pay</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleStatus(qr)}
                        className={`px-3 py-1 rounded-full text-xs ${
                          qr.isActive ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {qr.isActive ? 'Active' : 'Inactive'}
                      </button>
                      <button 
                        onClick={() => openEditModal(qr)}
                        className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-white"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(qr._id)}
                        className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Currency Markups Section */}
          <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <DollarSign size={20} className="text-green-500" />
                </div>
                <div>
                  <h2 className="text-white font-semibold">Currency Markups</h2>
                  <p className="text-gray-500 text-sm">Set exchange rates and markups for deposits</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={addAllCurrencies}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 text-blue-500 rounded-lg hover:bg-blue-500/30 text-sm"
                >
                  <Globe size={14} />
                  Add All Currencies
                </button>
                <button 
                  onClick={fetchLiveRates}
                  className="flex items-center gap-1 px-3 py-1.5 bg-purple-500/20 text-purple-500 rounded-lg hover:bg-purple-500/30 text-sm"
                >
                  <RefreshCw size={14} />
                  Fetch Live Rates
                </button>
                <button 
                  onClick={() => { resetCurrencyForm(); setEditingCurrency(null); setShowCurrencyModal(true) }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500/30 text-sm"
                >
                  <Plus size={14} />
                  Add Currency
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {currencyMarkups.length === 0 ? (
                <div className="text-center py-6">
                  <Globe size={48} className="text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">No currencies configured yet</p>
                  <button 
                    onClick={addAllCurrencies}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Add All Common Currencies with Live Rates
                  </button>
                </div>
              ) : (
                currencyMarkups.map((curr) => (
                  <div key={curr._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-dark-700 rounded-xl border border-gray-700">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-dark-600 rounded-lg flex items-center justify-center text-2xl">
                        {curr.symbol}
                      </div>
                      <div>
                        <p className="text-white font-medium">{curr.currency}</p>
                        <p className="text-gray-500 text-sm">
                          Rate: 1 USD = {curr.symbol}{curr.rateToUSD?.toFixed(2)} | 
                          Markup: <span className="text-yellow-500">{curr.markup}%</span>
                        </p>
                        <p className="text-green-400 text-xs">
                          Effective: 1 USD = {curr.symbol}{((curr.rateToUSD || 0) * (1 + (curr.markup || 0) / 100)).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs ${
                        curr.isActive ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {curr.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <button 
                        onClick={() => updateLiveRate(curr.currency)}
                        className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-purple-400 hover:text-purple-300"
                        title="Update live rate"
                      >
                        <RefreshCw size={16} />
                      </button>
                      <button 
                        onClick={() => openEditCurrencyModal(curr)}
                        className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-white"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteCurrency(curr._id)}
                        className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
            </>
          )}
        </>
      )}

      {/* Currency Modal */}
      {showCurrencyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editingCurrency ? 'Edit Currency' : 'Add Currency'}
              </h2>
              <button onClick={() => setShowCurrencyModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Currency Code</label>
                  <input
                    type="text"
                    value={currencyForm.currency}
                    onChange={(e) => setCurrencyForm({ ...currencyForm, currency: e.target.value.toUpperCase() })}
                    placeholder="e.g., INR"
                    maxLength={3}
                    className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white uppercase"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Symbol</label>
                  <input
                    type="text"
                    value={currencyForm.symbol}
                    onChange={(e) => setCurrencyForm({ ...currencyForm, symbol: e.target.value })}
                    placeholder="e.g., ₹"
                    maxLength={3}
                    className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Exchange Rate (1 USD = ?)</label>
                <input
                  type="number"
                  step="0.01"
                  value={currencyForm.rateToUSD}
                  onChange={(e) => setCurrencyForm({ ...currencyForm, rateToUSD: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g., 83.50"
                  className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white"
                />
                <p className="text-gray-500 text-xs mt-1">Base exchange rate without markup</p>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Markup Percentage (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={currencyForm.markup}
                  onChange={(e) => setCurrencyForm({ ...currencyForm, markup: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g., 2.5"
                  className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white"
                />
                <p className="text-gray-500 text-xs mt-1">Additional percentage added to the exchange rate</p>
              </div>

              {/* Preview */}
              <div className="bg-dark-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2">Conversion Preview</p>
                <div className="flex items-center justify-between">
                  <span className="text-white">$100 USD</span>
                  <span className="text-gray-500">→</span>
                  <span className="text-green-400 font-medium">
                    {currencyForm.symbol}{((100 * currencyForm.rateToUSD) * (1 + currencyForm.markup / 100)).toFixed(2)} {currencyForm.currency}
                  </span>
                </div>
                <p className="text-yellow-500 text-xs mt-2">
                  User pays {currencyForm.symbol}{((100 * currencyForm.rateToUSD) * (1 + currencyForm.markup / 100)).toFixed(2)} to deposit $100 USD
                </p>
              </div>

              {/* Active Status */}
              <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                <span className="text-gray-400">Active Status</span>
                <button
                  onClick={() => setCurrencyForm({ ...currencyForm, isActive: !currencyForm.isActive })}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    currencyForm.isActive ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    currencyForm.isActive ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCurrencyModal(false)}
                  className="flex-1 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCurrency}
                  className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
                >
                  {editingCurrency ? 'Update' : 'Add Currency'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Type Selection */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Payment Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Bank Transfer', 'UPI', 'QR Code'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setForm({ ...form, type })}
                      className={`p-3 rounded-lg border text-sm ${
                        form.type === type 
                          ? 'border-blue-500 bg-blue-500/20 text-blue-500' 
                          : 'border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bank Transfer Fields */}
              {form.type === 'Bank Transfer' && (
                <>
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={form.bankName}
                      onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                      placeholder="e.g., HDFC Bank"
                      className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      value={form.accountHolderName}
                      onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })}
                      placeholder="e.g., John Doe"
                      className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Account Number</label>
                      <input
                        type="text"
                        value={form.accountNumber}
                        onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                        placeholder="e.g., 1234567890"
                        className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">IFSC Code</label>
                      <input
                        type="text"
                        value={form.ifscCode}
                        onChange={(e) => setForm({ ...form, ifscCode: e.target.value })}
                        placeholder="e.g., HDFC0001234"
                        className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* UPI Fields */}
              {form.type === 'UPI' && (
                <div>
                  <label className="block text-gray-400 text-sm mb-1">UPI ID</label>
                  <input
                    type="text"
                    value={form.upiId}
                    onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                    placeholder="e.g., yourname@upi"
                    className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white"
                  />
                </div>
              )}

              {/* QR Code Fields */}
              {form.type === 'QR Code' && (
                <div>
                  <label className="block text-gray-400 text-sm mb-2">QR Code Image</label>
                  <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center">
                    {form.qrCodeImage ? (
                      <div className="space-y-3">
                        <img src={form.qrCodeImage} alt="QR Preview" className="w-32 h-32 mx-auto rounded-lg" />
                        <button
                          onClick={() => setForm({ ...form, qrCodeImage: '' })}
                          className="text-red-500 text-sm"
                        >
                          Remove Image
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <Upload size={32} className="mx-auto text-gray-500 mb-2" />
                        <p className="text-gray-400 text-sm">Click to upload QR code image</p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* Active Status */}
              <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                <span className="text-gray-400">Active Status</span>
                <button
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    form.isActive ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    form.isActive ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                >
                  {editingMethod ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default AdminBankSettings
