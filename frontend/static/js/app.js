// API基础URL
const API_BASE = '/api';

// 当前状态
let currentProject = null;
let currentChapter = null;
let projects = [];

// 情节类型切换
function initPlotTypeSelector() {
    const plotTypeSelect = document.getElementById('plot-type');
    if (plotTypeSelect) {
        plotTypeSelect.addEventListener('change', (e) => {
            const selectedType = e.target.value;
            // 隐藏所有元素组
            document.querySelectorAll('.element-group').forEach(group => {
                group.style.display = 'none';
            });
            // 显示选中的组
            const selectedGroup = document.getElementById(`group-${selectedType}`);
            if (selectedGroup) {
                selectedGroup.style.display = 'block';
            }
        });
    }
}

// 导航切换
function initNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });
}

function switchTab(tabName) {
    // 更新导航按钮
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // 更新内容区域
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) {
        targetTab.classList.add('active');
    }
}

// 生成器表单
function initGeneratorForm() {
    const form = document.getElementById('generator-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const theme = document.getElementById('theme').value;
        const elements = Array.from(document.querySelectorAll('input[name="element"]:checked'))
            .map(cb => cb.value);
        const background = document.getElementById('background').value;
        const targetWords = parseInt(document.getElementById('target-words').value);

        if (elements.length === 0) {
            showToast('请至少选择一个情节元素');
            return;
        }

        try {
            showToast('生成任务已启动，AI正在创作...', 'info');
            const response = await fetch(`${API_BASE}/novel/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    theme,
                    elements,
                    background,
                    target_words: targetWords
                })
            });

            const data = await response.json();
            if (data.success) {
                const projectId = data.project_id;
                showToast('创作已开始！页面将自动跳转并监控进度');

                // 切换到项目列表
                switchTab('projects');

                // 立即刷新一次
                setTimeout(() => refreshProjects(), 500);

                // 启动轮询监控
                startMonitoringProject(projectId);
            }
        } catch (error) {
            showToast('生成失败: ' + error.message);
        }
    });
}

// 监控项目生成状态
let monitoringInterval = null;

function startMonitoringProject(projectId) {
    // 清除之前的监控
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
    }

    let checkCount = 0;
    const maxChecks = 60; // 最多检查60次（3分钟）

    monitoringInterval = setInterval(async () => {
        checkCount++;

        if (checkCount > maxChecks) {
            clearInterval(monitoringInterval);
            showToast('生成时间较长，请手动刷新查看', 'info');
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/novel/project/${projectId}`);
            const project = await response.json();

            // 更新项目列表
            await refreshProjects();

            // 检查状态
            if (project.status === 'completed') {
                clearInterval(monitoringInterval);
                showToast('🎉 小说生成完成！', 'success');
                // 自动打开项目
                openProject(projectId);
            } else if (project.status === 'failed') {
                clearInterval(monitoringInterval);
                showToast('❌ 生成失败，请重试', 'error');
            } else if (project.status === 'generating') {
                // 仍在生成中，显示进度提示
                const progress = Math.min(checkCount * 2, 95);
                showToast(`AI正在创作中... ${progress}%`, 'info');
            }
        } catch (error) {
            console.error('监控失败:', error);
        }
    }, 3000); // 每3秒检查一次
}

// 项目列表
async function refreshProjects() {
    try {
        const response = await fetch(`${API_BASE}/novel/projects`);
        const data = await response.json();

        const listEl = document.getElementById('projects-list');
        if (data.projects.length === 0) {
            listEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">暂无项目</p>';
            return;
        }

        listEl.innerHTML = data.projects.map(project => `
            <div class="project-card" onclick="openProject(${project.id})">
                <h3>${project.name}</h3>
                <div class="meta">
                    <span class="status ${project.status}">${getStatusText(project.status)}</span>
                    <span>${project.word_count} 字</span>
                    <span>${new Date(project.created_at).toLocaleDateString()}</span>
                </div>
            </div>
        `).join('');

        projects = data.projects;
    } catch (error) {
        showToast('加载项目失败: ' + error.message);
    }
}

function getStatusText(status) {
    const statusMap = {
        'draft': '草稿',
        'generating': '生成中',
        'completed': '已完成',
        'failed': '失败'
    };
    return statusMap[status] || status;
}

