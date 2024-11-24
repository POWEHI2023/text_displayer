const fs = require('fs')
const path = require('path')

const workerPath = path.resolve(__dirname, 'node_modules/gif.js/dist/gif.worker.js')
const destPath = path.resolve(__dirname, 'public/gif.worker.js')

// 确保 public 目录存在
const publicDir = path.resolve(__dirname, 'public')
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
}

// 复制文件
try {
    fs.copyFileSync(workerPath, destPath)
    console.log('gif.worker.js has been copied to public directory')
} catch (error) {
    console.error('Error copying gif.worker.js:', error)
    process.exit(1)
} 