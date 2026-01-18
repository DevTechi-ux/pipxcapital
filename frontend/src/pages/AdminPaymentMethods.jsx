import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Users,
  LogOut,
  Plus,
  Edit,
  Trash2,
  X,
  Check,
  RefreshCw,
  CreditCard,
  Settings,
  Building,
  Smartphone,
  QrCode
} from 'lucide-react'
import { API_URL } from '../config/api'

const AdminPaymentMethods = () => {
  const navigate = useNavigate()
  const [activeMenu, setActiveMenu] = useState('Payment Methods')
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingMethod, setEditingMethod] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    type: 'Bank Transfer',
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
    ifscCode: '',
    upiId: '',
    qrCodeImage: '',
    isActive: true
  })

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
    { name: 'User Management', icon: Users, path: '/admin/dashboard' },
    { name: 'Account Types', icon: CreditCard, path: '/admin/account-types' },
    { name: 'Transactions', icon: Settings, path: '/admin/transactions' },
    { name: 'Payment Methods', icon: Settings, path: '/admin/payment-methods' },
  ]

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken')
    if (!adminToken) navigate('/admin')
    fetchPaymentMethods()
  }, [navigate])

  const fetchPaymentMethods = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/payment-methods/all`)
      const data = await res.json()
      setPaymentMethods(data.paymentMethods || [])
    } catch (error) {
      console.error('Error:', error)
    }
    setLoading(false)
  }

  const handleSubmit = async () => {
    if (!formData.type) {
      setError('Please select a payment type')
      return
    }

    try {
      const url = editingMethod ? `${API_URL}/payment-methods/${editingMethod._id}` : `${API_URL}/payment-methods`
      const res = await fetch(url, {
        method: editingMethod ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (res.ok) {
        setSuccess(editingMethod ? 'Payment method updated!' : 'Payment method created!')
        setShowModal(false)
        resetForm()
        fetchPaymentMethods()
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (error) {
      setError('Error saving payment method')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this payment method?')) return
    try {
      const res = await fetch(`${API_URL}/payment-methods/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSuccess('Payment method deleted!')
        fetchPaymentMethods()
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (error) {
      setError('Error deleting')
    }
  }

  const handleToggleActive = async (method) => {
    try {
      await fetch(`${API_URL}/payment-methods/${method._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...method, isActive: !method.isActive })
      })
      fetchPaymentMethods()
    } catch (error) {
      setError('Error updating')
    }
  }

  const resetForm = () => {
    setFormData({ type: 'Bank Transfer', bankName: '', accountNumber: '', accountHolderName: '', ifscCode: '', upiId: '', qrCodeImage: '', isActive: true })
    setEditingMethod(null)
    setError('')
  }

  const openEditModal = (method) => {
    setEditingMethod(method)
    setFormData({ ...method })
    setShowModal(true)
  }

  const getIcon = (type) => {
    if (type === 'Bank Transfer') return <Building size={24} />
    if (type === 'UPI') return <Smartphone size={24} />
    return <QrCode size={24} />
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
    navigate('/admin')
  }

  return (
    <div className="min-h-screen bg-dark-900 flex">
      <aside className={`${sidebarExpanded ? 'w-52' : 'w-16'} bg-dark-900 border-r border-gray-800 flex flex-col transition-all duration-300`} onMouseEnter={() => setSidebarExpanded(true)} onMouseLeave={() => setSidebarExpanded(false)}>
        <div className="p-4 flex items-center justify-center gap-2">
          <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center"><span className="text-white font-bold text-sm">A</span></div>
          {sidebarExpanded && <span className="text-white font-semibold">Admin</span>}
        </div>
        <nav className="flex-1 px-2">
          {menuItems.map((item) => (
            <button key={item.name} onClick={() => navigate(item.path)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${activeMenu === item.name ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-white hover:bg-dark-700'}`}>
              <item.icon size={18} className="flex-shrink-0" />
              {sidebarExpanded && <span className="text-sm font-medium whitespace-nowrap">{item.name}</span>}
            </button>
          ))}
        </nav>
        <div className="p-2 border-t border-gray-800">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:text-white transition-colors rounded-lg">
            <LogOut size={18} />
            {sidebarExpanded && <span className="text-sm font-medium">Log Out</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h1 className="text-xl font-semibold text-white">Payment Methods</h1>
            <p className="text-gray-500 text-sm">Manage deposit/withdrawal methods</p>
          </div>
          <button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">
            <Plus size={18} /> Add Method
          </button>
        </header>

        <div className="p-6">
          {success && <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-500 flex items-center gap-2"><Check size={18} /> {success}</div>}
          
          {loading ? (
            <div className="flex items-center justify-center py-8"><RefreshCw size={24} className="text-gray-500 animate-spin" /></div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {paymentMethods.map((method) => (
                <div key={method._id} className={`bg-dark-800 rounded-xl p-5 border ${method.isActive ? 'border-gray-800' : 'border-red-500/30 opacity-60'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-dark-700 rounded-lg flex items-center justify-center text-gray-400">{getIcon(method.type)}</div>
                      <div>
                        <h3 className="text-white font-semibold">{method.type}</h3>
                        <span className={`text-xs ${method.isActive ? 'text-green-500' : 'text-red-500'}`}>{method.isActive ? 'Active' : 'Disabled'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm mb-4">
                    {method.type === 'Bank Transfer' && (
                      <>
                        <p className="text-gray-400">Bank: <span className="text-white">{method.bankName || 'N/A'}</span></p>
                        <p className="text-gray-400">Account: <span className="text-white">{method.accountNumber || 'N/A'}</span></p>
                        <p className="text-gray-400">Name: <span className="text-white">{method.accountHolderName || 'N/A'}</span></p>
                      </>
                    )}
                    {method.type === 'UPI' && <p className="text-gray-400">UPI ID: <span className="text-white">{method.upiId || 'N/A'}</span></p>}
                    {method.type === 'QR Code' && <p className="text-gray-400">QR: <span className="text-white">{method.qrCodeImage ? 'Uploaded' : 'Not set'}</span></p>}
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => openEditModal(method)} className="flex-1 flex items-center justify-center gap-1 bg-dark-700 text-white py-2 rounded-lg hover:bg-dark-600 text-sm"><Edit size={14} /> Edit</button>
                    <button onClick={() => handleToggleActive(method)} className={`flex-1 py-2 rounded-lg text-sm ${method.isActive ? 'bg-orange-500/20 text-orange-500' : 'bg-green-500/20 text-green-500'}`}>{method.isActive ? 'Disable' : 'Enable'}</button>
                    <button onClick={() => handleDelete(method._id)} className="p-2 bg-red-500/20 text-red-500 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              {paymentMethods.length === 0 && (
                <div className="col-span-3 bg-dark-800 rounded-xl p-8 border border-gray-800 text-center">
                  <CreditCard size={48} className="text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500">No payment methods added yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl p-6 w-full max-w-md border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold text-lg">{editingMethod ? 'Edit' : 'Add'} Payment Method</h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Type</label>
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none">
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="QR Code">QR Code</option>
                </select>
              </div>

              {formData.type === 'Bank Transfer' && (
                <>
                  <input type="text" value={formData.bankName} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })} placeholder="Bank Name" className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none" />
                  <input type="text" value={formData.accountNumber} onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })} placeholder="Account Number" className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none" />
                  <input type="text" value={formData.accountHolderName} onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })} placeholder="Account Holder Name" className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none" />
                  <input type="text" value={formData.ifscCode} onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })} placeholder="IFSC Code" className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none" />
                </>
              )}

              {formData.type === 'UPI' && (
                <input type="text" value={formData.upiId} onChange={(e) => setFormData({ ...formData, upiId: e.target.value })} placeholder="UPI ID (e.g., name@upi)" className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none" />
              )}

              {formData.type === 'QR Code' && (
                <input type="text" value={formData.qrCodeImage} onChange={(e) => setFormData({ ...formData, qrCodeImage: e.target.value })} placeholder="QR Code Image URL" className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none" />
              )}
            </div>

            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 bg-dark-700 text-white py-3 rounded-lg hover:bg-dark-600">Cancel</button>
              <button onClick={handleSubmit} className="flex-1 bg-red-500 text-white font-medium py-3 rounded-lg hover:bg-red-600">{editingMethod ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPaymentMethods
