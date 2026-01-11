#!/usr/bin/env python3.10
"""
手动生成小说脚本
用于调试生成任务
"""
import sys
sys.path.insert(0, '/Users/mac/Documents/Claude Code/novel-generator')

from backend.database.models import NovelProject, SessionLocal
from backend.generator.novel_builder import NovelBuilder
from backend.ai.deepseek_client import DeepSeekClient
from backend.generator.plot_assembler import PlotAssembler
from config.settings import settings

def main():
    project_id = 3

    print("=" * 60)
    print("手动生成小说脚本")
    print("=" * 60)

    # 获取项目信息
    db = SessionLocal()
    try:
        project = db.query(NovelProject).filter(NovelProject.id == project_id).first()

        if not project:
            print(f"❌ 找不到项目 {project_id}")
            return

        print(f"\n📖 项目信息:")
        print(f"   ID: {project.id}")
        print(f"   名称: {project.name}")
        print(f"   状态: {project.status}")
        print(f"   目标字数: {project.target_words}")

        # 获取项目数据
        outline_data = project.outline or {}
        theme = outline_data.get("theme", "未指定主题")
        elements = outline_data.get("elements", [])
        characters = project.characters or {}

        print(f"\n📝 生成参数:")
        print(f"   主题: {theme}")
        print(f"   元素: {elements}")

        # 在关闭数据库连接前获取所有需要的数据
        background = project.background or "港澳/金牌播报员"
        characters_dict = characters

        print(f"   背景: {background}")

        # 更新状态为生成中
        project.status = "generating"
        db.commit()
        print(f"\n✅ 项目状态已更新为: generating")

        db.close()

        # 初始化生成器
        print(f"\n🔧 初始化生成器...")
        ai_client = DeepSeekClient(api_key=settings.deepseek_api_key, model=settings.deepseek_model)
        plot_assembler = PlotAssembler()
        novel_builder = NovelBuilder(ai_client=ai_client, plot_assembler=plot_assembler)

        # 开始生成
        print(f"\n🚀 开始生成小说...")
        print(f"=" * 60)

        novel = novel_builder.build_novel(
            theme=theme,
            elements=elements,
            characters=characters_dict,
            background=background
        )

        print(f"\n✅ 生成完成!")
        print(f"=" * 60)

        # 重新连接数据库并更新
        db = SessionLocal()
        project = db.query(NovelProject).filter(NovelProject.id == project_id).first()

        if project:
            # 更新项目
            project.status = "completed"
            project.outline = novel.get("outline", {})
            project.characters = novel.get("characters", {})
            project.chapters = novel.get("chapters", [])
            project.word_count = novel.get("total_words", 0)
            project.updated_at = datetime.now()
            db.commit()

            print(f"\n📊 生成结果:")
            print(f"   状态: {project.status}")
            print(f"   字数: {project.word_count}")
            print(f"   章节数: {len(project.chapters) if project.chapters else 0}")

            outline = novel.get("outline", {})
            if outline:
                print(f"\n📖 大纲信息:")
                print(f"   标题: {outline.get('title', 'N/A')}")
                print(f"   简介: {outline.get('logline', 'N/A')[:100]}...")
        else:
            print(f"❌ 找不到项目 {project_id}")

    except Exception as e:
        print(f"\n❌ 生成失败: {e}")
        import traceback
        traceback.print_exc()

        # 尝试更新失败状态
        try:
            db = SessionLocal()
            project = db.query(NovelProject).filter(NovelProject.id == project_id).first()
            if project:
                project.status = "failed"
                db.commit()
                print(f"✅ 项目状态已更新为: failed")
        except Exception as update_error:
            print(f"❌ 更新失败状态时出错: {update_error}")

    finally:
        db.close()

if __name__ == "__main__":
    from datetime import datetime
    main()
