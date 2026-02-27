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
                    <h2>系统设置</h2>
                    <p>管理第三方平台访问令牌 (Access Tokens)</p>
                </div>
            </div>

            <div class="header-controls">
                <button class="black-btn soft-btn" @click="openDialog()">
                    Add Token
                    <el-icon class="icon-right">
                        <Plus />
                    </el-icon>
                </button>
            </div>
        </div>

        <div v-if="loading" class="loading-state">
            <el-skeleton animated :count="3" />
        </div>

        <div v-else class="kanban-board">
            <el-row :gutter="24" class="full-height">
                <el-col :md="8" :sm="24" v-for="platform in ['GitHub', 'Gitee', 'GitLab']" :key="platform">
                    <div class="kanban-column">
                        <div class="column-header" :class="platform.toLowerCase()">
                            <span class="platform-name">{{ platform }}</span>
                            <span class="platform-count">{{ getPlatformList(platform).length }}</span>
                        </div>

                        <div class="column-scroll-area">
                            <div v-if="getPlatformList(platform).length === 0" class="empty-tip">
                                <el-empty :image-size="60" description="暂无配置" />
                            </div>

                            <div v-for="item in getPlatformList(platform)" :key="item.id" class="bento-card"
                                :class="{ 'active-card': item.isActive }">

                                <div class="card-top">
                                    <span class="status-badge" :class="getUsableType(item.isUsable)">
                                        {{ getUsableLabel(item.isUsable) }}
                                    </span>
                                    <span class="date">{{ formatDate(item.createAt) }}</span>
                                </div>

                                <div class="card-body">
                                    <h4 class="card-title">{{ item.remark || '未命名配置' }}</h4>
                                    <div v-if="item.isActive" class="active-tag-mini">
                                        <div class="dot"></div> 当前启用
                                    </div>
                                </div>

                                <div class="card-bottom">
                                    <el-button size="small" round :loading="validatingId === item.id"
                                        @click="handleValidate(item.id!)" class="validate-btn">
                                        测试连接
                                    </el-button>

                                    <div class="action-group">
                                        <el-button v-if="!item.isActive" size="small" class="enable-btn"
                                            @click="handleStatusChange(item, true)">
                                            启用
                                        </el-button>
                                        <el-popconfirm title="确定删除吗?" @confirm="handleDelete(item.id)">
                                            <template #reference>
                                                <el-button link class="delete-icon-btn">
                                                    <el-icon>
                                                        <Delete />
                                                    </el-icon>
                                                </el-button>
                                            </template>
                                        </el-popconfirm>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </el-col>
            </el-row>
        </div>

        <el-dialog v-model="dialogVisible" title="新增 Token 配置" width="450px" align-center class="custom-dialog">
            <el-form :model="form" label-position="top" size="large">
                <el-form-item label="代码托管平台">
                    <el-select v-model="form.platform" class="full-width soft-select">
                        <el-option label="GitHub" value="github" />
                        <el-option label="Gitee" value="gitee" />
                        <el-option label="GitLab" value="gitlab" />
                    </el-select>
                </el-form-item>
                <el-form-item label="Access Token">
                    <el-input v-model="form.token" type="password" show-password class="soft-input"
                        placeholder="请输入Token" />
                </el-form-item>
                <el-form-item label="备注名称">
                    <el-input v-model="form.remark" placeholder="例如: 开发环境Token" class="soft-input" />
                </el-form-item>
            </el-form>
            <template #footer>
                <div class="dialog-actions">
                    <button class="action-btn cancel-btn" @click="dialogVisible = false">
                        取消
                    </button>
                    <button class="action-btn confirm-btn" :disabled="submitting" @click="handleSave">
                        <span v-if="!submitting">确认添加</span>
                        <el-icon v-else class="is-loading">
                            <Loading />
                        </el-icon>
                    </button>
                </div>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ArrowLeft, Plus, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getTokenList, addToken, updateTokenStatus, deleteToken, validateToken, type TokenConfig } from '../api'

// --- 逻辑部分保持不变 ---
const loading = ref(false)
const submitting = ref(false)
const validatingId = ref<number | null>(null)
const tokenList = ref<TokenConfig[]>([])
const dialogVisible = ref(false)
const initialForm = { platform: 'github', token: '', remark: '', isActive: false }
const form = ref<any>({ ...initialForm })

