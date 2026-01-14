// API基础URL
const API_BASE = '/api';

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
        content.style.display = 'none';
    });

    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) {
        targetTab.classList.add('active');
        targetTab.style.display = 'block';

        // 特殊处理：进入长篇助手时自动加载列表
        if (tabName === 'long-novel') {
            showLongNovelManagement();
        }
    }
}

// 通用模态框控制
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Toast提示
function showToast(message, type = 'success') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = 'toast show';

    if (type === 'error') {
        toast.style.background = 'var(--danger-color)';
    } else if (type === 'info') {
        toast.style.background = 'var(--primary-color)';
    } else {
        toast.style.background = 'var(--success-color)';
    }

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// HTML转义
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();

    // 默认显示短故事助手
    switchTab('short-story');
});
