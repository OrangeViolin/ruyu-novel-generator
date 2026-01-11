// 人机协作写作系统
let currentProjectId = null;
let collaborativeCurrentStep = 'characters';
let previewProjectData = null; // 存储AI生成的预览数据

// 提示消息函数（需要在其他函数之前定义）
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) {
        console.log('Toast:', message);
        return;
    }
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// 模态框函数（全局可访问）
function showCreateProjectModal() {
    const modal = document.getElementById('create-project-modal');
    if (modal) modal.style.display = 'block';
}

function showCreateCharacterModal() {
    if (!currentProjectId) {
        showToast('请先选择或创建项目');
        return;
    }
    const modal = document.getElementById('create-character-modal');
    if (modal) modal.style.display = 'block';
}

function showGenerateCharacterModal() {
    if (!currentProjectId) {
        showToast('请先选择或创建项目');
        return;
    }
    const modal = document.getElementById('generate-character-modal');
    if (modal) modal.style.display = 'block';
}

function showCreateOutlineModal() {
    if (!currentProjectId) {
        showToast('请先选择或创建项目');
        return;
    }
    const modal = document.getElementById('create-outline-modal');
    if (modal) modal.style.display = 'block';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

// AI生成全套项目设定
async function aiGenerateFullProject() {
    const statusDiv = document.getElementById('ai-generating-status');
    if (statusDiv) statusDiv.style.display = 'block';

    try {
        const response = await fetch('/api/projects/generate-full', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();
        if (result.success) {
            // 存储预览数据
            previewProjectData = result.data;

            // 关闭创建项目模态框
            closeModal('create-project-modal');

            // 显示预览模态框
            showPreviewModal(result.data);
        } else {
            showToast('生成失败，请重试');
        }
    } catch (error) {
        console.error('AI生成失败:', error);
        showToast('生成失败，请重试');
    } finally {
        if (statusDiv) statusDiv.style.display = 'none';
    }
}

// 显示预览模态框
function showPreviewModal(data) {
    const previewContent = document.getElementById('ai-preview-content');

    // 构建预览HTML
    let html = '<div class="preview-section">';

    // 项目基本信息
    html += `
        <div class="preview-group">
            <h4>📚 项目设定</h4>
            <div class="form-group">
                <label>项目名称</label>
                <input type="text" id="preview-name" class="form-control" value="${escapeHtml(data.name || '')}" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>主题</label>
                    <input type="text" id="preview-theme" class="form-control" value="${escapeHtml(data.theme || '')}" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div class="form-group">
                    <label>类型</label>
                    <input type="text" id="preview-genre" class="form-control" value="${escapeHtml(data.genre || '')}" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
            </div>
            <div class="form-group">
                <label>核心冲突</label>
                <textarea id="preview-conflict" class="form-control" rows="2" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">${escapeHtml(data.core_conflict || '')}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>背景</label>
                    <input type="text" id="preview-background" class="form-control" value="${escapeHtml(data.background || '')}" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div class="form-group">
                    <label>目标字数</label>
                    <input type="number" id="preview-target-words" class="form-control" value="${data.target_words || 10000}" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
            </div>
            <div class="form-group">
                <label>核心任务</label>
                <textarea id="preview-core-task" class="form-control" rows="2" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">${escapeHtml(data.core_task || '')}</textarea>
            </div>
        </div>
    `;

    // 人物设定
    if (data.characters && data.characters.length > 0) {
        html += '<div class="preview-group"><h4>👥 人物设定</h4>';
        data.characters.forEach((char, index) => {
            html += `
                <div class="preview-card" style="background: #f9f9f9; padding: 1rem; margin-bottom: 1rem; border-radius: 4px;">
                    <div class="form-row">
                        <div class="form-group">
                            <label>姓名</label>
                            <input type="text" class="preview-char-name" data-index="${index}" value="${escapeHtml(char.name || '')}" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                                                        <div class="form-group">
                            <label>角色类型</label>
                                                            <select class="preview-char-role" data-index="${index}" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                                <option value="protagonist" ${char.role_type === 'protagonist' ? 'selected' : ''}>主角</option>
                                <option value="antagonist" ${char.role_type === 'antagonist' ? 'selected' : ''}>反派</option>
                                <option value="supporting" ${char.role_type === 'supporting' ? 'selected' : ''}>配角</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>性格</label>
                            <textarea class="preview-char-personality" data-index="${index}" rows="2" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">${escapeHtml(char.personality || '')}</textarea>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>动机</label>
                        <textarea class="preview-char-motivation" data-index="${index}" rows="2" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">${escapeHtml(char.motivation || '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label>秘密</label>
                        <textarea class="preview-char-secret" data-index="${index}" rows="2" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">${escapeHtml(char.secret || '')}</textarea>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }

    // 章节大纲
    if (data.outlines && data.outlines.length > 0) {
        html += '<div class="preview-group"><h4>📋 章节大纲</h4>';
        data.outlines.forEach((outline, index) => {
            html += `
                <div class="preview-card" style="background: #f9f9f9; padding: 1rem; margin-bottom: 1rem; border-radius: 4px;">
                    <div class="form-row">
                        <div class="form-group">
                            <label>章节号</label>
                            <input type="number" class="preview-outline-chapter" data-index="${index}" value="${outline.chapter_number || index + 1}" style="width: 80px; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                        <div class="form-group" style="flex: 2;">
                            <label>标题</label>
                            <input type="text" class="preview-outline-title" data-index="${index}" value="${escapeHtml(outline.title || '')}" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>摘要</label>
                        <textarea class="preview-outline-summary" data-index="${index}" rows="3" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">${escapeHtml(outline.summary || '')}</textarea>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }

    html += '</div>';

    previewContent.innerHTML = html;

    // 显示模态框
    const modal = document.getElementById('ai-preview-modal');
    if (modal) modal.style.display = 'block';
}

// HTML转义函数
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 确认创建项目
async function confirmCreateProject() {
    if (!previewProjectData) {
        showToast('没有预览数据');
        return;
    }

    // 从表单收集修改后的数据
    const confirmedData = {
        project: {
            name: document.getElementById('preview-name').value,
            theme: document.getElementById('preview-theme').value,
            genre: document.getElementById('preview-genre').value,
            core_conflict: document.getElementById('preview-conflict').value,
            background: document.getElementById('preview-background').value,
            target_words: parseInt(document.getElementById('preview-target-words').value),
            core_task: document.getElementById('preview-core-task').value
        },
        characters: [],
        outlines: []
    };

    // 收集人物数据
    if (previewProjectData.characters && previewProjectData.characters.length > 0) {
        previewProjectData.characters.forEach((char, index) => {
            const charNameInput = document.querySelector(`.preview-char-name[data-index="${index}"]`);
            const charRoleInput = document.querySelector(`.preview-char-role[data-index="${index}"]`);
            const charPersonalityInput = document.querySelector(`.preview-char-personality[data-index="${index}"]`);
            const charMotivationInput = document.querySelector(`.preview-char-motivation[data-index="${index}"]`);
            const charSecretInput = document.querySelector(`.preview-char-secret[data-index="${index}"]`);

            if (charNameInput) {
                confirmedData.characters.push({
                    name: charNameInput.value,
                    role_type: charRoleInput ? charRoleInput.value : char.role_type,
                    age: char.age || 25,
                    gender: char.gender || '未指定',
                    appearance: char.appearance || '',
                    personality: charPersonalityInput ? charPersonalityInput.value : char.personality,
                    background: char.background || '',
                    motivation: charMotivationInput ? charMotivationInput.value : char.motivation,
                    secret: charSecretInput ? charSecretInput.value : char.secret,
                    speech_pattern: char.speech_pattern || '',
                    behavior_habits: char.behavior_habits || '',
                    emotional_triggers: char.emotional_triggers || '',
                    source: 'ai_generated'
                });
            }
        });
    }

    // 收集大纲数据
    if (previewProjectData.outlines && previewProjectData.outlines.length > 0) {
        previewProjectData.outlines.forEach((outline, index) => {
            const outlineChapterInput = document.querySelector(`.preview-outline-chapter[data-index="${index}"]`);
            const outlineTitleInput = document.querySelector(`.preview-outline-title[data-index="${index}"]`);
            const outlineSummaryInput = document.querySelector(`.preview-outline-summary[data-index="${index}"]`);

            if (outlineTitleInput) {
                confirmedData.outlines.push({
                    chapter_number: outlineChapterInput ? parseInt(outlineChapterInput.value) : outline.chapter_number,
                    title: outlineTitleInput.value,
                    summary: outlineSummaryInput ? outlineSummaryInput.value : outline.summary,
                    plot_points: outline.plot_points || [],
                    target_words: outline.target_words || 3000,
                    focus_elements: outline.focus_elements || [],
                    emotion_arc: outline.emotion_arc || '',
                    characters_involved: outline.characters_involved || [],
                    status: 'draft'
                });
            }
        });
    }

    try {
        const response = await fetch('/api/projects/create-from-preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(confirmedData)
        });

        const result = await response.json();
        if (result.success) {
            showToast('项目创建成功！');
            closeModal('ai-preview-modal');
            currentProjectId = result.project_id;
            await loadProjects();
            document.getElementById('current-project').value = currentProjectId;
            loadProjectOverview();
            switchWorkflowStep('characters');
            // 清空预览数据
            previewProjectData = null;
        } else {
            showToast(result.message || '创建失败，请重试');
        }
    } catch (error) {
        console.error('创建项目失败:', error);
        showToast('创建失败，请重试');
    }
}

// 页面加载完成后初始化
window.addEventListener('load', function() {
    // 设置协作写作标签为默认激活
    const collabTab = document.querySelector('[data-tab="collaborative"]');
    if (collabTab) {
        collabTab.classList.add('active');
    }

    // 隐藏生成器标签
    const genTab = document.querySelector('[data-tab="generator"]');
    if (genTab) {
        genTab.classList.remove('active');
    }

    // 显示协作写作面板
    const collabPanel = document.getElementById('tab-collaborative');
    const genPanel = document.getElementById('tab-generator');
    if (collabPanel) collabPanel.classList.add('active');
    if (genPanel) genPanel.classList.remove('active');

    initCollaborative();
});

function initCollaborative() {
    // 初始化工作流程标签切换
    document.querySelectorAll('.workflow-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            switchWorkflowStep(this.dataset.step);
        });
    });

    // 初始化表单提交
    initForms();

    // 加载项目列表
    loadProjects();
}

// 切换工作流程步骤
function switchWorkflowStep(step) {
    collaborativeCurrentStep = step;

    // 更新标签状态
    document.querySelectorAll('.workflow-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.step === step);
    });

    // 更新面板显示
    document.querySelectorAll('.workflow-step').forEach(panel => {
        panel.style.display = 'none';
    });
    const activePanel = document.getElementById(`step-${step}`);
    if (activePanel) {
        activePanel.style.display = 'block';
    }

    // 加载对应数据
    if (currentProjectId) {
        if (step === 'characters') loadCharacters();
        if (step === 'outlines') loadOutlines();
        if (step === 'chapters') loadChapters();
    }
}

