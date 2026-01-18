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

    // Use REST API polling instead of WebSocket for simplicity
    console.log('MetaAPI: Starting price polling...')
    this.isConnected = true
    this.startPricePolling()
  }

  startPricePolling() {
    // Poll prices every 5 seconds to avoid rate limits
    this.pollPrices()
    this.pollingTimer = setInterval(() => {
      this.pollPrices()
    }, 5000)
  }

  async pollPrices() {
    const symbols = this.getDefaultSymbols()
    let fetchedCount = 0
    
    // Fetch one symbol at a time with delay to avoid rate limits
    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i]
      try {
        const price = await this.fetchPriceQuiet(symbol)
        if (price) {
          fetchedCount++
          if (this.io && this.subscribers.size > 0) {
            this.io.to('prices').emit('priceUpdate', { symbol, price })
          }
        }
      } catch (e) {
        // Ignore individual symbol errors
      }
      
      // Add 500ms delay between requests to avoid rate limiting
      if (i < symbols.length - 1) {
        await new Promise(r => setTimeout(r, 500))
      }
    }
    
    if (fetchedCount > 0) {
      console.log(`MetaAPI: Fetched ${fetchedCount}/${symbols.length} prices`)
    }
    
    // Broadcast full price stream
    if (this.io && this.subscribers.size > 0) {
      this.io.to('prices').emit('priceStream', {
        prices: this.getAllPrices(),
        updated: {},
        timestamp: Date.now()
      })
    }
  }
  
  // Quiet version that doesn't log errors (for polling)
  async fetchPriceQuiet(symbol) {
    try {
      const url = `https://mt-client-api-v1.london.agiliumtrade.ai/users/current/accounts/${this.accountId}/symbols/${symbol}/current-price`
      const response = await fetch(url, {
        headers: {
          'auth-token': this.token
        }
      })
      
      if (!response.ok) {
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
      return null
    }
  }

  disconnect() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer)
      this.pollingTimer = null
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
