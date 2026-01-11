#!/usr/bin/env python3
"""
批量导入20个渠道智能体到数据库
"""
import sys
import os
import json

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from backend.database.models import ChannelAgent, init_db
from backend.database.models import SessionLocal
from datetime import datetime

def import_agents_from_config(config_file="submission_agents_config_20.json"):
    """从配置文件导入智能体到数据库"""
    # 初始化数据库
    init_db()

    # 读取配置
    with open(config_file, 'r', encoding='utf-8') as f:
        agent_configs = json.load(f)

    db = SessionLocal()
    imported = 0
    failed = 0
    skipped = 0

    for config in agent_configs:
        try:
            # 检查是否已存在
            existing = db.query(ChannelAgent).filter(
                ChannelAgent.name == config['name']
            ).first()

            if existing:
                print(f"⏭️  跳过已存在：{config['name']}")
                skipped += 1
                continue

            # 创建智能体
            agent = ChannelAgent(
                name=config['name'],
                description=config['description'],
                channel_type=config['channel_type'],
                target_audience=config['target_audience'],
                channel_characteristics=config['channel_characteristics'],
                length_requirements=config['length_requirements'],
                writing_style=config['writing_style'],
                content_structure=config['content_structure'],
                training_status="pending",
                is_active=1,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )

            db.add(agent)
            imported += 1

            # 标记武志红
            star = " ⭐" if "武志红" in config['name'] else ""
            print(f"✅ 导入成功：{config['name']}{star} ({config['channel_type']})")

        except Exception as e:
            failed += 1
            print(f"❌ 导入失败：{config['name']} - {e}")

    db.commit()
    db.close()

    print(f"\n🎉 导入完成！")
    print(f"✅ 成功：{imported} 个")
    print(f"⏭️  跳过：{skipped} 个")
    print(f"❌ 失败：{failed} 个")

if __name__ == "__main__":
    import_agents_from_config()
