"""
长文扩写引擎 - 将短篇（8-10章）扩写为长篇（180章，约60万字）

核心算法逻辑：
1. 结构映射：短篇1章 → 长篇1卷（18-20个细分章节）
2. 降速处理：将快节奏的一句话情节，扩写为3-5章细节
3. 情感细腻化：增加环境渲染、心理独白、对话细节
4. 结构一致性：每章保持主要矛盾、次要矛盾、情绪起伏线
"""

import json
from typing import List, Dict, Any, Optional
from backend.ai.ai_factory import AIClientFactory
from backend.database.models import Manuscript


class ExpansionEngine:
    """
    长文扩写引擎

    算法流程：
    1. 计算全局目标：短篇N章 → 长篇180章 → 每卷约180/N章
    2. 逐卷规划：将短篇章节大纲裂变为18-20个细分章节规划
    3. 逐章生成：基于规划，生成3000+字的细腻章节正文
    """

    # 目标配置
    TARGET_TOTAL_CHAPTERS = 180  # 目标总章数
    TARGET_WORD_COUNT = 600000   # 目标总字数（约60万字）
    WORDS_PER_CHAPTER = 3300     # 每章目标字数

    # 扩写策略配置
    EXPANSION_RATIO = 18         # 默认扩写倍数：1章 → 18章
    MIN_CHAPTERS_PER_VOLUME = 16 # 每卷最少章数
    MAX_CHAPTERS_PER_VOLUME = 22 # 每卷最多章数

    def __init__(self):
        self.ai_client = AIClientFactory.get_client()

    def calculate_expansion_plan(self, manuscript: Manuscript) -> Dict[str, Any]:
        """
        【核心算法第一步】计算全局扩写计划

        输入：短篇稿件（包含8-10章）
        输出：扩写计划（每卷应该包含多少章）

        算法逻辑：
        1. 获取短篇章节数 N
        2. 计算：目标180章 ÷ N = 每卷章数
        3. 动态调整：确保每卷在16-22章之间
        """
        short_chapters = manuscript.content.get('chapters', [])
        num_short_chapters = len(short_chapters)

        if num_short_chapters == 0:
            raise ValueError("短篇稿件没有章节数据")

        # 计算每卷目标章数
        base_chapters_per_volume = self.TARGET_TOTAL_CHAPTERS // num_short_chapters
        remainder = self.TARGET_TOTAL_CHAPTERS % num_short_chapters

        # 构建扩写计划
        expansion_plan = []
        current_total = 0

        for i in range(num_short_chapters):
            # 前remainder卷多分配一章
            chapters_in_volume = base_chapters_per_volume + (1 if i < remainder else 0)

            # 确保在合理范围内
            chapters_in_volume = max(self.MIN_CHAPTERS_PER_VOLUME,
                                   min(self.MAX_CHAPTERS_PER_VOLUME, chapters_in_volume))

            volume_info = {
                "volume_number": i + 1,
                "source_chapter_index": i,
                "source_chapter_title": short_chapters[i].get('title', f'第{i+1}章'),
                "source_chapter_summary": short_chapters[i].get('summary', ''),
                "target_chapter_count": chapters_in_volume,
                "chapter_range_start": current_total + 1,
                "chapter_range_end": current_total + chapters_in_volume
            }

            expansion_plan.append(volume_info)
            current_total += chapters_in_volume

        return {
            "total_volumes": num_short_chapters,
            "total_target_chapters": current_total,
            "expansion_plan": expansion_plan,
            "estimated_word_count": current_total * self.WORDS_PER_CHAPTER
        }

    def plan_volume_expansion(self, manuscript: Manuscript, chapter_index: int,
                             target_chapter_count: Optional[int] = None) -> Dict[str, Any]:
        """
        【核心算法第二步】规划单卷的章节结构

        将短篇的1章，规划为长篇1卷（18-20个细分章节）

        参数：
            manuscript: 短篇稿件对象
            chapter_index: 短篇章节索引（0-based）
            target_chapter_count: 目标章节数（如果为None，则自动计算）

        返回：
            包含卷标题、卷摘要、章节规划的字典
        """

        # 获取全局扩写计划（如果没指定章节数）
        if target_chapter_count is None:
            plan = self.calculate_expansion_plan(manuscript)
            if chapter_index >= len(plan['expansion_plan']):
                raise ValueError(f"章节索引 {chapter_index} 超出范围")
            target_chapter_count = plan['expansion_plan'][chapter_index]['target_chapter_count']

        short_chapters = manuscript.content.get('chapters', [])
        if chapter_index < 0 or chapter_index >= len(short_chapters):
            raise ValueError(f"章节索引 {chapter_index} 超出范围")

        target_chapter = short_chapters[chapter_index]

        # 获取上下文（前后章节）
        prev_chapter = short_chapters[chapter_index - 1] if chapter_index > 0 else None
        next_chapter = short_chapters[chapter_index + 1] if chapter_index < len(short_chapters) - 1 else None

        # 构建上下文提示
        context_parts = []
        if prev_chapter:
            context_parts.append(f"上一卷：{prev_chapter.get('title')} - {prev_chapter.get('summary', '')}")
        if next_chapter:
            context_parts.append(f"下一卷：{next_chapter.get('title')} - {next_chapter.get('summary', '')}")

        context_str = "\n".join(context_parts) if context_parts else "无"

        # 构建扩写提示词
        prompt = f"""# 长篇小说扩写任务 - 卷级章节规划

你是一位殿堂级长篇小说架构师。现在需要将一篇短篇小说的其中一章，扩写为长篇小说的一整卷内容。

## 目标结构要求
- 本卷需要规划 **{target_chapter_count} 个细分章节**
- 全书目标：180章，约60万字
- 每章目标：3300字左右

## 原始短篇信息
**书名：** {manuscript.title}

**本卷来源（短篇第{chapter_index + 1}章）：**
- 标题：{target_chapter.get('title')}
- 摘要：{target_chapter.get('summary')}
- 原文内容：
{target_chapter.get('content', '')[:2000]}

**上下文衔接：**
{context_str}

## 扩写核心策略

### 1. 降速处理（关键）
将短篇中快节奏的一句话情节，拆解为多个章节：
- 短篇："主角打败了敌人"（1句话）
- 长篇拆解：
  - 第1-3章：战前准备（收集情报、制定计划、心理建设）
  - 第4-6章：初次交锋（试探、挫败、反思）
  - 第7-12章：多线博弈（寻找盟友、揭露秘密、局势逆转）
  - 第13-16章：终极对决（正面对决、险象环生、绝地反击）
  - 第17-20章：战后余波（伤势处理、名利得失、埋下伏笔）

### 2. 情感细腻化
- **环境渲染**：不要直接说"下雨了"，要写"天空压得低低的，乌云像打翻的墨汁，雨滴砸在窗棂上，发出沉闷的声响"
- **心理独白**：挖掘人物内心最隐秘的恐惧、欲望、矛盾
- **对话张力**：每句对话都要有潜台词，不要直白表达意图
- **细节描写**：一秒钟的对峙可以写500字（肌肉紧绷、冷汗、尘埃、眼神）

### 3. 结构一致性
每个细分章节都必须包含：
- **主要矛盾**：本章的核心冲突是什么
- **次要矛盾**：支线情节的冲突
- **情绪起伏线**：情绪从A状态 → B状态的转换路径

## 章节结构规划模板

请按照以下节奏分配 {target_chapter_count} 个章节：

**铺垫期（前3-5章）：**
- 环境渲染、人物状态切入
- 危机初现、悬念埋设
- 情绪起点：平稳/压抑

**发展期（中10-14章）：**
- 多线并进、次要矛盾交织
- 局部高潮、情绪递进
- 信息逐步揭示、关系变化

**高潮期（后3-5章）：**
- 核心冲突爆发
- 情绪顶点：爆发/反转/升华
- 余韵处理、伏笔回收
- 为下一卷埋下钩子

## 输出要求

请严格以 JSON 格式返回本卷的 {target_chapter_count} 个章节规划：

```json
{{
  "volume_title": "本卷名称（体现核心事件）",
  "volume_summary": "本卷总体剧情脉络（300字左右）",
  "chapters": [
    {{
      "chapter_number": 1,
      "title": "章节标题（吸引人、体现核心事件）",
      "summary": "详细剧情摘要（200-300字，包含起承转合）",
      "main_conflict": "本章主要矛盾（一句话概括）",
      "sub_conflict": "本章次要矛盾（一句话概括）",
      "emotion_arc": "情绪转换路径（如：由压抑转为希望）",
      "key_events": ["关键事件1", "关键事件2"],
      "characters_involved": ["涉及的主要人物"]
    }}
  ]
}}
```

**重要提示：**
1. 章节数量必须正好是 {target_chapter_count} 章
2. 每章summary要详细，包含具体的情节发展
3. 确保逻辑连贯，从上一卷自然过渡到下一卷
4. 标题要有吸引力，体现本章核心事件
"""

        messages = [
            {"role": "system", "content": "你是一位殿堂级长篇小说架构师，擅长将短篇大纲裂变为超长篇细节架构。你的扩写风格：节奏细腻、情感丰富、逻辑严密。"},
            {"role": "user", "content": prompt}
        ]

        response = self.ai_client._call_api(messages, temperature=0.7, max_tokens=5000)

        try:
            from backend.utils.json_parser import parse_json_response
            result = parse_json_response(response)

            # 验证章节数量
            if 'chapters' in result:
                actual_count = len(result['chapters'])
                if actual_count != target_chapter_count:
                    # 如果数量不对，尝试调整
                    print(f"警告：AI生成了{actual_count}章，目标{target_chapter_count}章")

            return result
        except Exception as e:
            print(f"Expansion planning failed: {e}")
            print(f"AI Response: {response}")
            return None

    def generate_long_chapter(self,
                             volume_info: Dict[str, Any],
                             chapter_outline: Dict[str, Any],
                             context: str,
                             characters: List[Dict] = None,
                             previous_chapters_content: str = "") -> str:
        """
        【核心算法第三步】生成长篇单章正文

        将规划的大纲，扩写为3000字以上的细腻章节正文

        参数：
            volume_info: 本卷信息（标题、摘要）
            chapter_outline: 章节规划（标题、摘要、冲突、情绪等）
            context: 前情提要
            characters: 人物列表
            previous_chapters_content: 前几章的正文（用于保持连贯性）
        """

        # 构建人物描述
        char_desc = ""
        if characters:
            char_desc = "\n".join([
                f"- **{c.get('name', '未知')}**: {c.get('core_identity', c.get('description', ''))}"
                for c in characters[:10]  # 限制人物数量
            ])
        else:
            char_desc = "（无特定人物设定，根据需要自行创作）"

        # 构建详细提示词
        prompt = f"""# 长篇小说章节创作任务

你是一位殿堂级长篇小说家，擅长细腻的情感描写和宏大的场景构建。你的写作风格：画面感强、情感丰富、拒绝流水账。

## 本卷背景
**卷名：** {volume_info.get('volume_title', '未知卷')}
**卷摘要：** {volume_info.get('volume_summary', '无')}

## 当前章节创作要求
**章节标题：** {chapter_outline.get('title', '未命名章节')}

**章节摘要：**
{chapter_outline.get('summary', '无摘要')}

**本章冲突设定：**
- 主要矛盾：{chapter_outline.get('main_conflict', '未设定')}
- 次要矛盾：{chapter_outline.get('sub_conflict', '未设定')}

**情绪路径：**
{chapter_outline.get('emotion_arc', '未设定')}

**关键事件：**
{', '.join(chapter_outline.get('key_events', []))}

**涉及人物：**
{', '.join(chapter_outline.get('characters_involved', []))}

## 前情提要
{context if context else '（这是第一章，无前情）'}

## 登场人物
{char_desc}

---

## 写作核心教导（重要！）

### 1. 降速与细节（关键）
**错误示例：**
> 他打败了敌人，赢得了胜利。

**正确示例：**
> 林凡的肌肉绷得像拉满的弓弦，冷汗顺着额角滑落，刺得眼睛生疼。对面的周天龙缓缓举起刀，刀锋上的血迹在夕阳下泛着诡异的光。
>
> "你真的以为，赢那么容易吗？"周天龙的声音像从喉咙深处挤出来的。
>
> 林凡没有回答。他的目光锁定在对方握刀的手腕上——那里有一丝不易察觉的颤抖。他知道，机会只有一次。
>
> 风停了。远处传来几声乌鸦的啼叫。
>
> 就在周天龙出刀的瞬间，林凡动了……

**教学：** 一秒钟的对峙，可以写500字。不要跳过细节！

### 2. 心理独白
深入挖掘主角在这一刻最隐秘的恐惧或渴望：
- 他表面上在笑，心里在颤抖——因为他知道，一旦失败，失去的不只是性命，还有……
- 她点了点头，像是要说服自己。但那个念头像种子一样在心里发了芽：如果当初……

### 3. 环境渲染
环境必须服务于人物心境：
- **开心时**：阳光透过树叶洒下斑驳的光影，鸟叫声都像是在唱歌
- **压抑时**：天空压得低低的，空气黏稠得让人喘不过气
- **紧张时**：静得可怕，连尘埃落地的声音似乎都能听见

### 4. 对话张力
对话要有潜台词：
- **直白版（避免）**："我很生气，我要杀了你！"
- **潜台词版（推荐）**："你还记得三年前的那个雨夜吗？"

### 5. 拒绝流水账
- 不要写成："然后A做了B，然后C做了D，然后E做了F"
- 要有起承转合：开篇吸引 → 逐步展开 → 冲突升级 → 高潮 → 余韵

---

## 字数与格式要求
- **字数**：3300字以上（可以多，不能太少）
- **格式**：直接输出正文，不需要任何说明或标注
- **风格**：
  - 段落不宜过长（3-5句话一段）
  - 多用短句增强节奏感
  - 适当使用留白（空一行）控制阅读节奏
  - 对话和叙述交替进行

---

现在请开始创作本章正文：
"""

        messages = [
            {"role": "system", "content": "你是一位顶级长篇小说作家，擅长细腻的情感描写、生动的场景构建和深刻的人物刻画。你的文字有电影般的画面感。"},
            {"role": "user", "content": prompt}
        ]

        # 使用更大的token限制确保输出足够长
        response = self.ai_client._call_api(messages, temperature=0.85, max_tokens=8000)

        return response

    def generate_full_outline_plan(self, manuscript: Manuscript) -> Dict[str, Any]:
        """
        【一次性规划】生成完整的长篇扩写大纲

        一次性将整个短篇扩写为180章的完整规划，方便用户预览整体结构

        返回格式：
        {
            "total_chapters": 180,
            "total_volumes": 10,
            "volumes": [
                {
                    "volume_number": 1,
                    "title": "第一卷标题",
                    "summary": "第一卷摘要",
                    "chapters": [章节规划列表]
                },
                ...
            ]
        }
        """
        plan = self.calculate_expansion_plan(manuscript)
        volumes_data = []

        for volume_plan in plan['expansion_plan']:
            chapter_index = volume_plan['source_chapter_index']
            target_count = volume_plan['target_chapter_count']

            volume_data = self.plan_volume_expansion(
                manuscript,
                chapter_index,
                target_count
            )

            if volume_data:
                volumes_data.append({
                    "volume_number": volume_plan['volume_number'],
                    "source_chapter_title": volume_plan['source_chapter_title'],
                    "chapter_range_start": volume_plan['chapter_range_start'],
                    "chapter_range_end": volume_plan['chapter_range_end'],
                    "target_chapter_count": target_count,
                    **volume_data
                })

        return {
            "manuscript_title": manuscript.title,
            "total_chapters": plan['total_target_chapters'],
            "total_volumes": plan['total_volumes'],
            "estimated_word_count": plan['estimated_word_count'],
            "volumes": volumes_data
        }
