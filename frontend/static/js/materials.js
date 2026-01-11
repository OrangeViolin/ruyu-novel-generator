// 参考素材库（写同款功能）
let currentMaterialId = null;

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否在素材库标签页
    const materialsTab = document.querySelector('[data-tab="materials"]');
    if (materialsTab) {
        materialsTab.addEventListener('click', function() {
            loadMaterials();
        });
    }

    // 初始化上传表单
    initUploadForm();

    // 不在页面加载时自动加载素材，等用户点击标签页再加载
    // loadMaterials();
});

// 初始化上传表单
function initUploadForm() {
    const form = document.getElementById('upload-material-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await uploadMaterial();
        });
    }

    // 文件选择变化时更新预览
    const fileInput = document.getElementById('material-file');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }

    // 初始化拖拽上传
    initDragDrop();
}

// 存储选中的文件
let selectedFiles = [];

// 初始化拖拽上传功能
function initDragDrop() {
    const dropZone = document.getElementById('drop-zone');
    if (!dropZone) return;

    // 阻止默认行为
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // 添加高亮效果
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    // 处理文件放置
    dropZone.addEventListener('drop', handleDrop, false);

    // 点击拖拽区域也可以触发文件选择
    dropZone.addEventListener('click', () => {
        document.getElementById('material-file').click();
    });
}

// 阻止默认行为
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// 高亮拖拽区域
function highlight() {
    const dropZone = document.getElementById('drop-zone');
    if (dropZone) {
        dropZone.classList.add('drag-over');
    }
}

// 取消高亮
function unhighlight() {
    const dropZone = document.getElementById('drop-zone');
    if (dropZone) {
        dropZone.classList.remove('drag-over');
    }
}

// 处理文件放置
function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;

    handleFiles(files);
}

// 处理文件选择（input change事件）
function handleFileSelect(e) {
    const files = e.target.files;
    handleFiles(files);
}

// 处理文件列表
function handleFiles(files) {
    const fileList = Array.from(files);

    // 过滤支持的文件类型
    const supportedExtensions = ['txt', 'docx', 'doc', 'pdf', 'xlsx', 'xls'];
    const validFiles = fileList.filter(file => {
        const ext = file.name.split('.').pop().toLowerCase();
        return supportedExtensions.includes(ext);
    });

    if (validFiles.length === 0) {
        showToast('请选择 .txt、.docx、.pdf、.xlsx 或 .xls 格式的文件');
        return;
    }

    if (validFiles.length < fileList.length) {
        showToast(`已跳过 ${fileList.length - validFiles.length} 个不支持的文件`);
    }

    // 添加到选中文件列表（避免重复）
    validFiles.forEach(file => {
        const exists = selectedFiles.some(f => f.name === file.name && f.size === file.size);
        if (!exists) {
            selectedFiles.push(file);
        }
    });

    // 更新文件输入框
    updateFileInput();

    // 显示预览
    showFilesPreview();
}

// 更新文件输入框
function updateFileInput() {
    const fileInput = document.getElementById('material-file');

    // 创建新的 DataTransfer 对象
    const dataTransfer = new DataTransfer();

    // 添加所有选中的文件
    selectedFiles.forEach(file => {
        dataTransfer.items.add(file);
    });

    // 更新 input.files
    fileInput.files = dataTransfer.files;
}

// 显示文件预览
function showFilesPreview() {
    const previewContainer = document.getElementById('selected-files-list');
    const filesPreview = document.getElementById('files-preview');
    const fileCount = document.getElementById('file-count');

    if (!previewContainer || !filesPreview || !fileCount) return;

    if (selectedFiles.length === 0) {
        previewContainer.style.display = 'none';
        return;
    }

    // 更新文件数量
    fileCount.textContent = selectedFiles.length;

    // 生成文件预览列表
    let html = '<div class="files-grid">';
    selectedFiles.forEach((file, index) => {
        const ext = file.name.split('.').pop().toLowerCase();
        const size = formatFileSize(file.size);

        html += `
            <div class="file-preview-item">
                <span class="file-icon">${getFileIcon(ext)}</span>
                <div class="file-info">
                    <div class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
                    <div class="file-meta">${size}</div>
                </div>
                <button class="file-remove" onclick="removeFile(${index})" title="移除">✕</button>
            </div>
        `;
    });
    html += '</div>';

    filesPreview.innerHTML = html;
    previewContainer.style.display = 'block';

    // 隐藏拖拽区域（可选）
    const dropZone = document.getElementById('drop-zone');
    if (dropZone) {
        dropZone.style.display = 'none';
    }
}

