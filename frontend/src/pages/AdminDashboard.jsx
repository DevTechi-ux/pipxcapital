import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../config/api'
// import BonusManagement from './admin/BonusManagement.jsx'

// Temporarily remove import to test

// Test import
// console.log('BonusManagement component imported:', BonusManagement)
import { 
  LayoutDashboard, 
  Users,
  LogOut,
  Search,
  Mail,
  Phone,
  Calendar,
  MoreHorizontal,
  Trash2,
  Eye,
  RefreshCw,
  CreditCard,
  Settings,
  Wallet,
  Gift,
  Plus,
  FileText
} from 'lucide-react'

// Test icon import
console.log('Gift icon imported:', Gift)

const AdminDashboard = () => {
  const navigate = useNavigate()
  const [activeMenu, setActiveMenu] = useState('Dashboard')
  const [sidebarExpanded, setSidebarExpanded] = useState(true) // Start expanded
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Debug sidebar state
  console.log('Sidebar expanded:', sidebarExpanded)
  console.log('Active menu:', activeMenu)

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
    { name: 'User Management', icon: Users, path: '/admin/dashboard' },
    { name: 'Accounts', icon: CreditCard, path: '/admin/accounts' },
    { name: 'Account Types', icon: Wallet, path: '/admin/account-types' },
    { name: 'Transactions', icon: Settings, path: '/admin/transactions' },
    { name: 'Payment Methods', icon: Settings, path: '/admin/payment-methods' },
    { name: 'Email Templates', icon: FileText, path: '/admin/dashboard' },
    { name: 'Bonus Management', icon: Gift, path: '/admin/dashboard' },
    { name: 'TEST ITEM', icon: Users, path: '/admin/dashboard' },
  ]

