import fs from 'fs'

const content = fs.readFileSync('routes/emailTemplates.js', 'utf8')
console.log('Looking for:', '${fundSize}')
console.log('Found at position:', content.indexOf('${fundSize}'))

// The issue is that it's inside a template literal string in JavaScript
// We need to escape the $ in the template literal
const fixed = content.replace(/`[^`]*\$\{fundSize\}[^`]*`/g, (match) => {
  return match.replace(/\$\{fundSize\}/g, '{{fundSize}}')
})

fs.writeFileSync('routes/emailTemplates.js', fixed)
console.log('Fixed template literal syntax')
