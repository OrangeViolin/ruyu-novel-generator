// 长篇小说管理 JS
// 与 short-story.js 配合使用

let currentLongProject = null;
let currentLongChapter = null;
let outlinePreviewData = null; // 存储大纲预览数据

// ==================== 入口与视图切换 ====================

// 入口：显示长篇管理 (列表视图)
async function showLongNovelManagement() {
    showLongNovelList();
}

function showLongNovelList() {
    document.getElementById('long-novel-list-view').style.display = 'block';
    document.getElementById('long-novel-board-view').style.display = 'none';
    loadLongNovelList();
}

// ==================== 项目列表 ====================

// 加载长篇项目列表
async function loadLongNovelList() {
    const listContainer = document.getElementById('long-novel-list');
    listContainer.innerHTML = '<tr><td colspan="5" style="text-align: center;">⏳ 加载中...</td></tr>';

    try {
        const response = await fetch('/api/novel/projects');
        const result = await response.json();

        if (result.projects) {
            let html = '';
            result.projects.forEach(p => {
                const isLong = p.type === 'long_novel';
                html += `
                    <tr>
                        <td>${escapeHtml(p.name)} <span class="badge" style="background: ${isLong ? '#8b5cf6' : '#6366f1'}; font-size: 0.7rem;">${isLong ? '长篇' : '短篇'}</span></td>
                        <td>${p.status}</td>
                        <td>${p.word_count} 字</td>
                        <td>
                             ${isLong ?
                        `<button class="btn btn-sm btn-primary" onclick="openLongNovelBoard(${p.id})">📂 打开创作台</button>` :
                        `<button class="btn btn-sm btn-secondary" onclick="alert('这是短篇项目，请从历史稿件列表中选择并扩展为长篇')">📝 短篇项目</button>`
                    }
                        </td>
                    </tr>
                `;
            });
            listContainer.innerHTML = html;
        }
    } catch (e) {
        listContainer.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">加载失败</td></tr>`;
    }
}

// ==================== 从短篇创建长篇项目 ====================

// 从短篇扩展为长篇 - 带预览功能
async function createLongNovelFromManuscript(manuscriptId, title) {
    // 先显示预览，让用户确认
    showToast('正在生成大纲预览，请稍候...', 'info');

    try {
        // 第一步：获取大纲预览
        const previewResponse = await fetch('/api/long-novel/preview-outline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ manuscript_id: manuscriptId, title: title + " (长篇版)" })
        });
        const previewResult = await previewResponse.json();

        if (!previewResult.success) {
            alert('预览生成失败: ' + previewResult.message);
            return;
        }

        outlinePreviewData = previewResult.data;

        // 显示预览模态框
        showOutlinePreviewModal(outlinePreviewData, manuscriptId, title);

    } catch (e) {
        console.error(e);
        alert('预览生成失败');
    }
}

