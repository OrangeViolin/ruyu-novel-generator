// 创作灵感助手 - 分步创作流程

// 全局状态
let inspirationData = {
    step1: {},  // 用户输入的灵感
    step2: {},  // AI生成的设定
    step3: {},  // AI生成的大纲
    step4: {},  // AI生成的章节
    step5: {}   // 最终成文
};

let inspirationCurrentStep = 1;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('创作灵感助手初始化完成');
});

// 步骤导航
function goToStep(stepNumber) {
    // 隐藏所有步骤
    document.querySelectorAll('.step-content').forEach(el => {
        el.classList.remove('active');
        el.style.display = 'none';
    });

    // 显示目标步骤
    const targetStep = document.getElementById(`inspiration-step-${stepNumber}`);
    if (targetStep) {
        targetStep.classList.add('active');
        targetStep.style.display = 'block';
    }

    // 更新步骤指示器
    document.querySelectorAll('.step').forEach(el => {
        const stepNum = parseInt(el.dataset.step);
        el.classList.remove('active', 'completed');
        if (stepNum < stepNumber) {
            el.classList.add('completed');
        } else if (stepNum === stepNumber) {
            el.classList.add('active');
        }
    });

    inspirationCurrentStep = stepNumber;
}

function backToStep(stepNumber) {
    goToStep(stepNumber);
}

// 第一步: AI生成设定
async function generateInpiration() {
    // 收集表单数据
    const data = {
        summary: document.getElementById('inspiration-summary').value.trim(),
        readers: document.getElementById('inspiration-readers').value,
        genre: document.getElementById('inspiration-genre').value,
        chapters: document.getElementById('inspiration-chapters').value,
        words: document.getElementById('inspiration-words').value,
        elements: document.getElementById('inspiration-elements').value.trim()
    };

    // 保存到全局状态
    inspirationData.step1 = data;

    // 验证至少有一个输入
    const hasInput = Object.values(data).some(v => v && v !== '');
    if (!hasInput) {
        alert('请至少填写一项内容,或让AI完全随机生成');
        return;
    }

    // 进入第二步
    goToStep(2);

    // 显示加载状态
    const settingsContent = document.getElementById('settings-content');
    settingsContent.innerHTML = `
        <div class="loading-state">
            <div style="text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">✨</div>
                <p>AI正在创作设定中,请稍候...</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">这可能需要10-30秒</p>
            </div>
        </div>
    `;

    try {
        // 调用后端API
        const response = await fetch('/api/inspiration/generate-settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            inspirationData.step2 = result.data;
            displaySettings(result.data);
            document.getElementById('step-2-actions').style.display = 'flex';
        } else {
            settingsContent.innerHTML = `
                <div class="loading-state" style="color: var(--danger-color);">
                    <p>❌ 生成失败: ${result.message || '未知错误'}</p>
                    <button class="btn btn-primary" onclick="goToStep(1)" style="margin-top: 1rem;">返回重试</button>
                </div>
            `;
        }
    } catch (error) {
        console.error('生成设定失败:', error);
        settingsContent.innerHTML = `
            <div class="loading-state" style="color: var(--danger-color);">
                <p>❌ 生成失败: ${error.message}</p>
                <button class="btn btn-primary" onclick="goToStep(1)" style="margin-top: 1rem;">返回重试</button>
            </div>
        `;
    }
}

