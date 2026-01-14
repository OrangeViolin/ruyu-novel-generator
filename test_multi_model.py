#!/usr/bin/env python3
"""
测试多模型连接 (DeepSeek & SiliconFlow)
"""
import sys
import os

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv(".env")

from backend.ai.ai_factory import AIClientFactory

def test_model(provider, model_name=None):
    """测试特定提供商的模型"""
    print(f"\n" + "="*50)
    print(f"正在测试提供商: {provider} (模型: {model_name or '默认'})")
    print("="*50)

    try:
        client = AIClientFactory.get_client(provider, model_name)
        
        # 测试简单对话
        print("正在进行简单对话测试...")
        messages = [{"role": "user", "content": "你好，请回复「连接成功」"}]
        response = client._call_api(messages)
        print(f"✅ 连接成功！")
        print(f"AI回复: {response}")

        # 测试生成一个标题
        print("\n正在生成创意标题测试...")
        outline = {"logline": "豪门阔太假死销户，三年后携千亿归来"}
        elements = ["出轨", "复仇"]
        titles = client.generate_title(outline, elements)
        print(f"✅ 标题生成成功！")
        print(f"第一个候选标题: {titles[0] if titles else '无'}")

        return True

    except Exception as e:
        print(f"❌ {provider} 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("开始多模型聚合器连接验证测试...")
    
    # 测试 1: DeepSeek (官方)
    print("\n[测试 1: 官方 DeepSeek]")
    ds_success = test_model("deepseek")
    
    # 测试 2: 聚合器 - gpt-4o
    print("\n[测试 2: 聚合器 - gpt-4o]")
    gpt_success = test_model("gpt-4o")

    # 测试 3: 聚合器 - claude-sonnet-4-5
    print("\n[测试 3: 聚合器 - claude-sonnet-4-5]")
    claude_success = test_model("claude-sonnet-4-5")
    
    print("\n" + "="*50)
    print("测试结果汇总:")
    print(f"DeepSeek (官方): {'✅ 通过' if ds_success else '❌ 失败'}")
    print(f"GPT-4o (聚合器): {'✅ 通过' if gpt_success else '❌ 失败'}")
    print(f"Claude Sonnet 4.5 (聚合器): {'✅ 通过' if claude_success else '❌ 失败'}")
    print("="*50)
    
    if ds_success and gpt_success and claude_success:
        print("\n🎉 核心模型连接验证通过!")
        sys.exit(0)
    else:
        print("\n⚠️ 部分模型验证失败，请检查 API Key 和配置。")
        sys.exit(1)
