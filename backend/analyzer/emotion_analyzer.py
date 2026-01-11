from typing import Dict, List
import re


class EmotionAnalyzer:
    """情绪分析器"""

    def __init__(self):
        # 情绪类型关键词
        self.emotion_keywords = {
            "anger": ["愤怒", "生气", "暴怒", "怒火", "恨"],
            "sadness": ["难过", "悲伤", "痛苦", "绝望", "心碎"],
            "surprise": ["震惊", "不敢", "意外", "竟然", "居然"],
            "joy": ["开心", "快乐", "幸福", "甜蜜", "兴奋"],
            "fear": ["害怕", "恐惧", "担心", "紧张", "不安"],
            "disgust": ["恶心", "厌恶", "反感", "排斥"],
            "shame": ["羞耻", "丢脸", "无地自容", "抬不起头"],
        }

    def analyze(self, text: str) -> Dict:
        """
        分析文本情绪

        Args:
            text: 文本内容

        Returns:
            情绪分析结果
        """
        emotion_scores = {}

        for emotion, keywords in self.emotion_keywords.items():
            score = 0
            for keyword in keywords:
                score += len(re.findall(keyword, text))
            emotion_scores[emotion] = score

        # 找出主导情绪
        dominant = max(emotion_scores.items(), key=lambda x: x[1])

        return {
            "emotion_scores": emotion_scores,
            "dominant_emotion": dominant[0] if dominant[1] > 0 else "neutral",
            "total_intensity": sum(emotion_scores.values()),
        }

    def detect_emotional_hooks(self, text: str) -> List[str]:
        """
        检测情绪钩子（能引发强烈情绪反应的情节点）

        Args:
            text: 文本内容

        Returns:
            情绪钩子列表
        """
        hooks = []

        # 常见情绪钩子模式
        patterns = {
            "背叛": r"(?:(?:竟然|居然|竟然)??(?:出轨|背叛|和别人在一起))",
            "身份反转": r"(?:原来|没想到|竟然)(?:他|她|那个人)(?:是|竟然是)",
            "死亡": r"(?:死|去世|离开)(?:了|的)",
            "绝望": r"(?:万念俱灰|生不如死|崩溃|绝望)",
            "复仇": r"(?:复仇|报复|让他们付出代价)",
        }

        for hook_type, pattern in patterns.items():
            matches = re.findall(pattern, text)
            if matches:
                hooks.append({
                    "type": hook_type,
                    "count": len(matches),
                    "examples": matches[:3]
                })

        return hooks