// 显示生成的设定(增强版)
function displaySettings(data) {
    const content = document.getElementById('settings-content');

    let html = `
        <div class="settings-section">
            <h4>📖 基本信息</h4>
            <div class="settings-item">
                <label>小说标题</label>
                <p><strong>${escapeHtml(data.title || '未设置')}</strong></p>
                ${data.subtitle ? `<p style="font-size: 0.9rem; color: var(--text-secondary);">${escapeHtml(data.subtitle)}</p>` : ''}
            </div>
            <div class="settings-item">
                <label>故事简介</label>
                <p>${escapeHtml(data.summary || '未设置')}</p>
            </div>
        </div>

        <!-- 核心矛盾挖掘 -->
        ${data.core_conflict ? `
        <div class="settings-section" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%); padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--primary-color);">
            <h4>⚔️ 核心矛盾挖掘</h4>
            <div class="settings-item">
                <label>🎯 主角欲望</label>
                <p>${escapeHtml(data.core_conflict.protagonist_desire || '未设置')}</p>
            </div>
            <div class="settings-item">
                <label>🚧 核心阻碍</label>
                <p>${escapeHtml(data.core_conflict.core_obstacle || '未设置')}</p>
            </div>
            <div class="settings-item">
                <label>💔 失败后果</label>
                <p style="color: var(--danger-color);">${escapeHtml(data.core_conflict.tragic_consequence || '未设置')}</p>
            </div>
            <div class="settings-item">
                <label>✨ 独特卖点</label>
                <p>${escapeHtml(data.core_conflict.unique_selling_point || '待定')}</p>
            </div>
        </div>
        ` : ''}

        <!-- 黄金三章锚点 -->
        ${data.golden_three_chapters ? `
        <div class="settings-section" style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(251, 146, 60, 0.05) 100%); padding: 1.5rem; border-radius: 12px; border-left: 4px solid #f59e0b;">
            <h4>🌟 黄金三章锚点</h4>
            <div class="settings-item">
                <label>📌 第一章钩子 (开篇3000字)</label>
                <p>${escapeHtml(data.golden_three_chapters.chapter1_hook || '未设置')}</p>
            </div>
            <div class="settings-item">
                <label>⚡ 第二章冲突</label>
                <p>${escapeHtml(data.golden_three_chapters.chapter2_conflict || '未设置')}</p>
            </div>
            <div class="settings-item">
                <label>🔄 第三章转折</label>
                <p>${escapeHtml(data.golden_three_chapters.chapter3_twist || '未设置')}</p>
            </div>
        </div>
        ` : ''}

        <!-- 元素碰撞建议 -->
        ${data.element_collisions && data.element_collisions.length > 0 ? `
        <div class="settings-section" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(52, 211, 153, 0.05) 100%); padding: 1.5rem; border-radius: 12px; border-left: 4px solid #10b981;">
            <h4>💥 元素碰撞建议 (反差萌)</h4>
            ${data.element_collisions.map(collision => `
                <div class="settings-item" style="background: white; padding: 1rem; border-radius: 8px; margin-top: 0.5rem;">
                    <label style="color: var(--success-color);">${escapeHtml(collision.description || '')}</label>
                    <p style="font-size: 0.9rem; margin-top: 0.5rem;">${escapeHtml(collision.example || '')}</p>
                </div>
            `).join('')}
        </div>
        ` : ''}

        <div class="settings-section">
            <h4>🌍 世界观设定</h4>
            <div class="settings-item">
                <label>时空背景</label>
                <p>${escapeHtml(data.setting?.time_space || '未设置')}</p>
            </div>
            <div class="settings-item">
                <label>世界规则</label>
                <p>${escapeHtml(data.setting?.world_rules || '未设置')}</p>
            </div>
            <div class="settings-item">
                <label>社会结构</label>
                <p>${escapeHtml(data.setting?.social_structure || '未设置')}</p>
            </div>
            <div class="settings-item">
                <label>组织机构</label>
                <p>${escapeHtml(data.setting?.organizations || '未设置')}</p>
            </div>
            <div class="settings-item">
                <label>文化特色</label>
                <p>${escapeHtml(data.setting?.culture || '未设置')}</p>
            </div>
        </div>

        <div class="settings-section">
            <h4>👥 角色设定</h4>
            <div class="character-card-grid">
    `;

    // 渲染角色卡片
    if (data.characters && data.characters.length > 0) {
        data.characters.forEach(char => {
            const roleLabel = char.role_type === 'protagonist' ? '主角' :
                             char.role_type === 'antagonist' ? '反派' : '配角';
            html += `
                <div class="character-card ${char.role_type}">
                    <h5>${escapeHtml(char.name || '未命名')}</h5>
                    <span class="character-role">${roleLabel}</span>
                    <div class="settings-item">
                        <label>核心身份</label>
                        <p>${escapeHtml(char.core_identity || '未设置')}</p>
                    </div>
                    <div class="settings-item">
                        <label>核心性格</label>
                        <p>${escapeHtml(char.core_personality || '未设置')}</p>
                    </div>
                    ${char.personality_flaw ? `
                    <div class="settings-item" style="background: rgba(239, 68, 68, 0.1); padding: 0.5rem; border-radius: 4px;">
                        <label style="color: var(--danger-color);">⚠️ 性格缺陷</label>
                        <p style="font-size: 0.9rem;">${escapeHtml(char.personality_flaw)}</p>
                        ${char.flaw_consequence ? `<p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.5rem;">💭 ${escapeHtml(char.flaw_consequence)}</p>` : ''}
                    </div>
                    ` : ''}
                    <div class="settings-item">
                        <label>核心动机</label>
                        <p>${escapeHtml(char.core_motivation || '未设置')}</p>
                    </div>
                    <div class="settings-item">
                        <label>成长方向</label>
                        <p>${escapeHtml(char.growth_direction || '未设置')}</p>
                    </div>
                </div>
            `;
        });
    } else {
        html += '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">暂无角色设定</p>';
    }

    html += `
            </div>
        </div>
    `;

    content.innerHTML = html;
}

