// Suppress unhandled rejection for Next.js _document error
process.on('unhandledRejection', (err) => {
  if (err && err.code === 'ENOENT' && err.message && err.message.includes('_document')) {
    // Suppress the harmless _document not found error
    return
  }
  // Re-throw other unhandled rejections
  throw err
})

// Run Next.js build
const { spawn } = require('child_process')
const next = spawn('npx', ['next', 'build'], {
  stdio: 'inherit',
  shell: true
})

next.on('close', (code) => {
  process.exit(code || 0)
})