// 显示大纲预览模态框
function showOutlinePreviewModal(previewData, manuscriptId, originalTitle) {
    // 创建模态框
    const modalHtml = `
        <div id="outline-preview-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000;">
            <div style="position: relative; width: 90%; max-width: 1000px; height: 85vh; margin: 7.5vh auto; background: white; border-radius: 8px; display: flex; flex-direction: column;">
                <!-- 头部 -->
                <div style="padding: 1.5rem; border-bottom: 1px solid #e5e7eb; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px 8px 0 0;">
                    <h2 style="margin: 0; font-size: 1.5rem;">📚 长篇扩写大纲预览</h2>
                    <p style="margin: 0.5rem 0 0 0; opacity: 0.9;">
                        原作：《${escapeHtml(originalTitle)}》 → 长篇：《${escapeHtml(previewData.manuscript_title)} (长篇版)》
                    </p>
                </div>

                <!-- 统计信息 -->
                <div style="padding: 1rem; background: #f9fafb; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-around;">
                    <div style="text-align: center;">
                        <div style="font-size: 2rem; font-weight: bold; color: #667eea;">${previewData.total_chapters}</div>
                        <div style="font-size: 0.8rem; color: #6b7280;">目标章节数</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 2rem; font-weight: bold; color: #764ba2;">${previewData.total_volumes}</div>
                        <div style="font-size: 0.8rem; color: #6b7280;">卷数</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 2rem; font-weight: bold; color: #8b5cf6;">${Math.round(previewData.estimated_word_count / 10000)}</div>
                        <div style="font-size: 0.8rem; color: #6b7280;">预估字数(万)</div>
                    </div>
                </div>

                <!-- 内容区域 -->
                <div style="flex: 1; overflow-y: auto; padding: 1.5rem;">
                    ${renderPreviewVolumes(previewData.volumes)}
                </div>

                <!-- 底部按钮 -->
                <div style="padding: 1rem; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 1rem;">
                    <button class="btn btn-secondary" onclick="closeOutlinePreviewModal()">取消</button>
                    <button class="btn btn-primary" onclick="confirmCreateLongProject(${manuscriptId}, '${escapeHtml(originalTitle)}')" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none;">
                        ✅ 确认并创建长篇项目
                    </button>
                </div>
            </div>
        </div>
    `;

    // 移除旧的模态框
    const oldModal = document.getElementById('outline-preview-modal');
    if (oldModal) oldModal.remove();

    // 添加新模态框
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('outline-preview-modal').style.display = 'block';
}

// 渲染预览卷列表
function renderPreviewVolumes(volumes) {
    let html = '';
    volumes.forEach(vol => {
        html += `
            <div style="margin-bottom: 2rem; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <div style="padding: 1rem; background: #f3f4f6; border-bottom: 1px solid #e5e7eb;">
                    <h3 style="margin: 0; color: #4f46e5;">
                        📖 第${vol.volume_number}卷: ${escapeHtml(vol.volume_title || vol.source_chapter_title)}
                    </h3>
                    <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; color: #6b7280;">
                        章节: ${vol.chapter_range_start}-${vol.chapter_range_end} (${vol.target_chapter_count}章)
                    </p>
                    <p style="margin: 0.5rem 0 0 0; font-size: 0.85rem; color: #9ca3af;">
                        ${escapeHtml(vol.volume_summary || '暂无摘要')}
                    </p>
                </div>
                <div style="padding: 1rem;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.5rem;">
        `;

        if (vol.chapters && vol.chapters.length > 0) {
            vol.chapters.forEach(ch => {
                html += `
                    <div style="padding: 0.5rem; background: #f9fafb; border-radius: 4px; font-size: 0.8rem;">
                        <div style="font-weight: bold; color: #374151;">${escapeHtml(ch.title)}</div>
                        <div style="color: #6b7280; margin-top: 0.25rem;">
                            ${escapeHtml(ch.summary || '').substring(0, 80)}...
                        </div>
                    </div>
                `;
            });
        } else {
            html += '<div style="color: #9ca3af; padding: 1rem;">暂无章节详情</div>';
        }

        html += `
                    </div>
                </div>
            </div>
        `;
    });
    return html;
}

// 关闭预览模态框
function closeOutlinePreviewModal() {
    const modal = document.getElementById('outline-preview-modal');
    if (modal) modal.remove();
    outlinePreviewData = null;
}

// 确认创建长篇项目
async function confirmCreateLongProject(manuscriptId, originalTitle) {
    closeOutlinePreviewModal();

    try {
        const response = await fetch('/api/long-novel/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                manuscript_id: manuscriptId,
                title: originalTitle + " (长篇版)"
            })
        });
        const result = await response.json();

        if (result.success) {
            showToast('长篇项目创建成功！');
            switchTab('long-novel');
            showLongNovelList();
        } else {
            alert('创建失败: ' + result.message);
        }
    } catch (e) {
        alert('网络请求失败');
    }
}

// ==================== 创作台 ====================

// 打开长篇创作台
async function openLongNovelBoard(projectId) {
    try {
        const response = await fetch(`/api/long-novel/${projectId}`);
        const result = await response.json();

        if (!result.success) {
            alert(result.message || '加载项目失败');
            return;
        }

        currentLongProject = result.data;

        // 切换视图为创作台
        document.getElementById('long-novel-list-view').style.display = 'none';
        document.getElementById('long-novel-board-view').style.display = 'flex';
        document.getElementById('long-novel-title-detail').textContent = currentLongProject.project.name;

        renderLongNovelTOC();
    } catch (e) {
        console.error(e);
        alert('加载失败');
    }
}

