<template>
    <div class="page-container">
        <div class="page-header-row">
            <div class="back-btn" @click="$router.back()">
                <el-icon>
                    <ArrowLeft />
                </el-icon>
            </div>
            <div class="header-text">
                <h2>仓库管理</h2>
                <p>关联代码库并配置 issue 采集规则</p>
            </div>
        </div>

        <el-card class="content-card">
            <div class="table-action-bar">
                <div class="search-pill">
                    <el-icon>
                        <Search />
                    </el-icon>
                    <input type="text" placeholder="Search repos..." v-model="searchQuery" />
                </div>
                <el-button type="primary" size="large" @click="dialogVisible = true">
                    <el-icon style="margin-right: 6px">
                        <Plus />
                    </el-icon> 关联新仓库
                </el-button>
            </div>

            <el-table :data="filteredRepoList" style="width: 100%" size="large">
                <el-table-column prop="platform" label="Platform" width="120">
                    <template #default="scope">
                        <span class="status-pill" :class="scope.row.platform">
                            {{ scope.row.platform }}
                        </span>
                    </template>
                </el-table-column>

                <el-table-column prop="owner" label="Owner">
                    <template #default="scope">
                        <span class="text-bold">{{ scope.row.owner }}</span>
                    </template>
                </el-table-column>

                <el-table-column prop="repoName" label="Repository" />

                <el-button :loading="isBatchChecking" @click="handleBatchCheck" size="large" round
                    style="margin-right: 12px">
                    <el-icon style="margin-right: 6px">
                        <Refresh />
                    </el-icon> 检查状态
                </el-button>

                <el-table-column label="Status" width="140">
                    <template #default="scope">
                        <el-tooltip :content="repoStatusMap[scope.row.id] === 'error' ? '仓库不存在或网络无法连接' : '连接正常'"
                            placement="top">
                            <div class="status-cell">
                                <el-tag v-if="repoStatusMap[scope.row.id] === 'success'" type="success"
                                    disable-transitions>
                                    Active
                                </el-tag>
                                <el-tag v-else-if="repoStatusMap[scope.row.id] === 'error'" type="danger"
                                    disable-transitions>
                                    Invalid
                                </el-tag>
                                <el-tag v-else-if="repoStatusMap[scope.row.id] === 'loading'" type="info"
                                    disable-transitions>
                                    <div class="loading-wrapper">
                                        <el-icon class="is-loading">
                                            <Loading />
                                        </el-icon>
                                        <span>Checking</span>
                                    </div>
                                </el-tag>
                                <span v-else style="color: #909399; font-size: 12px;">Unknown</span>
                            </div>
                        </el-tooltip>
                    </template>
                </el-table-column>
                <el-table-column label="Actions" width="280" align="right">
                    <template #default="scope">
                        <el-button size="small" round class="action-btn" @click="handleCollect(scope.row)"
                            :loading="loading">
                            🚀 采集
                        </el-button>
                        <el-button size="small" round class="action-btn secondary" @click="viewDefects(scope.row)">
                            查看报告
                        </el-button>
                        <el-button size="small" circle type="danger" plain :icon="Delete"
                            @click="handleDelete(scope.row)" style="margin-left: 12px" />
                    </template>
                </el-table-column>
            </el-table>
        </el-card>

        <el-dialog v-model="dialogVisible" title="关联新仓库" width="500px" align-center class="custom-dialog">
            <div style="margin-bottom: 20px; text-align: center;">
                <el-radio-group v-model="importMode" size="default">
                    <el-radio-button label="url">URL 快速导入</el-radio-button>
                    <el-radio-button label="manual">手动填写</el-radio-button>
                </el-radio-group>
            </div>

            <el-form label-position="top" size="large">
                <template v-if="importMode === 'url'">
                    <el-form-item label="仓库链接 (URL)">
                        <el-input v-model="quickUrl" placeholder="例如: https://github.com/vuejs/core" clearable />
                        <p style="font-size: 12px; color: #9CA3AF; margin-top: 8px;">支持 GitHub、Gitee、GitLab 链接</p>
                    </el-form-item>
                </template>

                <template v-else>
                    <el-form-item label="代码平台">
                        <el-select v-model="form.platform" class="full-width">
                            <el-option value="github" label="GitHub" />
                            <el-option value="gitee" label="Gitee" />
                            <el-option value="gitlab" label="Gitlab" />
                        </el-select>
                    </el-form-item>
                    <el-form-item label="Owner / Organization">
                        <el-input v-model="form.owner" placeholder="e.g. vuejs" />
                    </el-form-item>
                    <el-form-item label="Repository Name">
                        <el-input v-model="form.repoName" placeholder="e.g. core" />
                    </el-form-item>
                </template>
            </el-form>

            <template #footer>
                <el-button @click="dialogVisible = false" round>取消</el-button>
                <el-button type="primary" @click="handleConfirmAdd" round :disabled="addLoading">确认关联</el-button>
            </template>
        </el-dialog>
        <CollectIssueDialog v-model="collectDialogVisible" :repo="currentRepo" @success="loadData" />

    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Search, Plus, Delete, Loading } from '@element-plus/icons-vue'
