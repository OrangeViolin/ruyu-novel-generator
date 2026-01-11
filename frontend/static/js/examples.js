// ========== 例文拆解功能 ==========

// 当前编辑的例文ID
let currentExampleId = null;

// 刷新例文列表
async function refreshExamples() {
    try {
        const response = await fetch(`${API_BASE}/examples`);
        const data = await response.json();

        const listEl = document.getElementById('examples-list');
        if (!data.examples || data.examples.length === 0) {
            listEl.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem; color: var(--text-secondary);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📚</div>
                    <h3>还没有拆解笔记</h3>
                    <p style="margin: 1rem 0;">点击"新建拆解"开始学习优秀例文</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = data.examples.map(item => `
            <div class="example-card" onclick="editExample(${item.id})">
                <h4>${item.title || '未命名例文'}</h4>
                <div class="preview">${item.content_preview || '无内容预览'}</div>
                <div class="tags">
                    ${(item.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                <div class="meta">
                    更新于 ${new Date(item.updated_at).toLocaleDateString('zh-CN')}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('加载例文列表失败:', error);
    }
}

// 显示例文列表
function showExampleList() {
    document.getElementById('examples-list').style.display = 'grid';
    document.getElementById('analysis-workspace').style.display = 'none';
    clearAnalysisForm();
    currentExampleId = null;
}

// 新建拆解
function startNewAnalysis() {
    document.getElementById('examples-list').style.display = 'none';
    document.getElementById('analysis-workspace').style.display = 'grid';
    clearAnalysisForm();
    currentExampleId = null;
}

// 清空表单
function clearAnalysisForm() {
    document.getElementById('example-title').value = '';
    document.getElementById('example-content').value = '';
    document.getElementById('analysis-title-field').value = '';
    document.getElementById('core-conflict-field').value = '';
    document.getElementById('information-gap-field').value = '';
    document.getElementById('core-task-field').value = '';
    document.getElementById('character-profile-field').value = '';
    document.getElementById('notes-field').value = '';
    document.getElementById('example-tags').value = '';
}

// 编辑例文
async function editExample(exampleId) {
    try {
        showToast('正在加载...', 'info');
        const response = await fetch(`${API_BASE}/examples/${exampleId}`);
        const data = await response.json();

        // 填充表单
        document.getElementById('example-title').value = data.title || '';
        document.getElementById('example-content').value = data.content || '';
        document.getElementById('analysis-title-field').value = data.analysis_title || '';
        document.getElementById('core-conflict-field').value = data.core_conflict || '';
        document.getElementById('information-gap-field').value = data.information_gap || '';
        document.getElementById('core-task-field').value = data.core_task || '';
        document.getElementById('character-profile-field').value = data.character_profile || '';
        document.getElementById('notes-field').value = data.notes || '';
        document.getElementById('example-tags').value = (data.tags || []).join(', ');

        currentExampleId = exampleId;

        // 显示工作区
        document.getElementById('examples-list').style.display = 'none';
        document.getElementById('analysis-workspace').style.display = 'grid';
    } catch (error) {
        showToast('加载失败: ' + error.message, 'error');
    }
}

// 保存笔记
async function saveAnalysis() {
    const title = document.getElementById('example-title').value.trim();
    const content = document.getElementById('example-content').value.trim();

    if (!title || !content) {
        showToast('请填写例文标题和内容', 'error');
        return;
    }

    const analysisData = {
        title,
        source_url: null,
        content,
        analysis_title: document.getElementById('analysis-title-field').value.trim(),
        core_conflict: document.getElementById('core-conflict-field').value.trim(),
        information_gap: document.getElementById('information-gap-field').value.trim(),
        core_task: document.getElementById('core-task-field').value.trim(),
        character_profile: document.getElementById('character-profile-field').value.trim(),
        notes: document.getElementById('notes-field').value.trim(),
        tags: document.getElementById('example-tags').value.split(',').map(t => t.trim()).filter(t => t)
    };

    try {
        const url = currentExampleId ? `${API_BASE}/examples/${currentExampleId}` : `${API_BASE}/examples`;
        const method = currentExampleId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(analysisData)
        });

        const data = await response.json();
        if (data.success) {
            showToast(currentExampleId ? '笔记已更新' : '笔记已保存');
            if (!currentExampleId) {
                currentExampleId = data.id;
            }
        } else {
            showToast('保存失败: ' + (data.message || '未知错误'), 'error');
        }
    } catch (error) {
        showToast('保存失败: ' + error.message, 'error');
    }
}

// AI辅助拆解
async function analyzeWithAI() {
    const content = document.getElementById('example-content').value.trim();

    if (!content) {
        showToast('请先粘贴例文内容', 'error');
        return;
    }

    try {
        showToast('正在AI分析中...', 'info');

        const response = await fetch(`${API_BASE}/analyze/plot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, use_ai: true })
        });

        const data = await response.json();
        if (data.success && data.result) {
            const result = data.result;

            // 填充拆解字段
            if (result.core_conflict) {
                document.getElementById('core-conflict-field').value = result.core_conflict;
            }
            if (result.information_gap) {
                document.getElementById('information-gap-field').value = result.information_gap;
            }
            if (result.core_task) {
                document.getElementById('core-task-field').value = result.core_task;
            }
            if (result.character_profile) {
                const profile = result.character_profile;
                let profileText = '';
                if (profile.main_characters) {
                    profile.main_characters.forEach(char => {
                        profileText += `【${char.name}】\n`;
                        profileText += `角色：${char.role}\n`;
                        profileText += `性格：${char.personality}\n`;
                        profileText += `动机：${char.motivation}\n`;
                        if (char.secret) {
                            profileText += `秘密：${char.secret}\n`;
                        }
                        profileText += '\n';
                    });
                }
                if (profile.relationships) {
                    profileText += '【关系网】\n';
                    profile.relationships.forEach(rel => {
                        profileText += `${rel.from} → ${rel.to}: ${rel.type}\n`;
                        profileText += `  ${rel.description}\n\n`;
                    });
                }
                document.getElementById('character-profile-field').value = profileText;
            }

            // 自动填充标题（如果没有）
            if (!document.getElementById('analysis-title-field').value) {
                document.getElementById('analysis-title-field').value = document.getElementById('example-title').value;
            }

            showToast('AI分析完成！请检查并补充拆解内容');
        } else {
            showToast('AI分析失败', 'error');
        }
    } catch (error) {
        console.error('AI分析失败:', error);
        showToast('AI分析失败: ' + error.message, 'error');
    }
}

