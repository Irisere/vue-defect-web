<template>
    <el-dialog :model-value="modelValue" @update:modelValue="close" title="Issue 采集" width="480px" align-center>
        <!-- 表单状态 -->
        <template v-if="status === 'form'">
            <el-form label-position="top" size="large">
                <el-form-item label="代码平台">
                    <el-input :value="repo?.platform" disabled />
                </el-form-item>

                <el-form-item label="Owner">
                    <el-input :value="repo?.owner" disabled />
                </el-form-item>

                <el-form-item label="Repository">
                    <el-input :value="repo?.repoName" disabled />
                </el-form-item>

                <el-form-item label="Issue 状态">
                    <el-select v-model="form.state">
                        <el-option label="Open" value="open" />
                        <el-option label="Closed" value="closed" />
                        <el-option label="All" value="all" />
                    </el-select>
                </el-form-item>

                <el-form-item label="开始时间（since）">
                    <el-date-picker v-model="form.since" type="date" value-format="YYYY-MM-DD" placeholder="可选" />
                </el-form-item>

                <el-form-item label="结束时间（until）">
                    <el-date-picker v-model="form.until" type="date" value-format="YYYY-MM-DD" placeholder="可选" />
                </el-form-item>
            </el-form>
        </template>

        <!-- 采集中 -->
        <template v-else-if="status === 'collecting'">
            <div class="center-box">
                <el-icon class="is-loading icon">
                    <Loading />
                </el-icon>
                <p class="title">采集中，请稍候…</p>
                <p class="desc">
                    正在从 {{ repo?.platform }} 拉取 Issue 数据
                </p>
            </div>
        </template>

        <!-- 完成 -->
        <template v-else>
            <div class="center-box">
                <el-icon class="icon success">
                    <CircleCheck />
                </el-icon>
                <p class="title">采集完成</p>
                <p class="desc">
                    本次新增 <b>{{ result.updateNum }}</b> 条缺陷数据
                </p>
            </div>
        </template>

        <template #footer>
            <el-button v-if="status === 'form'" round @click="close(false)">
                取消
            </el-button>

            <el-button v-if="status === 'form'" type="primary" round :loading="loading" @click="startCollect">
                开始采集
            </el-button>

            <el-button v-if="status === 'done'" type="primary" round @click="finish">
                完成
            </el-button>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading, CircleCheck } from '@element-plus/icons-vue'
import { collectIssues } from '@/api'

const props = defineProps<{
    modelValue: boolean
    repo: {
        id: number
        owner: string
        repoName: string
        platform: string
    } | null
}>()

const emit = defineEmits(['update:modelValue', 'success'])

const status = ref<'form' | 'collecting' | 'done'>('form')
const loading = ref(false)

const form = ref({
    state: 'open',
    since: '',
    until: ''
})

const result = ref({
    updateNum: 0
})

watch(
    () => props.modelValue,
    (v) => {
        if (v) reset()
    }
)

const reset = () => {
    status.value = 'form'
    loading.value = false
    result.value.updateNum = 0
    form.value = {
        state: 'open',
        since: '',
        until: ''
    }
}

const close = (v = false) => {
    emit('update:modelValue', v)
}

const startCollect = async () => {
    if (!props.repo) return

    loading.value = true
    status.value = 'collecting'

    try {
        const res: any = await collectIssues({
            repoId: props.repo.id,
            owner: props.repo.owner,
            repo: props.repo.repoName,
            platform: props.repo.platform,
            state: form.value.state,
            since: form.value.since,
            until: form.value.until
        })

        if (res.code === 200) {
            const data = JSON.parse(res.data)
            result.value.updateNum = data?.data?.update_num ?? 0
            status.value = 'done'
            emit('success')
        } else {
            throw new Error(res.message)
        }
    } catch (e) {
        ElMessage.error('采集失败')
        status.value = 'form'
    } finally {
        loading.value = false
    }
}

const finish = () => {
    emit('update:modelValue', false)
}
</script>

<style scoped>
.center-box {
    text-align: center;
    padding: 40px 0;
}

.icon {
    font-size: 32px;
    margin-bottom: 16px;
}

.icon.success {
    color: #67c23a;
}

.title {
    font-size: 16px;
    font-weight: 600;
}

.desc {
    margin-top: 8px;
    color: #909399;
}
</style>
