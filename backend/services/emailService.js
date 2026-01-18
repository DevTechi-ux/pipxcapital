import nodemailer from 'nodemailer'
import EmailSettings from '../models/EmailSettings.js'
import EmailTemplate from '../models/EmailTemplate.js'

let transporter = null

// Initialize or get transporter
const getTransporter = async () => {
  const settings = await EmailSettings.findOne()
  
  if (!settings || !settings.smtpHost || !settings.smtpUser) {
    return null
  }

  // Port 465 = SSL (secure: true), Port 587 = STARTTLS (secure: false)
  const useSecure = settings.smtpPort === 465

  transporter = nodemailer.createTransport({
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

  return transporter
}

// Replace template variables
const replaceVariables = (content, variables) => {
  let result = content
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g')
    result = result.replace(regex, value || '')
  }
  return result
}

// Send email using template
export const sendTemplateEmail = async (templateSlug, toEmail, variables = {}) => {
  try {
    const settings = await EmailSettings.findOne()
    
    // Check if SMTP is enabled
    if (!settings || !settings.smtpEnabled) {
      console.log('SMTP is disabled, skipping email')
      return { success: false, message: 'SMTP is disabled' }
    }
    
    if (!settings.smtpHost) {
      console.log('Email settings not configured')
      return { success: false, message: 'Email settings not configured' }
    }

    const template = await EmailTemplate.findOne({ slug: templateSlug })
    if (!template) {
      console.log(`Template not found: ${templateSlug}`)
      return { success: false, message: 'Template not found' }
    }

    if (!template.isEnabled) {
      console.log(`Template disabled: ${templateSlug}`)
      return { success: false, message: 'Template is disabled' }
    }

    const transport = await getTransporter()
    if (!transport) {
      return { success: false, message: 'Failed to create email transport' }
    }

    const subject = replaceVariables(template.subject, variables)
    const html = replaceVariables(template.htmlContent, variables)

    const mailOptions = {
      from: `"${settings.fromName}" <${settings.fromEmail}>`,
      to: toEmail,
      subject: subject,
      html: html
    }

    const info = await transport.sendMail(mailOptions)
    console.log('Email sent:', info.messageId)
    
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, message: error.message }
  }
}

// Generate OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Check if OTP verification is enabled (requires both SMTP and OTP to be enabled)
export const isOTPEnabled = async () => {
  const settings = await EmailSettings.findOne()
  // OTP is only enabled if both SMTP is enabled AND OTP verification is enabled
  if (!settings) return false
  return settings.smtpEnabled && settings.otpVerificationEnabled
}

// Get OTP expiry in minutes
export const getOTPExpiry = () => {
  return 10 // Default 10 minutes
}

// Test SMTP connection
export const testSMTPConnection = async () => {
  try {
    const transport = await getTransporter()
    if (!transport) {
      return { success: false, message: 'SMTP not configured' }
    }
    
    await transport.verify()
    return { success: true, message: 'SMTP connection successful' }
  } catch (error) {
    return { success: false, message: error.message }
  }
}

export default {
  sendTemplateEmail,
  generateOTP,
  isOTPEnabled,
  getOTPExpiry,
  testSMTPConnection
}
