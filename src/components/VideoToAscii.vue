<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const asciiRef = ref<HTMLPreElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const isPlaying = ref(false)
const isLoading = ref(false)
const fontSize = ref(8)
const contrast = ref(1)

// 可选择不同的字符集
const charSets = {
  detailed: '@#W$9876543210?!abc;:+=-,._ ',
  simple: '@%#*+=-:. ',
  blocks: '█▓▒░ ',
}
const selectedCharSet = ref<keyof typeof charSets>('detailed')

// 计算当前使用的字符集
const ASCII_CHARS = computed(() => charSets[selectedCharSet.value])
const ASCII_WIDTH = ref(100)
const colorMode = ref<'green' | 'original' | 'grayscale'>('green')
const colorIntensity = ref(1)

// 添加新的状态控制
const volume = ref(1)
const playbackRate = ref(1)
const currentTime = ref(0)
const duration = ref(0)

// 添加导出相关的状态
const isExporting = ref(false)
const exportProgress = ref(0)

// 添加视频时间更新处理
const handleTimeUpdate = () => {
  if (videoRef.value) {
    currentTime.value = videoRef.value.currentTime
  }
}

// 添加视频加载后处理
const handleLoadedMetadata = () => {
  if (videoRef.value) {
    duration.value = videoRef.value.duration
  }
}

// 添加进度条控制
const handleSeek = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (videoRef.value) {
    videoRef.value.currentTime = Number(input.value)
  }
}

// 添加音量控制
const handleVolumeChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (videoRef.value) {
    videoRef.value.volume = Number(input.value)
    volume.value = Number(input.value)
  }
}

// 添加播放速度控制
const handlePlaybackRateChange = (event: Event) => {
  const select = event.target as HTMLSelectElement
  if (videoRef.value) {
    videoRef.value.playbackRate = Number(select.value)
    playbackRate.value = Number(select.value)
  }
}

// 格式化时间显示
const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60)
  const seconds = Math.floor(time % 60)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

const handleFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    isLoading.value = true
    const file = input.files[0]
    const videoUrl = URL.createObjectURL(file)

    if (videoRef.value) {
      videoRef.value.src = videoUrl
      await new Promise((resolve) => {
        videoRef.value!.onloadeddata = resolve
      })
      try {
        await videoRef.value.play()
        isPlaying.value = true
        processFrame()
      } catch (error) {
        console.error('视频播放失败:', error)
      } finally {
        isLoading.value = false
      }
    }
  }
}

const togglePlay = async () => {
  if (!videoRef.value) return

  if (isPlaying.value) {
    videoRef.value.pause()
    isPlaying.value = false
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  } else {
    await videoRef.value.play()
    isPlaying.value = true
    processFrame()
  }
}

const getAsciiChar = (brightness: number): string => {
  const adjustedBrightness = Math.pow(brightness, contrast.value)
  const chars = ASCII_CHARS.value
  const charIndex = Math.floor(adjustedBrightness * (chars.length - 1))
  return chars[charIndex]
}

const getPixelColor = (r: number, g: number, b: number): string => {
  switch (colorMode.value) {
    case 'original':
      const intensity = colorIntensity.value
      return `rgb(${r * intensity}, ${g * intensity}, ${b * intensity})`
    case 'green':
      return `rgb(0, ${Math.floor(((r + g + b) / 3) * colorIntensity.value)}, 0)`
    case 'grayscale':
      const gray = Math.floor(((r + g + b) / 3) * colorIntensity.value)
      return `rgb(${gray}, ${gray}, ${gray})`
    default:
      return '#33ff33'
  }
}

