import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Users,
  LogOut,
  Check,
  X,
  RefreshCw,
  CreditCard,
  Settings,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  XCircle
} from 'lucide-react'
import { API_URL } from '../config/api'

const AdminTransactions = () => {
  const navigate = useNavigate()
  const [activeMenu, setActiveMenu] = useState('Transactions')
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showRemarkModal, setShowRemarkModal] = useState(false)
  const [selectedTx, setSelectedTx] = useState(null)
  const [actionType, setActionType] = useState('')
  const [adminRemarks, setAdminRemarks] = useState('')

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
    fetchTransactions()
  }, [navigate])

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/wallet/admin/transactions`)
      const data = await res.json()
      setTransactions(data.transactions || [])
    } catch (error) {
      console.error('Error:', error)
    }
    setLoading(false)
  }

  const handleAction = async () => {
    if (!selectedTx) return
    try {
      const endpoint = actionType === 'approve' ? 'approve' : 'reject'
      const res = await fetch(`${API_URL}/wallet/transaction/${selectedTx._id}/${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminRemarks })
      })
      if (res.ok) {
        setSuccess(`Transaction ${actionType}d!`)
        setShowRemarkModal(false)
        setSelectedTx(null)
        setAdminRemarks('')
        fetchTransactions()
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (error) {
      setError('Error processing transaction')
    }
  }

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true
    if (filter === 'pending') return tx.status === 'Pending'
    if (filter === 'deposits') return tx.type === 'Deposit'
    if (filter === 'withdrawals') return tx.type === 'Withdrawal'
    return true
  })

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

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
            <h1 className="text-xl font-semibold text-white">Transactions</h1>
            <p className="text-gray-500 text-sm">Manage deposits & withdrawals</p>
          </div>
          <div className="flex gap-2">
            {['all', 'pending', 'deposits', 'withdrawals'].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm capitalize ${filter === f ? 'bg-red-500 text-white' : 'bg-dark-700 text-gray-400'}`}>{f}</button>
            ))}
          </div>
        </header>

        <div className="p-6">
          {success && <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-500 flex items-center gap-2"><Check size={18} /> {success}</div>}
          
          <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">User</th>
                  <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Type</th>
                  <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Amount</th>
                  <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Method</th>
                  <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Status</th>
                  <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Date</th>
                  <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className="text-center py-8"><RefreshCw size={24} className="text-gray-500 animate-spin mx-auto" /></td></tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-8 text-gray-500">No transactions found</td></tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx._id} className="border-b border-gray-800">
                      <td className="py-4 px-4 text-white">{tx.userId?.firstName || tx.userId?.email || 'Unknown'}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {tx.type === 'Deposit' ? <ArrowDownCircle size={16} className="text-green-500" /> : <ArrowUpCircle size={16} className="text-red-500" />}
                          <span className="text-white">{tx.type}</span>
                        </div>
                      </td>
                      <td className={`py-4 px-4 font-medium ${tx.type === 'Deposit' ? 'text-green-500' : 'text-red-500'}`}>${tx.amount}</td>
                      <td className="py-4 px-4 text-gray-400">{tx.paymentMethod}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded text-xs ${tx.status === 'Approved' ? 'bg-green-500/20 text-green-500' : tx.status === 'Rejected' ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/20 text-yellow-500'}`}>{tx.status}</span>
                      </td>
                      <td className="py-4 px-4 text-gray-400 text-sm">{formatDate(tx.createdAt)}</td>
                      <td className="py-4 px-4">
                        {tx.status === 'Pending' && (
                          <div className="flex gap-2">
                            <button onClick={() => { setSelectedTx(tx); setActionType('approve'); setShowRemarkModal(true); }} className="p-2 bg-green-500/20 text-green-500 rounded hover:bg-green-500/30"><Check size={14} /></button>
                            <button onClick={() => { setSelectedTx(tx); setActionType('reject'); setShowRemarkModal(true); }} className="p-2 bg-red-500/20 text-red-500 rounded hover:bg-red-500/30"><X size={14} /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showRemarkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl p-6 w-full max-w-md border border-gray-700 max-h-[90vh] overflow-y-auto">
            <h3 className="text-white font-semibold text-lg mb-4">{actionType === 'approve' ? 'Approve' : 'Reject'} Transaction</h3>
            <p className="text-gray-400 text-sm mb-4">Amount: <span className="text-white font-medium">${selectedTx?.amount}</span></p>
            <label className="block text-gray-400 text-sm mb-2">Admin Remarks (Optional)</label>
            <textarea value={adminRemarks} onChange={(e) => setAdminRemarks(e.target.value)} placeholder="Add remarks..." rows={3} className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setShowRemarkModal(false)} className="flex-1 bg-dark-700 text-white py-3 rounded-lg hover:bg-dark-600">Cancel</button>
              <button onClick={handleAction} className={`flex-1 font-medium py-3 rounded-lg ${actionType === 'approve' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white`}>{actionType === 'approve' ? 'Approve' : 'Reject'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminTransactions
