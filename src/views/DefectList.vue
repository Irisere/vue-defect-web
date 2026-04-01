<template>
    <div class="page-container">
        <div class="page-header-row">
            <div class="header-left">
                <div class="back-btn" @click="$router.back()">
                    <el-icon>
                        <ArrowLeft />
                    </el-icon>
                </div>
                <div class="header-text">
                    <h2>缺陷报告</h2>
                    <p>Current Issue Tracker</p>
                </div>
            </div>

            <div class="header-controls">
                <el-button type="primary" class="soft-btn" @click="handleExport" :icon="Download">
                    导出 Excel
                </el-button>
                <el-select v-model="filterSeverity" placeholder="筛选严重级" clearable class="soft-select" size="large">
                    <el-option label="全部等级" value="" />
                    <el-option label="Critical" value="Critical" />
                    <el-option label="High" value="High" />
                    <el-option label="Medium" value="Medium" />
                    <el-option label="Low" value="Low" />
                    <el-option label="Unknown" value="Unknown" />
                </el-select>

                <el-radio-group v-model="sortOrder" class="soft-radio" size="large">
                    <el-radio-button label="desc">最新</el-radio-button>
                    <el-radio-button label="asc">最早</el-radio-button>
                </el-radio-group>
            </div>
        </div>

        <el-row :gutter="24" v-if="displayList.length > 0">
            <el-col :xs="24" :sm="12" :md="8" :lg="6" v-for="defect in displayList" :key="defect.id">
                <div class="bento-card" @click="showDetail(defect)">
                    <div class="card-top">
                        <span class="severity-badge" :class="getSeverityClass(defect.severity)">
                            {{ defect.severity }}
                        </span>
                        <span class="date">{{ defect.createdAt?.substring(0, 10) || 'N/A' }}</span>
                    </div>

                    <h4 class="card-title">{{ defect.title }}</h4>
                    <p class="card-desc">{{ defect.description?.substring(0, 80) }}...</p>

                    <div class="card-bottom">
                        <div class="user-avatar-mini"></div>
                        <a :href="defect.url" target="_blank" class="link-btn" @click.stop>
                            Open Link <el-icon>
                                <TopRight />
                            </el-icon>
                        </a>
                    </div>
                </div>
            </el-col>
        </el-row>

        <div v-else class="empty-container">
            <el-empty description="暂无符合条件的缺陷报告" :image-size="200">
                <template #extra>
                    <p class="empty-tip">尝试调整筛选条件或稍后再试</p>
                </template>
            </el-empty>
        </div>
        <el-drawer v-model="drawer" title="Issue Details" size="500px" class="custom-drawer">
            <template #header>
                <div class="drawer-header-bar">
                    <span>Issue Details</span>
                    <div class="header-actions">
                        <template v-if="!isEdit">
                            <el-button type="primary" plain size="small" @click="isEdit = true">修改报告</el-button>
                        </template>
                        <template v-else>
                            <el-button type="primary" size="small" @click="handleUpdate"
                                :loading="updating">保存</el-button>
                            <el-button size="small" @click="isEdit = false">取消</el-button>
                        </template>
                        <el-button type="danger" plain size="small" @click="handleDelete">删除</el-button>
                    </div>
                </div>
            </template>

            <div v-if="currentDefect" class="drawer-content">
                <h2 v-if="!isEdit" class="drawer-title">{{ currentDefect.title }}</h2>
                <el-input v-else v-model="currentDefect.title" class="edit-field" placeholder="缺陷标题" />

                <div class="info-grid">
                    <div class="info-item">
                        <label>Severity</label>
                        <span v-if="!isEdit" class="severity-badge large"
                            :class="getSeverityClass(currentDefect.severity)">
                            {{ currentDefect.severity }}
                        </span>
                        <el-select v-else v-model="currentDefect.severity" size="small">
                            <el-option v-for="s in ['Critical', 'High', 'Medium', 'Low', 'Unknown']" :key="s" :label="s"
                                :value="s" />
                        </el-select>
                    </div>
                    <div class="info-item">
                        <label>Version</label>
                        <p v-if="!isEdit">{{ currentDefect.version || 'Unknown' }}</p>
                        <el-input v-else v-model="currentDefect.version" size="small" />
                    </div>
                </div>

                <el-divider />

                <h4>Steps to Reproduce</h4>
                <div v-if="!isEdit" class="code-block steps-view">
                    {{ formatSteps(currentDefect.stepsToReproduce) }}
                </div>
                <el-input v-else v-model="currentDefect.stepsToReproduce" type="textarea" :rows="4" />

                <h4>Description</h4>
                <p v-if="!isEdit" class="text-body">{{ currentDefect.description }}</p>
                <el-input v-else v-model="currentDefect.description" type="textarea" :rows="6" />
            </div>
        </el-drawer>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue' // 引入 computed
