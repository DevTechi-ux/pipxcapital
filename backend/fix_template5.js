import fs from 'fs'

// Read the file as binary to see exact characters
const buffer = fs.readFileSync('routes/emailTemplates.js')
const content = buffer.toString('utf8')

// Log the exact bytes around line 76
const lines = content.split('\n')
console.log('Line 76 (hex):', Buffer.from(lines[75]).toString('hex'))
console.log('Line 76 (raw):', JSON.stringify(lines[75]))

// Fix the issue
const fixedContent = content.replace(/\$\{fundSize\}/g, '{fundSize}')
fs.writeFileSync('routes/emailTemplates.js', fixedContent)

// Verify
const verifyContent = fs.readFileSync('routes/emailTemplates.js', 'utf8')
const verifyLines = verifyContent.split('\n')
console.log('After fix - Line 76:', JSON.stringify(verifyLines[75]))
