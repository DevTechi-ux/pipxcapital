import { useState, useEffect } from 'react'
import AdminLayout from '../components/AdminLayout'
import { 
  Copy,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Users,
  TrendingUp,
  DollarSign,
  Star,
  Check,
  X,
  Clock
} from 'lucide-react'
import { API_URL } from '../config/api'

const AdminCopyTrade = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('masters')
  const [masters, setMasters] = useState([])
  const [applications, setApplications] = useState([])
  const [followers, setFollowers] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedMaster, setSelectedMaster] = useState(null)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [approveForm, setApproveForm] = useState({
    approvedCommissionPercentage: 10,
    adminSharePercentage: 30
  })

  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}')

  useEffect(() => {
    fetchDashboard()
    fetchMasters()
    fetchApplications()
    fetchFollowers()
  }, [])

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${API_URL}/copy/admin/dashboard`)
      const data = await res.json()
      setDashboard(data.dashboard)
    } catch (error) {
      console.error('Error fetching dashboard:', error)
    }
  }

  const fetchMasters = async () => {
    try {
      const res = await fetch(`${API_URL}/copy/admin/masters`)
      const data = await res.json()
      setMasters(data.masters || [])
    } catch (error) {
      console.error('Error fetching masters:', error)
    }
    setLoading(false)
  }

  const fetchApplications = async () => {
    try {
      const res = await fetch(`${API_URL}/copy/admin/applications`)
      const data = await res.json()
      setApplications(data.applications || [])
    } catch (error) {
      console.error('Error fetching applications:', error)
    }
  }

  const fetchFollowers = async () => {
    try {
      const res = await fetch(`${API_URL}/copy/admin/followers`)
      const data = await res.json()
      setFollowers(data.followers || [])
    } catch (error) {
      console.error('Error fetching followers:', error)
    }
  }

  const handleApprove = async () => {
    if (!selectedMaster) return
    try {
      const res = await fetch(`${API_URL}/copy/admin/approve/${selectedMaster._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: adminUser._id,
          ...approveForm
        })
      })
      const data = await res.json()
      if (data.master) {
        alert('Master approved successfully!')
        setShowApproveModal(false)
        setSelectedMaster(null)
        fetchMasters()
        fetchApplications()
        fetchDashboard()
      }
    } catch (error) {
      console.error('Error approving master:', error)
      alert('Failed to approve master')
    }
  }

  const handleReject = async (masterId) => {
    const reason = prompt('Enter rejection reason:')
    if (!reason) return
    
    try {
      const res = await fetch(`${API_URL}/copy/admin/reject/${masterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: adminUser._id,
          rejectionReason: reason
        })
      })
      const data = await res.json()
      if (data.master) {
        alert('Master rejected')
        fetchMasters()
        fetchApplications()
        fetchDashboard()
      }
    } catch (error) {
      console.error('Error rejecting master:', error)
    }
  }

  const handleSuspend = async (masterId) => {
    if (!confirm('Are you sure you want to suspend this master?')) return
    
    try {
      const res = await fetch(`${API_URL}/copy/admin/suspend/${masterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: adminUser._id })
      })
      const data = await res.json()
      if (data.master) {
        alert('Master suspended')
        fetchMasters()
        fetchDashboard()
      }
    } catch (error) {
      console.error('Error suspending master:', error)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-500/20 text-green-500'
      case 'PENDING': return 'bg-yellow-500/20 text-yellow-500'
      case 'SUSPENDED': return 'bg-red-500/20 text-red-500'
      case 'REJECTED': return 'bg-gray-500/20 text-gray-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const filteredMasters = masters.filter(m => 
    m.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.userId?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <AdminLayout title="Copy Trade Management" subtitle="Manage master traders and copy trading">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Star size={18} className="text-yellow-500" />
            <p className="text-gray-500 text-sm">Master Traders</p>
          </div>
          <p className="text-white text-2xl font-bold">{dashboard?.masters?.active || 0}</p>
          <p className="text-yellow-500 text-xs">{dashboard?.masters?.pending || 0} pending</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Users size={18} className="text-blue-500" />
            <p className="text-gray-500 text-sm">Total Followers</p>
          </div>
          <p className="text-white text-2xl font-bold">{dashboard?.followers?.active || 0}</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="text-green-500" />
            <p className="text-gray-500 text-sm">Copied Trades</p>
          </div>
          <p className="text-white text-2xl font-bold">{dashboard?.copyTrades?.total || 0}</p>
          <p className="text-blue-500 text-xs">{dashboard?.copyTrades?.open || 0} open</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={18} className="text-purple-500" />
            <p className="text-gray-500 text-sm">Admin Pool</p>
          </div>
          <p className="text-white text-2xl font-bold">${dashboard?.adminPool?.toFixed(2) || '0.00'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        {[
          { key: 'applications', label: `Applications (${applications.length})` },
          { key: 'masters', label: 'All Masters' },
          { key: 'followers', label: 'Followers' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab.key ? 'bg-purple-500 text-white' : 'bg-dark-800 text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Applications Tab */}
      {activeTab === 'applications' && (
        <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-white font-semibold text-lg">Pending Applications</h2>
          </div>
          {applications.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No pending applications</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {applications.map(app => (
                <div key={app._id} className="p-4 hover:bg-dark-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                        <span className="text-yellow-500 font-bold">{app.displayName?.charAt(0)}</span>
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">{app.displayName}</h3>
                        <p className="text-gray-500 text-sm">{app.userId?.firstName} ({app.userId?.email})</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">{app.requestedCommissionPercentage}%</p>
                      <p className="text-gray-500 text-xs">Requested Commission</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 justify-end">
                    <button onClick={() => handleReject(app._id)} className="px-4 py-2 bg-red-500/20 text-red-500 rounded-lg">Reject</button>
                    <button onClick={() => { setSelectedMaster(app); setShowApproveModal(true) }} className="px-4 py-2 bg-green-500 text-white rounded-lg">Approve</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Masters Tab */}
      {activeTab === 'masters' && (
        <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h2 className="text-white font-semibold text-lg">All Masters</h2>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-dark-700 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white" />
            </div>
          </div>

        {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : filteredMasters.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No masters found</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-500 text-sm py-3 px-4">Trader</th>
                  <th className="text-left text-gray-500 text-sm py-3 px-4">User</th>
                  <th className="text-left text-gray-500 text-sm py-3 px-4">Followers</th>
                  <th className="text-left text-gray-500 text-sm py-3 px-4">Commission</th>
                  <th className="text-left text-gray-500 text-sm py-3 px-4">Status</th>
                  <th className="text-left text-gray-500 text-sm py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMasters.map(master => (
                  <tr key={master._id} className="border-b border-gray-800 hover:bg-dark-700/50">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                          <span className="text-purple-500 font-medium">{master.displayName?.charAt(0)}</span>
                        </div>
                        <span className="text-white font-medium">{master.displayName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-white text-sm">{master.userId?.firstName}</p>
                      <p className="text-gray-500 text-xs">{master.userId?.email}</p>
                    </td>
                    <td className="py-4 px-4 text-white">{master.stats?.activeFollowers || 0}</td>
                    <td className="py-4 px-4 text-white">{master.approvedCommissionPercentage || master.requestedCommissionPercentage}%</td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(master.status)}`}>{master.status}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1">
                        {master.status === 'PENDING' && (
                          <>
                            <button onClick={() => { setSelectedMaster(master); setShowApproveModal(true) }} className="p-2 hover:bg-dark-600 rounded-lg text-gray-400 hover:text-green-500" title="Approve"><Check size={16} /></button>
                            <button onClick={() => handleReject(master._id)} className="p-2 hover:bg-dark-600 rounded-lg text-gray-400 hover:text-red-500" title="Reject"><X size={16} /></button>
                          </>
                        )}
                        {master.status === 'ACTIVE' && (
                          <button onClick={() => handleSuspend(master._id)} className="p-2 hover:bg-dark-600 rounded-lg text-gray-400 hover:text-red-500" title="Suspend"><Trash2 size={16} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Followers Tab */}
      {activeTab === 'followers' && (
        <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-white font-semibold text-lg">All Followers</h2>
          </div>
          {followers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No followers yet</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-500 text-sm py-3 px-4">Follower</th>
                  <th className="text-left text-gray-500 text-sm py-3 px-4">Following</th>
                  <th className="text-left text-gray-500 text-sm py-3 px-4">Copy Mode</th>
                  <th className="text-left text-gray-500 text-sm py-3 px-4">Trades</th>
                  <th className="text-left text-gray-500 text-sm py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {followers.map(f => (
                  <tr key={f._id} className="border-b border-gray-800 hover:bg-dark-700/50">
                    <td className="py-4 px-4">
                      <p className="text-white text-sm">{f.followerId?.firstName}</p>
                      <p className="text-gray-500 text-xs">{f.followerId?.email}</p>
                    </td>
                    <td className="py-4 px-4 text-white">{f.masterId?.displayName}</td>
                    <td className="py-4 px-4 text-white">{f.copyMode === 'FIXED_LOT' ? `Fixed: ${f.copyValue}` : `${f.copyValue}x`}</td>
                    <td className="py-4 px-4 text-white">{f.stats?.totalCopiedTrades || 0}</td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${f.status === 'ACTIVE' ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>{f.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedMaster && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Approve: {selectedMaster.displayName}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Commission (%)</label>
                <input type="number" value={approveForm.approvedCommissionPercentage} onChange={(e) => setApproveForm(prev => ({ ...prev, approvedCommissionPercentage: parseFloat(e.target.value) || 0 }))} className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Admin Share (%)</label>
                <input type="number" value={approveForm.adminSharePercentage} onChange={(e) => setApproveForm(prev => ({ ...prev, adminSharePercentage: parseFloat(e.target.value) || 0 }))} className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowApproveModal(false)} className="flex-1 bg-dark-700 text-white py-2 rounded-lg">Cancel</button>
              <button onClick={handleApprove} className="flex-1 bg-green-500 text-white py-2 rounded-lg">Approve</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default AdminCopyTrade
