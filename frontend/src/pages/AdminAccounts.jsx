import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Users,
  LogOut,
  RefreshCw,
  CreditCard,
  Settings,
  Search,
  Eye,
  Edit,
  Lock,
  X,
  Check,
  Ban
} from 'lucide-react'
import { API_URL } from '../config/api'

const AdminAccounts = () => {
  const navigate = useNavigate()
  const [activeMenu, setActiveMenu] = useState('Accounts')
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showResetPinModal, setShowResetPinModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editForm, setEditForm] = useState({
    leverage: '',
    exposureLimit: '',
    status: ''
  })
  const [newPin, setNewPin] = useState('')

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
    { name: 'User Management', icon: Users, path: '/admin/dashboard' },
    { name: 'Accounts', icon: CreditCard, path: '/admin/accounts' },
    { name: 'Account Types', icon: CreditCard, path: '/admin/account-types' },
    { name: 'Transactions', icon: Settings, path: '/admin/transactions' },
    { name: 'Payment Methods', icon: Settings, path: '/admin/payment-methods' },
  ]

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken')
    if (!adminToken) navigate('/admin')
    fetchAccounts()
  }, [navigate])

  const fetchAccounts = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/trading-accounts/all`)
      const data = await res.json()
      setAccounts(data.accounts || [])
    } catch (error) {
      console.error('Error:', error)
    }
    setLoading(false)
  }

  const handleUpdateAccount = async () => {
    if (!selectedAccount) return
    try {
      const res = await fetch(`${API_URL}/trading-accounts/${selectedAccount._id}/admin-update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })
      if (res.ok) {
        setSuccess('Account updated successfully!')
        setShowEditModal(false)
        setSelectedAccount(null)
        fetchAccounts()
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (error) {
      setError('Error updating account')
    }
  }

  const handleResetPin = async () => {
    if (!selectedAccount || !newPin || newPin.length !== 4) {
      setError('PIN must be exactly 4 digits')
      return
    }
    try {
      const res = await fetch(`${API_URL}/trading-accounts/${selectedAccount._id}/reset-pin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPin })
      })
      if (res.ok) {
        setSuccess('PIN reset successfully!')
        setShowResetPinModal(false)
        setSelectedAccount(null)
        setNewPin('')
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (error) {
      setError('Error resetting PIN')
    }
  }

  const openEditModal = (account) => {
    setSelectedAccount(account)
    setEditForm({
      leverage: account.leverage,
      exposureLimit: account.exposureLimit?.toString() || '0',
      status: account.status
    })
    setShowEditModal(true)
    setError('')
  }

  const filteredAccounts = accounts.filter(acc => 
    acc.accountId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.userId?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
            <h1 className="text-xl font-semibold text-white">Account Management</h1>
            <p className="text-gray-500 text-sm">Manage all user trading accounts</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-dark-700 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 w-64"
              />
            </div>
            <button onClick={fetchAccounts} className="p-2 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors">
              <RefreshCw size={18} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        <div className="p-6">
          {success && <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-500 flex items-center gap-2"><Check size={18} /> {success}</div>}
          {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-500">{error}</div>}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-dark-800 rounded-xl p-4 border border-gray-800">
              <p className="text-gray-500 text-sm">Total Accounts</p>
              <p className="text-white text-2xl font-bold">{accounts.length}</p>
            </div>
            <div className="bg-dark-800 rounded-xl p-4 border border-gray-800">
              <p className="text-gray-500 text-sm">Active</p>
              <p className="text-green-500 text-2xl font-bold">{accounts.filter(a => a.status === 'Active').length}</p>
            </div>
            <div className="bg-dark-800 rounded-xl p-4 border border-gray-800">
              <p className="text-gray-500 text-sm">Suspended</p>
              <p className="text-red-500 text-2xl font-bold">{accounts.filter(a => a.status === 'Suspended').length}</p>
            </div>
            <div className="bg-dark-800 rounded-xl p-4 border border-gray-800">
              <p className="text-gray-500 text-sm">Total Balance</p>
              <p className="text-white text-2xl font-bold">${accounts.reduce((sum, a) => sum + (a.balance || 0), 0).toLocaleString()}</p>
            </div>
          </div>

          {/* Accounts Table */}
          <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Account ID</th>
                  <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">User</th>
                  <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Type</th>
                  <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Balance</th>
                  <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Leverage</th>
                  <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Status</th>
                  <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className="text-center py-8"><RefreshCw size={24} className="text-gray-500 animate-spin mx-auto" /></td></tr>
                ) : filteredAccounts.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-8 text-gray-500">{searchTerm ? 'No accounts found' : 'No trading accounts yet'}</td></tr>
                ) : (
                  filteredAccounts.map((account) => (
                    <tr key={account._id} className="border-b border-gray-800 hover:bg-dark-700/50">
                      <td className="py-4 px-4">
                        <span className="text-accent-green font-mono text-sm">{account.accountId}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="text-white font-medium">{account.userId?.firstName || 'Unknown'}</p>
                          <p className="text-gray-500 text-sm">{account.userId?.email}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-400">{account.accountTypeId?.name || 'N/A'}</td>
                      <td className="py-4 px-4 text-white font-medium">${account.balance?.toLocaleString() || 0}</td>
                      <td className="py-4 px-4 text-gray-400">{account.leverage}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          account.status === 'Active' ? 'bg-green-500/20 text-green-500' :
                          account.status === 'Suspended' ? 'bg-red-500/20 text-red-500' :
                          'bg-gray-500/20 text-gray-500'
                        }`}>
                          {account.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEditModal(account)} className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-white" title="Edit">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => { setSelectedAccount(account); setShowResetPinModal(true); setError(''); }} className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-yellow-500" title="Reset PIN">
                            <Lock size={16} />
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
      </main>

      {/* Edit Account Modal */}
      {showEditModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold text-lg">Edit Account</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>

            <div className="mb-4 p-3 bg-dark-700 rounded-lg">
              <p className="text-gray-400 text-sm">Account ID</p>
              <p className="text-accent-green font-mono">{selectedAccount.accountId}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Leverage</label>
                <select value={editForm.leverage} onChange={(e) => setEditForm({ ...editForm, leverage: e.target.value })} className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none">
                  <option value="1:50">1:50</option>
                  <option value="1:100">1:100</option>
                  <option value="1:200">1:200</option>
                  <option value="1:500">1:500</option>
                  <option value="1:1000">1:1000</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Exposure Limit ($)</label>
                <input type="number" value={editForm.exposureLimit} onChange={(e) => setEditForm({ ...editForm, exposureLimit: e.target.value })} className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none" />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Status</label>
                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none">
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowEditModal(false)} className="flex-1 bg-dark-700 text-white py-3 rounded-lg hover:bg-dark-600">Cancel</button>
              <button onClick={handleUpdateAccount} className="flex-1 bg-red-500 text-white font-medium py-3 rounded-lg hover:bg-red-600">Update</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset PIN Modal */}
      {showResetPinModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold text-lg">Reset Account PIN</h3>
              <button onClick={() => { setShowResetPinModal(false); setNewPin(''); }} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>

            <div className="mb-4 p-3 bg-dark-700 rounded-lg">
              <p className="text-gray-400 text-sm">Account ID</p>
              <p className="text-accent-green font-mono">{selectedAccount.accountId}</p>
              <p className="text-gray-500 text-sm mt-1">User: {selectedAccount.userId?.firstName || selectedAccount.userId?.email}</p>
            </div>

            <div className="mb-6">
              <label className="block text-gray-400 text-sm mb-2">New 4-digit PIN</label>
              <input
                type="text"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter new PIN"
                className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white text-center text-2xl tracking-widest focus:outline-none focus:border-red-500"
              />
            </div>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => { setShowResetPinModal(false); setNewPin(''); }} className="flex-1 bg-dark-700 text-white py-3 rounded-lg hover:bg-dark-600">Cancel</button>
              <button onClick={handleResetPin} className="flex-1 bg-red-500 text-white font-medium py-3 rounded-lg hover:bg-red-600">Reset PIN</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminAccounts
