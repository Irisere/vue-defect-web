<template>
  <div class="home-dashboard">

    <header class="top-header">
      <div class="greeting">
        <h1>Hi, Admin! 👋</h1>
        <p>这里是您的项目与缺陷管理中心</p>
      </div>

      <div class="header-actions">
        <div class="search-pill">
          <el-icon>
            <Search />
          </el-icon>
          <input type="text" placeholder="Search for projects..." />
        </div>
        <button class="black-btn" @click="openCreateDialog">
          New Project <el-icon class="icon-right">
            <Plus />
          </el-icon>
        </button>
      </div>
    </header>

    <div class="content-grid">
      <div class="dashboard-card glass-card span-2">
        <div class="glass-blobs">
          <div class="blob blob-1"></div>
          <div class="blob blob-2"></div>
        </div>
        <div class="card-text">
          <h3>For Everyone</h3>
          <div class="stat-big">Defect Report Collection</div>
          <div class="stat-tags">
            <span class="tag yellow">⚡️ Fast</span>
            <span class="tag red">🔥 Convenient</span>
          </div>
        </div>
      </div>

      <div class="dashboard-card dark-card">
        <div class="card-header-row">
          <h3>Total Projects</h3>
          <el-icon color="#fff">
            <TrendCharts />
          </el-icon>
        </div>
        <div class="big-number">{{ projectList.length }}</div>
        <p class="sub-text">Active Repositories</p>
      </div>

      <div class="section-title">My Projects</div>

      <div class="projects-container">
        <div v-for="(item, index) in projectList" :key="item.id" class="project-strip" @click="goToRepo(item)">
          <div class="strip-left">
            <div class="icon-box">
              <el-icon>
                <Folder />
              </el-icon>
            </div>
            <div class="strip-info">
              <h4>{{ item.name }}</h4>
              <span>{{ item.remark || "暂无备注" }}</span>
            </div>
          </div>

          <div class="strip-right">
            <div class="progress-pill">
              <span>Running</span>
              <div class="dots">
                <i class="dot active"></i><i class="dot active"></i><i class="dot"></i>
              </div>
            </div>

            <el-button circle size="small" class="edit-btn" @click.stop="openEditDialog(item)">
              <el-icon>
                <Edit />
              </el-icon>
            </el-button>

            <el-icon class="arrow-btn">
              <ArrowRight />
            </el-icon>
          </div>
        </div>

        <el-empty v-if="projectList.length === 0" description="No projects yet" />
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="isEditMode ? 'Edit Project' : 'Create New Project'" width="450px"
      align-center class="custom-dialog">
      <el-form label-position="top" size="large">
        <el-form-item label="项目名称">
          <el-input v-model="projectForm.name" placeholder="Project Name" />
        </el-form-item>
        <el-form-item label="项目备注">
          <el-input v-model="projectForm.remark" placeholder="简短描述项目用途..." type="textarea" :rows="2" />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">Cancel</el-button>
          <el-button type="primary" color="#1C1C1E" @click="handleSubmit">
            {{ isEditMode ? 'Save Changes' : 'Create' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import {
  Search, Plus, TrendCharts, Folder, ArrowRight, Edit
} from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { getProjectList, addProject, updateProject } from '../api'
import { ElMessage } from 'element-plus'

const router = useRouter()
const projectList = ref<any[]>([])
const dialogVisible = ref(false)

// 状态管理
const isEditMode = ref(false)
const currentEditId = ref<number | null>(null)
// 使用对象管理表单，方便扩展
const projectForm = reactive({
  name: '',
  remark: ''
})

// 加载列表
const loadData = async () => {
  try {
    const res: any = await getProjectList()
    if (res.code === 200 || res.data) projectList.value = res.data || res
  } catch (e) { console.error(e) }
}

// 打开新建弹窗
const openCreateDialog = () => {
  isEditMode.value = false
  currentEditId.value = null
  // 重置表单
  projectForm.name = ''
  projectForm.remark = ''
  dialogVisible.value = true
}

// 打开编辑弹窗
const openEditDialog = (item: any) => {
  isEditMode.value = true
  currentEditId.value = item.id
  // 回填数据
  projectForm.name = item.name
  projectForm.remark = item.remark || ''
  dialogVisible.value = true
}

// 统一提交处理
const handleSubmit = async () => {
  if (!projectForm.name) {
    ElMessage.warning('请输入项目名称')
    return
  }

  try {
    if (isEditMode.value && currentEditId.value) {
      // 编辑模式
      await updateProject(currentEditId.value, {
        name: projectForm.name,
        remark: projectForm.remark
      })
      ElMessage.success('更新成功')
    } else {
      // 新建模式
      await addProject({
        name: projectForm.name,
        remark: projectForm.remark
      })
      ElMessage.success('创建成功')
    }

    dialogVisible.value = false
    loadData()
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  }
}


const goToRepo = (item: any) => {
  router.push(`/project/${item.id}/repos`)
}

onMounted(loadData)
</script>

<style scoped>
/* 原有样式保持不变 */

/* 顶部 Header */
.top-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.greeting h1 {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
  color: #1C1C1E;
}

.greeting p {
  color: #8D8D8D;
  margin: 5px 0 0 0;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 20px;
}

.search-pill {
  background: #fff;
  border-radius: 30px;
  padding: 10px 20px;
  display: flex;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
  width: 240px;
}

.search-pill input {
  border: none;
  outline: none;
  background: transparent;
  margin-left: 10px;
  font-size: 14px;
  width: 100%;
}

.black-btn {
  background: #1C1C1E;
  color: #fff;
  border: none;
  border-radius: 30px;
  padding: 12px 24px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: transform 0.2s;
}

.black-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

/* --- Bento Grid 内容区 --- */
.content-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  grid-auto-rows: min-content;
}

.dashboard-card {
  border-radius: 32px;
  padding: 30px;
  position: relative;
  overflow: hidden;
  min-height: 200px;
}

.glass-card {
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.glass-blobs {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(50px);
}

.blob-1 {
  width: 150px;
  height: 150px;
  background: #F4D35E;
  top: -20px;
  right: 20%;
  opacity: 0.8;
}

.blob-2 {
  width: 180px;
  height: 180px;
  background: #EE6055;
  bottom: -40px;
  right: 10%;
  opacity: 0.6;
}

.stat-big {
  font-size: 32px;
  font-weight: 800;
  margin: 10px 0;
}

.stat-tags {
  display: flex;
  gap: 10px;
}

.tag {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.tag.yellow {
  background: #F4D35E;
  color: #333;
}

.tag.red {
  background: #EE6055;
  color: #fff;
}

.dark-card {
  background: #1C1C1E;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.big-number {
  font-size: 48px;
  font-weight: 700;
  color: #F4D35E;
}

.sub-text {
  color: #666;
  font-size: 14px;
}

/* --- 项目列表条目 --- */
.section-title {
  grid-column: 1 / -1;
  font-size: 18px;
  font-weight: 700;
  margin-top: 20px;
  margin-bottom: 10px;
}

.projects-container {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 核心条目样式 */
.project-strip {
  background: #fff;
  border-radius: 24px;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s ease;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.project-strip:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
}

.strip-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.icon-box {
  width: 48px;
  height: 48px;
  background: #F3F4F6;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1C1C1E;
  font-size: 20px;
}

.strip-info h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.strip-info span {
  font-size: 12px;
  color: #9CA3AF;
}

.strip-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

/* 稍微调小 gap */
.progress-pill {
  background: #F9FAFB;
  padding: 6px 16px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #6B7280;
}

.dots {
  display: flex;
  gap: 3px;
}

.dot {
  width: 4px;
  height: 10px;
  background: #E5E7EB;
  border-radius: 2px;
}

.dot.active {
  background: #F4D35E;
}

.arrow-btn {
  color: #D1D5DB;
}

/* 编辑按钮样式 */
.edit-btn {
  border: none;
  background: transparent;
  color: #9CA3AF;
  transition: all 0.2s;
}

.edit-btn:hover {
  background: #F3F4F6;
  color: #1C1C1E;
  transform: scale(1.1);
}

@media (max-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .header-actions {
    display: none;
  }
}
</style>