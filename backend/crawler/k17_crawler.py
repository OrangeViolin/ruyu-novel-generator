from .base_crawler import BaseCrawler
from typing import List, Dict
from bs4 import BeautifulSoup
import json
import re


class K17Crawler(BaseCrawler):
    """17k小说网爬虫"""

    def __init__(self, cookies: str = None):
        super().__init__(cookies)
        self.base_url = "https://www.17k.com"

    def get_hot_list(self, category: str = "all", limit: int = 30) -> List[Dict]:
        """
        获取17k热榜内容

        Args:
            category: 分类 (all, xuanhuan, dushi, xianxia)
            limit: 数量限制

        Returns:
            热门小说列表
        """
        results = []

        # 17k排行榜URL
        ranking_urls = {
            "all": f"{self.base_url}/all/book/category_0_0_0_0_0_0_0_3.html",  # 总榜
            "xuanhuan": f"{self.base_url}/all/book/category_1_0_0_0_0_0_0_3.html",  # 玄幻
            "dushi": f"{self.base_url}/all/book/category_2_0_0_0_0_0_0_3.html",  # 都市
            "xianxia": f"{self.base_url}/all/book/category_4_0_0_0_0_0_0_3.html",  # 仙侠
            "lishi": f"{self.base_url}/all/book/category_3_0_0_0_0_0_0_3.html",  # 历史
        }

        url = ranking_urls.get(category, ranking_urls["all"])

        try:
            response = self.session.get(url, timeout=15)

            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'lxml')

                # 17k的小说列表
                book_items = soup.find_all(['div', 'li'], class_=re.compile(r'item|book|elist'))

                for item in book_items[:limit]:
                    try:
                        # 查找书名链接
                        link = item.find('a', href=re.compile(r'/book/\d+'))
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
                        print(f"解析17k排行项失败: {e}")
                        continue

                self._random_delay(2, 4)

        except Exception as e:
            print(f"获取17k热榜失败: {e}")

        return results

    def search(self, keyword: str, limit: int = 20) -> List[Dict]:
        """
        搜索17k小说

        Args:
            keyword: 搜索关键词
            limit: 最多返回数量

        Returns:
            结果列表
        """
        results = []

        # 17k搜索URL
        search_url = f"{self.base_url}/search.aspx"
        params = {
            "keyword": keyword,
        }

        try:
            response = self.session.get(search_url, params=params, timeout=15)

            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'lxml')

                # 查找搜索结果
                result_items = soup.find_all(['div', 'li'], class_=re.compile(r'result|book|item|elist'))

                for item in result_items[:limit]:
                    try:
                        link = item.find('a', href=re.compile(r'/book/\d+'))
                        if not link:
                            continue

                        book_url = link.get('href', '')
                        if not book_url.startswith('http'):
                            book_url = self.base_url + book_url

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
            print(f"17k搜索失败: {e}")

        return results

    def fetch_content(self, url: str) -> Dict:
        """
        获取17k小说内容

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
                desc_elem = soup.find(['div', 'p'], class_=re.compile(r'description|summary|intro'))
                if desc_elem:
                    summary = desc_elem.get_text(strip=True)

                # 提取第一章
                content = summary
                chapter_link = soup.find('a', href=re.compile(r'/chapter/\d+/\d+'))
                if chapter_link:
                    chapter_url = chapter_link.get('href', '')
                    if not chapter_url.startswith('http'):
                        chapter_url = self.base_url + chapter_url

                    try:
                        chapter_resp = self.session.get(chapter_url, timeout=10)
                        if chapter_resp.status_code == 200:
                            chapter_soup = BeautifulSoup(chapter_resp.text, 'lxml')
                            content_elem = chapter_soup.find(['div', 'article'], class_=re.compile(r'content|text'))
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
            print(f"获取17k内容失败: {e}")

        return {}