// 初始化表单
function initForms() {
    // 创建项目表单
    const createProjectForm = document.getElementById('create-project-form');
    if (createProjectForm) {
        createProjectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await createProject();
        });
    }

    // 创建人物表单
    const createCharForm = document.getElementById('create-character-form');
    if (createCharForm) {
        createCharForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await createCharacter();
        });
    }

    // AI生成人物表单
    const genCharForm = document.getElementById('generate-character-form');
    if (genCharForm) {
        genCharForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await generateCharacter();
        });
    }

    // 创建大纲表单
    const createOutlineForm = document.getElementById('create-outline-form');
    if (createOutlineForm) {
        createOutlineForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await createOutline();
        });
    }
}

// 加载项目列表
async function loadProjects() {
    try {
        const response = await fetch('/api/novel/projects');
        const data = await response.json();

        const select = document.getElementById('current-project');
        select.innerHTML = '<option value="">选择项目...</option>';

        data.projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            select.appendChild(option);
        });

        select.addEventListener('change', function() {
            currentProjectId = this.value ? parseInt(this.value) : null;
            if (currentProjectId) {
                loadProjectOverview();
                switchWorkflowStep('characters');
            }
        });
    } catch (error) {
        console.error('加载项目失败:', error);
    }
}

// 加载项目概览
async function loadProjectOverview() {
    try {
        const response = await fetch(`/api/novel/project/${currentProjectId}`);
        const project = await response.json();

        document.getElementById('overview-theme').textContent = project.theme || '-';
        document.getElementById('overview-conflict').textContent = project.core_conflict || '-';
        document.getElementById('overview-target').textContent = project.target_words || 0;
        document.getElementById('project-overview').style.display = 'block';
    } catch (error) {
        console.error('加载项目概览失败:', error);
    }
}

