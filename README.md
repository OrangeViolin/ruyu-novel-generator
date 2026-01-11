# 网文生成工具

一个自动化生成狗血世情文的AI工具，支持多平台语料抓取、情节分析和智能内容生成。

## 功能特点

- **AI智能生成**: 基于DeepSeek大模型，自动生成符合狗血世情文标准的小说
- **多平台抓取**: 支持知乎、小红书等平台的语料抓取
- **情节分析**: 自动识别出轨、掉马、假死、豪门恩怨等情节元素
- **卡片式编辑**: 可视化章节管理，支持拖拽排序和单独编辑
- **定时任务**: 每日自动抓取最新热门语料

## 快速开始

### 1. 安装依赖

```bash
cd novel-generator
pip install -r requirements.txt
```

### 2. 配置API密钥

获取DeepSeek API密钥: https://platform.deepseek.com/

```bash
cp config/.env.example config/.env
# 编辑 config/.env，填入你的API密钥
```

### 3. 测试连接（可选）

```bash
python test_deepseek.py
```

### 4. 启动服务

```bash
# 使用启动脚本（推荐）
python start.py

# 或手动启动
python -m uvicorn backend.api.app:app --reload --host 127.0.0.1 --port 8000
```

### 5. 访问界面

打开浏览器访问: http://127.0.0.1:8000/

## 使用指南

### 生成小说

1. 在"生成器"页面输入主题
2. 选择情节元素（出轨、掉马、假死等）
3. 点击"生成小说"按钮
4. 等待AI生成完成后，在"我的项目"中查看

### 编辑内容

1. 在项目列表中点击项目卡片
2. 左侧选择章节进行编辑
3. 可使用"AI润色"优化内容
4. 保存后自动更新到数据库

### 抓取语料

1. 在"语料库"页面选择平台和关键词
2. 点击"抓取"按钮
3. 系统会自动保存抓取的内容

## 项目结构

```
novel-generator/
├── backend/
│   ├── ai/              # AI客户端
│   ├── analyzer/        # 语料分析
│   ├── crawler/         # 爬虫模块
│   ├── database/        # 数据库模型
│   ├── generator/       # 生成引擎
│   ├── templates/       # 情节模板库
│   ├── api/            # Web API
│   └── scheduler.py    # 定时任务
├── frontend/
│   ├── index.html      # 主页面
│   └── static/         # 静态资源
├── config/             # 配置文件
└── requirements.txt    # 依赖清单
```

## 技术栈

- **后端**: FastAPI + SQLAlchemy + SQLite
- **AI**: DeepSeek (OpenAI兼容API)
- **爬虫**: requests + BeautifulSoup4 + playwright
- **前端**: 原生HTML/CSS/JavaScript

## API文档

启动服务后访问: http://127.0.0.1:8000/docs

## 配置说明

### 环境变量 (config/.env)

```bash
# DeepSeek配置
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_MODEL=deepseek-chat

# 数据库配置
DATABASE_URL=sqlite:///./novel_generator.db

# 爬虫配置
CRAWL_INTERVAL=3600
CRAWL_SCHEDULE=0 2 * * *

# 服务配置
HOST=127.0.0.1
PORT=8000
```

## 注意事项

1. **API价格**: DeepSeek按token计费，价格优惠（约0.001元/千token）
2. **爬虫限制**: 部分平台有反爬机制，建议使用Cookie登录
3. **生成时间**: 生成一篇万字小说大约需要5-10分钟

## 许可证

MIT License
