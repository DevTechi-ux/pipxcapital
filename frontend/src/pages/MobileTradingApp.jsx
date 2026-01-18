import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  Home, BarChart2, TrendingUp, LineChart, MoreHorizontal,
  Copy, Users, HelpCircle, FileText, UserCircle, LogOut, Wallet,
  X, ChevronRight, Search, Star, ArrowUp, ArrowDown, Clock,
  Plus, Minus, Settings, RefreshCw, ChevronDown, Bell, User,
  ArrowDownCircle, ArrowUpCircle, Check, Pencil, Trash2
} from 'lucide-react'
import metaApiService from '../services/metaApi'
import priceStreamService from '../services/priceStream'
import { API_URL } from '../config/api'

const MobileTradingApp = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const accountIdFromUrl = searchParams.get('account')
  const [activeTab, setActiveTab] = useState(accountIdFromUrl ? 'trade' : 'home')
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showOrderPanel, setShowOrderPanel] = useState(false)
  const [selectedInstrument, setSelectedInstrument] = useState(null)
  const [user, setUser] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [openTrades, setOpenTrades] = useState([])
  const [pendingOrders, setPendingOrders] = useState([])
  const [tradeHistory, setTradeHistory] = useState([])
  const [instruments, setInstruments] = useState([])
  const [livePrices, setLivePrices] = useState({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [tradeTab, setTradeTab] = useState('positions')
  const [chartTabs, setChartTabs] = useState([{ symbol: 'XAUUSD', name: 'Gold' }])
  const [activeChartTab, setActiveChartTab] = useState('XAUUSD')
  const [orderType, setOrderType] = useState('market')
  const [orderSide, setOrderSide] = useState('BUY')
  const [volume, setVolume] = useState('0.01')
  const [stopLoss, setStopLoss] = useState('')
  const [takeProfit, setTakeProfit] = useState('')
  const [pendingOrderType, setPendingOrderType] = useState('BUY_LIMIT')
  const [entryPrice, setEntryPrice] = useState('')
  const [leverage, setLeverage] = useState('1:100')
  const [isExecuting, setIsExecuting] = useState(false)
  const [accountSummary, setAccountSummary] = useState({ balance: 0, equity: 0, credit: 0, freeMargin: 0, usedMargin: 0, floatingPnl: 0 })
  const [expandedTrade, setExpandedTrade] = useState(null)
  const chartContainerRef = useRef(null)
  const wsRef = useRef(null)
  
  // Modify trade modal states
  const [showModifyModal, setShowModifyModal] = useState(false)
  const [selectedTradeForModify, setSelectedTradeForModify] = useState(null)
  const [modifySL, setModifySL] = useState('')
  const [modifyTP, setModifyTP] = useState('')
  const [isModifying, setIsModifying] = useState(false)
  
  // iOS-style notification states
  const [notifications, setNotifications] = useState([])
  const notificationIdRef = useRef(0)

  const categories = ['All', 'Starred', 'Forex', 'Metals', 'Commodities', 'Crypto']

  // Default starred symbols
  const defaultStarred = ['XAUUSD', 'EURUSD', 'GBPUSD', 'BTCUSD']

  // Handle resize - redirect to dashboard if desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        // Switch to desktop view
        sessionStorage.removeItem('viewChecked')
        navigate('/dashboard')
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [navigate])

  // Fetch all instruments from API
  const fetchInstruments = async () => {
    try {
      const res = await fetch(`${API_URL}/prices/instruments`)
      const data = await res.json()
      if (data.success && data.instruments) {
        const instrumentsWithState = data.instruments.map(inst => ({
          ...inst,
          bid: 0,
          ask: 0,
          spread: 0,
          starred: defaultStarred.includes(inst.symbol)
        }))
        setInstruments(instrumentsWithState)
      }
    } catch (err) {
      console.error('Error fetching instruments:', err)
    }
  }

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}')
    if (!userData._id) {
      navigate('/user/login')
      return
    }
    setUser(userData)
    fetchInstruments() // Fetch instruments from API
    fetchAccounts(userData._id)
    
    // Initial price fetch
    fetchLivePrices()

    return () => {
      metaApiService.disconnect()
    }
  }, [])

  useEffect(() => {
    if (selectedAccount) {
      fetchOpenTrades()
      fetchPendingOrders()
      fetchTradeHistory()
      fetchAccountSummary()
      const interval = setInterval(() => {
        fetchOpenTrades()
        fetchAccountSummary()
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [selectedAccount])

  // Get all symbols from loaded instruments for price fetching
  const allSymbols = instruments.length > 0 
    ? instruments.map(i => i.symbol)
    : ['EURUSD', 'GBPUSD', 'XAUUSD', 'BTCUSD'] // Fallback

  // Real-time price updates via WebSocket for institutional-grade streaming
  useEffect(() => {
    const unsubscribe = priceStreamService.subscribe('mobileTradingApp', (prices, updated, timestamp) => {
      // Only update if we have valid prices (prevent flickering to zero)
      if (!prices || Object.keys(prices).length === 0) return
      
      // Merge prices to prevent losing existing data
      setLivePrices(prev => {
        const merged = { ...prev }
        Object.entries(prices).forEach(([symbol, price]) => {
          if (price && price.bid) {
            merged[symbol] = price
          }
        })
        return merged
      })
      
      // Update instruments with live prices (only if price is valid)
      setInstruments(prev => prev.map(inst => {
        const priceData = prices[inst.symbol]
        if (priceData && priceData.bid && priceData.bid > 0) {
          const bid = priceData.bid
          const ask = priceData.ask || priceData.bid
          const spread = Math.abs(ask - bid) || (bid * 0.0001)
          return { ...inst, bid, ask, spread }
        }
        return inst
      }))
      
      // Check pending orders and SL/TP in background
      if (Object.keys(prices).length > 0) {
        checkPendingOrdersAndSlTp(prices)
      }
    })
    
    // Fallback: also fetch via HTTP for initial load
    fetchLivePrices()
    
    return () => unsubscribe()
  }, [])

  // Fetch live prices using metaApiService (same as TradingPage)
  const fetchLivePrices = async () => {
    try {
      const allPrices = await metaApiService.getAllPrices(allSymbols)
      
      if (Object.keys(allPrices).length > 0) {
        setLoading(false)
        setLivePrices(allPrices)
        
        // Update instruments with live prices
        setInstruments(prev => prev.map(inst => {
          const priceData = allPrices[inst.symbol]
          if (priceData && priceData.bid) {
            const bid = priceData.bid
            const ask = priceData.ask || priceData.bid
            const spread = Math.abs(ask - bid) || (bid * 0.0001)
            return { ...inst, bid, ask, spread }
          }
          return inst
        }))
        
        // Check pending orders and SL/TP in background
        checkPendingOrdersAndSlTp(allPrices)
      }
    } catch (e) {
      console.error('Live prices error:', e)
    }
  }
  
  // Check pending orders and SL/TP execution
  const checkPendingOrdersAndSlTp = async (prices) => {
    if (!selectedAccount) return
    
    try {
      // Check pending orders for execution
      const pendingRes = await fetch(`${API_URL}/trade/check-pending`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prices })
      })
      const pendingData = await pendingRes.json()
      
      if (pendingData.success && pendingData.executedCount > 0) {
        pendingData.executedTrades.forEach(trade => {
          showNotification(`${trade.orderType} order executed: ${trade.symbol} ${trade.side} @ ${trade.executionPrice?.toFixed(5)}`, 'success')
        })
        fetchOpenTrades()
        fetchPendingOrders()
      }
      
      // Check SL/TP for open trades
      const sltpRes = await fetch(`${API_URL}/trade/check-sltp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prices })
      })
      const sltpData = await sltpRes.json()
      
      if (sltpData.success && sltpData.closedCount > 0) {
        sltpData.closedTrades.forEach(trade => {
          const pnlText = trade.pnl >= 0 ? `+$${trade.pnl.toFixed(2)}` : `-$${Math.abs(trade.pnl).toFixed(2)}`
          showNotification(`${trade.reason} hit: ${trade.symbol} closed at ${pnlText}`, trade.pnl >= 0 ? 'success' : 'error')
        })
        fetchOpenTrades()
        fetchTradeHistory()
        fetchAccountSummary()
      }
    } catch (e) {
      // Silently fail - this runs in background
    }
  }

  const fetchAccounts = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/trading-accounts/user/${userId}`)
      const data = await res.json()
      setAccounts(data.accounts || [])
      if (data.accounts?.length > 0) {
        // If account ID is passed in URL, select that account
        if (accountIdFromUrl) {
          const accountFromUrl = data.accounts.find(acc => acc._id === accountIdFromUrl)
          if (accountFromUrl) {
            setSelectedAccount(accountFromUrl)
          } else {
            setSelectedAccount(data.accounts[0])
          }
        } else {
          setSelectedAccount(data.accounts[0])
        }
      }
    } catch (e) {}
    setLoading(false)
  }

  const fetchOpenTrades = async () => {
    if (!selectedAccount) return
    try {
      const res = await fetch(`${API_URL}/trade/open/${selectedAccount._id}`)
      const data = await res.json()
      if (data.success) setOpenTrades(data.trades || [])
    } catch (e) {}
  }

  const fetchPendingOrders = async () => {
    if (!selectedAccount) return
    try {
      const res = await fetch(`${API_URL}/trade/pending/${selectedAccount._id}`)
      const data = await res.json()
      if (data.success) setPendingOrders(data.orders || [])
    } catch (e) {}
  }

  const fetchTradeHistory = async () => {
    if (!selectedAccount) return
    try {
      const res = await fetch(`${API_URL}/trade/history/${selectedAccount._id}?limit=50`)
      const data = await res.json()
      if (data.success) setTradeHistory(data.trades || [])
    } catch (e) {}
  }

  const fetchAccountSummary = async () => {
    if (!selectedAccount) return
    try {
      const pricesParam = encodeURIComponent(JSON.stringify(livePrices))
      const res = await fetch(`${API_URL}/trade/summary/${selectedAccount._id}?prices=${pricesParam}`)
      const data = await res.json()
      if (data.success) setAccountSummary(data.summary)
    } catch (e) {}
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/user/login')
  }

  const openOrderPanel = (instrument) => {
    setSelectedInstrument(instrument)
    setShowOrderPanel(true)
    
    // When clicking from search, mark instrument as "added" so it shows in its category
    if (searchTerm.length > 0 && !instrument.popular) {
      setInstruments(prevInsts => prevInsts.map(i => 
        i.symbol === instrument.symbol ? { ...i, popular: true } : i
      ))
    }
    
    // Clear search after selection
    setSearchTerm('')
  }

  const executeOrder = async () => {
    if (!selectedAccount || !selectedInstrument || isExecuting) return
    setIsExecuting(true)

    const prices = livePrices[selectedInstrument.symbol] || {}
    
    // Check if market data is available
    if (!prices.bid || !prices.ask || prices.bid <= 0 || prices.ask <= 0) {
      showNotification('Market is closed or no price data available', 'error')
      setIsExecuting(false)
      return
    }

    // For pending orders, validate entry price
    if (orderType === 'pending' && !entryPrice) {
      showNotification('Please enter an entry price for pending order', 'error')
      setIsExecuting(false)
      return
    }

    try {
      const side = orderType === 'pending' ? (pendingOrderType.includes('BUY') ? 'BUY' : 'SELL') : orderSide
      const actualOrderType = orderType === 'market' ? 'MARKET' : pendingOrderType
      const pendingPrice = orderType === 'pending' ? parseFloat(entryPrice) : null

      const res = await fetch(`${API_URL}/trade/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user._id,
          tradingAccountId: selectedAccount._id,
          symbol: selectedInstrument.symbol,
          segment: selectedInstrument.category,
          side: side,
          orderType: actualOrderType,
          quantity: parseFloat(volume),
          bid: pendingPrice || prices.bid,
          ask: pendingPrice || prices.ask,
          leverage: leverage,
          sl: stopLoss ? parseFloat(stopLoss) : null,
          tp: takeProfit ? parseFloat(takeProfit) : null
        })
      })
      const data = await res.json()
      if (data.success) {
        setShowOrderPanel(false)
        if (orderType === 'pending') {
          fetchPendingOrders()
          showNotification(`${pendingOrderType.replace('_', ' ')} order placed!`, 'success')
          setEntryPrice('')
        } else {
          fetchOpenTrades()
          showNotification('Order executed successfully!', 'success')
        }
        fetchAccountSummary()
      } else {
        showNotification(data.message || 'Order failed', 'error')
      }
    } catch (e) {
      showNotification('Error executing order', 'error')
    }
    setIsExecuting(false)
  }

  const closeTrade = async (tradeId) => {
    const trade = openTrades.find(t => t._id === tradeId)
    if (!trade) {
      showNotification('Trade not found', 'error')
      return
    }

    const prices = livePrices[trade.symbol] || {}
    
    // Check if market data is available
    if (!prices.bid || !prices.ask || prices.bid <= 0 || prices.ask <= 0) {
      showNotification('Market is closed or no price data. Cannot close trade.', 'error')
      return
    }

    try {
      const res = await fetch(`${API_URL}/trade/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId: tradeId,
          bid: prices.bid,
          ask: prices.ask
        })
      })
      const data = await res.json()
      if (data.success) {
        const pnl = data.realizedPnl?.toFixed(2) || data.pnl?.toFixed(2) || '0.00'
        showNotification(`Trade closed! P/L: $${pnl}`, parseFloat(pnl) >= 0 ? 'success' : 'error')
        fetchOpenTrades()
        fetchTradeHistory()
        fetchAccountSummary()
      } else {
        showNotification(data.message || 'Failed to close trade', 'error')
      }
    } catch (e) {
      console.error('Close trade error:', e)
      showNotification('Error closing trade', 'error')
    }
  }

  // iOS-style notification function
  const showNotification = (message, type = 'success', duration = 3000) => {
    const id = ++notificationIdRef.current
    const notification = { id, message, type }
    setNotifications(prev => [...prev, notification])
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, duration)
  }

  // Open modify SL/TP modal
  const openModifyModal = (trade) => {
    setSelectedTradeForModify(trade)
    setModifySL((trade.sl || trade.stopLoss)?.toString() || '')
    setModifyTP((trade.tp || trade.takeProfit)?.toString() || '')
    setShowModifyModal(true)
  }

  // Modify trade SL/TP
  const handleModifyTrade = async () => {
    if (!selectedTradeForModify || isModifying) return
    setIsModifying(true)

    try {
      const res = await fetch(`${API_URL}/trade/modify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId: selectedTradeForModify._id,
          sl: modifySL ? parseFloat(modifySL) : null,
          tp: modifyTP ? parseFloat(modifyTP) : null
        })
      })
      const data = await res.json()
      if (data.success) {
        showNotification('Trade modified successfully', 'success')
        fetchOpenTrades()
        setShowModifyModal(false)
      } else {
        showNotification(data.message || 'Failed to modify trade', 'error')
      }
    } catch (e) {
      showNotification('Error modifying trade', 'error')
    }
    setIsModifying(false)
  }

  // Cancel pending order
  const cancelPendingOrder = async (orderId) => {
    try {
      const res = await fetch(`${API_URL}/trade/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeId: orderId })
      })
      const data = await res.json()
      if (data.success) {
        showNotification('Pending order cancelled', 'success')
        fetchPendingOrders()
      } else {
        showNotification(data.message || 'Failed to cancel order', 'error')
      }
    } catch (e) {
      showNotification('Error cancelling order', 'error')
    }
  }

  // Filter instruments: show all when "All" tab or searching, popular for specific categories
  const filteredInstruments = instruments.filter(inst => {
    const matchesSearch = inst.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inst.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    // When searching, show all matching instruments
    if (searchTerm.length > 0) {
      return matchesSearch
    }
    
    // When viewing Starred, show all starred instruments
    if (activeCategory === 'Starred') {
      return inst.starred
    }
    
    // When viewing "All", show ALL instruments
    if (activeCategory === 'All') {
      return true
    }
    
    // For specific categories, show only popular by default
    return inst.category === activeCategory && inst.popular
  })

  const moreMenuItems = [
    { name: 'Dashboard', icon: Home, path: '/dashboard', action: () => setActiveTab('home') },
    { name: 'Wallet', icon: Wallet, path: '/wallet' },
    { name: 'Copy Trade', icon: Copy, path: '/copytrade' },
    { name: 'IB Program', icon: Users, path: '/ib' },
    { name: 'Profile', icon: UserCircle, path: '/profile' },
    { name: 'Support', icon: HelpCircle, path: '/support' },
    { name: 'Instructions', icon: FileText, path: '/instructions' },
  ]

  const getPrice = (symbol) => livePrices[symbol] || { bid: 0, ask: 0 }

  const calculatePnl = (trade) => {
    const prices = getPrice(trade.symbol)
    const currentPrice = trade.side === 'BUY' ? prices.bid : prices.ask
    // Return previous PnL or 0 if no valid price (prevent flickering)
    if (!currentPrice || currentPrice <= 0) return trade._lastPnl || 0
    const pnl = trade.side === 'BUY'
      ? (currentPrice - trade.openPrice) * trade.quantity * (trade.contractSize || 100000)
      : (trade.openPrice - currentPrice) * trade.quantity * (trade.contractSize || 100000)
    trade._lastPnl = pnl // Cache for fallback
    return pnl
  }

  // Calculate total floating PnL and update account summary in real-time
  // Only calculate if we have valid prices
  const hasValidPrices = Object.keys(livePrices).length > 0 && 
    openTrades.some(t => livePrices[t.symbol]?.bid > 0)
  
  const totalFloatingPnl = hasValidPrices 
    ? openTrades.reduce((sum, trade) => sum + calculatePnl(trade), 0)
    : (accountSummary.floatingPnl || 0) // Use cached value if no valid prices
  const totalUsedMargin = openTrades.reduce((sum, trade) => sum + (trade.marginUsed || 0), 0)
  
  // Real-time equity calculation
  const realTimeEquity = (accountSummary.balance || 0) + (accountSummary.credit || 0) + totalFloatingPnl
  const realTimeFreeMargin = realTimeEquity - totalUsedMargin

  // HOME TAB
  const [showAccountSelector, setShowAccountSelector] = useState(false)
  
  const renderHome = () => (
    <div className="p-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-500 text-xs">Welcome back,</p>
          <h1 className="text-white text-lg font-bold">{user?.firstName || 'Trader'}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/profile')} className="p-2 bg-dark-800 rounded-full">
            <UserCircle size={20} className="text-gray-400" />
          </button>
          <button className="p-2 bg-dark-800 rounded-full">
            <Bell size={20} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Account Selector Card */}
      {selectedAccount && (
        <div className="bg-gradient-to-br from-accent-green/20 to-dark-800 rounded-xl p-4 mb-4 border border-accent-green/30">
          {/* Account Header with Switch */}
          <div 
            className="flex items-center justify-between mb-3 cursor-pointer"
            onClick={() => setShowAccountSelector(!showAccountSelector)}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent-green/30 rounded-full flex items-center justify-center">
                <User size={16} className="text-accent-green" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">{selectedAccount.accountId}</p>
                <p className="text-gray-400 text-xs">{selectedAccount.accountType || 'Standard'}</p>
              </div>
            </div>
            <ChevronRight size={18} className={`text-gray-400 transition-transform ${showAccountSelector ? 'rotate-90' : ''}`} />
          </div>
          
          {/* Account Selector Dropdown */}
          {showAccountSelector && accounts.length > 1 && (
            <div className="mb-3 border-t border-gray-700 pt-3">
              <p className="text-gray-500 text-xs mb-2">Switch Account</p>
              <div className="space-y-2">
                {accounts.map(acc => (
                  <button
                    key={acc._id}
                    onClick={() => { setSelectedAccount(acc); setShowAccountSelector(false) }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg ${
                      selectedAccount._id === acc._id ? 'bg-accent-green/20 border border-accent-green/50' : 'bg-dark-700'
                    }`}
                  >
                    <span className="text-white text-sm">{acc.accountId}</span>
                    {selectedAccount._id === acc._id && <Check size={14} className="text-accent-green" />}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Balance & Equity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-gray-400 text-xs">Balance</p>
              <p className="text-white text-xl font-bold">${(accountSummary.balance || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Equity</p>
              <p className={`text-xl font-bold ${totalFloatingPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${realTimeEquity.toFixed(2)}
              </p>
            </div>
          </div>
          
          {/* Deposit/Withdraw Buttons */}
          <div className="flex gap-2 mt-3">
            <button 
              onClick={() => navigate('/wallet')}
              className="flex-1 flex items-center justify-center gap-1 py-2 bg-accent-green text-black rounded-lg text-sm font-medium"
            >
              <ArrowDownCircle size={16} />
              Deposit
            </button>
            <button 
              onClick={() => navigate('/wallet')}
              className="flex-1 flex items-center justify-center gap-1 py-2 bg-dark-700 text-white rounded-lg text-sm font-medium border border-gray-600"
            >
              <ArrowUpCircle size={16} />
              Withdraw
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions - 2 rows */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <button onClick={() => navigate('/account')} className="flex flex-col items-center p-2.5 bg-dark-800 rounded-xl">
          <User size={20} className="text-accent-green mb-1" />
          <span className="text-white text-[10px]">Account</span>
        </button>
        <button onClick={() => setActiveTab('market')} className="flex flex-col items-center p-2.5 bg-dark-800 rounded-xl">
          <BarChart2 size={20} className="text-blue-500 mb-1" />
          <span className="text-white text-[10px]">Market</span>
        </button>
        <button onClick={() => setActiveTab('trade')} className="flex flex-col items-center p-2.5 bg-dark-800 rounded-xl">
          <TrendingUp size={20} className="text-yellow-500 mb-1" />
          <span className="text-white text-[10px]">Trade</span>
        </button>
        <button onClick={() => setActiveTab('chart')} className="flex flex-col items-center p-2.5 bg-dark-800 rounded-xl">
          <LineChart size={20} className="text-orange-500 mb-1" />
          <span className="text-white text-[10px]">Chart</span>
        </button>
        <button onClick={() => navigate('/wallet')} className="flex flex-col items-center p-2.5 bg-dark-800 rounded-xl">
          <Wallet size={20} className="text-green-500 mb-1" />
          <span className="text-white text-[10px]">Wallet</span>
        </button>
        <button onClick={() => navigate('/copytrade')} className="flex flex-col items-center p-2.5 bg-dark-800 rounded-xl">
          <Copy size={20} className="text-purple-500 mb-1" />
          <span className="text-white text-[10px]">Copy</span>
        </button>
        <button onClick={() => navigate('/ib')} className="flex flex-col items-center p-2.5 bg-dark-800 rounded-xl">
          <Users size={20} className="text-pink-500 mb-1" />
          <span className="text-white text-[10px]">IB</span>
        </button>
        <button onClick={() => setShowMoreMenu(true)} className="flex flex-col items-center p-2.5 bg-dark-800 rounded-xl">
          <MoreHorizontal size={20} className="text-gray-400 mb-1" />
          <span className="text-white text-[10px]">More</span>
        </button>
      </div>

      {/* Open Positions Summary */}
      <div className="bg-dark-800 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold">Open Positions</h3>
          <span className="text-accent-green text-sm">{openTrades.length} active</span>
        </div>
        {openTrades.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No open positions</p>
        ) : (
          <div className="space-y-2">
            {openTrades.slice(0, 3).map(trade => {
              const pnl = calculatePnl(trade)
              return (
                <div key={trade._id} className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{trade.symbol}</p>
                    <p className={`text-xs ${trade.side === 'BUY' ? 'text-green-500' : 'text-red-500'}`}>
                      {trade.side} • {trade.quantity} lots
                    </p>
                  </div>
                  <p className={`font-semibold ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                  </p>
                </div>
              )
            })}
            {openTrades.length > 3 && (
              <button onClick={() => setActiveTab('trade')} className="w-full text-accent-green text-sm py-2">
                View all {openTrades.length} positions →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Market Movers */}
      <div className="bg-dark-800 rounded-xl p-4">
        <h3 className="text-white font-semibold mb-3">Market Watch</h3>
        <div className="space-y-2">
          {instruments.filter(i => i.starred).slice(0, 4).map(inst => {
            const prices = getPrice(inst.symbol)
            return (
              <button
                key={inst.symbol}
                onClick={() => openOrderPanel(inst)}
                className="w-full flex items-center justify-between p-3 bg-dark-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Star size={16} className="text-yellow-500 fill-yellow-500" />
                  <div className="text-left">
                    <p className="text-white font-medium">{inst.symbol}</p>
                    <p className="text-gray-500 text-xs">{inst.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white">{prices.bid?.toFixed(inst.category === 'Forex' ? 5 : 2) || '-'}</p>
                  <p className="text-gray-500 text-xs">Spread: {((prices.ask - prices.bid) * (inst.category === 'Forex' ? 10000 : 1)).toFixed(1)}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )

  // MARKET TAB
  const renderMarket = () => (
    <div className="flex flex-col h-full pb-16">
      {/* Search */}
      <div className="p-4 bg-dark-800 border-b border-gray-800">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Search instruments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-dark-700 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap ${
                activeCategory === cat ? 'bg-accent-green text-black' : 'bg-dark-700 text-gray-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Instruments List */}
      <div className="flex-1 overflow-auto">
        {filteredInstruments.map(inst => {
          const prices = getPrice(inst.symbol)
          return (
            <div
              key={inst.symbol}
              className="flex items-center justify-between p-4 border-b border-gray-800"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setInstruments(prev => prev.map(i => 
                      i.symbol === inst.symbol ? { ...i, starred: !i.starred } : i
                    ))
                  }}
                  className="p-1"
                >
                  <Star size={18} className={inst.starred ? 'text-yellow-500 fill-yellow-500' : 'text-gray-600'} />
                </button>
                <div className="text-left">
                  <p className="text-white font-medium">{inst.symbol}</p>
                  <p className="text-gray-500 text-xs">{inst.name}</p>
                </div>
              </div>
              <button
                onClick={() => openOrderPanel(inst)}
                className="flex items-center gap-3 active:bg-dark-700 rounded-lg p-2"
              >
                <div className="text-right">
                  <p className="text-red-500 text-sm">{prices.bid?.toFixed(inst.category === 'Forex' ? 5 : 2) || '-'}</p>
                  <p className="text-gray-600 text-xs">Bid</p>
                </div>
                <div className="text-right">
                  <p className="text-green-500 text-sm">{prices.ask?.toFixed(inst.category === 'Forex' ? 5 : 2) || '-'}</p>
                  <p className="text-gray-600 text-xs">Ask</p>
                </div>
              </button>
              <button
                onClick={() => {
                  const existingTab = chartTabs.find(t => t.symbol === inst.symbol)
                  if (!existingTab) {
                    setChartTabs(prev => [...prev, { symbol: inst.symbol, name: inst.name }])
                  }
                  setActiveChartTab(inst.symbol)
                  setActiveTab('chart')
                }}
                className="p-2 bg-dark-700 rounded-lg"
              >
                <LineChart size={18} className="text-accent-green" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )

  // TRADE TAB - Like reference image with real-time updates
  const renderTrade = () => (
    <div className="flex flex-col h-full pb-16">
      {/* Account Summary List - Real-time values */}
      <div className="bg-dark-900 border-b border-gray-800">
        <div className="divide-y divide-gray-800">
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-gray-400 text-sm">Balance</span>
            <span className="text-white text-sm">{(accountSummary.balance || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-gray-400 text-sm">Equity</span>
            <span className={`text-sm ${totalFloatingPnl >= 0 ? 'text-white' : 'text-red-500'}`}>
              {realTimeEquity.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-gray-400 text-sm">Credit</span>
            <span className="text-white text-sm">{(accountSummary.credit || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-gray-400 text-sm">Used Margin</span>
            <span className="text-white text-sm">{totalUsedMargin.toFixed(2)}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-gray-400 text-sm">Free Margin</span>
            <span className={`text-sm ${realTimeFreeMargin >= 0 ? 'text-blue-400' : 'text-red-500'}`}>{realTimeFreeMargin.toFixed(2)}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-gray-400 text-sm">Floating PL</span>
            <span className={`text-sm ${totalFloatingPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {totalFloatingPnl.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs - Positions / Pending / History */}
      <div className="flex bg-dark-800 border-b border-gray-800">
        {['positions', 'pending', 'history'].map(tab => (
          <button
            key={tab}
            onClick={() => setTradeTab(tab)}
            className={`flex-1 py-3 text-sm font-medium ${
              tradeTab === tab ? 'text-accent-green border-b-2 border-accent-green' : 'text-gray-500'
            }`}
          >
            {tab === 'positions' ? `Positions (${openTrades.length})` :
             tab === 'pending' ? `Pending (${pendingOrders.length})` : 'History'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {tradeTab === 'positions' && (
          openTrades.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <TrendingUp size={48} className="mb-2 opacity-50" />
              <p>No open positions</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {openTrades.map(trade => {
                const pnl = calculatePnl(trade)
                const prices = getPrice(trade.symbol)
                const isExpanded = expandedTrade === trade._id
                const currentPrice = trade.side === 'BUY' ? prices.bid : prices.ask
                return (
                  <div key={trade._id} className="bg-dark-900">
                    {/* Slim View - Always visible */}
                    <div 
                      className="flex items-center justify-between px-4 py-3 cursor-pointer"
                      onClick={() => setExpandedTrade(isExpanded ? null : trade._id)}
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium text-sm">{trade.symbol}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                              trade.side === 'BUY' ? 'bg-blue-500/20 text-blue-500' : 'bg-red-500/20 text-red-500'
                            }`}>
                              {trade.side}
                            </span>
                          </div>
                          <p className="text-gray-500 text-xs">{trade.quantity} lots @ {trade.openPrice?.toFixed(5)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Pen icon for quick SL/TP edit */}
                        <button
                          onClick={(e) => { e.stopPropagation(); openModifyModal(trade) }}
                          className="p-2 bg-blue-500/20 rounded-lg active:bg-blue-500/30"
                        >
                          <Pencil size={14} className="text-blue-400" />
                        </button>
                        <div className="text-right">
                          <p className={`font-semibold text-sm ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                          </p>
                          <p className="text-gray-500 text-xs">{currentPrice?.toFixed(5) || '-'}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-3 border-t border-gray-800 bg-dark-800">
                        <div className="grid grid-cols-2 gap-3 py-3 text-xs">
                          <div>
                            <p className="text-gray-500">Open Price</p>
                            <p className="text-white">{trade.openPrice?.toFixed(5)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Current Price</p>
                            <p className="text-white">{currentPrice?.toFixed(5) || '-'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Volume</p>
                            <p className="text-white">{trade.quantity} lots</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Margin Used</p>
                            <p className="text-white">${(trade.marginUsed || 0).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Swap</p>
                            <p className="text-white">${(trade.swap || 0).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Commission</p>
                            <p className="text-white">${(trade.commission || 0).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Stop Loss</p>
                            <p className={trade.sl || trade.stopLoss ? 'text-red-500' : 'text-gray-600'}>{(trade.sl || trade.stopLoss)?.toFixed(5) || 'Not set'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Take Profit</p>
                            <p className={trade.tp || trade.takeProfit ? 'text-green-500' : 'text-gray-600'}>{(trade.tp || trade.takeProfit)?.toFixed(5) || 'Not set'}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); openModifyModal(trade) }}
                            className="flex-1 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                          >
                            <Pencil size={14} />
                            Modify SL/TP
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); closeTrade(trade._id) }}
                            className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium"
                          >
                            Close Trade
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}

        {tradeTab === 'pending' && (
          pendingOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Clock size={48} className="mb-2 opacity-50" />
              <p>No pending orders</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {pendingOrders.map(order => {
                const prices = getPrice(order.symbol)
                const currentPrice = order.side === 'BUY' ? prices.ask : prices.bid
                return (
                <div key={order._id} className="p-4 bg-dark-900">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{order.symbol}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        order.side === 'BUY' ? 'bg-blue-500/20 text-blue-500' : 'bg-red-500/20 text-red-500'
                      }`}>
                        {order.orderType}
                      </span>
                    </div>
                    <span className="text-yellow-500 text-xs font-medium">PENDING</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                    <div>
                      <p className="text-gray-500">Entry Price</p>
                      <p className="text-white">{order.pendingPrice?.toFixed(5)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Current</p>
                      <p className="text-white">{currentPrice?.toFixed(5) || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Volume</p>
                      <p className="text-white">{order.quantity} lots</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Stop Loss</p>
                      <p className={order.sl || order.stopLoss ? 'text-red-500' : 'text-gray-600'}>{(order.sl || order.stopLoss)?.toFixed(5) || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Take Profit</p>
                      <p className={order.tp || order.takeProfit ? 'text-green-500' : 'text-gray-600'}>{(order.tp || order.takeProfit)?.toFixed(5) || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Created</p>
                      <p className="text-white">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => cancelPendingOrder(order._id)}
                    className="w-full py-2 bg-red-500/20 text-red-500 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Trash2 size={14} />
                    Cancel Order
                  </button>
                </div>
              )})}
            </div>
          )
        )}

        {tradeTab === 'history' && (
          tradeHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <FileText size={48} className="mb-2 opacity-50" />
              <p>No trade history</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {tradeHistory.map(trade => (
                <div key={trade._id} className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{trade.symbol}</span>
                      <span className={`text-xs ${trade.side === 'BUY' ? 'text-green-500' : 'text-red-500'}`}>
                        {trade.side}
                      </span>
                      {trade.closedBy === 'ADMIN' && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded">
                          Admin Close
                        </span>
                      )}
                    </div>
                    <span className={`font-semibold ${trade.realizedPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {trade.realizedPnl >= 0 ? '+' : ''}${trade.realizedPnl?.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{trade.quantity} lots</span>
                    <span>{new Date(trade.closedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )

  // TradingView symbol mapping
  const getSymbolForTradingView = (symbol) => {
    // Crypto - use BINANCE:USDT pairs
    const cryptoMap = {
      'BTCUSD': 'BINANCE:BTCUSDT', 'ETHUSD': 'BINANCE:ETHUSDT', 'BNBUSD': 'BINANCE:BNBUSDT',
      'SOLUSD': 'BINANCE:SOLUSDT', 'XRPUSD': 'BINANCE:XRPUSDT', 'ADAUSD': 'BINANCE:ADAUSDT',
      'DOGEUSD': 'BINANCE:DOGEUSDT', 'TRXUSD': 'BINANCE:TRXUSDT', 'LINKUSD': 'BINANCE:LINKUSDT',
      'MATICUSD': 'BINANCE:MATICUSDT', 'DOTUSD': 'BINANCE:DOTUSDT', 'SHIBUSD': 'BINANCE:SHIBUSDT',
      'LTCUSD': 'BINANCE:LTCUSDT', 'BCHUSD': 'BINANCE:BCHUSDT', 'AVAXUSD': 'BINANCE:AVAXUSDT',
      'XLMUSD': 'BINANCE:XLMUSDT', 'UNIUSD': 'BINANCE:UNIUSDT', 'ATOMUSD': 'BINANCE:ATOMUSDT',
      'ETCUSD': 'BINANCE:ETCUSDT', 'FILUSD': 'BINANCE:FILUSDT', 'ICPUSD': 'BINANCE:ICPUSDT',
      'VETUSD': 'BINANCE:VETUSDT', 'NEARUSD': 'BINANCE:NEARUSDT', 'GRTUSD': 'BINANCE:GRTUSDT',
      'AAVEUSD': 'BINANCE:AAVEUSDT', 'MKRUSD': 'BINANCE:MKRUSDT', 'ALGOUSD': 'BINANCE:ALGOUSDT',
      'FTMUSD': 'BINANCE:FTMUSDT', 'SANDUSD': 'BINANCE:SANDUSDT', 'MANAUSD': 'BINANCE:MANAUSDT',
      'AXSUSD': 'BINANCE:AXSUSDT', 'THETAUSD': 'BINANCE:THETAUSDT', 'XMRUSD': 'BINANCE:XMRUSDT',
      'FLOWUSD': 'BINANCE:FLOWUSDT', 'SNXUSD': 'BINANCE:SNXUSDT', 'EOSUSD': 'BINANCE:EOSUSDT',
      'CHZUSD': 'BINANCE:CHZUSDT', 'ENJUSD': 'BINANCE:ENJUSDT', 'ZILUSD': 'BINANCE:ZILUSDT',
      'BATUSD': 'BINANCE:BATUSDT', 'CRVUSD': 'BINANCE:CRVUSDT', 'COMPUSD': 'BINANCE:COMPUSDT',
      'SUSHIUSD': 'BINANCE:SUSHIUSDT', 'ZRXUSD': 'BINANCE:ZRXUSDT', 'GALAUSD': 'BINANCE:GALAUSDT',
      'APEUSD': 'BINANCE:APEUSDT', 'WAVESUSD': 'BINANCE:WAVESUSDT', 'ZECUSD': 'BINANCE:ZECUSDT',
    }
    if (cryptoMap[symbol]) return cryptoMap[symbol]
    
    // Forex & Metals - use OANDA
    const forexMap = {
      'EURUSD': 'OANDA:EURUSD', 'GBPUSD': 'OANDA:GBPUSD', 'USDJPY': 'OANDA:USDJPY',
      'USDCHF': 'OANDA:USDCHF', 'AUDUSD': 'OANDA:AUDUSD', 'NZDUSD': 'OANDA:NZDUSD',
      'USDCAD': 'OANDA:USDCAD', 'EURGBP': 'OANDA:EURGBP', 'EURJPY': 'OANDA:EURJPY',
      'GBPJPY': 'OANDA:GBPJPY', 'XAUUSD': 'OANDA:XAUUSD', 'XAGUSD': 'OANDA:XAGUSD',
    }
    return forexMap[symbol] || `OANDA:${symbol}`
  }

  // CHART TAB - Full screen chart with buy/sell at bottom
  const renderChart = () => {
    const chartInst = instruments.find(i => i.symbol === activeChartTab)
    const isForex = chartInst?.category === 'Forex'
    const decimals = isForex ? 5 : 2
    const spreadMultiplier = isForex ? 10000 : 1
    
    return (
    <div className="flex flex-col h-screen">
      {/* Chart Tabs - Minimal height */}
      <div className="flex items-center bg-dark-800 border-b border-gray-800 overflow-x-auto shrink-0" style={{ height: '40px' }}>
        {chartTabs.map(tab => (
          <button
            key={tab.symbol}
            onClick={() => setActiveChartTab(tab.symbol)}
            className={`flex items-center gap-2 px-3 py-2 text-xs whitespace-nowrap border-r border-gray-800 ${
              activeChartTab === tab.symbol ? 'bg-dark-700 text-white' : 'text-gray-500'
            }`}
          >
            {tab.symbol}
            {chartTabs.length > 1 && (
              <X
                size={12}
                onClick={(e) => {
                  e.stopPropagation()
                  setChartTabs(prev => prev.filter(t => t.symbol !== tab.symbol))
                  if (activeChartTab === tab.symbol && chartTabs.length > 1) {
                    setActiveChartTab(chartTabs[0].symbol)
                  }
                }}
                className="hover:text-red-500"
              />
            )}
          </button>
        ))}
        <button
          onClick={() => setActiveTab('market')}
          className="px-3 py-2 text-gray-500 hover:text-white"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Full Screen TradingView Chart */}
      <div className="flex-1 bg-[#0d0d0d] relative min-h-0" ref={chartContainerRef}>
        <iframe
          key={activeChartTab}
          src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_mobile&symbol=${getSymbolForTradingView(activeChartTab)}&interval=5&hidesidetoolbar=0&hidetoptoolbar=0&symboledit=1&saveimage=1&toolbarbg=0d0d0d&studies=[]&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&showpopupbutton=1&studies_overrides={}&overrides={}&enabled_features=["left_toolbar","header_widget","drawing_templates"]&disabled_features=["hide_left_toolbar_by_default"]&locale=en&utm_source=localhost&utm_medium=widget_new&utm_campaign=chart&hide_side_toolbar=0`}
          style={{ width: '100%', height: '100%', border: 'none' }}
          allowFullScreen
          title="TradingView Chart"
        />
      </div>

      {/* Compact Buy/Sell Bar - Fixed at bottom above nav */}
      <div 
        className="bg-dark-800 border-t border-gray-800 shrink-0" 
        style={{ paddingBottom: '64px' }}
      >
        {/* Swipe indicator - tap to open full panel */}
        <div 
          className="flex justify-center pt-2 pb-1 cursor-pointer"
          onClick={() => {
            const inst = instruments.find(i => i.symbol === activeChartTab) || { symbol: activeChartTab, category: 'Forex' }
            setSelectedInstrument(inst)
            setShowOrderPanel(true)
          }}
        >
          <div className="w-10 h-1 bg-gray-600 rounded-full" />
        </div>
        
        <div className="flex items-center justify-between px-3 py-1">
          <div className="text-center">
            <p className="text-gray-500 text-[10px]">Bid</p>
            <p className="text-red-500 font-semibold text-sm">{getPrice(activeChartTab).bid?.toFixed(decimals) || '-'}</p>
          </div>
          
          {/* Lot Size Selector */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setVolume(prev => Math.max(0.01, parseFloat(prev) - 0.01).toFixed(2))}
              className="w-7 h-7 bg-dark-700 rounded-lg flex items-center justify-center"
            >
              <Minus size={14} className="text-white" />
            </button>
            <div className="text-center min-w-[60px]">
              <p className="text-gray-500 text-[10px]">Lot Size</p>
              <p className="text-white font-semibold text-sm">{volume}</p>
            </div>
            <button
              onClick={() => setVolume(prev => (parseFloat(prev) + 0.01).toFixed(2))}
              className="w-7 h-7 bg-dark-700 rounded-lg flex items-center justify-center"
            >
              <Plus size={14} className="text-white" />
            </button>
          </div>
          
          <div className="text-center">
            <p className="text-gray-500 text-[10px]">Ask</p>
            <p className="text-green-500 font-semibold text-sm">{getPrice(activeChartTab).ask?.toFixed(decimals) || '-'}</p>
          </div>
        </div>
        
        <div className="flex gap-2 px-3 pb-2">
          <button
            onClick={async () => {
              if (!selectedAccount || !user) {
                showNotification('Please select an account first', 'error')
                return
              }
              const price = getPrice(activeChartTab)
              if (!price.bid || !price.ask) {
                showNotification('No price data available', 'error')
                return
              }
              setIsExecuting(true)
              try {
                const res = await fetch(`${API_URL}/trade/open`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: user._id,
                    tradingAccountId: selectedAccount._id,
                    symbol: activeChartTab,
                    segment: instruments.find(i => i.symbol === activeChartTab)?.category || 'Forex',
                    side: 'SELL',
                    orderType: 'MARKET',
                    quantity: parseFloat(volume),
                    bid: price.bid,
                    ask: price.ask,
                    leverage: leverage
                  })
                })
                const data = await res.json()
                if (data.success) {
                  fetchOpenTrades()
                  fetchAccountSummary()
                  showNotification('Sell order executed!', 'success')
                } else {
                  showNotification(data.message || 'Order failed', 'error')
                }
              } catch (err) {
                showNotification('Order failed', 'error')
              }
              setIsExecuting(false)
            }}
            disabled={isExecuting || !selectedAccount}
            className="flex-1 py-3 bg-red-500 text-white font-semibold rounded-xl disabled:opacity-50"
          >
            SELL
          </button>
          <button
            onClick={async () => {
              if (!selectedAccount || !user) {
                showNotification('Please select an account first', 'error')
                return
              }
              const price = getPrice(activeChartTab)
              if (!price.bid || !price.ask) {
                showNotification('No price data available', 'error')
                return
              }
              setIsExecuting(true)
              try {
                const res = await fetch(`${API_URL}/trade/open`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: user._id,
                    tradingAccountId: selectedAccount._id,
                    symbol: activeChartTab,
                    segment: instruments.find(i => i.symbol === activeChartTab)?.category || 'Forex',
                    side: 'BUY',
                    orderType: 'MARKET',
                    quantity: parseFloat(volume),
                    bid: price.bid,
                    ask: price.ask,
                    leverage: leverage
                  })
                })
                const data = await res.json()
                if (data.success) {
                  fetchOpenTrades()
                  fetchAccountSummary()
                  showNotification('Buy order executed!', 'success')
                } else {
                  showNotification(data.message || 'Order failed', 'error')
                }
              } catch (err) {
                showNotification('Order failed', 'error')
              }
              setIsExecuting(false)
            }}
            disabled={isExecuting || !selectedAccount}
            className="flex-1 py-3 bg-blue-500 text-white font-semibold rounded-xl disabled:opacity-50"
          >
            BUY
          </button>
        </div>
      </div>
    </div>
  )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <RefreshCw size={32} className="text-accent-green animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'market' && renderMarket()}
        {activeTab === 'trade' && renderTrade()}
        {activeTab === 'chart' && renderChart()}
      </main>

      {/* Bottom Navigation - Home, Market, Trade, Chart, More */}
      <nav className="fixed bottom-0 left-0 right-0 bg-dark-800 border-t border-gray-800 z-40 safe-area-pb">
        <div className="flex items-center justify-around h-14">
          {[
            { id: 'home', icon: Home, label: 'Home' },
            { id: 'market', icon: BarChart2, label: 'Market' },
            { id: 'trade', icon: TrendingUp, label: 'Trade' },
            { id: 'chart', icon: LineChart, label: 'Chart' },
            { id: 'more', icon: MoreHorizontal, label: 'More' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'more') {
                  setShowMoreMenu(true)
                } else {
                  setActiveTab(item.id)
                }
              }}
              className={`flex flex-col items-center justify-center flex-1 h-full ${
                activeTab === item.id ? 'text-accent-green' : 'text-gray-500'
              }`}
            >
              <item.icon size={20} />
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Order Panel Slide-up */}
      {showOrderPanel && selectedInstrument && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowOrderPanel(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-dark-800 rounded-t-3xl animate-slide-up max-h-[80vh] overflow-auto">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-600 rounded-full" />
            </div>
            
            <div className="px-4 pb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-white font-semibold text-lg">{selectedInstrument.symbol}</h3>
                  <p className="text-gray-500 text-sm">{selectedInstrument.name}</p>
                </div>
                <button onClick={() => setShowOrderPanel(false)} className="p-2">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              {/* Leverage Selector */}
              <div className="flex items-center justify-between bg-dark-700 rounded-lg px-4 py-2 mb-4">
                <span className="text-gray-400 text-sm">Leverage</span>
                <select
                  value={leverage}
                  onChange={(e) => setLeverage(e.target.value)}
                  className="bg-transparent text-yellow-500 font-bold text-sm focus:outline-none cursor-pointer"
                >
                  {(() => {
                    const maxLev = parseInt((selectedAccount?.leverage || '1:100').replace('1:', '')) || 100
                    const options = [10, 20, 50, 100, 200, 500, 1000, 2000].filter(l => l <= maxLev)
                    if (!options.includes(maxLev)) options.push(maxLev)
                    return options.sort((a, b) => a - b).map(l => (
                      <option key={l} value={`1:${l}`} className="bg-dark-800 text-white">1:{l}</option>
                    ))
                  })()}
                </select>
              </div>

              {/* One-Click Buy/Sell */}
              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => { setOrderSide('SELL'); executeOrder() }}
                  disabled={isExecuting}
                  className="flex-1 py-3 bg-red-600 rounded-xl disabled:opacity-50"
                >
                  <p className="text-white text-xs">SELL</p>
                  <p className="text-white text-lg font-bold">
                    {getPrice(selectedInstrument.symbol).bid?.toFixed(selectedInstrument.category === 'Forex' ? 5 : 2) || '-'}
                  </p>
                </button>
                <button
                  onClick={() => { setOrderSide('BUY'); executeOrder() }}
                  disabled={isExecuting}
                  className="flex-1 py-3 bg-blue-600 rounded-xl disabled:opacity-50"
                >
                  <p className="text-white text-xs">BUY</p>
                  <p className="text-white text-lg font-bold">
                    {getPrice(selectedInstrument.symbol).ask?.toFixed(selectedInstrument.category === 'Forex' ? 5 : 2) || '-'}
                  </p>
                </button>
              </div>

              {/* Prices Info */}
              <div className="flex items-center justify-center mb-4 text-xs">
                <span className="text-gray-500">Spread: </span>
                <span className="text-white ml-1">
                  {((getPrice(selectedInstrument.symbol).ask - getPrice(selectedInstrument.symbol).bid) * (selectedInstrument.category === 'Forex' ? 10000 : 1)).toFixed(1)} pips
                </span>
              </div>

              {/* Order Type */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setOrderType('market')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                    orderType === 'market' ? 'bg-accent-green text-black' : 'bg-dark-700 text-gray-400'
                  }`}
                >
                  Market
                </button>
                <button
                  onClick={() => setOrderType('pending')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                    orderType === 'pending' ? 'bg-accent-green text-black' : 'bg-dark-700 text-gray-400'
                  }`}
                >
                  Pending
                </button>
              </div>

              {/* Pending Order Type Selection */}
              {orderType === 'pending' && (
                <div className="mb-4">
                  <label className="text-gray-400 text-sm mb-2 block">Order Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['BUY_LIMIT', 'SELL_LIMIT', 'BUY_STOP', 'SELL_STOP'].map(type => (
                      <button
                        key={type}
                        onClick={() => setPendingOrderType(type)}
                        className={`py-2.5 rounded-lg text-xs font-medium transition-colors ${
                          pendingOrderType === type
                            ? type.includes('BUY') 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-red-600 text-white'
                            : type.includes('BUY')
                              ? 'bg-dark-700 border border-blue-500/30 text-blue-400'
                              : 'bg-dark-700 border border-red-500/30 text-red-400'
                        }`}
                      >
                        {type.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Entry Price for Pending Orders */}
              {orderType === 'pending' && (
                <div className="mb-4">
                  <label className="text-gray-400 text-sm mb-2 block">Entry Price</label>
                  <input
                    type="text"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                    placeholder="Enter price"
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white"
                  />
                </div>
              )}

              {/* Volume */}
              <div className="mb-4">
                <label className="text-gray-400 text-sm mb-2 block">Volume (Lots)</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setVolume(prev => Math.max(0.01, parseFloat(prev) - 0.01).toFixed(2))}
                    className="p-3 bg-dark-700 rounded-lg"
                  >
                    <Minus size={18} className="text-white" />
                  </button>
                  <input
                    type="text"
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    className="flex-1 bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white text-center"
                  />
                  <button
                    onClick={() => setVolume(prev => (parseFloat(prev) + 0.01).toFixed(2))}
                    className="p-3 bg-dark-700 rounded-lg"
                  >
                    <Plus size={18} className="text-white" />
                  </button>
                </div>
              </div>

              {/* SL/TP */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Stop Loss</label>
                  <input
                    type="text"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    placeholder="Optional"
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Take Profit</label>
                  <input
                    type="text"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    placeholder="Optional"
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white"
                  />
                </div>
              </div>

              {/* Buy/Sell Buttons for Market Orders */}
              {orderType === 'market' ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => { setOrderSide('SELL'); executeOrder() }}
                    disabled={isExecuting}
                    className="flex-1 py-4 bg-red-500 text-white font-semibold rounded-xl disabled:opacity-50"
                  >
                    {isExecuting ? 'Executing...' : 'SELL'}
                  </button>
                  <button
                    onClick={() => { setOrderSide('BUY'); executeOrder() }}
                    disabled={isExecuting}
                    className="flex-1 py-4 bg-blue-500 text-white font-semibold rounded-xl disabled:opacity-50"
                  >
                    {isExecuting ? 'Executing...' : 'BUY'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={executeOrder}
                  disabled={isExecuting}
                  className={`w-full py-4 font-semibold rounded-xl disabled:opacity-50 ${
                    pendingOrderType.includes('BUY') 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-red-600 text-white'
                  }`}
                >
                  {isExecuting ? 'Placing...' : `Place ${pendingOrderType.replace('_', ' ')}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* More Menu */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowMoreMenu(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-dark-800 rounded-t-3xl animate-slide-up">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-600 rounded-full" />
            </div>
            
            <div className="px-4 pb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-lg">More</h3>
                <button onClick={() => setShowMoreMenu(false)} className="p-2">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
              
              <div className="space-y-1">
                {moreMenuItems.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => { 
                      if (item.action) {
                        item.action()
                      } else {
                        navigate(item.path)
                      }
                      setShowMoreMenu(false) 
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-dark-700"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-dark-700 rounded-full flex items-center justify-center">
                        <item.icon size={20} className="text-accent-green" />
                      </div>
                      <span className="text-white font-medium">{item.name}</span>
                    </div>
                    <ChevronRight size={20} className="text-gray-500" />
                  </button>
                ))}
                
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-red-500/10 mt-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                      <LogOut size={20} className="text-red-500" />
                    </div>
                    <span className="text-red-500 font-medium">Log Out</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* iOS-Style Modify SL/TP Modal */}
      {showModifyModal && selectedTradeForModify && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => setShowModifyModal(false)}>
          <div className="w-full bg-[#1c1c1e] rounded-t-3xl overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-600 rounded-full" />
            </div>
            
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-700/50 text-center">
              <h3 className="text-white font-semibold text-lg">Modify Trade</h3>
              <p className="text-gray-400 text-sm mt-1">
                {selectedTradeForModify.symbol} • {selectedTradeForModify.side} • {selectedTradeForModify.quantity} lots
              </p>
            </div>
            
            {/* Content */}
            <div className="p-4 space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Stop Loss</label>
                <input
                  type="number"
                  value={modifySL}
                  onChange={(e) => setModifySL(e.target.value)}
                  placeholder="Enter stop loss price"
                  step="0.00001"
                  className="w-full bg-[#2c2c2e] border border-gray-600 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Take Profit</label>
                <input
                  type="number"
                  value={modifyTP}
                  onChange={(e) => setModifyTP(e.target.value)}
                  placeholder="Enter take profit price"
                  step="0.00001"
                  className="w-full bg-[#2c2c2e] border border-gray-600 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-green-500 transition-colors"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-gray-700/50">
              <button
                onClick={handleModifyTrade}
                disabled={isModifying}
                className="w-full py-4 text-blue-500 font-semibold text-lg border-b border-gray-700/50 disabled:opacity-50"
              >
                {isModifying ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setShowModifyModal(false)}
                className="w-full py-4 text-gray-400 font-medium text-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS-Style Notifications */}
      <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none">
        {notifications.map((notification, index) => (
          <div
            key={notification.id}
            className="pointer-events-auto mx-4 mt-4 animate-slide-down"
            style={{ marginTop: `${index * 60 + 16}px` }}
          >
            <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl backdrop-blur-xl shadow-lg ${
              notification.type === 'success' 
                ? 'bg-green-500/90' 
                : notification.type === 'error' 
                  ? 'bg-red-500/90' 
                  : 'bg-gray-800/90'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                notification.type === 'success' ? 'bg-white/20' : 'bg-white/20'
              }`}>
                {notification.type === 'success' ? (
                  <Check size={18} className="text-white" />
                ) : (
                  <X size={18} className="text-white" />
                )}
              </div>
              <p className="text-white font-medium text-sm flex-1">{notification.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MobileTradingApp
