// Script to remove self-follow records where a user is following their own master account
// Run with: node scripts/removeSelfFollows.js

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import CopyFollower from '../models/CopyFollower.js'
import MasterTrader from '../models/MasterTrader.js'

dotenv.config()

const removeSelfFollows = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB')

    // Get all followers with their master info
    const followers = await CopyFollower.find({ status: { $in: ['ACTIVE', 'PAUSED'] } })
      .populate('masterId', 'userId')
    
    let removedCount = 0
    
    for (const follower of followers) {
      // Check if follower is following their own master account
      if (follower.masterId?.userId?.toString() === follower.followerId?.toString()) {
        console.log(`Found self-follow: User ${follower.followerId} following their own master ${follower.masterId._id}`)
        
        // Update status to STOPPED
        follower.status = 'STOPPED'
        follower.stoppedAt = new Date()
        await follower.save()
        
        // Decrement master's follower count
        await MasterTrader.findByIdAndUpdate(follower.masterId._id, {
          $inc: { 'stats.activeFollowers': -1 }
        })
        
        removedCount++
        console.log(`  -> Stopped self-follow subscription`)
      }
    }

    console.log(`\nCompleted! Removed ${removedCount} self-follow record(s)`)
    
    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

removeSelfFollows()
