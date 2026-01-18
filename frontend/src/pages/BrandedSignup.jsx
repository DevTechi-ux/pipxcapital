import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { X, Mail, Lock, Eye, EyeOff, User, Phone, AlertCircle } from 'lucide-react'
import { API_URL } from '../config/api'

const BrandedSignup = () => {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [brandInfo, setBrandInfo] = useState(null)
  const [brandLoading, setBrandLoading] = useState(true)
  const [brandError, setBrandError] = useState('')
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  })
  
  useEffect(() => {
    fetchBrandInfo()
  }, [slug])

  const fetchBrandInfo = async () => {
    try {
      const res = await fetch(`${API_URL}/admin-mgmt/brand/${slug}`)
      const data = await res.json()
      if (data.success) {
        setBrandInfo(data.brand)
        localStorage.setItem('adminSlug', slug)
        localStorage.setItem('adminId', data.brand.adminId)
      } else {
        setBrandError(data.message || 'Brand not found')
      }
    } catch (error) {
      setBrandError('Failed to load brand information')
    }
    setBrandLoading(false)
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }
    
    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          adminSlug: slug,
          adminId: brandInfo?.adminId
        })
      })
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Signup failed')
      }
      
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (brandLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (brandError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-dark-700 rounded-2xl p-8 w-full max-w-md border border-gray-800 text-center">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Invalid Link</h1>
          <p className="text-gray-400 mb-6">{brandError}</p>
          <Link 
            to="/user/signup" 
            className="text-accent-green hover:underline"
          >
            Go to main signup
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-r from-cyan-500/20 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-l from-orange-500/20 via-purple-500/20 to-transparent rounded-full blur-3xl" />
      
      <div className="relative bg-dark-700 rounded-2xl p-8 w-full max-w-md border border-gray-800">
        <button className="absolute top-4 right-4 w-8 h-8 bg-dark-600 rounded-full flex items-center justify-center hover:bg-dark-500 transition-colors">
          <X size={16} className="text-gray-400" />
        </button>

        {brandInfo?.brandName && (
          <div className="text-center mb-6">
            <h2 className="text-accent-green text-lg font-bold">{brandInfo.brandName}</h2>
          </div>
        )}

        <div className="flex bg-dark-600 rounded-full p-1 w-fit mb-8">
          <button className="px-6 py-2 rounded-full text-sm font-medium bg-dark-500 text-white">
            Sign up
          </button>
          <Link
            to={`/${slug}/login`}
            className="px-6 py-2 rounded-full text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Sign in
          </Link>
        </div>

        <h1 className="text-2xl font-semibold text-white mb-6">Create account</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                name="firstName"
                placeholder="First name"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="w-full bg-dark-600 border border-gray-700 rounded-lg pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
              />
            </div>
            <div className="relative">
              <input
                type="text"
                name="lastName"
                placeholder="Last name"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="w-full bg-dark-600 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
              />
            </div>
          </div>

          <div className="relative">
            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full bg-dark-600 border border-gray-700 rounded-lg pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
            />
          </div>

          <div className="relative">
            <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="tel"
              name="phone"
              placeholder="Phone number"
              value={formData.phone}
              onChange={handleChange}
              className="w-full bg-dark-600 border border-gray-700 rounded-lg pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
            />
          </div>

          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Create password"
              value={formData.password}
              onChange={handleChange}
              required
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

          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="confirmPassword"
              placeholder="Confirm password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="w-full bg-dark-600 border border-gray-700 rounded-lg pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-medium py-3 rounded-lg hover:bg-gray-100 transition-colors mt-2 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          Already have an account?{' '}
          <Link to={`/${slug}/login`} className="text-white hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

export default BrandedSignup
