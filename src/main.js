import { createApp, ref, computed, onMounted, onUnmounted, watch } from 'vue'
import App from './App.vue'
import './style.css'

const app = createApp(App)
app.mount('#app')

// 导出 Vue 组合式 API，供组件使用
export { ref, computed, onMounted, onUnmounted, watch } 