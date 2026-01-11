#!/usr/bin/env python3
"""
网文生成工具 - 启动脚本
"""
import os
import sys
import subprocess

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def check_env():
    """检查环境配置"""
    env_file = "config/.env"
    env_example = "config/.env.example"

    if not os.path.exists(env_file):
        print(f"⚠️  配置文件不存在，正在创建...")
        if os.path.exists(env_example):
            import shutil
            shutil.copy(env_example, env_file)
            print(f"✅ 已创建 {env_file}")
            print(f"⚠️  请编辑 {env_file}，填入你的DeepSeek API密钥！")
            print(f"   获取地址: https://platform.deepseek.com/\n")
            return False
        else:
            print(f"❌ 找不到配置模板文件 {env_example}")
            return False

    # 检查API密钥
    from dotenv import load_dotenv
    load_dotenv(env_file)

    api_key = os.getenv("DEEPSEEK_API_KEY", "")
    if api_key == "your_api_key_here" or not api_key:
        print(f"⚠️  请先配置DeepSeek API密钥！")
        print(f"   编辑 {env_file}，设置 DEEPSEEK_API_KEY")
        return False

    return True


def init_database():
    """初始化数据库"""
    print("📦 初始化数据库...")
    try:
        from backend.database.models import init_db
        init_db()
        print("✅ 数据库初始化完成")
        return True
    except Exception as e:
        print(f"❌ 数据库初始化失败: {e}")
        return False


def install_dependencies():
    """检查并安装依赖"""
    try:
        import fastapi
        import openai
        print("✅ 依赖已安装")
        return True
    except ImportError:
        print("📥 正在安装依赖...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
            print("✅ 依赖安装完成")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ 依赖安装失败: {e}")
            return False


def start_server():
    """启动Web服务"""
    from config.settings import settings

    print(f"\n🚀 启动服务...")
    print(f"   地址: http://{settings.host}:{settings.port}")
    print(f"   API文档: http://{settings.host}:{settings.port}/docs")
    print(f"\n按 Ctrl+C 停止服务\n")

    import uvicorn
    uvicorn.run(
        "backend.api.app:app",
        host=settings.host,
        port=settings.port,
        reload=True
    )


def main():
    print("""
╔═══════════════════════════════════════════╗
║     网文生成工具 v1.0                     ║
║     Novel Generator Tool                  ║
╚═══════════════════════════════════════════╝
""")

    # 1. 检查依赖
    if not install_dependencies():
        sys.exit(1)

    # 2. 检查配置
    if not check_env():
        print("\n请完成配置后重新运行此脚本\n")
        sys.exit(1)

    # 3. 初始化数据库
    if not init_database():
        sys.exit(1)

    # 4. 启动服务
    try:
        start_server()
    except KeyboardInterrupt:
        print("\n\n👋 服务已停止")


if __name__ == "__main__":
    main()
