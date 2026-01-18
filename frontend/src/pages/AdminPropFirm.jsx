import { useState, useEffect } from 'react'
import AdminLayout from '../components/AdminLayout'
import { 
  Trophy,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Users,
  Target,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  ToggleLeft,
  ToggleRight,
  Settings,
  X
} from 'lucide-react'
import { API_URL } from '../config/api'

const AdminPropFirm = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('challenges')
  const [challengeModeEnabled, setChallengeModeEnabled] = useState(false)
  const [challenges, setChallenges] = useState([])
  const [participants, setParticipants] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showChallengeModal, setShowChallengeModal] = useState(false)
  const [editingChallenge, setEditingChallenge] = useState(null)
  const [settings, setSettings] = useState({
    displayName: 'Prop Trading Challenge',
    description: 'Trade with our capital. Pass the challenge and get funded.',
    termsAndConditions: ''
  })
  
  const defaultChallengeForm = {
    name: '',
    description: '',
    stepsCount: 2,
    fundSize: 10000,
    challengeFee: 99,
    rules: {
      maxDailyDrawdownPercent: 5,
      maxOverallDrawdownPercent: 10,
      profitTargetPhase1Percent: 8,
      profitTargetPhase2Percent: 5,
      minLotSize: 0.01,
      maxLotSize: 100,
      minTradesRequired: 1,
      maxTradesPerDay: null,
      maxTotalTrades: null,
      maxConcurrentTrades: null,
      stopLossMandatory: true,
      takeProfitMandatory: false,
      minTradeHoldTimeSeconds: 0,
      maxLeverage: 100,
      allowWeekendHolding: false,
      allowNewsTrading: true,
      tradingDaysRequired: null,
      challengeExpiryDays: 30,
      allowedSegments: ['FOREX', 'CRYPTO', 'STOCKS', 'COMMODITIES', 'INDICES']
    },
    fundedSettings: {
      profitSplitPercent: 80,
      withdrawalFrequencyDays: 14
    },
    isActive: true
  }
  
  const [challengeForm, setChallengeForm] = useState(defaultChallengeForm)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch settings
      const settingsRes = await fetch(`${API_URL}/prop/admin/settings`)
      const settingsData = await settingsRes.json()
      if (settingsData.success) {
        setChallengeModeEnabled(settingsData.settings.challengeModeEnabled)
        setSettings({
          displayName: settingsData.settings.displayName || 'Prop Trading Challenge',
          description: settingsData.settings.description || '',
          termsAndConditions: settingsData.settings.termsAndConditions || ''
        })
      }

      // Fetch challenges
      const challengesRes = await fetch(`${API_URL}/prop/admin/challenges`)
      const challengesData = await challengesRes.json()
      if (challengesData.success) {
        setChallenges(challengesData.challenges || [])
      }

      // Fetch participants
      const accountsRes = await fetch(`${API_URL}/prop/admin/accounts?limit=50`)
      const accountsData = await accountsRes.json()
      if (accountsData.success) {
        setParticipants(accountsData.accounts || [])
      }

      // Fetch dashboard stats
      const dashRes = await fetch(`${API_URL}/prop/admin/dashboard`)
      const dashData = await dashRes.json()
      if (dashData.success) {
        setStats(dashData.stats || {})
      }
    } catch (error) {
      console.error('Error fetching prop data:', error)
    }
    setLoading(false)
  }

  const toggleChallengeMode = async () => {
    try {
      const newValue = !challengeModeEnabled
      const res = await fetch(`${API_URL}/prop/admin/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeModeEnabled: newValue })
      })
      const data = await res.json()
      if (data.success) {
        setChallengeModeEnabled(newValue)
        alert(newValue ? 'Challenge mode enabled! Users can now buy challenges.' : 'Challenge mode disabled.')
      }
    } catch (error) {
      console.error('Error toggling challenge mode:', error)
      alert('Failed to update challenge mode')
    }
  }

  const saveSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/prop/admin/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeModeEnabled,
          ...settings
        })
      })
      const data = await res.json()
      if (data.success) {
        alert('Settings saved successfully!')
        setShowSettingsModal(false)
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    }
  }

  const openAddChallenge = () => {
    setEditingChallenge(null)
    setChallengeForm(defaultChallengeForm)
    setShowChallengeModal(true)
  }

  const openEditChallenge = (challenge) => {
    setEditingChallenge(challenge)
    setChallengeForm({
      name: challenge.name || '',
      description: challenge.description || '',
      stepsCount: challenge.stepsCount || 2,
      fundSize: challenge.fundSize || 10000,
      challengeFee: challenge.challengeFee || 99,
      rules: {
        ...defaultChallengeForm.rules,
        ...challenge.rules
      },
      fundedSettings: {
        ...defaultChallengeForm.fundedSettings,
        ...challenge.fundedSettings
      },
      isActive: challenge.isActive !== false
    })
    setShowChallengeModal(true)
  }

  const saveChallenge = async () => {
    if (!challengeForm.name) {
      alert('Please enter a challenge name')
      return
    }
    try {
      const url = editingChallenge 
        ? `${API_URL}/prop/admin/challenges/${editingChallenge._id}`
        : `${API_URL}/prop/admin/challenges`
      const method = editingChallenge ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(challengeForm)
      })
      const data = await res.json()
      if (data.success) {
        alert(editingChallenge ? 'Challenge updated!' : 'Challenge created!')
        setShowChallengeModal(false)
        fetchData()
      } else {
        alert(data.message || 'Failed to save challenge')
      }
    } catch (error) {
      console.error('Error saving challenge:', error)
      alert('Failed to save challenge')
    }
  }

  const deleteChallenge = async (challengeId) => {
    if (!confirm('Are you sure you want to delete this challenge?')) return
    try {
      const res = await fetch(`${API_URL}/prop/admin/challenges/${challengeId}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        alert('Challenge deleted!')
        fetchData()
      } else {
        alert(data.message || 'Failed to delete challenge')
      }
    } catch (error) {
      console.error('Error deleting challenge:', error)
      alert('Failed to delete challenge')
    }
  }

  const updateFormRules = (field, value) => {
    setChallengeForm({
      ...challengeForm,
      rules: { ...challengeForm.rules, [field]: value }
    })
  }

  const updateFormFunded = (field, value) => {
    setChallengeForm({
      ...challengeForm,
      fundedSettings: { ...challengeForm.fundedSettings, [field]: value }
    })
  }

  const getStatusColor = (status) => {
    const s = status?.toUpperCase()
    switch (s) {
      case 'ACTIVE': return 'bg-blue-500/20 text-blue-500'
      case 'PASSED': return 'bg-green-500/20 text-green-500'
      case 'FUNDED': return 'bg-purple-500/20 text-purple-500'
      case 'FAILED': return 'bg-red-500/20 text-red-500'
      case 'EXPIRED': return 'bg-orange-500/20 text-orange-500'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getStatusIcon = (status) => {
    const s = status?.toUpperCase()
    switch (s) {
      case 'ACTIVE': return <Clock size={14} />
      case 'PASSED': 
      case 'FUNDED': return <CheckCircle size={14} />
      case 'FAILED': 
      case 'EXPIRED': return <XCircle size={14} />
      default: return null
    }
  }

  return (
    <AdminLayout title="Prop Firm Challenges" subtitle="Manage trading challenges and funded accounts">
      {/* Challenge Mode Toggle */}
      <div className="bg-dark-800 rounded-xl p-5 border border-gray-800 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${challengeModeEnabled ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
              <Trophy size={24} className={challengeModeEnabled ? 'text-green-500' : 'text-gray-500'} />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">Challenge Mode</h3>
              <p className="text-gray-500 text-sm">
                {challengeModeEnabled 
                  ? 'Users can buy and participate in challenges' 
                  : 'Challenge purchases are disabled for users'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 hover:bg-dark-700 rounded-lg transition-colors text-gray-400 hover:text-white"
              title="Settings"
            >
              <Settings size={20} />
            </button>
            <button
              onClick={toggleChallengeMode}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                challengeModeEnabled 
                  ? 'bg-green-500 text-white hover:bg-green-600' 
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
            >
              {challengeModeEnabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
              {challengeModeEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={18} className="text-yellow-500" />
            <p className="text-gray-500 text-sm">Active Challenges</p>
          </div>
          <p className="text-white text-2xl font-bold">{stats.totalChallenges || challenges.length}</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Users size={18} className="text-blue-500" />
            <p className="text-gray-500 text-sm">Total Participants</p>
          </div>
          <p className="text-white text-2xl font-bold">{stats.totalAccounts || 0}</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={18} className="text-green-500" />
            <p className="text-gray-500 text-sm">Passed</p>
          </div>
          <p className="text-white text-2xl font-bold">{stats.passedAccounts || 0}</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <XCircle size={18} className="text-red-500" />
            <p className="text-gray-500 text-sm">Failed</p>
          </div>
          <p className="text-white text-2xl font-bold">{stats.failedAccounts || 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('challenges')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'challenges' ? 'bg-yellow-500 text-black' : 'bg-dark-700 text-gray-400 hover:text-white'
          }`}
        >
          Challenges
        </button>
        <button
          onClick={() => setActiveTab('participants')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'participants' ? 'bg-yellow-500 text-black' : 'bg-dark-700 text-gray-400 hover:text-white'
          }`}
        >
          Participants
        </button>
      </div>

      {/* Challenges Tab */}
      {activeTab === 'challenges' && (
        <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-800">
            <h2 className="text-white font-semibold text-lg">Challenge Types</h2>
            <button 
              onClick={openAddChallenge}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add Challenge</span>
            </button>
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {challenges.length === 0 ? (
              <div className="col-span-2 text-center py-12">
                <Trophy size={48} className="text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500">No challenges created yet</p>
                <p className="text-gray-600 text-sm">Click "Add Challenge" to create your first challenge</p>
              </div>
            ) : (
              challenges.map((challenge) => (
                <div key={challenge._id} className="bg-dark-700 rounded-xl p-5 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold text-lg">{challenge.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs ${challenge.isActive ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-400'}`}>
                      {challenge.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <p className="text-gray-500 text-sm">Account Size</p>
                      <p className="text-white font-medium">${(challenge.fundSize || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm">Profit Target</p>
                      <p className="text-green-500 font-medium">{challenge.profitTarget || 8}%</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm">Max Drawdown</p>
                      <p className="text-red-500 font-medium">{challenge.maxDrawdown || 10}%</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm">Duration</p>
                      <p className="text-white font-medium">{challenge.durationDays || 30} days</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-600">
                    <div>
                      <p className="text-yellow-500 font-bold text-xl">${(challenge.challengeFee || 0).toLocaleString()}</p>
                      <p className="text-gray-500 text-sm">{challenge.stepsCount === 0 ? 'Instant Fund' : challenge.stepsCount === 1 ? '1-Step' : '2-Step'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => openEditChallenge(challenge)}
                        className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-white"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => deleteChallenge(challenge._id)}
                        className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Participants Tab */}
      {activeTab === 'participants' && (
        <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 border-b border-gray-800">
            <h2 className="text-white font-semibold text-lg">Challenge Participants</h2>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search participants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 bg-dark-700 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
              />
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="block lg:hidden p-4 space-y-3">
            {participants.length === 0 ? (
              <div className="text-center py-12">
                <Users size={48} className="text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500">No participants yet</p>
              </div>
            ) : (
              participants.map((p) => (
                <div key={p._id} className="bg-dark-700 rounded-xl p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-white font-medium">{p.userId?.firstName || p.userId?.email || 'Unknown'}</p>
                      <p className="text-gray-500 text-sm">{p.challengeId?.name || 'Challenge'}</p>
                    </div>
                    <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(p.status)}`}>
                      {getStatusIcon(p.status)}
                      {p.status}
                    </span>
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Balance</span>
                      <span className="text-white">${(p.currentBalance || 0).toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-dark-600 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${p.status === 'FAILED' ? 'bg-red-500' : p.status === 'PASSED' ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(((p.currentBalance - p.initialBalance) / p.initialBalance * 100) + 50, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">P&L</span>
                    <span className={(p.currentBalance - p.initialBalance) >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {(p.currentBalance - p.initialBalance) >= 0 ? '+' : ''}${((p.currentBalance || 0) - (p.initialBalance || 0)).toLocaleString()}
                    </span>
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
                  <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Challenge</th>
                  <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Balance</th>
                  <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">P&L</th>
                  <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Status</th>
                  <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Start Date</th>
                  <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {participants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">No participants yet</td>
                  </tr>
                ) : (
                  participants.map((p) => {
                    const pnl = (p.currentBalance || 0) - (p.initialBalance || 0)
                    return (
                      <tr key={p._id} className="border-b border-gray-800 hover:bg-dark-700/50">
                        <td className="py-4 px-4 text-white font-medium">{p.userId?.firstName || p.userId?.email || 'Unknown'}</td>
                        <td className="py-4 px-4 text-gray-400">{p.challengeId?.name || 'Challenge'}</td>
                        <td className="py-4 px-4 text-white">${(p.currentBalance || 0).toLocaleString()}</td>
                        <td className={`py-4 px-4 font-medium ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {pnl >= 0 ? '+' : ''}${pnl.toLocaleString()}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs w-fit ${getStatusColor(p.status)}`}>
                            {getStatusIcon(p.status)}
                            {p.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                        <td className="py-4 px-4">
                          <button className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-white">
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Challenge Settings</h2>
              <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Display Name</label>
                <input
                  type="text"
                  value={settings.displayName}
                  onChange={(e) => setSettings({...settings, displayName: e.target.value})}
                  placeholder="Prop Trading Challenge"
                  className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Description</label>
                <textarea
                  value={settings.description}
                  onChange={(e) => setSettings({...settings, description: e.target.value})}
                  placeholder="Trade with our capital..."
                  rows={3}
                  className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white resize-none"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Terms & Conditions</label>
                <textarea
                  value={settings.termsAndConditions}
                  onChange={(e) => setSettings({...settings, termsAndConditions: e.target.value})}
                  placeholder="Enter terms and conditions..."
                  rows={5}
                  className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 py-3 bg-dark-700 text-white rounded-lg hover:bg-dark-600"
                >
                  Cancel
                </button>
                <button
                  onClick={saveSettings}
                  className="flex-1 py-3 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-400"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Challenge Create/Edit Modal */}
      {showChallengeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-dark-800 z-10">
              <h2 className="text-xl font-bold text-white">
                {editingChallenge ? 'Edit Challenge' : 'Create New Challenge'}
              </h2>
              <button onClick={() => setShowChallengeModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-gray-400 text-sm mb-2">Challenge Name *</label>
                  <input
                    type="text"
                    value={challengeForm.name}
                    onChange={(e) => setChallengeForm({...challengeForm, name: e.target.value})}
                    placeholder="e.g., Starter Challenge"
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-gray-400 text-sm mb-2">Description</label>
                  <textarea
                    value={challengeForm.description}
                    onChange={(e) => setChallengeForm({...challengeForm, description: e.target.value})}
                    placeholder="Challenge description..."
                    rows={2}
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white resize-none"
                  />
                </div>
              </div>

              {/* Challenge Type & Pricing */}
              <div className="bg-dark-700 rounded-xl p-4 border border-gray-700">
                <h3 className="text-white font-semibold mb-4">Challenge Type & Pricing</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Challenge Type</label>
                    <select
                      value={challengeForm.stepsCount}
                      onChange={(e) => setChallengeForm({...challengeForm, stepsCount: parseInt(e.target.value)})}
                      className="w-full bg-dark-600 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    >
                      <option value={0}>Instant Fund (0-Step)</option>
                      <option value={1}>1-Step Challenge</option>
                      <option value={2}>2-Step Challenge</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Account Size ($)</label>
                    <input
                      type="number"
                      value={challengeForm.fundSize}
                      onChange={(e) => setChallengeForm({...challengeForm, fundSize: parseFloat(e.target.value) || 0})}
                      className="w-full bg-dark-600 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Challenge Fee ($)</label>
                    <input
                      type="number"
                      value={challengeForm.challengeFee}
                      onChange={(e) => setChallengeForm({...challengeForm, challengeFee: parseFloat(e.target.value) || 0})}
                      className="w-full bg-dark-600 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Drawdown & Profit Rules */}
              <div className="bg-dark-700 rounded-xl p-4 border border-gray-700">
                <h3 className="text-white font-semibold mb-4">Drawdown & Profit Rules</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Daily Drawdown %</label>
                    <input
                      type="number"
                      value={challengeForm.rules.maxDailyDrawdownPercent}
                      onChange={(e) => updateFormRules('maxDailyDrawdownPercent', parseFloat(e.target.value) || 0)}
                      className="w-full bg-dark-600 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Overall Drawdown %</label>
                    <input
                      type="number"
                      value={challengeForm.rules.maxOverallDrawdownPercent}
                      onChange={(e) => updateFormRules('maxOverallDrawdownPercent', parseFloat(e.target.value) || 0)}
                      className="w-full bg-dark-600 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Phase 1 Target %</label>
                    <input
                      type="number"
                      value={challengeForm.rules.profitTargetPhase1Percent}
                      onChange={(e) => updateFormRules('profitTargetPhase1Percent', parseFloat(e.target.value) || 0)}
                      className="w-full bg-dark-600 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Phase 2 Target %</label>
                    <input
                      type="number"
                      value={challengeForm.rules.profitTargetPhase2Percent}
                      onChange={(e) => updateFormRules('profitTargetPhase2Percent', parseFloat(e.target.value) || 0)}
                      className="w-full bg-dark-600 border border-gray-600 rounded-lg px-4 py-3 text-white"
                      disabled={challengeForm.stepsCount < 2}
                    />
                  </div>
                </div>
              </div>

              {/* Lot Size & Trade Limits */}
              <div className="bg-dark-700 rounded-xl p-4 border border-gray-700">
                <h3 className="text-white font-semibold mb-4">Lot Size & Trade Limits</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Min Lot Size</label>
                    <input
                      type="number"
                      step="0.01"
                      value={challengeForm.rules.minLotSize}
                      onChange={(e) => updateFormRules('minLotSize', parseFloat(e.target.value) || 0.01)}
                      className="w-full bg-dark-600 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Max Lot Size</label>
                    <input
                      type="number"
                      value={challengeForm.rules.maxLotSize}
                      onChange={(e) => updateFormRules('maxLotSize', parseFloat(e.target.value) || 100)}
                      className="w-full bg-dark-600 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Min Trades Required</label>
                    <input
                      type="number"
                      value={challengeForm.rules.minTradesRequired || ''}
                      onChange={(e) => updateFormRules('minTradesRequired', parseInt(e.target.value) || null)}
                      placeholder="No limit"
                      className="w-full bg-dark-600 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Max Trades/Day</label>
                    <input
                      type="number"
                      value={challengeForm.rules.maxTradesPerDay || ''}
                      onChange={(e) => updateFormRules('maxTradesPerDay', parseInt(e.target.value) || null)}
                      placeholder="No limit"
                      className="w-full bg-dark-600 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Max Total Trades</label>
                    <input
                      type="number"
                      value={challengeForm.rules.maxTotalTrades || ''}
                      onChange={(e) => updateFormRules('maxTotalTrades', parseInt(e.target.value) || null)}
                      placeholder="No limit"
                      className="w-full bg-dark-600 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Max Concurrent</label>
                    <input
                      type="number"
                      value={challengeForm.rules.maxConcurrentTrades || ''}
                      onChange={(e) => updateFormRules('maxConcurrentTrades', parseInt(e.target.value) || null)}
                      placeholder="No limit"
                      className="w-full bg-dark-600 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Max Leverage</label>
                    <input
                      type="number"
                      value={challengeForm.rules.maxLeverage}
                      onChange={(e) => updateFormRules('maxLeverage', parseInt(e.target.value) || 100)}
                      className="w-full bg-dark-600 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Min Hold Time (sec)</label>
                    <input
                      type="number"
                      value={challengeForm.rules.minTradeHoldTimeSeconds}
                      onChange={(e) => updateFormRules('minTradeHoldTimeSeconds', parseInt(e.target.value) || 0)}
                      className="w-full bg-dark-600 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Time & Duration */}
              <div className="bg-dark-700 rounded-xl p-4 border border-gray-700">
                <h3 className="text-white font-semibold mb-4">Time & Duration</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Challenge Duration (days)</label>
                    <input
                      type="number"
                      value={challengeForm.rules.challengeExpiryDays}
                      onChange={(e) => updateFormRules('challengeExpiryDays', parseInt(e.target.value) || 30)}
                      className="w-full bg-dark-600 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Min Trading Days</label>
                    <input
                      type="number"
                      value={challengeForm.rules.tradingDaysRequired || ''}
                      onChange={(e) => updateFormRules('tradingDaysRequired', parseInt(e.target.value) || null)}
                      placeholder="No minimum"
                      className="w-full bg-dark-600 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Profit Split %</label>
                    <input
                      type="number"
                      value={challengeForm.fundedSettings.profitSplitPercent}
                      onChange={(e) => updateFormFunded('profitSplitPercent', parseInt(e.target.value) || 80)}
                      className="w-full bg-dark-600 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Trading Rules Toggles */}
              <div className="bg-dark-700 rounded-xl p-4 border border-gray-700">
                <h3 className="text-white font-semibold mb-4">Trading Rules</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={challengeForm.rules.stopLossMandatory}
                      onChange={(e) => updateFormRules('stopLossMandatory', e.target.checked)}
                      className="w-5 h-5 rounded bg-dark-600 border-gray-600 text-yellow-500"
                    />
                    <span className="text-white text-sm">Stop Loss Required</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={challengeForm.rules.takeProfitMandatory}
                      onChange={(e) => updateFormRules('takeProfitMandatory', e.target.checked)}
                      className="w-5 h-5 rounded bg-dark-600 border-gray-600 text-yellow-500"
                    />
                    <span className="text-white text-sm">Take Profit Required</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={challengeForm.rules.allowWeekendHolding}
                      onChange={(e) => updateFormRules('allowWeekendHolding', e.target.checked)}
                      className="w-5 h-5 rounded bg-dark-600 border-gray-600 text-yellow-500"
                    />
                    <span className="text-white text-sm">Weekend Holding</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={challengeForm.rules.allowNewsTrading}
                      onChange={(e) => updateFormRules('allowNewsTrading', e.target.checked)}
                      className="w-5 h-5 rounded bg-dark-600 border-gray-600 text-yellow-500"
                    />
                    <span className="text-white text-sm">News Trading</span>
                  </label>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={challengeForm.isActive}
                    onChange={(e) => setChallengeForm({...challengeForm, isActive: e.target.checked})}
                    className="w-5 h-5 rounded bg-dark-600 border-gray-600 text-yellow-500"
                  />
                  <span className="text-white">Active (visible to users)</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-700">
                <button
                  onClick={() => setShowChallengeModal(false)}
                  className="flex-1 py-3 bg-dark-700 text-white rounded-lg hover:bg-dark-600"
                >
                  Cancel
                </button>
                <button
                  onClick={saveChallenge}
                  className="flex-1 py-3 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-400"
                >
                  {editingChallenge ? 'Update Challenge' : 'Create Challenge'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default AdminPropFirm
