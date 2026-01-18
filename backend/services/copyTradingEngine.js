import MasterTrader from '../models/MasterTrader.js'
import CopyFollower from '../models/CopyFollower.js'
import CopyTrade from '../models/CopyTrade.js'
import CopyCommission from '../models/CopyCommission.js'
import CopySettings from '../models/CopySettings.js'
import Trade from '../models/Trade.js'
import TradingAccount from '../models/TradingAccount.js'
import Wallet from '../models/Wallet.js'
import tradeEngine from './tradeEngine.js'

class CopyTradingEngine {
  constructor() {
    this.CONTRACT_SIZE = 100000
  }

  // Get today's date string
  getTradingDay() {
    return new Date().toISOString().split('T')[0]
  }

  // Calculate follower lot size based on copy mode
  // Note: BALANCE_BASED, EQUITY_BASED, and MULTIPLIER are calculated in copyTradeToFollowers
  // This function only handles FIXED_LOT mode
  calculateFollowerLotSize(masterLotSize, copyMode, copyValue, maxLotSize = 10) {
    let followerLot
    
    if (copyMode === 'FIXED_LOT') {
      // Use the fixed lot size specified by user
      followerLot = copyValue
      // Apply max lot size limit
      followerLot = Math.min(followerLot, maxLotSize)
      // Round to 2 decimal places
      return Math.round(followerLot * 100) / 100
    }
    
    // For BALANCE_BASED, EQUITY_BASED, MULTIPLIER - return master lot as placeholder
    // Actual calculation happens in copyTradeToFollowers with account data
    return masterLotSize
  }