function closeLongNovelModal() {
    showLongNovelList();
}

// ==================== 目录管理 ====================

// 渲染目录
function renderLongNovelTOC() {
    const container = document.getElementById('long-novel-toc');
    const volumes = currentLongProject.volumes || [];

    let html = '';

    if (volumes.length === 0) {
        html = '<div style="padding:1rem; color:#999; text-align: center;">暂无卷章<br><br>点击下方"扩展下一卷"开始创作</div>';
    } else {
        volumes.forEach(vol => {
            html += `
                <div class="toc-volume" style="margin-bottom: 0.5rem;">
                    <div class="volume-header" style="padding: 0.75rem 1rem; background: linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%); font-weight: bold; font-size: 0.9rem; display: flex; align-items: center;">
                        <input type="checkbox" class="vol-checkbox" onchange="toggleVolumeSelection(${vol.volume_number}, this)" style="margin-right: 0.5rem; cursor: pointer;">
                        <span style="flex: 1;">卷${vol.volume_number}: ${escapeHtml(vol.title)}</span>
                        <span style="font-size: 0.75rem; color: #6b7280;">${vol.chapters ? vol.chapters.length : 0}章</span>
                    </div>
                    <div class="volume-chapters" style="background: white;">
            `;

            if (vol.chapters && vol.chapters.length > 0) {
                vol.chapters.forEach(ch => {
                    const statusColor = ch.status === 'completed' ? '#10b981' : (ch.status === 'generating' ? '#f59e0b' : '#d1d5db');
                    html += `
                        <div class="toc-chapter-item" onclick="loadLongChapter(${ch.id}, this)" style="padding: 0.5rem 1rem; cursor: pointer; border-bottom: 1px solid #f3f4f6; font-size: 0.85rem; display: flex; align-items: center; transition: background 0.2s;">
                            <input type="checkbox" class="ch-checkbox"
                                data-id="${ch.id}" data-vol="${vol.volume_number}"
                                onclick="handleCheckboxClick(event); event.stopPropagation()"
                                style="margin-right: 0.5rem; cursor: pointer;">
                            <span style="color: ${statusColor}; margin-right: 6px; font-size: 0.7rem;">●</span>
                            <span style="flex: 1;">${escapeHtml(ch.title)}</span>
                            <span style="font-size: 0.7rem; color: #9ca3af;">${ch.word_count || 0}字</span>
                        </div>
                    `;
                });
            } else {
                html += '<div style="padding:0.5rem 1rem; color:#999; font-size:0.8rem;">尚未扩展...</div>';
            }

            html += `</div></div>`;
        });
    }

    container.innerHTML = html;
}

// 扩展下一卷
async function expandNextVolume() {
    const volumes = currentLongProject.volumes || [];
    const nextIndex = volumes.length;

    const btn = document.querySelector('.long-novel-sidebar .btn-primary');
    if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '⏳ 正在扩展...';
        btn.disabled = true;

        try {
            const response = await fetch('/api/long-novel/expand-volume', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_id: currentLongProject.project.id,
                    chapter_index: nextIndex
                })
            });

            const result = await response.json();
            if (result.success) {
                showToast(`卷${result.data.volume_number}扩展成功，共${result.data.num_chapters}章！`);
                await openLongNovelBoard(currentLongProject.project.id);
            } else {
                alert('扩展失败: ' + result.message);
            }
        } catch (e) {
            alert('请求失败');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}

// ==================== 章节操作 ====================

