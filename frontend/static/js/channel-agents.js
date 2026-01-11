/**
 * 渠道智能体管理模块
 * 用于管理投稿渠道的定制AI智能体
 */

// 全局变量
let currentFilter = 'all';
let agents = [];

// 渠道类型映射
const channelTypeMap = {
    'emotion': { name: '情感', icon: '💕', color: '#f472b6' },
    'story': { name: '故事', icon: '📖', color: '#60a5fa' },
    'parenting': { name: '育儿', icon: '👶', color: '#fbbf24' },
    'career': { name: '职场', icon: '💼', color: '#34d399' },
    'psychology': { name: '心理', icon: '🧠', color: '#a78bfa' },
    'general': { name: '通用', icon: '📝', color: '#9ca3af' }
};

// 训练状态映射
const trainingStatusMap = {
    'pending': { name: '待训练', class: 'status-pending', icon: '⏳' },
    'training': { name: '训练中', class: 'status-training', icon: '🔄' },
    'completed': { name: '已训练', class: 'status-completed', icon: '✅' },
    'failed': { name: '训练失败', class: 'status-failed', icon: '❌' }
};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 绑定筛选按钮事件
    document.querySelectorAll('.channel-agent-filters .filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.channel-agent-filters .filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.type;
            renderAgents();
        });
    });

    // 绑定表单提交事件
    document.getElementById('channel-agent-form').addEventListener('submit', handleChannelAgentSubmit);
    document.getElementById('corpus-upload-form').addEventListener('submit', handleCorpusUpload);
    // 注意：content-generate-form 不再使用submit事件，改用两个独立按钮

    // 文件上传拖拽
    setupFileUpload();

    // 加载智能体列表
    loadChannelAgents();
});

/**
 * 加载渠道智能体列表
 */
async function loadChannelAgents() {
    try {
        const response = await fetch('/api/channel-agents');

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success) {
            agents = data.data;
            renderAgents();
        } else {
            showError('加载智能体失败：' + data.message);
        }
    } catch (error) {
        console.error('加载智能体失败:', error);
        showError('加载智能体失败：' + error.message);
    }
}

/**
 * 渲染智能体卡片
 */
