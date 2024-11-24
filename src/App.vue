<script setup lang="ts">
import VideoToAscii from './components/VideoToAscii.vue'
import ThemeToggle from './components/ThemeToggle.vue'
</script>

<template>
  <div class="container">
    <ThemeToggle />
    <h1>ASCII Video Player</h1>
    <VideoToAscii />
  </div>
</template>

<style scoped>
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  position: relative;
}

h1 {
  text-align: center;
  margin-bottom: 2rem;
  color: var(--text-primary);
  font-size: var(--text-xl);
  font-weight: 600;
}

@media (max-width: 768px) {
  .container {
    padding: 10px;
  }
  
  h1 {
    font-size: var(--text-lg);
    margin-bottom: 1.5rem;
  }
}
</style>
