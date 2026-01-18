import { useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { 
  IndianRupee,
  Plus,
  Edit,
  Trash2,
  Save
} from 'lucide-react'

const AdminIndianCharges = () => {
  const [charges, setCharges] = useState([
    { id: 1, name: 'UPI Deposit Fee', value: '0', type: '%', description: 'Fee for UPI deposits' },
    { id: 2, name: 'UPI Withdrawal Fee', value: '1.5', type: '%', description: 'Fee for UPI withdrawals' },
    { id: 3, name: 'Bank Transfer Deposit', value: '0', type: 'INR', description: 'NEFT/RTGS/IMPS deposit fee' },
    { id: 4, name: 'Bank Transfer Withdrawal', value: '25', type: 'INR', description: 'NEFT/RTGS withdrawal fee' },
    { id: 5, name: 'GST on Services', value: '18', type: '%', description: 'Applicable GST rate' },
    { id: 6, name: 'TDS on Withdrawals', value: '1', type: '%', description: 'Tax deducted at source' },
    { id: 7, name: 'Min Deposit (INR)', value: '500', type: 'INR', description: 'Minimum deposit amount' },
    { id: 8, name: 'Max Withdrawal/Day', value: '500000', type: 'INR', description: 'Daily withdrawal limit' },
  ])

  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')

  const handleEdit = (charge) => {
    setEditingId(charge.id)
    setEditValue(charge.value)
  }

  const handleSave = (id) => {
    setCharges(charges.map(c => c.id === id ? { ...c, value: editValue } : c))
    setEditingId(null)
  }

  return (
    <AdminLayout title="Indian Charges" subtitle="Manage INR payment fees and limits">
      <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <IndianRupee size={20} className="text-orange-500" />
            </div>
            <div>
              <h2 className="text-white font-semibold">Indian Payment Charges</h2>
              <p className="text-gray-500 text-sm">Configure INR payment fees and limits</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
            <Plus size={16} />
            <span className="hidden sm:inline">Add Charge</span>
          </button>
        </div>

        <div className="p-4 space-y-3">
          {charges.map((charge) => (
            <div key={charge.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-dark-700 rounded-xl border border-gray-700">
              <div className="flex-1">
                <p className="text-white font-medium">{charge.name}</p>
                <p className="text-gray-500 text-sm">{charge.description}</p>
              </div>
              <div className="flex items-center gap-3">
                {editingId === charge.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-24 bg-dark-600 border border-gray-600 rounded-lg px-3 py-2 text-white text-right focus:outline-none focus:border-orange-500"
                    />
                    <span className="text-gray-400 text-sm">{charge.type}</span>
                    <button 
                      onClick={() => handleSave(charge.id)}
                      className="p-2 bg-orange-500 rounded-lg text-white hover:bg-orange-600 transition-colors"
                    >
                      <Save size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="text-right">
                      <p className="text-white font-semibold text-lg">{charge.value}</p>
                      <p className="text-gray-500 text-sm">{charge.type}</p>
                    </div>
                    <button 
                      onClick={() => handleEdit(charge)}
                      className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-white"
                    >
                      <Edit size={16} />
                    </button>
                    <button className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-red-500">
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminIndianCharges
