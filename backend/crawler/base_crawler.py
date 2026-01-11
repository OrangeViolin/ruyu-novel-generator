from abc import ABC, abstractmethod
from typing import List, Dict, Optional
import requests
import time
import random
from bs4 import BeautifulSoup
from .content_extractor import EnhancedContentExtractor


class BaseCrawler(ABC):
    """爬虫基类"""

    def __init__(self, cookies: Optional[str] = None):
        """
        初始化爬虫

        Args:
            cookies: 登录后的Cookie（可选）
        """
        self.session = requests.Session()
        self.cookies = cookies
        if cookies:
            self.session.headers.update({"Cookie": cookies})

        # 设置默认请求头
        self._update_headers()

        # 初始化增强的内容提取器
        self.content_extractor = EnhancedContentExtractor()

    def _update_headers(self):
        """更新请求头"""
        user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
        ]
        self.session.headers.update({
            "User-Agent": random.choice(user_agents),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        })

    def _random_delay(self, min_sec: float = 2, max_sec: float = 5):
        """随机延迟，避免被检测"""
        time.sleep(random.uniform(min_sec, max_sec))

    @abstractmethod
    def search(self, keyword: str, limit: int = 20) -> List[Dict]:
        """
        搜索内容

        Args:
            keyword: 搜索关键词
            limit: 最多返回数量

        Returns:
            结果列表 [{"url": "", "title": "", "summary": ""}]
        """
        pass

    @abstractmethod
    def fetch_content(self, url: str) -> Dict:
        """
        获取单篇内容

        Args:
            url: 文章URL

        Returns:
            内容字典 {"title": "", "content": "", "author": "", "views": 0}
        """
        pass

    def batch_fetch(self, urls: List[str]) -> List[Dict]:
        """
        批量获取内容

        Args:
            urls: URL列表

        Returns:
            内容列表
        """
        results = []
        for url in urls:
            try:
                content = self.fetch_content(url)
                if content:
                    results.append(content)
                self._random_delay()
            except Exception as e:
                print(f"获取失败 {url}: {e}")
        return results

    def clean_html(self, html: str) -> str:
        """
        清理HTML，提取纯文本（使用增强提取器）

        Args:
            html: HTML字符串

        Returns:
            纯文本
        """
        result = self.content_extractor.extract(html)
        return result.get("content", "")

    def extract_content(self, html: str, url: str = "") -> Dict:
        """
        智能提取内容（新方法，推荐使用）

        Args:
            html: HTML内容
            url: 页面URL

        Returns:
            {"title": "", "content": "", "author": "", "word_count": 字数}
        """
        return self.content_extractor.extract(html, url)