// 打开项目
async function openProject(projectId) {
    try {
        const response = await fetch(`${API_BASE}/novel/project/${projectId}`);
        const project = await response.json();

        currentProject = project;

        // 切换到编辑器
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById('tab-editor').classList.add('active');

        document.getElementById('editor-title').textContent = project.name;

        // 加载章节列表
        loadChapters(project.chapters);

        // 如果有章节，打开第一章
        if (project.chapters.length > 0) {
            selectChapter(project.chapters[0]);
        }
    } catch (error) {
        showToast('加载项目失败: ' + error.message);
    }
}

function loadChapters(chapters) {
    const listEl = document.getElementById('chapters-list');
    listEl.innerHTML = chapters.map(chapter => `
        <div class="chapter-card" data-id="${chapter.id}" onclick="selectChapterById(${chapter.id})">
            <div class="chapter-title">${chapter.title}</div>
            <div class="chapter-meta">${chapter.word_count || 0} 字</div>
        </div>
    `).join('');
}

function selectChapterById(chapterId) {
    const chapter = currentProject.chapters.find(c => c.id === chapterId);
    if (chapter) {
        selectChapter(chapter);
    }
}

function selectChapter(chapter) {
    currentChapter = chapter;

    // 更新选中状态
    document.querySelectorAll('.chapter-card').forEach(card => {
        card.classList.toggle('active', parseInt(card.dataset.id) === chapter.id);
    });

    // 加载内容
    document.getElementById('chapter-title').value = chapter.title || '';
    document.getElementById('chapter-content').value = chapter.content || '';
    updateWordCount();
}

// 返回项目列表
function backToProjects() {
    document.getElementById('tab-editor').classList.remove('active');
    switchTab('projects');
    refreshProjects();
}

// 保存项目
async function saveProject() {
    if (!currentProject) return;

    // 更新当前章节
    if (currentChapter) {
        currentChapter.title = document.getElementById('chapter-title').value;
        currentChapter.content = document.getElementById('chapter-content').value;
        currentChapter.word_count = currentChapter.content.length;
    }

    try {
        await fetch(`${API_BASE}/novel/chapter`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project_id: currentProject.id,
                chapter_id: currentChapter.id,
                title: currentChapter.title,
                content: currentChapter.content
            })
        });

        showToast('保存成功');
        loadChapters(currentProject.chapters);
    } catch (error) {
        showToast('保存失败: ' + error.message);
    }
}

// 导出项目
async function exportProject() {
    if (!currentProject) return;

    try {
        showToast('正在生成Word文档...', 'info');

        const response = await fetch(`${API_BASE}/novel/export/${currentProject.id}`, {
            method: 'POST'
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${currentProject.name}.docx`;
            a.click();
            URL.revokeObjectURL(url);

            showToast('导出成功');
        } else {
            showToast('导出失败', 'error');
        }
    } catch (error) {
        showToast('导出失败: ' + error.message, 'error');
    }
}

// 预览
function togglePreview() {
    const panel = document.getElementById('preview-panel');
    const isVisible = panel.style.display !== 'none';

    if (isVisible) {
        panel.style.display = 'none';
    } else {
        updatePreview();
        panel.style.display = 'block';
    }
}

function updatePreview() {
    const content = document.getElementById('chapter-content').value;
    const title = document.getElementById('chapter-title').value;

    const previewEl = document.getElementById('preview-content');
    previewEl.innerHTML = `
        <h1>${title}</h1>
        ${content.split('\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('')}
    `;
}

// 字数统计
document.getElementById('chapter-content')?.addEventListener('input', updateWordCount);

function updateWordCount() {
    const content = document.getElementById('chapter-content').value;
    document.getElementById('word-count').textContent = content.length;
}

// AI润色
async function polishContent() {
    const content = document.getElementById('chapter-content').value;
    if (!content || content.trim().length === 0) {
        showToast('请先输入内容');
        return;
    }

    // 弹出输入框让用户输入润色要求
    const focus = prompt('请输入润色要求（可选）：', '让情绪更激烈！增强戏剧冲突！');
    if (focus === null) {
        return; // 用户取消
    }

    const style = prompt('请选择目标风格（可选）：', '港澳播报员口吻，极致情绪化');
    if (style === null) {
        return; // 用户取消
    }

    try {
        showToast('正在润色...', 'info');
        const response = await fetch(`${API_BASE}/novel/polish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: content,
                focus: focus || '让情绪更激烈',
                style: style || '港澳播报员口吻'
            })
        });

        const data = await response.json();
        if (data.success) {
            // 显示润色前后的对比
            const originalLength = content.length;
            const polishedLength = data.polished.length;
            const diff = polishedLength - originalLength;

            let confirmMsg = `✨ 润色完成！\n\n`;
            confirmMsg += `原文: ${originalLength} 字\n`;
            confirmMsg += `润色后: ${polishedLength} 字\n`;
            confirmMsg += `变化: ${diff > 0 ? '+' : ''}${diff} 字\n\n`;
            confirmMsg += `是否替换原文？`;

            if (confirm(confirmMsg)) {
                document.getElementById('chapter-content').value = data.polished;
                updateWordCount();
                showToast('已应用润色结果');
            } else {
                showToast('已取消');
            }
        } else {
            showToast('润色失败: ' + (data.message || '未知错误'));
        }
    } catch (error) {
        console.error('润色错误:', error);
        showToast('润色失败: ' + error.message);
    }
}

