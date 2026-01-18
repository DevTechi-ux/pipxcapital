import express from 'express'
import Trade from '../models/Trade.js'
import mongoose from 'mongoose'

const router = express.Router()

// GET /api/earnings/summary - Get earnings summary (daily, weekly, monthly)
router.get('/summary', async (req, res) => {
  try {
    const now = new Date()
    
    // Calculate date ranges
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Start of week (Sunday)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const yearStart = new Date(now.getFullYear(), 0, 1)

    // Aggregate earnings from trades
    const aggregateEarnings = async (startDate, endDate = now) => {
      const result = await Trade.aggregate([
        {
          $match: {
            openedAt: { $gte: startDate, $lte: endDate },
            status: { $in: ['OPEN', 'CLOSED'] }
          }
        },
        {
          $group: {
            _id: null,
            totalCommission: { $sum: '$commission' },
            totalSpread: { $sum: '$spread' },
            totalSwap: { $sum: '$swap' },
            tradeCount: { $sum: 1 },
            totalVolume: { $sum: '$quantity' }
          }
        }
      ])
      
      if (result.length === 0) {
        return { totalCommission: 0, totalSpread: 0, totalSwap: 0, tradeCount: 0, totalVolume: 0 }
      }
      
      return result[0]
    }

    const [today, thisWeek, thisMonth, thisYear, allTime] = await Promise.all([
      aggregateEarnings(todayStart),
      aggregateEarnings(weekStart),
      aggregateEarnings(monthStart),
      aggregateEarnings(yearStart),
      aggregateEarnings(new Date(0)) // All time
    ])

    res.json({
      success: true,
      earnings: {
        today: {
          commission: today.totalCommission,
          spread: today.totalSpread,
          swap: today.totalSwap,
          total: today.totalCommission + today.totalSwap,
          trades: today.tradeCount,
          volume: today.totalVolume
        },
        thisWeek: {
          commission: thisWeek.totalCommission,
          spread: thisWeek.totalSpread,
          swap: thisWeek.totalSwap,
          total: thisWeek.totalCommission + thisWeek.totalSwap,
          trades: thisWeek.tradeCount,
          volume: thisWeek.totalVolume
        },
        thisMonth: {
          commission: thisMonth.totalCommission,
          spread: thisMonth.totalSpread,
          swap: thisMonth.totalSwap,
          total: thisMonth.totalCommission + thisMonth.totalSwap,
          trades: thisMonth.tradeCount,
          volume: thisMonth.totalVolume
        },
        thisYear: {
          commission: thisYear.totalCommission,
          spread: thisYear.totalSpread,
          swap: thisYear.totalSwap,
          total: thisYear.totalCommission + thisYear.totalSwap,
          trades: thisYear.tradeCount,
          volume: thisYear.totalVolume
        },
        allTime: {
          commission: allTime.totalCommission,
          spread: allTime.totalSpread,
          swap: allTime.totalSwap,
          total: allTime.totalCommission + allTime.totalSwap,
          trades: allTime.tradeCount,
          volume: allTime.totalVolume
        }
      }
    })
  } catch (error) {
    console.error('Error fetching earnings summary:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/earnings/daily - Get daily earnings breakdown for a date range
router.get('/daily', async (req, res) => {
  try {
    const { startDate, endDate, days = 30 } = req.query
    
    let start, end
    if (startDate && endDate) {
      start = new Date(startDate)
      end = new Date(endDate)
    } else {
      end = new Date()
      start = new Date()
      start.setDate(start.getDate() - parseInt(days))
    }

    const dailyEarnings = await Trade.aggregate([
      {
        $match: {
          openedAt: { $gte: start, $lte: end },
          status: { $in: ['OPEN', 'CLOSED'] }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$openedAt' },
            month: { $month: '$openedAt' },
            day: { $dayOfMonth: '$openedAt' }
          },
          commission: { $sum: '$commission' },
          spread: { $sum: '$spread' },
          swap: { $sum: '$swap' },
          trades: { $sum: 1 },
          volume: { $sum: '$quantity' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ])

    // Format the results
    const formatted = dailyEarnings.map(day => ({
      date: `${day._id.year}-${String(day._id.month).padStart(2, '0')}-${String(day._id.day).padStart(2, '0')}`,
      commission: day.commission,
      spread: day.spread,
      swap: day.swap,
      total: day.commission + day.swap,
      trades: day.trades,
      volume: day.volume
    }))

    res.json({ success: true, earnings: formatted })
  } catch (error) {
    console.error('Error fetching daily earnings:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/earnings/by-user - Get earnings breakdown by user
router.get('/by-user', async (req, res) => {
  try {
    const { startDate, endDate, days = 30 } = req.query
    
    let start, end
    if (startDate && endDate) {
      start = new Date(startDate)
      end = new Date(endDate)
    } else {
      end = new Date()
      start = new Date()
      start.setDate(start.getDate() - parseInt(days))
    }

    const userEarnings = await Trade.aggregate([
      {
        $match: {
          openedAt: { $gte: start, $lte: end },
          status: { $in: ['OPEN', 'CLOSED'] }
        }
      },
      {
        $group: {
          _id: '$userId',
          commission: { $sum: '$commission' },
          spread: { $sum: '$spread' },
          swap: { $sum: '$swap' },
          trades: { $sum: 1 },
          volume: { $sum: '$quantity' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          userId: '$_id',
          userName: '$user.name',
          userEmail: '$user.email',
          commission: 1,
          spread: 1,
          swap: 1,
          total: { $add: ['$commission', '$swap'] },
          trades: 1,
          volume: 1
        }
      },
      {
        $sort: { total: -1 }
      }
    ])

    res.json({ success: true, earnings: userEarnings })
  } catch (error) {
    console.error('Error fetching user earnings:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/earnings/by-symbol - Get earnings breakdown by symbol
router.get('/by-symbol', async (req, res) => {
  try {
    const { startDate, endDate, days = 30 } = req.query
    
    let start, end
    if (startDate && endDate) {
      start = new Date(startDate)
      end = new Date(endDate)
    } else {
      end = new Date()
      start = new Date()
      start.setDate(start.getDate() - parseInt(days))
    }

    const symbolEarnings = await Trade.aggregate([
      {
        $match: {
          openedAt: { $gte: start, $lte: end },
          status: { $in: ['OPEN', 'CLOSED'] }
        }
      },
      {
        $group: {
          _id: '$symbol',
          commission: { $sum: '$commission' },
          spread: { $sum: '$spread' },
          swap: { $sum: '$swap' },
          trades: { $sum: 1 },
          volume: { $sum: '$quantity' }
        }
      },
      {
        $project: {
          symbol: '$_id',
          commission: 1,
          spread: 1,
          swap: 1,
          total: { $add: ['$commission', '$swap'] },
          trades: 1,
          volume: 1
        }
      },
      {
        $sort: { total: -1 }
      }
    ])

    res.json({ success: true, earnings: symbolEarnings })
  } catch (error) {
    console.error('Error fetching symbol earnings:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
