import express from 'express'
import EmailTemplate from '../models/EmailTemplate.js'
import EmailSettings from '../models/EmailSettings.js'
import { testSMTPConnection } from '../services/emailService.js'

const router = express.Router()

// Default email templates
const defaultTemplates = [
  {
    name: 'Email Verification OTP',
    slug: 'email_verification',
    subject: 'Verify Your Email - {{otp}}',
    description: 'Sent when a user registers to verify their email with OTP',
    category: 'verification',
    variables: ['otp', 'firstName', 'email', 'expiryMinutes', 'platformName', 'supportEmail', 'year'],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #333;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">{{platformName}}</h1>
      </div>
      <h2 style="color: #fff; margin: 0 0 20px; font-size: 20px;">Verify Your Email</h2>
      <p style="color: #aaa; margin: 0 0 20px; line-height: 1.6;">Hi {{firstName}},</p>
      <p style="color: #aaa; margin: 0 0 30px; line-height: 1.6;">Use the following OTP to verify your email address:</p>
      <div style="background: #0f0f23; border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
        <span style="font-size: 36px; font-weight: bold; color: #22c55e; letter-spacing: 8px;">{{otp}}</span>
      </div>
      <p style="color: #888; font-size: 14px; margin: 0 0 20px;">This OTP will expire in {{expiryMinutes}} minutes.</p>
      <p style="color: #666; font-size: 12px; margin: 0;">If you didn't request this, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
      <p style="color: #666; font-size: 12px; margin: 0; text-align: center;">© {{year}} {{platformName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'Challenge Completed',
    slug: 'challenge_completed',
    subject: '🎉 Congratulations! Challenge Completed Successfully',
    description: 'Sent when a user successfully completes a trading challenge',
    category: 'challenge',
    variables: ['firstName', 'challengeName', 'fundSize', 'accountId', 'completionDate', 'platformName', 'loginUrl', 'supportEmail', 'year'],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #333;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">{{platformName}}</h1>
      </div>
      <h2 style="color: #22c55e; margin: 0 0 20px; font-size: 24px; text-align: center;">🎉 Challenge Completed!</h2>
      <p style="color: #aaa; margin: 0 0 20px; line-height: 1.6;">Hi {{firstName}},</p>
      <p style="color: #aaa; margin: 0 0 20px; line-height: 1.6;">Congratulations! You have successfully completed the {{challengeName}} challenge.</p>
      
      <div style="background: #0f0f23; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #fff; margin: 0 0 15px; font-size: 16px;">Challenge Details:</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div>
            <p style="color: #888; margin: 0 0 5px; font-size: 14px;">Challenge Name:</p>
            <p style="color: #fff; margin: 0; font-weight: bold;">{{challengeName}}</p>
          </div>
          <div>
            <p style="color: #888; margin: 0 0 5px; font-size: 14px;">Fund Size:</p>
            <p style="color: #fff; margin: 0; font-weight: bold;">{{fundSize}}</p>
          </div>
          <div>
            <p style="color: #888; margin: 0 0 5px; font-size: 14px;">Account ID:</p>
            <p style="color: #fff; margin: 0; font-weight: bold;">{{accountId}}</p>
          </div>
          <div>
            <p style="color: #888; margin: 0 0 5px; font-size: 14px;">Completion Date:</p>
            <p style="color: #fff; margin: 0; font-weight: bold;">{{completionDate}}</p>
          </div>
        </div>
      </div>
      
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="{{loginUrl}}" style="display: inline-block; background: #22c55e; color: #000; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: bold;">View Results</a>
      </div>
      
      <p style="color: #666; font-size: 12px; margin: 0;">Need help? Contact us at {{supportEmail}}</p>
      <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
      <p style="color: #666; font-size: 12px; margin: 0; text-align: center;">© {{year}} {{platformName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'Challenge Failed',
    slug: 'challenge_failed',
    subject: '⚠️ Challenge Failed - Try Again',
    description: 'Sent when a user fails a trading challenge',
    category: 'challenge',
    variables: ['firstName', 'challengeName', 'fundSize', 'accountId', 'failureReason', 'failureDate', 'platformName', 'loginUrl', 'supportEmail', 'year'],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #333;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">{{platformName}}</h1>
      </div>
      <h2 style="color: #ef4444; margin: 0 0 20px; font-size: 24px; text-align: center;">⚠️ Challenge Failed</h2>
      <p style="color: #aaa; margin: 0 0 20px; line-height: 1.6;">Hi {{firstName}},</p>
      <p style="color: #aaa; margin: 0 0 20px; line-height: 1.6;">Unfortunately, you did not meet the requirements for the {{challengeName}} challenge.</p>
      
      <div style="background: #0f0f23; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #fff; margin: 0 0 15px; font-size: 16px;">Challenge Details:</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div>
            <p style="color: #888; margin: 0 0 5px; font-size: 14px;">Challenge Name:</p>
            <p style="color: #fff; margin: 0; font-weight: bold;">{{challengeName}}</p>
          </div>
          <div>
            <p style="color: #888; margin: 0 0 5px; font-size: 14px;">Fund Size:</p>
            <p style="color: #fff; margin: 0; font-weight: bold;">{{fundSize}}</p>
          </div>
          <div>
            <p style="color: #888; margin: 0 0 5px; font-size: 14px;">Account ID:</p>
            <p style="color: #fff; margin: 0; font-weight: bold;">{{accountId}}</p>
          </div>
          <div>
            <p style="color: #888; margin: 0 0 5px; font-size: 14px;">Failure Date:</p>
            <p style="color: #fff; margin: 0; font-weight: bold;">{{failureDate}}</p>
          </div>
        </div>
        <div style="margin-top: 15px;">
          <p style="color: #888; margin: 0 0 5px; font-size: 14px;">Failure Reason:</p>
          <p style="color: #ef4444; margin: 0; font-weight: bold;">{{failureReason}}</p>
        </div>
      </div>
      
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="{{loginUrl}}" style="display: inline-block; background: #ef4444; color: #fff; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: bold;">Try Again</a>
      </div>
      
      <p style="color: #666; font-size: 12px; margin: 0;">Need help? Contact us at {{supportEmail}}</p>
      <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
      <p style="color: #666; font-size: 12px; margin: 0; text-align: center;">© {{year}} {{platformName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'Password Reset',
    slug: 'password_reset',
    subject: 'Reset Your Password - {{otp}}',
    description: 'Sent when user requests password reset via OTP',
    category: 'security',
    variables: ['firstName', 'email', 'otp', 'expiryMinutes', 'platformName', 'supportEmail', 'year'],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #333;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">{{platformName}}</h1>
      </div>
      <h2 style="color: #ef4444; margin: 0 0 20px; font-size: 20px;">Reset Your Password</h2>
      <p style="color: #aaa; margin: 0 0 20px; line-height: 1.6;">Hi {{firstName}},</p>
      <p style="color: #aaa; margin: 0 0 30px; line-height: 1.6;">We received a request to reset your password. Use the following OTP to proceed:</p>
      <div style="background: #0f0f23; border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
        <span style="font-size: 36px; font-weight: bold; color: #ef4444; letter-spacing: 8px;">{{otp}}</span>
      </div>
      <p style="color: #888; font-size: 14px; margin: 0 0 20px;">This OTP will expire in {{expiryMinutes}} minutes.</p>
      <p style="color: #666; font-size: 12px; margin: 0;">If you didn't request this, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
      <p style="color: #666; font-size: 12px; margin: 0; text-align: center;">© {{year}} {{platformName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'Welcome Email',
    slug: 'welcome',
    subject: 'Welcome to {{platformName}}!',
    description: 'Sent after successful email verification',
    category: 'account',
    variables: ['firstName', 'email', 'platformName', 'loginUrl', 'supportEmail', 'year'],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #333;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">{{platformName}}</h1>
      </div>
      <h2 style="color: #22c55e; margin: 0 0 20px; font-size: 24px; text-align: center;">🎉 Welcome Aboard!</h2>
      <p style="color: #aaa; margin: 0 0 20px; line-height: 1.6;">Hi {{firstName}},</p>
      <p style="color: #aaa; margin: 0 0 20px; line-height: 1.6;">Congratulations! Your account has been successfully created. You're now ready to start trading.</p>
      <div style="background: #0f0f23; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
        <p style="color: #888; margin: 0 0 10px; font-size: 14px;">Your registered email:</p>
        <p style="color: #fff; margin: 0; font-weight: bold;">{{email}}</p>
      </div>
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="{{loginUrl}}" style="display: inline-block; background: #22c55e; color: #000; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: bold;">Start Trading</a>
      </div>
      <p style="color: #666; font-size: 12px; margin: 0;">Need help? Contact us at {{supportEmail}}</p>
      <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
      <p style="color: #666; font-size: 12px; margin: 0; text-align: center;">© {{year}} {{platformName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'Deposit Pending',
    slug: 'deposit_pending',
    subject: 'Deposit Request Received - \${{amount}}',
    description: 'Sent when a deposit is pending admin approval',
    category: 'transaction',
    variables: ['firstName', 'amount', 'transactionId', 'paymentMethod', 'date', 'platformName', 'supportEmail', 'year'],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #333;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">{{platformName}}</h1>
      </div>
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="display: inline-block; background: #eab308; color: #000; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold;">⏳ Pending Review</span>
      </div>
      <h2 style="color: #fff; margin: 0 0 20px; font-size: 20px;">Deposit Request Received</h2>
      <p style="color: #aaa; margin: 0 0 20px; line-height: 1.6;">Hi {{firstName}},</p>
      <p style="color: #aaa; margin: 0 0 30px; line-height: 1.6;">We've received your deposit request and it's currently being reviewed by our team.</p>
      <div style="background: #0f0f23; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
          <span style="color: #888;">Amount</span>
          <span style="color: #22c55e; font-weight: bold; font-size: 18px;">\${{amount}}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
          <span style="color: #888;">Transaction ID</span>
          <span style="color: #fff; font-family: monospace;">{{transactionId}}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
          <span style="color: #888;">Payment Method</span>
          <span style="color: #fff;">{{paymentMethod}}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #888;">Date</span>
          <span style="color: #fff;">{{date}}</span>
        </div>
      </div>
      <p style="color: #666; font-size: 12px; margin: 0;">You'll receive another email once your deposit is processed.</p>
      <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
      <p style="color: #666; font-size: 12px; margin: 0; text-align: center;">© {{year}} {{platformName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'Deposit Success',
    slug: 'deposit_success',
    subject: 'Deposit Approved - \${{amount}} Added!',
    description: 'Sent when a deposit is successfully processed',
    category: 'transaction',
    variables: ['firstName', 'amount', 'transactionId', 'paymentMethod', 'date', 'newBalance', 'platformName', 'supportEmail', 'year'],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #333;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">{{platformName}}</h1>
      </div>
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="display: inline-block; background: #22c55e; color: #000; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold;">✓ Approved</span>
      </div>
      <h2 style="color: #fff; margin: 0 0 20px; font-size: 20px; text-align: center;">Deposit Successful!</h2>
      <p style="color: #aaa; margin: 0 0 20px; line-height: 1.6;">Hi {{firstName}},</p>
      <p style="color: #aaa; margin: 0 0 30px; line-height: 1.6;">Great news! Your deposit has been approved and credited to your wallet.</p>
      <div style="background: #0f0f23; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="color: #22c55e; font-size: 32px; font-weight: bold;">+\${{amount}}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span style="color: #888;">New Balance</span>
          <span style="color: #fff; font-weight: bold;">\${{newBalance}}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #888;">Transaction ID</span>
          <span style="color: #fff; font-family: monospace;">{{transactionId}}</span>
        </div>
      </div>
      <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
      <p style="color: #666; font-size: 12px; margin: 0; text-align: center;">© {{year}} {{platformName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'Withdrawal Pending',
    slug: 'withdrawal_pending',
    subject: 'Withdrawal Request Received - \${{amount}}',
    description: 'Sent when a withdrawal request is submitted',
    category: 'transaction',
    variables: ['firstName', 'amount', 'transactionId', 'paymentMethod', 'date', 'platformName', 'supportEmail', 'year'],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #333;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">{{platformName}}</h1>
      </div>
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="display: inline-block; background: #eab308; color: #000; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold;">⏳ Processing</span>
      </div>
      <h2 style="color: #fff; margin: 0 0 20px; font-size: 20px;">Withdrawal Request Received</h2>
      <p style="color: #aaa; margin: 0 0 20px; line-height: 1.6;">Hi {{firstName}},</p>
      <p style="color: #aaa; margin: 0 0 30px; line-height: 1.6;">Your withdrawal request has been submitted and is being processed.</p>
      <div style="background: #0f0f23; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
          <span style="color: #888;">Amount</span>
          <span style="color: #ef4444; font-weight: bold; font-size: 18px;">-\${{amount}}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
          <span style="color: #888;">Transaction ID</span>
          <span style="color: #fff; font-family: monospace;">{{transactionId}}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #888;">Date</span>
          <span style="color: #fff;">{{date}}</span>
        </div>
      </div>
      <p style="color: #666; font-size: 12px; margin: 0;">Processing time: 1-3 business days</p>
      <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
      <p style="color: #666; font-size: 12px; margin: 0; text-align: center;">© {{year}} {{platformName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'Withdrawal Success',
    slug: 'withdrawal_success',
    subject: 'Withdrawal Completed - \${{amount}}',
    description: 'Sent when a withdrawal is successfully processed',
    category: 'transaction',
    variables: ['firstName', 'amount', 'transactionId', 'paymentMethod', 'date', 'platformName', 'supportEmail', 'year'],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #333;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">{{platformName}}</h1>
      </div>
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="display: inline-block; background: #22c55e; color: #000; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold;">✓ Completed</span>
      </div>
      <h2 style="color: #fff; margin: 0 0 20px; font-size: 20px; text-align: center;">Withdrawal Successful!</h2>
      <p style="color: #aaa; margin: 0 0 20px; line-height: 1.6;">Hi {{firstName}},</p>
      <p style="color: #aaa; margin: 0 0 30px; line-height: 1.6;">Your withdrawal has been processed and sent to your account.</p>
      <div style="background: #0f0f23; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="color: #ef4444; font-size: 32px; font-weight: bold;">-\${{amount}}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #888;">Transaction ID</span>
          <span style="color: #fff; font-family: monospace;">{{transactionId}}</span>
        </div>
      </div>
      <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
      <p style="color: #666; font-size: 12px; margin: 0; text-align: center;">© {{year}} {{platformName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'Account Banned',
    slug: 'account_banned',
    subject: 'Account Suspended - Action Required',
    description: 'Sent when a user account is banned/suspended',
    category: 'account',
    variables: ['firstName', 'email', 'reason', 'date', 'platformName', 'supportEmail', 'year'],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #ef4444;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">{{platformName}}</h1>
      </div>
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="display: inline-block; background: #ef4444; color: #fff; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold;">🚫 Account Suspended</span>
      </div>
      <h2 style="color: #ef4444; margin: 0 0 20px; font-size: 20px;">Account Access Restricted</h2>
      <p style="color: #aaa; margin: 0 0 20px; line-height: 1.6;">Hi {{firstName}},</p>
      <p style="color: #aaa; margin: 0 0 30px; line-height: 1.6;">Your account has been suspended due to a violation of our terms of service.</p>
      <div style="background: #1a0a0a; border: 1px solid #ef4444; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
        <p style="color: #888; margin: 0 0 10px; font-size: 14px;">Reason:</p>
        <p style="color: #ef4444; margin: 0;">{{reason}}</p>
      </div>
      <p style="color: #aaa; margin: 0 0 20px; line-height: 1.6;">If you believe this is an error, please contact our support team at {{supportEmail}}</p>
      <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
      <p style="color: #666; font-size: 12px; margin: 0; text-align: center;">© {{year}} {{platformName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'Account Unbanned',
    slug: 'account_unbanned',
    subject: 'Account Reactivated - Welcome Back!',
    description: 'Sent when a user account is unbanned/reactivated',
    category: 'account',
    variables: ['firstName', 'email', 'date', 'platformName', 'loginUrl', 'supportEmail', 'year'],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #22c55e;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">{{platformName}}</h1>
      </div>
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="display: inline-block; background: #22c55e; color: #000; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold;">✓ Account Restored</span>
      </div>
      <h2 style="color: #22c55e; margin: 0 0 20px; font-size: 20px; text-align: center;">Welcome Back!</h2>
      <p style="color: #aaa; margin: 0 0 20px; line-height: 1.6;">Hi {{firstName}},</p>
      <p style="color: #aaa; margin: 0 0 30px; line-height: 1.6;">Great news! Your account has been reactivated and you can now access all features again.</p>
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="{{loginUrl}}" style="display: inline-block; background: #22c55e; color: #000; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: bold;">Login Now</a>
      </div>
      <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
      <p style="color: #666; font-size: 12px; margin: 0; text-align: center;">© {{year}} {{platformName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'KYC Submitted',
    slug: 'kyc_submitted',
    subject: '📄 KYC Documents Submitted - Under Review',
    description: 'Sent when a user submits their KYC documents for verification',
    category: 'verification',
    variables: ['firstName', 'email', 'documentType', 'submittedAt', 'platformName', 'supportEmail', 'year'],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #333;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">{{platformName}}</h1>
      </div>
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="display: inline-block; background: #f59e0b; color: #000; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold;">📄 KYC Under Review</span>
      </div>
      <h2 style="color: #fff; margin: 0 0 20px; font-size: 20px; text-align: center;">Documents Submitted Successfully</h2>
      <p style="color: #aaa; margin: 0 0 20px; line-height: 1.6;">Hi {{firstName}},</p>
      <p style="color: #aaa; margin: 0 0 30px; line-height: 1.6;">Thank you for submitting your KYC documents. Our team is now reviewing your submission.</p>
      
      <div style="background: #0f0f23; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #fff; margin: 0 0 15px; font-size: 16px;">Submission Details:</h3>
        <div style="margin-bottom: 10px;">
          <p style="color: #888; margin: 0 0 5px; font-size: 14px;">Document Type:</p>
          <p style="color: #fff; margin: 0; font-weight: bold;">{{documentType}}</p>
        </div>
        <div>
          <p style="color: #888; margin: 0 0 5px; font-size: 14px;">Submitted At:</p>
          <p style="color: #fff; margin: 0; font-weight: bold;">{{submittedAt}}</p>
        </div>
      </div>
      
      <div style="background: #1a1a0a; border: 1px solid #f59e0b; border-radius: 12px; padding: 15px; margin-bottom: 30px;">
        <p style="color: #f59e0b; margin: 0; font-size: 14px;">⏳ Verification usually takes 24-48 hours. We'll notify you once your documents are reviewed.</p>
      </div>
      
      <p style="color: #666; font-size: 12px; margin: 0;">Need help? Contact us at {{supportEmail}}</p>
      <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
      <p style="color: #666; font-size: 12px; margin: 0; text-align: center;">© {{year}} {{platformName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'KYC Approved',
    slug: 'kyc_approved',
    subject: '✅ KYC Verified - Account Fully Activated',
    description: 'Sent when admin approves user KYC documents',
    category: 'verification',
    variables: ['firstName', 'email', 'documentType', 'approvedAt', 'platformName', 'loginUrl', 'supportEmail', 'year'],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #22c55e;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">{{platformName}}</h1>
      </div>
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="display: inline-block; background: #22c55e; color: #000; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold;">✅ KYC Verified</span>
      </div>
      <h2 style="color: #22c55e; margin: 0 0 20px; font-size: 20px; text-align: center;">Identity Verified Successfully!</h2>
      <p style="color: #aaa; margin: 0 0 20px; line-height: 1.6;">Hi {{firstName}},</p>
      <p style="color: #aaa; margin: 0 0 30px; line-height: 1.6;">Congratulations! Your KYC documents have been verified and your account is now fully activated.</p>
      
      <div style="background: #0f0f23; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #fff; margin: 0 0 15px; font-size: 16px;">Verification Details:</h3>
        <div style="margin-bottom: 10px;">
          <p style="color: #888; margin: 0 0 5px; font-size: 14px;">Document Type:</p>
          <p style="color: #fff; margin: 0; font-weight: bold;">{{documentType}}</p>
        </div>
        <div>
          <p style="color: #888; margin: 0 0 5px; font-size: 14px;">Approved At:</p>
          <p style="color: #fff; margin: 0; font-weight: bold;">{{approvedAt}}</p>
        </div>
      </div>
      
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="{{loginUrl}}" style="display: inline-block; background: #22c55e; color: #000; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: bold;">Start Trading</a>
      </div>
      
      <p style="color: #666; font-size: 12px; margin: 0;">Need help? Contact us at {{supportEmail}}</p>
      <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
      <p style="color: #666; font-size: 12px; margin: 0; text-align: center;">© {{year}} {{platformName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'KYC Rejected',
    slug: 'kyc_rejected',
    subject: '❌ KYC Verification Failed - Action Required',
    description: 'Sent when admin rejects user KYC documents',
    category: 'verification',
    variables: ['firstName', 'email', 'documentType', 'rejectionReason', 'rejectedAt', 'platformName', 'loginUrl', 'supportEmail', 'year'],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #ef4444;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">{{platformName}}</h1>
      </div>
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="display: inline-block; background: #ef4444; color: #fff; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold;">❌ KYC Rejected</span>
      </div>
      <h2 style="color: #ef4444; margin: 0 0 20px; font-size: 20px; text-align: center;">Verification Failed</h2>
      <p style="color: #aaa; margin: 0 0 20px; line-height: 1.6;">Hi {{firstName}},</p>
      <p style="color: #aaa; margin: 0 0 30px; line-height: 1.6;">Unfortunately, we were unable to verify your KYC documents. Please review the reason below and resubmit.</p>
      
      <div style="background: #0f0f23; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #fff; margin: 0 0 15px; font-size: 16px;">Rejection Details:</h3>
        <div style="margin-bottom: 10px;">
          <p style="color: #888; margin: 0 0 5px; font-size: 14px;">Document Type:</p>
          <p style="color: #fff; margin: 0; font-weight: bold;">{{documentType}}</p>
        </div>
        <div style="margin-bottom: 10px;">
          <p style="color: #888; margin: 0 0 5px; font-size: 14px;">Rejection Reason:</p>
          <p style="color: #ef4444; margin: 0; font-weight: bold;">{{rejectionReason}}</p>
        </div>
        <div>
          <p style="color: #888; margin: 0 0 5px; font-size: 14px;">Rejected At:</p>
          <p style="color: #fff; margin: 0; font-weight: bold;">{{rejectedAt}}</p>
        </div>
      </div>
      
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="{{loginUrl}}" style="display: inline-block; background: #ef4444; color: #fff; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: bold;">Resubmit Documents</a>
      </div>
      
      <p style="color: #666; font-size: 12px; margin: 0;">Need help? Contact us at {{supportEmail}}</p>
      <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
      <p style="color: #666; font-size: 12px; margin: 0; text-align: center;">© {{year}} {{platformName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  }
]

// GET /api/email-templates - Get all templates
router.get('/', async (req, res) => {
  try {
    const templates = await EmailTemplate.find().sort({ category: 1, name: 1 })
    res.json({ success: true, templates })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/email-templates/:id - Get single template
router.get('/:id', async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id)
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' })
    }
    res.json({ success: true, template })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/email-templates/:id - Update template
router.put('/:id', async (req, res) => {
  try {
    const { subject, htmlContent, isEnabled } = req.body
    const template = await EmailTemplate.findByIdAndUpdate(
      req.params.id,
      { subject, htmlContent, isEnabled },
      { new: true }
    )
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' })
    }
    res.json({ success: true, template, message: 'Template updated successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/email-templates/:id/toggle - Toggle template enabled status
router.put('/:id/toggle', async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id)
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' })
    }
    template.isEnabled = !template.isEnabled
    await template.save()
    res.json({ success: true, template, message: `Template ${template.isEnabled ? 'enabled' : 'disabled'}` })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/email-templates/seed - Seed default templates
router.post('/seed', async (req, res) => {
  try {
    for (const template of defaultTemplates) {
      await EmailTemplate.findOneAndUpdate(
        { slug: template.slug },
        template,
        { upsert: true, new: true }
      )
    }
    res.json({ success: true, message: 'Default templates seeded successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/email-templates/settings/smtp - Get email settings
router.get('/settings/smtp', async (req, res) => {
  try {
    let settings = await EmailSettings.findOne()
    if (!settings) {
      settings = await EmailSettings.create({})
    }
    // Don't send password in response
    const safeSettings = {
      ...settings.toObject(),
      smtpPass: settings.smtpPass ? '********' : ''
    }
    res.json({ success: true, settings: safeSettings })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/email-templates/settings/smtp - Update email settings
router.put('/settings/smtp', async (req, res) => {
  try {
    const { smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure, fromEmail, fromName, otpVerificationEnabled, otpExpiryMinutes } = req.body
    
    let settings = await EmailSettings.findOne()
    if (!settings) {
      settings = new EmailSettings()
    }
    
    settings.smtpHost = smtpHost
    settings.smtpPort = smtpPort
    settings.smtpUser = smtpUser
    if (smtpPass && smtpPass !== '********') {
      settings.smtpPass = smtpPass
    }
    settings.smtpSecure = smtpSecure
    settings.fromEmail = fromEmail
    settings.fromName = fromName
    if (otpVerificationEnabled !== undefined) {
      settings.otpVerificationEnabled = otpVerificationEnabled
    }
    if (otpExpiryMinutes !== undefined) {
      settings.otpExpiryMinutes = otpExpiryMinutes
    }
    
    await settings.save()
    res.json({ success: true, message: 'Email settings updated successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/email-templates/settings/toggle-smtp - Toggle SMTP on/off
router.put('/settings/toggle-smtp', async (req, res) => {
  try {
    let settings = await EmailSettings.findOne()
    if (!settings) {
      settings = new EmailSettings()
    }
    settings.smtpEnabled = !settings.smtpEnabled
    await settings.save()
    res.json({ 
      success: true, 
      smtpEnabled: settings.smtpEnabled,
      message: settings.smtpEnabled ? 'SMTP enabled' : 'SMTP disabled'
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/email-templates/settings/test - Test SMTP connection
router.post('/settings/test', async (req, res) => {
  try {
    const result = await testSMTPConnection()
    res.json(result)
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/email-templates/settings/send-test - Send a test email
router.post('/settings/send-test', async (req, res) => {
  try {
    const { toEmail } = req.body
    if (!toEmail) {
      return res.status(400).json({ success: false, message: 'Email address is required' })
    }

    const settings = await EmailSettings.findOne()
    if (!settings || !settings.smtpHost) {
      return res.status(400).json({ success: false, message: 'SMTP settings not configured' })
    }

    const nodemailer = await import('nodemailer')
    
    // Port 465 = SSL, Port 587 = STARTTLS (secure should be false)
    const useSecure = settings.smtpPort === 465 ? true : settings.smtpSecure
    
    const transporter = nodemailer.default.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: useSecure,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPass
      },
      tls: {
        rejectUnauthorized: false
      }
    })

    const mailOptions = {
      from: '"' + settings.fromName + '" <' + settings.fromEmail + '>',
      to: toEmail,
      subject: 'Test Email - SMTP Configuration Working!',
      html: '<!DOCTYPE html><html><body style="margin: 0; padding: 40px; background-color: #0a0a0a; font-family: Arial, sans-serif;"><div style="max-width: 500px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #333;"><h1 style="color: #22c55e; margin: 0 0 20px; text-align: center;">✓ Test Successful!</h1><p style="color: #aaa; margin: 0 0 20px; line-height: 1.6; text-align: center;">Your SMTP configuration is working correctly.</p><div style="background: #0f0f23; border-radius: 8px; padding: 15px; margin-bottom: 20px;"><p style="color: #888; margin: 0 0 5px; font-size: 12px;">SMTP Host</p><p style="color: #fff; margin: 0;">' + settings.smtpHost + ':' + settings.smtpPort + '</p></div><p style="color: #666; font-size: 12px; margin: 0; text-align: center;">Sent at ' + new Date().toLocaleString() + '</p></div></body></html>'
    }

    await transporter.sendMail(mailOptions)
    res.json({ success: true, message: 'Test email sent to ' + toEmail })
  } catch (error) {
    console.error('Send test email error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/email-templates/:id/test - Send a test email using specific template
router.post('/:id/test', async (req, res) => {
  try {
    const { toEmail } = req.body
    if (!toEmail) {
      return res.status(400).json({ success: false, message: 'Email address is required' })
    }

    const template = await EmailTemplate.findById(req.params.id)
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' })
    }

    const settings = await EmailSettings.findOne()
    if (!settings || !settings.smtpHost) {
      return res.status(400).json({ success: false, message: 'SMTP settings not configured' })
    }

    const nodemailer = await import('nodemailer')
    const useSecure = settings.smtpPort === 465
    
    const transporter = nodemailer.default.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: useSecure,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPass
      },
      tls: { rejectUnauthorized: false }
    })

    // Generate sample data for template variables
    const sampleData = {
      firstName: 'John',
      email: toEmail,
      otp: '123456',
      expiryMinutes: '10',
      amount: '500.00',
      transactionId: 'TXN' + Date.now(),
      paymentMethod: 'Bank Transfer',
      date: new Date().toLocaleDateString(),
      newBalance: '1,500.00',
      platformName: settings.fromName || 'Trading Platform',
      supportEmail: settings.fromEmail || 'support@example.com',
      loginUrl: 'http://localhost:5173/login',
      reason: 'Violation of terms of service',
      year: new Date().getFullYear().toString()
    }

    // Replace variables in template
    let subject = template.subject
    let html = template.htmlContent
    for (const [key, value] of Object.entries(sampleData)) {
      const regex = new RegExp('{{' + key + '}}', 'g')
      subject = subject.replace(regex, value)
      html = html.replace(regex, value)
    }

    const mailOptions = {
      from: '"' + settings.fromName + '" <' + settings.fromEmail + '>',
      to: toEmail,
      subject: '[TEST] ' + subject,
      html: html
    }

    await transporter.sendMail(mailOptions)
    res.json({ success: true, message: 'Test email sent to ' + toEmail })
  } catch (error) {
    console.error('Send template test email error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// DELETE /api/email-templates/:id - Delete a template
router.delete('/:id', async (req, res) => {
  try {
    const template = await EmailTemplate.findByIdAndDelete(req.params.id)
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' })
    }
    res.json({ success: true, message: 'Template deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/email-templates/reset - Reset all templates (delete all and reseed)
router.post('/reset', async (req, res) => {
  try {
    await EmailTemplate.deleteMany({})
    for (const template of defaultTemplates) {
      await EmailTemplate.create(template)
    }
    res.json({ success: true, message: 'All templates reset to defaults' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/email-templates/sync - Sync templates (add missing, update existing)
router.post('/sync', async (req, res) => {
  try {
    let added = 0
    let updated = 0
    for (const template of defaultTemplates) {
      const existing = await EmailTemplate.findOne({ slug: template.slug })
      if (existing) {
        // Update only if not customized (check if htmlContent matches default)
        updated++
      } else {
        await EmailTemplate.create(template)
        added++
      }
    }
    res.json({ success: true, message: `Sync complete: ${added} added, ${updated} existing` })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router



