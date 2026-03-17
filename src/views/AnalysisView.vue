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
                    <h2>数据洞察</h2>
                    <p>缺陷趋势分析与分布统计</p>
                </div>
            </div>
            <div class="header-controls">
                <el-button circle class="refresh-btn" @click="refreshData" :loading="loading">
                    <el-icon>
                        <Refresh />
                    </el-icon>
                </el-button>
            </div>
        </div>

        <div v-if="loading && !overviewData.totalProjects" class="loading-skeleton">
            <el-skeleton :rows="10" animated />
        </div>

        <div v-else class="analysis-grid">

            <div class="stat-card glass-purple">
                <div class="stat-icon"><el-icon>
                        <Files />
                    </el-icon></div>
                <div class="stat-info">
                    <span class="label">总项目数</span>
                    <span class="number">{{ overviewData.totalProjects || 0 }}</span>
                </div>
            </div>

            <div class="stat-card glass-blue">
                <div class="stat-icon"><el-icon>
                        <Folder />
                    </el-icon></div>
                <div class="stat-info">
                    <span class="label">关联仓库</span>
                    <span class="number">{{ overviewData.totalRepos || 0 }}</span>
                </div>
            </div>

            <div class="stat-card glass-dark span-2">
                <div class="stat-info-horizontal">
                    <div>
                        <span class="label light">累计发现缺陷</span>
                        <span class="number highlight">{{ overviewData.totalDefects || 0 }}</span>
                    </div>
                    <div class="decoration-icon">🐞</div>
                </div>
            </div>

            <div class="bento-card chart-card wide">
                <div class="card-header">
                    <h3>缺陷发现趋势</h3>
                    <span class="tag">近30天</span>
                </div>
                <div class="chart-container" ref="trendChartRef"></div>
            </div>

            <div class="bento-card chart-card">
                <div class="card-header">
                    <h3>严重程度分布</h3>
                </div>
                <div class="chart-container" ref="severityChartRef"></div>
            </div>

            <div class="bento-card chart-card full-width">
                <div class="card-header">
                    <h3>缺陷仓库排行榜 (Top 5)</h3>
                    <p>需重点关注的代码库</p>
                </div>
                <div class="chart-container-horizontal" ref="topRepoChartRef"></div>
            </div>

        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { ArrowLeft, Refresh, Files, Folder } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import {
    getAnalysisOverview,
    getAnalysisTrend,
    getAnalysisSeverity,
    getAnalysisTopRepos
} from '../api'

// --- 状态管理 ---
const loading = ref(false)
const overviewData = ref<any>({})
const trendChartRef = ref<HTMLElement | null>(null)
const severityChartRef = ref<HTMLElement | null>(null)
const topRepoChartRef = ref<HTMLElement | null>(null)

// ECharts 实例
let chartInstances: echarts.ECharts[] = []

// --- 数据加载 ---
const refreshData = () => {
    fetchData()
}

const fetchData = async () => {
    loading.value = true
    try {
        // 1. 并发请求所有数据
        const [resOverview, resTrend, resSeverity, resTop] = await Promise.all([
            getAnalysisOverview(),
            getAnalysisTrend(),
            getAnalysisSeverity(),
            getAnalysisTopRepos()
        ])

        // 2. 处理概览数据
        if (resOverview.code === 200) overviewData.value = resOverview.data

        // 3. 渲染图表 (需要等待 DOM 更新)
        await nextTick()

        // 渲染趋势图
        if (resTrend.code === 200) initTrendChart(resTrend.data)
        // 渲染分布图
        if (resSeverity.code === 200) initSeverityChart(resSeverity.data)
        // 渲染排行图
        if (resTop.code === 200) initTopRepoChart(resTop.data)

    } catch (e) {
        console.error("加载报表失败", e)
    } finally {
        loading.value = false
    }
}

// --- 图表初始化逻辑 ---

// 1. 趋势折线图
const initTrendChart = (data: any[]) => {
    if (!trendChartRef.value) return
    const chart = echarts.init(trendChartRef.value)

    const dates = data.map(item => item.name)
    const values = data.map(item => item.value)

    chart.setOption({
        grid: { top: 30, right: 20, bottom: 20, left: 40, containLabel: true },
        tooltip: { trigger: 'axis' },
        xAxis: {
            type: 'category',
            data: dates,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { color: '#9CA3AF' }
        },
        yAxis: {
            type: 'value',
            splitLine: { lineStyle: { type: 'dashed', color: '#E5E7EB' } }
        },
        series: [{
            data: values,
            type: 'line',
            smooth: true,
            symbol: 'none',
            lineStyle: { width: 3, color: '#8c52ff' },
            areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: 'rgba(140, 82, 255, 0.4)' },
                    { offset: 1, color: 'rgba(140, 82, 255, 0.01)' }
                ])
            }
        }]
    })
    chartInstances.push(chart)
}