function renderAgents() {
    const grid = document.getElementById('channel-agents-grid');

    // 筛选
    let filteredAgents = agents;
    if (currentFilter !== 'all') {
        filteredAgents = agents.filter(agent => agent.channel_type === currentFilter);
    }

    if (filteredAgents.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <p>暂无${currentFilter !== 'all' ? channelTypeMap[currentFilter].name : ''}智能体</p>
                <button class="btn btn-primary" onclick="showCreateChannelAgentModal()">创建第一个智能体</button>
            </div>
        `;
        return;
    }

    grid.innerHTML = filteredAgents.map(agent => createAgentCard(agent)).join('');
}

/**
 * 创建智能体卡片HTML
 */
function createAgentCard(agent) {
    const type = channelTypeMap[agent.channel_type] || channelTypeMap['general'];
    const status = trainingStatusMap[agent.training_status] || trainingStatusMap['pending'];

    // 解析特点
    let characteristics = {};
    try {
        characteristics = typeof agent.channel_characteristics === 'string'
            ? JSON.parse(agent.channel_characteristics)
            : agent.channel_characteristics || {};
    } catch (e) {
        console.error('解析特点失败:', e);
    }

    const topics = characteristics.topics || [];
    const tone = characteristics.tone || '未设置';

    // 解析联系信息
    let contactEmail = '';
    let contactPayment = '';
    if (agent.contact_info) {
        try {
            const contact = typeof agent.contact_info === 'string'
                ? JSON.parse(agent.contact_info)
                : agent.contact_info;
            if (contact.email) contactEmail = contact.email;
            if (contact.payment_info) contactPayment = contact.payment_info;
        } catch (e) {}
    }

    // 解析字数要求
    let lengthReq = '未设置';
    if (agent.length_requirements) {
        try {
            const length = typeof agent.length_requirements === 'string'
                ? JSON.parse(agent.length_requirements)
                : agent.length_requirements;
            if (length.min && length.max) {
                lengthReq = `${length.min}-${length.max}字`;
            }
        } catch (e) {}
    }

    return `
        <div class="channel-agent-card" style="border-left: 4px solid ${type.color};">
            <div class="agent-card-header">
                <div class="agent-title">
                    <span class="agent-type-icon">${type.icon}</span>
                    <h3>${agent.name}</h3>
                </div>
                <div class="agent-status">
                    <span class="status-badge ${status.class}">${status.icon} ${status.name}</span>
                </div>
            </div>

            <div class="agent-card-body">
                ${agent.description ? `<p class="agent-description">${agent.description}</p>` : ''}

                <div class="agent-info">
                    ${agent.target_audience ? `
                    <div class="info-item">
                        <span class="info-label">👥 受众:</span>
                        <span class="info-value">${agent.target_audience}</span>
                    </div>
                    ` : ''}

                    ${tone ? `
                    <div class="info-item">
                        <span class="info-label">✍️ 文风:</span>
                        <span class="info-value">${tone}</span>
                    </div>
                    ` : ''}

                    ${lengthReq !== '未设置' ? `
                    <div class="info-item">
                        <span class="info-label">📏 字数:</span>
                        <span class="info-value">${lengthReq}</span>
                    </div>
                    ` : ''}

                    ${agent.corpus_word_count > 0 ? `
                    <div class="info-item">
                        <span class="info-label">📊 语料:</span>
                        <span class="info-value">${agent.corpus_word_count.toLocaleString()}字</span>
                    </div>
                    ` : ''}

                    ${contactEmail ? `
                    <div class="info-item">
                        <span class="info-label">📧 邮箱:</span>
                        <span class="info-value" style="font-size: 0.8rem;">${contactEmail}</span>
                    </div>
                    ` : ''}

                    ${contactPayment ? `
                    <div class="info-item">
                        <span class="info-label">💰 稿费:</span>
                        <span class="info-value">${contactPayment}</span>
                    </div>
                    ` : ''}
                </div>

                ${topics.length > 0 ? `
                <div class="agent-topics">
                    ${topics.slice(0, 4).map(topic => `<span class="topic-tag">${topic}</span>`).join('')}
                    ${topics.length > 4 ? `<span class="topic-tag more">+${topics.length - 4}</span>` : ''}
                </div>
                ` : ''}
            </div>

            <div class="agent-card-footer">
                <div class="agent-stats">
                    <span title="使用次数">📈 ${agent.usage_count || 0}</span>
                    <span title="成功率">✨ ${agent.success_count || 0}</span>
                </div>
                <div class="agent-actions">
                    ${agent.training_status === 'pending' ? `
                        <button class="btn btn-sm btn-primary" onclick="showCorpusUploadModal(${agent.id}, '${agent.name}')">
                            📤 上传语料
                        </button>
                    ` : ''}

                    ${agent.training_status === 'completed' ? `
                        <button class="btn btn-sm btn-success" onclick="showGenerateModal(${agent.id}, '${agent.name}')">
                            ✨ 生成内容
                        </button>
                    ` : ''}

                    <button class="btn btn-sm btn-secondary" onclick="editChannelAgent(${agent.id})">
                        ⚙️ 编辑
                    </button>

                    <button class="btn btn-sm btn-danger" onclick="deleteChannelAgent(${agent.id})">
                        🗑️
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * 显示创建智能体模态框
 */
function showCreateChannelAgentModal() {
    document.getElementById('channel-agent-modal-title').textContent = '创建渠道智能体';
    document.getElementById('channel-agent-form').reset();
    document.getElementById('channel-agent-id').value = '';
    document.getElementById('channel-agent-modal').style.display = 'flex';
}

/**
 * 编辑智能体
 */
async function editChannelAgent(agentId) {
    try {
        const response = await fetch(`/api/channel-agents/${agentId}`);
        const data = await response.json();

        if (data.success) {
            const agent = data.data;

            document.getElementById('channel-agent-modal-title').textContent = '编辑渠道智能体';
            document.getElementById('channel-agent-id').value = agent.id;
            document.getElementById('channel-agent-name').value = agent.name || '';
            document.getElementById('channel-agent-description').value = agent.description || '';
            document.getElementById('channel-agent-type').value = agent.channel_type || 'general';
            document.getElementById('channel-agent-audience').value = agent.target_audience || '';

            // 解析特点
            let characteristics = {};
            try {
                characteristics = typeof agent.channel_characteristics === 'string'
                    ? JSON.parse(agent.channel_characteristics)
                    : agent.channel_characteristics || {};
            } catch (e) {}

            document.getElementById('channel-agent-topics').value = (characteristics.topics || []).join(', ');
            document.getElementById('channel-agent-tone').value = characteristics.tone || '';
            document.getElementById('channel-agent-requirements').value = characteristics.special_requirements || '';

            // 解析字数要求
            if (agent.length_requirements) {
                try {
                    const length = typeof agent.length_requirements === 'string'
                        ? JSON.parse(agent.length_requirements)
                        : agent.length_requirements;
                    document.getElementById('channel-agent-min-words').value = length.min || '';
                    document.getElementById('channel-agent-max-words').value = length.max || '';
                } catch (e) {}
            }

            document.getElementById('channel-agent-modal').style.display = 'flex';
        } else {
            showError('获取智能体信息失败：' + data.message);
        }
    } catch (error) {
        console.error('编辑智能体失败:', error);
        showError('获取智能体信息失败');
    }
}

/**
 * 关闭智能体模态框
 */
function closeChannelAgentModal() {
    document.getElementById('channel-agent-modal').style.display = 'none';
}

/**
 * 处理智能体表单提交
 */
async function handleChannelAgentSubmit(e) {
    e.preventDefault();

    const agentId = document.getElementById('channel-agent-id').value;
    const isEdit = !!agentId;

    // 构建特点对象
    const topicsText = document.getElementById('channel-agent-topics').value;
    const topics = topicsText.split(/[,，]/).map(t => t.trim()).filter(t => t);

    const characteristics = {
        topics: topics,
        tone: document.getElementById('channel-agent-tone').value,
        special_requirements: document.getElementById('channel-agent-requirements').value
    };

    const minWords = parseInt(document.getElementById('channel-agent-min-words').value) || null;
    const maxWords = parseInt(document.getElementById('channel-agent-max-words').value) || null;

    const lengthRequirements = {};
    if (minWords) lengthRequirements.min = minWords;
    if (maxWords) lengthRequirements.max = maxWords;

    const payload = {
        name: document.getElementById('channel-agent-name').value,
        description: document.getElementById('channel-agent-description').value,
        channel_type: document.getElementById('channel-agent-type').value,
        target_audience: document.getElementById('channel-agent-audience').value,
        channel_characteristics: characteristics,
        length_requirements: Object.keys(lengthRequirements).length > 0 ? lengthRequirements : null
    };

    try {
        const url = isEdit ? `/api/channel-agents/${agentId}` : '/api/channel-agents';
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            showSuccess(isEdit ? '智能体更新成功！' : '智能体创建成功！');
            closeChannelAgentModal();
            loadChannelAgents();
        } else {
            showError((isEdit ? '更新' : '创建') + '失败：' + data.message);
        }
    } catch (error) {
        console.error('提交失败:', error);
        showError('操作失败，请检查网络连接');
    }
}

/**
 * 删除智能体
 */
async function deleteChannelAgent(agentId) {
    if (!confirm('确定要删除这个智能体吗？')) return;

    try {
        const response = await fetch(`/api/channel-agents/${agentId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('智能体已删除');
            loadChannelAgents();
        } else {
            showError('删除失败：' + data.message);
        }
    } catch (error) {
        console.error('删除失败:', error);
        showError('删除失败，请检查网络连接');
    }
}

/**
 * 显示语料上传模态框
 */
function showCorpusUploadModal(agentId, agentName) {
    document.getElementById('corpus-agent-id').value = agentId;
    document.getElementById('corpus-agent-name').value = agentName;
    document.getElementById('corpus-files').value = '';
    document.getElementById('corpus-file-list').innerHTML = '';
    document.getElementById('corpus-upload-modal').style.display = 'flex';
}

/**
 * 关闭语料上传模态框
 */
function closeCorpusUploadModal() {
    document.getElementById('corpus-upload-modal').style.display = 'none';
}

/**
 * 设置文件上传
 */
function setupFileUpload() {
    const dropZone = document.getElementById('corpus-drop-zone');
    const fileInput = document.getElementById('corpus-files');

    // 点击上传
    dropZone.addEventListener('click', () => fileInput.click());

    // 文件选择
    fileInput.addEventListener('change', handleFileSelect);

    // 拖拽上传
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');

        const files = Array.from(e.dataTransfer.files).filter(f =>
            f.name.endsWith('.txt') || f.name.endsWith('.md')
        );
        if (files.length > 0) {
            fileInput.files = files;
            handleFileSelect({ target: fileInput });
        }
    });
}

/**
 * 处理文件选择
 */
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    const fileList = document.getElementById('corpus-file-list');

    if (files.length === 0) {
        fileList.innerHTML = '';
        return;
    }

    fileList.innerHTML = files.map(file => `
        <div class="file-item">
            <span class="file-icon">📄</span>
            <span class="file-name">${file.name}</span>
            <span class="file-size">${formatFileSize(file.size)}</span>
        </div>
    `).join('');
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * 处理语料上传
 */
async function handleCorpusUpload(e) {
    e.preventDefault();

    const agentId = document.getElementById('corpus-agent-id').value;
    const fileInput = document.getElementById('corpus-files');

    if (fileInput.files.length === 0) {
        showError('请选择至少一个语料文件');
        return;
    }

    const formData = new FormData();
    for (let file of fileInput.files) {
        formData.append('files', file);
    }

    try {
        showSuccess('正在上传语料文件...');

        const response = await fetch(`/api/channel-agents/${agentId}/upload-corpus`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            const uploadInfo = data.data;
            showSuccess(`✅ 成功上传${uploadInfo.uploaded_count}个文件，共${uploadInfo.total_word_count}字！正在开始AI训练...`);
            closeCorpusUploadModal();

            // 自动触发训练
            await trainAgent(agentId);
        } else {
            showError('上传失败：' + data.message);
        }
    } catch (error) {
        console.error('上传失败:', error);
        showError('上传失败，请检查网络连接');
    }
}

/**
 * 训练智能体
 */
async function trainAgent(agentId) {
    try {
        showSuccess('正在分析语料风格，这可能需要几分钟...');

        const response = await fetch(`/api/channel-agents/${agentId}/train`, {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('训练完成！智能体已学习该渠道的写作风格');
            // 等待一下再刷新列表，确保数据库更新完成
            await new Promise(resolve => setTimeout(resolve, 500));
            await loadChannelAgents();
        } else {
            showError('训练失败：' + data.message);
        }
    } catch (error) {
        console.error('训练失败:', error);
        showError('训练失败，请检查网络连接');
    }
}

/**
 * 显示内容生成模态框
 */
async function showGenerateModal(agentId, agentName) {
    document.getElementById('generate-agent-id').value = agentId;
    document.getElementById('generate-agent-name').value = agentName;
    document.getElementById('content-generate-form').reset();
    document.getElementById('generation-result').style.display = 'none';
    document.getElementById('generation-progress').style.display = 'none';
    document.getElementById('inspiration-editor').style.display = 'none';
    document.getElementById('new-project-form').style.display = 'none';
    document.getElementById('new-project-name').value = '';
    document.getElementById('generate-content-btn').disabled = true;  // 初始禁用生成内容按钮

    // 加载项目列表
    await loadProjectsForSelect();

    document.getElementById('content-generate-modal').style.display = 'flex';
}

/**
 * 关闭内容生成模态框
 */
function closeGenerateModal() {
    document.getElementById('content-generate-modal').style.display = 'none';
}

/**
 * 加载项目列表
 */
async function loadProjectsForSelect() {
    try {
        const response = await fetch('/api/novel/projects');
        const data = await response.json();

        if (data.success) {
            const select = document.getElementById('generate-project');
            const currentSelection = select.value;
            select.innerHTML = '<option value="">不保存到项目</option><option value="__new__">+ 新建项目</option>';

            data.data.forEach(project => {
                const option = document.createElement('option');
                option.value = project.id;
                option.textContent = project.title || project.name;
                select.appendChild(option);
            });

            // 恢复之前的选择
            if (currentSelection && currentSelection !== '__new__') {
                select.value = currentSelection;
            }
        }
    } catch (error) {
        console.error('加载项目失败:', error);
    }
}

/**
 * 处理项目选择变化
 */
function handleProjectSelectChange() {
    const select = document.getElementById('generate-project');
    const newProjectForm = document.getElementById('new-project-form');

    if (select.value === '__new__') {
        newProjectForm.style.display = 'block';
        document.getElementById('new-project-name').focus();
    } else {
        newProjectForm.style.display = 'none';
    }
}

/**
 * 创建新项目
 */
async function createNewProject(projectName) {
    try {
        const response = await fetch('/api/novel/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: projectName,
                description: `通过渠道智能体创建 - ${new Date().toLocaleDateString()}`,
                target_words: 10000
            })
        });

        const data = await response.json();

        if (data.success) {
            // 重新加载项目列表
            await loadProjectsForSelect();
            // 选中新创建的项目
            document.getElementById('generate-project').value = data.project_id;
            return data.project_id;
        } else {
            throw new Error(data.message || '创建项目失败');
        }
    } catch (error) {
        console.error('创建项目失败:', error);
        throw error;
    }
}

/**
 * 生成灵感
 */
async function generateInspiration() {
    const agentId = document.getElementById('generate-agent-id').value;
    const topic = document.getElementById('generate-topic').value.trim();
    const requirements = document.getElementById('generate-requirements').value;

    try {
        // 显示进度
        document.getElementById('generation-progress').style.display = 'block';
        document.getElementById('progress-title').textContent = '💡 AI正在生成灵感...';
        document.getElementById('progress-time').textContent = '预计需要 10-20 秒';
        document.getElementById('inspiration-editor').style.display = 'none';
        document.getElementById('generate-inspiration-btn').disabled = true;

        // 灵感生成进度
        startProgress('inspiration');

        const payload = {
            topic: topic,  // 可以为空
            additional_requirements: requirements
        };

        const response = await fetch(`/api/channel-agents/${agentId}/generate-inspiration`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // 隐藏进度
        document.getElementById('generation-progress').style.display = 'none';
        document.getElementById('generate-inspiration-btn').disabled = false;

        if (data.success) {
            displayInspiration(data.data);
            showSuccess('灵感生成成功！请修改确认后生成内容');
            document.getElementById('generate-content-btn').disabled = false;  // 启用生成内容按钮
        } else {
            showError('生成灵感失败：' + data.message);
        }
    } catch (error) {
        console.error('生成灵感失败:', error);
        showError('生成灵感失败，请检查网络连接');
        document.getElementById('generation-progress').style.display = 'none';
        document.getElementById('generate-inspiration-btn').disabled = false;
    }
}

/**
 * 显示灵感数据
 */
function displayInspiration(data) {
    if (data.raw_inspiration) {
        // 原始文本格式
        document.getElementById('inspiration-outline').value = data.raw_inspiration;
        document.getElementById('inspiration-titles').innerHTML = '<p style="color: #64748b;">AI已生成灵感（见下方大纲）</p>';
        document.getElementById('inspiration-topic').textContent = 'AI已生成灵感';
    } else {
        // JSON格式
        // 推荐主题
        const topicSuggestion = data.topic_suggestion || 'AI推荐主题';
        document.getElementById('inspiration-topic').innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-size: 1.5rem;">🎯</span>
                <span>${topicSuggestion}</span>
            </div>
        `;

        // 标题建议
        const titlesHtml = data.title_suggestions.map((t, i) =>
            `<div style="padding: 0.5rem; background: #f0f9ff; border-radius: 6px; margin-bottom: 0.5rem; font-size: 0.9rem;">
                <span style="color: #0ea5e9;">${i + 1}.</span> ${t}
            </div>`
        ).join('');
        document.getElementById('inspiration-titles').innerHTML = titlesHtml;

        // 核心角度
        document.getElementById('inspiration-angle').value = data.core_angle || '';

        // 内容大纲
        if (data.content_outline && data.content_outline.length > 0) {
            const outlineText = data.content_outline.map((section, i) =>
                `第${i + 1}部分：${section.section}\n要点：${section.key_points}\n情绪基调：${section.emotional_tone}\n`
            ).join('\n');
            document.getElementById('inspiration-outline').value = outlineText;
        }

        // 关键元素
        document.getElementById('inspiration-elements').value =
            (data.key_elements || []).join('、');

        // 情绪弧线
        document.getElementById('inspiration-emotional').value = data.emotional_arc || '';

        // 创作要点
        document.getElementById('inspiration-notes').value = data.writing_notes || '';
    }

    document.getElementById('inspiration-editor').style.display = 'block';
}

/**
 * 重新生成灵感
 */
function regenerateInspiration() {
    generateInspiration();
}

/**
 * 确认灵感并生成内容
 */
function confirmInspiration() {
    generateContent(true);
}

/**
 * 生成内容
 * @param {boolean} fromInspiration - 是否基于灵感生成
 */
async function generateContent(fromInspiration = false) {
    const agentId = document.getElementById('generate-agent-id').value;
    const topic = document.getElementById('generate-topic').value;
    const wordCount = document.getElementById('generate-word-count').value;
    const requirements = document.getElementById('generate-requirements').value;

    let projectId = document.getElementById('generate-project').value;

    // 如果选择的是新建项目，先创建项目
    if (projectId === '__new__') {
        const newProjectName = document.getElementById('new-project-name').value.trim();
        if (!newProjectName) {
            showError('请输入新项目名称');
            return;
        }
        try {
            projectId = await createNewProject(newProjectName);
        } catch (error) {
            showError('创建项目失败：' + error.message);
            return;
        }
    }

    // 构建灵感文本
    let inspirationText = '';
    if (fromInspiration) {
        const topicElement = document.getElementById('inspiration-topic');
        const topicText = topicElement ? topicElement.textContent : '';
        const titles = document.getElementById('inspiration-titles').innerText;
        const angle = document.getElementById('inspiration-angle').value;
        const outline = document.getElementById('inspiration-outline').value;
        const elements = document.getElementById('inspiration-elements').value;
        const emotional = document.getElementById('inspiration-emotional').value;
        const notes = document.getElementById('inspiration-notes').value;

        inspirationText = `【推荐主题】\n${topicText}\n\n【标题建议】\n${titles}\n\n【核心角度】\n${angle}\n\n【内容大纲】\n${outline}\n\n【关键元素】\n${elements}\n\n【情绪弧线】\n${emotional}\n\n【创作要点】\n${notes}`;
    }

    try {
        // 显示进度提示
        document.getElementById('generation-progress').style.display = 'block';
        document.getElementById('progress-title').textContent = '✍️ AI正在生成内容...';
        document.getElementById('progress-time').textContent = '预计需要 30-60 秒';
        document.getElementById('generation-result').style.display = 'none';
        document.getElementById('generate-content-btn').disabled = true;

        // 开始进度动画
        startProgress('content');

        const payload = {
            topic: topic,
            inspiration: inspirationText || null,
            word_count: wordCount ? parseInt(wordCount) : null,
            additional_requirements: requirements
        };

        const response = await fetch(`/api/channel-agents/${agentId}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // 隐藏进度提示
        document.getElementById('generation-progress').style.display = 'none';
        document.getElementById('generate-content-btn').disabled = false;

        if (data.success) {
            document.getElementById('generated-content-display').textContent = data.data.content;
            document.getElementById('generation-result').style.display = 'block';
            showSuccess('内容生成成功！字数：' + data.data.word_count);

            // 滚动到结果区域
            document.getElementById('generation-result').scrollIntoView({ behavior: 'smooth' });
        } else {
            showError('生成失败：' + data.message);
        }
    } catch (error) {
        console.error('生成失败:', error);
        showError('生成失败，请检查网络连接');
        document.getElementById('generation-progress').style.display = 'none';
        document.getElementById('generate-content-btn').disabled = false;
    }
}

/**
 * 开始进度动画
 * @param {string} type - 'inspiration' 或 'content'
 */
function startProgress(type) {
    const progressBar = document.getElementById('generation-progress-bar');
    const progressText = document.getElementById('generation-progress-text');

    let steps;
    if (type === 'inspiration') {
        steps = [
            { progress: 30, text: '正在分析主题和渠道风格...' },
            { progress: 60, text: '正在生成创意角度...' },
            { progress: 90, text: '正在整理内容大纲...' }
        ];
    } else {
        steps = [
            { progress: 20, text: '正在分析主题和风格要求...' },
            { progress: 40, text: '正在构建文章结构...' },
            { progress: 60, text: '正在生成内容...' },
            { progress: 80, text: '正在优化语言和表达...' },
            { progress: 95, text: '正在做最终调整...' }
        ];
    }

    let stepIndex = 0;

    function updateProgress() {
        if (stepIndex >= steps.length) return;

        const step = steps[stepIndex];
        progressBar.style.width = step.progress + '%';
        progressText.textContent = step.text;

        stepIndex++;
        if (stepIndex < steps.length) {
            setTimeout(updateProgress, 3000); // 每3秒更新一次
        }
    }

    // 立即执行第一次更新
    updateProgress();
}

/**
 * 复制生成的内容
 */
function copyGeneratedContent() {
    const content = document.getElementById('generated-content-display').textContent;

    navigator.clipboard.writeText(content).then(() => {
        showSuccess('内容已复制到剪贴板');
    }).catch(() => {
        showError('复制失败');
    });
}

/**
 * 保存到项目
 */
async function saveToProject() {
    const projectId = document.getElementById('generate-project').value;
    const content = document.getElementById('generated-content-display').textContent;
    const agentName = document.getElementById('generate-agent-name').value;

    if (!projectId) {
        showError('请选择目标项目');
        return;
    }

    try {
        const response = await fetch('/api/chapters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project_id: parseInt(projectId),
                title: `投稿内容 - ${agentName}`,
                content: content,
                content_type: 'full'
            })
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('内容已保存到项目！');
            closeGenerateModal();
        } else {
            showError('保存失败：' + data.message);
        }
    } catch (error) {
        console.error('保存失败:', error);
        showError('保存失败，请检查网络连接');
    }
}

/**
 * 重新生成
 */
function regenerateContent() {
    document.getElementById('generation-result').style.display = 'none';
    document.getElementById('content-generate-form').dispatchEvent(new Event('submit'));
}

/**
 * 显示成功消息（静默，仅console记录）
 */
function showSuccess(message) {
    console.log('✅ ' + message);
}

/**
 * 显示错误消息（静默，仅console记录）
 */
function showError(message) {
    console.error('❌ ' + message);
}