// 分析情节
async function analyzePlot() {
    // 检查是否选择了章节
    if (!currentChapter) {
        showToast('请先选择一个章节');
        return;
    }

    const content = document.getElementById('chapter-content').value;
    if (!content || content.trim().length === 0) {
        showToast('章节内容为空，无法分析');
        return;
    }

    try {
        showToast('正在进行深度情节分析，请稍候...', 'info');
        const response = await fetch(`${API_BASE}/analyze/plot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: content,
                use_ai: true
            })
        });

        const data = await response.json();
        if (data.success) {
            const result = data.result;

            // 构建定制化的分析报告
            let html = '<div style="max-height: 70vh; overflow-y: auto; padding: 20px; line-height: 1.8;">';
            html += '<h2 style="color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">📊 情节分析报告</h2>';

            // 1. 文章名称
            html += '<div style="margin: 20px 0;">';
            html += '<h3 style="color: #10b981; font-size: 18px;">📖 文章名称</h3>';
            const articleTitle = currentProject.name || currentChapter.title || '未命名作品';
            html += `<div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981; font-size: 16px; font-weight: bold;">${articleTitle}</div>`;
            html += '</div>';

            // 2. 文章核心冲突
            html += '<div style="margin: 20px 0;">';
            html += '<h3 style="color: #ef4444; font-size: 18px;">⚔️ 文章核心冲突</h3>';
            const coreConflict = result.core_conflict || result.conflict || '暂未识别到核心冲突';
            html += `<div style="background: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444;">${coreConflict}</div>`;
            html += '</div>';

            // 3. 信息差
            html += '<div style="margin: 20px 0;">';
            html += '<h3 style="color: #f59e0b; font-size: 18px;">🔍 信息差</h3>';
            const informationGap = result.information_gap || result.informationGap || '暂未识别到信息差';
            html += `<div style="background: #fffbeb; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; white-space: pre-wrap;">${informationGap}</div>`;
            html += '</div>';

            // 4. 核心任务
            html += '<div style="margin: 20px 0;">';
            html += '<h3 style="color: #8b5cf6; font-size: 18px;">🎯 核心任务</h3>';
            const coreTask = result.core_task || result.coreTask || '暂未识别到核心任务';
            html += `<div style="background: #faf5ff; padding: 15px; border-radius: 8px; border-left: 4px solid #8b5cf6;">${coreTask}</div>`;
            html += '</div>';

            // 5. 核心任务的人设
            html += '<div style="margin: 20px 0;">';
            html += '<h3 style="color: #3b82f6; font-size: 18px;">👤 核心任务的人设</h3>';
            const characterProfile = result.character_profile || result.characterProfile || result.characters_analysis || '暂未识别到人设信息';

            if (typeof characterProfile === 'object') {
                html += '<div style="background: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">';
                if (characterProfile.main_characters && characterProfile.main_characters.length > 0) {
                    html += '<strong style="display: block; margin-bottom: 10px;">主要人物：</strong>';
                    characterProfile.main_characters.forEach(char => {
                        html += `<div style="margin-left: 15px; margin-bottom: 12px; padding: 10px; background: white; border-radius: 6px;">`;
                        html += `<div style="font-weight: bold; color: #1e40af;">${char.name || '未命名'}</div>`;
                        if (char.role) html += `<div style="color: #6b7280; font-size: 14px; margin-top: 5px;">角色：${char.role}</div>`;
                        if (char.personality) html += `<div style="color: #6b7280; font-size: 14px;">性格：${char.personality}</div>`;
                        if (char.motivation) html += `<div style="color: #6b7280; font-size: 14px;">动机：${char.motivation}</div>`;
                        if (char.actions) html += `<div style="color: #6b7280; font-size: 14px;">行为：${char.actions}</div>`;
                        html += '</div>';
                    });
                }
                html += '</div>';
            } else {
                html += `<div style="background: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; white-space: pre-wrap;">${characterProfile}</div>`;
            }
            html += '</div>';

            // 补充信息（可选显示）
            if (result.plot_tags || result.tags) {
                const tags = result.plot_tags || result.tags || [];
                if (tags.length > 0) {
                    html += '<div style="margin: 20px 0;">';
                    html += '<h3 style="color: #14b8a6; font-size: 16px;">🏷️ 情节标签</h3>';
                    html += '<div style="display: flex; flex-wrap: wrap; gap: 8px;">';
                    tags.forEach(tag => {
                        html += `<span style="background: #ecfdf5; color: #0f766e; padding: 6px 14px; border-radius: 16px; font-size: 13px;">${tag}</span>`;
                    });
                    html += '</div></div>';
                }
            }

            html += '</div>';

            // 显示在模态框中
            const modal = document.createElement('div');
            modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
            modal.innerHTML = `
                <div style="background: white; border-radius: 16px; max-width: 800px; max-height: 90vh; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                    <div style="padding: 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
                        <h2 style="margin: 0; font-size: 20px;">情节分析报告</h2>
                        <button onclick="this.closest('div[style*=fixed]').remove()" style="background: #ef4444; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer; font-size: 16px;">✕ 关闭</button>
                    </div>
                    <div style="padding: 0; overflow-y: auto; max-height: calc(90vh - 80px);">${html}</div>
                </div>
            `;

            document.body.appendChild(modal);
            showToast('✨ 分析完成！');

        } else {
            showToast('分析失败: ' + (data.message || '未知错误'));
        }
    } catch (error) {
        console.error('分析错误:', error);
        showToast('分析失败: ' + error.message);
    }
}