// 获取文件图标
function getFileIcon(ext) {
    const iconMap = {
        'txt': '📄',
        'doc': '📝',
        'docx': '📝',
        'pdf': '📕',
        'xlsx': '📊',
        'xls': '📊'
    };
    return iconMap[ext] || '📄';
}

// 移除单个文件
function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateFileInput();
    showFilesPreview();

    // 如果没有文件了，显示拖拽区域
    if (selectedFiles.length === 0) {
        const dropZone = document.getElementById('drop-zone');
        if (dropZone) {
            dropZone.style.display = 'block';
        }
    }
}

// 清空所有选中的文件
function clearSelectedFiles() {
    selectedFiles = [];
    const fileInput = document.getElementById('material-file');

    // 清空 input
    const dataTransfer = new DataTransfer();
    fileInput.files = dataTransfer.files;

    // 隐藏预览
    const previewContainer = document.getElementById('selected-files-list');
    if (previewContainer) {
        previewContainer.style.display = 'none';
    }

    // 显示拖拽区域
    const dropZone = document.getElementById('drop-zone');
    if (dropZone) {
        dropZone.style.display = 'block';
    }
}

// 显示文件夹上传帮助
function showFolderUploadHelp() {
    const helpContent = `
        <div class="folder-upload-help">
            <h4>📂 文件夹上传指南</h4>
            <div class="help-section">
                <h5>💻 Windows 用户：</h5>
                <ol>
                    <li>打开文件资源管理器，找到包含小说文件的文件夹</li>
                    <li>选中所有要上传的文件（Ctrl+A 或手动多选）</li>
                    <li>拖拽选中的文件到上传区域</li>
                </ol>
            </div>
            <div class="help-section">
                <h5>🍎 Mac 用户：</h5>
                <ol>
                    <li>打开 Finder，找到包含小说文件的文件夹</li>
                    <li>选中所有要上传的文件（Cmd+A 或手动多选）</li>
                    <li>拖拽选中的文件到上传区域</li>
                </ol>
            </div>
            <div class="help-section">
                <h5>💡 最佳实践：</h5>
                <ul>
                    <li>一次最多选择 50 个文件</li>
                    <li>确保文件名清晰（如《书名》-导语.txt）</li>
                    <li>支持的格式：.txt、.docx、.pdf、.xlsx、.xls</li>
                    <li>可以先按类型分批上传（导语、大纲、拆解笔记）</li>
                    <li>Excel 文件会提取所有工作表的内容</li>
                </ul>
            </div>
            <div class="help-tip">
                <p>📌 <strong>提示：</strong>拖拽文件后，可以在预览中查看所有选中的文件，也可以移除不需要的文件。</p>
            </div>
        </div>
    `;

    // 使用现有的 modal 显示帮助
    const container = document.getElementById('material-detail-content');
    if (container) {
        container.innerHTML = helpContent;

        // 隐藏标题
        const title = document.getElementById('material-detail-title');
        if (title) title.textContent = '批量上传帮助';

        // 显示模态框
        const modal = document.getElementById('material-detail-modal');
        if (modal) modal.style.display = 'block';
    }
}

