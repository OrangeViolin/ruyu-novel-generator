#!/usr/bin/env python3
"""
创建渠道智能体表
"""
import sqlite3
import os

DB_PATH = "novel_generator.db"

def migrate():
    """创建 channel_agents 表"""
    if not os.path.exists(DB_PATH):
        print(f"❌ 数据库不存在: {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 创建 channel_agents 表
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS channel_agents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        -- 基本信息
        name VARCHAR(200) NOT NULL,
        description TEXT,
        channel_type VARCHAR(50),
        target_audience VARCHAR(200),

        -- 渠道特点（JSON）
        channel_characteristics TEXT,

        -- 训练语料文件（JSON）
        training_files TEXT,
        corpus_word_count INTEGER DEFAULT 0,

        -- AI提取的风格特征（JSON）
        title_style TEXT,
        topic_preferences TEXT,
        writing_style TEXT,
        content_structure TEXT,
        length_requirements TEXT,
        vocabulary_features TEXT,

        -- 训练状态
        training_status VARCHAR(20) DEFAULT 'pending',
        training_progress INTEGER DEFAULT 0,
        last_training_at DATETIME,
        training_error TEXT,

        -- 模型参数
        temperature INTEGER DEFAULT 70,
        top_p INTEGER DEFAULT 90,
        frequency_penalty INTEGER DEFAULT 0,

        -- 生成配置
        generation_template TEXT,
        example_outputs TEXT,

        -- 使用统计
        usage_count INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,

        -- 权限和状态
        is_active INTEGER DEFAULT 1,
        is_public INTEGER DEFAULT 0,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """

    try:
        cursor.execute(create_table_sql)
        conn.commit()
        print("✅ 成功创建 channel_agents 表")
    except Exception as e:
        print(f"❌ 创建表失败: {e}")
        conn.close()
        return

    # 创建索引
    indexes = [
        "CREATE INDEX IF NOT EXISTS idx_channel_agents_name ON channel_agents(name);",
        "CREATE INDEX IF NOT EXISTS idx_channel_agents_type ON channel_agents(channel_type);",
        "CREATE INDEX IF NOT EXISTS idx_channel_agents_status ON channel_agents(training_status, is_active);",
    ]

    for index_sql in indexes:
        try:
            cursor.execute(index_sql)
            print(f"✅ 创建索引成功")
        except Exception as e:
            print(f"⚠️  创建索引警告: {e}")

    conn.commit()
    conn.close()

    print("\n🎉 渠道智能体表初始化完成！")

if __name__ == "__main__":
    migrate()
