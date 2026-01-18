import express from 'express'
import Theme from '../models/Theme.js'

const router = express.Router()

// Preset themes for quick selection
const PRESET_THEMES = [
  {
    name: 'Default Blue',
    colors: {
      primary: '#3B82F6', primaryHover: '#2563EB',
      secondary: '#10B981', secondaryHover: '#059669',
      accent: '#3B82F6', accentHover: '#2563EB',
      bgPrimary: '#000000', bgSecondary: '#0D0D0D', bgCard: '#1A1A1A', bgHover: '#262626',
      textPrimary: '#FFFFFF', textSecondary: '#9CA3AF', textMuted: '#6B7280',
      border: '#374151', borderLight: '#4B5563',
      success: '#10B981', error: '#EF4444', warning: '#F59E0B', info: '#3B82F6',
      buyColor: '#3B82F6', sellColor: '#EF4444', profitColor: '#10B981', lossColor: '#EF4444',
      sidebarBg: '#0D0D0D', sidebarText: '#9CA3AF', sidebarActive: '#3B82F6',
      buttonPrimary: '#3B82F6', buttonSecondary: '#374151', buttonDanger: '#EF4444'
    }
  },
  {
    name: 'Gold & Black',
    colors: {
      primary: '#F59E0B', primaryHover: '#D97706',
      secondary: '#FCD34D', secondaryHover: '#FBBF24',
      accent: '#F59E0B', accentHover: '#D97706',
      bgPrimary: '#000000', bgSecondary: '#0A0A0A', bgCard: '#141414', bgHover: '#1F1F1F',
      textPrimary: '#FFFFFF', textSecondary: '#D4AF37', textMuted: '#8B7355',
      border: '#3D3D3D', borderLight: '#4D4D4D',
      success: '#10B981', error: '#EF4444', warning: '#F59E0B', info: '#F59E0B',
      buyColor: '#F59E0B', sellColor: '#EF4444', profitColor: '#10B981', lossColor: '#EF4444',
      sidebarBg: '#0A0A0A', sidebarText: '#D4AF37', sidebarActive: '#F59E0B',
      buttonPrimary: '#F59E0B', buttonSecondary: '#3D3D3D', buttonDanger: '#EF4444'
    }
  },
  {
    name: 'Red & Black',
    colors: {
      primary: '#EF4444', primaryHover: '#DC2626',
      secondary: '#F87171', secondaryHover: '#EF4444',
      accent: '#EF4444', accentHover: '#DC2626',
      bgPrimary: '#000000', bgSecondary: '#0D0D0D', bgCard: '#1A1A1A', bgHover: '#262626',
      textPrimary: '#FFFFFF', textSecondary: '#FCA5A5', textMuted: '#9CA3AF',
      border: '#374151', borderLight: '#4B5563',
      success: '#10B981', error: '#EF4444', warning: '#F59E0B', info: '#EF4444',
      buyColor: '#3B82F6', sellColor: '#EF4444', profitColor: '#10B981', lossColor: '#EF4444',
      sidebarBg: '#0D0D0D', sidebarText: '#FCA5A5', sidebarActive: '#EF4444',
      buttonPrimary: '#EF4444', buttonSecondary: '#374151', buttonDanger: '#DC2626'
    }
  },
  {
    name: 'Grey & Black',
    colors: {
      primary: '#6B7280', primaryHover: '#4B5563',
      secondary: '#9CA3AF', secondaryHover: '#6B7280',
      accent: '#9CA3AF', accentHover: '#6B7280',
      bgPrimary: '#000000', bgSecondary: '#111111', bgCard: '#1C1C1C', bgHover: '#2A2A2A',
      textPrimary: '#FFFFFF', textSecondary: '#D1D5DB', textMuted: '#9CA3AF',
      border: '#4B5563', borderLight: '#6B7280',
      success: '#10B981', error: '#EF4444', warning: '#F59E0B', info: '#6B7280',
      buyColor: '#3B82F6', sellColor: '#EF4444', profitColor: '#10B981', lossColor: '#EF4444',
      sidebarBg: '#111111', sidebarText: '#D1D5DB', sidebarActive: '#9CA3AF',
      buttonPrimary: '#6B7280', buttonSecondary: '#4B5563', buttonDanger: '#EF4444'
    }
  },
  {
    name: 'Yellow & Black',
    colors: {
      primary: '#FBBF24', primaryHover: '#F59E0B',
      secondary: '#FCD34D', secondaryHover: '#FBBF24',
      accent: '#FBBF24', accentHover: '#F59E0B',
      bgPrimary: '#000000', bgSecondary: '#0D0D0D', bgCard: '#1A1A1A', bgHover: '#262626',
      textPrimary: '#FFFFFF', textSecondary: '#FDE68A', textMuted: '#9CA3AF',
      border: '#374151', borderLight: '#4B5563',
      success: '#10B981', error: '#EF4444', warning: '#FBBF24', info: '#FBBF24',
      buyColor: '#3B82F6', sellColor: '#EF4444', profitColor: '#10B981', lossColor: '#EF4444',
      sidebarBg: '#0D0D0D', sidebarText: '#FDE68A', sidebarActive: '#FBBF24',
      buttonPrimary: '#FBBF24', buttonSecondary: '#374151', buttonDanger: '#EF4444'
    }
  },
  {
    name: 'Purple & Black',
    colors: {
      primary: '#8B5CF6', primaryHover: '#7C3AED',
      secondary: '#A78BFA', secondaryHover: '#8B5CF6',
      accent: '#8B5CF6', accentHover: '#7C3AED',
      bgPrimary: '#000000', bgSecondary: '#0D0D0D', bgCard: '#1A1A1A', bgHover: '#262626',
      textPrimary: '#FFFFFF', textSecondary: '#C4B5FD', textMuted: '#9CA3AF',
      border: '#374151', borderLight: '#4B5563',
      success: '#10B981', error: '#EF4444', warning: '#F59E0B', info: '#8B5CF6',
      buyColor: '#3B82F6', sellColor: '#EF4444', profitColor: '#10B981', lossColor: '#EF4444',
      sidebarBg: '#0D0D0D', sidebarText: '#C4B5FD', sidebarActive: '#8B5CF6',
      buttonPrimary: '#8B5CF6', buttonSecondary: '#374151', buttonDanger: '#EF4444'
    }
  },
  {
    name: 'Cyan & Black',
    colors: {
      primary: '#06B6D4', primaryHover: '#0891B2',
      secondary: '#22D3EE', secondaryHover: '#06B6D4',
      accent: '#06B6D4', accentHover: '#0891B2',
      bgPrimary: '#000000', bgSecondary: '#0D0D0D', bgCard: '#1A1A1A', bgHover: '#262626',
      textPrimary: '#FFFFFF', textSecondary: '#67E8F9', textMuted: '#9CA3AF',
      border: '#374151', borderLight: '#4B5563',
      success: '#10B981', error: '#EF4444', warning: '#F59E0B', info: '#06B6D4',
      buyColor: '#06B6D4', sellColor: '#EF4444', profitColor: '#10B981', lossColor: '#EF4444',
      sidebarBg: '#0D0D0D', sidebarText: '#67E8F9', sidebarActive: '#06B6D4',
      buttonPrimary: '#06B6D4', buttonSecondary: '#374151', buttonDanger: '#EF4444'
    }
  },
  {
    name: 'Green & Black',
    colors: {
      primary: '#10B981', primaryHover: '#059669',
      secondary: '#34D399', secondaryHover: '#10B981',
      accent: '#10B981', accentHover: '#059669',
      bgPrimary: '#000000', bgSecondary: '#0D0D0D', bgCard: '#1A1A1A', bgHover: '#262626',
      textPrimary: '#FFFFFF', textSecondary: '#6EE7B7', textMuted: '#9CA3AF',
      border: '#374151', borderLight: '#4B5563',
      success: '#10B981', error: '#EF4444', warning: '#F59E0B', info: '#10B981',
      buyColor: '#3B82F6', sellColor: '#EF4444', profitColor: '#10B981', lossColor: '#EF4444',
      sidebarBg: '#0D0D0D', sidebarText: '#6EE7B7', sidebarActive: '#10B981',
      buttonPrimary: '#10B981', buttonSecondary: '#374151', buttonDanger: '#EF4444'
    }
  }
]