// 续写
async function continueWrite() {
    showToast('续写功能开发中...');
}

// 语料库
async function refreshExamples() {
    try {
        const response = await fetch(`${API_BASE}/corpus`);
        const data = await response.json();

        const listEl = document.getElementById('corpus-list');
        if (data.corpus.length === 0) {
            listEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">暂无语料</p>';
            return;
        }

        listEl.innerHTML = data.corpus.map(item => {
            // 计算内容质量指标
            const contentLength = (item.content || '').length;
            let qualityIndicator = '';
            let qualityText = '';

            if (contentLength > 2000) {
                qualityIndicator = '🟢';
                qualityText = '完整';
            } else if (contentLength > 500) {
                qualityIndicator = '🟡';
                qualityText = '摘要';
            } else {
                qualityIndicator = '🔴';
                qualityText = '简短';
            }

            return `
            <div class="corpus-card" onclick="viewCorpusDetails(${item.id})" style="cursor: pointer;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <h4 style="flex: 1;">${item.title || '无标题'}</h4>
                    <span title="内容质量: ${qualityText}" style="font-size: 1.2rem; margin-left: 0.5rem;">${qualityIndicator}</span>
                </div>
                <div class="content">${(item.content || '').substring(0, 150)}${item.content && item.content.length > 150 ? '...' : ''}</div>
                <div class="tags">
                    <span class="tag" style="background: var(--primary-color); color: white;">${item.source}</span>
                    ${(item.plot_tags || []).slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                <div style="margin-top: 0.75rem; text-align: right; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.75rem; color: var(--text-secondary);">${contentLength} 字</span>
                    <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); viewCorpusDetails(${item.id})">查看详情</button>
                </div>
            </div>
        `}).join('');
    } catch (error) {
        console.error('加载语料失败:', error);
    }
}

// 查看语料详情
async function viewCorpusDetails(corpusId) {
    try {
        showToast('正在加载详情...', 'info');

        // 获取语料详情
        const response = await fetch(`${API_BASE}/corpus/${corpusId}`);
        const data = await response.json();

        if (!data.success) {
            showToast('加载失败', 'error');
            return;
        }

        const corpus = data.corpus;

        // 创建详情模态框
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 900px;">
                <div class="modal-header">
                    <h3>语料详情</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <div style="margin-bottom: 1.5rem;">
                        <h4 style="color: var(--primary-color); margin-bottom: 0.5rem;">${corpus.title || '无标题'}</h4>
                        <div style="color: var(--text-secondary); font-size: 0.875rem;">
                            来源：${corpus.source} |
                            创建时间：${new Date(corpus.created_at).toLocaleDateString('zh-CN')}
                        </div>
                    </div>

                    <div style="background: var(--background); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem; max-height: 300px; overflow-y: auto;">
                        <pre style="white-space: pre-wrap; font-family: inherit; font-size: 0.875rem;">${corpus.content || '暂无内容'}</pre>
                    </div>

                    <div style="text-align: center; margin-bottom: 1.5rem;">
                        <button class="btn btn-primary" onclick="analyzeCorpus(${corpus.id})">📊 智能分析</button>
                    </div>

                    <div id="analysis-result-${corpus.id}" style="display: none;">
                        <!-- 分析结果将显示在这里 -->
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    } catch (error) {
        console.error('加载详情失败:', error);
        showToast('加载失败', 'error');
    }
}