import { getRepoByProject, addRepo, deleteRepo, importRepo, validateRepoBatch } from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'
import CollectIssueDialog from '@/components/CollectIssueDialog.vue'


const collectDialogVisible = ref(false)
const currentRepo = ref<any>(null)
const searchQuery = ref('') // 定义搜索关键词变量


const route = useRoute(); const router = useRouter(); const projectId = Number(route.params.id);
const repoList = ref<any[]>([]); const loading = ref(false); const dialogVisible = ref(false);
const form = ref({ platform: 'github', owner: '', repoName: '', projectId });
// const loadData = async () => { const res: any = await getRepoByProject(projectId); if (res.code === 200) repoList.value = res.data; };
const handleCollect = (row: any) => {
    currentRepo.value = {
        id: row.id,
        owner: row.owner,
        repoName: row.repoName,
        platform: row.platform
    }
    collectDialogVisible.value = true
}
// 1. 新增响应式变量
const importMode = ref('url'); // 默认 URL 导入
const quickUrl = ref('');
const addLoading = ref(false);

// 2. 统一处理提交逻辑
const handleConfirmAdd = async () => {
    addLoading.value = true;
    try {
        if (importMode.value === 'url') {
            // URL 导入逻辑
            if (!quickUrl.value) return ElMessage.warning('请输入仓库链接');
            const res: any = await importRepo({
                url: quickUrl.value,
                projectId: projectId
            });

            if (res.code === 200) {
                ElMessage.success('导入成功');
                quickUrl.value = '';
                dialogVisible.value = false;
                loadData();
            } else {
                ElMessage.error(res.message);
            }
        } else {
            // 原有的手动创建逻辑
            await handleCreate();
        }
    } catch (e) {
        console.error(e);
    } finally {
        addLoading.value = false;
    }
};

// 3. 修改原有的 handleCreate，让它更简洁
const handleCreate = async () => {
    const res: any = await addRepo({ ...form.value, projectId });
    if (res.code === 200) {
        ElMessage.success('创建成功');
        dialogVisible.value = false;
        loadData();
    }
};
const viewDefects = (row: any) => { router.push(`/repo/${row.id}/defects`); };

//检验仓库有效性
// 1. 存储状态：{ repoId: 'loading' | 'success' | 'error' }
const repoStatusMap = ref<Record<number, string>>({});
const isBatchChecking = ref(false);