import { useRoute } from 'vue-router'
import { ArrowLeft, TopRight, Download } from '@element-plus/icons-vue'
import { getDefectsByRepo, deleteDefect, exportDefectExcel } from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'


const route = useRoute()
const defectList = ref<any[]>([]) // 原始数据
const drawer = ref(false)
const currentDefect = ref<any>(null)

// --- 新增状态 ---
const filterSeverity = ref('')
const sortOrder = ref('desc')

// --- 核心逻辑：计算属性实现自动筛选与排序 ---
const displayList = computed(() => {
    // 1. 复制一份数据，避免直接修改原数组
    let result = [...defectList.value]

    // 2. 筛选逻辑
    if (filterSeverity.value) {
        result = result.filter(item => item.severity === filterSeverity.value)
    }

    // 3. 排序逻辑
    result.sort((a, b) => {
        const tA = new Date(a.createdAt || 0).getTime()
        const tB = new Date(b.createdAt || 0).getTime()
        // desc: 大时间(新)在前; asc: 小时间(旧)在前
        return sortOrder.value === 'desc' ? tB - tA : tA - tB
    })

    return result
})

const loadData = async () => {
    const res: any = await getDefectsByRepo(Number(route.params.id))
    // 兼容后端返回结构
    if (res.code === 200 || res.data) {
        defectList.value = res.data || res
    }
}

//删除报告
const handleDelete = async () => {
    if (!currentDefect.value?.id) return

    try {
        await ElMessageBox.confirm(
            '确认删除该缺陷报告吗？该操作不可恢复',
            '删除确认',
            {
                confirmButtonText: '确认删除',
                cancelButtonText: '取消',
                type: 'warning'
            }
        )

        const res: any = await deleteDefect(currentDefect.value.id)

        if (res.code === 200) {
            ElMessage.success('删除成功')

            // 1. 关闭抽屉
            drawer.value = false

            // 2. 从列表移除
            defectList.value = defectList.value.filter(
                item => item.id !== currentDefect.value.id
            )

            // 3. 清空当前对象
            currentDefect.value = null
        } else {
            ElMessage.error(res.message || '删除失败')
        }
    } catch (e) {
        // 用户点击取消会进入 catch，这里不提示
    }
}

//导出报告
const handleExport = async () => {
    const repoId = Number(route.params.id)
    if (!repoId) return

    try {
        ElMessage.info('正在准备导出...')

        // 调用 api 文件中定义的接口
        const res: any = await exportDefectExcel(repoId)

        // --- 核心修复：兼容拦截器直接返回 res.data 的情况 ---
        // 如果拦截器返回了 res.data，那么 headers 会在 res.headers 中
        // 如果 transformResponse 生效，headers 会在 res.data.headers 中
        const data = res.data?.data || res.data || res;
        const headers = res.data?.headers || res.headers;

        if (!data || !headers) {
            throw new Error("无法获取文件流或响应头");
        }

        const blob = new Blob([data])
        const url = window.URL.createObjectURL(blob)

        // 从 header 中解析文件名（注意 axios headers 通常是全小写）
        const disposition = headers['content-disposition'] || headers['Content-Disposition'];
        let fileName = `缺陷报告_${repoId}.xlsx`

        if (disposition && disposition.includes('filename*=utf-8\'\'')) {
            fileName = decodeURIComponent(disposition.split('filename*=utf-8\'\'')[1])
        }

        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        document.body.appendChild(link)
        link.click()

        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        ElMessage.success('导出成功')
    } catch (error) {
        console.error('Export Error:', error)
        ElMessage.error('导出失败：无法获取服务器响应')
    }
}

const getSeverityClass = (sev: string) => {
    if (sev === 'Critical') return 'critical'
    if (sev === 'High') return 'high'
    if (sev === 'Medium') return 'medium'
    if (sev === 'Low') return 'low'
    return 'unknown';
}

//修改缺陷报告
// 1. 新增状态
const isEdit = ref(false)     // 是否处于编辑模式
const updating = ref(false)   // 保存按钮加载状态

// 2. 引入更新 API (确保你的 api 文件中有这个导出)
import { updateDefect } from '../api'

// 3. 修改 showDetail 方法
const showDetail = (item: any) => {
    // 使用深拷贝，确保编辑时不会直接影响原始列表数据
    currentDefect.value = JSON.parse(JSON.stringify(item))
    isEdit.value = false // 每次打开默认为只读模式
    drawer.value = true
}

