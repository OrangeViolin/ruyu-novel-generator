#!/usr/bin/env python3
"""
生成20个渠道智能体配置（包括武志红公众号）
"""
from docx import Document
import json
import re

def parse_submission_channels(docx_path):
    """解析投稿渠道Word文档"""
    doc = Document(docx_path)

    channels = []
    current_channel = {}

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue

        # 检测是否是渠道名称（数字开头）
        if re.match(r'^\d+[、.]', text):
            # 保存上一个渠道
            if current_channel:
                channels.append(current_channel)

            # 开始新渠道
            channel_name = re.sub(r'^\d+[、.]\s*', '', text)
            current_channel = {
                'name': channel_name,
                'requirements': [],
                'word_count': None,
                'payment': None,
                'email': None,
                'category': None
            }
        elif current_channel:
            # 解析内容
            if '要求' in text or '约稿' in text:
                current_channel['requirements'].append(text)
            elif '稿费' in text or '支付' in text:
                current_channel['payment'] = text
            elif '字数' in text:
                # 提取字数要求
                match = re.search(r'(\d+)\s*[-~至]\s*(\d+)\s*字', text)
                if match:
                    current_channel['word_count'] = {
                        'min': int(match.group(1)),
                        'max': int(match.group(2))
                    }
                else:
                    match = re.search(r'(\d+)\s*字', text)
                    if match:
                        words = int(match.group(1))
                        current_channel['word_count'] = {'min': words*0.8, 'max': words*1.2, 'optimal': words}
            elif '信箱' in text or '邮箱' in text or '@' in text:
                # 提取邮箱
                email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
                if email_match:
                    current_channel['email'] = email_match.group()

    # 保存最后一个渠道
    if current_channel:
        channels.append(current_channel)

    return channels

def classify_channel(channel):
    """为渠道分类并生成智能体配置"""
    name = channel['name'].lower()
    requirements = ' '.join(channel['requirements'])

    # 智能分类
    if '情感' in name or '婚姻' in name or '两性' in name or '恋爱' in name:
        category = 'emotion'
        tone = '温暖、共情、细腻'
        topics = ['亲密关系', '情感问题', '婚姻经营', '自我成长']
    elif '故事' in name or '非虚构' in name or '真实' in name:
        category = 'story'
        tone = '真实、有温度、细节丰富'
        topics = ['真实经历', '人物故事', '成长历程', '社会观察']
    elif '亲子' in name or '育儿' in name or '家庭' in name or '童书' in name:
        category = 'parenting'
        tone = '亲切、实用、有经验感'
        topics = ['育儿经验', '亲子关系', '家庭教育', '妈妈成长']
    elif '职场' in name or '行业' in name or '管理' in name:
        category = 'career'
        tone = '专业、有洞察力'
        topics = ['职场经验', '行业观察', '职业发展']
    elif '心理' in name or '情绪' in name or '成长' in name:
        category = 'psychology'
        tone = '温暖、深刻、引导性'
        topics = ['情绪管理', '自我认知', '心理健康', '个人成长']
    else:
        category = 'general'
        tone = '亲切、有深度'
        topics = ['生活感悟', '个人成长']

    # 生成智能体配置
    agent_config = {
        'name': channel['name'],
        'description': f"专为【{channel['name']}】定制的投稿智能体",
        'channel_type': category,
        'target_audience': f"关注{category}的读者",
        'channel_characteristics': {
            'topics': topics,
            'tone': tone,
            'special_requirements': requirements
        },
        'length_requirements': channel.get('word_count', {'min': 1500, 'max': 5000}),
        'contact': {
            'email': channel.get('email'),
            'payment': channel.get('payment')
        },
        # 预设的写作风格
        'writing_style': {
            'tone': tone,
            'sentence_style': '流畅自然，有温度',
            'opening_pattern': '故事/案例引入或观点抛出',
            'closing_pattern': '总结升华或行动建议'
        },
        'content_structure': {
            'sections': ['引入', '正文', '升华'],
            'story_ratio': 0.4 if category == 'story' else 0.2
        }
    }

    return agent_config

def create_wuzhihong_agent():
    """创建武志红公众号智能体"""
    return {
        'name': '武志红公众号',
        'description': '专为【武志红公众号】定制的投稿智能体 - 专注心理学与个人成长',
        'channel_type': 'psychology',
        'target_audience': '25-45岁关注自我成长和心理健康的都市人群',
        'channel_characteristics': {
            'topics': ['亲密关系', '情绪管理', '自我认知', '原生家庭', '心理健康', '个人成长', '心理创伤疗愈'],
            'tone': '温暖、深刻、专业而不失温度，有洞察力',
            'special_requirements': '需要有真实案例支撑，避免空洞说教，要有深度分析，文风温暖但有力量'
        },
        'length_requirements': {'min': 2000, 'max': 5000},
        'contact': {
            'email': None,
            'payment': '优质稿件稿费优厚'
        },
        'writing_style': {
            'tone': '温暖、深刻、专业',
            'sentence_style': '流畅优美，富有哲理，善用比喻',
            'opening_pattern': '从真实案例或生活现象引入',
            'closing_pattern': '给出有启发的思考和行动建议'
        },
        'content_structure': {
            'sections': ['现象引入', '深度分析', '案例支撑', '总结升华'],
            'story_ratio': 0.5
        }
    }

# 执行解析
if __name__ == "__main__":
    docx_path = "/Users/mac/Downloads/网文研究/线上线下500+投稿渠道.docx"

    print("📖 正在解析投稿渠道文档...")
    channels = parse_submission_channels(docx_path)
    print(f"✅ 成功解析 {len(channels)} 个渠道\n")

    # 生成智能体配置 - 处理前19个
    agent_configs = []
    for channel in channels[:19]:
        config = classify_channel(channel)
        agent_configs.append(config)
        print(f"📝 智能体配置：{config['name']}")
        print(f"   类型：{config['channel_type']}")
        print(f"   话题：{', '.join(config['channel_characteristics']['topics'][:3])}")
        print()

    # 添加武志红公众号作为第20个
    wuzhihong = create_wuzhihong_agent()
    agent_configs.append(wuzhihong)
    print(f"📝 智能体配置：{wuzhihong['name']} ⭐")
    print(f"   类型：{wuzhihong['channel_type']}")
    print(f"   话题：{', '.join(wuzhihong['channel_characteristics']['topics'][:4])}")
    print()

    # 保存为JSON
    output_file = "submission_agents_config_20.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(agent_configs, f, ensure_ascii=False, indent=2)

    print(f"🎉 配置已保存到 {output_file}")
    print(f"📊 共生成 {len(agent_configs)} 个智能体配置")
