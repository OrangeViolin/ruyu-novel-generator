from .base_crawler import BaseCrawler
from typing import List, Dict
from bs4 import BeautifulSoup
import json
import re


class JinjiangCrawler(BaseCrawler):
    """晋江文学城爬虫 - 专注狗血世情文"""

    def __init__(self, cookies: str = None):
        super().__init__(cookies)
        self.base_url = "http://www.jjwxc.net"
        # 晋江需要特殊的Referer
        self.session.headers.update({
            "Referer": "http://www.jjwxc.net/",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        })

    def get_hot_list(self, category: str = "all", limit: int = 30) -> List[Dict]:
        """
        获取热榜/排行榜内容

        Args:
            category: 分类 (all, 古代, 现代, 仙侠, 幻想)
            limit: 数量限制

        Returns:
            热门小说列表
        """
        results = []

        # 晋江积分排行榜（最真实的受欢迎程度）
        ranking_urls = {
            "all": f"{self.base_url}/onebook.php?noveltype=1&channelid=1",
            "modern": f"{self.base_url}/onebook.php?noveltype=2&channelid=1",
            "ancient": f"{self.base_url}/onebook.php?noveltype=3&channelid=1",
        }

        url = ranking_urls.get(category, ranking_urls["all"])

        try:
            response = self.session.get(url, timeout=15)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'lxml')

                # 查找小说列表项
                novel_items = soup.find_all('div', class_=re.compile(r'novel|item|book'))

                for item in novel_items[:limit]:
                    try:
                        # 提取小说链接
                        link = item.find('a', href=re.compile(r'/onebook\.php\?novelid=\d+'))
                        if not link:
                            continue

                        novel_url = link.get('href', '')
                        if not novel_url.startswith('http'):
                            novel_url = self.base_url + novel_url

                        # 提取标题
                        title = link.get_text(strip=True)

                        # 提取作者
                        author_elem = item.find(['span', 'a'], class_=re.compile(r'author|writer'))
                        author = author_elem.get_text(strip=True) if author_elem else ""

                        # 提取积分/点击数
                        score_elem = item.find(['span', 'div'], class_=re.compile(r'score|count|hits'))
                        score = 0
                        if score_elem:
                            score_text = score_elem.get_text(strip=True)
                            score = int(re.sub(r'\D', '', score_text))

                        # 提取简介
                        summary_elem = item.find(['div', 'p'], class_=re.compile(r'desc|summary|intro'))
                        summary = summary_elem.get_text(strip=True) if summary_elem else ""

                        results.append({
                            "url": novel_url,
                            "title": title,
                            "summary": summary[:200],
                            "author": author,
                            "views": score,
                        })
                    except Exception as e:
                        print(f"解析小说项失败: {e}")
                        continue

                self._random_delay(2, 4)

        except Exception as e:
            print(f"获取晋江热榜失败: {e}")

        return results

    def search(self, keyword: str, limit: int = 20) -> List[Dict]:
        """
        搜索晋江小说

        Args:
            keyword: 搜索关键词
            limit: 最多返回数量

        Returns:
            结果列表
        """
        results = []

        # 晋江搜索URL
        search_url = f"{self.base_url}/search.php"
        params = {
            "t": 1,  # 搜索类型：1=小说
            "kw": keyword,
            "order": "score",  # 按积分排序
        }

        try:
            response = self.session.get(search_url, params=params, timeout=15)

            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'lxml')

                # 查找搜索结果
                result_items = soup.find_all('div', class_=re.compile(r'result|item|novel'))

                for item in result_items[:limit]:
                    try:
                        link = item.find('a', href=re.compile(r'/onebook\.php\?novelid=\d+'))
                        if not link:
                            continue

                        novel_url = link.get('href', '')
                        if not novel_url.startswith('http'):
                            novel_url = self.base_url + novel_url

                        title = link.get_text(strip=True)

                        # 提取简介
                        summary = ""
                        desc_elem = item.find(['div', 'p'], class_=re.compile(r'desc|intro|summary'))
                        if desc_elem:
                            summary = desc_elem.get_text(strip=True)

                        results.append({
                            "url": novel_url,
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
            print(f"晋江搜索失败: {e}")

        return results

    def fetch_content(self, url: str) -> Dict:
        """
        获取晋江小说内容（简介和第一章）

        Args:
            url: 小说URL

        Returns:
            内容字典
        """
        try:
            response = self.session.get(url, timeout=15)

            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'lxml')

                # 提取标题
                title_elem = soup.find('h1') or soup.find(['span', 'div'], class_=re.compile(r'title|novel-name'))
                title = title_elem.get_text(strip=True) if title_elem else ""

                # 提取简介
                summary = ""
                desc_elem = soup.find(['div', 'span'], class_=re.compile(r'description|summary|intro|smallreadbody'))
                if desc_elem:
                    summary = desc_elem.get_text(strip=True)

                # 提取第一章内容（用于了解写作风格）
                content = summary
                chapter_link = soup.find('a', href=re.compile(r'/read\?novelid=\d+&chapterid=\d+'))
                if chapter_link:
                    chapter_url = chapter_link.get('href', '')
                    if not chapter_url.startswith('http'):
                        chapter_url = self.base_url + chapter_url

                    try:
                        chapter_resp = self.session.get(chapter_url, timeout=10)
                        if chapter_resp.status_code == 200:
                            chapter_soup = BeautifulSoup(chapter_resp.text, 'lxml')
                            content_elem = chapter_soup.find(['div', 'body'], class_=re.compile(r'novel-content|content|text'))
                            if content_elem:
                                # 只取前2000字作为样本
                                chapter_text = content_elem.get_text(strip=True)
                                content = summary + "\n\n" + chapter_text[:2000]
                    except:
                        pass

                # 提取作者
                author = ""
                author_elem = soup.find(['span', 'a'], class_=re.compile(r'author|writer'))
                if author_elem:
                    author = author_elem.get_text(strip=True)

                # 提取收藏数/积分
                views = 0
                stats_elem = soup.find(['span', 'div'], class_=re.compile(r'score|collection|favorite'))
                if stats_elem:
                    stats_text = stats_elem.get_text(strip=True)
                    # 提取数字
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
            print(f"获取晋江内容失败: {e}")

        return {}

    def get_hot_by_genre(self, genre: str = "现代言情", limit: int = 20) -> List[Dict]:
        """
        获取特定分类的热门小说

        Args:
            genre: 分类名称 (现代言情, 古代言情, 幻想言情, 仙侠)
            limit: 数量限制

        Returns:
            热门小说列表
        """
        # 使用搜索功能，按积分排序
        return self.search(genre, limit)
