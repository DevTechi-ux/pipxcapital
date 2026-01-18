import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, User, Wallet, Users, Copy, UserCircle, HelpCircle, FileText, LogOut,
  ChevronDown, ChevronRight, BookOpen, PlayCircle, DollarSign, TrendingUp, Shield, Settings, Trophy,
  ArrowLeft, Home, Sun, Moon
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { API_URL } from '../config/api'
import logoImage from "../assets/Pipxcapital.png";

const InstructionsPage = () => {
  const navigate = useNavigate()
  const { isDarkMode, toggleDarkMode } = useTheme()
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [expandedSection, setExpandedSection] = useState('getting-started')
  const [challengeModeEnabled, setChallengeModeEnabled] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    fetchChallengeStatus()
  }, [])

  const fetchChallengeStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/prop/status`)
      const data = await res.json()
      if (data.success) setChallengeModeEnabled(data.enabled)
    } catch (error) {}
  }

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Account', icon: User, path: '/account' },
    { name: 'Wallet', icon: Wallet, path: '/wallet' },
    { name: 'Orders', icon: FileText, path: '/orders' },
    { name: 'IB', icon: Users, path: '/ib' },
    { name: 'Copytrade', icon: Copy, path: '/copytrade' },
    { name: 'Profile', icon: UserCircle, path: '/profile' },
    { name: 'Support', icon: HelpCircle, path: '/support' },
    { name: 'Instructions', icon: FileText, path: '/instructions' },
  ]

  const sections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: PlayCircle,
      content: [
        { title: 'Create an Account', text: 'Sign up with your email and complete the verification process.' },
        { title: 'Complete KYC', text: 'Submit your identity documents for verification. This is required for deposits and withdrawals.' },
        { title: 'Create Trading Account', text: 'Go to Account section and create a new trading account. Choose your preferred account type.' },
        { title: 'Fund Your Account', text: 'Deposit funds to your wallet and transfer to your trading account.' },
      ]
    },
    {
      id: 'deposits',
      title: 'Deposits & Withdrawals',
      icon: DollarSign,
      content: [
        { title: 'Making a Deposit', text: 'Go to Wallet → Deposit. Select your payment method, enter the amount, and follow the instructions.' },
        { title: 'Deposit Processing', text: 'Deposits are usually processed within 24 hours after admin verification.' },
        { title: 'Making a Withdrawal', text: 'Go to Wallet → Withdraw. Enter the amount and your payment details. Minimum withdrawal may apply.' },
        { title: 'Withdrawal Processing', text: 'Withdrawals are processed within 1-3 business days after approval.' },
      ]
    },
    {
      id: 'trading',
      title: 'Trading Guide',
      icon: TrendingUp,
      content: [
        { title: 'Opening a Trade', text: 'Select an instrument, set your volume (lot size), and click Buy or Sell to open a market order.' },
        { title: 'Pending Orders', text: 'Use pending orders (Limit/Stop) to enter the market at a specific price.' },
        { title: 'Stop Loss & Take Profit', text: 'Set SL/TP to automatically close your trade at a certain profit or loss level.' },
        { title: 'Closing a Trade', text: 'Click the X button on your open position to close it at the current market price.' },
        { title: 'Understanding Margin', text: 'Margin is the amount required to open a position. It depends on your leverage and position size.' },
      ]
    },
    {
      id: 'copy-trading',
      title: 'Copy Trading',
      icon: Copy,
      content: [
        { title: 'What is Copy Trading?', text: 'Copy trading allows you to automatically copy trades from experienced traders (Masters).' },
        { title: 'Following a Master', text: 'Go to Copytrade → Discover Masters. Select a master and click Follow.' },
        { title: 'Copy Settings', text: 'Choose Fixed Lot (same lot size for all trades) or Lot Multiplier (proportional to master).' },
        { title: 'Commission', text: 'Masters charge a commission on profitable days only. This is deducted automatically.' },
        { title: 'Managing Subscriptions', text: 'You can pause, resume, or stop following a master at any time.' },
      ]
    },
    {
      id: 'ib-program',
      title: 'IB Program',
      icon: Users,
      content: [
        { title: 'What is IB?', text: 'Introducing Broker (IB) program lets you earn commissions by referring traders.' },
        { title: 'Becoming an IB', text: 'Go to IB section and click Apply Now. Your application will be reviewed by admin.' },
        { title: 'Referral Link', text: 'Once approved, you get a unique referral link. Share it to invite new traders.' },
        { title: 'Commission Structure', text: 'Earn commission on every trade your referrals make. Up to 5 levels of referrals.' },
        { title: 'Withdrawing Commission', text: 'Your IB earnings are credited to your IB wallet. You can withdraw anytime.' },
      ]
    },
    {
      id: 'security',
      title: 'Security',
      icon: Shield,
      content: [
        { title: 'Password Security', text: 'Use a strong password with letters, numbers, and symbols. Change it regularly.' },
        { title: 'Two-Factor Authentication', text: 'Enable 2FA for an extra layer of security on your account.' },
        { title: 'Trading PIN', text: 'Your trading account has a 4-digit PIN. Never share it with anyone.' },
        { title: 'Suspicious Activity', text: 'If you notice any suspicious activity, contact support immediately.' },
      ]
    },
  ]

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/user/login')
  }

  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-300 ${isDarkMode ? 'bg-dark-900' : 'bg-gray-100'}`}>
      {/* Mobile Header */}
      {isMobile && (
        <header className={`fixed top-0 left-0 right-0 z-40 px-4 py-3 flex items-center gap-4 ${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200'} border-b`}>
          <button onClick={() => navigate('/mobile')} className={`p-2 -ml-2 rounded-lg ${isDarkMode ? 'hover:bg-dark-700' : 'hover:bg-gray-100'}`}>
            <ArrowLeft size={22} className={isDarkMode ? 'text-white' : 'text-gray-900'} />
          </button>
          <h1 className={`font-semibold text-lg flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Instructions</h1>
          <button onClick={toggleDarkMode} className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-dark-700' : 'hover:bg-gray-100'}`}>
            {isDarkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-gray-600" />}
          </button>
          <button onClick={() => navigate('/mobile')} className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-dark-700' : 'hover:bg-gray-100'}`}>
            <Home size={20} className="text-gray-400" />
          </button>
        </header>
      )}

      {/* Sidebar - Hidden on Mobile */}
      {!isMobile && (
        <aside 
          className={`${sidebarExpanded ? 'w-48' : 'w-16'} flex flex-col transition-all duration-300 ${isDarkMode ? 'bg-dark-900 border-gray-800' : 'bg-white border-gray-200'} border-r`}
          onMouseEnter={() => setSidebarExpanded(true)}
          onMouseLeave={() => setSidebarExpanded(false)}
        >
          <div className="p-4 flex items-center justify-center">
            <img src={logoImage} alt="Pipxacpital" className="h-8 w-auto object-contain" />
          </div>
          <nav className="flex-1 px-2">
            {menuItems.map((item) => (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                  item.name === 'Instructions' ? 'bg-accent-green text-black' : isDarkMode ? 'text-gray-400 hover:text-white hover:bg-dark-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <item.icon size={18} className="flex-shrink-0" />
                {sidebarExpanded && <span className="text-sm font-medium">{item.name}</span>}
              </button>
            ))}
          </nav>
          <div className={`p-2 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <button onClick={toggleDarkMode} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 ${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-dark-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>
              {isDarkMode ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-gray-600" />}
              {sidebarExpanded && <span className="text-sm">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>}
            </button>
            <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
              <LogOut size={18} />
              {sidebarExpanded && <span className="text-sm">Log Out</span>}
            </button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className={`flex-1 overflow-auto ${isMobile ? 'pt-14' : ''}`}>
        {!isMobile && (
          <header className={`flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <h1 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Instructions & Guide</h1>
          </header>
        )}

        <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
          <div className={isMobile ? '' : 'max-w-4xl'}>
            {/* Welcome Banner */}
            <div className={`bg-gradient-to-r from-accent-green/20 to-blue-500/20 rounded-xl ${isMobile ? 'p-4' : 'p-6'} mb-4 border border-accent-green/30`}>
              <div className={`flex items-center ${isMobile ? 'gap-3' : 'gap-4'}`}>
                <div className={`${isMobile ? 'w-10 h-10' : 'w-14 h-14'} bg-accent-green/30 rounded-full flex items-center justify-center`}>
                  <BookOpen size={isMobile ? 20 : 28} className="text-accent-green" />
                </div>
                <div>
                  <h2 className={`font-bold text-white ${isMobile ? 'text-base' : 'text-xl'}`}>Welcome to Pipxacpital</h2>
                  <p className={`text-gray-400 ${isMobile ? 'text-xs' : ''}`}>Learn how to use our platform</p>
                </div>
              </div>
            </div>

            {/* Accordion Sections */}
            <div className={`space-y-${isMobile ? '2' : '4'}`}>
              {sections.map(section => (
                <div key={section.id} className={`${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} rounded-xl border overflow-hidden`}>
                  <button
                    onClick={() => setExpandedSection(expandedSection === section.id ? '' : section.id)}
                    className={`w-full flex items-center justify-between ${isMobile ? 'p-3' : 'p-5'} transition-colors ${isDarkMode ? 'hover:bg-dark-700' : 'hover:bg-gray-50'}`}
                  >
                    <div className={`flex items-center ${isMobile ? 'gap-3' : 'gap-4'}`}>
                      <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} bg-accent-green/20 rounded-lg flex items-center justify-center`}>
                        <section.icon size={isMobile ? 16 : 20} className="text-accent-green" />
                      </div>
                      <span className={`font-semibold ${isMobile ? 'text-sm' : ''} ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{section.title}</span>
                    </div>
                    {expandedSection === section.id ? (
                      <ChevronDown size={isMobile ? 16 : 20} className="text-gray-400" />
                    ) : (
                      <ChevronRight size={isMobile ? 16 : 20} className="text-gray-400" />
                    )}
                  </button>
                  
                  {expandedSection === section.id && (
                    <div className={`${isMobile ? 'px-3 pb-3' : 'px-5 pb-5'} border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className={`pt-3 space-y-${isMobile ? '2' : '4'}`}>
                        {section.content.map((item, idx) => (
                          <div key={idx} className="flex gap-4">
                            <div className="w-6 h-6 bg-accent-green/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-accent-green text-xs font-bold">{idx + 1}</span>
                            </div>
                            <div>
                              <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.title}</h4>
                              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{item.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Contact Support */}
            <div className={`${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} rounded-xl p-6 border mt-6`}>
              <h3 className={`font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Need More Help?</h3>
              <p className={`mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                If you couldn't find what you're looking for, our support team is here to help.
              </p>
              <button
                onClick={() => navigate('/support')}
                className="bg-accent-green text-black px-6 py-2 rounded-lg font-medium hover:bg-accent-green/90"
              >
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default InstructionsPage
