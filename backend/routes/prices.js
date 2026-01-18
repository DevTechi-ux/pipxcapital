import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import metaApiService from '../services/metaApiService.js'

const router = express.Router()

// Popular instruments per category (shown by default)
const POPULAR_INSTRUMENTS = {
  Forex: ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD', 'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'EURAUD', 'AUDCAD', 'AUDJPY', 'CADJPY'],
  Metals: ['XAUUSD', 'XAGUSD'],
  Crypto: ['BTCUSD', 'ETHUSD']
}

// Helper function to categorize symbols
function categorizeSymbol(symbol) {
  if (!symbol) return 'Forex'
  const s = symbol.toUpperCase()
  if (s.includes('XAU') || s.includes('XAG') || s.includes('XPT') || s.includes('XPD')) {
    return 'Metals'
  }
  if (s.includes('OIL') || s.includes('BRENT') || s.includes('WTI') || s.includes('NGAS') || s.includes('COPPER')) {
    return 'Commodities'
  }
  if (s.includes('BTC') || s.includes('ETH') || s.includes('CRYPTO')) {
    return 'Crypto'
  }
  return 'Forex'
}

// Default instruments fallback
function getDefaultInstruments() {
  return [
    { symbol: 'EURUSD', name: 'EUR/USD', category: 'Forex', digits: 5 },
    { symbol: 'GBPUSD', name: 'GBP/USD', category: 'Forex', digits: 5 },
    { symbol: 'USDJPY', name: 'USD/JPY', category: 'Forex', digits: 3 },
    { symbol: 'USDCHF', name: 'USD/CHF', category: 'Forex', digits: 5 },
    { symbol: 'AUDUSD', name: 'AUD/USD', category: 'Forex', digits: 5 },
    { symbol: 'NZDUSD', name: 'NZD/USD', category: 'Forex', digits: 5 },
    { symbol: 'USDCAD', name: 'USD/CAD', category: 'Forex', digits: 5 },
    { symbol: 'EURGBP', name: 'EUR/GBP', category: 'Forex', digits: 5 },
    { symbol: 'EURJPY', name: 'EUR/JPY', category: 'Forex', digits: 3 },
    { symbol: 'GBPJPY', name: 'GBP/JPY', category: 'Forex', digits: 3 },
    { symbol: 'XAUUSD', name: 'Gold', category: 'Metals', digits: 2 },
    { symbol: 'XAGUSD', name: 'Silver', category: 'Metals', digits: 3 },
    { symbol: 'BTCUSD', name: 'Bitcoin', category: 'Crypto', digits: 2 },
    { symbol: 'ETHUSD', name: 'Ethereum', category: 'Crypto', digits: 2 },
  ]
}

// GET /api/prices/instruments - Get all available instruments (MUST be before /:symbol)
router.get('/instruments', async (req, res) => {
  try {
    console.log('Fetching instruments from MetaAPI...')
    
    // Try to get symbols from MetaAPI
    const metaSymbols = await metaApiService.getSymbols()
    
    if (metaSymbols && metaSymbols.length > 0) {
      const instruments = metaSymbols.map(symbol => {
        const symbolName = typeof symbol === 'string' ? symbol : symbol.symbol
        const category = categorizeSymbol(symbolName)
        const isPopular = POPULAR_INSTRUMENTS[category]?.includes(symbolName) || false
        return {
          symbol: symbolName,
          name: getInstrumentName(symbolName),
          category,
          digits: getDigits(symbolName),
          contractSize: getContractSize(symbolName),
          minVolume: 0.01,
          maxVolume: 100,
          volumeStep: 0.01,
          popular: isPopular
        }
      })
      
      console.log('Returning', instruments.length, 'MetaAPI instruments')
      res.json({ success: true, instruments })
    } else {
      console.log('Using default instruments')
      res.json({ success: true, instruments: getDefaultInstruments() })
    }
  } catch (error) {
    console.error('Error fetching instruments:', error)
    res.json({ success: true, instruments: getDefaultInstruments() })
  }
})

