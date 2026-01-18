// Binance API Service for real-time crypto data
class BinanceApiService {
  constructor() {
    this.ws = null
    this.prices = new Map()
    this.subscribers = new Map()
    this.isConnected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
  }

  // Map our symbols to Binance format
  toBinanceSymbol(symbol) {
    const mapping = {
      'BTCUSD': 'btcusdt',
      'ETHUSD': 'ethusdt',
      'LTCUSD': 'ltcusdt',
      'XRPUSD': 'xrpusdt',
      'BCHUSD': 'bchusdt',
      'BNBUSD': 'bnbusdt',
      'ADAUSD': 'adausdt',
      'DOTUSD': 'dotusdt',
      'SOLUSD': 'solusdt',
      'DOGEUSD': 'dogeusdt',
      'MATICUSD': 'maticusdt',
      'AVAXUSD': 'avaxusdt',
      'LINKUSD': 'linkusdt',
      'UNIUSD': 'uniusdt',
      'ATOMUSD': 'atomusdt',
      'XLMUSD': 'xlmusdt',
      'ALGOUSD': 'algousdt',
      'VETUSD': 'vetusdt',
      'ICPUSD': 'icpusdt',
      'FILUSD': 'filusdt',
      'TRXUSD': 'trxusdt',
      'ETCUSD': 'etcusdt',
      'XMRUSD': 'xmrusdt',
      'EOSUSD': 'eosusdt',
      'AAVEUSD': 'aaveusdt',
      'MKRUSD': 'mkrusdt',
      'COMPUSD': 'compusdt',
      'SNXUSD': 'snxusdt',
      'YFIUSD': 'yfiusdt',
      'SUSHIUSD': 'sushiusdt',
      'NEARUSD': 'nearusdt',
      'FTMUSD': 'ftmusdt',
      'SANDUSD': 'sandusdt',
      'MANAUSD': 'manausdt',
      'AXSUSD': 'axsusdt',
      'GALAUSD': 'galausdt',
      'APEUSD': 'apeusdt',
      'GMTUSD': 'gmtusdt',
      'OPUSD': 'opusdt',
      'ARBUSD': 'arbusdt',
      'PEPEUSD': 'pepeusdt',
      'SHIBUSD': 'shibusdt',
    }
    return mapping[symbol] || symbol.toLowerCase().replace('usd', 'usdt')
  }

  // Map Binance symbol back to our format
  fromBinanceSymbol(binanceSymbol) {
    const symbol = binanceSymbol.toUpperCase().replace('USDT', 'USD')
    return symbol
  }

  // Get all crypto symbols we support
  getCryptoSymbols() {
    return [
      { symbol: 'BTCUSD', name: 'Bitcoin', category: 'Crypto' },
      { symbol: 'ETHUSD', name: 'Ethereum', category: 'Crypto' },
      { symbol: 'BNBUSD', name: 'BNB', category: 'Crypto' },
      { symbol: 'SOLUSD', name: 'Solana', category: 'Crypto' },
      { symbol: 'XRPUSD', name: 'XRP', category: 'Crypto' },
      { symbol: 'ADAUSD', name: 'Cardano', category: 'Crypto' },
      { symbol: 'DOGEUSD', name: 'Dogecoin', category: 'Crypto' },
      { symbol: 'DOTUSD', name: 'Polkadot', category: 'Crypto' },
      { symbol: 'MATICUSD', name: 'Polygon', category: 'Crypto' },
      { symbol: 'LTCUSD', name: 'Litecoin', category: 'Crypto' },
      { symbol: 'SHIBUSD', name: 'Shiba Inu', category: 'Crypto' },
      { symbol: 'AVAXUSD', name: 'Avalanche', category: 'Crypto' },
      { symbol: 'LINKUSD', name: 'Chainlink', category: 'Crypto' },
      { symbol: 'UNIUSD', name: 'Uniswap', category: 'Crypto' },
      { symbol: 'ATOMUSD', name: 'Cosmos', category: 'Crypto' },
      { symbol: 'XLMUSD', name: 'Stellar', category: 'Crypto' },
      { symbol: 'NEARUSD', name: 'NEAR Protocol', category: 'Crypto' },
      { symbol: 'FTMUSD', name: 'Fantom', category: 'Crypto' },
      { symbol: 'ALGOUSD', name: 'Algorand', category: 'Crypto' },
      { symbol: 'VETUSD', name: 'VeChain', category: 'Crypto' },
      { symbol: 'ICPUSD', name: 'Internet Computer', category: 'Crypto' },
      { symbol: 'FILUSD', name: 'Filecoin', category: 'Crypto' },
      { symbol: 'TRXUSD', name: 'TRON', category: 'Crypto' },
      { symbol: 'ETCUSD', name: 'Ethereum Classic', category: 'Crypto' },
      { symbol: 'AAVEUSD', name: 'Aave', category: 'Crypto' },
      { symbol: 'SANDUSD', name: 'The Sandbox', category: 'Crypto' },
      { symbol: 'MANAUSD', name: 'Decentraland', category: 'Crypto' },
      { symbol: 'AXSUSD', name: 'Axie Infinity', category: 'Crypto' },
      { symbol: 'APEUSD', name: 'ApeCoin', category: 'Crypto' },
      { symbol: 'ARBUSD', name: 'Arbitrum', category: 'Crypto' },
      { symbol: 'OPUSD', name: 'Optimism', category: 'Crypto' },
      { symbol: 'PEPEUSD', name: 'Pepe', category: 'Crypto' },
    ]
  }

