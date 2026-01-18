import IBUser from '../models/IBUser.js'
import IBPlan from '../models/IBPlan.js'
import IBCommission from '../models/IBCommission.js'
import IBReferral from '../models/IBReferral.js'
import IBSettings from '../models/IBSettings.js'
import Trade from '../models/Trade.js'
import User from '../models/User.js'

class IBEngine {
  constructor() {
    this.CONTRACT_SIZE = 100000
  }

  // Get today's date string
  getTradingDay() {
    return new Date().toISOString().split('T')[0]
  }

  // Get contract size based on symbol
  getContractSize(symbol) {
    if (symbol === 'XAUUSD') return 100
    if (symbol === 'XAGUSD') return 5000
    if (['BTCUSD', 'ETHUSD', 'LTCUSD', 'XRPUSD', 'BCHUSD'].includes(symbol)) return 1
    return 100000
  }

  // Find the IB chain for a user (who referred them and their upline)
  async getIBChainForUser(userId) {
    // Check if user was referred by an IB
    const referral = await IBReferral.findOne({ userId, status: 'ACTIVE' })
      .populate('referredByIBId')
    
    if (!referral) return []

    const referringIB = await IBUser.findById(referral.referredByIBId)
      .populate('ibPlanId')
    
    if (!referringIB || referringIB.status !== 'ACTIVE') return []

    // Get the full upline chain
    const chain = [{
      ibUser: referringIB,
      level: 1
    }]

    // Get upline (parents of the referring IB)
    const upline = await referringIB.getUplineChain(4) // Get up to 4 more levels
    
    for (const parent of upline) {
      chain.push({
        ibUser: parent.ibUser,
        level: chain.length + 1
      })
    }

    return chain
  }

  // Calculate and distribute IB commission when a trade closes
  async processTradeCommission(trade) {
    const tradingDay = this.getTradingDay()
    
    // Get the IB chain for the trader
    const ibChain = await this.getIBChainForUser(trade.userId)
    
    if (ibChain.length === 0) {
      return { processed: false, reason: 'No IB chain found for trader' }
    }

    const commissionResults = []
    const contractSize = this.getContractSize(trade.symbol)
    const tradeVolume = trade.quantity * contractSize

    for (const { ibUser, level } of ibChain) {
      try {
        // Get IB's plan - need to populate if it's just an ObjectId
        let plan = null
        if (ibUser.ibPlanId) {
          if (typeof ibUser.ibPlanId === 'object' && ibUser.ibPlanId.levelCommissions) {
            plan = ibUser.ibPlanId
          } else {
            plan = await IBPlan.findById(ibUser.ibPlanId)
          }
        }
        if (!plan) {
          plan = await IBPlan.getDefaultPlan()
        }
        if (!plan) continue

        // Check if level is within plan's max levels
        if (level > plan.maxLevels) continue

        // Get commission rate for this level
        const levelKey = `level${level}`
        const commissionRate = plan.levelCommissions[levelKey] || 0
        if (commissionRate <= 0) continue

        // Calculate commission based on sources
        let commissionAmount = 0
        const sourceBreakdown = { fromSpread: 0, fromCommission: 0, fromSwap: 0 }

        if (plan.commissionType === 'PER_LOT') {
          // Per lot commission
          commissionAmount = trade.quantity * commissionRate
        } else {
          // Percentage commission
          let baseAmount = 0
          
          if (plan.commissionSources.spread && trade.spread) {
            const spreadValue = trade.spread * trade.quantity * contractSize
            baseAmount += spreadValue
            sourceBreakdown.fromSpread = spreadValue * (commissionRate / 100)
          }
          
          if (plan.commissionSources.commission && trade.commission) {
            baseAmount += trade.commission
            sourceBreakdown.fromCommission = trade.commission * (commissionRate / 100)
          }
          
          if (plan.commissionSources.swap && trade.swap) {
            baseAmount += Math.abs(trade.swap)
            sourceBreakdown.fromSwap = Math.abs(trade.swap) * (commissionRate / 100)
          }
          
          commissionAmount = baseAmount * (commissionRate / 100)
        }

        if (commissionAmount <= 0) continue

        // Round to 2 decimal places
        commissionAmount = Math.round(commissionAmount * 100) / 100

        // Create commission record
        const commission = await IBCommission.create({
          ibUserId: ibUser._id,
          traderId: trade.userId,
          tradeId: trade._id,
          level,
          symbol: trade.symbol,
          tradeLotSize: trade.quantity,
          tradeVolume,
          commissionType: plan.commissionType,
          commissionRate,
          sourceBreakdown,
          commissionAmount,
          status: 'CREDITED',
          tradingDay,
          creditedAt: new Date()
        })

        // Credit IB wallet
        ibUser.ibWalletBalance += commissionAmount
        ibUser.totalCommissionEarned += commissionAmount
        ibUser.stats.totalTradedVolume += tradeVolume
        ibUser.stats.todayCommission += commissionAmount
        ibUser.stats.lastCommissionDate = new Date()
        await ibUser.save()

        // Update referral stats
        const referral = await IBReferral.findOne({ 
          userId: trade.userId, 
          referredByIBId: ibUser._id 
        })
        if (referral) {
          referral.totalTradedVolume += tradeVolume
          referral.totalCommissionGenerated += commissionAmount
          referral.lastTradeAt = new Date()
          if (!referral.firstTradeAt) referral.firstTradeAt = new Date()
          await referral.save()
        }

        commissionResults.push({
          ibUserId: ibUser._id,
          level,
          commissionAmount,
          status: 'SUCCESS'
        })

      } catch (error) {
        console.error(`Error processing IB commission for level ${level}:`, error)
        commissionResults.push({
          ibUserId: ibUser._id,
          level,
          status: 'FAILED',
          reason: error.message
        })
      }
    }

    return {
      processed: true,
      traderId: trade.userId,
      tradeId: trade._id,
      commissions: commissionResults
    }
  }

