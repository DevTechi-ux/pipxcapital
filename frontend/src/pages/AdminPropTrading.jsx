import React, { useState, useEffect } from 'react'
import { 
  Trophy, Settings, Users, Plus, Edit, Trash2, Eye, Check, X,
  TrendingUp, TrendingDown, Clock, AlertTriangle, RefreshCw,
  ChevronDown, Search, Filter, MoreVertical, Shield, Target
} from 'lucide-react'
import { API_URL } from '../config/api'

export default function AdminPropTrading() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [settings, setSettings] = useState(null)
  const [challenges, setChallenges] = useState([])
  const [accounts, setAccounts] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showChallengeModal, setShowChallengeModal] = useState(false)
  const [editingChallenge, setEditingChallenge] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    await Promise.all([
      fetchSettings(),
      fetchChallenges(),
      fetchAccounts(),
      fetchStats()
    ])
    setLoading(false)
  }

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/prop/admin/settings`)
      const data = await res.json()
      if (data.success) setSettings(data.settings)
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  const fetchChallenges = async () => {
    try {
      const res = await fetch(`${API_URL}/prop/admin/challenges`)
      const data = await res.json()
      if (data.success) setChallenges(data.challenges || [])
    } catch (error) {
      console.error('Error fetching challenges:', error)
    }
  }

  const fetchAccounts = async () => {
    try {
      const res = await fetch(`${API_URL}/prop/admin/accounts?limit=100`)
      const data = await res.json()
      if (data.success) setAccounts(data.accounts || [])
    } catch (error) {
      console.error('Error fetching accounts:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/prop/admin/dashboard`)
      const data = await res.json()
      if (data.success) setStats(data.stats)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const toggleChallengeMode = async () => {
    try {
      const res = await fetch(`${API_URL}/prop/admin/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeModeEnabled: !settings?.challengeModeEnabled
        })
      })
      const data = await res.json()
      if (data.success) {
        setSettings(data.settings)
        fetchStats()
      }
    } catch (error) {
      console.error('Error toggling challenge mode:', error)
    }
  }

  const handleForcePass = async (accountId) => {
    if (!confirm('Are you sure you want to force pass this challenge?')) return
    try {
      const res = await fetch(`${API_URL}/prop/admin/force-pass/${accountId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: 'admin' })
      })
      const data = await res.json()
      if (data.success) {
        alert('Challenge force passed!')
        fetchAccounts()
        fetchStats()
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleForceFail = async (accountId) => {
    const reason = prompt('Enter reason for failing this challenge:')
    if (!reason) return
    try {
      const res = await fetch(`${API_URL}/prop/admin/force-fail/${accountId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: 'admin', reason })
      })
      const data = await res.json()
      if (data.success) {
        alert('Challenge force failed!')
        fetchAccounts()
        fetchStats()
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleExtendTime = async (accountId) => {
    const days = prompt('Enter number of days to extend:')
    if (!days || isNaN(days)) return
    try {
      const res = await fetch(`${API_URL}/prop/admin/extend-time/${accountId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: 'admin', days: parseInt(days) })
      })
      const data = await res.json()
      if (data.success) {
        alert(`Extended by ${days} days!`)
        fetchAccounts()
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleResetChallenge = async (accountId) => {
    if (!confirm('Are you sure you want to reset this challenge? All progress will be lost.')) return
    try {
      const res = await fetch(`${API_URL}/prop/admin/reset/${accountId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: 'admin' })
      })
      const data = await res.json()
      if (data.success) {
        alert('Challenge reset!')
        fetchAccounts()
        fetchStats()
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'bg-blue-500/20 text-blue-500'
      case 'PASSED': return 'bg-green-500/20 text-green-500'
      case 'FUNDED': return 'bg-purple-500/20 text-purple-500'
      case 'FAILED': return 'bg-red-500/20 text-red-500'
      case 'EXPIRED': return 'bg-gray-500/20 text-gray-500'
      default: return 'bg-gray-500/20 text-gray-500'
    }
  }

  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = acc.accountId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.userId?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || acc.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-900 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Trophy className="text-primary-500" />
              Prop Trading Management
            </h1>
            <p className="text-gray-400">Manage challenges and funded accounts</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleChallengeMode}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                settings?.challengeModeEnabled
                  ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                  : 'bg-red-500/20 text-red-500 border border-red-500/30'
              }`}
            >
              {settings?.challengeModeEnabled ? <Check size={18} /> : <X size={18} />}
              {settings?.challengeModeEnabled ? 'Enabled' : 'Disabled'}
            </button>
            <button
              onClick={fetchData}
              className="p-2 bg-dark-800 hover:bg-dark-700 rounded-lg text-gray-400"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-800 pb-2">
          {['dashboard', 'challenges', 'accounts'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-400 hover:bg-dark-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && stats && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-dark-800 rounded-xl p-4 border border-gray-800">
                <p className="text-gray-400 text-sm">Total Challenges</p>
                <p className="text-2xl font-bold text-white">{stats.totalChallenges}</p>
              </div>
              <div className="bg-dark-800 rounded-xl p-4 border border-gray-800">
                <p className="text-gray-400 text-sm">Active Accounts</p>
                <p className="text-2xl font-bold text-blue-500">{stats.activeAccounts}</p>
              </div>
              <div className="bg-dark-800 rounded-xl p-4 border border-gray-800">
                <p className="text-gray-400 text-sm">Passed</p>
                <p className="text-2xl font-bold text-green-500">{stats.passedAccounts}</p>
              </div>
              <div className="bg-dark-800 rounded-xl p-4 border border-gray-800">
                <p className="text-gray-400 text-sm">Failed</p>
                <p className="text-2xl font-bold text-red-500">{stats.failedAccounts}</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-dark-800 rounded-xl p-6 border border-gray-800">
                <h3 className="text-lg font-bold text-white mb-4">Account Distribution</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Active', value: stats.activeAccounts, color: 'bg-blue-500' },
                    { label: 'Passed', value: stats.passedAccounts, color: 'bg-green-500' },
                    { label: 'Funded', value: stats.fundedAccounts, color: 'bg-purple-500' },
                    { label: 'Failed', value: stats.failedAccounts, color: 'bg-red-500' }
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${item.color}`} />
                      <span className="text-gray-400 flex-1">{item.label}</span>
                      <span className="text-white font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-dark-800 rounded-xl p-6 border border-gray-800">
                <h3 className="text-lg font-bold text-white mb-4">System Status</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Challenge Mode</span>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      stats.challengeModeEnabled ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                    }`}>
                      {stats.challengeModeEnabled ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Total Accounts</span>
                    <span className="text-white font-medium">{stats.totalAccounts}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Pass Rate</span>
                    <span className="text-white font-medium">
                      {stats.totalAccounts > 0 
                        ? ((stats.passedAccounts / stats.totalAccounts) * 100).toFixed(1) 
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Challenges Tab */}
        {activeTab === 'challenges' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Challenge Products</h2>
              <button
                onClick={() => {
                  setEditingChallenge(null)
                  setShowChallengeModal(true)
                }}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg flex items-center gap-2"
              >
                <Plus size={18} />
                Add Challenge
              </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {challenges.map((challenge) => (
                <div key={challenge._id} className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
                  <div className="p-4 border-b border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        challenge.stepsCount === 0 ? 'bg-green-500/20 text-green-500' :
                        challenge.stepsCount === 1 ? 'bg-blue-500/20 text-blue-500' :
                        'bg-purple-500/20 text-purple-500'
                      }`}>
                        {challenge.stepsCount === 0 ? 'Instant' : `${challenge.stepsCount}-Step`}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        challenge.isActive ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'
                      }`}>
                        {challenge.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white">${challenge.fundSize.toLocaleString()}</h3>
                    <p className="text-gray-400 text-sm">{challenge.name}</p>
                  </div>
                  <div className="p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Fee</span>
                      <span className="text-white">${challenge.challengeFee}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Daily DD</span>
                      <span className="text-white">{challenge.rules?.maxDailyDrawdownPercent}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max DD</span>
                      <span className="text-white">{challenge.rules?.maxOverallDrawdownPercent}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Profit Split</span>
                      <span className="text-white">{challenge.fundedSettings?.profitSplitPercent}%</span>
                    </div>
                  </div>
                  <div className="p-4 border-t border-gray-800 flex gap-2">
                    <button
                      onClick={() => {
                        setEditingChallenge(challenge)
                        setShowChallengeModal(true)
                      }}
                      className="flex-1 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg text-sm flex items-center justify-center gap-1"
                    >
                      <Edit size={14} /> Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {challenges.length === 0 && (
              <div className="text-center py-12">
                <Trophy size={48} className="text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No challenges created yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Accounts Tab */}
        {activeTab === 'accounts' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by account ID, name, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-dark-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-dark-800 border border-gray-700 rounded-lg text-white"
              >
                <option value="all">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="PASSED">Passed</option>
                <option value="FUNDED">Funded</option>
                <option value="FAILED">Failed</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>

            {/* Accounts Table */}
            <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-dark-700">
                    <tr>
                      <th className="text-left text-gray-400 text-sm font-medium py-3 px-4">Account</th>
                      <th className="text-left text-gray-400 text-sm font-medium py-3 px-4">User</th>
                      <th className="text-left text-gray-400 text-sm font-medium py-3 px-4">Challenge</th>
                      <th className="text-left text-gray-400 text-sm font-medium py-3 px-4">Phase</th>
                      <th className="text-left text-gray-400 text-sm font-medium py-3 px-4">Equity</th>
                      <th className="text-left text-gray-400 text-sm font-medium py-3 px-4">DD%</th>
                      <th className="text-left text-gray-400 text-sm font-medium py-3 px-4">Profit%</th>
                      <th className="text-left text-gray-400 text-sm font-medium py-3 px-4">Status</th>
                      <th className="text-left text-gray-400 text-sm font-medium py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccounts.map((acc) => (
                      <tr key={acc._id} className="border-b border-gray-800 hover:bg-dark-700/50">
                        <td className="py-3 px-4 text-white font-mono text-sm">{acc.accountId}</td>
                        <td className="py-3 px-4">
                          <p className="text-white text-sm">{acc.userId?.firstName || 'N/A'}</p>
                          <p className="text-gray-500 text-xs">{acc.userId?.email}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-white text-sm">${acc.challengeId?.fundSize?.toLocaleString()}</p>
                          <p className="text-gray-500 text-xs">{acc.challengeId?.name}</p>
                        </td>
                        <td className="py-3 px-4 text-white">
                          {acc.totalPhases === 0 ? 'Funded' : `${acc.currentPhase}/${acc.totalPhases}`}
                        </td>
                        <td className="py-3 px-4 text-white">${acc.currentEquity?.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <span className={acc.currentOverallDrawdownPercent > 5 ? 'text-red-500' : 'text-white'}>
                            {acc.currentOverallDrawdownPercent?.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={acc.currentProfitPercent >= 0 ? 'text-green-500' : 'text-red-500'}>
                            {acc.currentProfitPercent?.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(acc.status)}`}>
                            {acc.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            {acc.status === 'ACTIVE' && (
                              <>
                                <button
                                  onClick={() => handleForcePass(acc._id)}
                                  className="p-1.5 hover:bg-green-500/20 rounded text-gray-400 hover:text-green-500"
                                  title="Force Pass"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  onClick={() => handleForceFail(acc._id)}
                                  className="p-1.5 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-500"
                                  title="Force Fail"
                                >
                                  <X size={14} />
                                </button>
                                <button
                                  onClick={() => handleExtendTime(acc._id)}
                                  className="p-1.5 hover:bg-blue-500/20 rounded text-gray-400 hover:text-blue-500"
                                  title="Extend Time"
                                >
                                  <Clock size={14} />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleResetChallenge(acc._id)}
                              className="p-1.5 hover:bg-yellow-500/20 rounded text-gray-400 hover:text-yellow-500"
                              title="Reset"
                            >
                              <RefreshCw size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredAccounts.length === 0 && (
                <div className="text-center py-12">
                  <Users size={48} className="text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No accounts found.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Challenge Modal */}
        {showChallengeModal && (
          <ChallengeModal
            challenge={editingChallenge}
            onClose={() => {
              setShowChallengeModal(false)
              setEditingChallenge(null)
            }}
            onSave={() => {
              setShowChallengeModal(false)
              setEditingChallenge(null)
              fetchChallenges()
            }}
          />
        )}
      </div>
    </div>
  )
}

function ChallengeModal({ challenge, onClose, onSave }) {
  const [form, setForm] = useState({
    name: challenge?.name || '',
    stepsCount: challenge?.stepsCount ?? 2,
    fundSize: challenge?.fundSize || 10000,
    challengeFee: challenge?.challengeFee || 100,
    isActive: challenge?.isActive ?? true,
    rules: {
      maxDailyDrawdownPercent: challenge?.rules?.maxDailyDrawdownPercent || 5,
      maxOverallDrawdownPercent: challenge?.rules?.maxOverallDrawdownPercent || 10,
      profitTargetPhase1Percent: challenge?.rules?.profitTargetPhase1Percent || 8,
      profitTargetPhase2Percent: challenge?.rules?.profitTargetPhase2Percent || 5,
      stopLossMandatory: challenge?.rules?.stopLossMandatory ?? true,
      maxTradesPerDay: challenge?.rules?.maxTradesPerDay || null,
      maxConcurrentTrades: challenge?.rules?.maxConcurrentTrades || null,
      minTradeHoldTimeSeconds: challenge?.rules?.minTradeHoldTimeSeconds || 0,
      challengeExpiryDays: challenge?.rules?.challengeExpiryDays || 30
    },
    fundedSettings: {
      profitSplitPercent: challenge?.fundedSettings?.profitSplitPercent || 80
    }
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const url = challenge
        ? `${API_URL}/prop/admin/challenges/${challenge._id}`
        : `${API_URL}/prop/admin/challenges`
      const method = challenge ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (data.success) {
        onSave()
      } else {
        alert(data.message || 'Error saving challenge')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error saving challenge')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">
            {challenge ? 'Edit Challenge' : 'Create Challenge'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white"
                required
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Steps</label>
              <select
                value={form.stepsCount}
                onChange={(e) => setForm({ ...form, stepsCount: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white"
              >
                <option value={0}>Instant Fund (0 Steps)</option>
                <option value={1}>1-Step</option>
                <option value={2}>2-Step</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Fund Size ($)</label>
              <input
                type="number"
                value={form.fundSize}
                onChange={(e) => setForm({ ...form, fundSize: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white"
                required
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Challenge Fee ($)</label>
              <input
                type="number"
                value={form.challengeFee}
                onChange={(e) => setForm({ ...form, challengeFee: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white"
                required
              />
            </div>
          </div>

          {/* Rules */}
          <div>
            <h3 className="text-white font-medium mb-3">Risk Rules</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Daily Drawdown (%)</label>
                <input
                  type="number"
                  value={form.rules.maxDailyDrawdownPercent}
                  onChange={(e) => setForm({
                    ...form,
                    rules: { ...form.rules, maxDailyDrawdownPercent: parseFloat(e.target.value) }
                  })}
                  className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Overall Drawdown (%)</label>
                <input
                  type="number"
                  value={form.rules.maxOverallDrawdownPercent}
                  onChange={(e) => setForm({
                    ...form,
                    rules: { ...form.rules, maxOverallDrawdownPercent: parseFloat(e.target.value) }
                  })}
                  className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Phase 1 Target (%)</label>
                <input
                  type="number"
                  value={form.rules.profitTargetPhase1Percent}
                  onChange={(e) => setForm({
                    ...form,
                    rules: { ...form.rules, profitTargetPhase1Percent: parseFloat(e.target.value) }
                  })}
                  className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Phase 2 Target (%)</label>
                <input
                  type="number"
                  value={form.rules.profitTargetPhase2Percent}
                  onChange={(e) => setForm({
                    ...form,
                    rules: { ...form.rules, profitTargetPhase2Percent: parseFloat(e.target.value) }
                  })}
                  className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Expiry Days</label>
                <input
                  type="number"
                  value={form.rules.challengeExpiryDays}
                  onChange={(e) => setForm({
                    ...form,
                    rules: { ...form.rules, challengeExpiryDays: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Profit Split (%)</label>
                <input
                  type="number"
                  value={form.fundedSettings.profitSplitPercent}
                  onChange={(e) => setForm({
                    ...form,
                    fundedSettings: { ...form.fundedSettings, profitSplitPercent: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
          </div>

          {/* Trade Rules */}
          <div>
            <h3 className="text-white font-medium mb-3">Trade Rules</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Max Trades/Day (0 = unlimited)</label>
                <input
                  type="number"
                  value={form.rules.maxTradesPerDay || 0}
                  onChange={(e) => setForm({
                    ...form,
                    rules: { ...form.rules, maxTradesPerDay: parseInt(e.target.value) || null }
                  })}
                  className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Max Concurrent (0 = unlimited)</label>
                <input
                  type="number"
                  value={form.rules.maxConcurrentTrades || 0}
                  onChange={(e) => setForm({
                    ...form,
                    rules: { ...form.rules, maxConcurrentTrades: parseInt(e.target.value) || null }
                  })}
                  className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Min Hold Time (seconds)</label>
                <input
                  type="number"
                  value={form.rules.minTradeHoldTimeSeconds}
                  onChange={(e) => setForm({
                    ...form,
                    rules: { ...form.rules, minTradeHoldTimeSeconds: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="slMandatory"
                  checked={form.rules.stopLossMandatory}
                  onChange={(e) => setForm({
                    ...form,
                    rules: { ...form.rules, stopLossMandatory: e.target.checked }
                  })}
                  className="w-4 h-4"
                />
                <label htmlFor="slMandatory" className="text-gray-400">Stop Loss Mandatory</label>
              </div>
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="isActive" className="text-gray-400">Challenge Active</label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Challenge'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
