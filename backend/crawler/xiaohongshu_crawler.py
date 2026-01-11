from .base_crawler import BaseCrawler
from typing import List, Dict
from bs4 import BeautifulSoup
import json


class XiaohongshuCrawler(BaseCrawler):
    """小红书爬虫"""

    def __init__(self, cookies: str = None):
        super().__init__(cookies)
        self.base_url = "https://www.xiaohongshu.com"

    def search(self, keyword: str, limit: int = 20) -> List[Dict]:
        """
        搜索小红书内容

        Args:
            keyword: 搜索关键词
            limit: 最多返回数量

        Returns:
            结果列表

        注意：小红书有较强的反爬机制，需要登录Cookie
        """
        results = []

        # 小红书的搜索API会动态变化，这里提供基础框架
        search_url = f"{self.base_url}/web/search/simplify"
        params = {
            "keyword": keyword,
            "page": 1,
            "page_size": limit,
        }

        try:
            response = self.session.get(search_url, params=params, timeout=10)

            # 小红书返回的数据通常是嵌入在script中的JSON
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'lxml')

                # 查找包含数据的script标签
                for script in soup.find_all('script'):
                    if 'window.__INITIAL_STATE__' in script.text:
                        # 提取JSON数据
                        json_str = script.text.split('window.__INITIAL_STATE__=')[1].split(';(function')[0]
                        data = json.loads(json_str)

                        # 解析笔记列表（具体路径根据实际API调整）
                        items = data.get("search", {}).get("noteList", [])
                        for item in items[:limit]:
                            note = item.get("noteCard", {})
                            results.append({
                                "url": f"{self.base_url}/explore/{note.get('id', '')}",
                                "title": note.get("title", ""),
                                "summary": note.get("desc", ""),
                                "author": note.get("user", {}).get("nickname", ""),
                                "views": note.get("interactInfo", {}).get("likedCount", 0),
                            })
                        break
        except Exception as e:
            print(f"小红书搜索失败: {e}")

        return results

    def fetch_content(self, url: str) -> Dict:
        """
        获取小红书笔记内容

        Args:
            url: 笔记URL

        Returns:
            内容字典
        """
        try:
            response = self.session.get(url, timeout=10)
            soup = BeautifulSoup(response.text, 'lxml')

            # 提取笔记内容
            title = soup.find('meta', property='og:title')
            desc = soup.find('meta', property='og:description')

            # 尝试从script中提取完整内容
            content = ""
            for script in soup.find_all('script'):
                if 'window.__INITIAL_STATE__' in script.text:
                    try:
                        json_str = script.text.split('window.__INITIAL_STATE__=')[1].split(';(function')[0]
                        data = json.loads(json_str)
                        note = data.get("note", {}).get("noteDetail", {})
                        content = note.get("desc", "")
                    except:
                        pass
                    break

            if not content and desc:
                content = desc.get("content", "")

            return {
                "title": title.get("content", "") if title else "",
                "content": content,
                "author": "",
                "views": 0,
                "url": url,
            }
        except Exception as e:
            print(f"获取小红书内容失败: {e}")

        return {}
