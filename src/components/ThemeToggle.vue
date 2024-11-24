<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

const isDark = ref(false)

// 初始化主题
onMounted(() => {
  // 检查系统主题偏好
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  // 检查本地存储的主题设置
  const savedTheme = localStorage.getItem('theme')
  
  isDark.value = savedTheme === 'dark' || (savedTheme === null && prefersDark)
  updateTheme(isDark.value)
})

// 监听主题变化
watch(isDark, (newValue) => {
  updateTheme(newValue)
  localStorage.setItem('theme', newValue ? 'dark' : 'light')
})

// 更新主题
const updateTheme = (dark: boolean) => {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
}

// 切换主题
const toggleTheme = () => {
  isDark.value = !isDark.value
}
</script>

<template>
  <button class="theme-toggle" @click="toggleTheme" type="button" :title="isDark ? '切换到亮色模式' : '切换到暗色模式'">
    <!-- 月亮图标 (暗色模式) -->
    <svg v-if="!isDark" class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
    <!-- 太阳图标 (亮色模式) -->
    <svg v-else class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  </button>
</template>

<style scoped>
.theme-toggle {
  position: fixed;
  top: var(--spacing-4);
  right: var(--spacing-4);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  z-index: 1000;
  padding: 0;
  box-shadow: var(--shadow-md);
}

.theme-toggle:hover {
  background: var(--bg-tertiary);
  transform: scale(1.1);
}

.theme-icon {
  width: 20px;
  height: 20px;
  transition: transform 0.3s ease;
}

.theme-toggle:hover .theme-icon {
  transform: rotate(30deg);
}
</style> 