// 4. 新增保存逻辑
const handleUpdate = async () => {
    if (!currentDefect.value) return
    updating.value = true
    try {
        const res: any = await updateDefect(currentDefect.value)
        if (res.code === 200) {
            ElMessage.success('更新成功')
            // 更新本地原始列表数据以同步页面显示
            const index = defectList.value.findIndex(d => d.id === currentDefect.value.id)
            if (index !== -1) {
                defectList.value[index] = { ...currentDefect.value }
            }
            isEdit.value = false // 保存成功后回退到只读模式
        }
    } finally {
        updating.value = false
    }
}

//格式化步骤
const formatSteps = (steps: any): string => {
    // 增加对 undefined 和 null 的守卫
    if (steps === undefined || steps === null || steps === '[]' || steps === '""') {
        return 'No steps provided';
    }

    // --- 情况 1：已经是标准的 JS 数组 ---
    if (Array.isArray(steps)) {
        return steps
            .map(s => String(s).replace(/\\n|\n/g, '').trim())
            .filter(s => s.length > 0)
            .join('\n');
    }

    // --- 情况 2：处理字符串 ---
    if (typeof steps === 'string') {
        let content: string = steps.trim(); // 明确标注为 string 类型

        if (content === '') return 'No steps provided';

        // 2.1 尝试修复残缺的数组尾部
        if (content.startsWith('[') && !content.endsWith(']')) {
            content += "']";
        }

        // 2.2 暴力清洗法
        if (content.startsWith('[') && content.endsWith(']')) {
            try {
                const regex = /['"](.*?)['"]/g;
                let m: RegExpExecArray | null;
                const result: string[] = [];
                // 解决 "类型 RegExpExecArray | null 不能赋给..." 的问题
                while ((m = regex.exec(content)) !== null) {
                    if (m[1]) result.push(m[1].replace(/\\n|\n/g, '').trim());
                }

                if (result.length > 0) {
                    // 1. 获取最后一个索引
                    const lastIndex = result.length - 1;
                    // 2. 拿到最后一个元素
                    let lastStep = result[lastIndex];

                    // 3. 此时 TypeScript 仍觉得 lastStep 可能是 undefined
                    // 我们做一个简单的判断或断言
                    if (lastStep && content.length > 800 && !/[.!?]$/.test(lastStep)) {
                        result[lastIndex] = lastStep + "... (truncated)";
                    }
                    return result.join('\n');
                }
            } catch (e) {
                console.error("Step parsing failed", e);
            }
        }

        // 2.3 最后的兜底
        // 这里确保返回的一定是字符串
        const finalContent = content
            .replace(/[\[\]"']/g, '')
            .replace(/(\d+\.\s)/g, '\n$1')
            .replace(/\n+/g, '\n')
            .trim();

        return finalContent || 'No steps provided';
    }

    return String(steps);
};

onMounted(loadData)
</script>

<style scoped>
.page-container {
    padding: 0 10px;
}

/* 头部布局优化：两端对齐 */
.page-header-row {
    display: flex;
    justify-content: space-between;
    /* 左右分开 */
    align-items: center;
    margin-bottom: 30px;
}

/* 左侧标题区 */
.header-left {
    display: flex;
    align-items: center;
    gap: 20px;
}

/* 右侧操作区 */
.header-controls {
    display: flex;
    gap: 15px;
    align-items: center;
}

.soft-btn {
    border-radius: 20px;
    height: 40px;
    padding: 0 20px;
    border: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 复用原有的按钮样式 */
.back-btn {
    width: 40px;
    height: 40px;
    background: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    transition: all 0.2s;
}

.back-btn:hover {
    transform: scale(1.1);
}

.header-text h2 {
    margin: 0;
    font-size: 24px;
    color: #1C1C1E;
}

.header-text p {
    margin: 4px 0 0 0;
    color: #8D8D8D;
    font-size: 14px;
}

/* --- 新增：适配 Bento 风格的输入控件样式 --- */
.soft-select {
    width: 140px;
}

/* 穿透修改 Element Plus 输入框样式，使其变圆润、无边框感 */
:deep(.soft-select .el-input__wrapper) {
    border-radius: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02) !important;
    /* 柔和阴影 */
    border: 1px solid transparent;
    background-color: #fff;
}

:deep(.soft-select .el-input__wrapper.is-focus) {
    box-shadow: 0 0 0 1px #8c52ff !important;
    /* 聚焦时紫色 */
}

:deep(.el-radio-button__inner) {
    border: none !important;
    background: #fff;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
    color: #606266;
    padding: 10px 15px;
}

:deep(.el-radio-button:first-child .el-radio-button__inner) {
    border-radius: 20px 0 0 20px;
}

:deep(.el-radio-button:last-child .el-radio-button__inner) {
    border-radius: 0 20px 20px 0;
}

:deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
    background-color: #1C1C1E;
    /* 选中变黑，符合你的设计语言 */
    color: #fff;
    box-shadow: none;
}

/* ... 以下原有样式保持不变 ... */
.card-title {
    /* 限制标题最大行数（根据卡片剩余空间调整，比如2行） */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    /* 可选：增加行高，提升可读性 */
    line-height: 1.5;
}

.bento-card {
    background: #fff;
    border-radius: 24px;
    padding: 24px;
    margin-bottom: 24px;
    cursor: pointer;
    transition: all 0.3s;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
    border: 1px solid transparent;
    display: flex;
    flex-direction: column;
    height: 250px;
    /* 让标题容器自动占满剩余空间（避免挤压） */
    justify-content: flex-start;
}

.bento-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
    border-color: rgba(0, 0, 0, 0.05);
}

.card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.date {
    font-size: 12px;
    color: #9CA3AF;
}

.card-title {
    margin: 0 0 10px 0;
    font-size: 16px;
    font-weight: 700;
    color: #1C1C1E;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.card-desc {
    font-size: 13px;
    color: #6B7280;
    flex: 1;
    overflow: hidden;
    margin: 0;
}

.card-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 15px;
    border-top: 1px solid #F3F4F6;
    padding-top: 15px;
}

