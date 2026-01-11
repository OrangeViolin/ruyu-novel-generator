from typing import List, Dict, Optional
import re
from backend.ai.deepseek_client import DeepSeekClient


class PlotExtractor:
    """情节提取器"""

    def __init__(self, ai_client: Optional[DeepSeekClient] = None):
        """
        初始化

        Args:
            ai_client: AI客户端（可选，不传则使用规则提取）
        """
        self.ai_client = ai_client

        # 情节关键词库
        self.plot_keywords = {
            "出轨": ["出轨", "背叛", "第三者", "小三", "外遇", "劈腿", "婚外情"],
            "掉马": ["掉马", "身份", "真实身份", "原来", "竟然是", "隐藏"],
            "假死": ["假死", "死亡", "葬礼", "消失", "三年后", "归来"],
            "豪门": ["豪门", "总裁", "董事长", "首富", "集团", "家族"],
            "误会": ["误会", "不知道", "原来", "真相", "解释"],
            "复仇": ["复仇", "报复", "惩罚", "代价"],
            "追妻": ["追妻", "火葬场", "求原谅", "后悔", "跪求"],
            "错认性别": ["女扮男装", "男扮女装", "性别", "原来她是", "原来他是"],
            "黄谣": ["谣言", "污蔑", "造谣", "清白", "毁谤"],
        }

    def extract_by_rules(self, text: str) -> Dict:
        """
        基于规则提取情节标签

        Args:
            text: 文本内容

        Returns:
            提取结果 {"tags": [], "confidence": {}}
        """
        tags = []
        confidence = {}

        for plot_type, keywords in self.plot_keywords.items():
            count = 0
            for keyword in keywords:
                count += len(re.findall(keyword, text))

            if count > 0:
                tags.append(plot_type)
                # 根据出现次数计算置信度
                confidence[plot_type] = min(count * 0.1, 1.0)

        return {
            "tags": tags,
            "confidence": confidence,
            "method": "rules"
        }

    def extract_by_ai(self, text: str) -> Dict:
        """
        基于AI提取情节标签

        Args:
            text: 文本内容

        Returns:
            提取结果
        """
        if not self.ai_client:
            return self.extract_by_rules(text)

        try:
            result = self.ai_client.extract_plot_elements(text)
            return {
                "tags": result.get("plot_tags", []),
                "emotions": result.get("emotion_type", ""),
                "emotion_intensity": result.get("emotion_intensity", 0),
                "method": "ai"
            }
        except Exception as e:
            print(f"AI提取失败，使用规则方法: {e}")
            return self.extract_by_rules(text)

    def extract_key_sentences(self, text: str, min_length: int = 20) -> List[str]:
        """
        提取关键句子（情绪钩子、高潮情节）

        Args:
            text: 文本
            min_length: 最小句子长度

        Returns:
            关键句列表
        """
        sentences = re.split(r'[。！？\n]', text)
        key_sentences = []

        # 情绪钩子关键词
        emotion_words = ["震惊", "不敢", "没想到", "竟然", "居然", "原来", "真相", "崩溃", "绝望", "狂喜"]

        for sent in sentences:
            sent = sent.strip()
            if len(sent) >= min_length:
                # 包含情绪钩子
                for word in emotion_words:
                    if word in sent:
                        key_sentences.append(sent)
                        break

        return key_sentences

    def calculate_emotion_score(self, text: str) -> int:
        """
        计算情绪强度评分

        Args:
            text: 文本

        Returns:
            评分(0-10)
        """
        # 情绪词库及权重
        emotion_words = [
            (["崩溃", "绝望", "撕心裂肺", "生不如死", "万念俱灰"], [9, 10]),
            (["愤怒", "狂怒", "震惊", "不敢置信", "晴天霹雳"], [7, 8]),
            (["心痛", "痛苦", "难过", "委屈", "不甘"], [5, 6]),
            (["疑惑", "担心", "紧张", "慌乱"], [3, 4]),
        ]

        total_score = 0
        for words, score_range in emotion_words:
            for word in words:
                count = len(re.findall(word, text))
                total_score += count * sum(score_range) / 2

        # 归一化到0-10
        return min(int(total_score), 10)