// 2. 批量检查逻辑
const handleBatchCheck = async () => {
    if (repoList.value.length === 0) return;

    // 初始化所有状态为 loading
    isBatchChecking.value = true;
    repoList.value.forEach(repo => {
        repoStatusMap.value[repo.id] = 'loading';
    });

    try {
        const res = await validateRepoBatch(repoList.value);
        if (res.code === 200) {
            // 将后端 Map<Integer, Boolean> 映射到前端状态
            Object.entries(res.data).forEach(([id, isValid]) => {
                repoStatusMap.value[Number(id)] = isValid ? 'success' : 'error';
            });
        }
    } catch (e) {
        console.error("批量校验失败:", e);
        // 出错时将 loading 重置为 error
        repoList.value.forEach(repo => {
            if (repoStatusMap.value[repo.id] === 'loading') {
                repoStatusMap.value[repo.id] = 'error';
            }
        });
    } finally {
        isBatchChecking.value = false;
    }
};

// 3. 增强 loadData
const loadData = async () => {
    const res: any = await getRepoByProject(projectId);
    if (res.code === 200) {
        repoList.value = res.data;
        // 列表加载完成后自动触发一次批量检查
        handleBatchCheck();
    }
};

// 删除处理逻辑
const handleDelete = async (row: any) => {
    try {
        await ElMessageBox.confirm(
            `确认取消关联仓库 [${row.repoName}] 吗？相关采集的缺陷数据可能也会受影响。`,
            '警告',
            {
                confirmButtonText: '确认删除',
                cancelButtonText: '取消',
                type: 'warning',
                buttonSize: 'default',
                draggable: true,
            }
        )

        const res: any = await deleteRepo(row.id)
        if (res.code === 200) {
            ElMessage.success('删除成功')
            loadData() // 刷新列表
        } else {
            ElMessage.error(res.message || '删除失败')
        }
    } catch (error) {
        // 取消删除不作处理
    }
}
// 搜索过滤逻辑
const filteredRepoList = computed(() => {
    // 如果没有输入关键词，返回原列表
    if (!searchQuery.value) return repoList.value

    const keyword = searchQuery.value.toLowerCase()
    return repoList.value.filter((item: any) => {
        return (
            item.owner.toLowerCase().includes(keyword) ||
            item.repoName.toLowerCase().includes(keyword) ||
            item.platform.toLowerCase().includes(keyword)
        )
    })
})
onMounted(loadData);

</script>

<style scoped>
.page-container {
    padding: 0 10px;
}

/* 头部样式 */
.page-header-row {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 30px;
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

/* 内容卡片 */
.content-card {
    padding: 10px;
    min-height: 600px;
}

.table-action-bar {
    display: flex;
    justify-content: space-between;
    margin-bottom: 30px;
    padding: 0 10px;
}

/* 搜索框 (仿 Bento 风格) */
.search-pill {
    background: #F3F4F6;
    border-radius: 30px;
    padding: 10px 20px;
    display: flex;
    align-items: center;
    width: 260px;
}

.search-pill input {
    border: none;
    background: transparent;
    outline: none;
    margin-left: 10px;
    width: 100%;
    color: #1C1C1E;
}

/* 状态标签 */
.status-pill {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    text-transform: capitalize;
}

.status-pill.github {
    background: #889fecce;
    color: #1330a8;
}

.status-pill.gitee {
    background: #FEF2F2;
    color: #DC2626;
}

.status-pill.gitlab {
    background: #f1e891ce;
    color: #D97706;
}

.text-bold {
    font-weight: 600;
    color: #1C1C1E;
}

/* 按钮微调 */
.action-btn {
    font-weight: 600;
}

.action-btn.secondary {
    background: #F3F4F6;
    border: none;
    color: #4B5563;
}

.action-btn.secondary:hover {
    background: #E5E7EB;
}

.full-width {
    width: 100%;
}

/*有效性*/
/* 确保状态单元格内部居中 */
.status-cell {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    /* 或者 center，取决于你希望靠左还是居中 */
}

/* 专门针对加载状态的容器 */
.loading-wrapper {
    display: flex;
    align-items: center;
    gap: 4px;
    /* 图标和文字之间的间距 */
}

.is-loading {
    /* 移除之前的 margin-right，改用 gap 控制间距更专业 */
    margin-right: 0;
    animation: rotating 2s linear infinite;
    display: flex;
    /* 确保图标自身也是 flex 居中 */
    align-items: center;
}
</style>