// 优化帧处理
const processFrame = () => {
  if (!videoRef.value || !canvasRef.value || !asciiRef.value || !isPlaying.value) {
    return
  }

  // 添加帧率控制
  const now = performance.now()
  const elapsed = now - lastFrameTime

  if (elapsed < frameInterval.value) {
    animationFrameId = requestAnimationFrame(processFrame)
    return
  }

  lastFrameTime = now

  const ctx = canvasRef.value.getContext('2d')
  if (!ctx) return

  const video = videoRef.value
  const canvas = canvasRef.value

  if (video.readyState < 2) {
    animationFrameId = requestAnimationFrame(processFrame)
    return
  }

  const ratio = video.videoHeight / video.videoWidth
  const asciiWidth = ASCII_WIDTH.value
  const asciiHeight = Math.floor(asciiWidth * ratio * 0.5)

  canvas.width = asciiWidth
  canvas.height = asciiHeight

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const pixels = imageData.data

  let coloredAsciiArt = document.createElement('div')
  coloredAsciiArt.style.lineHeight = fontSize.value + 'px'

  for (let y = 0; y < canvas.height; y++) {
    const lineDiv = document.createElement('div')
    lineDiv.style.height = fontSize.value + 'px'
    for (let x = 0; x < canvas.width; x++) {
      const offset = (y * canvas.width + x) * 4
      const r = pixels[offset]
      const g = pixels[offset + 1]
      const b = pixels[offset + 2]
      const brightness = (r + g + b) / (3 * 255)

      const char = getAsciiChar(brightness)
      const span = document.createElement('span')
      span.textContent = char
      span.style.color = getPixelColor(r, g, b)
      lineDiv.appendChild(span)
    }
    coloredAsciiArt.appendChild(lineDiv)
  }

  if (asciiRef.value) {
    asciiRef.value.innerHTML = ''
    asciiRef.value.appendChild(coloredAsciiArt)
  }

  animationFrameId = requestAnimationFrame(processFrame)
}

let animationFrameId: number | null = null

onMounted(() => {
  // 移除之前的事件监听器，因为我们现在在handleFileChange中直接处理播放
})

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }
  if (videoRef.value?.src) {
    URL.revokeObjectURL(videoRef.value.src)
  }
})

// 添加帧率控制变量
const FPS = ref(30)
const frameInterval = computed(() => 1000 / FPS.value)
let lastFrameTime = 0

// 添加导出单帧的函数
const renderFrameToText = async (time: number) => {
  if (!videoRef.value || !canvasRef.value) return ''

  // 设置视频时间
  videoRef.value.currentTime = time

  // 等待视频更新到指定时间
  await new Promise<void>((resolve) => {
    const onSeeked = () => {
      videoRef.value?.removeEventListener('seeked', onSeeked)
      resolve()
    }
    videoRef.value?.addEventListener('seeked', onSeeked)
  })

  const ctx = canvasRef.value.getContext('2d')
  if (!ctx) return ''

  const ratio = videoRef.value.videoHeight / videoRef.value.videoWidth
  const asciiWidth = ASCII_WIDTH.value
  const asciiHeight = Math.floor(asciiWidth * ratio * 0.5)

  canvasRef.value.width = asciiWidth
  canvasRef.value.height = asciiHeight

  ctx.drawImage(videoRef.value, 0, 0, asciiWidth, asciiHeight)
  const imageData = ctx.getImageData(0, 0, asciiWidth, asciiHeight)
  const pixels = imageData.data

  let frameText = ''
  for (let y = 0; y < asciiHeight; y++) {
    for (let x = 0; x < asciiWidth; x++) {
      const offset = (y * asciiWidth + x) * 4
      const r = pixels[offset]
      const g = pixels[offset + 1]
      const b = pixels[offset + 2]
      const brightness = (r + g + b) / (3 * 255)
      frameText += getAsciiChar(brightness)
    }
    frameText += '\n'
  }

  return frameText
}