  // Copy master trade to all active followers
  async copyTradeToFollowers(masterTrade, masterId) {
    const master = await MasterTrader.findById(masterId)
    if (!master || master.status !== 'ACTIVE') {
      console.log(`Master ${masterId} not active, skipping copy`)
      return []
    }

    // Get all active followers for this master
    const followers = await CopyFollower.find({
      masterId: masterId,
      status: 'ACTIVE'
    }).populate('followerAccountId')

    console.log(`[CopyTrade] Found ${followers.length} active followers for master ${masterId}`)

    if (followers.length === 0) {
      console.log(`[CopyTrade] No active followers found for master ${masterId}`)
      return []
    }

    const tradingDay = this.getTradingDay()

    // Process ALL followers in parallel for faster execution
    const copyPromises = followers.map(async (follower) => {
      try {
        console.log(`[CopyTrade] Processing follower ${follower._id}: copyMode=${follower.copyMode}, copyValue=${follower.copyValue}, maxLotSize=${follower.maxLotSize}`)
        
        // Check if already copied for this specific follower (prevent duplicates per follower)
        const existingFollowerCopy = await CopyTrade.findOne({
          masterTradeId: masterTrade._id,
          followerId: follower._id
        })
        
        if (existingFollowerCopy) {
          console.log(`[CopyTrade] Trade already copied for follower ${follower._id}, skipping`)
          return {
            followerId: follower._id,
            status: 'SKIPPED',
            reason: 'Already copied'
          }
        }

        // Calculate follower lot size based on copy mode
        let followerLotSize = this.calculateFollowerLotSize(
          masterTrade.quantity,
          follower.copyMode,
          follower.copyValue,
          follower.maxLotSize
        )
        console.log(`[CopyTrade] Initial lot size from calculateFollowerLotSize: ${followerLotSize}`)

        // Validate follower account
        const followerAccount = await TradingAccount.findById(follower.followerAccountId)
        if (!followerAccount || followerAccount.status !== 'Active') {
          return {
            followerId: follower._id,
            status: 'FAILED',
            reason: 'Account not active'
          }
        }

        // Get master's account for balance/equity comparison
        const masterAccount = await TradingAccount.findById(master.tradingAccountId)
        const masterBalance = masterAccount ? masterAccount.balance : 0
        
        // Calculate master's true equity (balance + credit + unrealized P/L)
        let masterFloatingPnl = 0
        const masterOpenTrades = await Trade.find({ 
          tradingAccountId: master.tradingAccountId, 
          status: 'OPEN' 
        })
        for (const trade of masterOpenTrades) {
          // Use master trade's open price as approximation for current price
          // In real scenario, you'd get live prices
          masterFloatingPnl += trade.currentPnl || 0
        }
        const masterEquity = masterAccount ? (masterAccount.balance + (masterAccount.credit || 0) + masterFloatingPnl) : 0
        
        // Get follower's balance and calculate true equity (balance + credit + unrealized P/L)
        const followerBalance = followerAccount.balance
        let followerFloatingPnl = 0
        const followerOpenTrades = await Trade.find({ 
          tradingAccountId: followerAccount._id, 
          status: 'OPEN' 
        })
        for (const trade of followerOpenTrades) {
          followerFloatingPnl += trade.currentPnl || 0
        }
        const followerEquity = followerAccount.balance + (followerAccount.credit || 0) + followerFloatingPnl

        // BALANCE_BASED MODE: Lot = Master Lot × (Follower Balance / Master Balance)
        if (follower.copyMode === 'BALANCE_BASED') {
          if (masterBalance > 0) {
            const ratio = followerBalance / masterBalance
            followerLotSize = masterTrade.quantity * ratio
            // Round to 2 decimal places and ensure minimum 0.01
            followerLotSize = Math.max(0.01, Math.round(followerLotSize * 100) / 100)
          } else {
            followerLotSize = masterTrade.quantity
          }
          
          // Apply max lot size limit if set by user
          if (follower.maxLotSize && follower.maxLotSize > 0) {
            followerLotSize = Math.min(followerLotSize, follower.maxLotSize)
          }
          
          console.log(`[CopyTrade] BALANCE_BASED: MasterBalance=$${masterBalance.toFixed(2)}, FollowerBalance=$${followerBalance.toFixed(2)}, Ratio=${(followerBalance/masterBalance).toFixed(2)}, MasterLot=${masterTrade.quantity}, FinalLot=${followerLotSize}`)
        }

        // EQUITY_BASED MODE: Lot = Master Lot × (Follower Equity / Master Equity)
        if (follower.copyMode === 'EQUITY_BASED') {
          if (masterEquity > 0) {
            const ratio = followerEquity / masterEquity
            const calculatedLot = masterTrade.quantity * ratio
            // Round to 2 decimal places and ensure minimum 0.01
            followerLotSize = Math.max(0.01, Math.round(calculatedLot * 100) / 100)
            
            console.log(`[CopyTrade] EQUITY_BASED CALCULATION: MasterEquity=$${masterEquity.toFixed(2)}, FollowerEquity=$${followerEquity.toFixed(2)}, Ratio=${ratio.toFixed(4)}, MasterLot=${masterTrade.quantity}, CalculatedLot=${calculatedLot.toFixed(4)}, RoundedLot=${followerLotSize}`)
          } else {
            followerLotSize = masterTrade.quantity
            console.log(`[CopyTrade] EQUITY_BASED: Master equity is 0, using master lot size: ${followerLotSize}`)
          }
          
          // Apply max lot size limit ONLY if explicitly set by user (not default)
          const beforeMaxLimit = followerLotSize
          if (follower.maxLotSize && follower.maxLotSize > 0) {
            followerLotSize = Math.min(followerLotSize, follower.maxLotSize)
          }
          
          console.log(`[CopyTrade] EQUITY_BASED FINAL: BeforeMaxLimit=${beforeMaxLimit}, MaxLotSize=${follower.maxLotSize || 'not set'}, FinalLot=${followerLotSize}`)
        }

        // MULTIPLIER MODE (also handles LOT_MULTIPLIER for backward compatibility): Lot = Master Lot × Multiplier
        if (follower.copyMode === 'MULTIPLIER' || follower.copyMode === 'LOT_MULTIPLIER') {
          const multiplier = follower.multiplier || follower.copyValue || 1
          followerLotSize = masterTrade.quantity * multiplier
          // Round to 2 decimal places and ensure minimum 0.01
          followerLotSize = Math.max(0.01, Math.round(followerLotSize * 100) / 100)
          
          // Apply max lot size limit if set by user
          if (follower.maxLotSize && follower.maxLotSize > 0) {
            followerLotSize = Math.min(followerLotSize, follower.maxLotSize)
          }
          
          console.log(`[CopyTrade] MULTIPLIER: Multiplier=${multiplier}, MasterLot=${masterTrade.quantity}, FinalLot=${followerLotSize}`)
        }

        // AUTO MODE: Same as EQUITY_BASED - Lot = Master Lot × (Follower Equity / Master Equity)
        if (follower.copyMode === 'AUTO') {
          if (masterEquity > 0) {
            const ratio = followerEquity / masterEquity
            const calculatedLot = masterTrade.quantity * ratio
            // Round to 2 decimal places and ensure minimum 0.01
            followerLotSize = Math.max(0.01, Math.round(calculatedLot * 100) / 100)
            
            console.log(`[CopyTrade] AUTO (EQUITY_BASED): MasterEquity=$${masterEquity.toFixed(2)}, FollowerEquity=$${followerEquity.toFixed(2)}, Ratio=${ratio.toFixed(4)}, MasterLot=${masterTrade.quantity}, CalculatedLot=${calculatedLot.toFixed(4)}, RoundedLot=${followerLotSize}`)
          } else {
            followerLotSize = masterTrade.quantity
            console.log(`[CopyTrade] AUTO: Master equity is 0, using master lot size: ${followerLotSize}`)
          }
          
          // Apply max lot size limit if set by user
          const beforeMaxLimit = followerLotSize
          if (follower.maxLotSize && follower.maxLotSize > 0) {
            followerLotSize = Math.min(followerLotSize, follower.maxLotSize)
          }
          
          console.log(`[CopyTrade] AUTO FINAL: BeforeMaxLimit=${beforeMaxLimit}, MaxLotSize=${follower.maxLotSize || 'not set'}, FinalLot=${followerLotSize}`)
        }

        // Check margin
        const contractSize = tradeEngine.getContractSize(masterTrade.symbol)
        const marginRequired = tradeEngine.calculateMargin(
          followerLotSize,
          masterTrade.openPrice,
          followerAccount.leverage,
          contractSize
        )

        // Calculate used margin from existing open trades
        const existingTrades = await Trade.find({ 
          tradingAccountId: followerAccount._id, 
          status: 'OPEN' 
        })
        const usedMargin = existingTrades.reduce((sum, t) => sum + (t.marginUsed || 0), 0)
        const freeMargin = followerAccount.balance + (followerAccount.credit || 0) - usedMargin
        
        if (marginRequired > freeMargin) {
          // Record failed copy trade
          await CopyTrade.create({
            masterTradeId: masterTrade._id,
            masterId: masterId,
            followerTradeId: null,
            followerId: follower._id,
            followerUserId: follower.followerId,
            followerAccountId: follower.followerAccountId,
            symbol: masterTrade.symbol,
            side: masterTrade.side,
            masterLotSize: masterTrade.quantity,
            followerLotSize: followerLotSize,
            copyMode: follower.copyMode,
            copyValue: follower.copyValue,
            masterOpenPrice: masterTrade.openPrice,
            followerOpenPrice: 0,
            status: 'FAILED',
            failureReason: `Insufficient margin`,
            tradingDay
          })
          
          return {
            followerId: follower._id,
            status: 'FAILED',
            reason: `Insufficient margin. Required: $${marginRequired.toFixed(2)}, Available: $${freeMargin.toFixed(2)}`
          }
        }

        // Execute trade for follower
        console.log(`[CopyTrade] Opening trade for follower ${follower._id}: ${followerLotSize} lots ${masterTrade.symbol}`)
        const followerTrade = await tradeEngine.openTrade(
          follower.followerId,
          follower.followerAccountId._id || follower.followerAccountId,
          masterTrade.symbol,
          masterTrade.segment,
          masterTrade.side,
          'MARKET',
          followerLotSize,
          masterTrade.openPrice, // Use master's price as bid
          masterTrade.openPrice, // Use master's price as ask
          masterTrade.stopLoss,
          masterTrade.takeProfit
        )

        // Record successful copy trade
        await CopyTrade.create({
          masterTradeId: masterTrade._id,
          masterId: masterId,
          followerTradeId: followerTrade._id,
          followerId: follower._id,
          followerUserId: follower.followerId,
          followerAccountId: follower.followerAccountId._id || follower.followerAccountId,
          symbol: masterTrade.symbol,
          side: masterTrade.side,
          masterLotSize: masterTrade.quantity,
          followerLotSize: followerLotSize,
          copyMode: follower.copyMode,
          copyValue: follower.copyValue,
          masterOpenPrice: masterTrade.openPrice,
          followerOpenPrice: followerTrade.openPrice,
          status: 'OPEN',
          tradingDay
        })

        // Update follower stats
        follower.stats.totalCopiedTrades += 1
        follower.stats.activeCopiedTrades += 1
        await follower.save()

        // Update master stats
        master.stats.totalCopiedVolume += followerLotSize
        await master.save()

        console.log(`[CopyTrade] SUCCESS: Copied trade to follower ${follower._id}, lot size: ${followerLotSize}`)
        
        return {
          followerId: follower._id,
          status: 'SUCCESS',
          followerTradeId: followerTrade._id,
          lotSize: followerLotSize
        }

      } catch (error) {
        console.error(`[CopyTrade] Error copying trade to follower ${follower._id}:`, error)
        return {
          followerId: follower._id,
          status: 'FAILED',
          reason: error.message
        }
      }
    })

    // Wait for all copy operations to complete
    const copyResults = await Promise.all(copyPromises)
    
    const successCount = copyResults.filter(r => r.status === 'SUCCESS').length
    console.log(`[CopyTrade] Completed: ${successCount}/${followers.length} followers copied successfully`)
    
    return copyResults
  }