// 加载章节内容
async function loadLongChapter(chapterId, element) {
    // 高亮选中
    document.querySelectorAll('.toc-chapter-item').forEach(el => el.style.background = 'transparent');
    if (element) element.style.background = '#e5e7eb';

    // 从本地数据查找章节信息
    let chapter = null;
    let volume = null;

    for (const v of currentLongProject.volumes) {
        const found = v.chapters.find(c => c.id === chapterId);
        if (found) {
            chapter = found;
            volume = v;
            break;
        }
    }

    if (!chapter) return;
    currentLongChapter = chapter;

    // 更新UI
    document.getElementById('current-chapter-title').textContent = `第${chapter.chapter_number}章: ${chapter.title}`;
    document.getElementById('current-chapter-content-display').textContent = chapter.content || '';
    document.getElementById('current-chapter-summary').textContent = chapter.summary || '暂无';

    // 显示详细冲突与情绪信息
    const conflictContainer = document.getElementById('current-chapter-conflict');
    if (conflictContainer) {
        conflictContainer.innerHTML = `
            <div style="margin-bottom:12px;">
                <div style="font-weight:bold; color:#4f46e5; font-size:0.85rem;">⚡ 主要矛盾:</div>
                <div style="font-size:0.85rem; color:#4b5563; margin-top:2px;">${chapter.main_conflict || '未设定'}</div>
            </div>
            <div style="margin-bottom:12px;">
                <div style="font-weight:bold; color:#10b981; font-size:0.85rem;">⛓️ 次要矛盾:</div>
                <div style="font-size:0.85rem; color:#4b5563; margin-top:2px;">${chapter.sub_conflict || '未设定'}</div>
            </div>
            <div style="margin-bottom:12px;">
                <div style="font-weight:bold; color:#f59e0b; font-size:0.85rem;">📈 情绪路径:</div>
                <div style="font-size:0.85rem; color:#4b5563; margin-top:2px;">${chapter.emotion_arc || '未设定'}</div>
            </div>
        `;
    }
}

// 生成章节正文
async function generateLongChapter() {
    if (!currentLongChapter) {
        alert('请先选择一个章节');
        return;
    }

    if (currentLongChapter.content && !confirm('本章已有内容，确定要重新生成吗？')) {
        return;
    }

    const editor = document.getElementById('current-chapter-content-display');
    editor.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6b7280;">🤖 AI正在撰写中...<br><br>预计需要 1-2 分钟<br><span style="font-size: 0.8rem;">(细腻的文笔需要时间打磨)</span></div>';

    try {
        const response = await fetch('/api/long-novel/generate-chapter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project_id: currentLongProject.project.id,
                chapter_id: currentLongChapter.id
            })
        });

        const result = await response.json();
        if (result.success) {
            currentLongChapter.content = result.data.content;
            currentLongChapter.status = 'completed';
            currentLongChapter.word_count = result.data.word_count;
            editor.textContent = result.data.content;
            renderLongNovelTOC();
            showToast('章节生成成功！');
        } else {
            editor.textContent = '生成失败: ' + result.message;
        }
    } catch (e) {
        editor.textContent = '网络请求失败';
    }
}

// 保存章节
async function saveLongChapter() {
    if (!currentLongChapter) return;

    const content = document.getElementById('current-chapter-content-display').textContent;

    try {
        const response = await fetch('/api/novel/chapter', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project_id: currentLongProject.project.id,
                chapter_id: currentLongChapter.id,
                content: content
            })
        });
        const result = await response.json();
        if (result.success) {
            showToast('保存成功');
            currentLongChapter.content = content;
        } else {
            alert('保存失败');
        }
    } catch (e) {
        alert('保存出错');
    }
}

// ==================== 视图切换 ====================

// 切换浏览模式
function switchLongNovelMode(mode) {
    const chapterView = document.getElementById('long-novel-chapter-view');
    const fulltextView = document.getElementById('long-novel-fulltext-view');
    const chapterBtn = document.getElementById('mode-chapter');
    const fulltextBtn = document.getElementById('mode-fulltext');

    if (mode === 'fulltext') {
        chapterView.style.display = 'none';
        fulltextView.style.display = 'flex';
        chapterBtn.classList.remove('active');
        chapterBtn.style.background = 'transparent';
        fulltextBtn.classList.add('active');
        fulltextBtn.style.background = 'white';
        fulltextBtn.style.borderRadius = '4px';
        loadFullText();
    } else {
        chapterView.style.display = 'flex';
        fulltextView.style.display = 'none';
        fulltextBtn.classList.remove('active');
        fulltextBtn.style.background = 'transparent';
        chapterBtn.classList.add('active');
        chapterBtn.style.background = 'white';
        chapterBtn.style.borderRadius = '4px';
    }
}

