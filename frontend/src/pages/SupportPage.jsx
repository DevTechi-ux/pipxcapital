import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, User, Wallet, Users, Copy, UserCircle, HelpCircle, FileText, LogOut,
  MessageCircle, Send, Clock, CheckCircle, AlertCircle, Plus, Trophy, ArrowLeft, Home, Sun, Moon
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { API_URL } from '../config/api'
import logoImage from "../assets/Pipxcapital.png";

const SupportPage = () => {
  const navigate = useNavigate()
  const { isDarkMode, toggleDarkMode } = useTheme()
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState('new')
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState('general')
  const [submitting, setSubmitting] = useState(false)
  const [challengeModeEnabled, setChallengeModeEnabled] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [replyMessage, setReplyMessage] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  const user = JSON.parse(localStorage.getItem('user') || '{}')

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

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    fetchChallengeStatus()
    fetchTickets()
  }, [])

  const fetchChallengeStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/prop/status`)
      const data = await res.json()
      if (data.success) setChallengeModeEnabled(data.enabled)
    } catch (error) {}
  }

  const fetchTickets = async () => {
    try {
      const res = await fetch(`${API_URL}/support/user/${user._id}`)
      const data = await res.json()
      setTickets(data.tickets || [])
    } catch (error) {
      console.error('Error fetching tickets:', error)
    }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!subject || !message) {
      alert('Please fill in all fields')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/support/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user._id,
          subject,
          message,
          category: category.toUpperCase()
        })
      })
      const data = await res.json()
      if (data.success) {
        alert('Ticket submitted successfully!')
        setSubject('')
        setMessage('')
        setCategory('general')
        setActiveTab('history')
        fetchTickets()
      } else {
        alert(data.message || 'Failed to submit ticket')
      }
    } catch (error) {
      console.error('Error submitting ticket:', error)
      alert('Failed to submit ticket')
    }
    setSubmitting(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/user/login')
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'OPEN': return <Clock size={16} className="text-yellow-500" />
      case 'IN_PROGRESS': return <AlertCircle size={16} className="text-blue-500" />
      case 'WAITING_USER': return <AlertCircle size={16} className="text-orange-500" />
      case 'RESOLVED': return <CheckCircle size={16} className="text-green-500" />
      case 'CLOSED': return <CheckCircle size={16} className="text-gray-500" />
      default: return <Clock size={16} className="text-gray-500" />
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
          senderId: user._id,
          senderType: 'USER',
          message: replyMessage
        })
      })
      const data = await res.json()
      if (data.success) {
        setSelectedTicket(data.ticket)
        setReplyMessage('')
        fetchTickets()
      }
    } catch (error) {
      console.error('Error sending reply:', error)
    }
    setSendingReply(false)
  }

  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-300 ${isDarkMode ? 'bg-dark-900' : 'bg-gray-100'}`}>
      {/* Mobile Header */}
      {isMobile && (
        <header className={`fixed top-0 left-0 right-0 z-40 px-4 py-3 flex items-center gap-4 ${isDarkMode ? 'bg-dark-800 border-b border-gray-800' : 'bg-white border-b border-gray-200'}`}>
          <button onClick={() => navigate('/mobile')} className={`p-2 -ml-2 rounded-lg ${isDarkMode ? 'hover:bg-dark-700' : 'hover:bg-gray-100'}`}>
            <ArrowLeft size={22} className={isDarkMode ? 'text-white' : 'text-gray-900'} />
          </button>
          <h1 className={`font-semibold text-lg flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Support</h1>
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
                  item.name === 'Support' ? 'bg-accent-green text-black' : isDarkMode ? 'text-gray-400 hover:text-white hover:bg-dark-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
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
            <h1 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Support</h1>
          </header>
        )}

        <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
          {/* Tabs */}
          <div className={`flex ${isMobile ? 'gap-2' : 'gap-4'} mb-4`}>
            <button
              onClick={() => setActiveTab('new')}
              className={`flex items-center gap-2 ${isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-2'} rounded-lg font-medium transition-colors ${
                activeTab === 'new' ? 'bg-accent-green text-black' : isDarkMode ? 'bg-dark-800 text-gray-400 hover:text-white' : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
              }`}
            >
              <Plus size={isMobile ? 14 : 16} />
              New Ticket
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 ${isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-2'} rounded-lg font-medium transition-colors ${
                activeTab === 'history' ? 'bg-accent-green text-black' : isDarkMode ? 'bg-dark-800 text-gray-400 hover:text-white' : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
              }`}
            >
              <MessageCircle size={isMobile ? 14 : 16} />
              Tickets ({tickets.length})
            </button>
          </div>

          {activeTab === 'new' ? (
            <div className={isMobile ? '' : 'max-w-2xl'}>
              <div className={`${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} rounded-xl ${isMobile ? 'p-4' : 'p-6'} border`}>
                <h2 className={`font-semibold ${isMobile ? 'mb-4 text-sm' : 'mb-6'} ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Submit a Support Ticket</h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className={`text-sm mb-2 block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className={`w-full rounded-lg px-4 py-2 border ${isDarkMode ? 'bg-dark-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    >
                      <option value="general">General Inquiry</option>
                      <option value="deposit">Deposit Issue</option>
                      <option value="withdrawal">Withdrawal Issue</option>
                      <option value="trading">Trading Issue</option>
                      <option value="account">Account Issue</option>
                      <option value="technical">Technical Problem</option>
                    </select>
                  </div>

                  <div>
                    <label className={`text-sm mb-2 block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Subject</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Brief description of your issue"
                      className={`w-full rounded-lg px-4 py-2 border ${isDarkMode ? 'bg-dark-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    />
                  </div>

                  <div>
                    <label className={`text-sm mb-2 block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Message</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe your issue in detail..."
                      rows={6}
                      className={`w-full rounded-lg px-4 py-2 border resize-none ${isDarkMode ? 'bg-dark-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-accent-green text-black py-3 rounded-lg font-medium hover:bg-accent-green/90 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Send size={16} />
                    {submitting ? 'Submitting...' : 'Submit Ticket'}
                  </button>
                </form>
              </div>

              {/* FAQ Section */}
              <div className={`${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} rounded-xl p-6 border mt-6`}>
                <h3 className={`font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Frequently Asked Questions</h3>
                <div className="space-y-4">
                  <div className={`border-b pb-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>How long does a deposit take?</p>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Deposits are usually processed within 24 hours after verification.</p>
                  </div>
                  <div className={`border-b pb-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>How do I withdraw funds?</p>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Go to Wallet → Withdraw and follow the instructions. Withdrawals are processed within 1-3 business days.</p>
                  </div>
                  <div className={`border-b pb-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>What is the minimum deposit?</p>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>The minimum deposit depends on your account type. Check Account Types for details.</p>
                  </div>
                  <div>
                    <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>How do I become an IB?</p>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Go to the IB section and click "Apply Now" to submit your application.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {loading ? (
                <div className="text-center py-12 text-gray-500">Loading tickets...</div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle size={48} className="mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-500">No support tickets yet</p>
                  <button
                    onClick={() => setActiveTab('new')}
                    className="mt-4 text-accent-green hover:underline"
                  >
                    Create your first ticket →
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {tickets.map(ticket => (
                    <div 
                      key={ticket._id} 
                      className={`${isDarkMode ? 'bg-dark-800 border-gray-800 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-400 shadow-sm'} rounded-xl p-5 border cursor-pointer transition-colors`}
                      onClick={() => openTicketChat(ticket.ticketId)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{ticket.subject}</h3>
                          <p className="text-gray-500 text-sm">#{ticket.ticketId} • {ticket.category}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(ticket.status)}
                          <span className={`text-sm ${
                            ticket.status === 'OPEN' ? 'text-yellow-500' :
                            ticket.status === 'IN_PROGRESS' ? 'text-blue-500' :
                            ticket.status === 'WAITING_USER' ? 'text-orange-500' :
                            ticket.status === 'RESOLVED' ? 'text-green-500' : 'text-gray-500'
                          }`}>
                            {ticket.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                        {ticket.messages?.[0]?.message || 'No message'}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Created: {new Date(ticket.createdAt).toLocaleString()}</span>
                        <span className="text-accent-green">
                          {ticket.messages?.length || 0} messages • Click to view
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Chat Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-gray-700">
            {/* Header */}
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold">{selectedTicket.subject}</h3>
                <p className="text-gray-500 text-sm">#{selectedTicket.ticketId} • {selectedTicket.category}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded text-xs ${
                  selectedTicket.status === 'OPEN' ? 'bg-yellow-500/20 text-yellow-500' :
                  selectedTicket.status === 'IN_PROGRESS' ? 'bg-blue-500/20 text-blue-500' :
                  selectedTicket.status === 'WAITING_USER' ? 'bg-orange-500/20 text-orange-500' :
                  selectedTicket.status === 'RESOLVED' ? 'bg-green-500/20 text-green-500' :
                  'bg-gray-500/20 text-gray-500'
                }`}>
                  {selectedTicket.status.replace('_', ' ')}
                </span>
                <button 
                  onClick={() => setSelectedTicket(null)}
                  className="text-gray-400 hover:text-white text-xl"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedTicket.messages?.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${msg.sender === 'USER' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-lg p-3 ${
                    msg.sender === 'USER' 
                      ? 'bg-accent-green/20 text-white' 
                      : 'bg-dark-700 text-white'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium ${
                        msg.sender === 'USER' ? 'text-accent-green' : 'text-blue-400'
                      }`}>
                        {msg.sender === 'USER' ? 'You' : 'Support'}
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
            {selectedTicket.status !== 'CLOSED' && selectedTicket.status !== 'RESOLVED' && (
              <div className="p-4 border-t border-gray-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 bg-dark-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendReply()}
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={sendingReply || !replyMessage.trim()}
                    className="bg-accent-green text-black px-4 py-2 rounded-lg font-medium hover:bg-accent-green/90 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Send size={16} />
                    {sendingReply ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            )}

            {(selectedTicket.status === 'CLOSED' || selectedTicket.status === 'RESOLVED') && (
              <div className="p-4 border-t border-gray-700 text-center text-gray-500 text-sm">
                This ticket has been {selectedTicket.status.toLowerCase()}. Create a new ticket if you need further assistance.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SupportPage
