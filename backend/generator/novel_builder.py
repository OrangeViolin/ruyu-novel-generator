from typing import Dict, List, Optional
from backend.ai.deepseek_client import DeepSeekClient
import concurrent.futures
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
        # 4. 生成各章节内容 (并行版)
        chapters = [None] * len(key_scenes)  # 预分配列表以保持顺序
        total_words = 0
        
        # 准备所有章节的任务参数
        tasks_params = []
        for i, scene in enumerate(key_scenes):
            chapter_num = i + 1
            chapter_title = scene.get("title", f"第{chapter_num}章")
            chapter_summary = scene.get("summary", scene.get("description", ""))
            chapter_elements = scene.get("elements", elements)
            
            # 简化字数分配逻辑：均匀分配
            # 并行时无法动态调整，只能预先分配
            avg_target = self.target_words // len(key_scenes)
            target_words = min(max(1000, avg_target), 4000)  #在此范围内
            
            chapter_info = {
                "title": chapter_title,
                "summary": chapter_summary,
                "elements": chapter_elements,
                "target_words": target_words
            }
            
            # 获取前文摘要（保持连贯性）
            # 注意：这里使用大纲中的summary作为context，而不是生成后的内容
            # 这样可以解耦章节间的依赖，实现并行
            prev_summaries = []
            if i > 0:
                prev_scene = key_scenes[i-1]
                prev_summaries.append(prev_scene.get("summary", prev_scene.get("description", "")))
            if i > 1:
                prev_prev_scene = key_scenes[i-2]
                prev_summaries.append(prev_prev_scene.get("summary", prev_prev_scene.get("description", "")))
            
            context = "\n".join(prev_summaries)
            
            tasks_params.append({
                "index": i,
                "chapter_num": chapter_num,
                "chapter_title": chapter_title,
                "chapter_summary": chapter_summary,
                "chapter_elements": chapter_elements,
                "chapter_info": chapter_info,
                "context": context,
                "outline": outline,
                "characters": characters
            })
            
        # 并行执行
        print(f"🚀 启动并行生成，共 {len(tasks_params)} 章...")
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            # 提交所有任务
            future_to_index = {
                executor.submit(self._generate_single_chapter, **params): params["index"] 
                for params in tasks_params
            }
            
            # 获取结果
            for future in concurrent.futures.as_completed(future_to_index):
                index = future_to_index[future]
                try:
                    chapter_data = future.result()
                    chapters[index] = chapter_data
                    total_words += chapter_data["word_count"]
                    print(f"✅ 第 {index+1} 章生成完成 ({chapter_data['word_count']}字)")
                except Exception as e:
                    print(f"❌ 第 {index+1} 章生成发生未捕获异常: {e}")
                    # 最后的保底，虽然后台方法里已经有了
                    chapters[index] = {
                        "id": index + 1,
                        "title": key_scenes[index].get("title", f"第{index+1}章"),
                        "summary": key_scenes[index].get("summary", ""),
                        "content": "生成失败，请重试。",
                        "word_count": 0,
                        "order": index + 1
                    }

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

    def _generate_single_chapter(
        self,
        index: int,
        chapter_num: int,
        chapter_title: str,
        chapter_summary: str,
        chapter_elements: List[str],
        chapter_info: Dict,
        context: str,
        outline: Dict,
        characters: Dict
    ) -> Dict:
        """
        生成单个章节（线程任务）
        """
        print(f"🔄 [线程] 正在生成第{chapter_num}章: {chapter_title}")
        
        try:
            content = self.ai_client.generate_chapter(
                outline=outline,
                chapter_info=chapter_info,
                context=context
            )
        except Exception as e:
            print(f"❌ [线程] 第{chapter_num}章生成AI调用失败: {e}")
            # 使用模板填充作为降级方案
            content = self._generate_from_template(chapter_elements, characters)
            
        return {
            "id": chapter_num,
            "title": chapter_title,
            "summary": chapter_summary,
            "content": content,
            "word_count": len(content),
            "order": chapter_num
        }
