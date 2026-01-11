from .base_crawler import BaseCrawler
from typing import List, Dict
from bs4 import BeautifulSoup
import json
import re


class FeiluCrawler(BaseCrawler):
    """飞卢小说网爬虫 - 以爽文和快节奏小说著称"""

    def __init__(self, cookies: str = None):
        super().__init__(cookies)
        self.base_url = "https://b.faloo.com"
        self.www_base = "https://www.faloo.com"

    def get_hot_list(self, category: str = "xuanhuan", limit: int = 30) -> List[Dict]:
        """
        获取飞卢热榜内容

        Args:
            category: 分类 (xuanhuan=玄幻, dushi=都市, xianxia=仙侠, yanyi=影视)
            limit: 数量限制

        Returns:
            热门小说列表
        """
        results = []

        # 飞卢排行榜URL
        ranking_urls = {
            "xuanhuan": f"{self.base_url}/l/0_1.html",  # 玄幻排行榜
            "dushi": f"{self.base_url}/l/0_2.html",  # 都市排行榜
            "xianxia": f"{self.base_url}/l/0_3.html",  # 仙侠排行榜
            "lishi": f"{self.base_url}/l/0_4.html",  # 历史排行榜
            "junshi": f"{self.base_url}/l/0_5.html",  # 军事排行榜
            "youxi": f"{self.base_url}/l/0_6.html",  # 游戏排行榜
            "kehuan": f"{self.base_url}/l/0_7.html",  # 科幻排行榜
        }

        url = ranking_urls.get(category, ranking_urls["xuanhuan"])

        try:
            response = self.session.get(url, timeout=15)

            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'lxml')

                # 飞卢的小说列表通常使用特定的class
                book_items = soup.find_all(['div', 'li'], class_=re.compile(r'item|book|novel'))

                for item in book_items[:limit]:
                    try:
                        # 查找书名链接
                        link = item.find('a', href=re.compile(r'/\d+\.html'))
                        if not link:
                            continue

                        book_url = link.get('href', '')
                        if not book_url.startswith('http'):
                            book_url = self.base_url + book_url

                        # 提取书名
                        title = link.get_text(strip=True)

                        # 提取简介
                        summary = ""
                        desc_elem = item.find(['div', 'p'], class_=re.compile(r'desc|intro|summary'))
                        if desc_elem:
                            summary = desc_elem.get_text(strip=True)

                        # 提取作者
                        author = ""
                        author_elem = item.find(['span', 'a'], class_=re.compile(r'author|writer'))
                        if author_elem:
                            author = author_elem.get_text(strip=True)

                        # 提取字数/点击
                        views = 0
                        stats_elem = item.find(['span', 'div'], class_=re.compile(r'count|views|hits|words'))
                        if stats_elem:
                            stats_text = stats_elem.get_text(strip=True)
                            numbers = re.findall(r'\d+', stats_text)
                            if numbers:
                                views = int(numbers[0])

                        results.append({
                            "url": book_url,
                            "title": title,
                            "summary": summary[:200] if summary else "",
                            "author": author,
                            "views": views,
                        })
                    except Exception as e:
                        print(f"解析飞卢排行项失败: {e}")
                        continue

                self._random_delay(2, 4)

        except Exception as e:
            print(f"获取飞卢热榜失败: {e}")

        return results

    def search(self, keyword: str, limit: int = 20) -> List[Dict]:
        """
        搜索飞卢小说

        Args:
            keyword: 搜索关键词
            limit: 最多返回数量

        Returns:
            结果列表
        """
        results = []

        # 飞卢搜索URL
        search_url = f"{self.www_base}/search.aspx"
        params = {
            "keyword": keyword,
            "page": 1,
        }

        try:
            response = self.session.get(search_url, params=params, timeout=15)

            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'lxml')

                # 查找搜索结果
                result_items = soup.find_all(['div', 'li'], class_=re.compile(r'result|book|item'))

                for item in result_items[:limit]:
                    try:
                        link = item.find('a', href=re.compile(r'/\d+\.html'))
                        if not link:
                            continue

                        book_url = link.get('href', '')
                        if not book_url.startswith('http'):
                            if book_url.startswith('/'):
                                book_url = self.www_base + book_url
                            else:
                                book_url = self.base_url + '/' + book_url

                        title = link.get_text(strip=True)

                        # 提取简介
                        desc_elem = item.find(['div', 'p'], class_=re.compile(r'desc|intro|summary'))
                        summary = desc_elem.get_text(strip=True) if desc_elem else ""

                        results.append({
                            "url": book_url,
                            "title": title,
                            "summary": summary[:200] if summary else "",
                            "author": "",
                            "views": 0,
                        })
                    except Exception as e:
                        print(f"解析搜索结果失败: {e}")
                        continue

                self._random_delay(2, 4)

        except Exception as e:
            print(f"飞卢搜索失败: {e}")

        return results

    def fetch_content(self, url: str) -> Dict:
        """
        获取飞卢小说内容

        Args:
            url: 小说URL

        Returns:
            内容字典
        """
        try:
            response = self.session.get(url, timeout=15)

            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'lxml')

                # 提取书名
                title_elem = soup.find('h1') or soup.find(['div', 'span'], class_=re.compile(r'title|book-name'))
                title = title_elem.get_text(strip=True) if title_elem else ""

                # 提取作者
                author = ""
                author_elem = soup.find(['span', 'a'], class_=re.compile(r'author|writer'))
                if author_elem:
                    author = author_elem.get_text(strip=True)

                # 提取简介
                summary = ""
                desc_elem = soup.find(['div', 'p'], class_=re.compile(r'description|summary|intro|book-intro'))
                if desc_elem:
                    summary = desc_elem.get_text(strip=True)

                # 提取第一章
                content = summary
                chapter_link = soup.find('a', href=re.compile(r'/\d+_\d+\.html'))
                if chapter_link:
                    chapter_url = chapter_link.get('href', '')
                    if not chapter_url.startswith('http'):
                        if chapter_url.startswith('/'):
                            chapter_url = self.www_base + chapter_url
                        else:
                            chapter_url = self.base_url + '/' + chapter_url

                    try:
                        chapter_resp = self.session.get(chapter_url, timeout=10)
                        if chapter_resp.status_code == 200:
                            chapter_soup = BeautifulSoup(chapter_resp.text, 'lxml')
                            content_elem = chapter_soup.find(['div', 'content'], id=re.compile(r'content|text'))
                            if content_elem:
                                chapter_text = content_elem.get_text(strip=True)
                                content = summary + "\n\n" + chapter_text[:2000]
                    except:
                        pass

                # 提取点击/字数
                views = 0
                stats_elem = soup.find(['span', 'div'], class_=re.compile(r'count|views|words'))
                if stats_elem:
                    stats_text = stats_elem.get_text(strip=True)
                    numbers = re.findall(r'\d+', stats_text)
                    if numbers:
                        views = int(numbers[0])

                return {
                    "title": title,
                    "content": content,
                    "author": author,
                    "views": views,
                    "url": url,
                }

        except Exception as e:
            print(f"获取飞卢内容失败: {e}")

        return {}

    def get_recommendation(self, limit: int = 30) -> List[Dict]:
        """
        获取飞卢推荐榜（编辑推荐）

        Args:
            limit: 数量限制

        Returns:
            推荐小说列表
        """
        # 飞卢推荐页面
        url = f"{self.www_base}/"

        try:
            response = self.session.get(url, timeout=15)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'lxml')

                results = []
                # 查找推荐区域的小说
                book_items = soup.find_all(['div', 'li'], class_=re.compile(r'recommend|hot|new'))

                for item in book_items[:limit]:
                    link = item.find('a', href=re.compile(r'/\d+\.html'))
                    if link:
                        book_url = link.get('href', '')
                        if not book_url.startswith('http'):
                            if book_url.startswith('/'):
                                book_url = self.www_base + book_url

                        title = link.get_text(strip=True)

                        desc_elem = item.find(['div', 'p'], class_=re.compile(r'desc|intro'))
                        summary = desc_elem.get_text(strip=True) if desc_elem else ""

                        results.append({
                            "url": book_url,
                            "title": title,
                            "summary": summary[:200] if summary else "",
                            "author": "",
                            "views": 0,
                        })

                return results

        except Exception as e:
            print(f"获取飞卢推荐榜失败: {e}")

        return []