  // Mirror SL/TP modification to all follower trades (PARALLEL for speed)
  async mirrorSlTpModification(masterTradeId, newSl, newTp) {
    console.log(`[CopyTrade] Mirroring SL/TP to followers: masterTradeId=${masterTradeId}, SL=${newSl}, TP=${newTp}`)
    
    const copyTrades = await CopyTrade.find({
      masterTradeId,
      status: 'OPEN'
    })

    console.log(`[CopyTrade] Found ${copyTrades.length} follower trades to update SL/TP`)

    // Process ALL in parallel for instant sync
    const results = await Promise.all(copyTrades.map(async (copyTrade) => {
      try {
        await tradeEngine.modifyTrade(copyTrade.followerTradeId, newSl, newTp)
        console.log(`[CopyTrade] SL/TP updated for follower trade ${copyTrade.followerTradeId}`)
        return {
          copyTradeId: copyTrade._id,
          status: 'SUCCESS'
        }
      } catch (error) {
        console.error(`Error mirroring SL/TP to copy trade ${copyTrade._id}:`, error)
        return {
          copyTradeId: copyTrade._id,
          status: 'FAILED',
          reason: error.message
        }
      }
    }))

    console.log(`[CopyTrade] SL/TP mirror complete: ${results.filter(r => r.status === 'SUCCESS').length}/${copyTrades.length} success`)
    return results
  }