// 加载素材列表
async function loadMaterials() {
    const contentTypeSelect = document.getElementById('filter-content-type');
    const genreSelect = document.getElementById('filter-genre');
    const grid = document.getElementById('materials-grid');

    // 检查元素是否存在
    if (!grid) {
        console.log('素材库面板未显示，跳过加载');
        return;
    }

    const contentType = contentTypeSelect ? contentTypeSelect.value : '';
    const genre = genreSelect ? genreSelect.value : '';

    try {
        let url = '/api/materials?';
        if (contentType) url += `content_type=${contentType}&`;
        if (genre) url += `genre=${genre}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.success && data.materials.length > 0) {
            grid.innerHTML = data.materials.map(material => `
                <div class="material-card">
                    <div class="material-header">
                        <h4>${material.title}</h4>
                        <span class="status-badge ${material.status}">${getStatusText(material.status)}</span>
                    </div>
                    <div class="material-body">
                        <p class="material-meta">
                            ${material.author ? `<span>👤 ${material.author}</span>` : ''}
                            ${material.source ? `<span>📖 ${material.source}</span>` : ''}
                            ${material.genre ? `<span>🏷️ ${material.genre}</span>` : ''}
                        </p>
                        <div class="material-tags">
                            ${(material.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                        ${material.core_conflict ? `<p class="material-conflict"><strong>核心冲突：</strong>${material.core_conflict.substring(0, 50)}...</p>` : ''}
                        ${material.emotion_style ? `<p class="material-emotion"><strong>情绪：</strong>${material.emotion_style}</p>` : ''}
                    </div>
                    <div class="material-footer">
                        <span class="material-stats">👁️ ${material.usage_count || 0}</span>
                        <button class="btn btn-sm btn-primary" onclick="viewMaterialDetail(${material.id})">查看</button>
                        ${material.status === 'completed' ? `<button class="btn btn-sm" onclick="writeSimilar(${material.id})">写同款</button>` : ''}
                    </div>
                </div>
            `).join('');
        } else {
            grid.innerHTML = '<p class="empty-state">暂无素材，点击上方按钮上传</p>';
        }
    } catch (error) {
        console.error('加载素材失败:', error);
        const grid = document.getElementById('materials-grid');
        if (grid) grid.innerHTML = '<p class="empty-state">加载失败，请刷新重试</p>';
    }
}

// 获取状态文本
function getStatusText(status) {
    const statusMap = {
        'pending': '待分析',
        'analyzing': '分析中',
        'completed': '已完成',
        'failed': '分析失败'
    };
    return statusMap[status] || status;
}

// 显示上传模态框
function showUploadModal() {
    const modal = document.getElementById('upload-material-modal');
    if (modal) modal.style.display = 'block';
}

// 上传素材
async function uploadMaterial() {
    const title = document.getElementById('material-title').value;
    const author = document.getElementById('material-author').value;
    const source = document.getElementById('material-source').value;
    const contentType = document.getElementById('material-content-type').value;
    const fileInput = document.getElementById('material-file');
    const notes = document.getElementById('material-notes').value;

    if (!fileInput.files.length) {
        showToast('请选择文件');
        return;
    }

    const files = Array.from(fileInput.files);
    const totalFiles = files.length;

    // 批量上传处理
    let successCount = 0;
    let failCount = 0;
    const results = [];

    // 显示进度
    showToast(`正在上传 ${totalFiles} 个文件...`);

    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // 从文件名提取标题（如果没有填写标题）
        const fileTitle = title || file.name.replace(/\.[^/.]+$/, '');

        const formData = new FormData();
        formData.append('title', fileTitle);
        if (author) formData.append('author', author);
        if (source) formData.append('source', source);
        formData.append('content_type', contentType);
        formData.append('file', file);
        if (notes) formData.append('notes', notes);

        try {
            const response = await fetch('/api/materials/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                successCount++;
                results.push({
                    file: file.name,
                    status: 'success',
                    id: result.material_id
                });
            } else {
                failCount++;
                results.push({
                    file: file.name,
                    status: 'failed',
                    error: result.message || '未知错误'
                });
            }
        } catch (error) {
            failCount++;
            results.push({
                file: file.name,
                status: 'failed',
                error: error.message
            });
        }

        // 更新进度提示
        if (i < files.length - 1) {
            showToast(`正在上传... (${i + 1}/${totalFiles})`);
        }
    }

    // 显示结果
    if (successCount === totalFiles) {
        showToast(`✅ 全部 ${totalFiles} 个文件上传成功！AI正在分析中...`);
        closeModal('upload-material-modal');
        document.getElementById('upload-material-form').reset();
        selectedFiles = []; // 清空文件列表
        setTimeout(() => loadMaterials(), 2000);
    } else if (successCount > 0) {
        showToast(`⚠️ 成功 ${successCount}/${totalFiles}，失败 ${failCount}/${totalFiles}`);
        // 显示详细结果
        showUploadResults(results);
        document.getElementById('upload-material-form').reset();
        selectedFiles = []; // 清空文件列表
        setTimeout(() => loadMaterials(), 2000);
    } else {
        showToast(`❌ 全部上传失败，请检查文件格式`);
        showUploadResults(results);
        selectedFiles = []; // 清空文件列表
    }
}

// 显示上传结果详情
function showUploadResults(results) {
    const container = document.getElementById('material-detail-content');
    if (!container) return;

    let html = '<div class="upload-results">';
    html += '<h4>📊 上传结果详情</h4>';
    html += '<div class="results-list">';

    results.forEach(result => {
        if (result.status === 'success') {
            html += `
                <div class="result-item success">
                    <span class="result-icon">✅</span>
                    <span class="result-name">${result.file}</span>
                    <span class="result-status">成功</span>
                </div>
            `;
        } else {
            html += `
                <div class="result-item failed">
                    <span class="result-icon">❌</span>
                    <span class="result-name">${result.file}</span>
                    <span class="result-error">${result.error}</span>
                </div>
            `;
        }
    });

    html += '</div></div>';

    container.innerHTML = html;

    // 显示模态框
    const modal = document.getElementById('material-detail-modal');
    if (modal) modal.style.display = 'block';
}

// 查看素材详情
async function viewMaterialDetail(materialId) {
    try {
        const response = await fetch(`/api/materials/${materialId}`);
        const data = await response.json();

        if (!data.success) {
            showToast('获取素材详情失败');
            return;
        }

        currentMaterialId = materialId;
        const material = data.material;

        // 设置标题
        document.getElementById('material-detail-title').textContent = material.title;

        // 生成详情内容
        let html = '<div class="material-detail">';

        // 基本信息
        html += '<div class="detail-section">';
        html += '<h4>📋 基本信息</h4>';
        html += `<p><strong>作者：</strong>${material.author || '未知'}</p>`;
        html += `<p><strong>来源：</strong>${material.source || '未知'}</p>`;
        html += `<p><strong>类型：</strong>${getContentTypeText(material.content_type)}</p>`;
        html += `<p><strong>文件类型：</strong>${material.file_type?.toUpperCase() || '未知'}</p>`;
        html += `<p><strong>文件大小：</strong>${formatFileSize(material.file_size)}</p>`;
        html += `<p><strong>状态：</strong>${getStatusText(material.status)}</p>`;
        html += '</div>';

        // AI分析结果
        if (material.status === 'completed' && material.analysis) {
            html += '<div class="detail-section">';
            html += '<h4>🤖 AI分析结果</h4>';
            html += `<p><strong>题材：</strong>${material.genre || '未知'}</p>`;
            html += `<p><strong>核心冲突：</strong>${material.core_conflict || '未知'}</p>`;
            html += `<p><strong>情绪风格：</strong>${material.emotion_style || '未知'}</p>`;
            html += `<p><strong>写作风格：</strong>${material.writing_style || '未知'}</p>`;

            // 标签
            if (material.tags && material.tags.length > 0) {
                html += '<p><strong>标签：</strong>';
                html += material.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ');
                html += '</p>';
            }

            // 人物
            if (material.characters_extracted && material.characters_extracted.length > 0) {
                html += '<p><strong>人物：</strong></p><ul>';
                material.characters_extracted.forEach(char => {
                    html += `<li><strong>${char.name}</strong>（${char.role}）`;
                    if (char.traits && char.traits.length > 0) {
                        html += ` - ${char.traits.join('、')}`;
                    }
                    html += '</li>';
                });
                html += '</ul>';
            }

            html += '</div>';
        } else if (material.status === 'analyzing') {
            html += '<div class="detail-section">';
            html += '<p class="analyzing-status">🔄 AI正在分析中，请稍候...</p>';
            html += '</div>';
        } else if (material.status === 'failed') {
            html += '<div class="detail-section">';
            html += '<p class="error-status">❌ 分析失败，请重新上传或检查文件格式</p>';
            html += '</div>';
        }

        // 原文预览
        if (material.raw_content) {
            html += '<div class="detail-section">';
            html += '<h4>📄 内容预览</h4>';
            html += `<pre class="content-preview">${escapeHtml(material.raw_content.substring(0, 1000))}${material.raw_content.length > 1000 ? '...' : ''}</pre>`;
            html += '</div>';
        }

        html += '</div>';

        document.getElementById('material-detail-content').innerHTML = html;

        // 显示模态框
        const modal = document.getElementById('material-detail-modal');
        if (modal) modal.style.display = 'block';

    } catch (error) {
        console.error('获取素材详情失败:', error);
        showToast('加载失败，请重试');
    }
}

// 获取内容类型文本
function getContentTypeText(contentType) {
    const typeMap = {
        'intro': '导语',
        'outline': '大纲',
        'analysis': '拆解笔记',
        'full': '完整小说'
    };
    return typeMap[contentType] || contentType;
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (!bytes) return '未知';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
}

// 写同款
async function writeSimilar(materialId) {
    try {
        showToast('AI正在生成同款作品，请稍候...');

        const response = await fetch(`/api/materials/${materialId}/write-similar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();

        if (result.success) {
            // 显示生成结果
            const content = `
                <div class="similar-result">
                    <h4>参考作品：${result.reference_title}</h4>
                    <div class="result-content">
                        <pre>${escapeHtml(result.content)}</pre>
                    </div>
                    <div class="result-actions">
                        <button class="btn btn-primary" onclick="copyTextContent('${escapeHtml(result.content).replace(/'/g, "\\'")}')">📋 复制</button>
                        <button class="btn btn-secondary" onclick="closeModal('material-detail-modal')">关闭</button>
                    </div>
                </div>
            `;

            document.getElementById('material-detail-content').innerHTML = content;
        } else {
            showToast('生成失败，请重试');
        }
    } catch (error) {
        console.error('写同款失败:', error);
        showToast('生成失败，请重试');
    }
}

// 从详情页写同款
function writeSimilarFromDetail() {
    if (currentMaterialId) {
        writeSimilar(currentMaterialId);
    }
}

// 查找相似素材
async function findSimilar(materialId) {
    try {
        const response = await fetch(`/api/materials/${materialId}/similar?limit=5`);
        const result = await response.json();

        if (result.success && result.similar_materials.length > 0) {
            let html = '<div class="similar-materials">';
            html += '<h4>🔍 相似素材推荐</h4>';
            html += '<div class="similar-list">';

            result.similar_materials.forEach(m => {
                html += `
                    <div class="similar-item">
                        <h5>${m.title}</h5>
                        <p>${m.author || '未知作者'} | ${m.genre || '未知题材'}</p>
                        <div class="similar-tags">
                            ${(m.tags || []).map(tag => `<span class="tag">${tag}</span>`).join(' ')}
                        </div>
                        <button class="btn btn-sm" onclick="viewMaterialDetail(${m.id}); closeModal('material-detail-modal');">查看</button>
                    </div>
                `;
            });

            html += '</div></div>';

            // 添加到详情内容
            const contentDiv = document.getElementById('material-detail-content');
            contentDiv.innerHTML += html;
        } else {
            showToast('未找到相似素材');
        }
    } catch (error) {
        console.error('查找相似素材失败:', error);
        showToast('查找失败，请重试');
    }
}

// 从详情页查找相似
function findSimilarFromDetail() {
    if (currentMaterialId) {
        findSimilar(currentMaterialId);
    }
}

// HTML转义
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 复制文本内容
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
    showToast('已复制到剪贴板');
}
