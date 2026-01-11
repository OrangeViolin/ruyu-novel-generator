from typing import Dict, List, Optional
from backend.ai.deepseek_client import DeepSeekClient
from backend.generator.plot_assembler import PlotAssembler
import json


class NovelBuilder:
    """小说构建器 - 混合生成引擎"""

    def __init__(
        self,
        ai_client: DeepSeekClient,
        plot_assembler: PlotAssembler,
        target_words: int = 10000
    ):
        """
        初始化

        Args:
            ai_client: AI客户端
            plot_assembler: 情节组装器
            target_words: 目标字数
        """
        self.ai_client = ai_client
        self.plot_assembler = plot_assembler
        self.target_words = target_words

    def build_novel(
        self,
        theme: str,
        elements: List[str],
        characters: Optional[Dict] = None,
        background: str = "港澳/金牌播报员"
    ) -> Dict:
        """
        构建完整小说

        Args:
            theme: 主题
            elements: 必须包含的元素
            characters: 人物设定（可选）
            background: 故事背景

        Returns:
            完整小说字典
        """
        # 字数限制设置
        max_words = int(self.target_words * 1.2)  # 最大不超过120%

        # 1. AI生成大纲
        print("正在生成大纲...")
        outline = self.ai_client.generate_outline(
            theme=theme,
            elements=elements,
            background=background,
            target_words=self.target_words
        )

        # 2. 如果没有提供人物，从大纲中提取
        if not characters:
            characters = self._extract_characters(outline)

        # 3. 获取场景序列
        scene_sequence = self.plot_assembler.generate_scene_sequence(elements)

        # 4. 生成各章节内容
        chapters = []
        total_words = 0

        # 根据大纲的key_scenes生成
        key_scenes = outline.get("key_scenes", [])
        if not key_scenes:
            # 使用默认场景序列
            key_scenes = scene_sequence

        for i, scene in enumerate(key_scenes):
            chapter_num = i + 1
            chapter_title = scene.get("title", f"第{chapter_num}章")
            chapter_summary = scene.get("summary", scene.get("description", ""))
            chapter_elements = scene.get("elements", elements)

            # 检查是否已超过字数上限
            if total_words >= max_words:
                print(f"⚠️  已达到字数上限（{max_words}字），停止生成")
                break

            # 计算本章目标字数，确保不超过上限
            remaining_words = max_words - total_words
            remaining_chapters = len(key_scenes) - i

            # 计算平均剩余字数
            avg_remaining = remaining_words // remaining_chapters

            # 本章目标字数：在500-3000之间，但不超过剩余字数
            target_words = min(max(500, avg_remaining), 3000, remaining_words)

            # 如果剩余字数很少，压缩后续章节
            if remaining_words < 800 * remaining_chapters:
                target_words = max(300, remaining_words // remaining_chapters)

            chapter_info = {
                "title": chapter_title,
                "summary": chapter_summary,
                "elements": chapter_elements,
                "target_words": target_words
            }

            print(f"正在生成第{chapter_num}章: {chapter_title} (目标: {target_words}字)")

            # 获取前文摘要（保持连贯性）
            context = "\n".join([c.get("summary", "") for c in chapters[-2:]])

            # 生成章节内容
            try:
                content = self.ai_client.generate_chapter(
                    outline=outline,
                    chapter_info=chapter_info,
                    context=context
                )

                # 实际字数可能超出目标，进行截断
                actual_words = len(content)
                if total_words + actual_words > max_words:
                    # 计算可以保留的字数
                    allowed_words = max_words - total_words
                    content = content[:allowed_words]
                    # 在句号处截断
                    last_period = content.rfind('。')
                    if last_period > 0:
                        content = content[:last_period] + '。'
                    print(f"  ✂️  截断至 {max_words} 字上限")

            except Exception as e:
                print(f"生成章节失败: {e}")
                # 使用模板填充作为降级方案
                content = self._generate_from_template(chapter_elements, characters)

            chapters.append({
                "id": chapter_num,
                "title": chapter_title,
                "summary": chapter_summary,
                "content": content,
                "word_count": len(content),
                "order": chapter_num
            })

            total_words += len(content)
            print(f"  当前进度: {total_words}/{max_words} 字 ({total_words/max_words*100:.1f}%)")

        # 5. 汇总结果
        novel = {
            "title": outline.get("title", "未命名"),
            "logline": outline.get("logline", ""),
            "outline": outline,
            "characters": characters,
            "chapters": chapters,
            "total_words": total_words,
            "status": "completed"
        }

        print(f"\n✅ 生成完成！")
        print(f"📊 目标字数: {self.target_words}")
        print(f"📊 实际字数: {total_words}")
        print(f"📊 上限字数: {max_words}")
        print(f"📊 占比: {total_words/self.target_words*100:.1f}%")

        return novel

    def _extract_characters(self, outline: Dict) -> Dict:
        """从大纲中提取人物"""
        chars = {}
        for char in outline.get("characters", []):
            chars[char["name"]] = char
        return chars

    def _generate_from_template(self, elements: List[str], characters: Dict) -> str:
        """使用模板生成内容（降级方案）"""
        plots = self.plot_assembler.assemble_plot(elements, characters)

        content = ""
        for plot in plots:
            content += f"\n\n{plot['content']}\n"

        return content

    def polish_chapter(
        self,
        content: str,
        focus: str = "情绪钩子",
        style: str = "港澳播报员口吻"
    ) -> str:
        """
        润色章节

        Args:
            content: 原文
            focus: 优化重点
            style: 目标风格

        Returns:
            润色后的内容
        """
        return self.ai_client.polish_text(content, focus, style)

    def continue_chapter(
        self,
        existing_content: str,
        outline: Dict,
        target_words: int = 1000
    ) -> str:
        """
        续写章节

        Args:
            existing_content: 已有内容
            outline: 大纲
            target_words: 续写字数

        Returns:
            续写内容
        """
        prompt = f"""
请根据以下已有内容，续写{target_words}字：

已有内容：
{existing_content[-2000:]}

要求：
1. 保持情节连贯
2. 保持情绪张力
3. 推进剧情发展

请直接续写，不要有说明。
"""

        messages = [{"role": "user", "content": prompt}]
        return self.ai_client._call_api(messages, temperature=0.9)

    def generate_titles(self, outline: Dict, elements: List[str]) -> List[str]:
        """
        生成标题选项

        Args:
            outline: 大纲
            elements: 包含的元素

        Returns:
            标题列表
        """
        return self.ai_client.generate_title(outline, elements)
