// 短故事创作助手 - JavaScript Module

// 全局状态
let shortStoryData = {
    step1: {},  // 用户输入
    step2: {},  // AI生成的设定
    step3: {},  // AI生成的大纲
    step4: {},  // AI生成的章节
    step5: {}   // 最终成文
};

let shortStoryCurrentStep = 1;
let isShortStoryOneClickMode = false;

// 初始化
document.addEventListener('DOMContentLoaded', function () {
    console.log('短故事创作助手初始化完成');
});

// 步骤导航
function goToShortStoryStep(stepNumber) {
    // 获取短故事助手的步骤指示器
    const panel = document.getElementById('tab-short-story');
    if (!panel) return;

    // 隐藏所有步骤
    panel.querySelectorAll('.step-content').forEach(el => {
        el.classList.remove('active');
        el.style.display = 'none';
    });

    // 显示目标步骤
    const targetStep = document.getElementById(`short-story-step-${stepNumber}`);
    if (targetStep) {
        targetStep.classList.add('active');
        targetStep.style.display = 'block';
    }

    // 更新步骤指示器
    panel.querySelectorAll('.step-indicator .step').forEach(el => {
        const stepNum = parseInt(el.dataset.step);
        el.classList.remove('active', 'completed');
        if (stepNum < stepNumber) {
            el.classList.add('completed');
        } else if (stepNum === stepNumber) {
            el.classList.add('active');
        }
    });

    shortStoryCurrentStep = stepNumber;
}

// 第一步: 生成设定
async function generateShortStorySettings() {
    // 收集表单数据
    const genre = document.getElementById('short-story-genre').value;
    const perspective = document.getElementById('short-story-perspective').value;
    const summary = document.getElementById('short-story-summary').value.trim();
    const targetWords = document.getElementById('short-story-words').value;
    const chapterCount = document.getElementById('short-story-chapters').value;

    // 收集选中的爆点梗
    const tropes = [];
    document.querySelectorAll('input[name="short-story-trope"]:checked').forEach(cb => {
        tropes.push(cb.value);
    });

    // 验证题材
    if (!genre) {
        alert('请选择题材类型');
        return false;
    }

    const data = {
        genre,
        perspective,
        summary,
        targetWords: parseInt(targetWords),
        chapterCount: parseInt(chapterCount),
        tropes
    };

    // 保存到全局状态
    shortStoryData.step1 = data;

    // 进入第二步
    goToShortStoryStep(2);

    // 显示加载状态
    const settingsContent = document.getElementById('short-story-settings-content');
    settingsContent.innerHTML = `
        <div class="loading-state">
            <div style="text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">✨</div>
                <p>AI正在创作短故事设定中,请稍候...</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">这可能需要15-30秒</p>
            </div>
        </div>
    `;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000);

        const response = await fetch('/api/short-story/generate-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const result = await response.json();

        if (result.success) {
            shortStoryData.step2 = result.data;
            displayShortStorySettings(result.data);
            document.getElementById('short-story-step-2-actions').style.display = 'flex';
            return true;
        } else {
            settingsContent.innerHTML = `
                <div class="loading-state" style="color: var(--danger-color);">
                    <p>❌ 生成失败: ${result.message || '未知错误'}</p>
                    <button class="btn btn-primary" onclick="goToShortStoryStep(1)" style="margin-top: 1rem;">返回重试</button>
                </div>
            `;
            return false;
        }
    } catch (error) {
        console.error('生成短故事设定失败:', error);
        settingsContent.innerHTML = `
            <div class="loading-state" style="color: var(--danger-color);">
                <p>❌ 生成失败: ${error.message}</p>
                <button class="btn btn-primary" onclick="goToShortStoryStep(1)" style="margin-top: 1rem;">返回重试</button>
            </div>
        `;
        return false;
    }
}