// 加载全文
function loadFullText() {
    const container = document.getElementById('long-novel-fulltext-content');
    const volumes = currentLongProject.volumes || [];

    if (volumes.length === 0) {
        container.innerHTML = '<p style="color:#999; text-align: center; padding: 2rem;">暂无内容</p>';
        return;
    }

    let html = '';
    volumes.forEach(vol => {
        html += `<h2 style="text-align:center; margin: 2rem 0 1rem 0; color: #1e1b4b; padding-bottom: 1rem; border-bottom: 2px solid #e0e7ff;">卷${vol.volume_number}: ${escapeHtml(vol.title)}</h2>`;
        vol.chapters.forEach(ch => {
            html += `
                <div class="fulltext-chapter" style="margin-bottom: 2rem;">
                    <h3 style="margin-bottom: 1rem; color: #4338ca; font-size: 1.2rem;">第${ch.chapter_number}章: ${escapeHtml(ch.title)}</h3>
                    <div style="white-space: pre-wrap; font-size: 1rem; line-height: 2; color: #374151;">${ch.content ? escapeHtml(ch.content) : '<p style="color:#9ca3af;">(本章尚未生成正文)</p>'}</div>
                </div>
            `;
        });
    });

    container.innerHTML = html;
}

// ==================== 批量操作 ====================

// 批量复制选中章节
function copySelectedChapters() {
    const checkboxes = document.querySelectorAll('.ch-checkbox:checked');
    if (checkboxes.length === 0) {
        alert('请先勾选要复制的章节');
        return;
    }

    let text = '';
    let currentVol = null;

    checkboxes.forEach(cb => {
        const chId = parseInt(cb.getAttribute('data-id'));
        for (const vol of currentLongProject.volumes) {
            const ch = vol.chapters.find(c => c.id === chId);
            if (ch) {
                // 添加卷标题（如果换了卷）
                if (currentVol !== vol.volume_number) {
                    currentVol = vol.volume_number;
                    text += `\n${'='.repeat(50)}\n`;
                    text += `卷${vol.volume_number}: ${vol.title}\n`;
                    text += `${'='.repeat(50)}\n\n`;
                }
                text += `第${ch.chapter_number}章: ${ch.title}\n\n`;
                text += (ch.content || '(无内容)') + '\n\n' + '-'.repeat(30) + '\n\n';
                break;
            }
        }
    });

    copyToClipboard(text);
    showToast(`已复制选中的 ${checkboxes.length} 个章节`);
}

// 复制全书
function copyAllLongNovel() {
    const container = document.getElementById('long-novel-fulltext-content');
    const text = container.innerText || container.textContent;
    copyToClipboard(text);
    showToast('全书内容已复制到剪贴板');
}

// 辅助：全选某卷
function toggleVolumeSelection(volNum, checkbox) {
    const chCheckboxes = document.querySelectorAll(`.ch-checkbox[data-vol="${volNum}"]`);
    chCheckboxes.forEach(cb => cb.checked = checkbox.checked);
}

// 辅助：复制到剪贴板
function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}

// 辅助：Shift+Click 批量勾选逻辑
let lastChecked = null;
function handleCheckboxClick(e) {
    const checkboxes = Array.from(document.querySelectorAll('.ch-checkbox'));
    if (!lastChecked) {
        lastChecked = e.target;
        return;
    }

    if (e.shiftKey) {
        let start = checkboxes.indexOf(e.target);
        let end = checkboxes.indexOf(lastChecked);
        checkboxes.slice(Math.min(start, end), Math.max(start, end) + 1)
            .forEach(cb => cb.checked = lastChecked.checked);
    }

    lastChecked = e.target;
}

// ==================== 工具函数 ====================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