// Helper to get instrument display name
function getInstrumentName(symbol) {
  const names = {
    // Forex Majors & Crosses
    'EURUSD': 'EUR/USD', 'GBPUSD': 'GBP/USD', 'USDJPY': 'USD/JPY', 'USDCHF': 'USD/CHF',
    'AUDUSD': 'AUD/USD', 'NZDUSD': 'NZD/USD', 'USDCAD': 'USD/CAD', 'EURGBP': 'EUR/GBP',
    'EURJPY': 'EUR/JPY', 'GBPJPY': 'GBP/JPY', 'EURCHF': 'EUR/CHF', 'EURAUD': 'EUR/AUD',
    'EURCAD': 'EUR/CAD', 'GBPAUD': 'GBP/AUD', 'GBPCAD': 'GBP/CAD', 'AUDCAD': 'AUD/CAD',
    'AUDJPY': 'AUD/JPY', 'CADJPY': 'CAD/JPY', 'CHFJPY': 'CHF/JPY', 'NZDJPY': 'NZD/JPY',
    'AUDNZD': 'AUD/NZD', 'CADCHF': 'CAD/CHF', 'GBPCHF': 'GBP/CHF', 'GBPNZD': 'GBP/NZD',
    'EURNZD': 'EUR/NZD', 'NZDCAD': 'NZD/CAD', 'NZDCHF': 'NZD/CHF', 'AUDCHF': 'AUD/CHF',
    'EURSGD': 'EUR/SGD', 'USDSGD': 'USD/SGD', 'GBPSGD': 'GBP/SGD', 'AUDSGD': 'AUD/SGD',
    'SGDJPY': 'SGD/JPY', 'USDHKD': 'USD/HKD', 'USDZAR': 'USD/ZAR', 'EURZAR': 'EUR/ZAR',
    'GBPZAR': 'GBP/ZAR', 'ZARJPY': 'ZAR/JPY', 'USDTRY': 'USD/TRY', 'EURTRY': 'EUR/TRY',
    'TRYJPY': 'TRY/JPY', 'USDMXN': 'USD/MXN', 'EURMXN': 'EUR/MXN', 'MXNJPY': 'MXN/JPY',
    'USDPLN': 'USD/PLN', 'EURPLN': 'EUR/PLN', 'GBPPLN': 'GBP/PLN', 'USDSEK': 'USD/SEK',
    'EURSEK': 'EUR/SEK', 'GBPSEK': 'GBP/SEK', 'SEKJPY': 'SEK/JPY', 'USDNOK': 'USD/NOK',
    'EURNOK': 'EUR/NOK', 'GBPNOK': 'GBP/NOK', 'NOKJPY': 'NOK/JPY', 'USDDKK': 'USD/DKK',
    'EURDKK': 'EUR/DKK', 'DKKJPY': 'DKK/JPY', 'USDCNH': 'USD/CNH', 'CNHJPY': 'CNH/JPY',
    'USDHUF': 'USD/HUF', 'EURHUF': 'EUR/HUF', 'USDCZK': 'USD/CZK', 'EURCZK': 'EUR/CZK',
    // Metals
    'XAUUSD': 'Gold', 'XAGUSD': 'Silver', 'XPTUSD': 'Platinum', 'XPDUSD': 'Palladium',
    // Commodities
    'USOIL': 'US Oil', 'UKOIL': 'UK Oil', 'NGAS': 'Natural Gas', 'COPPER': 'Copper',
    'ALUMINUM': 'Aluminum', 'NICKEL': 'Nickel',
    // Crypto
    'BTCUSD': 'Bitcoin', 'ETHUSD': 'Ethereum', 'BNBUSD': 'BNB', 'SOLUSD': 'Solana',
    'XRPUSD': 'XRP', 'ADAUSD': 'Cardano', 'DOGEUSD': 'Dogecoin', 'TRXUSD': 'TRON',
    'LINKUSD': 'Chainlink', 'MATICUSD': 'Polygon', 'DOTUSD': 'Polkadot',
    'SHIBUSD': 'Shiba Inu', 'LTCUSD': 'Litecoin', 'BCHUSD': 'Bitcoin Cash', 'AVAXUSD': 'Avalanche',
    'XLMUSD': 'Stellar', 'UNIUSD': 'Uniswap', 'ATOMUSD': 'Cosmos', 'ETCUSD': 'Ethereum Classic',
    'FILUSD': 'Filecoin', 'ICPUSD': 'Internet Computer', 'VETUSD': 'VeChain',
    'NEARUSD': 'NEAR Protocol', 'GRTUSD': 'The Graph', 'AAVEUSD': 'Aave', 'MKRUSD': 'Maker',
    'ALGOUSD': 'Algorand', 'FTMUSD': 'Fantom', 'SANDUSD': 'The Sandbox', 'MANAUSD': 'Decentraland',
    'AXSUSD': 'Axie Infinity', 'THETAUSD': 'Theta Network', 'XMRUSD': 'Monero', 'FLOWUSD': 'Flow',
    'SNXUSD': 'Synthetix', 'EOSUSD': 'EOS', 'CHZUSD': 'Chiliz', 'ENJUSD': 'Enjin Coin',
    'ZILUSD': 'Zilliqa', 'BATUSD': 'Basic Attention Token', 'CRVUSD': 'Curve DAO', 'COMPUSD': 'Compound',
    'SUSHIUSD': 'SushiSwap', 'ZRXUSD': '0x', 'LRCUSD': 'Loopring', 'ANKRUSD': 'Ankr',
    'GALAUSD': 'Gala', 'APEUSD': 'ApeCoin', 'WAVESUSD': 'Waves', 'ZECUSD': 'Zcash',
    // More crypto names
    'PEPEUSD': 'Pepe', 'ARBUSD': 'Arbitrum', 'OPUSD': 'Optimism', 'SUIUSD': 'Sui',
    'APTUSD': 'Aptos', 'INJUSD': 'Injective', 'LDOUSD': 'Lido DAO', 'IMXUSD': 'Immutable X',
    'RUNEUSD': 'THORChain', 'KAVAUSD': 'Kava', 'KSMUSD': 'Kusama', 'NEOUSD': 'NEO',
    'QNTUSD': 'Quant', 'FETUSD': 'Fetch.ai', 'RNDRUSD': 'Render', 'OCEANUSD': 'Ocean Protocol',
    'WLDUSD': 'Worldcoin', 'SEIUSD': 'Sei', 'TIAUSD': 'Celestia', 'BLURUSD': 'Blur',
    'ROSEUSD': 'Oasis Network', 'MINAUSD': 'Mina Protocol', 'GMXUSD': 'GMX', 'DYDXUSD': 'dYdX',
    'STXUSD': 'Stacks', 'CFXUSD': 'Conflux', 'ACHUSD': 'Alchemy Pay', 'DASHUSD': 'Dash',
    'XTZUSD': 'Tezos', 'IOTUSD': 'IOTA', 'CELOUSD': 'Celo', 'ONEUSD': 'Harmony',
    'HOTUSD': 'Holo', 'SKLUSD': 'SKALE', 'STORJUSD': 'Storj', 'YFIUSD': 'yearn.finance',
    'UMAUSD': 'UMA', 'BANDUSD': 'Band Protocol', 'RVNUSD': 'Ravencoin', 'OXTUSD': 'Orchid',
    'NKNUSD': 'NKN', 'WOOUSD': 'WOO Network', 'AABORUSD': 'SingularityNET', 'JASMYUSD': 'JasmyCoin',
    'MASKUSD': 'Mask Network', 'DENTUSD': 'Dent', 'CELRUSD': 'Celer Network', 'COTIUSD': 'COTI',
    'CTSIUSD': 'Cartesi', 'IOTXUSD': 'IoTeX', 'KLAYUSD': 'Klaytn', 'OGNUSD': 'Origin Protocol',
    'RLCUSD': 'iExec RLC', 'STMXUSD': 'StormX', 'SUNUSD': 'Sun Token', 'SXPUSD': 'Solar',
    'WINUSD': 'WINkLink', 'AKROUSD': 'Akropolis', 'AUDIOUSD': 'Audius', 'BELUSD': 'Bella Protocol',
    'BONKUSD': 'Bonk', 'FLOKIUSD': 'Floki', 'JTUSD': 'JTO', 'ORDIUSD': 'ORDI',
    'PENDUSD': 'Pendle', 'RADUSD': 'Radicle', 'RDNTUSD': 'Radiant Capital', 'RPLUSD': 'Rocket Pool',
    'SSVUSD': 'ssv.network', 'WAXUSD': 'WAX', 'XECUSD': 'eCash', 'ZENUSD': 'Horizen',
    '1INCHUSD': '1inch', 'HBARUSD': 'Hedera', 'TONUSD': 'Toncoin', 'EGLDUSDUSD': 'MultiversX'
  }
  return names[symbol] || symbol
}

