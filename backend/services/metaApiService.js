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
    
    // Rate limiting - request queue
    this.requestQueue = []
    this.isProcessingQueue = false
    this.lastRequestTime = 0
    this.minRequestInterval = 1000 // 1 second between requests (1 req/sec to be safe)
    this.rateLimitBackoff = 1
    
    // Active symbols tracking - poll these more frequently
    this.activeSymbols = new Set()
    this.symbolLastRequested = new Map()
    
    console.log('MetaAPI: Token loaded:', this.token ? 'YES' : 'NO')
    console.log('MetaAPI: Account ID loaded:', this.accountId ? 'YES' : 'NO')
  }

  setSocketIO(io) {
    this.io = io
  }

  connect() {
    if (!this.token || !this.accountId) {
      console.error('MetaAPI: Missing METAAPI_TOKEN or METAAPI_ACCOUNT_ID in environment')
      return
    }

    console.log('MetaAPI: Starting optimized price polling...')
    this.isConnected = true
    this.startPricePolling()
  }

  startPricePolling() {
    // Single polling loop - fetch one symbol at a time with proper delays
    this.pollIndex = 0
    this.pollSymbols = this.getDefaultSymbols()
    
    // Poll one symbol every 5 seconds (12 requests per minute = very conservative)
    this.pollTimer = setInterval(() => {
      this.pollNextSymbol()
    }, 5000)
    
    // Initial fetch after 10 seconds to let any rate limits clear
    setTimeout(() => this.pollNextSymbol(), 10000)
    
    console.log(`MetaAPI: Will poll ${this.pollSymbols.length} symbols (one every 5 seconds)`)
  }

  async pollNextSymbol() {
    if (this.rateLimitBackoff > 1) {
      // If we're in backoff, wait longer
      console.log(`MetaAPI: In backoff mode (${this.rateLimitBackoff}x), skipping poll`)
      this.rateLimitBackoff = Math.max(1, this.rateLimitBackoff - 0.5)
      return
    }
    
    const symbol = this.pollSymbols[this.pollIndex]
    this.pollIndex = (this.pollIndex + 1) % this.pollSymbols.length
    
    const price = await this.fetchPriceWithRateLimit(symbol)
    
    if (price && this.io && this.subscribers.size > 0) {
      this.io.to('prices').emit('priceUpdate', { symbol, price })
      this.io.to('prices').emit('priceStream', {
        prices: this.getAllPrices(),
        updated: { [symbol]: price },
        timestamp: Date.now()
      })
    }
  }

  // Fetch price with rate limit handling
  async fetchPriceWithRateLimit(symbol) {
    try {
      this.lastRequestTime = Date.now()
      this.symbolLastRequested.set(symbol, Date.now())
      
      const url = `https://mt-client-api-v1.london.agiliumtrade.ai/users/current/accounts/${this.accountId}/symbols/${symbol}/current-price`
      const response = await fetch(url, {
        headers: { 'auth-token': this.token }
      })
      
      if (response.status === 429) {
        // Rate limited - increase backoff significantly
        this.rateLimitBackoff = Math.min(this.rateLimitBackoff + 2, 10)
        console.log(`MetaAPI: Rate limited on ${symbol}, backoff now ${this.rateLimitBackoff}x`)
        return null
      }
      
      if (!response.ok) {
        console.log(`MetaAPI: Error fetching ${symbol}: HTTP ${response.status}`)
        return null
      }
      
      const data = await response.json()
      if (data.bid && data.ask) {
        const price = { bid: data.bid, ask: data.ask, time: Date.now() }
        this.priceCache.set(symbol, price)
        return price
      }
      return null
    } catch (error) {
      console.log(`MetaAPI: Error fetching ${symbol}:`, error.message)
      return null
    }
  }
  
  // Returns cached price or null
  async fetchPriceQuiet(symbol) {
    return this.priceCache.get(symbol) || null
  }

  disconnect() {
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
