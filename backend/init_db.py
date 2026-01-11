#!/usr/bin/env python3
"""初始化数据库脚本"""
import sys
import os

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database.models import init_db

if __name__ == "__main__":
    print("正在初始化数据库...")
    try:
        init_db()
        print("✅ 数据库初始化成功！")
        print("已创建以下表：")
        print("  - example_analyses (例文分析)")
        print("  - novel_projects (小说项目)")
        print("  - characters (人物表)")
        print("  - plot_outlines (情节大纲)")
        print("  - chapter_drafts (章节草稿)")
        print("  - plot_modules (情节模板)")
        print("  - crawl_tasks (爬虫任务)")
        print("  - submissions (投稿记录)")
    except Exception as e:
        print(f"❌ 数据库初始化失败: {e}")
        sys.exit(1)