// Helper to get digits for symbol
function getDigits(symbol) {
  if (!symbol) return 5
  if (symbol.includes('JPY')) return 3
  if (symbol === 'XAUUSD') return 2
  if (symbol === 'XAGUSD') return 3
  if (symbol.includes('BTC') || symbol.includes('ETH')) return 2
  return 5
}

// Helper to get contract size
function getContractSize(symbol) {
  if (!symbol) return 100000
  if (symbol.includes('BTC') || symbol.includes('ETH')) return 1
  if (symbol === 'XAUUSD' || symbol === 'XAGUSD') return 100
  return 100000
}

// GET /api/prices/:symbol - Get single symbol price
router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params
    
    // Try to get from cache first
    let price = metaApiService.getPrice(symbol)
    
    // If not in cache, fetch from MetaAPI
    if (!price) {
      price = await metaApiService.fetchPrice(symbol)
    }
    
    if (price) {
      res.json({ success: true, price })
    } else {
      res.status(404).json({ success: false, message: 'Price not available' })
    }
  } catch (error) {
    console.error('Error fetching price:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/prices/batch - Get multiple symbol prices using MetaAPI
router.post('/batch', async (req, res) => {
  try {
    const { symbols } = req.body
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({ success: false, message: 'symbols array required' })
    }
    
    // Fetch prices from MetaAPI
    const prices = await metaApiService.fetchBatchPrices(symbols)
    
    res.json({ success: true, prices })
  } catch (error) {
    console.error('Error fetching batch prices:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