// 第二步完成,生成大纲
async function generateOutline() {
    goToStep(3);

    const outlineContent = document.getElementById('outline-content');
    outlineContent.innerHTML = `
        <div class="loading-state">
            <div style="text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
                <p>AI正在生成大纲,请稍候...</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">这可能需要20-40秒</p>
            </div>
        </div>
    `;

    try {
        const response = await fetch('/api/inspiration/generate-outline', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                settings: inspirationData.step2
            })
        });

        const result = await response.json();

        if (result.success) {
            // 检查是否有解析错误
            if (result.data && result.data.parse_error) {
                inspirationData.step3 = result.data;
                outlineContent.innerHTML = `
                    <div class="loading-state" style="color: var(--danger-color);">
                        <p>⚠️ 大纲格式解析失败</p>
                        <p style="font-size: 0.9rem; margin-top: 1rem; color: var(--text-secondary);">
                            ${result.data.parse_error}
                        </p>
                        <details style="margin-top: 1rem; text-align: left;">
                            <summary style="cursor: pointer; padding: 0.5rem; background: rgba(0,0,0,0.05); border-radius: 4px;">
                                查看AI原始回复
                            </summary>
                            <pre style="margin-top: 0.5rem; padding: 1rem; background: rgba(0,0,0,0.03); border-radius: 4px; overflow: auto; max-height: 300px; font-size: 0.85rem;">${escapeHtml(result.data.raw_response || '无')}</pre>
                        </details>
                        <button class="btn btn-primary" onclick="generateOutline()" style="margin-top: 1rem;">🔄 重新生成</button>
                        <button class="btn btn-secondary" onclick="goToStep(2)" style="margin-top: 1rem;">⬅️ 返回上一步</button>
                    </div>
                `;
                document.getElementById('step-3-actions').style.display = 'none';
            } else {
                inspirationData.step3 = result.data;
                displayOutline(result.data);
                document.getElementById('step-3-actions').style.display = 'flex';
            }
        } else {
            outlineContent.innerHTML = `
                <div class="loading-state" style="color: var(--danger-color);">
                    <p>❌ 生成失败: ${result.message || '未知错误'}</p>
                    <button class="btn btn-primary" onclick="goToStep(2)" style="margin-top: 1rem;">返回重试</button>
                </div>
            `;
        }
    } catch (error) {
        console.error('生成大纲失败:', error);
        outlineContent.innerHTML = `
            <div class="loading-state" style="color: var(--danger-color);">
                <p>❌ 生成失败: ${error.message}</p>
                <button class="btn btn-primary" onclick="goToStep(2)" style="margin-top: 1rem;">返回重试</button>
            </div>
        `;
    }
}