// 添加导出所有帧的函数
const exportAllFrames = async () => {
  if (!videoRef.value || isExporting.value) return

  const wasPlaying = isPlaying.value
  if (wasPlaying) {
    await togglePlay()
  }

  try {
    isExporting.value = true
    exportProgress.value = 0

    // 计算总帧数
    const fps = 10 // 每秒导出10帧
    const duration = videoRef.value.duration
    const totalFrames = Math.floor(duration * fps)
    const timeIncrement = duration / totalFrames

    let allFramesText = ''

    // 添加视频信息头
    allFramesText += `ASCII Video Export\n`
    allFramesText += `Resolution: ${ASCII_WIDTH.value}x${Math.floor(ASCII_WIDTH.value * 0.5)}\n`
    allFramesText += `Duration: ${formatTime(duration)}\n`
    allFramesText += `Frames: ${totalFrames}\n`
    allFramesText += `Character Set: ${selectedCharSet.value}\n`
    allFramesText += `=`.repeat(ASCII_WIDTH.value) + '\n\n'

    // 导每一帧
    for (let i = 0; i < totalFrames; i++) {
      const time = i * timeIncrement
      const frameText = await renderFrameToText(time)

      // 添加帧分隔符和时间戳
      allFramesText += `Frame ${i + 1} - ${formatTime(time)}\n`
      allFramesText += frameText
      allFramesText += `=`.repeat(ASCII_WIDTH.value) + '\n\n'

      // 更新进度
      exportProgress.value = ((i + 1) / totalFrames) * 100
    }

    // 创建并下载文本文件
    const blob = new Blob([allFramesText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ascii-video-frames-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)

  } catch (error) {
    console.error('导出失败:', error)
    alert('导出失败，请重试')
  } finally {
    isExporting.value = false
    exportProgress.value = 0

    // 恢复播放状态
    if (wasPlaying) {
      await togglePlay()
    }
  }
}

// 添加拖拽处理
const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  const label = event.currentTarget as HTMLElement
  label.classList.add('drag-over')
}

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault()
  const label = event.currentTarget as HTMLElement
  label.classList.remove('drag-over')
}

const handleDrop = async (event: DragEvent) => {
  event.preventDefault()
  const label = event.currentTarget as HTMLElement
  label.classList.remove('drag-over')

  if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
    const file = event.dataTransfer.files[0]
    if (file.type.startsWith('video/')) {
      if (fileInput.value) {
        // 创建新的 FileList 对象
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        fileInput.value.files = dataTransfer.files

        // 触发 change 事件
        const changeEvent = new Event('change')
        fileInput.value.dispatchEvent(changeEvent)
      }
    } else {
      alert('请选择视频文件')
    }
  }
}
</script>

