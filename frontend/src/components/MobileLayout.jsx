import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  Home, 
  BarChart2, 
  TrendingUp, 
  LineChart, 
  MoreHorizontal,
  Copy,
  Users,
  HelpCircle,
  FileText,
  UserCircle,
  LogOut,
  Wallet,
  X,
  ChevronRight
} from 'lucide-react'

const MobileLayout = ({ children, activeTab = 'home' }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/user/login')
  }

  const moreMenuItems = [
    { name: 'Wallet', icon: Wallet, path: '/wallet' },
    { name: 'Copy Trade', icon: Copy, path: '/copytrade' },
    { name: 'IB Program', icon: Users, path: '/ib' },
    { name: 'Profile', icon: UserCircle, path: '/profile' },
    { name: 'Support', icon: HelpCircle, path: '/support' },
    { name: 'Instructions', icon: FileText, path: '/instructions' },
  ]

  // Only show mobile layout on mobile devices
  if (!isMobile) {
    return children
  }

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-16">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-dark-800 border-t border-gray-800 z-40">
        <div className="flex items-center justify-around h-16">
          <button
            onClick={() => navigate('/dashboard')}
            className={`flex flex-col items-center justify-center flex-1 h-full ${
              activeTab === 'home' ? 'text-accent-green' : 'text-gray-500'
            }`}
          >
            <Home size={22} />
            <span className="text-[10px] mt-1">Home</span>
          </button>
          
          <button
            onClick={() => navigate('/account')}
            className={`flex flex-col items-center justify-center flex-1 h-full ${
              activeTab === 'market' ? 'text-accent-green' : 'text-gray-500'
            }`}
          >
            <BarChart2 size={22} />
            <span className="text-[10px] mt-1">Market</span>
          </button>
          
          <button
            onClick={() => {
              const user = JSON.parse(localStorage.getItem('user') || '{}')
              // Navigate to first trading account or account page
              navigate('/account')
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full ${
              activeTab === 'trade' ? 'text-accent-green' : 'text-gray-500'
            }`}
          >
            <TrendingUp size={22} />
            <span className="text-[10px] mt-1">Trade</span>
          </button>
          
          <button
            onClick={() => navigate('/account')}
            className={`flex flex-col items-center justify-center flex-1 h-full ${
              activeTab === 'chart' ? 'text-accent-green' : 'text-gray-500'
            }`}
          >
            <LineChart size={22} />
            <span className="text-[10px] mt-1">Chart</span>
          </button>
          
          <button
            onClick={() => setShowMoreMenu(true)}
            className={`flex flex-col items-center justify-center flex-1 h-full ${
              activeTab === 'more' ? 'text-accent-green' : 'text-gray-500'
            }`}
          >
            <MoreHorizontal size={22} />
            <span className="text-[10px] mt-1">More</span>
          </button>
        </div>
      </nav>

      {/* More Menu Slide-up */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMoreMenu(false)}
          />
          
          {/* Menu */}
          <div className="absolute bottom-0 left-0 right-0 bg-dark-800 rounded-t-3xl animate-slide-up">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-600 rounded-full" />
            </div>
            
            <div className="px-4 pb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-lg">More</h3>
                <button 
                  onClick={() => setShowMoreMenu(false)}
                  className="p-2 hover:bg-dark-700 rounded-full"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
              
              <div className="space-y-1">
                {moreMenuItems.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => {
                      navigate(item.path)
                      setShowMoreMenu(false)
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-dark-700 transition-colors"
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
                
                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-red-500/10 transition-colors mt-4"
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
    </div>
  )
}

export default MobileLayout