.user-avatar-mini img {
    width: 24px;
    height: 24px;
    border-radius: 50%;
}

.link-btn {
    font-size: 12px;
    color: #1C1C1E;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 4px;
    text-decoration: none;
}

/* 统一 Badge 基础样式 */
.severity-badge {
    padding: 4px 12px;
    border-radius: 12px;
    /* 稍微方圆一点更显高级 */
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: inline-block;
}

/* 严重：深红文字 + 浅红背景 */
.severity-badge.critical {
    background: #FEE2E2;
    color: #991B1B;
}

/* 高：深橙文字 + 浅橙背景 */
.severity-badge.high {
    background: #FFEDD5;
    color: #9A3412;
}

/* 中：深黄文字 + 浅黄背景 */
.severity-badge.medium {
    background: #FEF9C3;
    color: #854D0E;
}

/* 低：深绿文字 + 浅绿背景 */
.severity-badge.low {
    background: #DCFCE7;
    color: #166534;
}

/* 未知：深灰文字 + 浅灰背景 */
.severity-badge.unknown {
    background: #F3F4F6;
    color: #374151;
}

/* Drawer Styles */
.drawer-header {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 20px;
}

.drawer-header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
}


.drawer-title {
    font-size: 24px;
    font-weight: 700;
    color: #1C1C1E;
    margin-bottom: 20px;
}

/* 新增样式 */
.header-actions {
    display: flex;
    gap: 8px;
}

.edit-field {
    margin-bottom: 20px;
    font-size: 18px;
    font-weight: bold;
}

/* 确保只读模式下换行符生效 */
.text-body,
.code-block {
    white-space: pre-wrap;
    word-break: break-all;
}

/* 编辑状态下 textarea 间距 */
:deep(.el-textarea) {
    margin-bottom: 15px;
}

.info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 20px;
}

.info-item label {
    font-size: 12px;
    color: #9CA3AF;
    display: block;
    margin-bottom: 5px;
}

.info-item p {
    margin: 0;
    font-weight: 600;
    color: #1C1C1E;
}

.code-block {
    background: #F9FAFB;
    padding: 15px;
    border-radius: 12px;
    font-family: monospace;
    font-size: 13px;
    color: #374151;
    margin-bottom: 20px;
    border: 1px solid #E5E7EB;
}

.text-body {
    line-height: 1.6;
    color: #4B5563;
}

/* 让每一行步骤之间有一点间距 */
.step-item {
    margin-bottom: 8px;
    line-height: 1.5;
    color: #374151;
    padding-left: 5px;
    border-left: 3px solid #E5E7EB;
    /* 加个小竖条显得更高级 */
}

/* 确保 code-block 里的换行符 \n 能被浏览器识别 */
.code-block {
    white-space: pre-wrap;
    /* 必须保留，否则 \n 会被当成空格 */
    word-break: break-all;
    background: #F9FAFB;
    padding: 15px;
    border-radius: 12px;
    font-family: inherit;
    /* 如果不想要等宽字体，可以改成 inherit */
}

.steps-view {
    /* 核心：识别换行符并自动换行 */
    white-space: pre-wrap;
    word-break: break-word;

    /* 视觉美化 */
    line-height: 1.8;
    /* 增加行高，方便阅读 */
    background: #fdfdfd;
    /* 稍微浅一点的背景 */
    border-left: 4px solid #1C1C1E;
    /* 侧边黑条，符合你的 Bento 风格 */
    padding: 15px 20px;
    font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
    color: #374151;
}

/* 如果想让里面的 1. 2. 3. 颜色深一点，可以根据需要微调 */
</style>