// 创建项目
async function createProject() {
    const data = {
        name: document.getElementById('project-name').value,
        theme: document.getElementById('project-theme').value,
        background: document.getElementById('project-background').value,
        target_words: parseInt(document.getElementById('project-target-words').value),
        genre: document.getElementById('project-genre').value,
        core_conflict: document.getElementById('project-core-conflict').value,
        core_task: document.getElementById('project-core-task').value
    };

    try {
        const response = await fetch('/api/novel/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (result.success) {
            showToast('项目创建成功！');
            closeModal('create-project-modal');
            currentProjectId = result.project_id;
            await loadProjects();
            document.getElementById('current-project').value = currentProjectId;
            loadProjectOverview();
            switchWorkflowStep('characters');
        }
    } catch (error) {
        console.error('创建项目失败:', error);
        showToast('创建失败，请重试');
    }
}

// 加载人物列表（星月风格角色卡显示）
async function loadCharacters() {
    // 检查是否有选中的项目
    if (!currentProjectId) {
        console.log('没有选中的项目，跳过加载人物');
        return;
    }

    try {
        const response = await fetch(`/api/character-cards/${currentProjectId}`);
        const result = await response.json();
        const characters = result.data || [];

        const grid = document.getElementById('characters-grid');
        if (characters && characters.length > 0) {
            grid.innerHTML = characters.map(char => {
                const importanceBadge = getImportanceBadge(char.importance);
                const statusBadge = getStatusBadge(char.status);

                return `
                <div class="character-card" data-importance="${char.importance}">
                    <div class="char-header">
                        <h4>${char.name}</h4>
                        <div class="char-badges">
                            <span class="char-role ${char.role_type}">${getRoleLabel(char.role_type)}</span>
                            ${importanceBadge}
                            ${statusBadge}
                        </div>
                    </div>
                    <div class="char-body">
                        ${char.core_identity ? `<p class="char-identity"><strong>⚡ 身份：</strong>${escapeHtml(char.core_identity)}</p>` : ''}
                        ${char.core_personality ? `<p class="char-personality"><strong>🎭 性格：</strong>${escapeHtml(char.core_personality)}</p>` : ''}
                        ${char.core_motivation ? `<p class="char-motivation"><strong>💫 动机：</strong>${escapeHtml(char.core_motivation)}</p>` : ''}
                        ${char.personality_flaw ? `<p class="char-flaw"><strong>⚠️ 缺陷：</strong>${escapeHtml(char.personality_flaw)}</p>` : ''}
                        ${char.current_location ? `<p class="char-location"><strong>📍 位置：</strong>${escapeHtml(char.current_location)}</p>` : ''}
                    </div>
                    <div class="char-footer">
                        <span class="char-source">${char.source === 'manual' ? '✍️ 手动创建' : '🤖 AI生成'}</span>
                        <div class="char-actions">
                            <button class="btn btn-sm btn-secondary" onclick="editCharacter(${char.id})">编辑</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteCharacter(${char.id})">删除</button>
                        </div>
                    </div>
                </div>
            `}).join('');
        } else {
            grid.innerHTML = '<p class="empty-state">还没有角色卡，点击"创建角色卡"按钮开始</p>';
        }
    } catch (error) {
        console.error('加载角色卡失败:', error);
        const grid = document.getElementById('characters-grid');
        grid.innerHTML = '<p class="empty-state error">加载失败，请重试</p>';
    }
}

