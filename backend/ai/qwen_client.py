import dashscope
from dashscope import Generation
from typing import Dict, List, Optional, Any
import json
import re


class QwenClient:
    """通义千问AI客户端"""

    def __init__(self, api_key: str, model: str = "qwen-plus"):
        """
        初始化客户端

        Args:
            api_key: 通义千问API密钥
            model: 模型名称，默认qwen-plus
        """
        dashscope.api_key = api_key
        self.model = model

    def _call_api(self, messages: List[Dict], **kwargs) -> str:
        """
        调用通义千问API

        Args:
            messages: 消息列表
            **kwargs: 其他参数

        Returns:
            模型返回的文本
        """
        response = Generation.call(
            model=self.model,
            messages=messages,
            result_format="message",
            **kwargs
        )

        if response.status_code == 200:
            return response.output.choices[0].message.content
        else:
            raise Exception(f"API调用失败: {response.message}")

    def generate_outline(
        self,
        theme: str,
        elements: List[str],
        background: str = "港澳/金牌播报员",
        target_words: int = 10000
    ) -> Dict:
        """
        生成小说大纲

        Args:
            theme: 主题
            elements: 必须包含的元素（如["出轨", "掉马", "假死", "豪门恩怨"]）
            background: 故事背景
            target_words: 目标字数

        Returns:
            大纲字典
        """
        prompt = f"""
请生成一个狗血世情文的大纲，要求如下：

【主题】{theme}

【必须包含的元素】
{', '.join(elements)}

【故事背景】{background}

【要求】
1. 情绪钩子要强，剧情要有起伏
2. 包含错认性别、黄谣、误会掉马等情节
3. 要有"追妻火葬场"的情节
4. 目标字数约{target_words}字
5. 结构要有起承转合

请以JSON格式返回，包含以下字段：
{{
    "title": "小说标题",
    "logline": "一句话简介",
    "characters": [
        {{"name": "角色名", "role": "主角/配角", "description": "描述", "secret": "隐藏身份"}}
    ],
    "plot_structure": {{
        "opening": "开篇设定（500字）",
        "development": "矛盾发展（3000字）",
        "climax": "高潮转折（4000字）",
        "ending": "结局收尾（2500字）"
    }},
    "key_scenes": [
        {{"chapter": 1, "title": "场景名", "elements": ["元素1", "元素2"], "summary": "概要"}}
    ],
    "emotional_beats": ["情绪节奏点1", "情绪节奏点2"]
}}
"""

        messages = [{"role": "user", "content": prompt}]
        response = self._call_api(messages, temperature=0.8)

        # 尝试解析JSON
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            try:
                outline = json.loads(json_match.group())
                return outline
            except json.JSONDecodeError:
                pass

        # 如果解析失败，返回原始响应
        return {"raw_response": response}

    def generate_chapter(
        self,
        outline: Dict,
        chapter_info: Dict,
        style: str = "狗血世情",
        context: Optional[str] = None
    ) -> str:
        """
        生成单个章节内容

        Args:
            outline: 完整大纲
            chapter_info: 章节信息 {"title": "", "summary": "", "elements": [], "target_words": 2000}
            style: 写作风格
            context: 前文摘要（保持连贯性）

        Returns:
            章节内容
        """
        characters_str = "\n".join([
            f"- {c['name']}: {c.get('description', '')}"
            for c in outline.get("characters", [])
        ])

        context_part = f"【前文摘要】\n{context}\n" if context else ""
        
        prompt = f"""
请根据以下信息生成一个章节：

【章节信息】
标题：{chapter_info.get('title', '')}
概要：{chapter_info.get('summary', '')}
目标字数：{chapter_info.get('target_words', 2000)}字
涉及元素：{', '.join(chapter_info.get('elements', []))}

【人物设定】
{characters_str}

【写作风格】
{style}
- 港澳背景，有时代感
- 播报员式的叙述口吻
- 情绪张力要强
- 细节描写丰富

{context_part}

请直接生成章节内容，不要有说明文字，要自然流畅。
"""

        messages = [{"role": "user", "content": prompt}]
        response = self._call_api(messages, temperature=0.9, max_tokens=3000)

        return response

    def polish_text(
        self,
        text: str,
        focus: str = "情绪钩子",
        style: str = "港澳播报员口吻"
    ) -> str:
        """
        润色文本

        Args:
            text: 原文
            focus: 优化重点（情绪钩子、衔接、语言风格等）
            style: 目标风格

        Returns:
            润色后的文本
        """
        prompt = f"""
请润色以下文本，重点优化{focus}：

原文：
{text}

要求：
1. 保持{style}
2. 增强情绪张力
3. 使语言更生动
4. 保持原意不变

只返回润色后的文本，不要有解释。
"""

        messages = [{"role": "user", "content": prompt}]
        response = self._call_api(messages, temperature=0.7)

        return response

    def extract_plot_elements(self, text: str) -> Dict:
        """
        从文本中提取情节元素

        Args:
            text: 文本内容

        Returns:
            提取的元素 {"tags": [], "emotions": [], "key_words": []}
        """
        prompt = f"""
请分析以下文本，提取关键信息：

文本：
{text[:2000]}  # 限制长度

请以JSON格式返回：
{{
    "plot_tags": ["出轨", "掉马", "假死", "豪门恩怨"],
    "emotion_type": "愤怒/悲伤/复仇/甜蜜",
    "emotion_intensity": 1-10的评分,
    "key_characters": ["角色名1", "角色名2"],
    "key_words": ["关键词1", "关键词2"]
}}
"""

        messages = [{"role": "user", "content": prompt}]
        response = self._call_api(messages, temperature=0.3)

        # 尝试解析JSON
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            try:
                result = json.loads(json_match.group())
                return result
            except json.JSONDecodeError:
                pass

        return {"raw_response": response}

    def generate_title(self, outline: Dict, elements: List[str]) -> List[str]:
        """
        生成多个候选标题

        Args:
            outline: 大纲
            elements: 包含的元素

        Returns:
            标题列表
        """
        prompt = f"""
请根据以下信息生成10个吸引人的小说标题：

主题：{outline.get('logline', '')}
元素：{', '.join(elements)}

要求：
1. 有狗血感
2. 能引起好奇
3. 适合网文平台
4. 字数在10-20字之间

只返回标题列表，每行一个。
"""

        messages = [{"role": "user", "content": prompt}]
        response = self._call_api(messages, temperature=0.9)

        titles = [line.strip() for line in response.split('\n') if line.strip()]
        return titles[:10]
