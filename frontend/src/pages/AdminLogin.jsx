import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Mail, Lock, Eye, EyeOff } from 'lucide-react'

const AdminLogin = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    // Simple admin credentials check (in production, use proper backend auth)
    if (formData.email === 'admin@admin.com' && formData.password === 'admin123') {
      localStorage.setItem('adminToken', 'admin-authenticated')
      localStorage.setItem('adminUser', JSON.stringify({ email: formData.email, role: 'admin' }))
      navigate('/admin/dashboard')
    } else {
      setError('Invalid admin credentials')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 sm:p-6 md:p-8 relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-r from-red-500/20 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-l from-purple-500/20 via-red-500/20 to-transparent rounded-full blur-3xl" />
      
      {/* Modal */}
      <div className="relative bg-dark-700 rounded-2xl p-6 sm:p-8 w-full max-w-md border border-gray-800 mx-4 sm:mx-0">
        {/* Close button */}
        <button 
          onClick={() => navigate('/')}
          className="absolute top-4 right-4 w-8 h-8 bg-dark-600 rounded-full flex items-center justify-center hover:bg-dark-500 transition-colors"
        >
          <X size={16} className="text-gray-400" />
        </button>

        {/* Admin Badge */}
        <div className="flex items-center gap-2 mb-6">
          <div className="px-3 py-1 bg-red-500/20 text-red-500 rounded-full text-sm font-medium">
            Admin Portal
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-white mb-2">Admin Login</h1>
        <p className="text-gray-500 text-sm mb-6">Enter your admin credentials to continue</p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email field */}
          <div className="relative">
            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="email"
              name="email"
              placeholder="Admin email"
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-dark-600 border border-gray-700 rounded-lg pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 transition-colors"
            />
          </div>

          {/* Password field */}
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Admin password"
              value={formData.password}
              onChange={handleChange}
              className="w-full bg-dark-600 border border-gray-700 rounded-lg pl-11 pr-12 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-500 text-white font-medium py-3 rounded-lg hover:bg-red-600 transition-colors mt-2 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in as Admin'}
          </button>
        </form>

        {/* Info */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Not an admin?{' '}
          <button onClick={() => navigate('/user/login')} className="text-white hover:underline">
            User Login
          </button>
        </p>
      </div>
    </div>
  )
}

export default AdminLogin
