import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { X, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { login } from '../api/auth'

const Login = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('signin')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  
  // Detect mobile view
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const response = await login(formData)
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      // Redirect to mobile view on mobile devices
      if (isMobile) {
        navigate('/mobile')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-r from-cyan-500/20 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-l from-orange-500/20 via-purple-500/20 to-transparent rounded-full blur-3xl" />
      
      {/* Modal */}
      <div className="relative bg-dark-700 rounded-2xl p-8 w-full max-w-md border border-gray-800">
        {/* Close button */}
        <button className="absolute top-4 right-4 w-8 h-8 bg-dark-600 rounded-full flex items-center justify-center hover:bg-dark-500 transition-colors">
          <X size={16} className="text-gray-400" />
        </button>

        {/* Tabs */}
        <div className="flex bg-dark-600 rounded-full p-1 w-fit mb-8">
          <Link
            to="/user/signup"
            className="px-6 py-2 rounded-full text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Sign up
          </Link>
          <button
            onClick={() => setActiveTab('signin')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'signin' ? 'bg-dark-500 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign in
          </button>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-white mb-6">Welcome back</h1>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email field */}
          <div className="relative">
            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-dark-600 border border-gray-700 rounded-lg pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
            />
          </div>

          {/* Password field */}
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              className="w-full bg-dark-600 border border-gray-700 rounded-lg pl-11 pr-12 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Forgot password */}
          <div className="text-right">
            <Link to="/user/forgot-password" className="text-sm text-gray-400 hover:text-white transition-colors">
              Forgot password?
            </Link>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-medium py-3 rounded-lg hover:bg-gray-100 transition-colors mt-2 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Terms */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Don't have an account?{' '}
          <Link to="/user/signup" className="text-white hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}

export default Login
