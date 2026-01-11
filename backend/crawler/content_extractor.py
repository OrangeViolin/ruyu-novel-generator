"""增强的内容提取器 - 提供更高质量的文本提取功能"""
import re
from typing import Dict, Optional, List
from bs4 import BeautifulSoup, Tag
import html


class EnhancedContentExtractor:
    """增强的内容提取器，支持多种网站结构的智能解析"""

    # 无用元素标签
    USELESS_TAGS = [
        'script', 'style', 'iframe', 'noscript', 'header', 'footer',
        'nav', 'aside', 'advertisement', 'ad', 'banner'
    ]

    # 导航/工具类CSS选择器
    NAVIGATION_SELECTORS = [
        '.navigation', '.nav', '.menu', '.sidebar', '.breadcrumb',
        '.pagination', '.footer', '.header', '.toolbar',
        '#navigation', '#nav', '#menu', '#sidebar', '#footer', '#header'
    ]

    # 广告类选择器
    AD_SELECTORS = [
        '.ad', '.ads', '.advertisement', '.banner-ad',
        'div[class*="ad-"]', 'div[id*="ad-"]', 'div[class*="guanggao"]',
        '.google-ad', '.adsense', '#google-ad'
    ]

    # 内容区域选择器（按优先级排序）
    CONTENT_SELECTORS = [
        'article', '.article', '.content', '.post-content',
        '.main-content', '#content', '#article-content',
        '.entry-content', '.post-body', '.text-content',
        '.novel-content', '.chapter-content', '.story-content',
        # 网易号特定
        '.post_text', '.post-text-b',
        # 通用文章容器
        '[itemprop="articleBody"]', '.article-body', '.article__body',
        'article p', '.text p'
    ]

    # 标题选择器
    TITLE_SELECTORS = [
        'h1', '.title', '.article-title', '#title',
        '.post-title', '.entry-title', 'h2.title'
    ]

    def __init__(self):
        """初始化提取器"""
        self.pruned_selectors = (
            self.NAVIGATION_SELECTORS +
            self.AD_SELECTORS
        )

    def extract(self, html_content: str, url: str = "") -> Dict[str, str]:
        """
        智能提取网页主要内容

        Args:
            html_content: HTML内容
            url: 页面URL（用于判断网站类型）

        Returns:
            {"title": "标题", "content": "正文内容", "author": "作者", "word_count": 字数}
        """
        if not html_content:
            return {"title": "", "content": "", "author": "", "word_count": 0}

        soup = BeautifulSoup(html_content, 'html.parser')

        # 1. 预处理：移除无用元素
        self._remove_useless_elements(soup)

        # 2. 提取标题
        title = self._extract_title(soup)

        # 3. 提取正文内容
        content = self._extract_main_content(soup)

        # 4. 清理和格式化文本
        cleaned_content = self._clean_text(content)

        # 5. 提取作者（如果可能）
        author = self._extract_author(soup)

        return {
            "title": title,
            "content": cleaned_content,
            "author": author,
            "word_count": len(cleaned_content)
        }

    def _remove_useless_elements(self, soup: BeautifulSoup):
        """移除无用的HTML元素"""
        # 移除无用标签
        for tag in self.USELESS_TAGS:
            for element in soup.find_all(tag):
                element.decompose()

        # 移除导航和广告
        for selector in self.pruned_selectors:
            for element in soup.select(selector):
                element.decompose()

    def _extract_title(self, soup: BeautifulSoup) -> str:
        """提取页面标题"""
        # 优先从特定的标题选择器中提取
        for selector in self.TITLE_SELECTORS:
            element = soup.select_one(selector)
            if element:
                title = element.get_text(strip=True)
                if title and len(title) > 2:
                    return title

        # 回退到HTML title标签
        title_tag = soup.find('title')
        if title_tag:
            title = title_tag.get_text(strip=True)
            # 清理标题中的网站名称
            title = re.sub(r'\s*[-_|]\s*(首页|网站|官网|HOME).*$', '', title, flags=re.IGNORECASE)
            return title

        return ""

    def _extract_main_content(self, soup: BeautifulSoup) -> str:
        """提取主要内容区域"""
        # 1. 首先尝试找到最可能的内容区域
        main_content = self._find_best_content_area(soup)
        if main_content:
            return self._extract_paragraphs(main_content)

        # 2. 回退方案：使用启发式算法
        best_element = self._find_content_by_density(soup)
        if best_element:
            return self._extract_paragraphs(best_element)

        # 3. 最后回退：提取body中的所有段落
        body = soup.find('body')
        if body:
            return self._extract_paragraphs(body)

        return ""

    def _find_best_content_area(self, soup: BeautifulSoup) -> Optional[Tag]:
        """找到最佳内容区域"""
        # 针对不同网站的特定处理
        # 检查是否是网易文章
        if soup.find('meta', {'property': 'og:type', 'content': 'news'}) or \
           soup.find('meta', {'name': 'keywords'}):
            # 尝试找到正文区域
            for selector in self.CONTENT_SELECTORS:
                element = soup.select_one(selector)
                if element:
                    # 检查是否包含足够的文本
                    text = element.get_text(strip=True)
                    if len(text) > 200:  # 至少200字
                        return element

        return None

    def _find_content_by_density(self, soup: BeautifulSoup) -> Optional[Tag]:
        """通过文本密度找到主要内容区域"""
        candidates = []

        # 只考虑div和article标签
        for tag in soup.find_all(['div', 'article', 'section']):
            if not isinstance(tag, Tag):
                continue

            text = tag.get_text(strip=True)
            if len(text) < 100:  # 太短的内容跳过
                continue

            # 计算文本密度（文本长度与HTML长度的比值）
            html_len = len(str(tag))
            text_len = len(text)
            density = text_len / html_len if html_len > 0 else 0

            # 计算链接文本比例（正文不应该包含太多链接）
            links = tag.find_all('a')
            link_text_len = sum(len(a.get_text(strip=True)) for a in links)
            link_ratio = link_text_len / text_len if text_len > 0 else 0

            # 评分：密度高、链接比例低的得分高
            score = density * 100 - link_ratio * 50

            candidates.append((tag, score, text_len))

        # 返回得分最高且文本长度合理的元素
        if candidates:
            candidates.sort(key=lambda x: (x[1], x[2]), reverse=True)
            best = candidates[0][0]
            # 确保不是整个body
            if best.name != 'body':
                return best

        return None

    def _extract_paragraphs(self, element: Tag) -> str:
        """从元素中提取段落文本"""
        paragraphs = []

        # 提取所有p标签和换行符分隔的文本
        for child in element.descendants:
            if child.name == 'p':
                text = child.get_text(strip=True)
                if text:
                    paragraphs.append(text)
            elif child.name == 'br':
                paragraphs.append("")
            elif isinstance(child, str) and child.strip():
                # 纯文本节点
                text = child.strip()
                if text and len(text) > 10:
                    paragraphs.append(text)

        # 如果没有段落，直接获取所有文本
        if not paragraphs:
            text = element.get_text(separator='\n', strip=True)
            return text

        # 合并段落，用双换行分隔
        content = '\n\n'.join(p for p in paragraphs if p)
        return content

    def _clean_text(self, text: str) -> str:
        """清理和格式化文本"""
        if not text:
            return ""

        # 解码HTML实体
        text = html.unescape(text)

        # 移除多余的空白
        text = re.sub(r'\s+', ' ', text)  # 多个空格替换为一个
        text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)  # 多个空行替换为两个

        # 移除常见的无用文本
        noise_patterns = [
            r'点击查看更多.*',
            r'更多精彩内容.*',
            r'长按识别二维码.*',
            r'关注公众号.*',
            r'转发点赞.*',
            r'声明.*?版权归.*',
            r'本文由.*原创',
            r'转载请注明.*',
            r'广告',
            r'免责声明.*',
            r'以上内容不代表.*',
        ]
        for pattern in noise_patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE | re.DOTALL)

        # 移除过短或过长的行（可能是噪音）
        lines = text.split('\n')
        cleaned_lines = []
        for line in lines:
            line = line.strip()
            if line and 3 < len(line) < 500:  # 保留合理长度的行
                cleaned_lines.append(line)

        return '\n\n'.join(cleaned_lines).strip()

    def _extract_author(self, soup: BeautifulSoup) -> str:
        """提取作者信息"""
        author_selectors = [
            '.author', '.post-author', '.writer', '.by-author',
            '[class*="author"]', '[class*="writer"]',
            'meta[name="author"]'
        ]

        for selector in author_selectors:
            element = soup.select_one(selector)
            if element:
                if element.name == 'meta':
                    author = element.get('content', '')
                else:
                    author = element.get_text(strip=True)
                if author and len(author) < 50:  # 合理的作者名长度
                    return author

        return ""

    @staticmethod
    def extract_from_response(response_text: str) -> Dict[str, str]:
        """便捷方法：从响应文本中提取内容"""
        extractor = EnhancedContentExtractor()
        return extractor.extract(response_text)
