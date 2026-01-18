import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cron from 'node-cron'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import accountTypesRoutes from './routes/accountTypes.js'
import tradingAccountsRoutes from './routes/tradingAccounts.js'
import walletRoutes from './routes/wallet.js'
import paymentMethodsRoutes from './routes/paymentMethods.js'
import tradeRoutes from './routes/trade.js'
import walletTransferRoutes from './routes/walletTransfer.js'
import adminTradeRoutes from './routes/adminTrade.js'
import copyTradingRoutes from './routes/copyTrading.js'
import ibRoutes from './routes/ibNew.js'
import propTradingRoutes from './routes/propTrading.js'
import chargesRoutes from './routes/charges.js'
import pricesRoutes from './routes/prices.js'
import earningsRoutes from './routes/earnings.js'
import supportRoutes from './routes/support.js'
import kycRoutes from './routes/kyc.js'
import themeRoutes from './routes/theme.js'
import adminManagementRoutes from './routes/adminManagement.js'
import uploadRoutes from './routes/upload.js'
import emailTemplatesRoutes from './routes/emailTemplates.js'
import bonusRoutes from './routes/bonus.js'
import path from 'path'
import { fileURLToPath } from 'url'
import copyTradingEngine from './services/copyTradingEngine.js'
import tradeEngine from './services/tradeEngine.js'
import metaApiService from './services/metaApiService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app = express()
const httpServer = createServer(app)

// Socket.IO for real-time updates
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

// Store connected clients
const connectedClients = new Map()
const priceSubscribers = new Set()

// Initialize MetaAPI service with Socket.IO
metaApiService.setSocketIO(io)

// Background price streaming via MetaAPI
async function streamPrices() {
  if (priceSubscribers.size === 0) return
  
  const now = Date.now()
  const priceCache = metaApiService.getPriceCache()
  
  // Broadcast the full cache periodically
  io.to('prices').emit('priceStream', {
    prices: Object.fromEntries(priceCache),
    updated: {},
    timestamp: now
  })
}

// Start price streaming interval (1 second)
setInterval(streamPrices, 1000)

// Connect MetaAPI WebSocket on startup
metaApiService.connect()

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  // Subscribe to real-time price stream
  socket.on('subscribePrices', () => {
    socket.join('prices')
    priceSubscribers.add(socket.id)
    metaApiService.addSubscriber(socket.id)
    // Send current prices immediately
    socket.emit('priceStream', {
      prices: metaApiService.getAllPrices(),
      updated: {},
      timestamp: Date.now()
    })
    console.log(`Socket ${socket.id} subscribed to price stream`)
  })

  // Unsubscribe from price stream
  socket.on('unsubscribePrices', () => {
    socket.leave('prices')
    priceSubscribers.delete(socket.id)
    metaApiService.removeSubscriber(socket.id)
  })

  // Subscribe to account updates
  socket.on('subscribe', (data) => {
    const { tradingAccountId } = data
    if (tradingAccountId) {
      socket.join(`account:${tradingAccountId}`)
      connectedClients.set(socket.id, tradingAccountId)
      console.log(`Socket ${socket.id} subscribed to account ${tradingAccountId}`)
    }
  })

  // Unsubscribe from account updates
  socket.on('unsubscribe', (data) => {
    const { tradingAccountId } = data
    if (tradingAccountId) {
      socket.leave(`account:${tradingAccountId}`)
      connectedClients.delete(socket.id)
    }
  })

  // Handle price updates from client (for PnL calculation)
  socket.on('priceUpdate', async (data) => {
    const { tradingAccountId, prices } = data
    if (tradingAccountId && prices) {
      // Broadcast updated account summary to all subscribers
      io.to(`account:${tradingAccountId}`).emit('accountUpdate', {
        tradingAccountId,
        prices,
        timestamp: Date.now()
      })
    }
  })

  socket.on('disconnect', () => {
    connectedClients.delete(socket.id)
    priceSubscribers.delete(socket.id)
    metaApiService.removeSubscriber(socket.id)
    console.log('Client disconnected:', socket.id)
  })
})

// Make io accessible to routes
app.set('io', io)

// Middleware
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/account-types', accountTypesRoutes)
app.use('/api/trading-accounts', tradingAccountsRoutes)
app.use('/api/wallet', walletRoutes)
app.use('/api/payment-methods', paymentMethodsRoutes)
app.use('/api/trade', tradeRoutes)
app.use('/api/wallet-transfer', walletTransferRoutes)
app.use('/api/admin/trade', adminTradeRoutes)
app.use('/api/copy', copyTradingRoutes)
app.use('/api/ib', ibRoutes)
app.use('/api/prop', propTradingRoutes)
app.use('/api/charges', chargesRoutes)
app.use('/api/prices', pricesRoutes)
app.use('/api/earnings', earningsRoutes)
app.use('/api/support', supportRoutes)
app.use('/api/kyc', kycRoutes)
app.use('/api/theme', themeRoutes)
app.use('/api/admin-mgmt', adminManagementRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/email-templates', emailTemplatesRoutes)
app.use('/api/bonus', bonusRoutes)

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Pipxacpital API is running' })
})

const PORT = process.env.PORT || 5000
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  
  // Schedule daily commission calculation for copy trading
  // Runs at 11:59 PM every day (end of trading day)
  cron.schedule('59 23 * * *', async () => {
    console.log('[CRON] Running daily copy trade commission calculation...')
    try {
      const results = await copyTradingEngine.calculateDailyCommission()
      console.log(`[CRON] Daily commission calculated: ${results.length} commission records processed`)
    } catch (error) {
      console.error('[CRON] Error calculating daily commission:', error)
    }
  }, {
    timezone: 'UTC'
  })
  console.log('[CRON] Daily commission calculation scheduled for 23:59 UTC')
  
  // Schedule daily swap application for all open trades
  // Runs at 10:00 PM UTC (5:00 PM EST - forex rollover time)
  cron.schedule('0 22 * * *', async () => {
    console.log('[CRON] Applying daily swap to all open trades...')
    try {
      await tradeEngine.applySwap()
      console.log('[CRON] Swap applied successfully')
    } catch (error) {
      console.error('[CRON] Error applying swap:', error)
    }
  }, {
    timezone: 'UTC'
  })
  console.log('[CRON] Daily swap application scheduled for 22:00 UTC')
})
