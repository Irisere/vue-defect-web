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
                    <input type="text" placeholder="Search repos..." />
                </div>
                <el-button type="primary" size="large" @click="dialogVisible = true">
                    <el-icon style="margin-right: 6px">
                        <Plus />
                    </el-icon> 关联新仓库
                </el-button>
            </div>

            <el-table :data="repoList" style="width: 100%" size="large">
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

                <el-table-column label="Actions" width="280" align="right">
                    <template #default="scope">
                        <el-button size="small" round class="action-btn" @click="handleCollect(scope.row)"
                            :loading="loading">
                            🚀 采集
                        </el-button>
                        <el-button size="small" round class="action-btn secondary" @click="viewDefects(scope.row)">
                            查看报告
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
        </el-card>

        <el-dialog v-model="dialogVisible" title="关联新仓库" width="450px" align-center class="custom-dialog">
            <el-form label-position="top" size="large">
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
            </el-form>
            <template #footer>
                <el-button @click="dialogVisible = false" round>取消</el-button>
                <el-button type="primary" @click="handleCreate" round>确认关联</el-button>
            </template>
        </el-dialog>
        <CollectIssueDialog v-model="collectDialogVisible" :repo="currentRepo" @success="loadData" />

    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Search, Plus } from '@element-plus/icons-vue'
import { getRepoByProject, addRepo } from '../api'
import CollectIssueDialog from '@/components/CollectIssueDialog.vue'


const collectDialogVisible = ref(false)
const currentRepo = ref<any>(null)


const route = useRoute(); const router = useRouter(); const projectId = Number(route.params.id);
const repoList = ref([]); const loading = ref(false); const dialogVisible = ref(false);
const form = ref({ platform: 'github', owner: '', repoName: '', projectId });
const loadData = async () => { const res: any = await getRepoByProject(projectId); if (res.code === 200) repoList.value = res.data; };
const handleCollect = (row: any) => {
    currentRepo.value = {
        id: row.id,
        owner: row.owner,
        repoName: row.repoName,
        platform: row.platform
    }
    collectDialogVisible.value = true
}



const handleCreate = async () => { await addRepo({ ...form.value, projectId }); dialogVisible.value = false; loadData(); };
const viewDefects = (row: any) => { router.push(`/repo/${row.id}/defects`); };
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
    background: #EAEAEA;
    color: #333;
}

.status-pill.gitee {
    background: #FEF2F2;
    color: #DC2626;
}

.status-pill.gitlab {
    background: #FEF2F2;
    color: #f5eb5c;
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
</style>