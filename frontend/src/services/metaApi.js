// Price Service - uses backend API (AllTick powered)
import { API_URL } from '../config/api'

console.log('Price service initialized - using backend API')

class PriceService {
  constructor() {
    this.ws = null
    this.subscribers = new Map()
    this.prices = new Map()
    this.symbols = []
    this.isConnected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
  }

  async getSymbols() {
    try {
      // Fetch instruments from backend API (AllTick powered)
      const response = await fetch(`${API_URL}/prices/instruments`)
      if (!response.ok) throw new Error('Failed to fetch instruments')
      const data = await response.json()
      if (data.success && data.instruments) {
        this.symbols = data.instruments.map(i => i.symbol)
        return data.instruments
      }
      return []
    } catch (error) {
      console.error('Error fetching symbols:', error)
      return []
    }
  }

  async getSymbolSpecification(symbol) {
    try {
      // Get instrument info from backend
      const response = await fetch(`${API_URL}/prices/instruments`)
      if (!response.ok) throw new Error('Failed to fetch instruments')
      const data = await response.json()
      if (data.success && data.instruments) {
        const instrument = data.instruments.find(i => i.symbol === symbol)
        return instrument || null
      }
      return null
    } catch (error) {
      console.error('Error fetching symbol specification:', error)
      return null
    }
  }

  async getSymbolPrice(symbol) {
    try {
      // Use backend proxy to avoid CORS issues
      const response = await fetch(`${API_URL}/prices/${symbol}`)
      
      if (!response.ok) throw new Error('Failed to fetch symbol price')
      const data = await response.json()
      if (data.success && data.price) {
        this.prices.set(symbol, data.price)
        return data.price
      }
      return null
    } catch (error) {
      console.error('Error fetching symbol price:', error)
      return null
    }
  }

  async getAllPrices(symbolList) {
    try {
      // Use backend batch endpoint to get all prices at once
      const response = await fetch(`${API_URL}/prices/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: symbolList })
      })
      
      if (!response.ok) throw new Error('Failed to fetch prices')
      const data = await response.json()
      
      if (data.success && data.prices) {
        Object.entries(data.prices).forEach(([symbol, price]) => {
          this.prices.set(symbol, price)
        })
        return data.prices
      }
      return {}
    } catch (error) {
      console.error('Error fetching all prices:', error)
      return {}
    }
  }

  connect(symbolsToSubscribe = []) {
    // WebSocket is handled by backend socket.io - this is a no-op for compatibility
    console.log('Price service connect called - prices fetched via backend API')
    this.isConnected = true
  }

  handleMessage(data) {
    if (data.prices) {
      Object.entries(data.prices).forEach(([symbol, price]) => {
        this.prices.set(symbol, price)
        const callback = this.subscribers.get(symbol)
        if (callback) callback(price)
      })
    }
  }

  subscribeToSymbols(symbols) {
    // No-op - backend handles price streaming
  }

  subscribe(symbol, callback) {
    this.subscribers.set(symbol, callback)
  }

  unsubscribe(symbol) {
    this.subscribers.delete(symbol)
  }

  disconnect() {
    this.subscribers.clear()
    this.isConnected = false
  }

  getPrice(symbol) {
    return this.prices.get(symbol)
  }
}

// Singleton instance - named metaApiService for backward compatibility
const metaApiService = new PriceService()

export default metaApiService
