import mongoose from 'mongoose'

const themeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  colors: {
    // Primary colors
    primary: { type: String, default: '#3B82F6' },        // Blue
    primaryHover: { type: String, default: '#2563EB' },
    secondary: { type: String, default: '#10B981' },      // Green
    secondaryHover: { type: String, default: '#059669' },
    
    // Accent colors
    accent: { type: String, default: '#F59E0B' },         // Amber/Gold
    accentHover: { type: String, default: '#D97706' },
    
    // Background colors
    bgPrimary: { type: String, default: '#000000' },      // Black
    bgSecondary: { type: String, default: '#0D0D0D' },    // Dark gray
    bgCard: { type: String, default: '#1A1A1A' },         // Card background
    bgHover: { type: String, default: '#262626' },        // Hover state
    
    // Text colors
    textPrimary: { type: String, default: '#FFFFFF' },    // White
    textSecondary: { type: String, default: '#9CA3AF' },  // Gray
    textMuted: { type: String, default: '#6B7280' },      // Muted gray
    
    // Border colors
    border: { type: String, default: '#374151' },         // Gray border
    borderLight: { type: String, default: '#4B5563' },
    
    // Status colors
    success: { type: String, default: '#10B981' },        // Green
    error: { type: String, default: '#EF4444' },          // Red
    warning: { type: String, default: '#F59E0B' },        // Yellow
    info: { type: String, default: '#3B82F6' },           // Blue
    
    // Trading colors
    buyColor: { type: String, default: '#3B82F6' },       // Blue for buy
    sellColor: { type: String, default: '#EF4444' },      // Red for sell
    profitColor: { type: String, default: '#10B981' },    // Green for profit
    lossColor: { type: String, default: '#EF4444' },      // Red for loss
    
    // Sidebar colors
    sidebarBg: { type: String, default: '#0D0D0D' },
    sidebarText: { type: String, default: '#9CA3AF' },
    sidebarActive: { type: String, default: '#3B82F6' },
    
    // Button colors
    buttonPrimary: { type: String, default: '#3B82F6' },
    buttonSecondary: { type: String, default: '#374151' },
    buttonDanger: { type: String, default: '#EF4444' }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
})

// Ensure only one theme is active at a time
themeSchema.pre('save', async function(next) {
  if (this.isActive) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { isActive: false }
    )
  }
  next()
})

// Static method to get active theme
themeSchema.statics.getActiveTheme = async function() {
  let theme = await this.findOne({ isActive: true })
  if (!theme) {
    // Return default theme if none active
    theme = await this.findOne({ name: 'Default Blue' })
    if (!theme) {
      // Create default theme
      theme = await this.create({
        name: 'Default Blue',
        isActive: true
      })
    }
  }
  return theme
}

export default mongoose.model('Theme', themeSchema)