// GET /api/theme/active - Get active theme for user dashboard
router.get('/active', async (req, res) => {
  try {
    const theme = await Theme.getActiveTheme()
    res.json({ success: true, theme })
  } catch (error) {
    console.error('Error fetching active theme:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/theme/all - Get all themes (admin)
router.get('/all', async (req, res) => {
  try {
    const themes = await Theme.find().sort({ createdAt: -1 })
    res.json({ success: true, themes })
  } catch (error) {
    console.error('Error fetching themes:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/theme/presets - Get preset themes
router.get('/presets', async (req, res) => {
  try {
    res.json({ success: true, presets: PRESET_THEMES })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/theme/create - Create new theme
router.post('/create', async (req, res) => {
  try {
    const { name, colors, isActive } = req.body
    
    if (!name) {
      return res.status(400).json({ success: false, message: 'Theme name is required' })
    }

    const existingTheme = await Theme.findOne({ name })
    if (existingTheme) {
      return res.status(400).json({ success: false, message: 'Theme with this name already exists' })
    }

    const theme = await Theme.create({
      name,
      colors: colors || {},
      isActive: isActive || false
    })

    res.json({ success: true, message: 'Theme created successfully', theme })
  } catch (error) {
    console.error('Error creating theme:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/theme/apply-preset - Apply a preset theme
router.post('/apply-preset', async (req, res) => {
  try {
    const { presetName } = req.body
    
    const preset = PRESET_THEMES.find(p => p.name === presetName)
    if (!preset) {
      return res.status(404).json({ success: false, message: 'Preset not found' })
    }

    // Check if theme exists, update it; otherwise create
    let theme = await Theme.findOne({ name: preset.name })
    if (theme) {
      theme.colors = preset.colors
      theme.isActive = true
      await theme.save()
    } else {
      theme = await Theme.create({
        name: preset.name,
        colors: preset.colors,
        isActive: true
      })
    }

    res.json({ success: true, message: `${preset.name} theme applied`, theme })
  } catch (error) {
    console.error('Error applying preset:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/theme/:id - Update theme
router.put('/:id', async (req, res) => {
  try {
    const { name, colors, isActive } = req.body
    
    const theme = await Theme.findById(req.params.id)
    if (!theme) {
      return res.status(404).json({ success: false, message: 'Theme not found' })
    }

    if (name) theme.name = name
    if (colors) theme.colors = { ...theme.colors, ...colors }
    if (typeof isActive === 'boolean') theme.isActive = isActive

    await theme.save()

    res.json({ success: true, message: 'Theme updated successfully', theme })
  } catch (error) {
    console.error('Error updating theme:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/theme/:id/activate - Activate a theme
router.put('/:id/activate', async (req, res) => {
  try {
    const theme = await Theme.findById(req.params.id)
    if (!theme) {
      return res.status(404).json({ success: false, message: 'Theme not found' })
    }

    theme.isActive = true
    await theme.save()

    res.json({ success: true, message: `${theme.name} is now active`, theme })
  } catch (error) {
    console.error('Error activating theme:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// DELETE /api/theme/:id - Delete theme
router.delete('/:id', async (req, res) => {
  try {
    const theme = await Theme.findById(req.params.id)
    if (!theme) {
      return res.status(404).json({ success: false, message: 'Theme not found' })
    }

    if (theme.isActive) {
      return res.status(400).json({ success: false, message: 'Cannot delete active theme. Activate another theme first.' })
    }

    await Theme.findByIdAndDelete(req.params.id)
    res.json({ success: true, message: 'Theme deleted successfully' })
  } catch (error) {
    console.error('Error deleting theme:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/theme/init - Initialize default themes
router.post('/init', async (req, res) => {
  try {
    const existingCount = await Theme.countDocuments()
    if (existingCount > 0) {
      return res.json({ success: true, message: 'Themes already initialized' })
    }

    // Create default theme
    await Theme.create({
      name: 'Default Blue',
      colors: PRESET_THEMES[0].colors,
      isActive: true
    })

    res.json({ success: true, message: 'Default theme initialized' })
  } catch (error) {
    console.error('Error initializing themes:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
