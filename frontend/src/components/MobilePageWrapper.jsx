import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Home } from 'lucide-react'

const MobilePageWrapper = ({ children, title, showBackButton = true }) => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 bg-dark-800 border-b border-gray-800 px-4 py-3 flex items-center gap-4">
        {showBackButton && (
          <button
            onClick={() => navigate('/mobile')}
            className="p-2 -ml-2 hover:bg-dark-700 rounded-lg"
          >
            <ArrowLeft size={22} className="text-white" />
          </button>
        )}
        <h1 className="text-white font-semibold text-lg flex-1">{title}</h1>
        <button
          onClick={() => navigate('/mobile')}
          className="p-2 hover:bg-dark-700 rounded-lg"
        >
          <Home size={20} className="text-gray-400" />
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

export default MobilePageWrapper
