import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    { 
      path: '/analysis', 
      name: 'analysis',
      component: () => import('../views/AnalysisView.vue') 
    },
    { 
      path: '/settings', 
      name: 'settings',
      component: () => import('../views/SettingsView.vue') 
    },
    {
      path: '/project/:id/repos',
      name: 'repos',
      component: () => import('../views/RepoList.vue')
    },
    {
      path: '/repo/:id/defects',
      name: 'defects',
      component: () => import('../views/DefectList.vue')
    }
  ]
})

export default router