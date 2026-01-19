import WebSocket from 'ws'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

class MetaApiService {
  constructor() {
    this.ws = null
    this.accountId = process.env.METAAPI_ACCOUNT_ID
    this.token = process.env.METAAPI_TOKEN
    this.priceCache = new Map()
    this.subscribers = new Set()
    this.reconnectTimer = null
    this.heartbeatTimer = null
    this.isConnected = false
    this.io = null
    
    // AllTick WebSocket for real-time streaming
    this.alltickToken = process.env.ALLTICK_API_TOKEN || '1b2b3ad1b5c8c28b9d956652ecb4111d-c-app'
    this.alltickWs = null
    this.alltickConnected = false
    this.alltickReconnectAttempts = 0
    this.maxReconnectAttempts = 10
    
    // Symbol mapping for AllTick
    this.alltickSymbolMap = {
      'XAUUSD': 'GOLD', 'XAGUSD': 'Silver',
      'BTCUSD': 'BTCUSDT', 'ETHUSD': 'ETHUSDT'
    }
    
    // Rate limiting - for fallback polling
    this.requestQueue = []
    this.isProcessingQueue = false
    this.lastRequestTime = 0
    this.minRequestInterval = 200
    this.rateLimitBackoff = 1
    this.batchSize = 5
    
    // Active symbols tracking
    this.activeSymbols = new Set()
    this.symbolLastRequested = new Map()
    
    console.log('MetaAPI: Token loaded:', this.token ? 'YES' : 'NO')
    console.log('MetaAPI: Account ID loaded:', this.accountId ? 'YES' : 'NO')
    console.log('AllTick: Token loaded:', this.alltickToken ? 'YES' : 'NO')
  }

  setSocketIO(io) {
    this.io = io
  }

  connect() {
    if (!this.token || !this.accountId) {
      console.error('MetaAPI: Missing METAAPI_TOKEN or METAAPI_ACCOUNT_ID in environment')
    }

    console.log('Starting real-time price streaming...')
    this.isConnected = true
    
    // Use fast HTTP polling (AllTick WebSocket has subscription limits)
    this.startFallbackPolling()
  }