<template>
  <div class="video-ascii-container">
    <div class="controls">
      <div class="file-input-wrapper">
        <label for="video-file" class="file-input-label" @dragover="handleDragOver" @dragleave="handleDragLeave"
          @drop="handleDrop">
          <div class="file-input-content">
            <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span class="file-input-text">
              {{ fileInput?.files?.[0]?.name || '选择视频文件' }}
            </span>
          </div>
        </label>
        <input ref="fileInput" type="file" id="video-file" accept="video/*" @change="handleFileChange"
          class="file-input" />
      </div>

      <div class="settings">
        <div class="setting-item">
          <label>字符集：</label>
          <select v-model="selectedCharSet">
            <option value="detailed">详细</option>
            <option value="simple">简单</option>
            <option value="blocks">方块</option>
          </select>
        </div>

        <div class="setting-item">
          <label>字体大小：</label>
          <input type="range" v-model="fontSize" min="6" max="12" step="1" />
        </div>

        <div class="setting-item">
          <label>对比度：</label>
          <input type="range" v-model="contrast" min="0.5" max="2" step="0.1" />
        </div>

        <div class="setting-item">
          <label>分辨率：</label>
          <input type="range" v-model="ASCII_WIDTH" min="50" max="200" step="10" />
          <span>{{ ASCII_WIDTH }}x{{ Math.floor(ASCII_WIDTH * 0.5) }}</span>
        </div>

        <div class="setting-item">
          <label>颜色模式：</label>
          <select v-model="colorMode">
            <option value="green">绿色终端</option>
            <option value="original">原始颜色</option>
            <option value="grayscale">灰度</option>
          </select>
        </div>

        <div class="setting-item">
          <label>颜色强度：</label>
          <input type="range" v-model="colorIntensity" min="0.5" max="2" step="0.1" />
        </div>
      </div>

      <button class="play-button" @click="togglePlay" :disabled="!videoRef?.src">
        {{ isPlaying ? '暂停' : '播放' }}
      </button>

      <!-- 添加视频控制面板 -->
      <div class="video-controls">
        <div class="time-control">
          <span>{{ formatTime(currentTime) }}</span>
          <input type="range" :min="0" :max="duration" :value="currentTime" @input="handleSeek" class="time-slider" />
          <span>{{ formatTime(duration) }}</span>
        </div>

        <div class="playback-controls">
          <div class="setting-item">
            <label>音量：</label>
            <input type="range" :value="volume" min="0" max="1" step="0.1" @input="handleVolumeChange" />
          </div>

          <div class="setting-item">
            <label>播放速度：</label>
            <select :value="playbackRate" @change="handlePlaybackRateChange">
              <option value="0.5">0.5x</option>
              <option value="1">1.0x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2.0x</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="video-container">
      <video ref="videoRef" style="display: none" muted loop @timeupdate="handleTimeUpdate"
        @loadedmetadata="handleLoadedMetadata"></video>

      <canvas ref="canvasRef" style="display: none"></canvas>

      <div class="ascii-container">
        <div v-if="isLoading" class="loading">加载中...</div>
        <div class="ascii-wrapper">
          <pre ref="asciiRef" class="ascii-output"
            :style="{ fontSize: `${fontSize}px`, lineHeight: `${fontSize}px` }"></pre>
        </div>
      </div>
    </div>

    <!-- 添加导出按钮和进度条 -->
    <div class="export-controls">
      <button class="export-button" @click="exportAllFrames" :disabled="!videoRef?.src || isExporting">
        {{ isExporting ? `导出中 ${exportProgress.toFixed(1)}%` : '导出所有帧' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.video-ascii-container {
  font-family: var(--font-sans);
  padding: var(--spacing-4);
}

.controls {
  padding: var(--spacing-6);
  border-radius: var(--radius-lg);
  background: linear-gradient(to bottom right,
      var(--bg-secondary),
      var(--bg-tertiary));
}

.settings {
  margin: var(--spacing-6) 0;
}

.video-controls {
  margin-top: var(--spacing-6);
}

.file-input-wrapper {
  width: 95%;
  margin-bottom: 1.5rem;
}

.file-input {
  width: 0.1px;
  height: 0.1px;
  opacity: 0;
  overflow: hidden;
  position: absolute;
  z-index: -1;
}

.file-input-label {
  display: block;
  cursor: pointer;
  width: 100%;
  padding: var(--spacing-6);
  border-radius: var(--radius-lg);
  font-family: var(--font-sans);
  border: 2px dashed var(--border-color);
  background: var(--control-bg);
  box-shadow: var(--shadow-sm);
  transition: all 0.3s ease;
}

.file-input-label:hover {
  border-color: var(--accent-light);
  background: var(--control-hover);
  box-shadow: var(--shadow-md);
}

.file-input-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: var(--text-secondary);
}

.upload-icon {
  width: 2.5rem;
  height: 2.5rem;
  stroke-width: 2;
  color: var(--accent-color);
}

.file-input-text {
  font-size: var(--text-base);
  font-weight: 500;
  letter-spacing: 0.01em;
  text-align: center;
  word-break: break-word;
  max-width: 100%;
}

/* 拖拽状态样式 */
.file-input-label.drag-over {
  border-color: var(--accent-color);
  background: rgba(66, 184, 131, 0.15);
  transform: scale(1.01);
}

/* 设置项样式 */
.setting-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  margin-bottom: 1rem;
}