// 分析语料
async function analyzeCorpus(corpusId) {
    try {
        const resultDiv = document.getElementById(`analysis-result-${corpusId}`);
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<p style="text-align: center; padding: 2rem;">正在分析中，请稍候...</p>';

        // 获取语料内容
        const response = await fetch(`${API_BASE}/corpus/${corpusId}`);
        const data = await response.json();
        const corpus = data.corpus;

        // 调用AI分析
        const analyzeResponse = await fetch(`${API_BASE}/analyze/plot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: corpus.content,
                use_ai: true
            })
        });

        const analyzeData = await analyzeResponse.json();

        if (analyzeData.success) {
            const result = analyzeData.result;

            // 使用定制化的分析报告框架
            let html = '<div style="max-height: 70vh; overflow-y: auto; padding: 20px; line-height: 1.8;">';
            html += '<h2 style="color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">📊 情节分析报告</h2>';

            // 1. 文章名称
            html += '<div style="margin: 20px 0;">';
            html += '<h3 style="color: #10b981; font-size: 18px;">📖 文章名称</h3>';
            html += `<div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981; font-size: 16px; font-weight: bold;">${corpus.title || '未命名作品'}</div>`;
            html += '</div>';

            // 2. 文章核心冲突
            html += '<div style="margin: 20px 0;">';
            html += '<h3 style="color: #ef4444; font-size: 18px;">⚔️ 文章核心冲突</h3>';
            const coreConflict = result.core_conflict || result.conflict || '暂未识别到核心冲突';
            html += `<div style="background: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444;">${coreConflict}</div>`;
            html += '</div>';

            // 3. 信息差
            html += '<div style="margin: 20px 0;">';
            html += '<h3 style="color: #f59e0b; font-size: 18px;">🔍 信息差</h3>';
            const informationGap = result.information_gap || result.informationGap || '暂未识别到信息差';
            html += `<div style="background: #fffbeb; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; white-space: pre-wrap;">${informationGap}</div>`;
            html += '</div>';

            // 4. 核心任务
            html += '<div style="margin: 20px 0;">';
            html += '<h3 style="color: #8b5cf6; font-size: 18px;">🎯 核心任务</h3>';
            const coreTask = result.core_task || result.coreTask || '暂未识别到核心任务';
            html += `<div style="background: #faf5ff; padding: 15px; border-radius: 8px; border-left: 4px solid #8b5cf6;">${coreTask}</div>`;
            html += '</div>';

            // 5. 核心任务的人设
            html += '<div style="margin: 20px 0;">';
            html += '<h3 style="color: #3b82f6; font-size: 18px;">👤 核心任务的人设</h3>';
            const characterProfile = result.character_profile || result.characterProfile || result.characters_analysis || '暂未识别到人设信息';

            if (typeof characterProfile === 'object') {
                html += '<div style="background: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">';
                if (characterProfile.main_characters && characterProfile.main_characters.length > 0) {
                    html += '<strong style="display: block; margin-bottom: 10px;">主要人物：</strong>';
                    characterProfile.main_characters.forEach(char => {
                        html += `<div style="margin-left: 15px; margin-bottom: 12px; padding: 10px; background: white; border-radius: 6px;">`;
                        html += `<div style="font-weight: bold; color: #1e40af;">${char.name || '未命名'}</div>`;
                        if (char.role) html += `<div style="color: #6b7280; font-size: 14px; margin-top: 5px;">角色：${char.role}</div>`;
                        if (char.personality) html += `<div style="color: #6b7280; font-size: 14px;">性格：${char.personality}</div>`;
                        if (char.motivation) html += `<div style="color: #6b7280; font-size: 14px;">动机：${char.motivation}</div>`;
                        if (char.actions) html += `<div style="color: #6b7280; font-size: 14px;">行为：${char.actions}</div>`;
                        html += '</div>';
                    });
                }
                html += '</div>';
            } else {
                html += `<div style="background: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; white-space: pre-wrap;">${characterProfile}</div>`;
            }
            html += '</div>';

            // 补充信息（可选显示）
            if (result.plot_tags || result.tags) {
                const tags = result.plot_tags || result.tags || [];
                if (tags.length > 0) {
                    html += '<div style="margin: 20px 0;">';
                    html += '<h3 style="color: #14b8a6; font-size: 16px;">🏷️ 情节标签</h3>';
                    html += '<div style="display: flex; flex-wrap: wrap; gap: 8px;">';
                    tags.forEach(tag => {
                        html += `<span style="background: #ecfdf5; color: #0f766e; padding: 6px 14px; border-radius: 16px; font-size: 13px;">${tag}</span>`;
                    });
                    html += '</div></div>';
                }
            }

            html += '</div>';

            resultDiv.innerHTML = html;
        } else {
            resultDiv.innerHTML = '<p style="text-align: center; color: var(--danger-color);">分析失败</p>';
        }
    } catch (error) {
        console.error('分析失败:', error);
        const resultDiv = document.getElementById(`analysis-result-${corpusId}`);
        resultDiv.innerHTML = `<p style="text-align: center; color: var(--danger-color);">分析失败: ${error.message}</p>`;
    }
}


