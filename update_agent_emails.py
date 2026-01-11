#!/usr/bin/env python3
"""
从Word文档提取邮箱信息并更新智能体数据库
"""
from docx import Document
import sys
import os
import re
import json

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from backend.database.models import ChannelAgent, SessionLocal

def extract_emails_from_docx(docx_path):
    """从Word文档中提取渠道邮箱信息"""
    doc = Document(docx_path)

    channels_data = {}
    current_channel = None

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue

        # 检测是否是渠道名称（数字开头）
        if re.match(r'^\d+[、.]', text):
            channel_name = re.sub(r'^\d+[、.]\s*', '', text)
            current_channel = channel_name
            channels_data[channel_name] = {
                'email': None,
                'payment': None,
                'requirements': []
            }

        # 提取邮箱
        elif '@' in text and current_channel:
            email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
            if email_match and not channels_data[current_channel]['email']:
                channels_data[current_channel]['email'] = email_match.group()

        # 提取稿费信息
        elif '稿费' in text and current_channel:
            channels_data[current_channel]['payment'] = text.strip()

        # 提取要求
        elif ('要求' in text or '约稿' in text) and current_channel:
            channels_data[current_channel]['requirements'].append(text.strip())

    return channels_data

def update_agent_contact_info(channels_data):
    """更新智能体的联系信息"""
    db = SessionLocal()
    agents = db.query(ChannelAgent).all()

    updated_count = 0
    not_found_count = 0

    for agent in agents:
        # 查找匹配的渠道数据
        channel_data = None

        # 精确匹配
        if agent.name in channels_data:
            channel_data = channels_data[agent.name]
        else:
            # 模糊匹配（处理名称不完全一致的情况）
            for channel_name, data in channels_data.items():
                if agent.name in channel_name or channel_name in agent.name:
                    channel_data = data
                    break

        if channel_data:
            contact_info = {}

            if channel_data['email']:
                contact_info['email'] = channel_data['email']

            if channel_data['payment']:
                contact_info['payment_info'] = channel_data['payment']

            if channel_data['requirements']:
                contact_info['requirements'] = channel_data['requirements'][:3]  # 只保留前3条要求

            if contact_info:
                agent.contact_info = contact_info
                updated_count += 1
                print(f"✅ 更新：{agent.name}")
                if 'email' in contact_info:
                    print(f"   📧 {contact_info['email']}")
                if 'payment_info' in contact_info:
                    print(f"   💰 {contact_info['payment_info']}")
            else:
                not_found_count += 1
                print(f"⚠️  无联系信息：{agent.name}")
        else:
            not_found_count += 1
            print(f"⚠️  未找到渠道数据：{agent.name}")

    db.commit()
    db.close()

    print(f"\n🎉 更新完成！")
    print(f"✅ 成功更新：{updated_count} 个")
    print(f"⚠️  未找到信息：{not_found_count} 个")

# 执行更新
if __name__ == "__main__":
    docx_path = "/Users/mac/Downloads/网文研究/线上线下500+投稿渠道.docx"

    print("📖 正在解析投稿渠道文档...")
    channels_data = extract_emails_from_docx(docx_path)
    print(f"✅ 成功解析 {len(channels_data)} 个渠道的数据\n")

    # 显示前5个渠道数据作为示例
    print("📋 渠道数据示例（前5个）：")
    for i, (name, data) in enumerate(list(channels_data.items())[:5]):
        print(f"\n{i+1}. {name}")
        if data['email']:
            print(f"   📧 邮箱：{data['email']}")
        if data['payment']:
            print(f"   💰 稿费：{data['payment']}")
    print()

    # 更新数据库
    print("=" * 60)
    print("开始更新数据库...")
    print("=" * 60)
    update_agent_contact_info(channels_data)
