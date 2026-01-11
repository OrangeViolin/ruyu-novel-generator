from .base_crawler import BaseCrawler
from typing import List, Dict
from bs4 import BeautifulSoup
import json
import re


class ZhihuCrawler(BaseCrawler):
    """知乎爬虫"""

    def __init__(self, cookies: str = None):
        super().__init__(cookies)
        self.base_url = "https://www.zhihu.com"
        self.search_url = "https://www.zhihu.com/api/v4/search_v3"

    def search(self, keyword: str, limit: int = 20) -> List[Dict]:
        """
        搜索知乎内容

        Args:
            keyword: 搜索关键词
            limit: 最多返回数量

        Returns:
            结果列表
        """
        results = []
        params = {
            "q": keyword,
            "type": "content",
            "limit": limit,
        }

        try:
            response = self.session.get(self.search_url, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                for item in data.get("data", []):
                    if item.get("type") == "answer":
                        obj = item.get("object", {})
                        results.append({
                            "url": f"{self.base_url}/question/{obj.get('question', {}).get('id')}/answer/{obj.get('id')}",
                            "title": obj.get("question", {}).get("title", ""),
                            "summary": obj.get("excerpt", ""),
                            "author": obj.get("author", {}).get("name", ""),
                            "views": obj.get("voteup_count", 0),
                        })
            self._random_delay()
        except Exception as e:
            print(f"知乎搜索失败: {e}")

        return results

    def fetch_content(self, url: str) -> Dict:
        """
        获取知乎回答内容

        Args:
            url: 回答URL

        Returns:
            内容字典
        """
        try:
            # 如果URL包含/question/格式
            match = re.search(r'/question/(\d+)/answer/(\d+)', url)
            if match:
                question_id = match.group(1)
                answer_id = match.group(2)
                api_url = f"{self.base_url}/api/v4/answers/{answer_id}"
                response = self.session.get(api_url, timeout=10)

                if response.status_code == 200:
                    data = response.json()
                    content = self.clean_html(data.get("content", ""))

                    return {
                        "title": data.get("question", {}).get("title", ""),
                        "content": content,
                        "author": data.get("author", {}).get("name", ""),
                        "views": data.get("voteup_count", 0),
                        "url": url,
                    }
        except Exception as e:
            print(f"获取知乎内容失败: {e}")

        return {}

    def get_hot_answers(self, topic: str = "小说", limit: int = 20) -> List[Dict]:
        """
        获取热榜/推荐回答

        Args:
            topic: 话题关键词
            limit: 数量限制

        Returns:
            推荐内容列表
        """
        # 搜索相关问题下的高赞回答
        search_results = self.search(topic, limit)
        # 按点赞数排序
        search_results.sort(key=lambda x: x.get("views", 0), reverse=True)
        return search_results[:limit]
