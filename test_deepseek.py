#!/usr/bin/env python3
"""
测试DeepSeek连接
"""
import sys
import os

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv("config/.env")

from backend.ai.deepseek_client import DeepSeekClient

def test_connection():
    """测试DeepSeek连接"""
    api_key = os.getenv("DEEPSEEK_API_KEY")
    model = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

    print(f"""
╔═══════════════════════════════════════════╗
║     DeepSeek 连接测试                      ║
╚═══════════════════════════════════════════╝
""")

    print(f"API Key: {api_key[:20]}...{api_key[-10:]}")
    print(f"Model: {model}\n")

    print("正在测试连接...")

    try:
        client = DeepSeekClient(api_key=api_key, model=model)

        # 测试简单对话
        messages = [{"role": "user", "content": "你好，请回复「连接成功」"}]
        response = client._call_api(messages)

        print(f"\n✅ 连接成功！")
        print(f"DeepSeek回复: {response}")

        # 测试生成大纲
        print("\n" + "="*50)
        print("正在测试大纲生成...")
        outline = client.generate_outline(
            theme="被出轨后的华丽归来",
            elements=["出轨", "掉马", "假死", "豪门恩怨"],
            background="港澳/金牌播报员",
            target_words=10000
        )

        print(f"\n✅ 大纲生成成功！")
        print(f"标题: {outline.get('title', '无')}")
        print(f"简介: {outline.get('logline', '无')}")
        print(f"角色数量: {len(outline.get('characters', []))}")
        print(f"场景数量: {len(outline.get('key_scenes', []))}")

        return True

    except Exception as e:
        print(f"\n❌ 连接失败: {e}")
        return False


if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)
