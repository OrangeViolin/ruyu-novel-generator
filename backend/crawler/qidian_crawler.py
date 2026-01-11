from .base_crawler import BaseCrawler
from typing import List, Dict
from bs4 import BeautifulSoup
import json
import re


class QidianCrawler(BaseCrawler):
    """起点中文网爬虫 - 起点中文网"""

    def __init__(self, cookies: str = None):
        super().__init__(cookies)
        self.base_url = "https://www.qidian.com"
        self.api_base = "https://m.qidian.com/majax/book"

    def get_ranking(self, category: str = "xuanhuan", limit: int = 30) -> List[Dict]:
        """
        获取起点排行榜内容

        Args:
            category: 分类 (xuanhuan=玄幻, qihuan=奇幻, wuxia=武侠, xianxia=仙侠, dushi=都市)
            limit: 数量限制

        Returns:
            热门小说列表
        """
        results = []

        # 起点排行榜页面URL
        ranking_urls = {
            "xuanhuan": f"{self.base_url}/rank/xuanhuan",
            "qihuan": f"{self.base_url}/rank/qihuan",
            "wuxia": f"{self.base_url}/rank/wuxia",
            "xianxia": f"{self.base_url}/rank/xianxia",
            "dushi": f"{self.base_url}/rank/dushi",
            "lishi": f"{self.base_url}/rank/lishi",
            "junshi": f"{self.base_url}/rank/junshi",
            "youxi": f"{self.base_url}/rank/youxi",
            "kehuan": f"{self.base_url}/rank/kehuan",
        }

        url = ranking_urls.get(category, ranking_urls["xuanhuan"])

        try:
            response = self.session.get(url, timeout=15)

            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'lxml')

                # 起点排行榜通常使用特定的class
                book_items = soup.find_all(['div', 'li'], class_=re.compile(r'rank|book|item'))

                for item in book_items[:limit]:
                    try:
                        # 查找书名链接
                        link = item.find('a', href=re.compile(r'/book/\d+/'))
                        if not link:
                            # 尝试其他可能的链接格式
                            link = item.find('a', href=re.compile(r'/info/\d+'))

                        if not link:
                            continue

                        book_url = link.get('href', '')
                        if not book_url.startswith('http'):
                            book_url = self.base_url + book_url

                        # 提取书名
                        title = link.get_text(strip=True)

                        # 提取作者
                        author = ""
                        author_elem = item.find(['span', 'a', 'div'], class_=re.compile(r'author|writer'))
                        if author_elem:
                            author = author_elem.get_text(strip=True)

                        # 提取简介
                        summary = ""
                        desc_elem = item.find(['div', 'p'], class_=re.compile(r'desc|intro|summary'))
                        if desc_elem:
                            summary = desc_elem.get_text(strip=True)

                        # 提取月票/推荐票
                        views = 0
                        vote_elem = item.find(['span', 'em'], class_=re.compile(r'vote|ticket|count'))
                        if vote_elem:
                            vote_text = vote_elem.get_text(strip=True)
                            numbers = re.findall(r'\d+', vote_text)
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
                        print(f"解析排行项失败: {e}")
                        continue

                self._random_delay(2, 4)

        except Exception as e:
            print(f"获取起点排行榜失败: {e}")

        return results

    def get_hot_list(self, limit: int = 30) -> List[Dict]:
        """
        获取起点热榜（综合热榜）

        Args:
            limit: 数量限制

        Returns:
            热门小说列表
        """
        return self.get_ranking("xuanhuan", limit)

    def search(self, keyword: str, limit: int = 20) -> List[Dict]:
        """
        搜索起点小说

        Args:
            keyword: 搜索关键词
            limit: 最多返回数量

        Returns:
            结果列表
        """
        results = []

        # 起点搜索API
        search_url = f"{self.api_base}/search"
        params = {
            "kw": keyword,
            "page": 1,
        }

        try:
            response = self.session.get(search_url, params=params, timeout=15)

            if response.status_code == 200:
                try:
                    data = response.json()

                    # 解析返回的JSON数据
                    books = data.get("data", {}).get("books", [])

                    for book in books[:limit]:
                        book_id = book.get("bookId", "")
                        title = book.get("bookName", "")
                        author = book.get("authorName", "")
                        summary = book.get("introduction", "")

                        results.append({
                            "url": f"{self.base_url}/book/{book_id}/",
                            "title": title,
                            "summary": summary[:200] if summary else "",
                            "author": author,
                            "views": 0,
                        })
                except json.JSONDecodeError:
                    # 如果API失败，尝试解析HTML页面
                    search_page_url = f"{self.base_url}/search?kw={keyword}"
                    html_resp = self.session.get(search_page_url, timeout=15)

                    if html_resp.status_code == 200:
                        soup = BeautifulSoup(html_resp.text, 'lxml')
                        result_items = soup.find_all(['div', 'li'], class_=re.compile(r'result|book|item'))

                        for item in result_items[:limit]:
                            link = item.find('a', href=re.compile(r'/book/\d+/'))
                            if link:
                                book_url = link.get('href', '')
                                if not book_url.startswith('http'):
                                    book_url = self.base_url + book_url

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

            self._random_delay(2, 4)

        except Exception as e:
            print(f"起点搜索失败: {e}")

        return results

    def fetch_content(self, url: str) -> Dict:
        """
        获取起点小说内容（简介和章节列表）

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
                title_elem = soup.find('h1') or soup.find(['span', 'div'], class_=re.compile(r'book-name|title'))
                title = title_elem.get_text(strip=True) if title_elem else ""

                # 提取作者
                author = ""
                author_elem = soup.find(['span', 'a'], class_=re.compile(r'author|writer'))
                if author_elem:
                    author = author_elem.get_text(strip=True)

                # 提取简介
                summary = ""
                desc_elem = soup.find(['div', 'p', 'span'], class_=re.compile(r'description|summary|intro|book-intro'))
                if desc_elem:
                    summary = desc_elem.get_text(strip=True)

                # 提取第一章链接
                content = summary
                chapter_link = soup.find('a', href=re.compile(r'/chapter/\d+/'))
                if chapter_link:
                    chapter_url = chapter_link.get('href', '')
                    if not chapter_url.startswith('http'):
                        chapter_url = self.base_url + chapter_url

                    try:
                        chapter_resp = self.session.get(chapter_url, timeout=10)
                        if chapter_resp.status_code == 200:
                            chapter_soup = BeautifulSoup(chapter_resp.text, 'lxml')
                            content_elem = chapter_soup.find(['div', 'article'], class_=re.compile(r'content|chapter-text'))
                            if content_elem:
                                chapter_text = content_elem.get_text(strip=True)
                                content = summary + "\n\n" + chapter_text[:2000]
                    except:
                        pass

                # 提取数据（月票、推荐等）
                views = 0
                stats_elem = soup.find(['span', 'div'], class_=re.compile(r'vote|ticket|score'))
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
            print(f"获取起点内容失败: {e}")

        return {}

    def get_monthly_ticket_rank(self, limit: int = 30) -> List[Dict]:
        """
        获取月票榜（起点最权威的榜单）

        Args:
            limit: 数量限制

        Returns:
            月票榜小说列表
        """
        # 月票榜URL
        url = f"{self.base_url}/rank/monthticket"

        try:
            response = self.session.get(url, timeout=15)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'lxml')

                results = []
                book_items = soup.find_all(['div', 'li'], class_=re.compile(r'rank|book|item'))

                for item in book_items[:limit]:
                    link = item.find('a', href=re.compile(r'/book/\d+/'))
                    if link:
                        book_url = link.get('href', '')
                        if not book_url.startswith('http'):
                            book_url = self.base_url + book_url

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
            print(f"获取起点月票榜失败: {e}")

        return []