const formatDate = (dateStr?: string) => dateStr ? dateStr.split('T')[0] : '--'
const getPlatformList = (platform: string) => {
    return tokenList.value
        .filter(item => item.platform.toLowerCase() === platform.toLowerCase())
        .sort((a, b) => {
            // 将 isActive 为 true 的排在前面
            if (a.isActive === b.isActive) return 0;
            return a.isActive ? -1 : 1;
        });
}

const loadData = async () => {
    loading.value = true
    try {
        const res: any = await getTokenList()
        if (res.code === 200) tokenList.value = res.data || []
    } finally {
        loading.value = false
    }
}

const openDialog = () => {
    form.value = { ...initialForm }
    dialogVisible.value = true
}

const handleSave = async () => {
    if (!form.value.token || !form.value.platform) {
        ElMessage.warning('请填写完整信息')
        return
    }
    submitting.value = true
    try {
        const res: any = await addToken(form.value)
        if (res.code === 200) {
            ElMessage.success('添加成功')
            dialogVisible.value = false
            loadData()
        }
    } finally {
        submitting.value = false
    }
}

const handleStatusChange = async (item: TokenConfig, newVal: boolean) => {
    if (!item.id || !newVal) return
    try {
        const res: any = await updateTokenStatus(item.id, true)
        if (res.code === 200) {
            ElMessage.success(`${item.platform} token切换成功`)
            loadData()
        }
    } catch (e) { console.error(e) }
}

const handleValidate = async (id: number) => {
    validatingId.value = id
    try {
        const res: any = await validateToken(id)
        if (res.code === 200) {
            res.data === true ? ElMessage.success('验证通过') : ElMessage.error('Token已失效')
            await loadData()
        }
    } catch (e) {
        ElMessage.error('测试连接请求失败')
    } finally {
        validatingId.value = null
    }
}

const handleDelete = async (id?: number) => {
    if (!id) return
    const res: any = await deleteToken(id)
    if (res.code === 200) {
        ElMessage.success('删除成功')
        tokenList.value = tokenList.value.filter(t => t.id !== id)
    }
}

const getUsableType = (status: number) => {
    if (status === 1) return 'success'
    if (status === 0) return 'danger'
    return 'unknown'
}

const getUsableLabel = (status: number) => {
    if (status === 1) return '连接正常'
    if (status === 0) return '连接失败'
    return '未知状态'
}

onMounted(loadData)
</script>

<style scoped>
/* --- 页面基础布局 --- */
.page-container {
    padding: 0 10px;
    height: calc(100vh - 100px);
    display: flex;
    flex-direction: column;
}

.page-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    flex-shrink: 0;
}

/* --- 控件样式适配 Bento --- */
.header-left {
    display: flex;
    align-items: center;
    gap: 20px;
}

.back-btn {
    width: 40px;
    height: 40px;
    background: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    cursor: pointer;
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

.black-btn {
    background: #1C1C1E;
    color: #fff;
    border: none;
    border-radius: 20px;
    padding: 10px 24px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transition: all 0.3s;
}

.black-btn:hover {
    opacity: 0.9;
    transform: translateY(-1px);
}

/* --- 看板列样式 --- */
.kanban-board {
    flex: 1;
    overflow: hidden;
    margin-bottom: 20px;
}

.full-height {
    height: 100% !important;
}

/* 必须穿透修改 Element Plus 的 el-col 高度 */
:deep(.el-col) {
    height: 100%;
}

.kanban-column {
    /* background: #f6e79d00; */
    border-radius: 24px;
    display: flex;
    flex-direction: column;
    height: 100%;
    /* border: 1px solid #fac76e; */
}

.column-header {
    padding: 24px;
    display: flex;
    /* justify-content: space-between;  <-- 删除这一行 */
    justify-content: center;
    /* 让内容整体水平居中 */
    align-items: center;
    position: relative;
    /* 为 Badge 绝对定位做准备，确保名字在正中心 */
}

.column-header .platform-name {
    font-size: 18px;
    font-weight: 800;
    color: #1C1C1E;
    /* 如果你想让名字完全不受 Badge 宽度影响而偏移，可以加一点 padding */
}

.platform-name {
    font-size: 18px;
    font-weight: 800;
    color: #1C1C1E;
}

/* 自定义计数器样式 */
.platform-count {
    background: #F2F2F7;
    /* 极浅灰背景 */
    color: #8E8E93;
    /* 辅助灰色文字 */
    font-size: 12px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 10px;
    /* 胶囊圆角 */
    min-width: 20px;
    text-align: center;
    display: inline-block;
    line-height: 1.2;
}

/* 让 Badge 悬浮在名字旁边或者固定在右侧 */
:deep(.column-header .el-badge) {
    margin-left: 12px;
    /* 给 Badge 和名字之间留点呼吸感 */
}

/* --- Bento Card 核心样式 --- */
.bento-card {
    background: #FFFFFF;
    border-radius: 24px;
    padding: 24px;
    margin-bottom: 16px;
    border: 1px solid transparent;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
}

/* 1. 默认状态下隐藏启用按钮 */
.enable-btn {
    opacity: 0;
    visibility: hidden;
    transition: all 0.2s ease-in-out;
}

/* 2. 当鼠标悬浮在 bento-card 上时，显示该卡片内的启用按钮 */
.bento-card:hover .enable-btn {
    opacity: 1;
    visibility: visible;
}

.bento-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
    border-color: rgba(0, 0, 0, 0.05);
}

