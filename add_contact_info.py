#!/usr/bin/env python3
"""
添加contact_info字段到channel_agents表
"""
import sqlite3
import os

DB_PATH = "novel_generator.db"

def migrate():
    """添加contact_info字段"""
    if not os.path.exists(DB_PATH):
        print(f"❌ 数据库不存在: {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 检查字段是否已存在
    cursor.execute("PRAGMA table_info(channel_agents)")
    columns = [col[1] for col in cursor.fetchall()]

    if 'contact_info' in columns:
        print("⚠️  contact_info字段已存在，跳过迁移")
        conn.close()
        return

    # 添加contact_info字段
    try:
        cursor.execute("ALTER TABLE channel_agents ADD COLUMN contact_info TEXT")
        conn.commit()
        print("✅ 成功添加contact_info字段")
    except Exception as e:
        print(f"❌ 添加字段失败: {e}")
        conn.close()
        return

    conn.close()
    print("\n🎉 数据库迁移完成！")

if __name__ == "__main__":
    migrate()