  // AllTick WebSocket connection for instant real-time prices
  connectAllTickWebSocket() {
    if (this.alltickWs && this.alltickWs.readyState === WebSocket.OPEN) {
      return
    }

    const wsUrl = `wss://quote.alltick.co/quote-b-ws-api?token=${this.alltickToken}`
    console.log('AllTick: Connecting to WebSocket for real-time prices...')
    
    this.alltickWs = new WebSocket(wsUrl)
    
    this.alltickWs.on('open', () => {
      console.log('AllTick: WebSocket connected - instant price updates enabled!')
      this.alltickConnected = true
      this.alltickReconnectAttempts = 0
      
      // Subscribe to all symbols
      this.subscribeAllTickSymbols()
      
      // Start heartbeat to keep connection alive
      this.startAllTickHeartbeat()
    })
    
    this.alltickWs.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString())
        // Log all messages for debugging
        if (message.cmd_id === 22999) {
          console.log(`AllTick: Price update for ${message.data?.code}`)
        } else {
          console.log('AllTick: Received message cmd_id:', message.cmd_id, message.ret !== undefined ? `ret: ${message.ret}` : '')
        }
        this.handleAllTickMessage(message)
      } catch (e) {
        console.error('AllTick: Parse error:', e.message)
      }
    })
    
    this.alltickWs.on('error', (error) => {
      console.error('AllTick: WebSocket error:', error.message)
    })
    
    this.alltickWs.on('close', () => {
      console.log('AllTick: WebSocket disconnected')
      this.alltickConnected = false
      this.stopAllTickHeartbeat()
      
      // Attempt reconnection
      if (this.alltickReconnectAttempts < this.maxReconnectAttempts) {
        this.alltickReconnectAttempts++
        const delay = Math.min(1000 * this.alltickReconnectAttempts, 10000)
        console.log(`AllTick: Reconnecting in ${delay}ms (attempt ${this.alltickReconnectAttempts})`)
        setTimeout(() => this.connectAllTickWebSocket(), delay)
      }
    })
  }

  subscribeAllTickSymbols() {
    if (!this.alltickWs || this.alltickWs.readyState !== WebSocket.OPEN) return
    
    const symbols = this.getDefaultSymbols()
    const symbolList = symbols.map(symbol => ({
      code: this.alltickSymbolMap[symbol] || symbol,
      depth_level: 1
    }))
    
    const subscribeMsg = {
      cmd_id: 22002,
      seq_id: Date.now(),
      trace: `sub-${Date.now()}`,
      data: {
        symbol_list: symbolList
      }
    }
    
    this.alltickWs.send(JSON.stringify(subscribeMsg))
    console.log(`AllTick: Subscribed to ${symbols.length} symbols for instant updates`)
  }

  handleAllTickMessage(message) {
    // Handle price push (protocol 22999)
    if (message.cmd_id === 22999 && message.data) {
      const data = message.data
      const alltickCode = data.code
      
      // Convert AllTick code back to our symbol
      let symbol = alltickCode
      for (const [ourSymbol, alltickSymbol] of Object.entries(this.alltickSymbolMap)) {
        if (alltickSymbol === alltickCode) {
          symbol = ourSymbol
          break
        }
      }
      
      // Extract bid/ask prices
      const bid = data.bids?.[0]?.price ? parseFloat(data.bids[0].price) : null
      const ask = data.asks?.[0]?.price ? parseFloat(data.asks[0].price) : null
      
      if (bid && ask) {
        const price = { bid, ask, time: Date.now() }
        this.priceCache.set(symbol, price)
        
        // Emit instant update to all subscribers
        if (this.io && this.subscribers.size > 0) {
          this.io.to('prices').emit('priceStream', {
            prices: this.getAllPrices(),
            updated: { [symbol]: price },
            timestamp: Date.now()
          })
        }
      }
    }
    
    // Handle subscription response (protocol 22003)
    if (message.cmd_id === 22003) {
      console.log('AllTick: Subscription confirmed')
    }
  }

  startAllTickHeartbeat() {
    this.stopAllTickHeartbeat()
    
    // Send heartbeat every 10 seconds to keep connection alive
    this.alltickHeartbeatTimer = setInterval(() => {
      if (this.alltickWs && this.alltickWs.readyState === WebSocket.OPEN) {
        const heartbeat = {
          cmd_id: 22000,
          seq_id: Date.now(),
          trace: `hb-${Date.now()}`,
          data: {}
        }
        this.alltickWs.send(JSON.stringify(heartbeat))
      }
    }, 10000)
  }

  stopAllTickHeartbeat() {
    if (this.alltickHeartbeatTimer) {
      clearInterval(this.alltickHeartbeatTimer)
      this.alltickHeartbeatTimer = null
    }
  }

  // Fast polling as primary price source
  startFallbackPolling() {
    this.pollIndex = 0
    this.pollSymbols = this.getDefaultSymbols()
    this.batchSize = 8 // Fetch 8 symbols per batch for faster updates
    
    // Poll every 500ms for near real-time updates
    this.pollTimer = setInterval(() => {
      this.pollNextBatch()
    }, 500)
    
    // Initial fetch immediately
    this.pollNextBatch()
    
    console.log(`MetaAPI: Fast polling ${this.pollSymbols.length} symbols (batch of ${this.batchSize} every 500ms)`)
  }

  async pollNextBatch() {
    if (this.rateLimitBackoff > 1) {
      this.rateLimitBackoff = Math.max(1, this.rateLimitBackoff - 0.5)
      return
    }
    
    // Get next batch of symbols
    const batch = []
    for (let i = 0; i < this.batchSize; i++) {
      batch.push(this.pollSymbols[this.pollIndex])
      this.pollIndex = (this.pollIndex + 1) % this.pollSymbols.length
    }
    
    // Fetch all symbols in batch concurrently
    const results = await Promise.allSettled(
      batch.map(symbol => this.fetchPriceWithRateLimit(symbol))
    )
    
    const updated = {}
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        updated[batch[index]] = result.value
      }
    })
    
    // Emit updates if we have subscribers and got prices
    if (Object.keys(updated).length > 0 && this.io && this.subscribers.size > 0) {
      this.io.to('prices').emit('priceStream', {
        prices: this.getAllPrices(),
        updated,
        timestamp: Date.now()
      })
    }
  }

  // Fetch price using AllTick HTTP API (faster, no rate limits)
  async fetchPriceWithRateLimit(symbol) {
    try {
      this.lastRequestTime = Date.now()
      this.symbolLastRequested.set(symbol, Date.now())
      
      // Use AllTick API for faster updates
      const alltickCode = this.alltickSymbolMap[symbol] || symbol
      const query = {
        trace: `poll-${Date.now()}`,
        data: { symbol_list: [{ code: alltickCode }] }
      }
      const encodedQuery = encodeURIComponent(JSON.stringify(query))
      const url = `https://quote.alltick.co/quote-b-api/depth-tick?token=${this.alltickToken}&query=${encodedQuery}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        // Fallback to MetaAPI if AllTick fails
        return this.fetchPriceFromMetaApi(symbol)
      }
      
      const data = await response.json()
      if (data.ret === 200 && data.data?.tick_list?.[0]) {
        const tick = data.data.tick_list[0]
        const bid = tick.bids?.[0]?.price ? parseFloat(tick.bids[0].price) : null
        const ask = tick.asks?.[0]?.price ? parseFloat(tick.asks[0].price) : null
        
        if (bid && ask) {
          const price = { bid, ask, time: Date.now() }
          this.priceCache.set(symbol, price)
          return price
        }
      }
      
      // Fallback to MetaAPI
      return this.fetchPriceFromMetaApi(symbol)
    } catch (error) {
      // Fallback to MetaAPI on error
      return this.fetchPriceFromMetaApi(symbol)
    }
  }
  
  // Fallback to MetaAPI
  async fetchPriceFromMetaApi(symbol) {
    try {
      const url = `https://mt-client-api-v1.london.agiliumtrade.ai/users/current/accounts/${this.accountId}/symbols/${symbol}/current-price`
      const response = await fetch(url, {
        headers: { 'auth-token': this.token }
      })
      
      if (response.status === 429) {
        this.rateLimitBackoff = Math.min(this.rateLimitBackoff + 2, 10)
        return null
      }
      
      if (!response.ok) return null
      
      const data = await response.json()
      if (data.bid && data.ask) {
        const price = { bid: data.bid, ask: data.ask, time: Date.now() }
        this.priceCache.set(symbol, price)
        return price
      }
      return null
    } catch (error) {
      return null
    }
  }
  
  // Returns cached price or null
  async fetchPriceQuiet(symbol) {
    return this.priceCache.get(symbol) || null
  }

  disconnect() {
    // Disconnect AllTick WebSocket
    if (this.alltickWs) {
      this.stopAllTickHeartbeat()
      this.alltickWs.close()
      this.alltickWs = null
      this.alltickConnected = false
    }
    
    // Stop fallback polling
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    this.isConnected = false
  }

  addSubscriber(socketId) {
    this.subscribers.add(socketId)
  }

  removeSubscriber(socketId) {
    this.subscribers.delete(socketId)
  }

  getPrice(symbol) {
    return this.priceCache.get(symbol)
  }

  getAllPrices() {
    return Object.fromEntries(this.priceCache)
  }

  getPriceCache() {
    return this.priceCache
  }

  // Get price via REST API (fallback)
  async fetchPrice(symbol) {
    try {
      const url = `https://mt-client-api-v1.london.agiliumtrade.ai/users/current/accounts/${this.accountId}/symbols/${symbol}/current-price`
      const response = await fetch(url, {
        headers: {
          'auth-token': this.token
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      if (data.bid && data.ask) {
        const price = { bid: data.bid, ask: data.ask, time: Date.now() }
        this.priceCache.set(symbol, price)
        return price
      }
      return null
    } catch (error) {
      console.error(`MetaAPI: Error fetching price for ${symbol}:`, error.message)
      return null
    }
  }

  // Fetch multiple prices via REST API
  async fetchBatchPrices(symbols) {
    const prices = {}
    
    // Check cache first
    const now = Date.now()
    const missingSymbols = []
    
    for (const symbol of symbols) {
      const cached = this.priceCache.get(symbol)
      if (cached && (now - cached.time) < 5000) {
        prices[symbol] = cached
      } else {
        missingSymbols.push(symbol)
      }
    }
    
    // Fetch missing prices in parallel (limit concurrency)
    const BATCH_SIZE = 10
    for (let i = 0; i < missingSymbols.length; i += BATCH_SIZE) {
      const batch = missingSymbols.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map(symbol => this.fetchPrice(symbol))
      )
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          prices[batch[index]] = result.value
        }
      })
    }
    
    return prices
  }

  // Get available symbols from MetaAPI
  async getSymbols() {
    try {
      const url = `https://mt-client-api-v1.london.agiliumtrade.ai/users/current/accounts/${this.accountId}/symbols`
      const response = await fetch(url, {
        headers: {
          'auth-token': this.token
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const symbols = await response.json()
      return symbols
    } catch (error) {
      console.error('MetaAPI: Error fetching symbols:', error.message)
      return this.getDefaultSymbols()
    }
  }

  // Get symbol specification
  async getSymbolSpecification(symbol) {
    try {
      const url = `https://mt-client-api-v1.london.agiliumtrade.ai/users/current/accounts/${this.accountId}/symbols/${symbol}/specification`
      const response = await fetch(url, {
        headers: {
          'auth-token': this.token
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error(`MetaAPI: Error fetching specification for ${symbol}:`, error.message)
      return null
    }
  }

  getDefaultSymbols() {
    return [
      // Forex Majors
      'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD',
      // Forex Crosses
      'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'EURAUD', 'EURCAD', 'GBPAUD',
      'AUDCAD', 'AUDJPY', 'CADJPY', 'CHFJPY', 'NZDJPY',
      // Metals
      'XAUUSD', 'XAGUSD',
      // Crypto
      'BTCUSD', 'ETHUSD'
    ]
  }
}

// Singleton instance
const metaApiService = new MetaApiService()

export default metaApiService