.active-card {
    background: #fdfdfb;
    border-color: rgba(0, 122, 255, 0.2);
    /* 已启用的卡片可以稍微加重阴影以示区别 */
    box-shadow: 0 8px 20px rgba(0, 122, 255, 0.05);
}

.card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.date {
    font-size: 12px;
    color: #9CA3AF;
}

.card-title {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #1C1C1E;
    line-height: 1.4;
}

.active-tag-mini {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #007AFF;
    margin-top: 8px;
}

.active-tag-mini .dot {
    width: 6px;
    height: 6px;
    background: #007AFF;
    border-radius: 50%;
}

.card-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 20px;
    padding-top: 15px;
    border-top: 1px solid #F3F4F6;
}

/* --- 状态标签适配 --- */
.status-badge {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
}

.status-badge.success {
    background: #ECFDF5;
    color: #10B981;
}

.status-badge.danger {
    background: #FEF2F2;
    color: #EF4444;
}

.status-badge.unknown {
    background: #e8e9cb;
    color: #e7ac69;
}

/* --- Element Plus 深度覆盖 --- */
:deep(.soft-input .el-input__wrapper),
:deep(.soft-select .el-input__wrapper) {
    border-radius: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04) !important;
    border: 1px solid transparent;
    transition: all 0.3s;
}

:deep(.soft-input .el-input__wrapper.is-focus),
:deep(.soft-select .el-input__wrapper.is-focus) {
    box-shadow: 0 0 0 1px #1C1C1E !important;
}

.full-width {
    width: 100%;
}

.delete-icon-btn {
    color: #9CA3AF;
    font-size: 18px;
}

.delete-icon-btn:hover {
    color: #EF4444;
}

.column-scroll-area {
    flex: 1;
    overflow-y: auto;
    padding: 0 16px 16px 16px;
}

.column-scroll-area::-webkit-scrollbar {
    width: 2px;
}

.column-scroll-area::-webkit-scrollbar-thumb {
    background: #e5e7ebbd;
    border-radius: 10px;
}

.dialog-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    padding-top: 20px;
}

/* 基础按钮样式 (统一大小和形状) */
.action-btn {
    height: 44px;
    /* 增加高度，更有触摸感 */
    padding: 0 24px;
    border-radius: 22px;
    /* 完美胶囊形 */
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    justify-content: center;
}

.dialog-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    /* 如果希望在右侧，保留这个 */
    /* justify-content: space-between; */
    /* 如果希望平分底部，取消注释这一行 */
    padding-top: 20px;
}

/* 基础按钮样式 - 确保大小完全一致的关键 */
.action-btn {
    height: 44px;
    /* 1. 设置固定宽度，确保两个按钮长得一模一样 */
    width: 120px;

    border-radius: 22px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    justify-content: center;
}

/* 取消按钮 */
.cancel-btn {
    background: #F2F2F7;
    color: #8E8E93;
}

.cancel-btn:hover {
    background: #E5E5EA;
    color: #1C1C1E;
}

/* 确认按钮 */
.confirm-btn {
    background: #1C1C1E;
    color: #FFFFFF;
    /* 移除 flex: 1，否则它会占满剩余空间 */
}

.confirm-btn:hover {
    opacity: 0.9;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.confirm-btn:disabled {
    background: #AEAEB2;
    cursor: not-allowed;
    transform: none;
}

/* 加载动画 */
.is-loading {
    animation: rotating 2s linear infinite;
}

@keyframes rotating {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}
</style>