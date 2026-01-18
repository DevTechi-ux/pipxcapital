import { useState, useEffect } from 'react'
import AdminLayout from '../components/AdminLayout'
import { 
  FileCheck,
  Search,
  Eye,
  Check,
  X,
  Clock,
  Download,
  User,
  FileText,
  Calendar
} from 'lucide-react'
import { API_URL } from '../config/api'

const AdminKYC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [kycRequests, setKycRequests] = useState([])
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedKyc, setSelectedKyc] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchKycRequests()
  }, [filterStatus])

  const fetchKycRequests = async () => {
    try {
      const res = await fetch(`${API_URL}/kyc/all?status=${filterStatus}`)
      const data = await res.json()
      if (data.success) {
        setKycRequests(data.kycList || [])
        setStats(data.stats || { total: 0, pending: 0, approved: 0, rejected: 0 })
      }
    } catch (error) {
      console.error('Error fetching KYC requests:', error)
    }
    setLoading(false)
  }

  const handleApprove = async (kycId) => {
    setActionLoading(true)
    try {
      const res = await fetch(`${API_URL}/kyc/approve/${kycId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await res.json()
      if (data.success) {
        alert('KYC approved successfully')
        fetchKycRequests()
        setShowViewModal(false)
      } else {
        alert(data.message || 'Failed to approve KYC')
      }
    } catch (error) {
      console.error('Error approving KYC:', error)
      alert('Failed to approve KYC')
    }
    setActionLoading(false)
  }

  const handleReject = async () => {
    if (!selectedKyc) return
    setActionLoading(true)
    try {
      const res = await fetch(`${API_URL}/kyc/reject/${selectedKyc._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason || 'Documents not acceptable' })
      })
      const data = await res.json()
      if (data.success) {
        alert('KYC rejected')
        fetchKycRequests()
        setShowRejectModal(false)
        setShowViewModal(false)
        setRejectReason('')
      } else {
        alert(data.message || 'Failed to reject KYC')
      }
    } catch (error) {
      console.error('Error rejecting KYC:', error)
      alert('Failed to reject KYC')
    }
    setActionLoading(false)
  }

  const viewKycDetails = async (kyc) => {
    setSelectedKyc(kyc)
    setShowViewModal(true)
  }

  const formatDocType = (type) => {
    return type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown'
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-500/20 text-green-500'
      case 'pending': return 'bg-yellow-500/20 text-yellow-500'
      case 'rejected': return 'bg-red-500/20 text-red-500'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <Check size={14} />
      case 'pending': return <Clock size={14} />
      case 'rejected': return <X size={14} />
      default: return null
    }
  }

  const filteredRequests = kycRequests.filter(req => {
    const userName = req.user?.name || ''
    const userEmail = req.user?.email || ''
    const matchesSearch = userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         userEmail.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  return (
    <AdminLayout title="KYC Verification" subtitle="Verify user identity documents">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <FileCheck size={18} className="text-blue-500" />
            <p className="text-gray-500 text-sm">Total Submissions</p>
          </div>
          <p className="text-white text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={18} className="text-yellow-500" />
            <p className="text-gray-500 text-sm">Pending Review</p>
          </div>
          <p className="text-white text-2xl font-bold">{stats.pending}</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Check size={18} className="text-green-500" />
            <p className="text-gray-500 text-sm">Approved</p>
          </div>
          <p className="text-white text-2xl font-bold">{stats.approved}</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <X size={18} className="text-red-500" />
            <p className="text-gray-500 text-sm">Rejected</p>
          </div>
          <p className="text-white text-2xl font-bold">{stats.rejected}</p>
        </div>
      </div>

      {/* KYC List */}
      <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 border-b border-gray-800">
          <h2 className="text-white font-semibold text-lg">KYC Requests</h2>
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
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-dark-700 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-gray-600"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="block lg:hidden p-4 space-y-3">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No KYC requests found</div>
          ) : (
            filteredRequests.map((req) => (
              <div key={req._id} className="bg-dark-700 rounded-xl p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <User size={18} className="text-blue-500" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{req.user?.name || 'Unknown'}</p>
                      <p className="text-gray-500 text-sm">{req.user?.email || 'N/A'}</p>
                    </div>
                  </div>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(req.status)}`}>
                    {getStatusIcon(req.status)}
                    {req.status}
                  </span>
                </div>
                <div className="space-y-2 text-sm mb-3">
                  <div className="flex items-center gap-2 text-gray-400">
                    <FileText size={14} />
                    <span>{formatDocType(req.documentType)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Calendar size={14} />
                    <span>{new Date(req.submittedAt).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-3 border-t border-gray-600">
                  <button 
                    onClick={() => viewKycDetails(req)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-500/20 text-blue-500 rounded-lg text-sm"
                  >
                    <Eye size={14} /> View
                  </button>
                  {req.status === 'pending' && (
                    <>
                      <button 
                        onClick={() => handleApprove(req._id)}
                        className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-500/20 text-green-500 rounded-lg text-sm"
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button 
                        onClick={() => { setSelectedKyc(req); setShowRejectModal(true) }}
                        className="flex-1 flex items-center justify-center gap-1 py-2 bg-red-500/20 text-red-500 rounded-lg text-sm"
                      >
                        <X size={14} /> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">User</th>
                <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Document Type</th>
                <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Submitted</th>
                <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Status</th>
                <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : filteredRequests.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-8 text-gray-400">No KYC requests found</td></tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req._id} className="border-b border-gray-800 hover:bg-dark-700/50">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                          <User size={18} className="text-blue-500" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{req.user?.name || 'Unknown'}</p>
                          <p className="text-gray-500 text-sm">{req.user?.email || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-white">{formatDocType(req.documentType)}</td>
                    <td className="py-4 px-4 text-gray-400">{new Date(req.submittedAt).toLocaleString()}</td>
                    <td className="py-4 px-4">
                      <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs w-fit ${getStatusColor(req.status)}`}>
                        {getStatusIcon(req.status)}
                        {req.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => viewKycDetails(req)}
                          className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-white" 
                          title="View Documents"
                        >
                          <Eye size={16} />
                        </button>
                        {req.status === 'pending' && (
                          <>
                            <button 
                              onClick={() => handleApprove(req._id)}
                              className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-green-500" 
                              title="Approve"
                            >
                              <Check size={16} />
                            </button>
                            <button 
                              onClick={() => { setSelectedKyc(req); setShowRejectModal(true) }}
                              className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-red-500" 
                              title="Reject"
                            >
                              <X size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View KYC Modal */}
      {showViewModal && selectedKyc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-white font-semibold text-lg">KYC Documents</h3>
              <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-dark-700 rounded-lg">
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* User Info */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <User size={24} className="text-blue-500" />
                </div>
                <div>
                  <p className="text-white font-medium">{selectedKyc.user?.name || 'Unknown'}</p>
                  <p className="text-gray-400 text-sm">{selectedKyc.user?.email}</p>
                </div>
                <span className={`ml-auto px-3 py-1 rounded-full text-sm ${getStatusColor(selectedKyc.status)}`}>
                  {selectedKyc.status}
                </span>
              </div>

              {/* Document Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Document Type</p>
                  <p className="text-white">{formatDocType(selectedKyc.documentType)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Document Number</p>
                  <p className="text-white">{selectedKyc.documentNumber}</p>
                </div>
              </div>

              {/* Document Images */}
              <div className="space-y-4">
                {selectedKyc.frontImage && (
                  <div>
                    <p className="text-gray-400 text-sm mb-2">Front Side</p>
                    <img src={selectedKyc.frontImage} alt="Front" className="max-w-full rounded-lg border border-gray-700" />
                  </div>
                )}
                {selectedKyc.backImage && (
                  <div>
                    <p className="text-gray-400 text-sm mb-2">Back Side</p>
                    <img src={selectedKyc.backImage} alt="Back" className="max-w-full rounded-lg border border-gray-700" />
                  </div>
                )}
                {selectedKyc.selfieImage && (
                  <div>
                    <p className="text-gray-400 text-sm mb-2">Selfie with Document</p>
                    <img src={selectedKyc.selfieImage} alt="Selfie" className="max-w-full rounded-lg border border-gray-700" />
                  </div>
                )}
              </div>

              {/* Actions */}
              {selectedKyc.status === 'pending' && (
                <div className="flex gap-3 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => handleApprove(selectedKyc._id)}
                    disabled={actionLoading}
                    className="flex-1 py-3 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 disabled:opacity-50"
                  >
                    {actionLoading ? 'Processing...' : 'Approve KYC'}
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={actionLoading}
                    className="flex-1 py-3 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 disabled:opacity-50"
                  >
                    Reject KYC
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-dark-800 rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-white font-semibold text-lg">Reject KYC</h3>
            </div>
            <div className="p-6">
              <label className="text-gray-400 text-sm mb-2 block">Rejection Reason</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                rows={3}
                className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-3 text-white resize-none"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => { setShowRejectModal(false); setRejectReason('') }}
                  className="flex-1 py-3 bg-dark-700 text-white rounded-lg hover:bg-dark-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="flex-1 py-3 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 disabled:opacity-50"
                >
                  {actionLoading ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default AdminKYC