.setting-item label {
  font-size: var(--text-sm);
  font-weight: 500;
  letter-spacing: 0.01em;
  color: var(--text-secondary);
}

/* 滑动条样式 */
input[type="range"] {
  -webkit-appearance: none;
  width: 100%;
  height: 4px;
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  outline: none;
  transition: all 0.2s ease;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  margin-top: -6px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-color) 0%, var(--accent-dark) 100%);
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease;
}

input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: var(--shadow-md);
}

/* 下拉框样式 */
select {
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;
  box-shadow: var(--shadow-sm);
}

select:hover {
  border-color: var(--accent-color);
  box-shadow: var(--shadow-md);
}

select:focus {
  outline: 2px solid var(--accent-light);
  outline-offset: 2px;
}

/* 时间控制样式 */
.time-control {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.time-control span {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  min-width: 4rem;
}

.time-slider {
  flex: 1;
}

/* 播放控制样式 */
.playback-controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

/* 导出按钮样式 */
.export-button {
  background: linear-gradient(135deg, var(--success) 0%, var(--accent-color) 100%);
  min-width: 150px;
}

.export-button:disabled {
  background: linear-gradient(135deg, var(--text-tertiary) 0%, var(--text-secondary) 100%);
}

/* 加载状态样式 */
.loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-family: var(--font-sans);
  font-size: var(--text-lg);
  padding: var(--spacing-4) var(--spacing-6);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(4px);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .video-ascii-container {
    padding: var(--spacing-2);
  }

  .controls {
    padding: var(--spacing-4);
  }

  .file-input-label {
    padding: var(--spacing-4);
  }

  button {
    padding: var(--spacing-3) var(--spacing-4);
  }

  .ascii-output {
    padding: var(--spacing-4);
  }
}

/* 添加组件间距 */
.settings {
  margin: var(--spacing-6) 0;
}

.video-controls {
  margin-top: var(--spacing-6);
}

/* 添加过渡效果 */
.setting-item,
button,
select,
.file-input-label {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 添加悬浮效果 */
.setting-item:hover label {
  color: var(--accent-color);
}

/* 添加动画效果 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.video-ascii-container {
  animation: fadeIn 0.3s ease-out;
}

/* 响应式优化 */
@media (max-width: 768px) {
  .video-ascii-container {
    padding: var(--spacing-2);
  }

  .controls {
    padding: var(--spacing-4);
  }

  .file-input-label {
    padding: var(--spacing-4);
  }

  button {
    padding: var(--spacing-3) var(--spacing-4);
  }

  .ascii-output {
    padding: var(--spacing-4);
  }
}

/* 按钮样式 */
button {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  padding: var(--spacing-3) var(--spacing-6);
  border-radius: var(--radius-md);
  letter-spacing: 0.01em;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  background: linear-gradient(135deg, var(--accent-color) 0%, var(--accent-dark) 100%);
  color: white;
  box-shadow: var(--shadow-sm);
}

button:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

button:disabled {
  background: linear-gradient(135deg, var(--text-tertiary) 0%, var(--text-secondary) 100%);
  box-shadow: none;
}

/* 文件输入框样式 */
.file-input-wrapper {
  width: 95%;
  margin-bottom: 1.5rem;
}

.file-input {
  width: 0.1px;
  height: 0.1px;
  opacity: 0;
  overflow: hidden;
  position: absolute;
  z-index: -1;
}

.file-input-label {
  display: block;
  cursor: pointer;
  width: 100%;
  padding: var(--spacing-6);
  border-radius: var(--radius-lg);
  font-family: var(--font-sans);
  border: 2px dashed var(--border-color);
  background: var(--control-bg);
  box-shadow: var(--shadow-sm);
  transition: all 0.3s ease;
}

.file-input-label:hover {
  border-color: var(--accent-light);
  background: var(--control-hover);
  box-shadow: var(--shadow-md);
}

.file-input-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: var(--text-secondary);
}