// 显示大纲(增强版)
function displayOutline(data) {
    const content = document.getElementById('outline-content');

    let html = '';

    // 动态节拍器
    if (data.word_distribution) {
        html += `
        <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(99, 102, 241, 0.05) 100%); padding: 1.5rem; border-radius: 12px; margin-bottom: 2rem;">
            <h4 style="margin-bottom: 1rem;">📊 动态节拍器 (字数分配)</h4>
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 120px; text-align: center; padding: 1rem; background: white; border-radius: 8px;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--primary-color);">${data.word_distribution.opening || 0}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.5rem;">开篇 15%</div>
                </div>
                <div style="flex: 1; min-width: 120px; text-align: center; padding: 1rem; background: white; border-radius: 8px;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--primary-color);">${data.word_distribution.setup || 0}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.5rem;">起步 10%</div>
                </div>
                <div style="flex: 1; min-width: 120px; text-align: center; padding: 1rem; background: white; border-radius: 8px;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--danger-color);">${data.word_distribution.conflict || 0}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.5rem;">冲突 40%</div>
                </div>
                <div style="flex: 1; min-width: 120px; text-align: center; padding: 1rem; background: white; border-radius: 8px;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--danger-color);">${data.word_distribution.climax || 0}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.5rem;">高潮 20%</div>
                </div>
                <div style="flex: 1; min-width: 120px; text-align: center; padding: 1rem; background: white; border-radius: 8px;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--success-color);">${data.word_distribution.ending || 0}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.5rem;">结尾 15%</div>
                </div>
            </div>
        </div>
        `;
    }

    // 情感曲线
    if (data.emotion_curve && data.emotion_curve.length > 0) {
        html += `
        <div style="background: linear-gradient(135deg, rgba(236, 72, 153, 0.05) 0%, rgba(244, 114, 182, 0.05) 100%); padding: 1.5rem; border-radius: 12px; margin-bottom: 2rem;">
            <h4 style="margin-bottom: 1rem;">📈 情感曲线</h4>
            <div style="display: flex; align-items: flex-end; gap: 0.5rem; height: 150px; padding: 1rem;">
        `;

        data.emotion_curve.forEach(point => {
            const height = point.intensity * 12; // 最大120px
            const color = point.intensity >= 8 ? '#ef4444' : point.intensity >= 5 ? '#f59e0b' : '#10b981';
            html += `
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                    <div style="font-size: 0.75rem; text-align: center;">${point.intensity}</div>
                    <div style="width: 100%; height: ${height}px; background: ${color}; border-radius: 4px 4px 0 0; min-height: 10px;"></div>
                    <div style="font-size: 0.75rem; text-align: center; color: var(--text-secondary);">第${point.chapter}章<br>${point.type}</div>
                </div>
            `;
        });

        html += `
            </div>
        </div>
        `;
    }

    // 伏笔预埋
    if (data.foreshadowing_map && data.foreshadowing_map.length > 0) {
        html += `
        <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(167, 139, 250, 0.05) 100%); padding: 1.5rem; border-radius: 12px; margin-bottom: 2rem;">
            <h4 style="margin-bottom: 1rem;">🔍 伏笔预埋系统</h4>
            <div style="display: grid; gap: 1rem;">
        `;

        data.foreshadowing_map.forEach(foreshadow => {
            html += `
                <div style="background: white; padding: 1rem; border-radius: 8px; border-left: 3px solid var(--primary-color);">
                    <div style="font-weight: 600; margin-bottom: 0.5rem;">${escapeHtml(foreshadow.hint)}</div>
                    <div style="font-size: 0.9rem; color: var(--text-secondary);">
                        📌 第${foreshadow.planted_chapter}章埋 → ✅ 第${foreshadow.resolve_chapter}章收
                    </div>
                </div>
            `;
        });

        html += `
            </div>
        </div>
        `;
    }

    // 章节列表
    html += '<h4 style="margin: 2rem 0 1rem;">📋 详细章节大纲</h4>';

    if (data.chapters && data.chapters.length > 0) {
        data.chapters.forEach((chapter, index) => {
            const emotionBadge = chapter.emotion_intensity ?
                `<span style="background: ${chapter.emotion_intensity >= 8 ? '#ef4444' : chapter.emotion_intensity >= 5 ? '#f59e0b' : '#10b981'}; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; margin-left: 0.5rem;">
                    ${chapter.emotion_type || '情绪'} ${chapter.emotion_intensity}/10
                </span>` : '';

            html += `
                <div class="chapter-outline-card">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <h5>第${chapter.chapter_number || index + 1}章: ${escapeHtml(chapter.title || '未命名')}</h5>
                        ${emotionBadge}
                    </div>
                    <p style="margin-top: 0.5rem;">${escapeHtml(chapter.summary || '')}</p>
                    <div class="chapter-meta">
                        <span>📊 目标字数: ${chapter.target_words || 2000}</span>
                        <span>🎭 涉及角色: ${chapter.characters ? chapter.characters.join(', ') : '未指定'}</span>
                    </div>
                    ${chapter.chapter_hook ? `
                        <div style="margin-top: 0.5rem; padding: 0.5rem; background: rgba(245, 158, 11, 0.1); border-radius: 4px;">
                            <label style="font-size: 0.85rem; color: #f59e0b;">📌 结尾钩子:</label>
                            <p style="font-size: 0.9rem; margin-top: 0.25rem;">${escapeHtml(chapter.chapter_hook)}</p>
                        </div>
                    ` : ''}
                    ${chapter.flaw_manifestation ? `
                        <div style="margin-top: 0.5rem; padding: 0.5rem; background: rgba(239, 68, 68, 0.1); border-radius: 4px;">
                            <label style="font-size: 0.85rem; color: var(--danger-color);">⚠️ 角色缺陷体现:</label>
                            <p style="font-size: 0.9rem; margin-top: 0.25rem;">${escapeHtml(chapter.flaw_manifestation)}</p>
                        </div>
                    ` : ''}
                    ${chapter.plot_points && chapter.plot_points.length > 0 ? `
                        <div style="margin-top: 1rem;">
                            <label style="font-weight: 600; font-size: 0.9rem;">情节要点:</label>
                            <ul style="margin-top: 0.5rem; padding-left: 1.5rem;">
                                ${chapter.plot_points.map(p => `<li>${escapeHtml(p)}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    ${chapter.foreshadowing && chapter.foreshadowing.length > 0 ? `
                        <div style="margin-top: 0.5rem;">
                            <label style="font-size: 0.85rem; color: var(--primary-color);">🔍 伏笔:</label>
                            <div style="font-size: 0.85rem; margin-top: 0.25rem;">
                                ${chapter.foreshadowing.map(f => `<span style="background: rgba(139, 92, 246, 0.1); padding: 0.25rem 0.5rem; border-radius: 4px; margin-right: 0.5rem;">${escapeHtml(f)}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        });
    } else {
        html += '<p style="text-align: center; color: var(--text-secondary);">暂无大纲内容</p>';
    }

    content.innerHTML = html;
}

// 第三步完成,生成章节
async function generateChapters() {
    // 检查outline是否有chapters字段
    if (!inspirationData.step3 || !inspirationData.step3.chapters || inspirationData.step3.chapters.length === 0) {
        alert('大纲数据无效，请重新生成大纲');
        goToStep(3);
        return;
    }

    goToStep(4);

    const chaptersContent = document.getElementById('chapters-content');
    chaptersContent.innerHTML = `
        <div class="loading-state">
            <div style="text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📖</div>
                <p>AI正在创作章节,请稍候...</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">这可能需要1-3分钟</p>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.5rem;">章节会逐个显示,请耐心等待</p>
            </div>
        </div>
    `;

    try {
        const response = await fetch('/api/inspiration/generate-chapters', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                settings: inspirationData.step2,
                outline: inspirationData.step3
            })
        });

        const result = await response.json();

        if (result.success) {
            inspirationData.step4 = result.data;
            displayChapters(result.data);
            document.getElementById('step-4-actions').style.display = 'flex';
        } else {
            chaptersContent.innerHTML = `
                <div class="loading-state" style="color: var(--danger-color);">
                    <p>❌ 生成失败: ${result.message || '未知错误'}</p>
                    <button class="btn btn-primary" onclick="goToStep(3)" style="margin-top: 1rem;">返回重试</button>
                </div>
            `;
        }
    } catch (error) {
        console.error('生成章节失败:', error);
        chaptersContent.innerHTML = `
            <div class="loading-state" style="color: var(--danger-color);">
                <p>❌ 生成失败: ${error.message}</p>
                <button class="btn btn-primary" onclick="goToStep(3)" style="margin-top: 1rem;">返回重试</button>
            </div>
        `;
    }
}

// 显示章节内容
function displayChapters(data) {
    const content = document.getElementById('chapters-content');

    let html = '';

    if (data.chapters && data.chapters.length > 0) {
        data.chapters.forEach((chapter, index) => {
            html += `
                <div class="chapter-content-card">
                    <div class="chapter-content-header">
                        <h5>第${chapter.chapter_number || index + 1}章: ${escapeHtml(chapter.title || '未命名')}</h5>
                        <span class="word-count-badge">${chapter.word_count || 0} 字</span>
                    </div>
                    <div class="chapter-content-preview">
                        ${escapeHtml(chapter.content || '内容生成中...').substring(0, 500)}
                        ${chapter.content && chapter.content.length > 500 ? '...' : ''}
                    </div>
                </div>
            `;
        });
    } else {
        html = '<p style="text-align: center; color: var(--text-secondary);">暂无章节内容</p>';
    }

    content.innerHTML = html;
}

// 第四步完成,一键成文
async function generateNovel() {
    goToStep(5);

    const novelResult = document.getElementById('novel-result');
    novelResult.innerHTML = `
        <div class="loading-state">
            <div style="text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🎉</div>
                <p>正在整合成文,请稍候...</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">创建项目并保存章节中</p>
            </div>
        </div>
    `;

    try {
        const response = await fetch('/api/inspiration/generate-novel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                settings: inspirationData.step2,
                outline: inspirationData.step3,
                chapters: inspirationData.step4
            })
        });

        const result = await response.json();

        if (result.success) {
            inspirationData.step5 = result.data;
            displayNovelResult(result.data);
            document.getElementById('step-5-actions').style.display = 'flex';
        } else {
            novelResult.innerHTML = `
                <div class="loading-state" style="color: var(--danger-color);">
                    <p>❌ 生成失败: ${result.message || '未知错误'}</p>
                    <button class="btn btn-primary" onclick="goToStep(4)" style="margin-top: 1rem;">返回重试</button>
                </div>
            `;
        }
    } catch (error) {
        console.error('一键成文失败:', error);
        novelResult.innerHTML = `
            <div class="loading-state" style="color: var(--danger-color);">
                <p>❌ 生成失败: ${error.message}</p>
                <button class="btn btn-primary" onclick="goToStep(4)" style="margin-top: 1rem;">返回重试</button>
            </div>
        `;
    }
}

// 显示最终结果
function displayNovelResult(data) {
    const content = document.getElementById('novel-result');

    const totalWords = data.chapters ? data.chapters.reduce((sum, ch) => sum + (ch.word_count || 0), 0) : 0;
    const chapterCount = data.chapters ? data.chapters.length : 0;

    content.innerHTML = `
        <div style="text-align: center; margin-bottom: 2rem;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">🎉</div>
            <h3 style="color: var(--success-color); margin-bottom: 1rem;">小说生成完成!</h3>
            <p style="font-size: 1.2rem;">${escapeHtml(data.title || '未命名')}</p>
            <div style="display: flex; justify-content: center; gap: 2rem; margin-top: 1.5rem; color: var(--text-secondary);">
                <span>📚 ${chapterCount} 章</span>
                <span>📊 ${totalWords} 字</span>
                <span>🆔 项目ID: ${data.project_id}</span>
            </div>
        </div>
        <div style="text-align: center;">
            <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
                您可以在"我的项目"标签页中查看和编辑这部小说
            </p>
            <a href="/api/novel/export/${data.project_id}" class="btn btn-primary" target="_blank">
                📥 导出为Word文档
            </a>
        </div>
    `;
}

// 导出小说
function exportNovel() {
    const data = inspirationData.step5;
    if (data && data.project_id) {
        window.open(`/api/novel/export/${data.project_id}`, '_blank');
    }
}

// 重置并重新创作
function resetInspiration() {
    if (confirm('确定要重新开始创作吗?当前进度将丢失。')) {
        inspirationData = {
            step1: {},
            step2: {},
            step3: {},
            step4: {},
            step5: {}
        };

        // 清空表单
        document.getElementById('inspiration-form').reset();

        // 隐藏操作按钮
        document.getElementById('step-2-actions').style.display = 'none';
        document.getElementById('step-3-actions').style.display = 'none';
        document.getElementById('step-4-actions').style.display = 'none';
        document.getElementById('step-5-actions').style.display = 'none';

        // 回到第一步
        goToStep(1);
    }
}

// HTML转义函数
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
