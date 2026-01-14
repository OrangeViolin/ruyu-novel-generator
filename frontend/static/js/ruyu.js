/**
 * 如鱼写作 - 灵感鱼缸 (Floating Bubbles) 核心逻辑
 */

const RuyuAquarium = {
    container: null,
    bubbles: [],
    lastFocusedTextarea: null,

    // 初始灵感数据
    initialInspirations: [
        "晨曦微露，仿佛碎金撒入深海",
        "笔尖流淌的不仅是文字，更是灵魂的低语",
        "命运的齿轮在这一刻开始悄然转动",
        "每一个反转都是蓄谋已久的情绪爆发",
        "字里行间，如鱼得水",
        "极致的情绪拉扯，是爆款的催化剂",
        "剥开层层迷雾，真相远比想象残酷",
        "跨越深渊的凝视，终将迎来光亮"
    ],

    async init() {
        this.container = document.getElementById('bubble-container');
        if (!this.container) return;

        // 追踪最后聚焦的输入框
        this.trackFocus();

        // 尝试从后端获取真实灵感
        try {
            const response = await fetch('/api/inspiration/bubbles');
            const result = await response.json();
            if (result.success && result.data && result.data.length > 0) {
                this.initialInspirations = result.data;
                console.log('获取灵感成功：', result.data.length, '条');
            }
        } catch (error) {
            console.error('获取灵感气泡失败:', error);
            // 失败时使用默认的保底数据
        }

        // 初始化气泡
        this.initialInspirations.forEach((text, index) => {
            setTimeout(() => this.spawnBubble(text), index * 500);
        });

        // 监听AI生成结果，以便添加新灵感（可选扩展）
        console.log('如鱼写作：灵感鱼缸已就绪');
    },

    trackFocus() {
        document.addEventListener('focusin', (e) => {
            if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
                this.lastFocusedTextarea = e.target;
            }
        });
    },

    /**
     * 生成一个新的漂浮气泡
     * @param {string} text 灵感文字
     */
    spawnBubble(text) {
        if (!this.container) return;

        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.textContent = text.length > 20 ? text.substring(0, 18) + '...' : text;
        bubble.title = text; // 悬停显示全文

        // 随机属性
        const size = Math.floor(Math.random() * 40) + 70; // 70-110px
        const left = Math.floor(Math.random() * (this.container.offsetWidth - size));
        const top = Math.floor(Math.random() * (this.container.offsetHeight - size));
        const duration = Math.floor(Math.random() * 5) + 8; // 8-13s
        const delay = Math.floor(Math.random() * 5);

        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        bubble.style.left = `${left}px`;
        bubble.style.top = `${top}px`;
        bubble.style.animation = `float ${duration}s infinite ease-in-out ${delay}s`;

        // 点击事件：喂入灵感
        bubble.addEventListener('click', () => this.feedBubble(bubble, text));

        this.container.appendChild(bubble);
        this.bubbles.push({ element: bubble, text });
    },

    /**
     * 将气泡中的内容"喂入"当前编辑器
     * @param {HTMLElement} bubbleElement
     * @param {string} text
     */
    feedBubble(bubbleElement, text) {
        if (!this.lastFocusedTextarea) {
            // 如果没找到焦点，尝试找第一个可见的textarea
            const visibleTextarea = Array.from(document.querySelectorAll('textarea')).find(t => t.offsetParent !== null);
            if (visibleTextarea) {
                this.lastFocusedTextarea = visibleTextarea;
            } else {
                if (typeof showToast === 'function') showToast('请先点击输入框，再喂入灵感', 'info');
                return;
            }
        }

        // 添加动画
        bubbleElement.classList.add('feeding');

        // 插入文字
        const textarea = this.lastFocusedTextarea;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentText = textarea.value;

        textarea.value = currentText.substring(0, start) + text + currentText.substring(end);

        // 恢复焦点并触发input事件以触发可能的自动保存/调整
        textarea.focus();
        textarea.setSelectionRange(start + text.length, start + text.length);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));

        if (typeof showToast === 'function') showToast('灵感喂入成功', 'success');

        // 移除旧气泡并补充新气泡
        setTimeout(async () => {
            bubbleElement.remove();
            this.bubbles = this.bubbles.filter(b => b.element !== bubbleElement);

            // 尝试获取新灵感补充
            let newText = this.initialInspirations[Math.floor(Math.random() * this.initialInspirations.length)];

            // 如果剩余气泡不多，尝试重新从后端拉取一波
            if (this.bubbles.length < 5) {
                try {
                    const response = await fetch('/api/inspiration/bubbles');
                    const result = await response.json();
                    if (result.success && result.data && result.data.length > 0) {
                        this.initialInspirations = result.data;
                        newText = this.initialInspirations[Math.floor(Math.random() * this.initialInspirations.length)];
                    }
                } catch (e) {
                    console.error('补充灵感失败:', e);
                }
            }

            this.spawnBubble(newText);
        }, 500);
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    RuyuAquarium.init();
});
