// 仿写生成系统前端逻辑

let currentProjectId = null;

// 上传文件
function uploadFile() {
    document.getElementById('file-input').click();
}

// 处理文件上传
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('original-content').value = e.target.result;
        document.getElementById('original-title').value = file.name.replace(/\.[^/.]+$/, "");
    };
    reader.readAsText(file);
}

// 上传图片识别
function uploadImage() {
    document.getElementById('image-input').click();
}

// 处理图片上传和OCR识别
async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 显示图片预览
    const previewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const ocrStatus = document.getElementById('ocr-status');

    previewContainer.classList.remove('hidden');

    const reader = new FileReader();
    reader.onload = function(e) {
        imagePreview.src = e.target.result;
    };
    reader.readAsDataURL(file);

    // 更新状态
    ocrStatus.textContent = '正在识别图片中的文字...';

    // 调用后端OCR接口
    try {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/api/imitation/ocr', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            // 将识别的文字填充到原文内容框
            document.getElementById('original-content').value = result.text;

            // 如果标题为空，使用文件名
            if (!document.getElementById('original-title').value) {
                document.getElementById('original-title').value = file.name.replace(/\.[^/.]+$/, "");
            }

            ocrStatus.textContent = '✅ 识别成功！已自动填充到原文内容框';
            ocrStatus.style.color = '#10b981';

            // 3秒后隐藏预览
            setTimeout(() => {
                previewContainer.classList.add('hidden');
            }, 3000);
        } else {
            ocrStatus.textContent = '❌ 识别失败：' + (result.message || '未知错误');
            ocrStatus.style.color = '#ef4444';
        }
    } catch (error) {
        console.error('OCR Error:', error);
        ocrStatus.textContent = '❌ 识别失败：' + error.message;
        ocrStatus.style.color = '#ef4444';
    }
}

// 阶段一：深度拆解
async function deconstructOriginal() {
    const originalTitle = document.getElementById('original-title').value.trim();
    const originalContent = document.getElementById('original-content').value.trim();

    if (!originalTitle || !originalContent) {
        alert('请填写原文标题和内容');
        return;
    }

    const btn = document.getElementById('btn-deconstruct');
    btn.disabled = true;
    btn.innerHTML = '拆解中 <span class="loading"></span>';
    updateStepStatus(1, 'in-progress');

    try {
        const response = await fetch('/api/imitation/deconstruct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                original_title: originalTitle,
                original_content: originalContent
            })
        });

        const result = await response.json();

        if (result.success) {
            currentProjectId = result.project_id;

            // 显示拆解结果
            document.getElementById('deconstruction-json').textContent =
                JSON.stringify(result.analysis, null, 2);
            document.getElementById('deconstruction-result').classList.remove('hidden');

            updateStepStatus(1, 'completed');
            updateStepStatus(2, 'pending');

            // 自动滚动到下一步
            document.getElementById('step2').scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            alert('拆解失败：' + result.message);
            updateStepStatus(1, 'pending');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('拆解失败：' + error.message);
        updateStepStatus(1, 'pending');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '开始拆解';
    }
}

// 阶段二：配置新设定
async function configureImitation() {
    if (!currentProjectId) {
        alert('请先完成步骤一：深度拆解');
        return;
    }

    const newWorldview = document.getElementById('new-worldview').value;
    const coreConflict = document.getElementById('core-conflict').value.trim();
    const protagonistName = document.getElementById('protagonist-name').value.trim();
    const protagonistIdentity = document.getElementById('protagonist-identity').value.trim();
    const protagonistPersonality = document.getElementById('protagonist-personality').value.trim();
    const protagonistMotivation = document.getElementById('protagonist-motivation').value.trim();
    const goldenFinger = document.getElementById('golden-finger').value.trim();

    if (!coreConflict || !protagonistName || !protagonistIdentity) {
        alert('请填写核心冲突和主角人设的核心信息');
        return;
    }

    const btn = document.getElementById('btn-configure');
    btn.disabled = true;
    btn.innerHTML = '配置中 <span class="loading"></span>';
    updateStepStatus(2, 'in-progress');

    try {
        const response = await fetch('/api/imitation/configure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project_id: currentProjectId,
                new_worldview: newWorldview,
                protagonist_setting: {
                    name: protagonistName,
                    identity: protagonistIdentity,
                    personality: protagonistPersonality,
                    motivation: protagonistMotivation
                },
                core_conflict: coreConflict,
                golden_finger: goldenFinger
            })
        });

        const result = await response.json();

        if (result.success) {
            updateStepStatus(2, 'completed');
            updateStepStatus(3, 'pending');

            // 自动滚动到下一步
            document.getElementById('step3').scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            alert('配置失败：' + result.message);
            updateStepStatus(2, 'pending');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('配置失败：' + error.message);
        updateStepStatus(2, 'pending');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '确认配置';
    }
}

