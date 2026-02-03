import axios from 'axios'

// 1. 创建 axios 实例
const request = axios.create({
  baseURL: '/api', // 这里假设你会在 vite.config.ts 配置代理，或者后端直接跨域
  timeout: 10000
})

// 响应拦截器（简化版）
request.interceptors.response.use(res => {
  return res.data
}, error => {
  return Promise.reject(error)
})

// 定义类型 (根据 openapi.json)
export interface Project {
  id?: number
  name: string
  remark: string
}

export interface Repo {
  id?: number
  projectId: number
  platform: string
  owner: string
  repoName: string
}

export interface Defect {
  id: number
  title: string
  description: string
  severity: string
  state: string
  url: string
  createdAt: string
}

export interface TokenConfig {
  id?: number
  platform: 'github' | 'gitee' | 'gitlab' | string
  token: string
  remark?: string
  isActive?: boolean
}

// 通用的返回结构接口
interface Result<T = any> {
  code: number;
  data: T;
  message?: string;
}
// 2. 导出 API 方法

// --- 项目相关 ---
export const getProjectList = () => request.get('/project/list')
export const addProject = (data: Project) => request.post('/project', data)
export const deleteProject = (id: number) => request.delete(`/project/${id}`)
export const updateProject = (id: number, data: Project) =>  request.put(`/project/${id}`, data)

// --- 仓库相关 ---
// 根据项目ID获取仓库列表
export const getRepoByProject = (projectId: number) => 
  request.get(`/repo/project/${projectId}`)
export const addRepo = (data: Repo) => request.post('/repo', data)
// 核心功能：触发采集
export const collectIssues = (params: any) => {
  return request.get('/repo/collect/issue', { params })
}


// --- 缺陷相关 ---
export const getDefectsByRepo = (repoId: number) => request.get(`/defect/repo/${repoId}`)
export const deleteDefect = (id: number) => {
  return request.delete(`/defect/${id}`)
}


// --- Token 配置相关 ---
export const getTokenList = () => request.get('/token-config')

export const addToken = (data: TokenConfig) => request.post('/token-config', data)

export const updateToken = (data: TokenConfig) => request.put('/token-config', data)

export const updateTokenStatus = (id: number, isActive: boolean) => 
  request.patch(`/token-config/${id}/status`, null, { params: { isActive } })

export const deleteToken = (id: number) => request.delete(`/token-config/${id}`)

// --- 统计分析接口 ---
export const getAnalysisOverview = (): Promise<Result> => request.get('/analysis/overview')
export const getAnalysisSeverity = (): Promise<Result> => request.get('/analysis/severity')
export const getAnalysisTrend = (): Promise<Result> => request.get('/analysis/trend')
export const getAnalysisTopRepos = (): Promise<Result> => request.get('/analysis/top-repos')