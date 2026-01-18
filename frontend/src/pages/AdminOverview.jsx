import { useState, useEffect } from 'react'
import AdminLayout from '../components/AdminLayout'
import { 
  Users,
  TrendingUp,
  Wallet,
  CreditCard,
  RefreshCw,
  Calendar
} from 'lucide-react'
import { API_URL } from '../config/api'

const AdminOverview = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeToday: 0,
    newThisWeek: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    pendingKYC: 0,
    pendingWithdrawals: 0,
    activeTrades: 0
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch users
      const usersResponse = await fetch(`${API_URL}/admin/users`)
      if (usersResponse.ok) {
        const data = await usersResponse.json()
        setUsers(data.users || [])
      }
      
      // Fetch dashboard stats
      const statsResponse = await fetch(`${API_URL}/admin/dashboard-stats`)
      if (statsResponse.ok) {
        const data = await statsResponse.json()
        if (data.success) {
          setStats({
            totalUsers: data.stats.totalUsers || 0,
            activeToday: data.stats.totalUsers || 0,
            newThisWeek: data.stats.newThisWeek || 0,
            totalDeposits: data.stats.totalDeposits || 0,
            totalWithdrawals: data.stats.totalWithdrawals || 0,
            pendingKYC: data.stats.pendingKYC || 0,
            pendingWithdrawals: data.stats.pendingWithdrawals || 0,
            activeTrades: data.stats.activeTrades || 0
          })
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    }
    setLoading(false)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const statCards = [
    { 
      title: 'Total Users', 
      value: stats.totalUsers, 
      icon: Users, 
      color: 'blue'
    },
    { 
      title: 'New This Week', 
      value: stats.newThisWeek, 
      icon: TrendingUp, 
      color: 'green'
    },
    { 
      title: 'Total Deposits', 
      value: `$${stats.totalDeposits.toLocaleString()}`, 
      icon: Wallet, 
      color: 'purple'
    },
    { 
      title: 'Total Withdrawals', 
      value: `$${stats.totalWithdrawals.toLocaleString()}`, 
      icon: CreditCard, 
      color: 'orange'
    },
  ]

  return (
    <AdminLayout title="Overview Dashboard" subtitle="Welcome back, Admin">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-dark-800 rounded-xl p-5 border border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 bg-${stat.color}-500/20 rounded-lg flex items-center justify-center`}>
                <stat.icon size={20} className={`text-${stat.color}-500`} />
              </div>
            </div>
            <p className="text-gray-500 text-sm mb-1">{stat.title}</p>
            <p className="text-white text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Recent Users</h2>
            <button 
              onClick={fetchData}
              className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
            >
              <RefreshCw size={16} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw size={20} className="text-gray-500 animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No users registered yet</p>
            ) : (
              users.slice(0, 5).map((user, index) => (
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
              ))
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <h2 className="text-white font-semibold mb-4">Platform Overview</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Users size={18} className="text-blue-500" />
                </div>
                <span className="text-gray-400">New Users This Week</span>
              </div>
              <span className="text-white font-semibold">{stats.newThisWeek}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <Calendar size={18} className="text-yellow-500" />
                </div>
                <span className="text-gray-400">Pending KYC</span>
              </div>
              <span className="text-white font-semibold">{stats.pendingKYC}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <TrendingUp size={18} className="text-green-500" />
                </div>
                <span className="text-gray-400">Active Trades</span>
              </div>
              <span className="text-white font-semibold">{stats.activeTrades}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Wallet size={18} className="text-purple-500" />
                </div>
                <span className="text-gray-400">Pending Withdrawals</span>
              </div>
              <span className="text-white font-semibold">{stats.pendingWithdrawals}</span>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminOverview
