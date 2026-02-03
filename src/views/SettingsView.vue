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
                <button class="black-btn" @click="openDialog()">
                    Add Token <el-icon class="icon-right">
                        <Plus />
                    </el-icon>
                </button>
            </div>
        </div>

        <div v-if="loading" class="loading-state">
            <el-skeleton animated :count="3" />
        </div>

        <div v-else class="content-grid">
            <el-row :gutter="24">
                <el-col :xs="24" :sm="12" :md="8" v-for="item in tokenList" :key="item.id">
                    <div class="bento-card token-card" :class="{ 'inactive': !item.isActive }">

                        <div class="card-top">
                            <div class="platform-badge" :class="item.platform.toLowerCase()">
                                <i class="iconfont" :class="getPlatformIcon(item.platform)"></i>
                                {{ item.platform }}
                            </div>
                            <el-switch v-model="item.isActive" @change="(val: boolean) => handleStatusChange(item, val)"
                                style="--el-switch-on-color: #1C1C1E;" />
                        </div>

                        <div class="card-body">
                            <h4 class="remark-title">{{ item.remark || '未命名配置' }}</h4>
                            <div class="token-box">
                                <span class="token-text">{{ maskToken(item.token) }}</span>
                                <el-icon class="copy-icon" @click="copyToken(item.token)">
                                    <CopyDocument />
                                </el-icon>
                            </div>
                        </div>

                        <div class="card-footer">
                            <span class="status-dot" :class="item.isActive ? 'active' : 'inactive'">
                                {{ item.isActive ? 'Active' : 'Disabled' }}
                            </span>
                            <div class="action-group">
                                <el-button link class="icon-btn edit" @click="openDialog(item)">
                                    <el-icon>
                                        <Edit />
                                    </el-icon>
                                </el-button>
                                <el-popconfirm title="确定要删除该配置吗?" @confirm="handleDelete(item.id)">
                                    <template #reference>
                                        <el-button link class="icon-btn delete">
                                            <el-icon>
                                                <Delete />
                                            </el-icon>
                                        </el-button>
                                    </template>
                                </el-popconfirm>
                            </div>
                        </div>

                    </div>
                </el-col>

                <el-col :span="24" v-if="tokenList.length === 0">
                    <el-empty description="暂无 Token 配置，请点击右上角添加" />
                </el-col>
            </el-row>
        </div>

        <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑 Token' : '新增 Token'" width="450px" align-center
            class="custom-dialog">
            <el-form :model="form" label-position="top" size="large">
                <el-form-item label="代码托管平台">
                    <el-select v-model="form.platform" class="full-width soft-input" placeholder="请选择平台">
                        <el-option label="GitHub" value="github" />
                        <el-option label="Gitee" value="gitee" />
                        <el-option label="GitLab" value="gitlab" />
                    </el-select>
                </el-form-item>

                <el-form-item label="Access Token">
                    <el-input v-model="form.token" placeholder="例如: ghp_xxxxxxxx..." type="password" show-password
                        class="soft-input" />
                </el-form-item>

                <el-form-item label="备注名称">
                    <el-input v-model="form.remark" placeholder="例如: 我的个人开发Token" class="soft-input" />
                </el-form-item>

                <el-form-item label="初始状态">
                    <el-radio-group v-model="form.isActive" class="soft-radio">
                        <el-radio-button :label="true">启用</el-radio-button>
                        <el-radio-button :label="false">禁用</el-radio-button>
                    </el-radio-group>
                </el-form-item>
            </el-form>

            <template #footer>
                <div class="dialog-actions">
                    <el-button @click="dialogVisible = false" round>取消</el-button>
                    <el-button type="primary" @click="handleSave" :loading="submitting" round>
                        保存配置
                    </el-button>
                </div>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import {
    ArrowLeft, Plus, Edit, Delete, CopyDocument, Link
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
    getTokenList, addToken, updateToken, updateTokenStatus, deleteToken, type TokenConfig
} from '../api'

const loading = ref(false)
const submitting = ref(false)
const tokenList = ref<TokenConfig[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)

// 表单初始数据
const initialForm = {
    id: undefined,
    platform: 'github',
    token: '',
    remark: '',
    isActive: true
}
const form = ref<TokenConfig>({ ...initialForm })

// 加载数据
const loadData = async () => {
    loading.value = true
    try {
        const res: any = await getTokenList()
        if (res.code === 200) {
            tokenList.value = res.data || []
        }
    } finally {
        loading.value = false
    }
}

// 打开弹窗
const openDialog = (item?: TokenConfig) => {
    if (item) {
        isEdit.value = true
        form.value = { ...item } // 浅拷贝
    } else {
        isEdit.value = false
        form.value = { ...initialForm }
    }
    dialogVisible.value = true
}

// 保存逻辑
const handleSave = async () => {
    if (!form.value.token || !form.value.platform) {
        ElMessage.warning('请填写完整信息')
        return
    }

    submitting.value = true
    try {
        const apiCall = isEdit.value ? updateToken : addToken
        const res: any = await apiCall(form.value)

        if (res.code === 200) {
            ElMessage.success(isEdit.value ? '更新成功' : '添加成功')
            dialogVisible.value = false
            loadData()
        } else {
            ElMessage.error(res.message || '操作失败')
        }
    } catch (e) {
        // 错误处理
    } finally {
        submitting.value = false
    }
}

// 切换状态
const handleStatusChange = async (item: TokenConfig, newVal: any) => {
    if (!item.id) return
    try {
        const res: any = await updateTokenStatus(item.id, newVal)
        if (res.code === 200) {
            ElMessage.success(`Token已${newVal ? '启用' : '禁用'}`)
        } else {
            // 失败回滚
            item.isActive = !newVal
            ElMessage.error(res.message)
        }
    } catch {
        item.isActive = !newVal
    }
}

// 删除
const handleDelete = async (id?: number) => {
    if (!id) return
    try {
        const res: any = await deleteToken(id)
        if (res.code === 200) {
            ElMessage.success('删除成功')
            // 前端直接移除，减少一次请求
            tokenList.value = tokenList.value.filter(t => t.id !== id)
        }
    } catch (e) { console.error(e) }
}

// 工具函数：脱敏显示
const maskToken = (token: string) => {
    if (!token) return ''
    if (token.length < 10) return '******'
    return `${token.substring(0, 4)}****${token.substring(token.length - 4)}`
}

// 工具函数：复制
const copyToken = (text: string) => {
    navigator.clipboard.writeText(text)
    ElMessage.success('Token已复制到剪贴板')
}

// 简单的图标映射（如果没引入iconfont，这里只是示例逻辑）
const getPlatformIcon = (platform: string) => {
    return 'el-icon-link'
}

onMounted(loadData)
</script>

<style scoped>
.page-container {
    padding: 0 10px;
}

/* 头部样式 (与之前保持一致) */
.page-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
}

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

/* 黑色按钮 */
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

/* --- Bento Card 样式升级 --- */
.bento-card {
    background: #fff;
    border-radius: 24px;
    padding: 24px;
    margin-bottom: 24px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
    border: 1px solid transparent;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}

.bento-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
}

/* 禁用状态下的卡片样式 */
.bento-card.inactive {
    opacity: 0.8;
    background: #FAFAFA;
}

.bento-card.inactive .card-body {
    filter: grayscale(1);
}

/* 卡片内部布局 */
.card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.platform-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 700;
    text-transform: capitalize;
}

.platform-badge.github {
    background: #1C1C1E;
    color: #fff;
}

.platform-badge.gitee {
    background: #FEF2F2;
    color: #C0392B;
    border: 1px solid #FADBD8;
}

.platform-badge.gitlab {
    background: #faf9af;
    color: #fcb51d;
    border: 1px solid #ffe96d;
}

.card-body {
    margin-bottom: 20px;
}

.remark-title {
    margin: 0 0 8px 0;
    font-size: 16px;
    color: #1C1C1E;
}

.token-box {
    background: #F3F4F6;
    padding: 8px 12px;
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: monospace;
    color: #6B7280;
    font-size: 13px;
}

.copy-icon {
    cursor: pointer;
    transition: color 0.2s;
}

.copy-icon:hover {
    color: #1C1C1E;
}

.card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #F3F4F6;
    padding-top: 15px;
}

.status-dot {
    font-size: 12px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
}

.status-dot::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: block;
}

.status-dot.active {
    color: #059669;
}

.status-dot.active::before {
    background: #059669;
    box-shadow: 0 0 8px #059669;
}

.status-dot.inactive {
    color: #9CA3AF;
}

.status-dot.inactive::before {
    background: #D1D5DB;
}

.action-group {
    display: flex;
    gap: 5px;
}

.icon-btn {
    font-size: 16px;
    padding: 8px;
    border-radius: 8px;
    color: #9CA3AF;
    transition: all 0.2s;
}

.icon-btn:hover {
    background: #F3F4F6;
    color: #1C1C1E;
}

.icon-btn.delete:hover {
    color: #EF4444;
    background: #FEF2F2;
}

/* 弹窗表单样式优化 */
.soft-input :deep(.el-input__wrapper) {
    border-radius: 12px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02) !important;
}

.soft-radio :deep(.el-radio-button__inner) {
    border: none;
    background: #F3F4F6;
    padding: 10px 20px;
    box-shadow: none;
}

.soft-radio :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
    background: #1C1C1E;
    color: #fff;
}

.full-width {
    width: 100%;
}
</style>