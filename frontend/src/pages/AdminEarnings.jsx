import { useState, useEffect } from 'react'
import AdminLayout from '../components/AdminLayout'
import { 
  DollarSign,
  TrendingUp,
  Calendar,
  Users,
  BarChart3,
  RefreshCw,
  ChevronDown,
  Download
} from 'lucide-react'
import { API_URL } from '../config/api'

const AdminEarnings = () => {
  const [summary, setSummary] = useState(null)
  const [dailyEarnings, setDailyEarnings] = useState([])
  const [userEarnings, setUserEarnings] = useState([])
  const [symbolEarnings, setSymbolEarnings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [dateRange, setDateRange] = useState('30')

  useEffect(() => {
    fetchAllData()
  }, [dateRange])

  const fetchAllData = async () => {
    setLoading(true)
    await Promise.all([
      fetchSummary(),
      fetchDailyEarnings(),
      fetchUserEarnings(),
      fetchSymbolEarnings()
    ])
    setLoading(false)
  }

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_URL}/earnings/summary`)
      const data = await res.json()
      if (data.success) {
        setSummary(data.earnings)
      }
    } catch (error) {
      console.error('Error fetching summary:', error)
    }
  }

  const fetchDailyEarnings = async () => {
    try {
      const res = await fetch(`${API_URL}/earnings/daily?days=${dateRange}`)
      const data = await res.json()
      if (data.success) {
        setDailyEarnings(data.earnings || [])
      }
    } catch (error) {
      console.error('Error fetching daily earnings:', error)
    }
  }

  const fetchUserEarnings = async () => {
    try {
      const res = await fetch(`${API_URL}/earnings/by-user?days=${dateRange}`)
      const data = await res.json()
      if (data.success) {
        setUserEarnings(data.earnings || [])
      }
    } catch (error) {
      console.error('Error fetching user earnings:', error)
    }
  }

  const fetchSymbolEarnings = async () => {
    try {
      const res = await fetch(`${API_URL}/earnings/by-symbol?days=${dateRange}`)
      const data = await res.json()
      if (data.success) {
        setSymbolEarnings(data.earnings || [])
      }
    } catch (error) {
      console.error('Error fetching symbol earnings:', error)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value || 0)
  }

  const StatCard = ({ title, value, subtitle, icon: Icon, color }) => (
    <div className="bg-dark-800 rounded-xl border border-gray-800 p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className={`text-xl sm:text-2xl font-bold mt-1 ${color || 'text-white'}`}>
            {formatCurrency(value)}
          </p>
          {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color?.includes('green') ? 'bg-green-500/20' : 'bg-blue-500/20'}`}>
          <Icon size={20} className={color?.includes('green') ? 'text-green-500' : 'text-blue-500'} />
        </div>
      </div>
    </div>
  )

  return (
    <AdminLayout title="Earnings Report" subtitle="Track commission, spread, and swap earnings">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 bg-dark-800 border border-gray-700 rounded-lg text-white text-sm"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last Year</option>
          </select>
          <button 
            onClick={fetchAllData}
            className="p-2 bg-dark-800 hover:bg-dark-700 rounded-lg text-gray-400"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw size={24} className="animate-spin text-gray-500" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StatCard 
              title="Today" 
              value={summary?.today?.total} 
              subtitle={`${summary?.today?.trades || 0} trades`}
              icon={DollarSign}
              color="text-green-500"
            />
            <StatCard 
              title="This Week" 
              value={summary?.thisWeek?.total} 
              subtitle={`${summary?.thisWeek?.trades || 0} trades`}
              icon={Calendar}
              color="text-blue-500"
            />
            <StatCard 
              title="This Month" 
              value={summary?.thisMonth?.total} 
              subtitle={`${summary?.thisMonth?.trades || 0} trades`}
              icon={TrendingUp}
              color="text-purple-500"
            />
            <StatCard 
              title="This Year" 
              value={summary?.thisYear?.total} 
              subtitle={`${summary?.thisYear?.trades || 0} trades`}
              icon={BarChart3}
              color="text-orange-500"
            />
            <StatCard 
              title="All Time" 
              value={summary?.allTime?.total} 
              subtitle={`${summary?.allTime?.trades || 0} trades`}
              icon={DollarSign}
              color="text-green-500"
            />
          </div>

          {/* Breakdown Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Commission Breakdown */}
            <div className="bg-dark-800 rounded-xl border border-gray-800 p-5">
              <h3 className="text-white font-semibold mb-4">Commission Earnings</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Today</span>
                  <span className="text-white font-mono">{formatCurrency(summary?.today?.commission)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">This Week</span>
                  <span className="text-white font-mono">{formatCurrency(summary?.thisWeek?.commission)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">This Month</span>
                  <span className="text-white font-mono">{formatCurrency(summary?.thisMonth?.commission)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-700 pt-3">
                  <span className="text-gray-400">All Time</span>
                  <span className="text-green-500 font-mono font-bold">{formatCurrency(summary?.allTime?.commission)}</span>
                </div>
              </div>
            </div>

            {/* Swap Breakdown */}
            <div className="bg-dark-800 rounded-xl border border-gray-800 p-5">
              <h3 className="text-white font-semibold mb-4">Swap Earnings</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Today</span>
                  <span className="text-white font-mono">{formatCurrency(summary?.today?.swap)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">This Week</span>
                  <span className="text-white font-mono">{formatCurrency(summary?.thisWeek?.swap)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">This Month</span>
                  <span className="text-white font-mono">{formatCurrency(summary?.thisMonth?.swap)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-700 pt-3">
                  <span className="text-gray-400">All Time</span>
                  <span className="text-blue-500 font-mono font-bold">{formatCurrency(summary?.allTime?.swap)}</span>
                </div>
              </div>
            </div>

            {/* Volume Stats */}
            <div className="bg-dark-800 rounded-xl border border-gray-800 p-5">
              <h3 className="text-white font-semibold mb-4">Trading Volume (Lots)</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Today</span>
                  <span className="text-white font-mono">{(summary?.today?.volume || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">This Week</span>
                  <span className="text-white font-mono">{(summary?.thisWeek?.volume || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">This Month</span>
                  <span className="text-white font-mono">{(summary?.thisMonth?.volume || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-700 pt-3">
                  <span className="text-gray-400">All Time</span>
                  <span className="text-purple-500 font-mono font-bold">{(summary?.allTime?.volume || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 border-b border-gray-800 pb-2">
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-4 py-2 rounded-lg text-sm ${activeTab === 'daily' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Daily Breakdown
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-lg text-sm ${activeTab === 'users' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              By User
            </button>
            <button
              onClick={() => setActiveTab('symbols')}
              className={`px-4 py-2 rounded-lg text-sm ${activeTab === 'symbols' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              By Symbol
            </button>
          </div>

          {/* Daily Breakdown Table */}
          {activeTab === 'daily' && (
            <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-dark-700">
                    <tr>
                      <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">Date</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Commission</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Swap</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Total</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Trades</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyEarnings.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center text-gray-500 py-8">No data for selected period</td>
                      </tr>
                    ) : (
                      dailyEarnings.map((day, idx) => (
                        <tr key={idx} className="border-t border-gray-800 hover:bg-dark-700">
                          <td className="px-4 py-3 text-white text-sm">{day.date}</td>
                          <td className="px-4 py-3 text-right text-white font-mono text-sm">{formatCurrency(day.commission)}</td>
                          <td className="px-4 py-3 text-right text-white font-mono text-sm">{formatCurrency(day.swap)}</td>
                          <td className="px-4 py-3 text-right text-green-500 font-mono text-sm font-semibold">{formatCurrency(day.total)}</td>
                          <td className="px-4 py-3 text-right text-gray-400 text-sm">{day.trades}</td>
                          <td className="px-4 py-3 text-right text-gray-400 text-sm">{day.volume?.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* By User Table */}
          {activeTab === 'users' && (
            <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-dark-700">
                    <tr>
                      <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">User</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Commission</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Swap</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Total</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Trades</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userEarnings.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center text-gray-500 py-8">No data for selected period</td>
                      </tr>
                    ) : (
                      userEarnings.map((user, idx) => (
                        <tr key={idx} className="border-t border-gray-800 hover:bg-dark-700">
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-white text-sm font-medium">{user.userName || 'Unknown'}</p>
                              <p className="text-gray-500 text-xs">{user.userEmail}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-white font-mono text-sm">{formatCurrency(user.commission)}</td>
                          <td className="px-4 py-3 text-right text-white font-mono text-sm">{formatCurrency(user.swap)}</td>
                          <td className="px-4 py-3 text-right text-green-500 font-mono text-sm font-semibold">{formatCurrency(user.total)}</td>
                          <td className="px-4 py-3 text-right text-gray-400 text-sm">{user.trades}</td>
                          <td className="px-4 py-3 text-right text-gray-400 text-sm">{user.volume?.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* By Symbol Table */}
          {activeTab === 'symbols' && (
            <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-dark-700">
                    <tr>
                      <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">Symbol</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Commission</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Swap</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Total</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Trades</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {symbolEarnings.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center text-gray-500 py-8">No data for selected period</td>
                      </tr>
                    ) : (
                      symbolEarnings.map((sym, idx) => (
                        <tr key={idx} className="border-t border-gray-800 hover:bg-dark-700">
                          <td className="px-4 py-3 text-white text-sm font-medium">{sym.symbol}</td>
                          <td className="px-4 py-3 text-right text-white font-mono text-sm">{formatCurrency(sym.commission)}</td>
                          <td className="px-4 py-3 text-right text-white font-mono text-sm">{formatCurrency(sym.swap)}</td>
                          <td className="px-4 py-3 text-right text-green-500 font-mono text-sm font-semibold">{formatCurrency(sym.total)}</td>
                          <td className="px-4 py-3 text-right text-gray-400 text-sm">{sym.trades}</td>
                          <td className="px-4 py-3 text-right text-gray-400 text-sm">{sym.volume?.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  )
}

export default AdminEarnings