  // Process IB withdrawal
  async processWithdrawal(ibUserId, amount, adminApproval = false) {
    const ibUser = await IBUser.findById(ibUserId)
    if (!ibUser) throw new Error('IB user not found')
    if (ibUser.status !== 'ACTIVE') throw new Error('IB account is not active')

    const settings = await IBSettings.getSettings()
    
    if (amount < settings.commissionSettings.minWithdrawalAmount) {
      throw new Error(`Minimum withdrawal amount is $${settings.commissionSettings.minWithdrawalAmount}`)
    }

    if (amount > ibUser.ibWalletBalance) {
      throw new Error(`Insufficient balance. Available: $${ibUser.ibWalletBalance.toFixed(2)}`)
    }

    if (settings.commissionSettings.withdrawalApprovalRequired && !adminApproval) {
      // Add to pending withdrawal
      ibUser.pendingWithdrawal += amount
      ibUser.ibWalletBalance -= amount
      await ibUser.save()
      
      return {
        status: 'PENDING_APPROVAL',
        amount,
        newBalance: ibUser.ibWalletBalance
      }
    }

    // Direct withdrawal
    ibUser.ibWalletBalance -= amount
    ibUser.totalCommissionWithdrawn += amount
    await ibUser.save()

    return {
      status: 'COMPLETED',
      amount,
      newBalance: ibUser.ibWalletBalance
    }
  }

  // Approve pending withdrawal
  async approveWithdrawal(ibUserId, adminId) {
    const ibUser = await IBUser.findById(ibUserId)
    if (!ibUser) throw new Error('IB user not found')
    if (ibUser.pendingWithdrawal <= 0) throw new Error('No pending withdrawal')

    const amount = ibUser.pendingWithdrawal
    ibUser.pendingWithdrawal = 0
    ibUser.totalCommissionWithdrawn += amount
    await ibUser.save()

    return {
      status: 'APPROVED',
      amount,
      newBalance: ibUser.ibWalletBalance
    }
  }

  // Reject pending withdrawal
  async rejectWithdrawal(ibUserId, adminId, reason) {
    const ibUser = await IBUser.findById(ibUserId)
    if (!ibUser) throw new Error('IB user not found')
    if (ibUser.pendingWithdrawal <= 0) throw new Error('No pending withdrawal')

    const amount = ibUser.pendingWithdrawal
    ibUser.pendingWithdrawal = 0
    ibUser.ibWalletBalance += amount // Refund
    await ibUser.save()

    return {
      status: 'REJECTED',
      amount,
      reason,
      newBalance: ibUser.ibWalletBalance
    }
  }

  // Reverse commission (fraud detection)
  async reverseCommission(commissionId, adminId, reason) {
    const commission = await IBCommission.findById(commissionId)
    if (!commission) throw new Error('Commission not found')
    if (commission.status === 'REVERSED') throw new Error('Commission already reversed')

    const ibUser = await IBUser.findById(commission.ibUserId)
    if (!ibUser) throw new Error('IB user not found')

    // Deduct from IB wallet
    ibUser.ibWalletBalance -= commission.commissionAmount
    ibUser.totalCommissionEarned -= commission.commissionAmount
    if (ibUser.ibWalletBalance < 0) ibUser.ibWalletBalance = 0
    await ibUser.save()

    // Update commission record
    commission.status = 'REVERSED'
    commission.reversedAt = new Date()
    commission.reversedBy = adminId
    commission.reversalReason = reason
    await commission.save()

    return {
      status: 'REVERSED',
      amount: commission.commissionAmount,
      ibUserId: ibUser._id
    }
  }

  // Get IB tree structure (downline)
  async getDownlineTree(ibUserId, maxDepth = 5) {
    const buildTree = async (parentId, currentDepth) => {
      if (currentDepth > maxDepth) return []

      const children = await IBReferral.find({ referredByIBId: parentId })
        .populate('userId', 'firstName lastName email')

      const tree = []
      for (const child of children) {
        // Check if this user is also an IB
        const childIB = await IBUser.findOne({ userId: child.userId._id })
        
        const node = {
          userId: child.userId._id,
          name: `${child.userId.firstName} ${child.userId.lastName || ''}`.trim(),
          email: child.userId.email,
          level: currentDepth,
          isIB: !!childIB,
          ibStatus: childIB?.status || null,
          totalVolume: child.totalTradedVolume,
          totalCommission: child.totalCommissionGenerated,
          children: []
        }

        // If this user is an IB, get their downline
        if (childIB) {
          node.children = await buildTree(childIB._id, currentDepth + 1)
        }

        tree.push(node)
      }

      return tree
    }

    return await buildTree(ibUserId, 1)
  }

  // Reset daily stats (run at midnight)
  async resetDailyStats() {
    await IBUser.updateMany(
      {},
      { $set: { 'stats.todayCommission': 0 } }
    )
  }
}

export default new IBEngine()
