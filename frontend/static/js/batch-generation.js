// 批量生成系统前端逻辑

let currentBatchId = null;
let progressUpdateInterval = null;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 监听题材复选框变化
    const genreCheckboxes = document.querySelectorAll('.batch-genre-checkbox');
    genreCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectedGenresCount);
    });

    // 加载历史任务列表
    loadBatchTasksList();
});

// 更新选择的题材数量
function updateSelectedGenresCount() {
    const count = document.querySelectorAll('.batch-genre-checkbox:checked').length;
    document.getElementById('selected-genres-count').textContent = `已选择 ${count} 个题材`;
}

// 开始批量生成
async function startBatchGeneration() {
    const taskName = document.getElementById('batch-task-name').value.trim();
    const summary = document.getElementById('batch-summary').value.trim();
    const chapterCount = parseInt(document.getElementById('batch-chapter-count').value);
    const targetWords = parseInt(document.getElementById('batch-target-words').value);

    // 获取选中的题材
    const selectedGenres = [];
    document.querySelectorAll('.batch-genre-checkbox:checked').forEach(checkbox => {
        selectedGenres.push(checkbox.value);
    });

    // 验证输入
    if (!taskName) {
        alert('请输入任务名称');
        return;
    }

    if (!summary) {
        alert('请输入故事创意');
        return;
    }

    if (selectedGenres.length === 0) {
        alert('请至少选择一个题材');
        return;
    }

    // 禁用按钮
    const btn = document.getElementById('btn-start-batch');
    btn.disabled = true;
    btn.innerHTML = '🚀 正在创建任务...';

    try {
        const response = await fetch('/api/batch/quick-create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                task_name: taskName,
                base_summary: summary,
                genres: selectedGenres,
                chapter_count: chapterCount,
                target_words: targetWords
            })
        });

        const result = await response.json();

        if (result.success) {
            currentBatchId = result.batch_id;

            // 显示进度面板
            document.getElementById('current-batch-task-panel').classList.remove('hidden');
            document.getElementById('sub-tasks-panel').classList.remove('hidden');

            // 开始轮询进度
            startProgressPolling();

            alert(result.message);
        } else {
            alert('创建失败：' + (result.message || '未知错误'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('创建失败：' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '🚀 开始批量生成';
    }
}

// 开始轮询进度
function startProgressPolling() {
    // 清除旧的定时器
    if (progressUpdateInterval) {
        clearInterval(progressUpdateInterval);
    }

    // 立即刷新一次
    refreshBatchProgress();

    // 每3秒刷新一次
    progressUpdateInterval = setInterval(refreshBatchProgress, 3000);
}

// 刷新批量任务进度
async function refreshBatchProgress() {
    if (!currentBatchId) return;

    try {
        const response = await fetch(`/api/batch/progress/${currentBatchId}`);
        const result = await response.json();

        if (result.success && result.progress) {
            const progress = result.progress;

            // 更新进度条
            const progressBar = document.getElementById('batch-progress-bar');
            const progressText = document.getElementById('batch-progress-text');
            const statusText = document.getElementById('batch-status-text');

            progressBar.style.width = `${progress.progress_percentage || 0}%`;
            progressText.textContent = `${Math.round(progress.progress_percentage || 0)}%`;
            statusText.textContent = progress.current_step || '准备中...';

            // 更新子任务列表
            if (progress.sub_tasks && progress.sub_tasks.length > 0) {
                updateSubTasksList(progress.sub_tasks);
            }

            // 检查是否完成
            if (progress.status === 'completed') {
                clearInterval(progressUpdateInterval);
                statusText.textContent = '✅ 批量生成完成！';

                // 刷新历史列表
                setTimeout(() => {
                    loadBatchTasksList();
                }, 1000);
            } else if (progress.status === 'failed') {
                clearInterval(progressUpdateInterval);
                statusText.textContent = '❌ 批量生成失败';
                alert('批量生成失败：' + (progress.error_message || '未知错误'));
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// 更新子任务列表
function updateSubTasksList(subTasks) {
    const container = document.getElementById('sub-tasks-list');

    let html = '<div style="display: grid; gap: 12px;">';

    subTasks.forEach(task => {
        const statusClass = getStatusClass(task.status);
        const statusText = getStatusText(task.status);

        html += `
            <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; background: white;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <h4 style="margin: 0;">${task.task_name}</h4>
                    <span class="${statusClass}" style="padding: 4px 12px; border-radius: 12px; font-size: 12px;">${statusText}</span>
                </div>
                <div style="font-size: 14px; color: #666; margin-bottom: 8px;">
                    进度: ${Math.round(task.progress || 0)}% - ${task.current_step || '等待中...'}
                </div>
                ${task.result && task.result.project_id ? `
                    <div style="margin-top: 8px;">
                        <a href="/api/manuscripts/${task.result.project_id}" target="_blank"
                           style="color: #667eea; text-decoration: none; font-size: 14px;">
                            📄 查看生成的文章
                        </a>
                    </div>
                ` : ''}
                ${task.error ? `
                    <div style="margin-top: 8px; color: #ef4444; font-size: 12px;">
                        错误: ${task.error}
                    </div>
                ` : ''}
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

// 获取状态样式类
function getStatusClass(status) {
    const classes = {
        'pending': 'status-pending',
        'running': 'status-running',
        'completed': 'status-completed',
        'failed': 'status-failed'
    };
    return classes[status] || 'status-pending';
}

// 获取状态文本
function getStatusText(status) {
    const texts = {
        'pending': '⏳ 等待中',
        'running': '🔄 生成中',
        'completed': '✅ 已完成',
        'failed': '❌ 失败'
    };
    return texts[status] || status;
}

// 取消批量任务
async function cancelBatchTask() {
    if (!currentBatchId) return;

    if (!confirm('确定要取消这个批量任务吗？')) {
        return;
    }

    try {
        const response = await fetch(`/api/batch/cancel/${currentBatchId}`, {
            method: 'POST'
        });

        const result = await response.json();

        if (result.success) {
            alert('任务已取消');
            clearInterval(progressUpdateInterval);
            loadBatchTasksList();
        } else {
            alert('取消失败：' + (result.message || '未知错误'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('取消失败：' + error.message);
    }
}

// 加载批量任务历史列表
async function loadBatchTasksList() {
    try {
        const response = await fetch('/api/batch/tasks');
        const result = await response.json();

        if (result.success && result.tasks && result.tasks.length > 0) {
            const container = document.getElementById('batch-tasks-history');

            let html = '<div style="overflow-x: auto;"><table style="width: 100%; border-collapse: collapse;">';
            html += '<thead><tr style="background: #f8f9fa;">';
            html += '<th style="padding: 12px; text-align: left; border: 1px solid #ddd;">任务名称</th>';
            html += '<th style="padding: 12px; text-align: left; border: 1px solid #ddd;">状态</th>';
            html += '<th style="padding: 12px; text-align: left; border: 1px solid #ddd;">进度</th>';
            html += '<th style="padding: 12px; text-align: left; border: 1px solid #ddd;">完成情况</th>';
            html += '<th style="padding: 12px; text-align: left; border: 1px solid #ddd;">创建时间</th>';
            html += '<th style="padding: 12px; text-align: left; border: 1px solid #ddd;">操作</th>';
            html += '</tr></thead><tbody>';

            result.tasks.forEach(task => {
                const statusText = getStatusText(task.status);
                const statusClass = getStatusClass(task.status);

                html += '<tr style="border-bottom: 1px solid #ddd;">';
                html += `<td style="padding: 12px;">${task.task_name}</td>`;
                html += `<td style="padding: 12px;"><span class="${statusClass}" style="padding: 4px 8px; border-radius: 8px; font-size: 12px;">${statusText}</span></td>`;
                html += `<td style="padding: 12px;">${Math.round(task.progress_percentage || 0)}%</td>`;
                html += `<td style="padding: 12px;">${task.completed_count || 0} / ${task.total_count || 0}</td>`;
                html += `<td style="padding: 12px; font-size: 12px;">${formatDateTime(task.created_at)}</td>`;
                html += `<td style="padding: 12px;">`;
                html += `<button type="button" class="btn btn-sm btn-secondary" onclick="viewBatchTaskDetail(${task.id})" style="padding: 6px 12px; font-size: 12px;">查看详情</button>`;
                html += '</td>';
                html += '</tr>';
            });

            html += '</tbody></table></div>';
            container.innerHTML = html;
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// 查看批量任务详情
async function viewBatchTaskDetail(batchId) {
    currentBatchId = batchId;

    try {
        const response = await fetch(`/api/batch/task/${batchId}`);
        const result = await response.json();

        if (result.success && result.task) {
            const task = result.task;

            // 显示进度面板
            document.getElementById('current-batch-task-panel').classList.remove('hidden');
            document.getElementById('sub-tasks-panel').classList.remove('hidden');

            // 更新进度
            const progressBar = document.getElementById('batch-progress-bar');
            const progressText = document.getElementById('batch-progress-text');
            const statusText = document.getElementById('batch-status-text');

            progressBar.style.width = `${task.progress_percentage || 0}%`;
            progressText.textContent = `${Math.round(task.progress_percentage || 0)}%`;
            statusText.textContent = task.current_step || '准备中...';

            // 更新子任务列表
            if (task.sub_tasks && task.sub_tasks.length > 0) {
                updateSubTasksList(task.sub_tasks);
            }

            // 如果任务还在运行，开始轮询
            if (task.status === 'running') {
                startProgressPolling();
            }

            // 滚动到进度区域
            document.getElementById('current-batch-task-panel').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    } catch (error) {
        console.error('Error:', error);
        alert('加载详情失败：' + error.message);
    }
}

// 格式化日期时间
function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 页面卸载时清除定时器
window.addEventListener('beforeunload', function() {
    if (progressUpdateInterval) {
        clearInterval(progressUpdateInterval);
    }
});