// 从链接获取
function fetchFromUrl() {
    document.getElementById('url-input-section').style.display = 'block';
    document.getElementById('example-url').focus();
}

// 从URL获取内容
async function fetchContentFromUrl() {
    const url = document.getElementById('example-url').value.trim();
    if (!url) {
        showToast('请输入链接', 'error');
        return;
    }

    try {
        showToast('正在获取内容...', 'info');

        const response = await fetch(`${API_BASE}/fetch-content`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        const data = await response.json();

        if (data.success) {
            // 填充标题和内容
            if (data.title && !document.getElementById('example-title').value) {
                document.getElementById('example-title').value = data.title;
            }
            document.getElementById('example-content').value = data.content || '';

            // 隐藏URL输入框
            document.getElementById('url-input-section').style.display = 'none';

            showToast(`获取成功！约 ${data.word_count} 字`);
        } else {
            showToast('获取失败: ' + (data.error || '未知错误'), 'error');
            // 即使失败也隐藏输入框，让用户手动输入
            document.getElementById('url-input-section').style.display = 'none';
        }
    } catch (error) {
        console.error('获取失败:', error);
        showToast('获取失败，请手动复制粘贴内容', 'error');
        document.getElementById('url-input-section').style.display = 'none';
    }

    document.getElementById('example-url').value = '';
}
