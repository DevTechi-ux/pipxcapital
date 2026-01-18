import { createContext, useContext, useState, useEffect } from 'react'
import { API_URL } from '../config/api'

const ThemeContext = createContext()

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Dark mode colors
const darkColors = {
  bgPrimary: '#000000',
  bgSecondary: '#0D0D0D',
  bgCard: '#1A1A1A',
  bgHover: '#262626',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  border: '#374151',
  borderLight: '#4B5563',
}

// Light mode colors
const lightColors = {
  bgPrimary: '#F9FAFB',
  bgSecondary: '#FFFFFF',
  bgCard: '#FFFFFF',
  bgHover: '#F3F4F6',
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#D1D5DB',
}

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved !== null ? JSON.parse(saved) : true // Default to dark mode
  })

  const fetchTheme = async () => {
    try {
      const res = await fetch(`${API_URL}/theme/active`)
      const data = await res.json()
      if (data.success && data.theme) {
        setTheme(data.theme)
        applyTheme(data.theme.colors)
      }
    } catch (error) {
      console.error('Error fetching theme:', error)
    }
    setLoading(false)
  }

  const applyTheme = (colors) => {
    if (!colors) return
    
    const root = document.documentElement
    
    // Apply CSS custom properties
    Object.entries(colors).forEach(([key, value]) => {
      if (value) {
        root.style.setProperty(`--theme-${key}`, value)
      }
    })

    // Also set some commonly used Tailwind-compatible classes
    root.style.setProperty('--color-primary', colors.primary || '#3B82F6')
    root.style.setProperty('--color-secondary', colors.secondary || '#10B981')
    root.style.setProperty('--color-accent', colors.accent || '#F59E0B')
    root.style.setProperty('--color-bg-primary', colors.bgPrimary || '#000000')
    root.style.setProperty('--color-bg-secondary', colors.bgSecondary || '#0D0D0D')
    root.style.setProperty('--color-bg-card', colors.bgCard || '#1A1A1A')
    root.style.setProperty('--color-text-primary', colors.textPrimary || '#FFFFFF')
    root.style.setProperty('--color-text-secondary', colors.textSecondary || '#9CA3AF')
    root.style.setProperty('--color-border', colors.border || '#374151')
    root.style.setProperty('--color-success', colors.success || '#10B981')
    root.style.setProperty('--color-error', colors.error || '#EF4444')
    root.style.setProperty('--color-buy', colors.buyColor || '#3B82F6')
    root.style.setProperty('--color-sell', colors.sellColor || '#EF4444')
    root.style.setProperty('--color-profit', colors.profitColor || '#10B981')
    root.style.setProperty('--color-loss', colors.lossColor || '#EF4444')
  }

  // Apply dark/light mode classes
  useEffect(() => {
    const root = document.documentElement
    const modeColors = isDarkMode ? darkColors : lightColors
    
    // Apply mode-specific colors
    Object.entries(modeColors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value)
    })
    
    // Toggle dark class on html element
    if (isDarkMode) {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }
    
    // Save preference
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode))
  }, [isDarkMode])

  useEffect(() => {
    fetchTheme()
    
    // Refresh theme every 30 seconds to catch admin changes
    const interval = setInterval(fetchTheme, 30000)
    return () => clearInterval(interval)
  }, [])

  const refreshTheme = () => {
    fetchTheme()
  }

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev)
  }

  // Get current mode colors
  const modeColors = isDarkMode ? darkColors : lightColors

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      loading, 
      refreshTheme, 
      applyTheme, 
      isDarkMode, 
      toggleDarkMode,
      modeColors,
      darkColors,
      lightColors
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export default ThemeContext