  // Fetch current price for a symbol via REST API
  async getSymbolPrice(symbol) {
    try {
      const binanceSymbol = this.toBinanceSymbol(symbol)
      const response = await fetch(
        `https://api.binance.com/api/v3/ticker/bookTicker?symbol=${binanceSymbol.toUpperCase()}`
      )
      
      if (!response.ok) throw new Error('Failed to fetch price')
      
      const data = await response.json()
      const priceData = {
        bid: parseFloat(data.bidPrice),
        ask: parseFloat(data.askPrice),
        spread: parseFloat(data.askPrice) - parseFloat(data.bidPrice)
      }
      
      this.prices.set(symbol, priceData)
      return priceData
    } catch (error) {
      console.error(`Error fetching ${symbol} price:`, error)
      return null
    }
  }

  // Fetch all crypto prices
  async getAllPrices(symbolList) {
    const prices = {}
    
    try {
      // Use Binance's batch ticker endpoint
      const response = await fetch('https://api.binance.com/api/v3/ticker/bookTicker')
      if (!response.ok) throw new Error('Failed to fetch prices')
      
      const allTickers = await response.json()
      const tickerMap = new Map(allTickers.map(t => [t.symbol.toLowerCase(), t]))
      
      for (const symbol of symbolList) {
        const binanceSymbol = this.toBinanceSymbol(symbol)
        const ticker = tickerMap.get(binanceSymbol)
        
        if (ticker) {
          prices[symbol] = {
            bid: parseFloat(ticker.bidPrice),
            ask: parseFloat(ticker.askPrice),
            spread: parseFloat(ticker.askPrice) - parseFloat(ticker.bidPrice)
          }
          this.prices.set(symbol, prices[symbol])
        }
      }
    } catch (error) {
      console.error('Error fetching all prices:', error)
    }
    
    return prices
  }

  // Connect to Binance WebSocket for real-time updates
  connect(symbolsToSubscribe = []) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return
    }

    if (symbolsToSubscribe.length === 0) return

    // Create stream names for all symbols
    const streams = symbolsToSubscribe
      .map(s => `${this.toBinanceSymbol(s)}@bookTicker`)
      .join('/')

    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`
    
    this.ws = new WebSocket(wsUrl)

    this.ws.onopen = () => {
      console.log('Binance WebSocket connected')
      this.isConnected = true
      this.reconnectAttempts = 0
    }

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        if (message.data) {
          this.handleMessage(message.data)
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    this.ws.onerror = (error) => {
      console.error('Binance WebSocket error:', error)
    }

    this.ws.onclose = () => {
      console.log('Binance WebSocket disconnected')
      this.isConnected = false
      
      // Attempt reconnection
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++
        setTimeout(() => {
          console.log(`Reconnecting to Binance... Attempt ${this.reconnectAttempts}`)
          this.connect(Array.from(this.subscribers.keys()))
        }, 3000 * this.reconnectAttempts)
      }
    }
  }

  handleMessage(data) {
    const symbol = this.fromBinanceSymbol(data.s)
    const priceData = {
      bid: parseFloat(data.b),
      ask: parseFloat(data.a),
      spread: parseFloat(data.a) - parseFloat(data.b),
      time: new Date().toISOString()
    }
    
    this.prices.set(symbol, priceData)
    
    // Notify subscribers
    const callback = this.subscribers.get(symbol)
    if (callback) {
      callback(priceData)
    }
  }

  subscribe(symbol, callback) {
    this.subscribers.set(symbol, callback)
  }

  unsubscribe(symbol) {
    this.subscribers.delete(symbol)
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.subscribers.clear()
    this.isConnected = false
  }

  getPrice(symbol) {
    return this.prices.get(symbol)
  }
}

// Singleton instance
const binanceApiService = new BinanceApiService()

export default binanceApiService
