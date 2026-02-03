<template>
  <div class="app-layout">
    <aside class="sidebar">
      <div class="logo-area">
        <div class="logo-icon">🐞</div>
      </div>

      <nav class="nav-menu">
        <div class="nav-item" :class="{ active: route.path === '/' }" title="Dashboard" @click="goTo('/')">
          <el-icon>
            <HomeFilled />
          </el-icon>
        </div>

        <div class="nav-item" :class="{ active: route.path === '/analysis' }" title="Analysis"
          @click="goTo('/analysis')">
          <el-icon>
            <PieChart />
          </el-icon>
        </div>

        <div class="nav-item" :class="{ active: route.path === '/settings' }" title="Settings"
          @click="goTo('/settings')">
          <el-icon>
            <Setting />
          </el-icon>
        </div>
      </nav>

      <!--可扩展：登录功能-->
      <!-- <div class="user-area">
        <el-avatar :size="40" src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png"
          class="avatar-shadow" />
      </div> -->
    </aside>

    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="fade-slide" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup lang="ts">
import { HomeFilled, PieChart, Setting } from '@element-plus/icons-vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// 跳转方法
const goTo = (path: string) => {
  router.push(path)
}
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  background-color: var(--bg-color);
}

/* 侧边栏样式 */
.sidebar {
  width: 88px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 0;
  flex-shrink: 0;
}

.logo-icon {
  font-size: 24px;
  background: var(--accent-black);
  color: #fff;
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.nav-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.nav-item {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  color: #9CA3AF;
  font-size: 22px;
  cursor: pointer;
  transition: all 0.3s;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.6);
  color: var(--accent-black);
}

.nav-item.active {
  background: #fff;
  color: var(--accent-black);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.main-content {
  flex: 1;
  padding: 30px 40px;
  overflow-y: auto;
  overflow-x: hidden;
}

.avatar-shadow {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 2px solid #fff;
}

/* 路由切换动画 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>