.upload-icon {
  width: 2.5rem;
  height: 2.5rem;
  stroke-width: 2;
  color: var(--accent-color);
}

.file-input-text {
  font-size: var(--text-base);
  font-weight: 500;
  letter-spacing: 0.01em;
  text-align: center;
  word-break: break-word;
  max-width: 100%;
}

/* 拖拽状态样式 */
.file-input-label.drag-over {
  border-color: var(--accent-color);
  background: rgba(66, 184, 131, 0.15);
  transform: scale(1.01);
}

/* 设置项样式 */
.setting-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  margin-bottom: 1rem;
}

.setting-item label {
  font-size: var(--text-sm);
  font-weight: 500;
  letter-spacing: 0.01em;
  color: var(--text-secondary);
}

/* 滑动条样式 */
input[type="range"] {
  -webkit-appearance: none;
  width: 100%;
  height: 4px;
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  outline: none;
  transition: all 0.2s ease;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  margin-top: -6px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-color) 0%, var(--accent-dark) 100%);
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease;
}

input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: var(--shadow-md);
}

/* 下拉框样式 */
select {
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;
  box-shadow: var(--shadow-sm);
}

select:hover {
  border-color: var(--accent-color);
  box-shadow: var(--shadow-md);
}

select:focus {
  outline: 2px solid var(--accent-light);
  outline-offset: 2px;
}

/* 时间控制样式 */
.time-control {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.time-control span {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  min-width: 4rem;
}

.time-slider {
  flex: 1;
}

/* 播放控制样式 */
.playback-controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

/* 导出按钮样式 */
.export-button {
  background: linear-gradient(135deg, var(--success) 0%, var(--accent-color) 100%);
  min-width: 150px;
}

.export-button:disabled {
  background: linear-gradient(135deg, var(--text-tertiary) 0%, var(--text-secondary) 100%);
}

/* 加载状态样式 */
.loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-family: var(--font-sans);
  font-size: var(--text-lg);
  padding: var(--spacing-4) var(--spacing-6);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(4px);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .playback-controls {
    grid-template-columns: 1fr;
  }

  .time-control {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }

  .time-control span {
    text-align: center;
  }

  button {
    width: 100%;
    padding: var(--spacing-3) var(--spacing-4);
  }
}

/* 视频容器样式 */
.video-container {
  width: 100%;
  margin: var(--spacing-6) 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* ASCII 容器样式 */
.ascii-container {
  width: 100%;
  max-width: 1200px;
  aspect-ratio: 16 / 9;
  position: relative;
  background: #000000;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
}

/* ASCII 包装器样式 */
.ascii-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
  background: #000000;
  border: 1px solid var(--border-color);

  /* 自定义滚动条颜色 */
  scrollbar-width: thin;
  scrollbar-color: var(--accent-color) #1a1a1a;
}

.ascii-wrapper::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.ascii-wrapper::-webkit-scrollbar-track {
  background: #1a1a1a;
}

.ascii-wrapper::-webkit-scrollbar-thumb {
  background-color: var(--accent-color);
  border-radius: var(--radius-sm);
  border: 2px solid #1a1a1a;
}

/* ASCII 输出样式 */
.ascii-output {
  min-width: 100%;
  min-height: 100%;
  margin: 0;
  padding: var(--spacing-4);
  box-sizing: border-box;
  font-family: var(--font-mono);
  white-space: pre;
  color: var(--ascii-color, #33ff33);
  background: transparent;
}

/* 加载状态样式 */
.loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  padding: var(--spacing-4) var(--spacing-6);
  background: rgba(0, 0, 0, 0.8);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  color: var(--accent-color);
  font-weight: 500;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* 移除暗色模式特殊处理，因为我们现在始终使用黑色背景 */
@media (prefers-color-scheme: dark) {
  .ascii-wrapper {
    background: #000000;
  }
}
</style>
