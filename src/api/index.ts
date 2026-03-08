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
  url: string
  createdAt: string
}

export interface TokenConfig {
  id?: number
  platform: 'github' | 'gitee' | 'gitlab' | string
  token: string
  remark?: string
  isActive?: boolean
  isUsable: 0 | 1 | 2
  createAt?: string;
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
//根据url导入仓库
export const importRepo = (data: { url: string; projectId: number }) => request.post('/repo/import', data);
// 校验仓库有效性
export const validateRepo = (params: { platform: string; owner: string; repoName: string }) => 
    request.get('/repo/validate', { params });
/**
 * 批量校验仓库有效性
 * @param repos 仓库列表对象数组
 */
export const validateRepoBatch = (repos: Repo[]) => 
    request.post<any, Result<Record<number, boolean>>>('/repo/validate/batch', repos);
// 核心功能：触发采集
export const collectIssues = (params: any) => {
  return request.get('/repo/collect/issue', { params })
}
export const deleteRepo = (id: number) => request.delete(`/repo/${id}`)


// --- 缺陷相关 ---
export const getDefectsByRepo = (repoId: number) => request.get(`/defect/repo/${repoId}`)
export const deleteDefect = (id: number) => {
  return request.delete(`/defect/${id}`)
}
export const updateDefect = (data: any) => request.put('/defect', data)
// 导出缺陷报告 Excel
export const exportDefectExcel = (repoId: number) => {
  return request.get(`/defect/repo/${repoId}/export`, {
    responseType: 'blob',
    // 关键：transformResponse 确保在拦截器之后还能拿到 headers
    transformResponse: [(data: any, headers: any) => {
      return { data, headers }
    }]
  })
}


// --- Token 配置相关 ---
export const getTokenList = () => request.get('/token-config')

export const addToken = (data: TokenConfig) => request.post('/token-config', data)

export const updateToken = (data: TokenConfig) => request.put('/token-config', data)

export const updateTokenStatus = (id: number, isActive: boolean) => 
  request.patch(`/token-config/${id}/status`, null, { params: { isActive } })

export const deleteToken = (id: number) => request.delete(`/token-config/${id}`)

export const validateToken = (id: number) => request.get(`/token-config/validate/${id}`)// 校验 Token 是否可用

// --- 统计分析接口 ---
export const getAnalysisOverview = (): Promise<Result> => request.get('/analysis/overview')
export const getAnalysisSeverity = (): Promise<Result> => request.get('/analysis/severity')
export const getAnalysisTrend = (): Promise<Result> => request.get('/analysis/trend')
export const getAnalysisTopRepos = (): Promise<Result> => request.get('/analysis/top-repos')