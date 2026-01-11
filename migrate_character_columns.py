#!/usr/bin/env python3
"""
添加星月风格角色卡字段到数据库
"""
import sqlite3
import os

DB_PATH = "novel_generator.db"

def migrate():
    """添加新的角色卡字段"""
    if not os.path.exists(DB_PATH):
        print(f"❌ 数据库不存在: {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 检查表是否存在
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='characters'")
    if not cursor.fetchone():
        print("❌ characters 表不存在")
        conn.close()
        return

    # 要添加的新列
    new_columns = [
        ("importance", "VARCHAR(20) DEFAULT 'supporting'"),
        ("status", "VARCHAR(20) DEFAULT 'active'"),
        ("is_visible", "INTEGER DEFAULT 1"),
        ("personality_flaw", "TEXT"),
        ("flaw_consequence", "TEXT"),
        ("core_identity", "TEXT"),
        ("core_personality", "TEXT"),
        ("core_motivation", "TEXT"),
        ("growth_direction", "TEXT"),
        ("speech_example", "TEXT"),
        ("current_location", "VARCHAR(200)"),
        ("relationship_notes", "TEXT"),
        ("biography_current", "TEXT"),
        ("first_appearance_chapter", "INTEGER"),
        ("last_appearance_chapter", "INTEGER"),
    ]

    # 获取现有列
    cursor.execute("PRAGMA table_info(characters)")
    existing_columns = [row[1] for row in cursor.fetchall()]

    # 添加新列
    added_count = 0
    for col_name, col_type in new_columns:
        if col_name not in existing_columns:
            try:
                cursor.execute(f"ALTER TABLE characters ADD COLUMN {col_name} {col_type}")
                print(f"✅ 添加列: {col_name}")
                added_count += 1
            except Exception as e:
                print(f"❌ 添加列失败 {col_name}: {e}")
        else:
            print(f"⏭️  列已存在: {col_name}")

    conn.commit()
    conn.close()

    if added_count > 0:
        print(f"\n🎉 成功添加 {added_count} 个新列到 characters 表")
    else:
        print("\n✅ 所有列都已存在，无需迁移")

if __name__ == "__main__":
    migrate()