  // Close all follower trades when master closes (PARALLEL for speed)
  async closeFollowerTrades(masterTradeId, masterClosePrice) {
    console.log(`[CopyTrade] closeFollowerTrades called with masterTradeId: ${masterTradeId}, price: ${masterClosePrice}`)
    
    const copyTrades = await CopyTrade.find({
      masterTradeId,
      status: 'OPEN'
    })

    console.log(`[CopyTrade] Found ${copyTrades.length} open copy trades to close for master trade ${masterTradeId}`)

    // Process ALL in parallel for instant close
    const results = await Promise.all(copyTrades.map(async (copyTrade) => {
      try {
        // Close the follower trade
        const result = await tradeEngine.closeTrade(
          copyTrade.followerTradeId,
          masterClosePrice,
          masterClosePrice,
          'USER'
        )

        // Update copy trade record
        copyTrade.masterClosePrice = masterClosePrice
        copyTrade.followerClosePrice = result.trade.closePrice
        copyTrade.followerPnl = result.realizedPnl
        copyTrade.status = 'CLOSED'
        copyTrade.closedAt = new Date()
        await copyTrade.save()

        // Update follower stats
        const follower = await CopyFollower.findById(copyTrade.followerId)
        if (follower) {
          follower.stats.activeCopiedTrades -= 1
          if (result.realizedPnl >= 0) {
            follower.stats.totalProfit += result.realizedPnl
            follower.dailyProfit += result.realizedPnl
          } else {
            follower.stats.totalLoss += Math.abs(result.realizedPnl)
            follower.dailyLoss += Math.abs(result.realizedPnl)
          }
          await follower.save()
        }

        console.log(`[CopyTrade] Closed follower trade ${copyTrade.followerTradeId}, PnL: ${result.realizedPnl}`)
        return {
          copyTradeId: copyTrade._id,
          status: 'SUCCESS',
          pnl: result.realizedPnl
        }

      } catch (error) {
        console.error(`Error closing copy trade ${copyTrade._id}:`, error)
        return {
          copyTradeId: copyTrade._id,
          status: 'FAILED',
          reason: error.message
        }
      }
    }))

    console.log(`[CopyTrade] Close complete: ${results.filter(r => r.status === 'SUCCESS').length}/${copyTrades.length} success`)
    return results
  }