function getImportanceBadge(importance) {
    const badges = {
        'core': '<span class="badge badge-core">⭐ 核心</span>',
        'important': '<span class="badge badge-important">🔥 重要</span>',
        'supporting': '<span class="badge badge-supporting">📌 配角</span>'
    };
    return badges[importance] || '';
}

function getStatusBadge(status) {
    const badges = {
        'active': '<span class="badge badge-active">💚 活跃</span>',
        'inactive': '<span class="badge badge-inactive">💔 下线</span>',
        'pending': '<span class="badge badge-pending">⏳ 待出场</span>'
    };
    return badges[status] || '';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getRoleLabel(role) {
    const labels = {
        'protagonist': '主角',
        'antagonist': '反派',
        'supporting': '配角'
    };
    return labels[role] || role;
}

// 创建人物（星月风格角色卡）
async function createCharacter() {
    const data = {
        project_id: currentProjectId,
        name: document.getElementById('char-name').value,
        role_type: document.getElementById('char-role').value,
        importance: document.getElementById('char-importance').value,

        // 核心设定（必填）
        core_identity: document.getElementById('char-core-identity').value,
        core_personality: document.getElementById('char-core-personality').value,
        core_motivation: document.getElementById('char-core-motivation').value,

        // 性格缺陷
        personality_flaw: document.getElementById('char-flaw').value,
        flaw_consequence: document.getElementById('char-flaw-consequence').value,

        // 详细设定
        age: parseInt(document.getElementById('char-age').value) || null,
        gender: document.getElementById('char-gender').value,
        appearance: document.getElementById('char-appearance').value,
        speech_example: document.getElementById('char-speech-example').value,
        background: document.getElementById('char-background').value,
        growth_direction: document.getElementById('char-growth').value,

        // 状态管理
        status: document.getElementById('char-status').value,
        current_location: document.getElementById('char-location').value,
        relationship_notes: document.getElementById('char-relationship-notes').value,

        // 兼容旧字段
        secret: '',
        speech_pattern: '',
        behavior_habits: '',
        emotional_triggers: ''
    };

    try {
        const response = await fetch('/api/character-cards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (result.success) {
            showToast('🎉 角色卡创建成功！');
            closeModal('create-character-modal');
            loadCharacters();
            document.getElementById('create-character-form').reset();
        } else {
            showToast(result.message || '创建失败，请重试');
        }
    } catch (error) {
        console.error('创建角色卡失败:', error);
        showToast('创建失败，请重试');
    }
}

// AI生成人物
async function generateCharacter() {
    const elements = document.getElementById('gen-char-elements').value;
    const data = {
        project_id: currentProjectId,
        role_type: document.getElementById('gen-char-role').value,
        theme: document.getElementById('gen-char-theme').value,
        elements: elements ? elements.split(',').map(e => e.trim()) : [],
        reference: document.getElementById('gen-char-reference').value
    };

    showToast('AI正在生成人物，请稍候...');

    try {
        const response = await fetch('/api/characters/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (result.success) {
            showToast('人物生成成功！');
            closeModal('generate-character-modal');
            loadCharacters();
        }
    } catch (error) {
        console.error('生成人物失败:', error);
        showToast('生成失败，请重试');
    }
}

// 删除角色卡
async function deleteCharacter(charId) {
    if (!confirm('确定要删除这个角色卡吗？')) return;

    try {
        const response = await fetch(`/api/character-cards/${charId}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        if (result.success) {
            showToast('🗑️ 角色卡已删除');
            loadCharacters();
        } else {
            showToast(result.message || '删除失败');
        }
    } catch (error) {
        console.error('删除角色卡失败:', error);
        showToast('删除失败，请重试');
    }
}

// 编辑角色卡（占位函数，可扩展）
async function editCharacter(charId) {
    showToast('💡 编辑功能即将推出');
    // TODO: 实现编辑功能
    // 1. 加载角色卡数据
    // 2. 填充到模态框
    // 3. 提交更新到 /api/character-cards/{charId}
}

// 加载大纲列表
async function loadOutlines() {
    // 检查是否有选中的项目
    if (!currentProjectId) {
        console.log('没有选中的项目，跳过加载大纲');
        return;
    }

    try {
        const response = await fetch(`/api/projects/${currentProjectId}/outlines?level=chapter`);
        const data = await response.json();

        const list = document.getElementById('outlines-list');
        if (data.outlines && data.outlines.length > 0) {
            list.innerHTML = data.outlines.map(outline => `
                <div class="outline-card">
                    <div class="outline-header">
                        <h4>第${outline.chapter_number}章：${outline.title}</h4>
                        <span class="outline-status">${outline.status}</span>
                    </div>
                    <p>${outline.summary}</p>
                    ${outline.plot_points && outline.plot_points.length > 0 ? `
                        <ul>
                            ${outline.plot_points.map(point => `<li>${point}</li>`).join('')}
                        </ul>
                    ` : ''}
                    <div class="outline-meta">
                        <span>目标字数：${outline.target_words}</span>
                        ${outline.focus_elements ? `<span>重点：${outline.focus_elements.join(', ')}</span>` : ''}
                    </div>
                    <div class="outline-actions">
                        ${outline.status !== 'generated' ? `<button class="btn btn-sm btn-primary" onclick="generateChapter(${outline.id})">生成章节</button>` : '<span class="generated-mark">已生成</span>'}
                        <button class="btn btn-sm" onclick="deleteOutline(${outline.id})">删除</button>
                    </div>
                </div>
            `).join('');
        } else {
            list.innerHTML = '<p class="empty-state">还没有大纲，点击上方按钮创建</p>';
        }
    } catch (error) {
        console.error('加载大纲失败:', error);
    }
}

// 创建大纲
async function createOutline() {
    const points = document.getElementById('outline-points').value;
    const focus = document.getElementById('outline-focus').value;
    const chars = document.getElementById('outline-chars').value;

    const data = {
        project_id: currentProjectId,
        level: 'chapter',
        chapter_number: parseInt(document.getElementById('outline-chapter').value),
        title: document.getElementById('outline-title').value,
        summary: document.getElementById('outline-summary').value,
        plot_points: points ? points.split('\n').filter(p => p.trim()) : [],
        target_words: parseInt(document.getElementById('outline-words').value),
        focus_elements: focus ? focus.split(',').map(f => f.trim()) : [],
        emotion_arc: document.getElementById('outline-emotion').value,
        characters_involved: chars ? chars.split(',').map(c => c.trim()) : [],
        notes: document.getElementById('outline-notes').value
    };

    try {
        const response = await fetch('/api/outlines', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (result.success) {
            showToast('大纲创建成功！');
            closeModal('create-outline-modal');
            loadOutlines();
        }
    } catch (error) {
        console.error('创建大纲失败:', error);
        showToast('创建失败，请重试');
    }
}

// 生成章节
async function generateChapter(outlineId) {
    showToast('AI正在生成章节，请稍候...');

    const data = {
        outline_id: outlineId,
        temperature: 0.8,
        focus: '情绪钩子'
    };

    try {
        const response = await fetch('/api/chapters/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (result.success) {
            showToast('章节生成成功！');
            loadOutlines();
            // 更新人机比例
            loadProjectOverview();
        }
    } catch (error) {
        console.error('生成章节失败:', error);
        showToast('生成失败，请重试');
    }
}

// 删除大纲
async function deleteOutline(outlineId) {
    if (!confirm('确定要删除这个大纲吗？')) return;

    try {
        const response = await fetch(`/api/outlines/${outlineId}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        if (result.success) {
            showToast('删除成功');
            loadOutlines();
        }
    } catch (error) {
        console.error('删除失败:', error);
    }
}

// 加载章节列表
async function loadChapters() {
    // 检查是否有选中的项目
    if (!currentProjectId) {
        console.log('没有选中的项目，跳过加载章节');
        return;
    }

    try {
        const response = await fetch(`/api/projects/${currentProjectId}/chapters`);
        const data = await response.json();

        const workspace = document.getElementById('chapters-workspace');
        if (data.chapters && data.chapters.length > 0) {
            workspace.innerHTML = data.chapters.map(chapter => `
                <div class="chapter-card">
                    <div class="chapter-header">
                        <h4>${chapter.title}</h4>
                        <div class="chapter-stats">
                            <span>字数：${chapter.word_count}</span>
                            <span>编辑：${chapter.edit_count || 0}次</span>
                            <span>AI润色：${chapter.ai_revision_count || 0}次</span>
                            ${chapter.human_ai_ratio ? `<span class="ratio-badge">人机比例：${chapter.human_ai_ratio}</span>` : ''}
                        </div>
                    </div>
                    <div class="chapter-preview">
                        ${chapter.content.substring(0, 200)}...
                    </div>
                    <div class="chapter-actions">
                        <button class="btn btn-sm btn-primary" onclick="editChapter(${chapter.id})">编辑</button>
                        <button class="btn btn-sm" onclick="aiReviseChapter(${chapter.id})">✨ AI润色</button>
                    </div>
                </div>
            `).join('');
        } else {
            workspace.innerHTML = '<p class="empty-state">还没有章节，请先创建大纲并生成章节</p>';
        }
    } catch (error) {
        console.error('加载章节失败:', error);
    }
}

// 编辑章节（显示简单编辑界面）
async function editChapter(chapterId) {
    const content = prompt('请输入新的章节内容（支持部分修改）：');
    if (content === null) return;

    const notes = prompt('修改说明（可选）：', '人工编辑');

    try {
        const response = await fetch(`/api/chapters/${chapterId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: content,
                notes: notes
            })
        });

        const result = await response.json();
        if (result.success) {
            showToast('章节已更新！' + (result.human_ai_ratio ? ` 人机比例：${result.human_ai_ratio}` : ''));
            loadChapters();
            loadProjectOverview();
        }
    } catch (error) {
        console.error('更新失败:', error);
        showToast('更新失败，请重试');
    }
}

// AI润色章节
async function aiReviseChapter(chapterId) {
    const focus = prompt('润色重点（例如：情绪钩子、细节描写）：', '情绪钩子');
    if (!focus) return;

    showToast('AI正在润色，请稍候...');

    try {
        const response = await fetch(`/api/chapters/${chapterId}/revise`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                focus: focus,
                style: '播报员口吻'
            })
        });

        const result = await response.json();
        if (result.success) {
            showToast('AI润色完成！');
            loadChapters();
        }
    } catch (error) {
        console.error('润色失败:', error);
        showToast('润色失败，请重试');
    }
}

// 点击模态框外部关闭
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});