// Test menu items
console.log('Menu items:', menuItems)

  // Check admin auth
  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken')
    if (!adminToken) {
      navigate('/admin')
    }
  }, [navigate])

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true)
      try {
        const response = await fetch(`${API_URL}/admin/users`)
        if (response.ok) {
          const data = await response.json()
          setUsers(data.users || [])
        }
      } catch (error) {
        console.error('Error fetching users:', error)
      }
      setLoading(false)
    }
    fetchUsers()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
    navigate('/admin')
  }

  const filteredUsers = users.filter(user => 
    user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone?.includes(searchTerm)
  )

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-dark-900 flex">
      {/* Collapsible Sidebar */}
      <aside 
        className={`${sidebarExpanded ? 'w-52' : 'w-16'} bg-dark-900 border-r border-gray-800 flex flex-col transition-all duration-300 ease-in-out`}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        {/* Logo */}
        <div className="p-4 flex items-center justify-center gap-2">
          <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          {sidebarExpanded && <span className="text-white font-semibold">Admin</span>}
        </div>

        {/* Menu */}
        <nav className="flex-1 px-2">
          <div className="mb-4 p-2 bg-red-500/20 border border-red-500/50 rounded">
            <p className="text-red-500 text-xs">DEBUG: Menu items count: {menuItems.length}</p>
          </div>
          {menuItems.map((item, index) => (
            <button
              key={item.name}
              onClick={() => {
                console.log('Menu clicked:', item.name, 'Index:', index)
                if (item.name === 'Email Templates') {
                  console.log('Setting active menu to Email Templates')
                  setActiveMenu('Email Templates')
                } else if (item.name === 'Bonus Management') {
                  console.log('Setting active menu to Bonus Management')
                  setActiveMenu('Bonus Management')
                } else if (item.name === 'TEST ITEM') {
                  console.log('Setting active menu to TEST ITEM')
                  setActiveMenu('TEST ITEM')
                } else {
                  navigate(item.path)
                }
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                activeMenu === item.name 
                  ? 'bg-red-500 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-dark-700'
              }`}
              title={!sidebarExpanded ? item.name : ''}
            >
              <item.icon size={18} className="flex-shrink-0" />
              {sidebarExpanded && <span className="text-sm font-medium whitespace-nowrap">{item.name}</span>}
              {!sidebarExpanded && <span className="text-xs text-gray-500">{index}</span>}
            </button>
          ))}
        </nav>

        {/* Toggle Sidebar */}
        <div className="p-2 border-t border-gray-800">
          <button 
            onClick={() => setSidebarExpanded(!sidebarExpanded)}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:text-white transition-colors rounded-lg mb-2"
            title={!sidebarExpanded ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <LayoutDashboard size={18} className="flex-shrink-0" />
            {sidebarExpanded && <span className="text-sm font-medium whitespace-nowrap">Toggle Sidebar</span>}
          </button>
        </div>

        {/* Logout */}
        <div className="p-2 border-t border-gray-800">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:text-white transition-colors rounded-lg"
            title={!sidebarExpanded ? 'Log Out' : ''}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {sidebarExpanded && <span className="text-sm font-medium whitespace-nowrap">Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h1 className="text-xl font-semibold text-white">Admin Dashboard</h1>
            <p className="text-gray-500 text-sm">Manage your platform</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 text-red-500 rounded-full text-sm">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            Admin Mode
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-6">
          {activeMenu === 'Dashboard' && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Users size={20} className="text-blue-500" />
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm mb-1">Total Users</p>
                  <p className="text-white text-2xl font-bold">{users.length}</p>
                </div>

                <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <Users size={20} className="text-green-500" />
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm mb-1">Active Today</p>
                  <p className="text-white text-2xl font-bold">{Math.floor(users.length * 0.7)}</p>
                </div>

                <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <Calendar size={20} className="text-purple-500" />
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm mb-1">New This Week</p>
                  <p className="text-white text-2xl font-bold">{Math.floor(users.length * 0.3)}</p>
                </div>

                <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <Users size={20} className="text-orange-500" />
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm mb-1">Pending Verification</p>
                  <p className="text-white text-2xl font-bold">0</p>
                </div>
              </div>

              {/* Recent Users Preview */}
              <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-semibold">Recent Users</h2>
                  <button 
                    onClick={() => setActiveMenu('User Management')}
                    className="text-sm text-blue-500 hover:underline"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-3">
                  {users.slice(0, 5).map((user, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-accent-green/20 rounded-full flex items-center justify-center">
                          <span className="text-accent-green font-medium">
                            {user.firstName?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{user.firstName || 'Unknown'}</p>
                          <p className="text-gray-500 text-sm">{user.email}</p>
                        </div>
                      </div>
                      <span className="text-gray-500 text-sm">{formatDate(user.createdAt)}</span>
                    </div>
                  ))}
                  {users.length === 0 && !loading && (
                    <p className="text-gray-500 text-center py-4">No users registered yet</p>
                  )}
                  {loading && (
                    <div className="flex items-center justify-center py-4">
                      <RefreshCw size={20} className="text-gray-500 animate-spin" />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeMenu === 'User Management' && (
            <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-white font-semibold text-lg">All Users</h2>
                  <p className="text-gray-500 text-sm">{users.length} total users</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-dark-700 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 w-64"
                    />
                  </div>
                  <button 
                    onClick={() => window.location.reload()}
                    className="p-2 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
                  >
                    <RefreshCw size={18} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">User</th>
                      <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Email</th>
                      <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Phone</th>
                      <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Joined</th>
                      <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="5" className="text-center py-8">
                          <RefreshCw size={24} className="text-gray-500 animate-spin mx-auto" />
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-8 text-gray-500">
                          {searchTerm ? 'No users found matching your search' : 'No users registered yet'}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user, index) => (
                        <tr key={index} className="border-b border-gray-800 hover:bg-dark-700/50">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-accent-green/20 rounded-full flex items-center justify-center">
                                <span className="text-accent-green font-medium">
                                  {user.firstName?.charAt(0)?.toUpperCase() || 'U'}
                                </span>
                              </div>
                              <span className="text-white font-medium">{user.firstName || 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2 text-gray-400">
                              <Mail size={14} />
                              <span>{user.email}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2 text-gray-400">
                              <Phone size={14} />
                              <span>{user.phone || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-gray-400">
                            {formatDate(user.createdAt)}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <button className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-white">
                                <Eye size={16} />
                              </button>
                              <button className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-red-500">
                                <Trash2 size={16} />
                              </button>
                              <button className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-white">
                                <MoreHorizontal size={16} />
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
          )}

          {activeMenu === 'Email Templates' && (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-white mb-6">Email Templates</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-dark-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-white font-semibold mb-4">Welcome Email</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Subject:</span>
                    <span className="text-white">Welcome to Pipxacpital</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Category:</span>
                    <span className="text-blue-500">User</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className="text-green-500">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Variables:</span>
                    <span className="text-white">5</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm">Edit</button>
                  <button className="flex-1 bg-green-500 text-white px-3 py-2 rounded-lg text-sm">Preview</button>
                </div>
              </div>

              <div className="bg-dark-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-white font-semibold mb-4">Password Reset</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Subject:</span>
                    <span className="text-white">Reset Your Password</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Category:</span>
                    <span className="text-orange-500">Security</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className="text-green-500">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Variables:</span>
                    <span className="text-white">7</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm">Edit</button>
                  <button className="flex-1 bg-green-500 text-white px-3 py-2 rounded-lg text-sm">Preview</button>
                </div>
              </div>

              <div className="bg-dark-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-white font-semibold mb-4">Challenge Completed</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Subject:</span>
                    <span className="text-white">Challenge Passed!</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Category:</span>
                    <span className="text-purple-500">Trading</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className="text-green-500">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Variables:</span>
                    <span className="text-white">8</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm">Edit</button>
                  <button className="flex-1 bg-green-500 text-white px-3 py-2 rounded-lg text-sm">Preview</button>
                </div>
              </div>

              <div className="bg-dark-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-white font-semibold mb-4">KYC Approved</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Subject:</span>
                    <span className="text-white">KYC Verification Complete</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Category:</span>
                    <span className="text-teal-500">Verification</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className="text-green-500">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Variables:</span>
                    <span className="text-white">6</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm">Edit</button>
                  <button className="flex-1 bg-green-500 text-white px-3 py-2 rounded-lg text-sm">Preview</button>
                </div>
              </div>

              <div className="bg-dark-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-white font-semibold mb-4">Create New Template</h3>
                <button className="w-full bg-accent-green text-black px-4 py-2 rounded-lg font-medium hover:bg-accent-green/90 flex items-center justify-center gap-2">
                  <Plus size={16} />
                  Create New Template
                </button>
              </div>
            </div>
          </div>
        )}

        {activeMenu === 'Bonus Management' && (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-white mb-6">Bonus Management</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-dark-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-white font-semibold mb-4">First Deposit Bonus</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Bonus Type:</span>
                    <span className="text-white">100%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Max Bonus:</span>
                    <span className="text-white">$500</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Min Deposit:</span>
                    <span className="text-white">$100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Wagering:</span>
                    <span className="text-white">30x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className="text-green-500">Active</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm">Edit</button>
                  <button className="flex-1 bg-red-500 text-white px-3 py-2 rounded-lg text-sm">Delete</button>
                </div>
              </div>

              <div className="bg-dark-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-white font-semibold mb-4">Regular Deposit Bonus</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Bonus Type:</span>
                    <span className="text-white">50%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Max Bonus:</span>
                    <span className="text-white">$200</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Min Deposit:</span>
                    <span className="text-white">$50</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Wagering:</span>
                    <span className="text-white">25x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className="text-green-500">Active</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm">Edit</button>
                  <button className="flex-1 bg-red-500 text-white px-3 py-2 rounded-lg text-sm">Delete</button>
                </div>
              </div>

              <div className="bg-dark-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-white font-semibold mb-4">Create New Bonus</h3>
                <button className="w-full bg-accent-green text-black px-4 py-2 rounded-lg font-medium hover:bg-accent-green/90 flex items-center justify-center gap-2">
                  <Plus size={16} />
                  Create New Bonus
                </button>
              </div>
            </div>
          </div>
        )}

        {activeMenu === 'TEST ITEM' && (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-white mb-6">Test Item</h1>
            <div className="bg-dark-800 rounded-xl p-6 border border-gray-700">
              <p className="text-white">Test item is working!</p>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  )
}

export default AdminDashboard
