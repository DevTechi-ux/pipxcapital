import { useState, useEffect } from 'react'
import AdminLayout from '../components/AdminLayout'
import { 
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  RefreshCw,
  Search,
  User,
  Info,
  TrendingUp,
  Moon
} from 'lucide-react'
import { API_URL } from '../config/api'

const AdminForexCharges = () => {
  const [charges, setCharges] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalType, setModalType] = useState(null) // 'commission', 'spread', 'swap'
  const [editingCharge, setEditingCharge] = useState(null)
  const [users, setUsers] = useState([])
  const [accountTypes, setAccountTypes] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedAccountType, setSelectedAccountType] = useState(null)
  const [form, setForm] = useState({
    level: 'SEGMENT',
    segment: 'Forex',
    instrumentSymbol: '',
    userId: '',
    accountTypeId: '',
    spreadType: 'FIXED',
    spreadValue: 0,
    commissionType: 'PER_LOT',
    commissionValue: 0,
    commissionOnBuy: true,
    commissionOnSell: true,
    commissionOnClose: false,
    swapLong: 0,
    swapShort: 0
  })

  useEffect(() => {
    fetchCharges()
    fetchUsers()
    fetchAccountTypes()
  }, [])

  const fetchAccountTypes = async () => {
    try {
      const res = await fetch(`${API_URL}/account-types/all`)
      const data = await res.json()
      setAccountTypes(data.accountTypes || [])
    } catch (error) {
      console.error('Error fetching account types:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/users`)
      const data = await res.json()
      if (data.success) {
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchCharges = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/charges?segment=Forex`)
      const data = await res.json()
      if (data.success) {
        setCharges(data.charges || [])
      }
    } catch (error) {
      console.error('Error fetching charges:', error)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    try {
      const url = editingCharge 
        ? `${API_URL}/charges/${editingCharge._id}`
        : `${API_URL}/charges`
      const method = editingCharge ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (data.success) {
        alert(editingCharge ? 'Updated!' : 'Created!')
        setModalType(null)
        setEditingCharge(null)
        resetForm()
        fetchCharges()
      } else {
        alert(data.message || 'Error saving')
      }
    } catch (error) {
      alert('Error saving')
    }
  }

  const handleDelete = async (chargeId) => {
    if (!confirm('Are you sure you want to delete this charge?')) return
    try {
      const res = await fetch(`${API_URL}/charges/${chargeId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        alert('Charge deleted!')
        fetchCharges()
      } else {
        alert(data.message || 'Error deleting charge')
      }
    } catch (error) {
      alert('Error deleting charge')
    }
  }

  const openEditModal = (charge, type) => {
    setEditingCharge(charge)
    setForm({
      level: charge.level || 'SEGMENT',
      segment: charge.segment || 'Forex',
      instrumentSymbol: charge.instrumentSymbol || '',
      userId: charge.userId?._id || charge.userId || '',
      accountTypeId: charge.accountTypeId?._id || charge.accountTypeId || '',
      spreadType: charge.spreadType || 'FIXED',
      spreadValue: charge.spreadValue || 0,
      commissionType: charge.commissionType || 'PER_LOT',
      commissionValue: charge.commissionValue || 0,
      commissionOnBuy: charge.commissionOnBuy !== false,
      commissionOnSell: charge.commissionOnSell !== false,
      commissionOnClose: charge.commissionOnClose || false,
      swapLong: charge.swapLong || 0,
      swapShort: charge.swapShort || 0
    })
    if (charge.level === 'USER' && charge.userId) {
      const user = users.find(u => u._id === (charge.userId?._id || charge.userId))
      setSelectedUser(user || null)
    } else {
      setSelectedUser(null)
    }
    if (charge.level === 'ACCOUNT_TYPE' && charge.accountTypeId) {
      const accType = accountTypes.find(a => a._id === (charge.accountTypeId?._id || charge.accountTypeId))
      setSelectedAccountType(accType || null)
    } else {
      setSelectedAccountType(null)
    }
    setModalType(type)
  }

  const resetForm = () => {
    setForm({
      level: 'SEGMENT',
      segment: 'Forex',
      instrumentSymbol: '',
      userId: '',
      accountTypeId: '',
      spreadType: 'FIXED',
      spreadValue: 0,
      commissionType: 'PER_LOT',
      commissionValue: 0,
      commissionOnBuy: true,
      commissionOnSell: true,
      commissionOnClose: false,
      swapLong: 0,
      swapShort: 0
    })
    setSelectedUser(null)
    setSelectedAccountType(null)
    setUserSearch('')
  }

  const selectUser = (user) => {
    setSelectedUser(user)
    setForm({ ...form, userId: user._id })
    setShowUserDropdown(false)
    setUserSearch('')
  }

  const filteredUsers = users.filter(user => {
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase()
    const searchLower = userSearch.toLowerCase()
    return fullName.includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.phone?.includes(userSearch) ||
      user._id?.includes(userSearch)
  })

  const getLevelLabel = (charge) => {
    if (charge.level === 'USER') {
      const userName = charge.userId?.firstName 
        ? `${charge.userId.firstName} ${charge.userId.lastName || ''}`.trim()
        : charge.userId?.email || 'Unknown User'
      return `${userName} - ${charge.instrumentSymbol || 'All Instruments'}`
    }
    if (charge.level === 'INSTRUMENT') return charge.instrumentSymbol
    if (charge.level === 'SEGMENT') return charge.segment
    if (charge.level === 'GLOBAL') return 'Global'
    return charge.level
  }

  return (
    <AdminLayout title="Forex Charges" subtitle="Manage trading fees and spreads">
      <div className="space-y-6">
        
        {/* COMMISSION SECTION */}
        <div className="bg-dark-800 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                <DollarSign size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-white font-semibold">Commission</h2>
                <p className="text-gray-500 text-sm">Trading fees per lot/trade</p>
              </div>
            </div>
            <button 
              onClick={() => { resetForm(); setEditingCharge(null); setModalType('commission') }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <Plus size={16} />
              <span>Add Commission</span>
            </button>
          </div>
          <div className="p-4">
            {loading ? (
              <p className="text-gray-500 text-center py-4">Loading...</p>
            ) : charges.filter(c => c.commissionValue > 0).length === 0 ? (
              <p className="text-gray-500 text-center py-4">No commission charges configured</p>
            ) : (
              <div className="space-y-2">
                {charges.filter(c => c.commissionValue > 0).map((charge) => (
                  <div key={charge._id} className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 bg-gray-600 text-gray-300 text-xs rounded">{charge.level}</span>
                      <span className="text-white">{getLevelLabel(charge)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-white font-medium">${charge.commissionValue} <span className="text-gray-500 text-sm">({charge.commissionType})</span></span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditModal(charge, 'commission')} className="p-1.5 hover:bg-dark-600 rounded text-gray-400 hover:text-white"><Edit size={14} /></button>
                        <button onClick={() => handleDelete(charge._id)} className="p-1.5 hover:bg-dark-600 rounded text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SPREAD SECTION */}
        <div className="bg-dark-800 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                <TrendingUp size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-white font-semibold">Spread</h2>
                <p className="text-gray-500 text-sm">Bid/Ask price difference</p>
              </div>
            </div>
            <button 
              onClick={() => { resetForm(); setEditingCharge(null); setModalType('spread') }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <Plus size={16} />
              <span>Add Spread</span>
            </button>
          </div>
          <div className="p-4">
            {loading ? (
              <p className="text-gray-500 text-center py-4">Loading...</p>
            ) : charges.filter(c => c.spreadValue > 0).length === 0 ? (
              <p className="text-gray-500 text-center py-4">No spread charges configured</p>
            ) : (
              <div className="space-y-2">
                {charges.filter(c => c.spreadValue > 0).map((charge) => (
                  <div key={charge._id} className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 bg-gray-600 text-gray-300 text-xs rounded">{charge.level}</span>
                      <span className="text-white">{getLevelLabel(charge)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-white font-medium">{charge.spreadValue} <span className="text-gray-500 text-sm">({charge.spreadType})</span></span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditModal(charge, 'spread')} className="p-1.5 hover:bg-dark-600 rounded text-gray-400 hover:text-white"><Edit size={14} /></button>
                        <button onClick={() => handleDelete(charge._id)} className="p-1.5 hover:bg-dark-600 rounded text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SWAP SECTION */}
        <div className="bg-dark-800 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                <Moon size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-white font-semibold">Swap</h2>
                <p className="text-gray-500 text-sm">Overnight holding fees</p>
              </div>
            </div>
            <button 
              onClick={() => { resetForm(); setEditingCharge(null); setModalType('swap') }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <Plus size={16} />
              <span>Add Swap</span>
            </button>
          </div>
          <div className="p-4">
            {loading ? (
              <p className="text-gray-500 text-center py-4">Loading...</p>
            ) : charges.filter(c => c.swapLong !== 0 || c.swapShort !== 0).length === 0 ? (
              <p className="text-gray-500 text-center py-4">No swap charges configured</p>
            ) : (
              <div className="space-y-2">
                {charges.filter(c => c.swapLong !== 0 || c.swapShort !== 0).map((charge) => (
                  <div key={charge._id} className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 bg-gray-600 text-gray-300 text-xs rounded">{charge.level}</span>
                      <span className="text-white">{getLevelLabel(charge)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-white font-medium">Long: {charge.swapLong} | Short: {charge.swapShort}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditModal(charge, 'swap')} className="p-1.5 hover:bg-dark-600 rounded text-gray-400 hover:text-white"><Edit size={14} /></button>
                        <button onClick={() => handleDelete(charge._id)} className="p-1.5 hover:bg-dark-600 rounded text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* COMMISSION MODAL - Cascading Hierarchy */}
      {modalType === 'commission' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl w-full max-w-lg border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-dark-800">
              <h2 className="text-lg font-semibold text-white">{editingCharge ? 'Edit Commission' : 'Add Commission'}</h2>
              <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-4">
              {/* Step 1: Account Type */}
              <div>
                <label className="block text-gray-400 text-xs mb-1">1. Account Type <span className="text-gray-600">(optional)</span></label>
                <select value={form.accountTypeId} onChange={(e) => setForm({ ...form, accountTypeId: e.target.value, level: e.target.value ? 'ACCOUNT_TYPE' : 'GLOBAL' })} className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white text-sm">
                  <option value="">All Account Types (Global)</option>
                  {accountTypes.map(acc => <option key={acc._id} value={acc._id}>{acc.name}</option>)}
                </select>
              </div>

              {/* Step 2: Segment */}
              <div>
                <label className="block text-gray-400 text-xs mb-1">2. Segment <span className="text-gray-600">(optional)</span></label>
                <select value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value, level: e.target.value ? 'SEGMENT' : form.level })} className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white text-sm">
                  <option value="">All Segments</option>
                  <option value="Forex">Forex</option>
                  <option value="Metals">Metals</option>
                  <option value="Crypto">Crypto</option>
                  <option value="Indices">Indices</option>
                </select>
              </div>

              {/* Step 3: Instrument - Filtered by Segment */}
              <div>
                <label className="block text-gray-400 text-xs mb-1">3. Instrument <span className="text-gray-600">(optional{form.segment ? ` - showing ${form.segment} only` : ''})</span></label>
                <select value={form.instrumentSymbol} onChange={(e) => setForm({ ...form, instrumentSymbol: e.target.value, level: e.target.value ? 'INSTRUMENT' : form.level })} className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white text-sm">
                  <option value="">All Instruments</option>
                  {(!form.segment || form.segment === 'Forex') && (
                    <optgroup label="Forex">
                      <option value="EURUSD">EURUSD</option>
                      <option value="GBPUSD">GBPUSD</option>
                      <option value="USDJPY">USDJPY</option>
                      <option value="USDCHF">USDCHF</option>
                      <option value="AUDUSD">AUDUSD</option>
                      <option value="NZDUSD">NZDUSD</option>
                      <option value="USDCAD">USDCAD</option>
                      <option value="EURGBP">EURGBP</option>
                      <option value="EURJPY">EURJPY</option>
                      <option value="GBPJPY">GBPJPY</option>
                    </optgroup>
                  )}
                  {(!form.segment || form.segment === 'Metals') && (
                    <optgroup label="Metals">
                      <option value="XAUUSD">XAUUSD (Gold)</option>
                      <option value="XAGUSD">XAGUSD (Silver)</option>
                    </optgroup>
                  )}
                  {(!form.segment || form.segment === 'Crypto') && (
                    <optgroup label="Crypto">
                      <option value="BTCUSD">BTCUSD</option>
                      <option value="ETHUSD">ETHUSD</option>
                      <option value="LTCUSD">LTCUSD</option>
                      <option value="XRPUSD">XRPUSD</option>
                    </optgroup>
                  )}
                  {(!form.segment || form.segment === 'Indices') && (
                    <optgroup label="Indices">
                      <option value="US30">US30 (Dow Jones)</option>
                      <option value="US500">US500 (S&P 500)</option>
                      <option value="NAS100">NAS100 (Nasdaq)</option>
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Step 4: User (Optional - Highest Priority) */}
              <div>
                <label className="block text-gray-400 text-xs mb-1">4. Specific User <span className="text-gray-600">(optional - highest priority)</span></label>
                {selectedUser ? (
                  <div className="flex items-center justify-between p-2 bg-dark-700 border border-gray-600 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-white text-xs">{selectedUser.firstName?.charAt(0)}</div>
                      <div>
                        <p className="text-white text-sm">{selectedUser.firstName} {selectedUser.lastName}</p>
                        <p className="text-gray-500 text-xs">{selectedUser.email}</p>
                      </div>
                    </div>
                    <button onClick={() => { setSelectedUser(null); setForm({ ...form, userId: '', level: form.instrumentSymbol ? 'INSTRUMENT' : form.segment ? 'SEGMENT' : form.accountTypeId ? 'ACCOUNT_TYPE' : 'GLOBAL' }) }} className="text-gray-400 hover:text-white"><X size={16} /></button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" placeholder="Search user to override..." value={userSearch} onChange={(e) => { setUserSearch(e.target.value); setShowUserDropdown(true) }} onFocus={() => setShowUserDropdown(true)} className="w-full pl-9 pr-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white text-sm" />
                    {showUserDropdown && userSearch && (
                      <div className="absolute z-10 w-full mt-1 bg-dark-700 border border-gray-600 rounded-lg max-h-40 overflow-y-auto">
                        {filteredUsers.length === 0 ? (
                          <p className="p-2 text-gray-500 text-sm">No users found</p>
                        ) : (
                          filteredUsers.slice(0, 10).map(user => (
                            <button key={user._id} onClick={() => { setSelectedUser(user); setForm({ ...form, userId: user._id, level: 'USER' }); setShowUserDropdown(false); setUserSearch('') }} className="w-full flex items-center gap-2 p-2 hover:bg-dark-600 text-left">
                              <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-white text-xs">{user.firstName?.charAt(0)}</div>
                              <div>
                                <p className="text-white text-sm">{user.firstName} {user.lastName}</p>
                                <p className="text-gray-500 text-xs">{user.email}</p>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Applied Level Indicator */}
              <div className="bg-dark-700 rounded-lg p-2 text-xs">
                <span className="text-gray-400">Applies to: </span>
                <span className="text-white font-medium">
                  {form.userId ? `User: ${selectedUser?.firstName || 'Selected'}` : ''}
                  {form.userId && form.instrumentSymbol ? ' → ' : ''}
                  {form.instrumentSymbol ? `${form.instrumentSymbol}` : ''}
                  {(form.userId || form.instrumentSymbol) && form.segment ? ' → ' : ''}
                  {form.segment ? `${form.segment}` : ''}
                  {(form.userId || form.instrumentSymbol || form.segment) && form.accountTypeId ? ' → ' : ''}
                  {form.accountTypeId ? accountTypes.find(a => a._id === form.accountTypeId)?.name : ''}
                  {!form.userId && !form.instrumentSymbol && !form.segment && !form.accountTypeId ? 'Global (All)' : ''}
                </span>
              </div>
              
              {/* Commission Settings */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 text-xs mb-1">Commission Type</label>
                  <select value={form.commissionType} onChange={(e) => setForm({ ...form, commissionType: e.target.value })} className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white text-sm">
                    <option value="PER_LOT">Per Lot ($)</option>
                    <option value="PER_TRADE">Per Trade ($)</option>
                    <option value="PERCENTAGE">Percentage (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1">Value</label>
                  <input type="number" step="0.01" value={form.commissionValue} onChange={(e) => setForm({ ...form, commissionValue: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white text-sm" placeholder="0" />
                </div>
              </div>
              
              {/* Charge On */}
              <div>
                <label className="block text-gray-400 text-xs mb-2">Charge on:</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.commissionOnBuy} onChange={(e) => setForm({ ...form, commissionOnBuy: e.target.checked })} className="w-4 h-4 rounded bg-dark-600 border-gray-600" />
                    <span className="text-white text-sm">Buy</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.commissionOnSell} onChange={(e) => setForm({ ...form, commissionOnSell: e.target.checked })} className="w-4 h-4 rounded bg-dark-600 border-gray-600" />
                    <span className="text-white text-sm">Sell</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.commissionOnClose} onChange={(e) => setForm({ ...form, commissionOnClose: e.target.checked })} className="w-4 h-4 rounded bg-dark-600 border-gray-600" />
                    <span className="text-white text-sm">Close</span>
                  </label>
                </div>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModalType(null)} className="flex-1 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg text-sm">Cancel</button>
                <button onClick={handleSave} className="flex-1 py-2 bg-white text-black hover:bg-gray-200 rounded-lg text-sm font-medium">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SPREAD MODAL - Account Type first, then Instrument selection */}
      {modalType === 'spread' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl w-full max-w-lg border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-dark-800">
              <h2 className="text-lg font-semibold text-white">{editingCharge ? 'Edit Spread' : 'Add Spread'}</h2>
              <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-4">
              {/* Step 1: Account Type */}
              <div>
                <label className="block text-gray-400 text-xs mb-1">1. Account Type <span className="text-gray-600">(optional)</span></label>
                <select value={form.accountTypeId} onChange={(e) => setForm({ ...form, accountTypeId: e.target.value, level: e.target.value ? 'ACCOUNT_TYPE' : 'GLOBAL' })} className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white text-sm">
                  <option value="">All Account Types (Global)</option>
                  {accountTypes.map(acc => <option key={acc._id} value={acc._id}>{acc.name}</option>)}
                </select>
              </div>

              {/* Step 2: Segment Filter */}
              <div>
                <label className="block text-gray-400 text-xs mb-1">2. Segment <span className="text-gray-600">(optional)</span></label>
                <select value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value, instrumentSymbol: '' })} className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white text-sm">
                  <option value="">All Segments</option>
                  <option value="Forex">Forex</option>
                  <option value="Metals">Metals</option>
                  <option value="Crypto">Crypto</option>
                  <option value="Indices">Indices</option>
                </select>
              </div>

              {/* Step 3: Instrument - Filtered by Segment */}
              <div>
                <label className="block text-gray-400 text-xs mb-1">3. Instrument <span className="text-gray-600">(optional{form.segment ? ` - showing ${form.segment} only` : ''})</span></label>
                <select value={form.instrumentSymbol} onChange={(e) => setForm({ ...form, instrumentSymbol: e.target.value, level: e.target.value ? 'INSTRUMENT' : form.level })} className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white text-sm">
                  <option value="">All Instruments</option>
                  {(!form.segment || form.segment === 'Forex') && (
                    <optgroup label="Forex">
                      <option value="EURUSD">EURUSD</option>
                      <option value="GBPUSD">GBPUSD</option>
                      <option value="USDJPY">USDJPY</option>
                      <option value="USDCHF">USDCHF</option>
                      <option value="AUDUSD">AUDUSD</option>
                      <option value="NZDUSD">NZDUSD</option>
                      <option value="USDCAD">USDCAD</option>
                      <option value="EURGBP">EURGBP</option>
                      <option value="EURJPY">EURJPY</option>
                      <option value="GBPJPY">GBPJPY</option>
                    </optgroup>
                  )}
                  {(!form.segment || form.segment === 'Metals') && (
                    <optgroup label="Metals">
                      <option value="XAUUSD">XAUUSD (Gold)</option>
                      <option value="XAGUSD">XAGUSD (Silver)</option>
                    </optgroup>
                  )}
                  {(!form.segment || form.segment === 'Crypto') && (
                    <optgroup label="Crypto">
                      <option value="BTCUSD">BTCUSD</option>
                      <option value="ETHUSD">ETHUSD</option>
                      <option value="LTCUSD">LTCUSD</option>
                      <option value="XRPUSD">XRPUSD</option>
                    </optgroup>
                  )}
                  {(!form.segment || form.segment === 'Indices') && (
                    <optgroup label="Indices">
                      <option value="US30">US30 (Dow Jones)</option>
                      <option value="US500">US500 (S&P 500)</option>
                      <option value="NAS100">NAS100 (Nasdaq)</option>
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Step 4: User Override (Optional) */}
              <div>
                <label className="block text-gray-400 text-xs mb-1">4. User Override <span className="text-gray-600">(optional - for specific user only)</span></label>
                {selectedUser ? (
                  <div className="flex items-center justify-between p-2 bg-dark-700 border border-gray-600 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-white text-xs">{selectedUser.firstName?.charAt(0)}</div>
                      <div>
                        <p className="text-white text-sm">{selectedUser.firstName} {selectedUser.lastName}</p>
                        <p className="text-gray-500 text-xs">{selectedUser.email}</p>
                      </div>
                    </div>
                    <button onClick={() => { setSelectedUser(null); setForm({ ...form, userId: '', level: form.instrumentSymbol ? 'INSTRUMENT' : form.accountTypeId ? 'ACCOUNT_TYPE' : 'GLOBAL' }) }} className="text-gray-400 hover:text-white"><X size={16} /></button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" placeholder="Search user for custom spread..." value={userSearch} onChange={(e) => { setUserSearch(e.target.value); setShowUserDropdown(true) }} onFocus={() => setShowUserDropdown(true)} className="w-full pl-9 pr-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white text-sm" />
                    {showUserDropdown && userSearch && (
                      <div className="absolute z-10 w-full mt-1 bg-dark-700 border border-gray-600 rounded-lg max-h-40 overflow-y-auto">
                        {filteredUsers.length === 0 ? (
                          <p className="p-2 text-gray-500 text-sm">No users found</p>
                        ) : (
                          filteredUsers.slice(0, 10).map(user => (
                            <button key={user._id} onClick={() => { setSelectedUser(user); setForm({ ...form, userId: user._id, level: 'USER' }); setShowUserDropdown(false); setUserSearch('') }} className="w-full flex items-center gap-2 p-2 hover:bg-dark-600 text-left">
                              <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-white text-xs">{user.firstName?.charAt(0)}</div>
                              <div>
                                <p className="text-white text-sm">{user.firstName} {user.lastName}</p>
                                <p className="text-gray-500 text-xs">{user.email}</p>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Applied Level Indicator */}
              <div className="bg-dark-700 rounded-lg p-2 text-xs">
                <span className="text-gray-400">Applies to: </span>
                <span className="text-white font-medium">
                  {form.userId ? `User: ${selectedUser?.firstName || 'Selected'}` : ''}
                  {form.userId && form.instrumentSymbol ? ' → ' : ''}
                  {form.instrumentSymbol ? `${form.instrumentSymbol}` : ''}
                  {(form.userId || form.instrumentSymbol) && form.accountTypeId ? ' → ' : ''}
                  {form.accountTypeId ? accountTypes.find(a => a._id === form.accountTypeId)?.name : ''}
                  {!form.userId && !form.instrumentSymbol && !form.accountTypeId ? 'Global (All)' : ''}
                </span>
              </div>
              
              {/* Spread Settings */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 text-xs mb-1">Spread Type</label>
                  <select value={form.spreadType} onChange={(e) => setForm({ ...form, spreadType: e.target.value })} className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white text-sm">
                    <option value="FIXED">Fixed (Pips/Cents)</option>
                    <option value="PERCENTAGE">Percentage (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1">Spread Value</label>
                  <input type="number" step="0.01" value={form.spreadValue} onChange={(e) => setForm({ ...form, spreadValue: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white text-sm" placeholder="0" />
                </div>
              </div>
              
              <p className="text-gray-500 text-xs">Forex: pips (e.g., 1.5) | Gold: cents (e.g., 50) | Crypto: USD (e.g., 10)</p>
              
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModalType(null)} className="flex-1 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg text-sm">Cancel</button>
                <button onClick={handleSave} className="flex-1 py-2 bg-white text-black hover:bg-gray-200 rounded-lg text-sm font-medium">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SWAP MODAL - Cascading Hierarchy */}
      {modalType === 'swap' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl w-full max-w-lg border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-dark-800">
              <h2 className="text-lg font-semibold text-white">{editingCharge ? 'Edit Swap' : 'Add Swap'}</h2>
              <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-4">
              {/* Step 1: Account Type */}
              <div>
                <label className="block text-gray-400 text-xs mb-1">1. Account Type <span className="text-gray-600">(optional)</span></label>
                <select value={form.accountTypeId} onChange={(e) => setForm({ ...form, accountTypeId: e.target.value, level: e.target.value ? 'ACCOUNT_TYPE' : 'GLOBAL' })} className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white text-sm">
                  <option value="">All Account Types (Global)</option>
                  {accountTypes.map(acc => <option key={acc._id} value={acc._id}>{acc.name}</option>)}
                </select>
              </div>

              {/* Step 2: Segment Filter */}
              <div>
                <label className="block text-gray-400 text-xs mb-1">2. Segment <span className="text-gray-600">(optional)</span></label>
                <select value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value, instrumentSymbol: '' })} className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white text-sm">
                  <option value="">All Segments</option>
                  <option value="Forex">Forex</option>
                  <option value="Metals">Metals</option>
                  <option value="Crypto">Crypto</option>
                  <option value="Indices">Indices</option>
                </select>
              </div>

              {/* Step 3: Instrument - Filtered by Segment */}
              <div>
                <label className="block text-gray-400 text-xs mb-1">3. Instrument <span className="text-gray-600">(optional{form.segment ? ` - showing ${form.segment} only` : ''})</span></label>
                <select value={form.instrumentSymbol} onChange={(e) => setForm({ ...form, instrumentSymbol: e.target.value, level: e.target.value ? 'INSTRUMENT' : form.level })} className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white text-sm">
                  <option value="">All Instruments</option>
                  {(!form.segment || form.segment === 'Forex') && (
                    <optgroup label="Forex">
                      <option value="EURUSD">EURUSD</option>
                      <option value="GBPUSD">GBPUSD</option>
                      <option value="USDJPY">USDJPY</option>
                      <option value="USDCHF">USDCHF</option>
                      <option value="AUDUSD">AUDUSD</option>
                      <option value="NZDUSD">NZDUSD</option>
                      <option value="USDCAD">USDCAD</option>
                      <option value="EURGBP">EURGBP</option>
                      <option value="EURJPY">EURJPY</option>
                      <option value="GBPJPY">GBPJPY</option>
                    </optgroup>
                  )}
                  {(!form.segment || form.segment === 'Metals') && (
                    <optgroup label="Metals">
                      <option value="XAUUSD">XAUUSD (Gold)</option>
                      <option value="XAGUSD">XAGUSD (Silver)</option>
                    </optgroup>
                  )}
                  {(!form.segment || form.segment === 'Crypto') && (
                    <optgroup label="Crypto">
                      <option value="BTCUSD">BTCUSD</option>
                      <option value="ETHUSD">ETHUSD</option>
                      <option value="LTCUSD">LTCUSD</option>
                      <option value="XRPUSD">XRPUSD</option>
                    </optgroup>
                  )}
                  {(!form.segment || form.segment === 'Indices') && (
                    <optgroup label="Indices">
                      <option value="US30">US30 (Dow Jones)</option>
                      <option value="US500">US500 (S&P 500)</option>
                      <option value="NAS100">NAS100 (Nasdaq)</option>
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Step 4: User Override (Optional) */}
              <div>
                <label className="block text-gray-400 text-xs mb-1">4. User Override <span className="text-gray-600">(optional - for specific user only)</span></label>
                {selectedUser ? (
                  <div className="flex items-center justify-between p-2 bg-dark-700 border border-gray-600 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-white text-xs">{selectedUser.firstName?.charAt(0)}</div>
                      <div>
                        <p className="text-white text-sm">{selectedUser.firstName} {selectedUser.lastName}</p>
                        <p className="text-gray-500 text-xs">{selectedUser.email}</p>
                      </div>
                    </div>
                    <button onClick={() => { setSelectedUser(null); setForm({ ...form, userId: '', level: form.instrumentSymbol ? 'INSTRUMENT' : form.accountTypeId ? 'ACCOUNT_TYPE' : 'GLOBAL' }) }} className="text-gray-400 hover:text-white"><X size={16} /></button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" placeholder="Search user for custom swap..." value={userSearch} onChange={(e) => { setUserSearch(e.target.value); setShowUserDropdown(true) }} onFocus={() => setShowUserDropdown(true)} className="w-full pl-9 pr-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white text-sm" />
                    {showUserDropdown && userSearch && (
                      <div className="absolute z-10 w-full mt-1 bg-dark-700 border border-gray-600 rounded-lg max-h-40 overflow-y-auto">
                        {filteredUsers.length === 0 ? (
                          <p className="p-2 text-gray-500 text-sm">No users found</p>
                        ) : (
                          filteredUsers.slice(0, 10).map(user => (
                            <button key={user._id} onClick={() => { setSelectedUser(user); setForm({ ...form, userId: user._id, level: 'USER' }); setShowUserDropdown(false); setUserSearch('') }} className="w-full flex items-center gap-2 p-2 hover:bg-dark-600 text-left">
                              <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-white text-xs">{user.firstName?.charAt(0)}</div>
                              <div>
                                <p className="text-white text-sm">{user.firstName} {user.lastName}</p>
                                <p className="text-gray-500 text-xs">{user.email}</p>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Applied Level Indicator */}
              <div className="bg-dark-700 rounded-lg p-2 text-xs">
                <span className="text-gray-400">Applies to: </span>
                <span className="text-white font-medium">
                  {form.userId ? `User: ${selectedUser?.firstName || 'Selected'}` : ''}
                  {form.userId && form.instrumentSymbol ? ' → ' : ''}
                  {form.instrumentSymbol ? `${form.instrumentSymbol}` : ''}
                  {(form.userId || form.instrumentSymbol) && form.accountTypeId ? ' → ' : ''}
                  {form.accountTypeId ? accountTypes.find(a => a._id === form.accountTypeId)?.name : ''}
                  {!form.userId && !form.instrumentSymbol && !form.accountTypeId ? 'Global (All)' : ''}
                </span>
              </div>
              
              {/* Swap Settings */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 text-xs mb-1">Swap Long (points)</label>
                  <input type="number" step="0.01" value={form.swapLong} onChange={(e) => setForm({ ...form, swapLong: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white text-sm" placeholder="0" />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1">Swap Short (points)</label>
                  <input type="number" step="0.01" value={form.swapShort} onChange={(e) => setForm({ ...form, swapShort: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white text-sm" placeholder="0" />
                </div>
              </div>
              
              <p className="text-gray-500 text-xs">Overnight fees charged for holding positions (negative = charge, positive = credit)</p>
              
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModalType(null)} className="flex-1 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg text-sm">Cancel</button>
                <button onClick={handleSave} className="flex-1 py-2 bg-white text-black hover:bg-gray-200 rounded-lg text-sm font-medium">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default AdminForexCharges