// 抓取搜索
async function crawlSearch() {
    const keyword = document.getElementById('search-keyword').value;
    const source = document.getElementById('search-source').value;

    if (!keyword) {
        showToast('请输入搜索关键词');
        return;
    }

    try {
        showToast('正在抓取...', 'info');
        const response = await fetch(`${API_BASE}/crawl/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                source,
                keyword,
                limit: 20
            })
        });

        const data = await response.json();
        if (data.success) {
            showToast(`抓取完成，找到 ${data.found} 条，保存 ${data.saved} 条`);
            setTimeout(refreshExamples, 1000);
        }
    } catch (error) {
        showToast('抓取失败: ' + error.message);
    }
}

// Toast提示
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show';

    if (type === 'info') {
        toast.style.background = 'var(--primary-color)';
    }

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ========== 投稿管理功能 ==========

// 投稿数据存储
let submissions = [];

// 初始化投稿管理
function initSubmissionManagement() {
    refreshSubmissions();
    initSubmissionForm();
}

// 刷新投稿列表
async function refreshSubmissions() {
    try {
        const response = await fetch(`${API_BASE}/submissions`);
        const data = await response.json();

        const listEl = document.getElementById('submissions-list');
        if (!data.submissions || data.submissions.length === 0) {
            listEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">暂无投稿记录</p>';
            return;
        }

        listEl.innerHTML = data.submissions.map(sub => `
            <div class="submission-card">
                <div class="submission-card-header">
                    <div>
                        <h3>${sub.book_name || '未命名'}</h3>
                        <div style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.25rem;">
                            主题：${sub.theme}
                        </div>
                    </div>
                    <span class="submission-platform">${sub.platform}</span>
                </div>
                <div class="submission-meta">
                    <div class="submission-meta-item">
                        <span>📝</span>
                        <span>笔名：${sub.pen_name}</span>
                    </div>
                    <div class="submission-meta-item">
                        <span>📊</span>
                        <span>字数：${sub.word_count}</span>
                    </div>
                    <div class="submission-meta-item">
                        <span>📅</span>
                        <span>${sub.submission_date || '未设置'}</span>
                    </div>
                </div>
                <div>
                    <span class="submission-status ${sub.status}">${getStatusText(sub.status)}</span>
                </div>
                ${sub.notes ? `<div style="margin-top: 0.75rem; color: var(--text-secondary); font-size: 0.875rem;">备注：${sub.notes}</div>` : ''}
                <div class="submission-actions">
                    <button class="btn btn-sm btn-secondary" onclick="editSubmission(${sub.id})">编辑</button>
                    <button class="btn btn-sm btn-secondary" onclick="deleteSubmission(${sub.id})">删除</button>
                    <button class="btn btn-sm btn-primary" onclick="viewSubmissionDetails(${sub.id})">查看详情</button>
                </div>
            </div>
        `).join('');

        submissions = data.submissions;
    } catch (error) {
        console.error('加载投稿失败:', error);
        const listEl = document.getElementById('submissions-list');
        listEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">加载失败，请刷新重试</p>';
    }
}

// 获取状态文本
function getSubmissionStatusText(status) {
    const statusMap = {
        'pending': '待投稿',
        'submitted': '已投稿',
        'under_review': '审核中',
        'approved': '已通过',
        'rejected': '已拒绝',
        'published': '已发布'
    };
    return statusMap[status] || status;
}

// 显示新建投稿模态框
async function showCreateSubmissionModal() {
    document.getElementById('modal-title').textContent = '新建投稿';
    document.getElementById('submission-form').reset();
    document.getElementById('submission-id').value = '';
    document.getElementById('submission-penname').value = '鱼头';
    document.getElementById('generated-content').style.display = 'none';

    // 加载项目列表
    try {
        const response = await fetch(`${API_BASE}/novel/projects`);
        const data = await response.json();
        const select = document.getElementById('submission-project');
        select.innerHTML = '<option value="">请选择项目</option>';
        data.projects.forEach(project => {
            select.innerHTML += `<option value="${project.id}" data-word-count="${project.word_count}" data-theme="${project.name}">${project.name} (${project.word_count}字)</option>`;
        });
    } catch (error) {
        showToast('加载项目失败', 'error');
    }

    document.getElementById('submission-modal').style.display = 'flex';
}

// 关闭模态框
function closeSubmissionModal() {
    document.getElementById('submission-modal').style.display = 'none';
}

// 初始化投稿表单
function initSubmissionForm() {
    const form = document.getElementById('submission-form');
    if (!form) return;

    // 监听项目选择
    const projectSelect = document.getElementById('submission-project');
    projectSelect.addEventListener('change', async (e) => {
        const selectedOption = e.target.selectedOptions[0];
        if (selectedOption && selectedOption.value) {
            const wordCount = selectedOption.dataset.wordCount;
            const theme = selectedOption.dataset.theme;
            document.getElementById('submission-bookname').value = theme;
            document.getElementById('submission-theme').value = theme;
        }
    });

    // 监听自动生成选项
    const autoGenerateCheckbox = document.getElementById('auto-generate');
    autoGenerateCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            generateSubmissionContent();
        }
    });

    // 监听表单输入变化，实时生成内容
    form.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('change', () => {
            if (autoGenerateCheckbox.checked) {
                generateSubmissionContent();
            }
        });
    });

    // 表单提交
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submissionData = {
            project_id: parseInt(document.getElementById('submission-project').value),
            platform: document.getElementById('submission-platform').value,
            pen_name: document.getElementById('submission-penname').value,
            book_name: document.getElementById('submission-bookname').value,
            theme: document.getElementById('submission-theme').value,
            status: document.getElementById('submission-status').value,
            submission_date: document.getElementById('submission-date').value,
            notes: document.getElementById('submission-notes').value,
            generated_title: document.getElementById('submission-title').value,
            generated_intro: document.getElementById('submission-intro').value
        };

        try {
            const id = document.getElementById('submission-id').value;
            const url = id ? `${API_BASE}/submissions/${id}` : `${API_BASE}/submissions`;
            const method = id ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData)
            });

            const data = await response.json();
            if (data.success) {
                showToast(id ? '投稿已更新' : '投稿已创建');
                closeSubmissionModal();
                refreshSubmissions();
            } else {
                showToast('操作失败: ' + (data.message || '未知错误'), 'error');
            }
        } catch (error) {
            showToast('操作失败: ' + error.message, 'error');
        }
    });
}

// 生成投稿内容
function generateSubmissionContent() {
    const projectSelect = document.getElementById('submission-project');
    const selectedOption = projectSelect.selectedOptions[0];

    if (!selectedOption || !selectedOption.value) {
        return;
    }

    const wordCount = selectedOption.dataset.wordCount || 0;
    const theme = document.getElementById('submission-theme').value || '';
    const bookName = document.getElementById('submission-bookname').value || '';
    const penName = document.getElementById('submission-penname').value || '鱼头';

    // 生成标题：短篇-主题-书名-笔名鱼头-字数
    const title = `短篇-${theme}-${bookName}-笔名${penName}-${wordCount}字`;

    // 生成导语
    const intro = generateSubmissionIntro(theme, bookName, wordCount);

    document.getElementById('submission-title').value = title;
    document.getElementById('submission-intro').value = intro;
    document.getElementById('generated-content').style.display = 'block';
}

// 生成投稿导语
function generateSubmissionIntro(theme, bookName, wordCount) {
    const intros = [
        `这是一部${wordCount}字的短篇力作，讲述${theme}的精彩故事。情感真挚，情节跌宕起伏，必能引起读者强烈共鸣。`,
        `${bookName} - 一部${wordCount}字的${theme}题材作品。故事张力十足，人物刻画鲜活，情感表达细腻到位，期待与您合作！`,
        `精心打磨${wordCount}字，专注${theme}题材。本文以独特的视角切入，情节紧凑，情绪饱满，定能为平台带来优质内容。`,
        `${theme}题材短篇，${wordCount}字完整呈现。故事架构清晰，冲突设置巧妙，情感层层递进，符合平台收稿要求。`,
        `这是一部关于${theme}的${wordCount}字精品短篇。开头吸引眼球，中间冲突激烈，结局反转有力，读者粘性高。`
    ];

    return intros[Math.floor(Math.random() * intros.length)];
}

// 复制标题
function copySubmissionTitle() {
    const title = document.getElementById('submission-title').value;
    navigator.clipboard.writeText(title).then(() => {
        showToast('标题已复制');
    }).catch(() => {
        showToast('复制失败', 'error');
    });
}

// 复制导语
function copySubmissionIntro() {
    const intro = document.getElementById('submission-intro').value;
    navigator.clipboard.writeText(intro).then(() => {
        showToast('导语已复制');
    }).catch(() => {
        showToast('复制失败', 'error');
    });
}

// 编辑投稿
async function editSubmission(id) {
    const submission = submissions.find(s => s.id === id);
    if (!submission) return;

    document.getElementById('modal-title').textContent = '编辑投稿';
    document.getElementById('submission-id').value = submission.id;
    document.getElementById('submission-platform').value = submission.platform;
    document.getElementById('submission-penname').value = submission.pen_name;
    document.getElementById('submission-bookname').value = submission.book_name;
    document.getElementById('submission-theme').value = submission.theme;
    document.getElementById('submission-status').value = submission.status;
    document.getElementById('submission-date').value = submission.submission_date || '';
    document.getElementById('submission-notes').value = submission.notes || '';

    if (submission.generated_title) {
        document.getElementById('submission-title').value = submission.generated_title;
    }
    if (submission.generated_intro) {
        document.getElementById('submission-intro').value = submission.generated_intro;
    }

    document.getElementById('generated-content').style.display = 'block';
    document.getElementById('submission-modal').style.display = 'flex';
}

// 删除投稿
async function deleteSubmission(id) {
    if (!confirm('确定要删除这条投稿记录吗？')) return;

    try {
        const response = await fetch(`${API_BASE}/submissions/${id}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        if (data.success) {
            showToast('投稿已删除');
            refreshSubmissions();
        } else {
            showToast('删除失败', 'error');
        }
    } catch (error) {
        showToast('删除失败: ' + error.message, 'error');
    }
}

// 查看投稿详情
function viewSubmissionDetails(id) {
    const submission = submissions.find(s => s.id === id);
    if (!submission) return;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>投稿详情</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">✕</button>
            </div>
            <div class="modal-body">
                <div style="line-height: 2;">
                    <p><strong>平台：</strong>${submission.platform}</p>
                    <p><strong>书名：</strong>${submission.book_name}</p>
                    <p><strong>主题：</strong>${submission.theme}</p>
                    <p><strong>笔名：</strong>${submission.pen_name}</p>
                    <p><strong>字数：</strong>${submission.word_count}</p>
                    <p><strong>状态：</strong>${getSubmissionStatusText(submission.status)}</p>
                    <p><strong>投稿日期：</strong>${submission.submission_date || '未设置'}</p>
                    ${submission.notes ? `<p><strong>备注：</strong>${submission.notes}</p>` : ''}
                    ${submission.generated_title ? `
                        <hr style="margin: 1rem 0; border: none; border-top: 1px solid var(--border);">
                        <p><strong>投稿标题：</strong></p>
                        <div style="background: var(--background); padding: 0.75rem; border-radius: 0.375rem; margin: 0.5rem 0;">
                            ${submission.generated_title}
                        </div>
                    ` : ''}
                    ${submission.generated_intro ? `
                        <p><strong>邮件导语：</strong></p>
                        <div style="background: var(--background); padding: 0.75rem; border-radius: 0.375rem; margin: 0.5rem 0; white-space: pre-wrap;">
                            ${submission.generated_intro}
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// 在初始化时添加投稿管理
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initPlotTypeSelector();
    initGeneratorForm();
    initSubmissionManagement();
    refreshProjects();
    refreshExamples();
});
