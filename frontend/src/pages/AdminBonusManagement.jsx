import { useState, useEffect } from 'react'
import AdminLayout from '../components/AdminLayout'
import { Plus, Edit2, Trash2, Gift, DollarSign, Percent, Calendar, Users, TrendingUp, FileText, Eye, EyeOff } from 'lucide-react'
import { API_URL } from '../config/api'

const AdminBonusManagement = () => {
  const [bonuses, setBonuses] = useState([])
  const [userBonuses, setUserBonuses] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingBonus, setEditingBonus] = useState(null)
  const [activeTab, setActiveTab] = useState('bonuses')
  const [formData, setFormData] = useState({
    name: '',
    type: 'FIRST_DEPOSIT',
    bonusType: 'PERCENTAGE',
    bonusValue: '',
    minDeposit: '',
    maxBonus: '',
    wagerRequirement: '30',
    maxWithdrawal: '',
    duration: '30',
    status: 'ACTIVE',
    description: '',
    terms: '',
    usageLimit: '',
    endDate: ''
  })

  useEffect(() => {
    fetchBonuses()
    fetchUserBonuses()
  }, [])

  const fetchBonuses = async () => {
    try {
      const res = await fetch(`${API_URL}/bonus`)
      const data = await res.json()
      if (data.success) {
        setBonuses(data.data)
      }
    } catch (error) {
      console.error('Error fetching bonuses:', error)
    }
  }

  const fetchUserBonuses = async () => {
    try {
      const res = await fetch(`${API_URL}/bonus/user-bonuses`)
      const data = await res.json()
      if (data.success) {
        setUserBonuses(data.data)
      }
    } catch (error) {
      console.error('Error fetching user bonuses:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = editingBonus ? `${API_URL}/bonus/${editingBonus._id}` : `${API_URL}/bonus`
      const method = editingBonus ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await res.json()
      if (data.success) {
        fetchBonuses()
        setShowModal(false)
        resetForm()
      }
    } catch (error) {
      console.error('Error saving bonus:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (bonus) => {
    setEditingBonus(bonus)
    setFormData({
      name: bonus.name,
      type: bonus.type,
      bonusType: bonus.bonusType,
      bonusValue: bonus.bonusValue,
      minDeposit: bonus.minDeposit,
      maxBonus: bonus.maxBonus || '',
      wagerRequirement: bonus.wagerRequirement,
      maxWithdrawal: bonus.maxWithdrawal || '',
      duration: bonus.duration,
      status: bonus.status,
      description: bonus.description,
      terms: bonus.terms,
      usageLimit: bonus.usageLimit || '',
      endDate: bonus.endDate ? new Date(bonus.endDate).toISOString().split('T')[0] : ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this bonus?')) return

    try {
      const res = await fetch(`${API_URL}/bonus/${id}`, {
        method: 'DELETE'
      })

      const data = await res.json()
      if (data.success) {
        fetchBonuses()
      }
    } catch (error) {
      console.error('Error deleting bonus:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'FIRST_DEPOSIT',
      bonusType: 'PERCENTAGE',
      bonusValue: '',
      minDeposit: '',
      maxBonus: '',
      wagerRequirement: '30',
      maxWithdrawal: '',
      duration: '30',
      status: 'ACTIVE',
      description: '',
      terms: '',
      usageLimit: '',
      endDate: ''
    })
    setEditingBonus(null)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'text-green-500 bg-green-500/20'
      case 'INACTIVE': return 'text-yellow-500 bg-yellow-500/20'
      case 'EXPIRED': return 'text-red-500 bg-red-500/20'
      default: return 'text-gray-500 bg-gray-500/20'
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'FIRST_DEPOSIT': return 'text-purple-500 bg-purple-500/20'
      case 'DEPOSIT': return 'text-blue-500 bg-blue-500/20'
      case 'RELOAD': return 'text-orange-500 bg-orange-500/20'
      case 'SPECIAL': return 'text-pink-500 bg-pink-500/20'
      default: return 'text-gray-500 bg-gray-500/20'
    }
  }

  return (
    <AdminLayout className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Gift className="text-accent-green" />
          Bonus Management
        </h1>
        <button
          onClick={() => { setShowModal(true); resetForm() }}
          className="bg-accent-green text-black px-4 py-2 rounded-lg font-medium hover:bg-accent-green/90 flex items-center gap-2"
        >
          <Plus size={16} />
          Create Bonus
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('bonuses')}
          className={`pb-2 px-1 ${activeTab === 'bonuses' ? 'text-accent-green border-b-2 border-accent-green' : 'text-gray-400'}`}
        >
          Bonus Templates
        </button>
        <button
          onClick={() => setActiveTab('user-bonuses')}
          className={`pb-2 px-1 ${activeTab === 'user-bonuses' ? 'text-accent-green border-b-2 border-accent-green' : 'text-gray-400'}`}
        >
          User Bonuses
        </button>
      </div>

      {/* Bonus Templates Tab */}
      {activeTab === 'bonuses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bonuses.map((bonus) => (
            <div key={bonus._id} className="bg-dark-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-white font-semibold">{bonus.name}</h3>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${getTypeColor(bonus.type)}`}>
                    {bonus.type.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(bonus)}
                    className="text-blue-500 hover:text-blue-400"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(bonus._id)}
                    className="text-red-500 hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Bonus:</span>
                  <span className="text-white font-medium">
                    {bonus.bonusType === 'PERCENTAGE' ? (
                      <span className="flex items-center gap-1">
                        <Percent size={14} />
                        {bonus.bonusValue}%
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <DollarSign size={14} />
                        ${bonus.bonusValue}
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Min Deposit:</span>
                  <span className="text-white">${bonus.minDeposit}</span>
                </div>

                {bonus.maxBonus && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Max Bonus:</span>
                    <span className="text-white">${bonus.maxBonus}</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Wager:</span>
                  <span className="text-white">{bonus.wagerRequirement}x</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Duration:</span>
                  <span className="text-white">{bonus.duration} days</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Used:</span>
                  <span className="text-white">
                    {bonus.usedCount}{bonus.usageLimit && `/${bonus.usageLimit}`}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bonus.status)}`}>
                    {bonus.status}
                  </span>
                </div>
              </div>

              {bonus.description && (
                <p className="text-gray-400 text-sm mt-3 line-clamp-2">{bonus.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* User Bonuses Tab */}
      {activeTab === 'user-bonuses' && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400">User</th>
                <th className="text-left py-3 px-4 text-gray-400">Bonus</th>
                <th className="text-left py-3 px-4 text-gray-400">Amount</th>
                <th className="text-left py-3 px-4 text-gray-400">Wager Req</th>
                <th className="text-left py-3 px-4 text-gray-400">Remaining</th>
                <th className="text-left py-3 px-4 text-gray-400">Status</th>
                <th className="text-left py-3 px-4 text-gray-400">Expires</th>
              </tr>
            </thead>
            <tbody>
              {userBonuses.map((userBonus) => (
                <tr key={userBonus._id} className="border-b border-gray-700">
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-white">{userBonus.userId?.firstName} {userBonus.userId?.lastName}</p>
                      <p className="text-gray-400 text-sm">{userBonus.userId?.email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-white">{userBonus.bonusId?.name}</td>
                  <td className="py-3 px-4 text-green-500">${userBonus.bonusAmount}</td>
                  <td className="py-3 px-4 text-gray-400">${userBonus.wagerRequirement}</td>
                  <td className="py-3 px-4 text-yellow-500">${userBonus.remainingWager}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(userBonus.status)}`}>
                      {userBonus.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-400">
                    {userBonus.expiresAt ? new Date(userBonus.expiresAt).toLocaleDateString() : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl w-full max-w-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-white font-semibold">
                {editingBonus ? 'Edit Bonus' : 'Create Bonus'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Bonus Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  >
                    <option value="FIRST_DEPOSIT">First Deposit</option>
                    <option value="DEPOSIT">Regular Deposit</option>
                    <option value="RELOAD">Reload Bonus</option>
                    <option value="SPECIAL">Special Bonus</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Bonus Type</label>
                  <select
                    value={formData.bonusType}
                    onChange={(e) => setFormData({...formData, bonusType: e.target.value})}
                    className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed Amount</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Bonus Value</label>
                  <input
                    type="number"
                    value={formData.bonusValue}
                    onChange={(e) => setFormData({...formData, bonusValue: e.target.value})}
                    className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Min Deposit</label>
                  <input
                    type="number"
                    value={formData.minDeposit}
                    onChange={(e) => setFormData({...formData, minDeposit: e.target.value})}
                    className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Max Bonus (Optional)</label>
                  <input
                    type="number"
                    value={formData.maxBonus}
                    onChange={(e) => setFormData({...formData, maxBonus: e.target.value})}
                    className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Wager Requirement (x)</label>
                  <input
                    type="number"
                    value={formData.wagerRequirement}
                    onChange={(e) => setFormData({...formData, wagerRequirement: e.target.value})}
                    className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Max Withdrawal (Optional)</label>
                  <input
                    type="number"
                    value={formData.maxWithdrawal}
                    onChange={(e) => setFormData({...formData, maxWithdrawal: e.target.value})}
                    className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Duration (Days)</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: e.target.value})}
                    className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Usage Limit (Optional)</label>
                  <input
                    type="number"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({...formData, usageLimit: e.target.value})}
                    className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    placeholder="Leave empty for unlimited"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">End Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  rows="3"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Terms & Conditions</label>
                <textarea
                  value={formData.terms}
                  onChange={(e) => setFormData({...formData, terms: e.target.value})}
                  className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  rows="4"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-dark-700 text-white rounded-lg hover:bg-dark-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-accent-green text-black font-medium rounded-lg hover:bg-accent-green/90 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingBonus ? 'Update Bonus' : 'Create Bonus')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default AdminBonusManagement
