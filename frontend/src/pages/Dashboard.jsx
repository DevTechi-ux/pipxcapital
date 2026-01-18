import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  User,
  Wallet,
  Users,
  Copy,
  UserCircle,
  HelpCircle,
  FileText,
  LogOut,
  TrendingUp,
  DollarSign,
  Newspaper,
  Calendar,
  RefreshCw,
  Activity,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { API_URL } from '../config/api'
import logoImage from '../assets/Pipxcapital.png'

const Dashboard = () => {
  const navigate = useNavigate()
  const { isDarkMode, toggleDarkMode } = useTheme()
  const [activeMenu, setActiveMenu] = useState('Dashboard')
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [news, setNews] = useState([])
  const [newsLoading, setNewsLoading] = useState(true)
  const [economicEvents, setEconomicEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [walletBalance, setWalletBalance] = useState(0)
  const [totalTrades, setTotalTrades] = useState(0)
  const [totalCharges, setTotalCharges] = useState(0)
  const [totalPnl, setTotalPnl] = useState(0)
  const [userAccounts, setUserAccounts] = useState([])
  const [challengeModeEnabled, setChallengeModeEnabled] = useState(false)
  const tradingViewRef = useRef(null)
  const economicCalendarRef = useRef(null)
  const forexHeatmapRef = useRef(null)
  const forexScreenerRef = useRef(null)
  
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  // Handle responsive view switching
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      // Only redirect on initial load if mobile, not on resize
    }
    window.addEventListener('resize', handleResize)
    
    // Initial check - redirect to mobile only on first load
    if (window.innerWidth < 768 && !sessionStorage.getItem('viewChecked')) {
      sessionStorage.setItem('viewChecked', 'true')
      navigate('/mobile')
    }
    
    return () => window.removeEventListener('resize', handleResize)
  }, [navigate])

  // Check auth status on mount
  const checkAuthStatus = async () => {
    const token = localStorage.getItem('token')
    if (!token || !user._id) {
      navigate('/user/login')
      return
    }
    
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      
      if (data.forceLogout || res.status === 403) {
        alert(data.message || 'Session expired. Please login again.')
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        navigate('/user/login')
        return
      }
    } catch (error) {
      console.error('Auth check error:', error)
    }
  }

  // Fetch wallet balance and user data
  useEffect(() => {
    checkAuthStatus()
    fetchChallengeStatus()
    if (user._id) {
      fetchWalletBalance()
      fetchUserAccounts()
    }
  }, [user._id])
  
  // Fetch trades after accounts are loaded
  useEffect(() => {
    if (userAccounts.length > 0) {
      fetchTrades()
    }
  }, [userAccounts])

  const fetchChallengeStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/prop/status`)
      const data = await res.json()
      if (data.success) {
        setChallengeModeEnabled(data.enabled)
      }
    } catch (error) {
      console.error('Error fetching challenge status:', error)
    }
  }

  const fetchWalletBalance = async () => {
    try {
      const res = await fetch(`${API_URL}/wallet/${user._id}`)
      const data = await res.json()
      setWalletBalance(data.wallet?.balance || 0)
    } catch (error) {
      console.error('Error fetching wallet:', error)
    }
  }

  const fetchUserAccounts = async () => {
    try {
      const res = await fetch(`${API_URL}/trading-accounts/user/${user._id}`)
      const data = await res.json()
      setUserAccounts(data.accounts || [])
    } catch (error) {
      console.error('Error fetching accounts:', error)
    }
  }

  const fetchTrades = async () => {
    try {
      // Fetch trades for all user accounts
      let allTrades = []
      let charges = 0
      let pnl = 0
      
      for (const account of userAccounts) {
        // Fetch closed trades for history
        const historyRes = await fetch(`${API_URL}/trade/history/${account._id}`)
        const historyData = await historyRes.json()
        if (historyData.success && historyData.trades) {
          allTrades = [...allTrades, ...historyData.trades]
          // Calculate charges (commission + swap)
          historyData.trades.forEach(trade => {
            charges += (trade.commission || 0) + (trade.swap || 0)
            pnl += (trade.realizedPnl || 0)
          })
        }
        
        // Fetch open trades
        const openRes = await fetch(`${API_URL}/trade/open/${account._id}`)
        const openData = await openRes.json()
        if (openData.success && openData.trades) {
          allTrades = [...allTrades, ...openData.trades]
        }
      }
      
      setTotalTrades(allTrades.length)
      setTotalCharges(Math.abs(charges))
      setTotalPnl(pnl)
    } catch (error) {
      console.error('Error fetching trades:', error)
    }
  }

  // Fetch crypto news
  useEffect(() => {
    const fetchNews = async () => {
      setNewsLoading(true)
      try {
        // Using CoinGecko's free API for crypto news (no API key needed)
        const response = await fetch('https://api.coingecko.com/api/v3/news')
        if (response.ok) {
          const data = await response.json()
          setNews(data.data?.slice(0, 6) || [])
        } else {
          // Fallback sample news if API fails
          setNews([
            { title: 'Bitcoin Surges Past $100K Milestone', description: 'BTC reaches new all-time high amid institutional buying', updated_at: Date.now(), url: '#' },
            { title: 'Ethereum 2.0 Staking Rewards Increase', description: 'ETH staking yields hit 5.2% APY', updated_at: Date.now() - 3600000, url: '#' },
            { title: 'SEC Approves New Crypto ETFs', description: 'Multiple spot crypto ETFs get regulatory approval', updated_at: Date.now() - 7200000, url: '#' },
            { title: 'DeFi Total Value Locked Hits $200B', description: 'Decentralized finance continues rapid growth', updated_at: Date.now() - 10800000, url: '#' },
            { title: 'Major Bank Launches Crypto Custody', description: 'Traditional finance embraces digital assets', updated_at: Date.now() - 14400000, url: '#' },
            { title: 'NFT Market Shows Recovery Signs', description: 'Trading volume up 40% month-over-month', updated_at: Date.now() - 18000000, url: '#' },
          ])
        }
      } catch (error) {
        // Fallback sample news
        setNews([
          { title: 'Bitcoin Surges Past $100K Milestone', description: 'BTC reaches new all-time high amid institutional buying', updated_at: Date.now(), url: '#' },
          { title: 'Ethereum 2.0 Staking Rewards Increase', description: 'ETH staking yields hit 5.2% APY', updated_at: Date.now() - 3600000, url: '#' },
          { title: 'SEC Approves New Crypto ETFs', description: 'Multiple spot crypto ETFs get regulatory approval', updated_at: Date.now() - 7200000, url: '#' },
          { title: 'DeFi Total Value Locked Hits $200B', description: 'Decentralized finance continues rapid growth', updated_at: Date.now() - 10800000, url: '#' },
          { title: 'Major Bank Launches Crypto Custody', description: 'Traditional finance embraces digital assets', updated_at: Date.now() - 14400000, url: '#' },
          { title: 'NFT Market Shows Recovery Signs', description: 'Trading volume up 40% month-over-month', updated_at: Date.now() - 18000000, url: '#' },
        ])
      }
      setNewsLoading(false)
    }
    fetchNews()
    const interval = setInterval(fetchNews, 300000) // Refresh every 5 minutes
    return () => clearInterval(interval)
  }, [])

  // Economic calendar events
  useEffect(() => {
    setEventsLoading(true)
    // Sample economic events (in production, use a real API like Forex Factory or Trading Economics)
    const sampleEvents = [
      { date: '2026-01-08', time: '08:30', country: 'US', event: 'Non-Farm Payrolls', impact: 'high', forecast: '180K', previous: '227K' },
      { date: '2026-01-08', time: '10:00', country: 'US', event: 'ISM Services PMI', impact: 'high', forecast: '53.5', previous: '52.1' },
      { date: '2026-01-09', time: '08:30', country: 'US', event: 'Initial Jobless Claims', impact: 'medium', forecast: '210K', previous: '211K' },
      { date: '2026-01-09', time: '14:00', country: 'US', event: 'FOMC Meeting Minutes', impact: 'high', forecast: '-', previous: '-' },
      { date: '2026-01-10', time: '08:30', country: 'US', event: 'CPI m/m', impact: 'high', forecast: '0.3%', previous: '0.3%' },
      { date: '2026-01-10', time: '08:30', country: 'US', event: 'Core CPI m/m', impact: 'high', forecast: '0.2%', previous: '0.3%' },
      { date: '2026-01-13', time: '08:30', country: 'US', event: 'PPI m/m', impact: 'medium', forecast: '0.2%', previous: '0.4%' },
      { date: '2026-01-14', time: '08:30', country: 'US', event: 'Retail Sales m/m', impact: 'high', forecast: '0.5%', previous: '0.7%' },
    ]
    setEconomicEvents(sampleEvents)
    setEventsLoading(false)
  }, [])


  const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'high': return 'bg-red-500'
      case 'medium': return 'bg-orange-500'
      case 'low': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
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

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/user/login')
  }

  // Load TradingView widgets - re-render when theme changes
  useEffect(() => {
    const colorTheme = isDarkMode ? "dark" : "light"
    
    // TradingView Timeline Widget (News)
    if (tradingViewRef.current) {
      tradingViewRef.current.innerHTML = ''
      const script = document.createElement('script')
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js'
      script.async = true
      script.innerHTML = JSON.stringify({
        "feedMode": "all_symbols",
        "colorTheme": colorTheme,
        "isTransparent": false,
        "displayMode": "regular",
        "width": "100%",
        "height": "100%",
        "locale": "en"
      })
      tradingViewRef.current.appendChild(script)
    }

    // TradingView Economic Calendar Widget
    if (economicCalendarRef.current) {
      economicCalendarRef.current.innerHTML = ''
      const script = document.createElement('script')
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js'
      script.async = true
      script.innerHTML = JSON.stringify({
        "colorTheme": colorTheme,
        "isTransparent": false,
        "width": "100%",
        "height": "100%",
        "locale": "en",
        "importanceFilter": "0,1",
        "countryFilter": "us,eu,gb,jp,cn"
      })
      economicCalendarRef.current.appendChild(script)
    }

    // TradingView Forex Heatmap Widget
    if (forexHeatmapRef.current) {
      forexHeatmapRef.current.innerHTML = ''
      const script = document.createElement('script')
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-forex-heat-map.js'
      script.async = true
      script.innerHTML = JSON.stringify({
        "width": "100%",
        "height": "100%",
        "currencies": ["EUR", "USD", "JPY", "GBP", "CHF", "AUD", "CAD", "NZD"],
        "isTransparent": false,
        "colorTheme": colorTheme,
        "locale": "en"
      })
      forexHeatmapRef.current.appendChild(script)
    }

    // TradingView Forex Screener Widget
    if (forexScreenerRef.current) {
      forexScreenerRef.current.innerHTML = ''
      const script = document.createElement('script')
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-screener.js'
      script.async = true
      script.innerHTML = JSON.stringify({
        "width": "100%",
        "height": "100%",
        "defaultColumn": "overview",
        "defaultScreen": "general",
        "market": "forex",
        "showToolbar": true,
        "colorTheme": colorTheme,
        "locale": "en",
        "isTransparent": false
      })
      forexScreenerRef.current.appendChild(script)
    }
  }, [isDarkMode])

  return (
    <div className={`h-screen flex transition-colors duration-300 ${isDarkMode ? 'bg-dark-900' : 'bg-gray-100'}`}>
      {/* Collapsible Sidebar - Fixed */}
      <aside 
        className={`${sidebarExpanded ? 'w-48' : 'w-16'} ${isDarkMode ? 'bg-dark-900 border-gray-800' : 'bg-white border-gray-200'} border-r flex flex-col h-screen sticky top-0 transition-all duration-300 ease-in-out`}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        {/* Logo - Icon only */}
        <div className="p-4 flex items-center justify-center shrink-0">
          <img src={logoImage} alt="Pipxacpital" className="h-8 w-auto object-contain" />
        </div>

        {/* Menu */}
        <nav className="flex-1 px-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.name}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                activeMenu === item.name 
                  ? 'bg-accent-green text-black' 
                  : isDarkMode 
                    ? 'text-gray-400 hover:text-white hover:bg-dark-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title={!sidebarExpanded ? item.name : ''}
            >
              <item.icon size={18} className="flex-shrink-0" />
              {sidebarExpanded && <span className="text-sm font-medium whitespace-nowrap">{item.name}</span>}
            </button>
          ))}
        </nav>

        {/* Theme Toggle & Logout - Fixed at bottom */}
        <div className={`p-2 border-t shrink-0 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          {/* Theme Toggle */}
          <button 
            onClick={toggleDarkMode}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
              isDarkMode 
                ? 'text-yellow-400 hover:text-yellow-300 hover:bg-dark-700'
                : 'text-blue-600 hover:text-blue-700 hover:bg-gray-100'
            }`}
            title={!sidebarExpanded ? (isDarkMode ? 'Light Mode' : 'Dark Mode') : ''}
          >
            {isDarkMode ? <Sun size={18} className="flex-shrink-0" /> : <Moon size={18} className="flex-shrink-0" />}
            {sidebarExpanded && <span className="text-sm font-medium whitespace-nowrap">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
          
          <button 
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors rounded-lg ${
              isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
            title={!sidebarExpanded ? 'Log Out' : ''}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {sidebarExpanded && <span className="text-sm font-medium whitespace-nowrap">Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content - Scrollable */}
      <main className="flex-1 overflow-y-auto">
        {/* Welcome Banner */}
        <div className={`relative border-b ${isDarkMode ? 'bg-gradient-to-r from-dark-800 via-dark-900 to-dark-800 border-gray-800' : 'bg-gradient-to-r from-gray-100 via-white to-gray-100 border-gray-200'}`}>
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-accent-green/20' : 'bg-green-100'}`}>
                <User size={20} className="text-accent-green" />
              </div>
              <div>
                <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Welcome back, {user.firstName || 'Trader'}!
                </p>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
            <p className={`text-sm ${isDarkMode ? 'text-accent-green' : 'text-green-600'}`}>
              Have a great trading day!
            </p>
          </div>
        </div>

        {/* Simple Header */}
        <header className={`flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <h1 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Dashboard</h1>
          <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>Welcome back!</p>
        </header>

        {/* Dashboard Content */}
        <div className="p-6">
          {/* Top Stats Boxes */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {/* Wallet Box */}
            <div className={`rounded-xl p-5 border ${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-accent-green/20 rounded-lg flex items-center justify-center">
                  <Wallet size={20} className="text-accent-green" />
                </div>
                <button onClick={() => navigate('/wallet')} className="text-accent-green text-xs font-medium hover:underline">View</button>
              </div>
              <p className={`text-sm mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>Wallet Balance</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>${walletBalance.toLocaleString()}</p>
            </div>

            {/* Total Trades Box */}
            <div className={`rounded-xl p-5 border ${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <TrendingUp size={20} className="text-blue-500" />
                </div>
                <span className="text-gray-500 text-xs">{userAccounts.length} accounts</span>
              </div>
              <p className={`text-sm mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>Total Trades</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalTrades.toLocaleString()}</p>
            </div>

            {/* Total Charges Box */}
            <div className={`rounded-xl p-5 border ${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <DollarSign size={20} className="text-orange-500" />
                </div>
                <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>Fees & Swap</span>
              </div>
              <p className={`text-sm mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>Total Charges</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>${totalCharges.toFixed(2)}</p>
            </div>

            {/* Total PnL Box */}
            <div className={`rounded-xl p-5 border ${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Activity size={20} className="text-purple-500" />
                </div>
                <span className={`text-xs font-medium ${totalPnl >= 0 ? 'text-accent-green' : 'text-red-500'}`}>
                  {totalPnl >= 0 ? '+' : ''}{totalPnl !== 0 ? ((totalPnl / (walletBalance || 1)) * 100).toFixed(1) + '%' : '0%'}
                </span>
              </div>
              <p className={`text-sm mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>Total PnL</p>
              <p className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-accent-green' : 'text-red-500'}`}>
                {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Forex Heatmap */}
          <div className={`rounded-xl p-5 border mb-6 ${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Activity size={20} className="text-orange-500" />
              </div>
              <div>
                <h2 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Forex Heatmap</h2>
                <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>Currency strength visualization</p>
              </div>
            </div>
            <div className="h-80 overflow-hidden rounded-lg">
              <div ref={forexHeatmapRef} className="tradingview-widget-container h-full">
                <div className="tradingview-widget-container__widget h-full"></div>
              </div>
            </div>
          </div>

          {/* Forex Screener */}
          <div className={`rounded-xl p-5 border mb-6 ${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp size={20} className="text-cyan-500" />
              </div>
              <div>
                <h2 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Forex Screener</h2>
                <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>Real-time currency pair analysis</p>
              </div>
            </div>
            <div className="h-96 overflow-hidden rounded-lg">
              <div ref={forexScreenerRef} className="tradingview-widget-container h-full">
                <div className="tradingview-widget-container__widget h-full"></div>
              </div>
            </div>
          </div>

          {/* Market News & Economic Calendar - TradingView Widgets */}
          <div className="grid grid-cols-2 gap-6">
            {/* Market News - TradingView Timeline Widget */}
            <div className={`rounded-xl p-5 border ${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Newspaper size={20} className="text-blue-500" />
                </div>
                <div>
                  <h2 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Market News</h2>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>Real-time updates from TradingView</p>
                </div>
              </div>
              <div className="h-96 overflow-hidden rounded-lg">
                <div ref={tradingViewRef} className="tradingview-widget-container h-full">
                  <div className="tradingview-widget-container__widget h-full"></div>
                </div>
              </div>
            </div>

            {/* Economic Calendar - TradingView Widget */}
            <div className={`rounded-xl p-5 border ${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Calendar size={20} className="text-purple-500" />
                </div>
                <div>
                  <h2 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Economic Calendar</h2>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>Real-time events from TradingView</p>
                </div>
              </div>
              <div className="h-96 overflow-hidden rounded-lg">
                <div ref={economicCalendarRef} className="tradingview-widget-container h-full">
                  <div className="tradingview-widget-container__widget h-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
