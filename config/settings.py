from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    """应用配置"""

    # DeepSeek配置
    deepseek_api_key: str
    deepseek_model: str = "deepseek-chat"

    # 聚合API配置 (api.yyds168.net)
    aggregator_api_key: str = ""
    aggregator_base_url: str = "https://api.yyds168.net/v1"

    # InsightDoc PDF解析配置
    insightdoc_api_key: str = "sk-I2gEy8v5fgafApDDJzO2M2JLgKyOdbvmypHbYPb9yqvzKqYO"
    insightdoc_base_url: str = "https://insightdoc.memect.cn"

    # 数据库配置
    database_url: str = "sqlite:///./novel_generator.db"

    # 爬虫配置
    crawl_interval: int = 3600  # 秒
    crawl_schedule: str = "0 2 * * *"  # cron表达式

    # 服务配置
    host: str = "127.0.0.1"
    port: int = 8000

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )


settings = Settings()
