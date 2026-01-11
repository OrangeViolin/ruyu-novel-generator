// AI智能体系统
let currentAgent = null;
let currentExecutionId = null;

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否在智能体标签页
    const agentsTab = document.querySelector('[data-tab="agents"]');
    if (agentsTab) {
        agentsTab.addEventListener('click', function() {
            loadAgents();
        });
    }

    // 初始化筛选按钮
    initFilters();

    // 初始化智能体执行表单
    initExecuteForm();

    // 默认加载智能体列表
    loadAgents();
});

// 初始化筛选按钮
function initFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // 更新按钮状态
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // 加载对应分类的智能体
            const category = this.dataset.category;
            loadAgents(category);
        });
    });
}

// 初始化智能体执行表单
function initExecuteForm() {
    const form = document.getElementById('agent-execute-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await executeAgent();
        });
    }
}

// 加载智能体列表
async function loadAgents(category = 'all') {
    const grid = document.getElementById('agents-grid');

    // 检查元素是否存在
    if (!grid) {
        console.log('智能体面板未显示，跳过加载');
        return;
    }

    try {
        const url = category === 'all'
            ? '/api/agents'
            : `/api/agents?category=${category}`;

        console.log('正在加载智能体:', url);

        const response = await fetch(url);
        console.log('响应状态:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('响应数据:', data);

        if (data.success && data.agents.length > 0) {
            grid.innerHTML = data.agents.map(agent => `
                <div class="agent-card">
                    <div class="agent-header">
                        <h4>${agent.name} ${agent.is_official ? '<span class="official-badge">官方</span>' : ''}</h4>
                        <div class="agent-stats">
                            <span>👁️ ${agent.usage_count || 0}</span>
                            <span>❤️ ${agent.like_count || 0}</span>
                        </div>
                    </div>
                    <div class="agent-body">
                        <p class="agent-description">${agent.description || ''}</p>
                        <div class="agent-tags">
                            ${(agent.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                        ${agent.variables && agent.variables.length > 0 ? `
                            <div class="agent-variables">
                                <strong>需要输入：</strong>
                                ${agent.variables.map(v => `<span class="var-tag">${v.label || v.name}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                    <div class="agent-footer">
                        <button class="btn btn-sm btn-primary" onclick="openExecuteModal(${agent.id})">🚀 使用</button>
                        ${agent.is_official ? '' : `<button class="btn btn-sm btn-secondary" onclick="editAgent(${agent.id})">编辑</button>`}
                    </div>
                </div>
            `).join('');
        } else {
            grid.innerHTML = '<p class="empty-state">暂无智能体</p>';
        }
    } catch (error) {
        console.error('加载智能体失败:', error);
        const grid = document.getElementById('agents-grid');
        if (grid) grid.innerHTML = '<p class="empty-state">加载失败，请刷新重试</p>';
    }
}

// 打开执行智能体模态框
async function openExecuteModal(agentId) {
    try {
        const response = await fetch(`/api/agents/${agentId}`);
        const data = await response.json();

        if (!data.success) {
            showToast('获取智能体信息失败');
            return;
        }

        currentAgent = data.agent;

        // 设置标题
        document.getElementById('agent-execute-title').textContent = `🚀 ${currentAgent.name}`;

        // 生成变量输入表单
        const container = document.getElementById('agent-variables-container');
        if (currentAgent.variables && currentAgent.variables.length > 0) {
            container.innerHTML = currentAgent.variables.map((variable, index) => {
                const inputId = `var-${index}`;
                const requiredAttr = variable.required ? 'required' : '';
                const requiredMark = variable.required ? '<span style="color: red;">*</span>' : '';

                if (variable.type === 'textarea') {
                    return `
                        <div class="form-group">
                            <label>${variable.label || variable.name} ${requiredMark}</label>
                            <textarea id="${inputId}" class="form-control" rows="4" ${requiredAttr}
                                placeholder="${variable.default || ''}"></textarea>
                        </div>
                    `;
                } else {
                    return `
                        <div class="form-group">
                            <label>${variable.label || variable.name} ${requiredMark}</label>
                            <input type="text" id="${inputId}" class="form-control" ${requiredAttr}
                                placeholder="${variable.default || ''}">
                        </div>
                    `;
                }
            }).join('');
        } else {
            container.innerHTML = '<p class="empty-state">该智能体不需要输入变量</p>';
        }

        // 显示模态框
        const modal = document.getElementById('agent-execute-modal');
        if (modal) modal.style.display = 'block';

    } catch (error) {
        console.error('打开执行模态框失败:', error);
        showToast('加载失败，请重试');
    }
}

// 执行智能体
async function executeAgent() {
    if (!currentAgent) {
        showToast('请先选择智能体');
        return;
    }

    // 收集变量值
    const variables = {};
    if (currentAgent.variables) {
        for (let i = 0; i < currentAgent.variables.length; i++) {
            const inputId = `var-${i}`;
            const input = document.getElementById(inputId);
            if (input) {
                variables[currentAgent.variables[i].name] = input.value;
            }
        }
    }

    try {
        showToast('AI正在生成，请稍候...');

        const response = await fetch(`/api/agents/${currentAgent.id}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                variables: variables,
                batch_count: currentAgent.batch_count || 1
            })
        });

        const data = await response.json();

        if (data.success) {
            closeModal('agent-execute-modal');
            currentExecutionId = data.execution_id;

            if (data.versions && data.versions.length > 1) {
                // 多个版本，显示对比界面
                showVersionCompare(data.versions);
            } else if (data.versions && data.versions.length === 1) {
                // 单个版本，直接显示结果
                showSingleVersion(data.versions[0].content);
            }

            showToast(`生成成功！共 ${data.versions.length} 个版本`);
        } else {
            showToast('生成失败，请重试');
        }
    } catch (error) {
        console.error('执行智能体失败:', error);
        showToast('执行失败，请重试');
    }
}

// 显示版本对比界面
function showVersionCompare(versions) {
    const container = document.getElementById('versions-container');

    container.innerHTML = `
        <div class="versions-grid">
            ${versions.map((version, index) => `
                <div class="version-card" data-version-id="${version.version_id}">
                    <div class="version-header">
                        <h4>版本 ${version.version_number}</h4>
                        <button class="btn btn-sm btn-primary" onclick="selectVersion(${version.version_id})">✅ 选择此版本</button>
                    </div>
                    <div class="version-content">
                        <pre>${escapeHtml(version.content)}</pre>
                    </div>
                    <div class="version-actions">
                        <button class="btn btn-sm btn-secondary" onclick="copyVersionContent('${version.version_id}')">📋 复制</button>
                        <button class="btn btn-sm" onclick="useVersionInProject(${version.version_id})">➕ 使用到项目</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    const modal = document.getElementById('version-compare-modal');
    if (modal) modal.style.display = 'block';
}

// 显示单个版本
function showSingleVersion(content) {
    const container = document.getElementById('versions-container');

    container.innerHTML = `
        <div class="single-version">
            <div class="version-header">
                <h4>生成结果</h4>
                <div class="version-actions">
                    <button class="btn btn-sm btn-secondary" onclick="copyText(this)">📋 复制</button>
                    <button class="btn btn-sm" onclick="closeModal('version-compare-modal')">关闭</button>
                </div>
            </div>
            <div class="version-content">
                <textarea class="result-textarea" rows="20">${escapeHtml(content)}</textarea>
            </div>
        </div>
    `;

    const modal = document.getElementById('version-compare-modal');
    if (modal) modal.style.display = 'block';
}

// 选择某个版本
async function selectVersion(versionId) {
    try {
        const response = await fetch(`/api/versions/${versionId}/select`, {
            method: 'POST'
        });

        const data = await response.json();
        if (data.success) {
            showToast('已选择该版本');

            // 更新UI显示选中状态
            document.querySelectorAll('.version-card').forEach(card => {
                card.classList.remove('selected');
            });
            const selectedCard = document.querySelector(`[data-version-id="${versionId}"]`);
            if (selectedCard) {
                selectedCard.classList.add('selected');
            }
        }
    } catch (error) {
        console.error('选择版本失败:', error);
    }
}

// 复制版本内容
function copyVersionContent(versionId) {
    const card = document.querySelector(`[data-version-id="${versionId}"]`);
    if (card) {
        const content = card.querySelector('pre').textContent;
        copyTextContent(content);
        showToast('已复制到剪贴板');
    }
}

// 复制文本
function copyTextContent(text) {
    navigator.clipboard.writeText(text).catch(err => {
        console.error('复制失败:', err);
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    });
}

// 从textarea复制
function copyText(button) {
    const textarea = button.closest('.single-version').querySelector('textarea');
    if (textarea) {
        textarea.select();
        document.execCommand('copy');
        showToast('已复制到剪贴板');
    }
}

// 将版本使用到项目中（占位功能）
function useVersionInProject(versionId) {
    showToast('功能开发中...');
}

// 创建智能体（占位功能）
function showCreateAgentModal() {
    showToast('自定义智能体功能开发中...');
}

// 编辑智能体（占位功能）
function editAgent(agentId) {
    showToast('编辑功能开发中...');
}

// HTML转义
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
