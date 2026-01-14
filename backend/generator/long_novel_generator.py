import json
from concurrent.futures import ThreadPoolExecutor
from typing import List, Dict, Any, Optional
from datetime import datetime
from backend.ai.ai_factory import AIClientFactory
from backend.database.models import NovelProject, Manuscript, LongNovelMapping

class LongNovelGenerator:
    def __init__(self):
        self.ai_client = AIClientFactory.get_client()

    def expand_volume_outline(self, manuscript: Manuscript, chapter_index: int) -> Dict[str, Any]:
        """将短篇的一章扩展为长篇的一卷 (约10章)"""
        
        # 1. 获取上下文
        short_chapters = manuscript.content.get('chapters', [])
        if chapter_index < 0 or chapter_index >= len(short_chapters):
            raise ValueError(f"章节索引 {chapter_index} 超出范围")

        target_chapter = short_chapters[chapter_index]
        prev_chapter = short_chapters[chapter_index - 1] if chapter_index > 0 else None
        
        settings = {}
        # 尝试从步骤中获取设定 (如果没有直接传，可能需要查询 ManuscriptStep，这里简化)
        # 实际项目中应该查询 ManuscriptStep where step_name='settings'
        # temporary: 使用 manuscript.content 中的隐含信息
        
        title = manuscript.title
        
        prompt = f"""你是长篇小说架构师。我们需要将一篇短篇小说的第 {chapter_index + 1} 章扩展为长篇小说的一整卷（约10章，每章3000字以上）。
        
**长篇小说基本信息:**
标题: {title}

**短篇原著 - 第 {chapter_index + 1} 章内容 (本卷核心):**
标题: {target_chapter.get('title')}
摘要: {target_chapter.get('summary')}
原文: 
{target_chapter.get('content')}

**扩展要求:**
1. **节奏放缓**: 长篇小说需要细腻的情感铺垫、环境描写和心理活动，不要像短篇那样极速推进。
2. **细节填充**: 将短篇中的一句话扩展为一个场景，增加次要人物和支线情节。
3. **结构设计**: 将本章内容拆分为 10 个左右的细分章节。
4. **起承转合**: 这10章内部也要有完整的情绪起伏和冲突链。

请生成本卷的章节大纲，JSON格式返回:
```json
{{
  "volume_title": "本卷标题",
  "volume_summary": "本卷剧情总结",
  "chapters": [
    {{
      "chapter_number": 1, // 卷内序号
      "title": "细分章节标题",
      "summary": "详细剧情摘要",
      "main_conflict": "核心冲突",
      "emotion_point": "情绪高潮/爽点/泪点"
    }}
  ]
}}
```
"""
        messages = [{"role": "user", "content": prompt}]
        response = self.ai_client._call_api(messages, temperature=0.85, max_tokens=4000)
        
        # 解析 JSON (简化版，实际需要 robust parser)
        try:
            from backend.utils.json_parser import parse_json_response
            result = parse_json_response(response)
            return result
        except Exception as e:
            print(f"解析扩展大纲失败: {e}")
            return None

    def generate_chapter_content(self, 
                               volume_info: Dict[str, Any], 
                               chapter_outline: Dict[str, Any], 
                               context: str,
                               characters: List[Dict]) -> str:
        """生成长篇单章正文"""
        
        char_desc = "\n".join([f"{c['name']}: {c.get('core_identity', '')}" for c in characters])

        prompt = f"""你是殿堂级长篇小说家，擅长细腻的情感描写和宏大的场景构建。
请根据大纲创作本章正文。

**本卷背景:**
卷名: {volume_info.get('volume_title')}
卷摘要: {volume_info.get('volume_summary')}

**本章大纲:**
标题: {chapter_outline.get('title')}
摘要: {chapter_outline.get('summary')}
冲突: {chapter_outline.get('main_conflict')}
情绪点: {chapter_outline.get('emotion_point')}

**前情提要:**
{context}

**登场人物:**
{char_desc}

**写作要求:**
1. **字数**: 3000字以上。
2. **风格**: 沉浸感强，多感官描写（视觉、听觉、嗅觉）。拒绝流水账。
3. **对话**: 贴合人物性格，有潜台词。
4. **心理**: 深入挖掘主角的内心挣扎和欲望。
5. **场景**: 场景切换自然，环境烘托氛围。

直接输出正文。
"""
        messages = [{"role": "user", "content": prompt}]
        response = self.ai_client._call_api(messages, temperature=0.85, max_tokens=6000) # 需要长输出
        return response