// 2. 严重程度饼图
const initSeverityChart = (data: any[]) => {
    if (!severityChartRef.value) return
    const chart = echarts.init(severityChartRef.value)

    // 颜色映射
    const colorMap: Record<string, string> = {
        'Critical': '#EF4444', // 红
        'High': '#F59E0B',     // 橙
        'Medium': '#D97706',
        'Normal': '#10B981',   // 绿
        'Low': '#3B82F6',      // 蓝
        'Unknown': '#9CA3AF'
    }

    chart.setOption({
        tooltip: { trigger: 'item' },
        legend: { bottom: '0%', left: 'center', icon: 'circle' },
        series: [{
            name: 'Severity',
            type: 'pie',
            radius: ['40%', '70%'], // 环形
            center: ['50%', '45%'],
            itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
            label: { show: false },
            data: data.map(item => ({
                value: item.value,
                name: item.name,
                itemStyle: { color: colorMap[item.name] || '#9CA3AF' }
            }))
        }]
    })
    chartInstances.push(chart)
}

// 3. Top 仓库条形图
const initTopRepoChart = (data: any[]) => {
    if (!topRepoChartRef.value) return
    const chart = echarts.init(topRepoChartRef.value)

    // 数据倒序，让最多的在上面
    const sortedData = [...data].reverse()
    const names = sortedData.map(item => item.name)
    const values = sortedData.map(item => item.value)

    chart.setOption({
        grid: { top: 10, right: 30, bottom: 20, left: 10, containLabel: true },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'value', show: false },
        yAxis: {
            type: 'category',
            data: names,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { width: 100, overflow: 'truncate', color: '#374151' }
        },
        series: [{
            type: 'bar',
            data: values,
            barWidth: 20,
            itemStyle: {
                borderRadius: [0, 20, 20, 0],
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                    { offset: 0, color: '#3B82F6' },
                    { offset: 1, color: '#8c52ff' }
                ])
            },
            label: { show: true, position: 'right', color: '#6B7280' }
        }]
    })
    chartInstances.push(chart)
}

// --- 响应式处理 ---
const handleResize = () => {
    chartInstances.forEach(chart => chart.resize())
}

onMounted(() => {
    fetchData()
    window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    chartInstances.forEach(chart => chart.dispose())
})
</script>

<style scoped>
.page-container {
    padding: 0 10px;
}

/* 头部样式 */
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

.refresh-btn {
    border: none;
    background: #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    color: #1C1C1E;
}

.refresh-btn:hover {
    background: #F3F4F6;
}

/* Grid 布局 */
.analysis-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
}

/* 顶部数字卡片 */
.stat-card {
    border-radius: 24px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 15px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
    transition: transform 0.2s;
}

.stat-card:hover {
    transform: translateY(-3px);
}

/* 卡片配色 */
.glass-purple {
    background: linear-gradient(135deg, #fff 0%, #F5F3FF 100%);
    border: 1px solid #EBE9FE;
}

.glass-blue {
    background: linear-gradient(135deg, #fff 0%, #EFF6FF 100%);
    border: 1px solid #DBEAFE;
}

/* 黑色卡片 (Highlight) */
.glass-dark {
    background: #1C1C1E;
    color: #fff;
    border: 1px solid #000;
}

.span-2 {
    grid-column: span 2;
}

/* 图标与文字 */
.stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.stat-info {
    display: flex;
    flex-direction: column;
}

.stat-info .label {
    font-size: 12px;
    color: #6B7280;
    font-weight: 500;
}

.stat-info .number {
    font-size: 24px;
    font-weight: 700;
    color: #1C1C1E;
    margin-top: 4px;
}

/* 黑色卡片内部样式 */
.stat-info-horizontal {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 0 10px;
}

.label.light {
    color: rgba(255, 255, 255, 0.6);
    display: block;
    margin-bottom: 5px;
    font-size: 13px;
}

.number.highlight {
    font-size: 32px;
    color: #F4D35E;
}

/* 黄色高亮 */
.decoration-icon {
    font-size: 40px;
    opacity: 0.2;
}

/* 主图表卡片 */
.bento-card {
    background: #fff;
    border-radius: 24px;
    padding: 24px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
}

.chart-card.wide {
    grid-column: span 3;
}

/* 趋势图占3列 */
.chart-card {
    grid-column: span 1;
    min-height: 350px;
    display: flex;
    flex-direction: column;
}

.full-width {
    grid-column: span 4;
    min-height: 300px;
}

.card-header {
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.card-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #1C1C1E;
}

.card-header p {
    margin: 0;
    font-size: 12px;
    color: #9CA3AF;
}

.tag {
    background: #F3F4F6;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 12px;
    color: #6B7280;
}

/* 图表容器 */
.chart-container {
    flex: 1;
    width: 100%;
    min-height: 250px;
}

.chart-container-horizontal {
    flex: 1;
    width: 100%;
    min-height: 200px;
}

/* 响应式 */
@media (max-width: 1024px) {
    .analysis-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .span-2 {
        grid-column: span 2;
    }

    .chart-card.wide {
        grid-column: span 2;
    }

    .chart-card {
        grid-column: span 2;
    }

    .full-width {
        grid-column: span 2;
    }
}

@media (max-width: 768px) {
    .analysis-grid {
        grid-template-columns: 1fr;
    }

    .span-2 {
        grid-column: span 1;
    }

    .chart-card.wide,
    .chart-card,
    .full-width {
        grid-column: span 1;
    }
}
</style>