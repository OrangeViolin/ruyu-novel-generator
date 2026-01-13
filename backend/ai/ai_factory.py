from typing import Dict, List, Optional, Any
try:
    from .deepseek_client import DeepSeekClient
except ImportError:
    DeepSeekClient = None

try:
    from .qwen_client import QwenClient
except ImportError:
    QwenClient = None
from config.settings import settings

AGGREGATOR_MODELS = [
    "claude-opus-4-5-thinking",
    "claude-sonnet-4-5",
    "gemini-3.0-pro",
    "grok-4",
    "gpt-4o",
    "gpt-5"
]

class AIClientFactory:
    """AI客户端工厂，用于创建不同的AI客户端"""
    
    _clients = {}

    @staticmethod
    def get_client(provider: str = "deepseek", model: Optional[str] = None):
        """
        获取AI客户端实例
        
        Args:
            provider: 提供商，如 "deepseek", "qwen" 或具体的聚合器模型名
            model: 模型名称，如果为None则使用配置中的默认值
        """
        # 确定真正的提供商和模型
        real_provider = provider
        real_model = model

        # 如果传入的是聚合器支持的模型名称，则自动切到聚合器
        if provider in AGGREGATOR_MODELS:
            real_provider = "aggregator"
            real_model = provider
        elif model in AGGREGATOR_MODELS:
            real_provider = "aggregator"
            real_model = model

        client_key = f"{real_provider}:{real_model}"
        if client_key in AIClientFactory._clients:
            return AIClientFactory._clients[client_key]

        if real_provider == "deepseek":
            if DeepSeekClient is None:
                raise ImportError("DeepSeekClient could not be initialized (missing dependencies).")
            api_key = settings.deepseek_api_key
            default_model = settings.deepseek_model
            client = DeepSeekClient(api_key=api_key, model=real_model or default_model)
        
        elif real_provider == "aggregator":
            if DeepSeekClient is None:
                raise ImportError("DeepSeekClient could not be initialized (missing dependencies).")
            api_key = settings.aggregator_api_key
            # 聚合器使用 OpenAI 兼容格式
            client = DeepSeekClient(api_key=api_key, model=real_model)
            client.client.base_url = settings.aggregator_base_url
            
        elif real_provider == "qwen":
            if QwenClient is None:
                raise ImportError("QwenClient could not be initialized (missing dependency 'dashscope').")
            # 假设qwen配置也在settings中，这里先占位
            api_key = getattr(settings, "qwen_api_key", "")
            default_model = getattr(settings, "qwen_model", "qwen-plus")
            client = QwenClient(api_key=api_key, model=real_model or default_model)
        
        else:
            raise ValueError(f"Unsupported AI provider: {real_provider}")

        AIClientFactory._clients[client_key] = client
        return client