// 显示短故事设定
function displayShortStorySettings(data) {
    const content = document.getElementById('short-story-settings-content');

    let html = `
        <div class="settings-section" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%); padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--primary-color); margin-bottom: 1.5rem;">
            <h4>📖 标题 (30字三段式)</h4>
            <p style="font-size: 1.2rem; font-weight: bold; margin-top: 0.5rem;">${escapeHtml(data.title || '未生成')}</p>
        </div>

        <div class="settings-section">
            <h4>📋 故事简介</h4>
            <p>${escapeHtml(data.summary || '未设置')}</p>
        </div>

        <div class="settings-section" style="background: rgba(239, 68, 68, 0.05); padding: 1rem; border-radius: 8px; border-left: 3px solid var(--danger-color);">
            <h4>⚔️ 主要矛盾</h4>
            <p>${escapeHtml(data.main_conflict || '未设置')}</p>
        </div>

        <div class="settings-section">
            <h4>👥 极致人设</h4>
            <div class="character-card-grid">
    `;

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
                        <p>${escapeHtml(char.identity || '未设置')}</p>
                    </div>
                    <div class="settings-item">
                        <label>极致性格</label>
                        <p>${escapeHtml(char.personality || '未设置')}</p>
                    </div>
                    ${char.flaw ? `
                    <div class="settings-item" style="background: rgba(239, 68, 68, 0.1); padding: 0.5rem; border-radius: 4px;">
                        <label style="color: var(--danger-color);">⚠️ 性格缺陷</label>
                        <p style="font-size: 0.9rem;">${escapeHtml(char.flaw)}</p>
                    </div>
                    ` : ''}
                </div>
            `;
        });
    }

    html += `
            </div>
        </div>

        <div class="settings-section" style="background: rgba(245, 158, 11, 0.05); padding: 1rem; border-radius: 8px;">
            <h4>🌟 黄金三章设计</h4>
            <div class="settings-item">
                <label>第一章钩子</label>
                <p>${escapeHtml(data.golden_chapters?.chapter1 || '未设置')}</p>
            </div>
            <div class="settings-item">
                <label>第二章冲突</label>
                <p>${escapeHtml(data.golden_chapters?.chapter2 || '未设置')}</p>
            </div>
            <div class="settings-item">
                <label>第三章爆发</label>
                <p>${escapeHtml(data.golden_chapters?.chapter3 || '未设置')}</p>
            </div>
        </div>
    `;

    content.innerHTML = html;
}

// 第二步: 生成大纲
async function generateShortStoryOutline() {
    goToShortStoryStep(3);

    const outlineContent = document.getElementById('short-story-outline-content');
    outlineContent.innerHTML = `
        <div class="loading-state">
            <div style="text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
                <p>AI正在生成紧凑大纲,请稍候...</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">这可能需要20-40秒</p>
            </div>
        </div>
    `;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 600000);

        const response = await fetch('/api/short-story/generate-outline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings: shortStoryData.step2 }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const result = await response.json();

        if (result.success) {
            shortStoryData.step3 = result.data;
            displayShortStoryOutline(result.data);
            document.getElementById('short-story-step-3-actions').style.display = 'flex';
            return true;
        } else {
            outlineContent.innerHTML = `
                <div class="loading-state" style="color: var(--danger-color);">
                    <p>❌ 生成失败: ${result.message || '未知错误'}</p>
                    <button class="btn btn-primary" onclick="goToShortStoryStep(2)" style="margin-top: 1rem;">返回重试</button>
                </div>
            `;
            return false;
        }
    } catch (error) {
        console.error('生成短故事大纲失败:', error);
        outlineContent.innerHTML = `
            <div class="loading-state" style="color: var(--danger-color);">
                <p>❌ 生成失败: ${error.message}</p>
                <button class="btn btn-primary" onclick="goToShortStoryStep(2)" style="margin-top: 1rem;">返回重试</button>
            </div>
        `;
        return false;
    }
}

// 显示短故事大纲
function displayShortStoryOutline(data) {
    const content = document.getElementById('short-story-outline-content');

    let html = `
        <div style="background: linear-gradient(135deg, rgba(236, 72, 153, 0.05) 0%, rgba(244, 114, 182, 0.05) 100%); padding: 1.5rem; border-radius: 12px; margin-bottom: 2rem;">
            <h4 style="margin-bottom: 1rem;">📈 情绪曲线规划</h4>
            <div style="display: flex; align-items: flex-end; gap: 0.5rem; height: 100px; padding: 0.5rem;">
    `;

    if (data.emotion_curve && data.emotion_curve.length > 0) {
        data.emotion_curve.forEach(point => {
            const height = point.intensity * 8;
            const color = point.intensity >= 8 ? '#ef4444' : point.intensity >= 5 ? '#f59e0b' : '#10b981';
            html += `
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.25rem;">
                    <div style="font-size: 0.7rem;">${point.intensity}</div>
                    <div style="width: 100%; height: ${height}px; background: ${color}; border-radius: 2px 2px 0 0; min-height: 5px;"></div>
                    <div style="font-size: 0.65rem; color: var(--text-secondary);">Ch${point.chapter}</div>
                </div>
            `;
        });
    }

    html += `
            </div>
        </div>
        <h4 style="margin-bottom: 1rem;">📋 章节大纲 (每节设有钩子)</h4>
    `;

    if (data.chapters && data.chapters.length > 0) {
        data.chapters.forEach((chapter, index) => {
            html += `
                <div class="chapter-outline-card" style="border-left: 3px solid ${index < 3 ? '#f59e0b' : 'var(--primary-color)'};">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <h5>第${chapter.chapter_number || index + 1}章: ${escapeHtml(chapter.title || '未命名')}</h5>
                        ${index < 3 ? '<span style="background: #f59e0b; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">黄金章</span>' : ''}
                    </div>
                    <p style="margin-top: 0.5rem;">${escapeHtml(chapter.summary || '')}</p>
                    <div class="chapter-meta">
                        <span>📊 ${chapter.target_words || 2000} 字</span>
                    </div>
                    ${chapter.hook ? `
                        <div style="margin-top: 0.5rem; padding: 0.5rem; background: rgba(245, 158, 11, 0.1); border-radius: 4px;">
                            <label style="font-size: 0.85rem; color: #f59e0b;">🪝 本章钩子:</label>
                            <p style="font-size: 0.9rem; margin-top: 0.25rem;">${escapeHtml(chapter.hook)}</p>
                        </div>
                    ` : ''}
                    ${chapter.secondary_conflict ? `
                        <div style="margin-top: 0.5rem; padding: 0.5rem; background: rgba(239, 68, 68, 0.1); border-radius: 4px;">
                            <label style="font-size: 0.85rem; color: var(--danger-color);">⚡ 次要矛盾:</label>
                            <p style="font-size: 0.9rem; margin-top: 0.25rem;">${escapeHtml(chapter.secondary_conflict)}</p>
                        </div>
                    ` : ''}
                </div>
            `;
        });
    }

    content.innerHTML = html;
}

// 第三步: 生成章节
async function generateShortStoryChapters() {
    if (!shortStoryData.step3 || !shortStoryData.step3.chapters) {
        alert('大纲数据无效，请重新生成大纲');
        goToShortStoryStep(3);
        return false;
    }

    goToShortStoryStep(4);

    const chaptersContent = document.getElementById('short-story-chapters-content');
    chaptersContent.innerHTML = `
        <div class="loading-state">
            <div style="text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📖</div>
                <p>AI正在并行创作章节,请稍候...</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">这可能需要1-3分钟</p>
            </div>
        </div>
    `;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 600000);

        const response = await fetch('/api/short-story/generate-chapters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                settings: shortStoryData.step2,
                outline: shortStoryData.step3
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const result = await response.json();

        if (result.success) {
            shortStoryData.step4 = result.data;
            displayShortStoryChapters(result.data);
            document.getElementById('short-story-step-4-actions').style.display = 'flex';
            return true;
        } else {
            chaptersContent.innerHTML = `
                <div class="loading-state" style="color: var(--danger-color);">
                    <p>❌ 生成失败: ${result.message || '未知错误'}</p>
                    <button class="btn btn-primary" onclick="goToShortStoryStep(3)" style="margin-top: 1rem;">返回重试</button>
                </div>
            `;
            return false;
        }
    } catch (error) {
        console.error('生成短故事章节失败:', error);
        chaptersContent.innerHTML = `
            <div class="loading-state" style="color: var(--danger-color);">
                <p>❌ 生成失败: ${error.message}</p>
                <button class="btn btn-primary" onclick="goToShortStoryStep(3)" style="margin-top: 1rem;">返回重试</button>
            </div>
        `;
        return false;
    }
}

// 显示短故事章节
function displayShortStoryChapters(data) {
    const content = document.getElementById('short-story-chapters-content');

    let html = '';
    if (data.chapters && data.chapters.length > 0) {
        let totalWords = 0;
        data.chapters.forEach((chapter, index) => {
            totalWords += chapter.word_count || 0;
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
        html = `<div style="background: rgba(16, 185, 129, 0.1); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; text-align: center;">
            <strong>📊 总字数: ${totalWords} 字</strong> (目标: ${shortStoryData.step1.targetWords || 15000} 字)
        </div>` + html;
    } else {
        html = '<p style="text-align: center; color: var(--text-secondary);">暂无章节内容</p>';
    }

    content.innerHTML = html;
}

// 第四步: 一键成文
async function generateShortStoryNovel() {
    goToShortStoryStep(5);

    const novelResult = document.getElementById('short-story-result');
    novelResult.innerHTML = `
        <div class="loading-state">
            <div style="text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🎉</div>
                <p>正在整合成文,创建项目...</p>
            </div>
        </div>
    `;

    try {
        const response = await fetch('/api/short-story/generate-novel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                settings: shortStoryData.step2,
                outline: shortStoryData.step3,
                chapters: shortStoryData.step4
            })
        });

        const result = await response.json();

        if (result.success) {
            shortStoryData.step5 = result.data;
            displayShortStoryResult(result.data);
            document.getElementById('short-story-step-5-actions').style.display = 'flex';
            return true;
        } else {
            novelResult.innerHTML = `
                <div class="loading-state" style="color: var(--danger-color);">
                    <p>❌ 生成失败: ${result.message || '未知错误'}</p>
                    <button class="btn btn-primary" onclick="goToShortStoryStep(4)" style="margin-top: 1rem;">返回重试</button>
                </div>
            `;
            return false;
        }
    } catch (error) {
        console.error('短故事成文失败:', error);
        novelResult.innerHTML = `
            <div class="loading-state" style="color: var(--danger-color);">
                <p>❌ 生成失败: ${error.message}</p>
                <button class="btn btn-primary" onclick="goToShortStoryStep(4)" style="margin-top: 1rem;">返回重试</button>
            </div>
        `;
        return false;
    }
}

// 显示最终结果
function displayShortStoryResult(data) {
    const content = document.getElementById('short-story-result');

    const totalWords = data.chapters ? data.chapters.reduce((sum, ch) => sum + (ch.word_count || 0), 0) : 0;
    const chapterCount = data.chapters ? data.chapters.length : 0;

    // 拼接全文
    let fullText = '';

    // 1. 添加标题
    fullText += `${data.title || '未命名'}\n\n`;

    // 2. 添加导语 (如有)
    if (data.intro) {
        fullText += `${data.intro}\n\n`;
    }

    // 3. 添加正文
    if (data.chapters && data.chapters.length > 0) {
        data.chapters.forEach(ch => {
            fullText += `${ch.title}\n\n${ch.content}\n\n`;
        });
    }

    // 导语 HTML
    let introHtml = '';
    if (data.intro) {
        introHtml = `
            <div style="background: linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(244, 114, 182, 0.1) 100%); padding: 1.5rem; border-radius: 12px; margin-bottom: 2rem; border-left: 4px solid #ec4899;">
                <h4 style="color: #be185d; margin-bottom: 0.5rem;">🔥 必读理由</h4>
                <p style="font-size: 1.1rem; line-height: 1.6; font-style: italic;">"${escapeHtml(data.intro)}"</p>
            </div>
        `;
    }

    content.innerHTML = `
        <div style="text-align: center; margin-bottom: 2rem;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">🎉</div>
            <h3 style="color: var(--success-color); margin-bottom: 1rem;">短故事生成完成!</h3>
            <p style="font-size: 1.2rem; font-weight: bold;">${escapeHtml(data.title || '未命名')}</p>
            <div style="display: flex; justify-content: center; gap: 2rem; margin-top: 1.5rem; color: var(--text-secondary);">
                <span>📚 ${chapterCount} 章</span>
                <span>📊 ${totalWords} 字</span>
                <span>🆔 项目ID: ${data.project_id}</span>
            </div>
        </div>

        ${introHtml}

        <div class="full-text-preview" style="background: var(--bg-secondary); border-radius: 12px; overflow: hidden; margin-bottom: 2rem; border: 1px solid var(--border-color);">
            <div style="padding: 1rem; background: var(--bg-tertiary); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                <h4 style="margin: 0;">📖 全文预览</h4>
                <button class="btn btn-sm btn-secondary" onclick="copyFullText(this)">📋 复制全文</button>
            </div>
            <div class="text-content" style="padding: 1.5rem; max-height: 500px; overflow-y: auto; white-space: pre-wrap; font-family: 'PingFang SC', system-ui;">${escapeHtml(fullText)}</div>
        </div>

        <div style="text-align: center;">
            <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
                您可以在"我的项目"标签页中查看和编辑这部短故事
            </p>
            <a href="/api/novel/export/${data.project_id}" class="btn btn-primary" target="_blank">
                📥 导出为Word文档
            </a>
        </div>
    `;
}

// 复制全文功能
function copyFullText(btn) {
    const textContent = document.querySelector('.full-text-preview .text-content').innerText;
    navigator.clipboard.writeText(textContent).then(() => {
        const originalText = btn.innerText;
        btn.innerText = '✅ 已复制';
        setTimeout(() => btn.innerText = originalText, 2000);
    }).catch(err => {
        console.error('复制失败:', err);
        alert('复制失败，请手动复制');
    });
}

// 导出短故事
function exportShortStory() {
    const data = shortStoryData.step5;
    if (data && data.project_id) {
        window.open(`/api/novel/export/${data.project_id}`, '_blank');
    }
}

// 重置并重新创作
function resetShortStory() {
    if (confirm('确定要重新开始创作吗?当前进度将丢失。')) {
        shortStoryData = { step1: {}, step2: {}, step3: {}, step4: {}, step5: {} };
        document.getElementById('short-story-form').reset();
        document.getElementById('short-story-step-2-actions').style.display = 'none';
        document.getElementById('short-story-step-3-actions').style.display = 'none';
        document.getElementById('short-story-step-4-actions').style.display = 'none';
        document.getElementById('short-story-step-5-actions').style.display = 'none';
        goToShortStoryStep(1);
    }
}

// 一键生成全书流程
// 一键生成全书流程 (支持批量)
async function startShortStoryOneClick() {
    // 1. 获取批量生成数量
    const countSelect = document.getElementById('short-story-count');
    const batchCount = countSelect ? parseInt(countSelect.value) : 1;

    // 2. 检查题材
    const genre = document.getElementById('short-story-genre').value;
    if (!genre) {
        alert('请选择题材类型');
        return;
    }

    isShortStoryOneClickMode = true;

    // 批量生成的数据存储
    const batchResults = [];
    const errors = [];

    // 循环生成
    for (let i = 1; i <= batchCount; i++) {
        showToast(`🚀 正在启动第 ${i}/${batchCount} 篇短故事生成...`, 'info');

        // 如果是第2篇及以上，重置一下数据状态，但保留Step1的用户设置
        if (i > 1) {
            shortStoryData.step2 = {};
            shortStoryData.step3 = {};
            shortStoryData.step4 = {};
            shortStoryData.step5 = {};
        }

        // Step 1: 生成设定
        // 修改: 为了避免重复，如果摘要为空，后端已有随机逻辑。
        // 我们只需调用函数，它会读取当前表单值。
        const success1 = await generateShortStorySettings();
        if (!success1) {
            errors.push(`第 ${i} 篇设定生成失败`);
            if (batchCount === 1) {
                isShortStoryOneClickMode = false;
                return;
            }
            continue;
        }

        // Step 2: 生成大纲
        showToast(`✅ 第 ${i}/${batchCount} 篇: 设定完成，生成大纲...`, 'info');
        await new Promise(r => setTimeout(r, 1000));
        const success2 = await generateShortStoryOutline();
        if (!success2) {
            errors.push(`第 ${i} 篇大纲生成失败`);
            if (batchCount === 1) {
                isShortStoryOneClickMode = false;
                return;
            }
            continue;
        }

        // Step 3: 生成章节
        showToast(`✅ 第 ${i}/${batchCount} 篇: 大纲完成，生成章节...`, 'info');
        await new Promise(r => setTimeout(r, 1000));
        const success3 = await generateShortStoryChapters();
        if (!success3) {
            errors.push(`第 ${i} 篇章节生成失败`);
            if (batchCount === 1) {
                isShortStoryOneClickMode = false;
                return;
            }
            continue;
        }

        // Step 4: 一键成文
        showToast(`✅ 第 ${i}/${batchCount} 篇: 章节完成，整合成文...`, 'info');
        await new Promise(r => setTimeout(r, 1000));
        const success4 = await generateShortStoryNovel();
        if (!success4) {
            errors.push(`第 ${i} 篇成文失败`);
            if (batchCount === 1) {
                isShortStoryOneClickMode = false;
                return;
            }
            continue;
        }

        // 保存结果
        if (shortStoryData.step5 && shortStoryData.step5.project_id) {
            batchResults.push(shortStoryData.step5);
        }

        // 稍微等待一下
        await new Promise(r => setTimeout(r, 1000));
    }

    isShortStoryOneClickMode = false;

    // 最终展示
    if (batchResults.length > 0) {
        if (batchCount > 1) {
            displayBatchResults(batchResults, errors);
            showToast(`🎉 批量生成完成！成功 ${batchResults.length}/${batchCount} 篇`, 'success');
        } else {
            // 单篇直接显示结果(generateShortStoryNovel里已经调用了displayShortStoryResult)
            showToast('🎉 短故事生成完成！', 'success');
        }
    } else {
        showToast('❌ 生成失败', 'error');
    }
}

// 显示批量生成结果
function displayBatchResults(results, errors) {
    const content = document.getElementById('short-story-result');

    let html = `
        <div style="text-align: center; margin-bottom: 2rem;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">📚</div>
            <h3 style="color: var(--success-color); margin-bottom: 1rem;">批量生成完成!</h3>
            <p>共成功生成 <strong>${results.length}</strong> 篇短故事</p>
        </div>
        
        <div class="batch-results-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
    `;

    results.forEach((navel, idx) => {
        html += `
            <div class="batch-card" style="background: var(--bg-secondary); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border-color);">
                 <h4 style="margin-bottom: 0.5rem; color: var(--primary-color);">#${idx + 1} ${escapeHtml(navel.title)}</h4>
                 <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem;">
                    字数: ${navel.chapters ? navel.chapters.reduce((sum, ch) => sum + (ch.word_count || 0), 0) : 0} | ID: ${navel.project_id}
                 </div>
                 <div style="display: flex; gap: 0.5rem;">
                    <a href="/api/novel/export/${navel.project_id}" class="btn btn-sm btn-primary" target="_blank">📥 导出</a>
                 </div>
            </div>
        `;
    });

    html += `</div>`;

    if (errors.length > 0) {
        html += `
            <div style="background: rgba(239, 68, 68, 0.1); padding: 1rem; border-radius: 8px; margin-top: 2rem;">
                <h4 style="color: var(--danger-color);">⚠️ 部分生成失败</h4>
                <ul style="margin-top: 0.5rem; padding-left: 1.5rem;">
                    ${errors.map(e => `<li>${e}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    html += `
        <div style="text-align: center; margin-top: 2rem;">
            <button class="btn btn-secondary" onclick="resetShortStory()">🔄 继续创作</button>
        </div>
    `;

    content.innerHTML = html;
}


// HTML转义函数 (如果不存在则定义)
if (typeof escapeHtml !== 'function') {
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