// 阶段三：生成重构蓝图预览
async function previewReconstruction() {
    if (!currentProjectId) {
        alert('请先完成前面的步骤');
        return;
    }

    const btn = document.getElementById('btn-preview');
    btn.disabled = true;
    btn.innerHTML = '生成中 <span class="loading"></span>';
    updateStepStatus(3, 'in-progress');

    try {
        const response = await fetch('/api/imitation/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project_id: currentProjectId
            })
        });

        const result = await response.json();

        if (result.success) {
            // 显示对照表
            renderBlueprintTable(result.blueprint);
            document.getElementById('blueprint-result').classList.remove('hidden');

            updateStepStatus(3, 'completed');
            updateStepStatus(4, 'pending');

            // 自动滚动到下一步
            document.getElementById('step4').scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            alert('生成失败：' + result.message);
            updateStepStatus(3, 'pending');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('生成失败：' + error.message);
        updateStepStatus(3, 'pending');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '生成重构蓝图';
    }
}

// 渲染对照表
function renderBlueprintTable(blueprint) {
    const container = document.getElementById('blueprint-table-container');

    let html = '<table class="comparison-table">';
    html += '<thead><tr><th>节拍</th><th>原剧情节</th><th>新剧情节</th><th>转化逻辑</th><th>情绪</th></tr></thead>';
    html += '<tbody>';

    if (blueprint.comparison_table && blueprint.comparison_table.length > 0) {
        blueprint.comparison_table.forEach(beat => {
            html += '<tr>';
            html += `<td>${beat.beat_index}</td>`;
            html += `<td>${beat.original_plot}</td>`;
            html += `<td>${beat.new_plot}</td>`;
            html += `<td>${beat.transformation_logic}</td>`;
            html += `<td>${beat.emotion_match}</td>`;
            html += '</tr>';
        });
    }

    html += '</tbody></table>';

    // 添加角色映射和场景映射
    if (blueprint.character_mapping) {
        html += '<h4 style="margin-top: 20px;">角色映射</h4>';
        html += '<ul>';
        for (const [original, new_char] of Object.entries(blueprint.character_mapping)) {
            html += `<li><strong>${original}</strong> → ${new_char}</li>`;
        }
        html += '</ul>';
    }

    if (blueprint.setting_mapping) {
        html += '<h4 style="margin-top: 16px;">场景映射</h4>';
        html += '<ul>';
        for (const [original, new_setting] of Object.entries(blueprint.setting_mapping)) {
            html += `<li><strong>${original}</strong> → ${new_setting}</li>`;
        }
        html += '</ul>';
    }

    container.innerHTML = html;
}

// 阶段四：生成仿写正文
async function generateImitation() {
    if (!currentProjectId) {
        alert('请先完成前面的步骤');
        return;
    }

    const btn = document.getElementById('btn-generate');
    btn.disabled = true;
    btn.innerHTML = '生成中 <span class="loading"></span>';
    updateStepStatus(4, 'in-progress');

    try {
        const response = await fetch('/api/imitation/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project_id: currentProjectId
            })
        });

        const result = await response.json();

        if (result.success) {
            // 显示生成结果
            document.getElementById('generated-result').textContent = result.content;
            document.getElementById('generated-result').classList.remove('hidden');

            updateStepStatus(4, 'completed');
        } else {
            alert('生成失败：' + result.message);
            updateStepStatus(4, 'pending');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('生成失败：' + error.message);
        updateStepStatus(4, 'pending');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '开始生成';
    }
}

// 更新步骤状态
function updateStepStatus(stepNumber, status) {
    const statusElement = document.getElementById(`step${stepNumber}-status`);

    statusElement.className = 'step-status ' + status;

    switch(status) {
        case 'pending':
            statusElement.textContent = '待开始';
            break;
        case 'in-progress':
            statusElement.textContent = '进行中';
            break;
        case 'completed':
            statusElement.textContent = '已完成';
            break;
    }
}
