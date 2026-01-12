from openai import OpenAI
from typing import Dict, List, Optional, Any
import json
import re


class DeepSeekClient:
    """DeepSeek AI客户端"""

    def __init__(self, api_key: str, model: str = "deepseek-chat"):
        """
        初始化客户端

        Args:
            api_key: DeepSeek API密钥
            model: 模型名称，默认deepseek-chat
        """
        self.client = OpenAI(
            api_key=api_key,
            base_url="https://api.deepseek.com"
        )
        self.model = model

    def _call_api(self, messages: List[Dict], **kwargs) -> str:
        """
        调用DeepSeek API（带重试机制）

        Args:
            messages: 消息列表
            **kwargs: 其他参数

        Returns:
            模型返回的文本
        """
        import time

        # 设置默认参数
        params = {
            "model": self.model,
            "messages": messages,
            "temperature": kwargs.get("temperature", 0.7),
            "timeout": kwargs.get("timeout", 120.0)  # 设置超时
        }

        # 添加可选参数
        if "max_tokens" in kwargs:
            params["max_tokens"] = kwargs["max_tokens"]

        # 重试机制
        max_retries = 3
        retry_delay = 2  # 秒

        for attempt in range(max_retries):
            try:
                response = self.client.chat.completions.create(**params)
                return response.choices[0].message.content

            except Exception as e:
                if attempt < max_retries - 1:
                    print(f"API调用失败（第{attempt + 1}次尝试）: {e}")
                    print(f"等待{retry_delay}秒后重试...")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # 指数退避
                else:
                    print(f"API调用失败，已达最大重试次数: {e}")
                    raise

    def chat(self, prompt: str, temperature: float = 0.7, **kwargs) -> str:
        """
        通用对话接口 - 简化的API调用

        Args:
            prompt: 用户提示词
            temperature: 温度参数（0-1）
            **kwargs: 其他参数

        Returns:
            AI回复内容
        """
        messages = [{"role": "user", "content": prompt}]
        return self._call_api(messages, temperature=temperature, **kwargs)

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
        prompt = f"""请生成一个狗血世情文的大纲，要求如下：

【主题】{theme}

【必须包含的元素】
{', '.join(elements)}

【故事背景】{background}

【情绪要求】⚠️ 重要：
- 情绪要极度激烈、极端化
- 每个情节都要有强烈的冲突和反转
- 使用极端的词汇：崩溃、绝望、撕心裂肺、万念俱灰、血债血偿、同归于尽
- 让读者情绪完全被带动，愤怒、心痛、震惊、痛快
- 不要有任何平淡的过渡，每个转折都要戏剧化

【标题要求】⚠️ 重要：
- 标题必须吸眼球、有冲击力
- 使用数字、对比、悬念等元素
- 例如："丈夫当众出轨，我假死三年归来，他跪求原谅我笑了"
- 例如："发现丈夫和小妹的聊天记录，我当场跳楼，三年后葬礼上我出现了"
- 例如："豪门弃女假死销户，携千亿归来，全城大佬排队道歉"

【要求】
1. 情绪钩子要强，剧情要有起伏
2. 包含错认性别、黄谣、误会掉马等情节
3. 要有"追妻火葬场"的情节
4. 目标字数约{target_words}字
5. 结构要有起承转合

请以JSON格式返回，包含以下字段：
{{
    "title": "吸睛标题（要非常吸引眼球，有冲击力）",
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

只返回JSON，不要有其他说明文字。"""

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

        # 前文摘要
        if context:
            context_part = "【前文摘要】\n" + context + "\n"
        else:
            context_part = ""

        prompt = f"""请根据以下信息生成一个章节：

【章节信息】
标题：{chapter_info.get('title', '')}
概要：{chapter_info.get('summary', '')}
目标字数：{chapter_info.get('target_words', 2000)}字
涉及元素：{', '.join(chapter_info.get('elements', []))}

【人物设定】
{characters_str}

【写作风格 - 极致情绪化】⚠️ 必须遵守：
- 情绪要极其激烈、极端化
- 每句话都要有情绪张力，不要有任何平淡的句子
- 大量使用感叹号！问号？省略号...
- 使用极端词汇：撕心裂肺、崩溃、绝望、血债血偿、同归于尽、万念俱灰、生不如死
- 对话要充满情绪：尖叫、怒吼、冷笑、嘲讽、哀求
- 心理描写要极端：心如刀绞、痛不欲生、恨之入骨、悔恨交加
- 场景描写要有冲击力：鲜血、眼泪、破碎、毁灭
- 让读者感受到极致的情绪冲击

【故事背景】
{style}
- 港澳背景，有时代感
- 播报员式的叙述口吻
- 极度戏剧化的情节推进

{context_part}

请直接生成章节内容，不要有任何说明和过渡，直接进入激烈的情节！"""

        messages = [{"role": "user", "content": prompt}]
        response = self._call_api(messages, temperature=0.9, max_tokens=4000)

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
        prompt = f"""请润色以下文本，使其情绪更加激烈：

原文：
{text}

【润色要求】⚠️ 必须遵守：
- 重点优化：{focus}
- 情绪要极其激烈、极端化
- 大量使用感叹号！问号？省略号...
- 使用极端词汇：撕心裂肺、崩溃、绝望、血债血偿、万念俱灰
- 对话要充满情绪：尖叫、怒吼、冷笑、嘲讽、哀求
- 心理描写要极端：心如刀绞、痛不欲生、恨之入骨
- 保持{style}的叙述口吻
- 增强情绪张力，使语言更生动更有冲击力
- 保持原意不变，但表达要更激烈

只返回润色后的文本，不要有任何解释！"""

        messages = [{"role": "user", "content": prompt}]
        response = self._call_api(messages, temperature=0.8)

        return response

    def extract_plot_elements(self, text: str) -> Dict:
        """
        从文本中提取情节元素 - 定制化分析版

        Args:
            text: 文本内容

        Returns:
            详细分析结果
        """
        # 限制文本长度，但保留足够的内容进行分析
        analysis_text = text[:3000] if len(text) > 3000 else text

        prompt = f"""请对以下文本进行深入的情节分析：

【文本内容】
{analysis_text}

【分析要求】⚠️ 请按照以下框架进行分析：

请以JSON格式返回完整的分析报告：
{{
    "core_conflict": "文章核心冲突是什么？详细描述主要矛盾、对立面、冲突根源（100-200字）",
    "information_gap": "信息差分析：哪些信息在谁之间被隐瞒？信息差如何推动剧情？信息差的揭露时机和方式？（150-250字）",
    "core_task": "核心任务是什么？主角或关键人物要达成什么目标？任务的紧迫性和重要性？（100-200字）",
    "character_profile": {{
        "main_characters": [
            {{
                "name": "角色名",
                "role": "主角/反派/配角",
                "personality": "性格特点（用3-5个形容词描述，如：固执、善良、精明、脆弱）",
                "motivation": "核心动机和驱动力",
                "actions": "关键行为和选择",
                "secret": "该角色掌握或隐瞒的关键信息（如果有）"
            }}
        ],
        "relationships": [
            {{"from": "角色A", "to": "角色B", "type": "背叛/爱恨/利用/竞争", "description": "关系本质和发展轨迹"}}
        ]
    }},
    "plot_tags": ["标签1", "标签2", "标签3"]  // 从现有标签库选择：出轨、掉马、假死、豪门恩怨、追妻火葬场、误会、复仇、区别对待、公开处刑等
}}

【分析要点】
1. 核心冲突要明确指出矛盾双方和冲突本质
2. 信息差要详细分析谁瞒谁、瞒什么、为什么瞒、怎么揭露
3. 核心任务要清晰具体，体现主角的目标和行动方向
4. 人设要立体丰满，包含性格、动机、行为模式、内心秘密

只返回JSON，不要有任何其他说明文字。"""

        messages = [{"role": "user", "content": prompt}]
        response = self._call_api(messages, temperature=0.5)

        # 尝试解析JSON
        json_match = re.search(r'\{[\s\S]*\}', response, re.DOTALL)
        if json_match:
            try:
                result = json.loads(json_match.group())
                return result
            except json.JSONDecodeError:
                pass

        return {"raw_response": response, "error": "JSON解析失败"}

    def generate_title(self, outline: Dict, elements: List[str]) -> List[str]:
        """
        生成多个候选标题

        Args:
            outline: 大纲
            elements: 包含的元素

        Returns:
            标题列表
        """
        prompt = f"""请根据以下信息生成15个极其吸引眼球的狗血小说标题：

主题：{outline.get('logline', '')}
元素：{', '.join(elements)}

【标题要求】⚠️ 必须遵守：
1. 必须吸睛、有冲击力、让人一看就想点
2. 使用数字+对比+悬念的组合
3. 包含极端词汇：死、血、跪、哭、假、真相、复仇
4. 使用感叹号！问号？制造悬念
5. 标题格式参考：
   - "丈夫当众出轨，我假死三年归来，他跪求原谅我笑了"
   - "发现丈夫和妹妹的聊天记录，我当场跳楼"
   - "豪门弃女假死销户，携千亿归来全城大佬排队道歉"
   - "被迫嫁给植物人，三年后他醒了我却要离婚"
   - "被污蔑出轨那天，我跳楼了，三年后葬礼上我出现了"
   - "结婚十年才发现，丈夫竟然是杀父仇人的儿子"
   - "怀孕七月被逼流产，我微笑着签了离婚协议"

6. 字数在20-35字之间
7. 每个标题都要有强烈的情绪冲突和反转

只返回标题列表，每行一个，不要有编号。"""

        messages = [{"role": "user", "content": prompt}]
        response = self._call_api(messages, temperature=1.0)  # 提高温度增加创意

        titles = [line.strip() for line in response.split('\n') if line.strip()]
        # 去除可能的编号前缀
        titles = [re.sub(r'^[\d\.\s]+', '', t) for t in titles]
        # 去除引号
        titles = [t.strip('"\'《》') for t in titles]
        return [t for t in titles if len(t) > 10][:15]