  // Calculate and apply daily commission (run at end of day)
  async calculateDailyCommission(tradingDay = null) {
    const day = tradingDay || this.getTradingDay()
    
    // Get all closed copy trades for the day that haven't had commission applied
    const copyTrades = await CopyTrade.find({
      tradingDay: day,
      status: 'CLOSED',
      commissionApplied: false
    })

    // Group by master and follower
    const groupedTrades = {}
    for (const trade of copyTrades) {
      const key = `${trade.masterId}_${trade.followerId}`
      if (!groupedTrades[key]) {
        groupedTrades[key] = {
          masterId: trade.masterId,
          followerId: trade.followerId,
          followerUserId: trade.followerUserId,
          followerAccountId: trade.followerAccountId,
          trades: [],
          totalPnl: 0
        }
      }
      groupedTrades[key].trades.push(trade)
      groupedTrades[key].totalPnl += trade.followerPnl
    }

    const commissionResults = []

    for (const key in groupedTrades) {
      const group = groupedTrades[key]
      
      // Only apply commission on profitable days
      if (group.totalPnl <= 0) {
        // Mark trades as processed (no commission)
        for (const trade of group.trades) {
          trade.commissionApplied = true
          await trade.save()
        }
        continue
      }

      try {
        // Get master's commission percentage
        const master = await MasterTrader.findById(group.masterId)
        if (!master || !master.approvedCommissionPercentage) continue

        const commissionPercentage = master.approvedCommissionPercentage
        const adminSharePercentage = master.adminSharePercentage || 30

        // Calculate commission
        const totalCommission = group.totalPnl * (commissionPercentage / 100)
        const adminShare = totalCommission * (adminSharePercentage / 100)
        const masterShare = totalCommission - adminShare

        // Deduct from follower account
        const followerAccount = await TradingAccount.findById(group.followerAccountId)
        if (followerAccount && followerAccount.balance >= totalCommission) {
          followerAccount.balance -= totalCommission
          await followerAccount.save()

          // Create commission record
          const commission = await CopyCommission.create({
            masterId: group.masterId,
            followerId: group.followerId,
            followerUserId: group.followerUserId,
            followerAccountId: group.followerAccountId,
            tradingDay: day,
            dailyProfit: group.totalPnl,
            commissionPercentage,
            totalCommission,
            adminShare,
            masterShare,
            adminSharePercentage,
            status: 'DEDUCTED',
            deductedAt: new Date()
          })

          // Update master pending commission
          master.pendingCommission += masterShare
          master.totalCommissionEarned += masterShare
          await master.save()

          // Update admin pool
          const settings = await CopySettings.getSettings()
          settings.adminCopyPool += adminShare
          await settings.save()

          // Update follower stats
          const follower = await CopyFollower.findById(group.followerId)
          if (follower) {
            follower.stats.totalCommissionPaid += totalCommission
            await follower.save()
          }

          // Mark trades as processed
          for (const trade of group.trades) {
            trade.commissionApplied = true
            await trade.save()
          }

          commissionResults.push({
            masterId: group.masterId,
            followerId: group.followerId,
            dailyProfit: group.totalPnl,
            commission: totalCommission,
            status: 'SUCCESS'
          })

        } else {
          // Insufficient balance for commission
          await CopyCommission.create({
            masterId: group.masterId,
            followerId: group.followerId,
            followerUserId: group.followerUserId,
            followerAccountId: group.followerAccountId,
            tradingDay: day,
            dailyProfit: group.totalPnl,
            commissionPercentage,
            totalCommission,
            adminShare,
            masterShare,
            adminSharePercentage,
            status: 'FAILED',
            deductionError: 'Insufficient balance'
          })

          commissionResults.push({
            masterId: group.masterId,
            followerId: group.followerId,
            status: 'FAILED',
            reason: 'Insufficient balance'
          })
        }

      } catch (error) {
        console.error(`Error calculating commission for ${key}:`, error)
        commissionResults.push({
          masterId: group.masterId,
          followerId: group.followerId,
          status: 'FAILED',
          reason: error.message
        })
      }
    }

    return commissionResults
  }

