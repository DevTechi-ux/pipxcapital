import { useState, useEffect } from 'react'
import AdminLayout from '../components/AdminLayout'
import { 
  HeadphonesIcon,
  Search,
  Eye,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Calendar,
  Send,
  X
} from 'lucide-react'
import { API_URL } from '../config/api'

const AdminSupport = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [tickets, setTickets] = useState([])
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0 })
  const [loading, setLoading] = useState(true)
  const [replyMessage, setReplyMessage] = useState('')
  const [sendingReply, setSendingReply] = useState(false)

  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}')

  useEffect(() => {
    fetchTickets()
    fetchStats()
  }, [filterStatus])

  const fetchTickets = async () => {
    try {
      const statusParam = filterStatus !== 'all' ? `?status=${filterStatus.toUpperCase()}` : ''
      const res = await fetch(`${API_URL}/support/admin/all${statusParam}`)
      const data = await res.json()
      setTickets(data.tickets || [])
    } catch (error) {
      console.error('Error fetching tickets:', error)
    }
    setLoading(false)
  }

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/support/admin/stats`)
      const data = await res.json()
      if (data.stats) setStats(data.stats)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const openTicketChat = async (ticketId) => {
    try {
      const res = await fetch(`${API_URL}/support/ticket/${ticketId}`)
      const data = await res.json()
      if (data.success) {
        setSelectedTicket(data.ticket)
      }
    } catch (error) {
      console.error('Error fetching ticket:', error)
    }
  }

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) return

    setSendingReply(true)
    try {
      const res = await fetch(`${API_URL}/support/reply/${selectedTicket.ticketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: selectedTicket.userId?._id || selectedTicket.userId,
          senderType: 'ADMIN',
          senderName: adminUser?.username || adminUser?.email || 'Support Team',
          message: replyMessage
        })
      })
      const data = await res.json()
      if (data.success) {
        setSelectedTicket(data.ticket)
        setReplyMessage('')
        fetchTickets()
      } else {
        alert(data.message || 'Failed to send reply')
      }
    } catch (error) {
      console.error('Error sending reply:', error)
      alert('Failed to send reply')
    }
    setSendingReply(false)
  }

  const updateTicketStatus = async (ticketId, status) => {
    try {
      const res = await fetch(`${API_URL}/support/admin/status/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      const data = await res.json()
      if (data.success) {
        fetchTickets()
        fetchStats()
        if (selectedTicket?.ticketId === ticketId) {
          setSelectedTicket(data.ticket)
        }
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN': return 'bg-red-500/20 text-red-500'
      case 'IN_PROGRESS': return 'bg-yellow-500/20 text-yellow-500'
      case 'WAITING_USER': return 'bg-orange-500/20 text-orange-500'
      case 'RESOLVED': return 'bg-green-500/20 text-green-500'
      case 'CLOSED': return 'bg-gray-500/20 text-gray-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500/20 text-red-500'
      case 'HIGH': return 'bg-orange-500/20 text-orange-500'
      case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-500'
      case 'LOW': return 'bg-blue-500/20 text-blue-500'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'OPEN': return <AlertCircle size={14} />
      case 'IN_PROGRESS': return <Clock size={14} />
      case 'WAITING_USER': return <Clock size={14} />
      case 'RESOLVED': return <CheckCircle size={14} />
      case 'CLOSED': return <CheckCircle size={14} />
      default: return null
    }
  }

  const filteredTickets = tickets.filter(ticket => {
    const userName = ticket.userId?.firstName || ''
    const userEmail = ticket.userId?.email || ''
    const matchesSearch = userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.ticketId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         userEmail.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  return (
    <AdminLayout title="Support Tickets" subtitle="Manage customer support requests">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <HeadphonesIcon size={18} className="text-blue-500" />
            <p className="text-gray-500 text-sm">Total Tickets</p>
          </div>
          <p className="text-white text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={18} className="text-red-500" />
            <p className="text-gray-500 text-sm">Open</p>
          </div>
          <p className="text-white text-2xl font-bold">{stats.open}</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={18} className="text-yellow-500" />
            <p className="text-gray-500 text-sm">In Progress</p>
          </div>
          <p className="text-white text-2xl font-bold">{stats.inProgress}</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={18} className="text-green-500" />
            <p className="text-gray-500 text-sm">Resolved</p>
          </div>
          <p className="text-white text-2xl font-bold">{stats.resolved}</p>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 border-b border-gray-800">
          <h2 className="text-white font-semibold text-lg">Support Tickets</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search tickets..."
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
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_USER">Waiting User</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="block lg:hidden p-4 space-y-3">
          {filteredTickets.map((ticket) => (
            <div key={ticket._id} className="bg-dark-700 rounded-xl p-4 border border-gray-700">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-gray-500 text-sm font-mono">{ticket.ticketId}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </div>
                  <p className="text-white font-medium">{ticket.subject}</p>
                </div>
                <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(ticket.status)}`}>
                  {getStatusIcon(ticket.status)}
                  {ticket.status.replace('_', ' ')}
                </span>
              </div>
              <div className="space-y-2 text-sm mb-3">
                <div className="flex items-center gap-2 text-gray-400">
                  <User size={14} />
                  <span>{ticket.userId?.firstName || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Calendar size={14} />
                  <span>{new Date(ticket.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <MessageSquare size={14} />
                  <span>{ticket.messages?.length || 0} messages</span>
                </div>
              </div>
              <div className="flex gap-2 pt-3 border-t border-gray-600">
                <button 
                  onClick={() => openTicketChat(ticket.ticketId)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-500/20 text-blue-500 rounded-lg text-sm"
                >
                  <Eye size={14} /> View
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Ticket ID</th>
                <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">User</th>
                <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Subject</th>
                <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Priority</th>
                <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Status</th>
                <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Created</th>
                <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-gray-500">
                    {loading ? 'Loading tickets...' : 'No tickets found'}
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr key={ticket._id} className="border-b border-gray-800 hover:bg-dark-700/50 cursor-pointer" onClick={() => openTicketChat(ticket.ticketId)}>
                    <td className="py-4 px-4 text-white font-mono text-sm">{ticket.ticketId}</td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="text-white font-medium">{ticket.userId?.firstName || 'Unknown'}</p>
                        <p className="text-gray-500 text-sm">{ticket.userId?.email || ''}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-white">{ticket.subject}</span>
                        <span className="text-gray-500 text-sm">({ticket.messages?.length || 0})</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs w-fit ${getStatusColor(ticket.status)}`}>
                        {getStatusIcon(ticket.status)}
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-400">{new Date(ticket.createdAt).toLocaleString()}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => openTicketChat(ticket.ticketId)}
                          className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-white" 
                          title="View Ticket"
                        >
                          <Eye size={16} />
                        </button>
                        {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
                          <button 
                            onClick={() => updateTicketStatus(ticket.ticketId, 'RESOLVED')}
                            className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-green-500" 
                            title="Mark Resolved"
                          >
                            <CheckCircle size={16} />
                          </button>
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

      {/* Chat Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-gray-700">
            {/* Header */}
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold">{selectedTicket.subject}</h3>
                <p className="text-gray-500 text-sm">
                  #{selectedTicket.ticketId} • {selectedTicket.userId?.firstName} ({selectedTicket.userId?.email})
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={selectedTicket.status}
                  onChange={(e) => updateTicketStatus(selectedTicket.ticketId, e.target.value)}
                  className={`px-2 py-1 rounded text-xs border-0 ${getStatusColor(selectedTicket.status)}`}
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="WAITING_USER">Waiting User</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
                <button 
                  onClick={() => setSelectedTicket(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedTicket.messages?.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${msg.sender === 'ADMIN' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-lg p-3 ${
                    msg.sender === 'ADMIN' 
                      ? 'bg-red-500/20 text-white' 
                      : 'bg-dark-700 text-white'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium ${
                        msg.sender === 'ADMIN' ? 'text-red-400' : 'text-blue-400'
                      }`}>
                        {msg.sender === 'ADMIN' ? 'Support' : msg.senderName || 'User'}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {new Date(msg.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply Input */}
            {selectedTicket.status !== 'CLOSED' && (
              <div className="p-4 border-t border-gray-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your reply..."
                    className="flex-1 bg-dark-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendReply()}
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={sendingReply || !replyMessage.trim()}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Send size={16} />
                    {sendingReply ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default AdminSupport