  // Process master commission withdrawal to main wallet
  async processMasterWithdrawal(masterId, amount, adminId) {
    const master = await MasterTrader.findById(masterId)
    if (!master) throw new Error('Master not found')

    if (amount > master.pendingCommission) {
      throw new Error(`Insufficient pending commission. Available: $${master.pendingCommission.toFixed(2)}`)
    }

    const settings = await CopySettings.getSettings()
    if (amount < settings.commissionSettings.minPayoutAmount) {
      throw new Error(`Minimum payout amount is $${settings.commissionSettings.minPayoutAmount}`)
    }

    // Get or create user's main wallet
    let wallet = await Wallet.findOne({ userId: master.userId })
    if (!wallet) {
      wallet = await Wallet.create({ userId: master.userId, balance: 0 })
    }

    // Transfer commission to main wallet
    wallet.balance += amount
    await wallet.save()

    // Update master records
    master.pendingCommission -= amount
    master.totalCommissionWithdrawn += amount
    await master.save()

    return {
      amount,
      newPendingCommission: master.pendingCommission,
      newWalletBalance: wallet.balance
    }
  }

  // Close all follower trades when master is banned
  async closeAllMasterFollowerTrades(masterId, currentPrices) {
    const copyTrades = await CopyTrade.find({
      masterId,
      status: 'OPEN'
    })

    const results = []

    for (const copyTrade of copyTrades) {
      try {
        const price = currentPrices[copyTrade.symbol]
        if (!price) continue

        const result = await tradeEngine.closeTrade(
          copyTrade.followerTradeId,
          price.bid,
          price.ask,
          'ADMIN'
        )

        copyTrade.status = 'CLOSED'
        copyTrade.followerClosePrice = result.trade.closePrice
        copyTrade.followerPnl = result.realizedPnl
        copyTrade.closedAt = new Date()
        await copyTrade.save()

        results.push({
          copyTradeId: copyTrade._id,
          status: 'SUCCESS',
          pnl: result.realizedPnl
        })

      } catch (error) {
        results.push({
          copyTradeId: copyTrade._id,
          status: 'FAILED',
          reason: error.message
        })
      }
    }

    return results
  }
}

export default new CopyTradingEngine()
