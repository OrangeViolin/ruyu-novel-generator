from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

Base = declarative_base()

# 数据库配置
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./novel_generator.db")
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class ExampleAnalysis(Base):
    """例文拆解笔记表"""
    __tablename__ = 'example_analyses'

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200))  # 例文标题
    source_url = Column(String(500))  # 来源链接（可选）
    content = Column(Text)  # 例文原文内容

    # 拆解内容
    analysis_title = Column(Text)  # 文章名称（拆解后的）
    core_conflict = Column(Text)  # 核心冲突
    information_gap = Column(Text)  # 信息差
    core_task = Column(Text)  # 核心任务
    character_profile = Column(Text)  # 人设分析

    notes = Column(Text)  # 个人学习笔记
    tags = Column(JSON)  # 标签 ['世情文', '追妻火葬场']

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now)


class NovelProject(Base):
    """小说项目表"""
    __tablename__ = 'novel_projects'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200))

    # 基础设定
    theme = Column(Text)  # 主题
    background = Column(String(100))  # 背景设定（如：港澳/金牌播报员）
    target_words = Column(Integer, default=10000)  # 目标字数
    genre = Column(String(50))  # 题材类型（世情文、追妻火葬场等）

    # 核心要素
    core_conflict = Column(Text)  # 核心冲突
    core_task = Column(Text)  # 核心任务/目标

    # 旧字段（保留兼容性）
    outline = Column(JSON)  # 完整大纲（已废弃，使用PlotOutline表）
    characters = Column(JSON)  # 人物字典（已废弃，使用Character表）
    chapters = Column(JSON)  # 章节列表（已废弃，使用ChapterDraft表）

    status = Column(String(20), default="planning")  # planning, writing, completed
    word_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now)


class Character(Base):
    """人物表 - 支持细粒度的人设管理（增强版：星月风格角色卡）"""
    __tablename__ = 'characters'

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer)  # 关联的项目ID

    # 基本信息
    name = Column(String(100))  # 姓名
    role_type = Column(String(50))  # 角色类型：protagonist(主角), antagonist(反派), supporting(配角)
    importance = Column(String(20), default="supporting")  # 重要程度：core(核心), important(重要), supporting(配角)
    status = Column(String(20), default="active")  # 状态：active(活跃), inactive(下线), pending(待出场)
    is_visible = Column(Integer, default=1)  # 是否可见：1=可见, 0=隐藏（用于角色太多时隐藏）

    age = Column(Integer)  # 年龄
    gender = Column(String(10))  # 性别
    appearance = Column(Text)  # 外貌描述

    # 核心设定（星月风格：最小化原则）
    core_identity = Column(Text)  # 核心身份（一句话）
    core_personality = Column(Text)  # 核心性格（3个关键词）
    core_motivation = Column(Text)  # 核心动机（一句话）
    personality_flaw = Column(Text)  # 性格缺陷（新增：影响剧情的缺陷）
    flaw_consequence = Column(Text)  # 缺陷影响（新增：缺陷如何影响剧情）
    growth_direction = Column(Text)  # 成长方向

    # 性格与背景（保留兼容性）
    personality = Column(Text)  # 性格特点（详细版）
    background = Column(Text)  # 背景故事
    motivation = Column(Text)  # 动机/目标（详细版）
    secret = Column(Text)  # 秘密（反转点）

    # 关系与能力
    relationships = Column(JSON)  # 人物关系 [{"name": "张三", "type": "夫妻", "description": "", "strength": 8}]
    current_location = Column(String(200))  # 当前位置（新增）
    abilities = Column(JSON)  # 能力/技能列表

    # 人设细节
    speech_pattern = Column(Text)  # 语言风格（用于AI生成对话）
    speech_example = Column(Text)  # 对话示例（新增：帮助AI学习说话风格）
    behavior_habits = Column(Text)  # 行为习惯
    emotional_triggers = Column(Text)  # 情绪触发点

    # 关系补充（星月风格：临时信息优先级更高）
    relationship_notes = Column(Text)  # 关系补充说明（新增）

    # 人物小传（只写到当前剧情进度）
    biography_current = Column(Text)  # 当前进度的小传
    biography_full = Column(Text)  # 完整小传（可选）

    # 元信息
    source = Column(String(20), default="manual")  # manual(手动创建), ai_generated(AI生成)
    notes = Column(Text)  # 备注笔记
    first_appearance_chapter = Column(Integer)  # 首次出场章节
    last_appearance_chapter = Column(Integer)  # 最后出场章节

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now)


class PlotOutline(Base):
    """情节大纲表 - 支持分章大纲管理"""
    __tablename__ = 'plot_outlines'

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer)  # 关联的项目ID

    # 大纲层级
    level = Column(String(20))  # story(故事梗概), chapter(章节大纲), scene(场景细节)
    parent_id = Column(Integer)  # 父级大纲ID（用于场景归属）

    # 章节信息
    chapter_number = Column(Integer)  # 章节序号
    title = Column(String(200))  # 章节标题
    summary = Column(Text)  # 章节摘要

    # 情节要点
    plot_points = Column(JSON)  # 情节要点列表 ["主角发现真相", "与反派对峙"]
    key_events = Column(JSON)  # 关键事件 [{"time": "", "location": "", "event": "", "characters": []}]

    # 章节设定
    target_words = Column(Integer)  # 目标字数
    focus_elements = Column(JSON)  # 本章重点元素 ["强人设", "情绪钩子"]
    emotion_arc = Column(Text)  # 情绪弧线（情绪如何变化）

    # 关联人物
    characters_involved = Column(JSON)  # 涉及人物 ["主角", "反派"]

    # 元信息
    source = Column(String(20), default="manual")  # manual, ai_generated
    status = Column(String(20), default="draft")  # draft(草稿), ready(待生成), generated(已生成)
    notes = Column(Text)  # 备注笔记

    order = Column(Integer)  # 排序
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now)


class ChapterDraft(Base):
    """章节草稿表 - 支持分步写作和编辑"""
    __tablename__ = 'chapter_drafts'

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer)  # 关联的项目ID
    outline_id = Column(Integer)  # 关联的大纲ID

    # 章节信息
    chapter_number = Column(Integer)  # 章节序号
    title = Column(String(200))  # 章节标题
    content = Column(Text)  # 章节内容
    word_count = Column(Integer, default=0)

    # 生成/编辑状态
    status = Column(String(20), default="draft")  # draft(草稿), generating(生成中), revising(修订中), completed(完成)

    # 编辑记录
    edit_count = Column(Integer, default=0)  # 人工编辑次数
    ai_revision_count = Column(Integer, default=0)  # AI润色次数
    human_ai_ratio = Column(String(20))  # 人机比例（如："70:30"）

    # 生成参数
    generation_params = Column(JSON)  # 生成参数记录 {"temperature": 0.8, "focus": "情绪钩子"}

    # 备注与反馈
    notes = Column(Text)  # 写作笔记
    issues = Column(Text)  # 问题记录（如：需要加强情绪描写）

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now)


class PlotModule(Base):
    """情节模板表"""
    __tablename__ = 'plot_modules'

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(50))  # 出轨, 掉马, 假死
    subcategory = Column(String(50))  # 子分类（如discovery_scene）
    name = Column(String(100))  # 模板名称
    template_content = Column(Text)  # 模板内容（支持变量占位符）
    variables = Column(JSON)  # 可替换的变量 {"name": "变量名", "type": "string", "default": ""}
    example_usage = Column(Text)  # 使用示例
    usage_count = Column(Integer, default=0)  # 使用次数
    emotion_score = Column(Integer, default=0)  # 情绪强度
    created_at = Column(DateTime, default=datetime.now)


class CrawlTask(Base):
    """爬虫任务表"""
    __tablename__ = 'crawl_tasks'

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(50))  # 目标平台
    status = Column(String(20), default="pending")  # pending, running, success, failed
    url_count = Column(Integer, default=0)  # 爬取URL数量
    success_count = Column(Integer, default=0)  # 成功数量
    error_message = Column(Text)
    started_at = Column(DateTime)
    finished_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.now)


class Submission(Base):
    """投稿记录表"""
    __tablename__ = 'submissions'

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer)  # 关联的项目ID
    platform = Column(String(50))  # 投稿平台：番茄、七猫、灯下等
    pen_name = Column(String(50))  # 笔名
    book_name = Column(String(200))  # 书名
    theme = Column(String(200))  # 主题
    word_count = Column(Integer)  # 字数
    status = Column(String(20), default="pending")  # 待投稿、已投稿、审核中等
    submission_date = Column(String(20))  # 投稿日期
    notes = Column(Text)  # 备注
    generated_title = Column(Text)  # 自动生成的投稿标题
    generated_intro = Column(Text)  # 自动生成的邮件导语
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now)


def init_db():
    """初始化数据库"""
    Base.metadata.create_all(bind=engine)


def get_db():
    """获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class Agent(Base):
    """AI智能体表 - 可复用的写作助手"""
    __tablename__ = 'agents'

    id = Column(Integer, primary_key=True, index=True)

    # 基本信息
    name = Column(String(200))  # 智能体名称（如"短篇导语生成器"）
    description = Column(Text)  # 描述
    category = Column(String(50))  # 分类：outline(大纲), character(人物), chapter(章节), intro(导语), custom(自定义)
    agent_type = Column(String(20))  # 类型：system(系统预设), user(用户创建)

    # 核心配置
    system_prompt = Column(Text)  # 系统提示词（支持{{变量}}占位符）
    variables = Column(JSON)  # 变量定义 [{"name": "对标作品", "type": "text", "default": "", "required": true}]

    # 参数设置
    ai_model = Column(String(50))  # AI模型名称（deepseek, gpt-4等）
    temperature = Column(Integer, default=80)  # 创意度（0-100）
    max_tokens = Column(Integer, default=2048)  # 最大输出长度
    batch_count = Column(Integer, default=1)  # 批量生成数量（1-5）

    # 权限管理
    visibility = Column(String(20), default="private")  # public(公开), link_only(仅链接), private(私有)
    access_token = Column(String(100))  # 访问令牌
    access_expires_at = Column(DateTime)  # 访问过期时间
    require_approval = Column(Integer, default=0)  # 是否需要审批（0=否, 1=是）

    # 标签与排序
    tags = Column(JSON)  # 标签 ["导语", "短篇", "世情文"]
    order = Column(Integer, default=0)  # 排序

    # 使用统计
    usage_count = Column(Integer, default=0)  # 使用次数
    like_count = Column(Integer, default=0)  # 点赞数

    # 创建者信息
    creator_id = Column(String(100))  # 创建者ID（可为空或用户标识）
    is_official = Column(Integer, default=0)  # 是否官方（0=否, 1=是）

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now)


class AgentExecution(Base):
    """智能体执行记录表"""
    __tablename__ = 'agent_executions'

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer)  # 关联的智能体ID

    # 输入数据
    input_variables = Column(JSON)  # 用户输入的变量值 {"对标作品": "xxx", "导语": "xxx"}

    # 执行参数
    model_used = Column(String(50))  # 使用的模型
    temperature = Column(Integer)  # 创意度
    batch_count = Column(Integer)  # 批量数量

    # 执行状态
    status = Column(String(20), default="running")  # running(执行中), success(成功), failed(失败)
    error_message = Column(Text)  # 错误信息

    # 执行时间
    started_at = Column(DateTime, default=datetime.now)
    completed_at = Column(DateTime)

    created_at = Column(DateTime, default=datetime.now)


class AgentVersion(Base):
    """智能体生成版本表 - 批量生成的多个版本"""
    __tablename__ = 'agent_versions'

    id = Column(Integer, primary_key=True, index=True)
    execution_id = Column(Integer)  # 关联的执行记录ID
    agent_id = Column(Integer)  # 关联的智能体ID

    # 版本信息
    version_number = Column(Integer)  # 版本号（1, 2, 3...）
    content = Column(Text)  # 生成的内容

    # 用户反馈
    is_selected = Column(Integer, default=0)  # 是否被用户选中（0=否, 1=是）
    rating = Column(Integer)  # 用户评分（1-5）
    feedback = Column(Text)  # 用户反馈

    created_at = Column(DateTime, default=datetime.now)


class AgentShare(Base):
    """智能体分享记录表"""
    __tablename__ = 'agent_shares'

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer)  # 关联的智能体ID

    # 分享信息
    share_code = Column(String(50), unique=True)  # 分享码
    shared_by = Column(String(100))  # 分享者ID

    # 访问控制
    access_type = Column(String(20))  # public(公开), restricted(受限)
    expires_at = Column(DateTime)  # 过期时间
    require_approval = Column(Integer, default=0)  # 是否需要审批

    # 统计
    view_count = Column(Integer, default=0)  # 浏览次数
    use_count = Column(Integer, default=0)  # 使用次数

    created_at = Column(DateTime, default=datetime.now)


class ReferenceMaterial(Base):
    """参考素材表 - 用于写同款功能"""
    __tablename__ = 'reference_materials'

    id = Column(Integer, primary_key=True, index=True)

    # 基本信息
    title = Column(String(200))  # 素材标题（作品名称）
    author = Column(String(100))  # 作者
    source = Column(String(100))  # 来源（番茄、七猫、晋江等）
    source_url = Column(String(500))  # 来源链接

    # 文件信息
    file_type = Column(String(20))  # 文件类型：txt, docx, pdf
    file_path = Column(String(500))  # 文件存储路径
    file_size = Column(Integer)  # 文件大小（字节）

    # 内容分类
    content_type = Column(String(50))  # full(完整小说), intro(导语), outline(大纲), analysis(拆解笔记)

    # 原始内容
    raw_content = Column(Text)  # 提取的文本内容

    # AI分析结果
    analysis = Column(JSON)  # 完整的AI分析结果
    genre = Column(String(100))  # 题材类型（世情文、追妻火葬场等）
    tags = Column(JSON)  # 标签 ["狗血", "虐恋", "复仇"]
    core_conflict = Column(Text)  # 核心冲突
    emotion_style = Column(String(100))  # 情绪风格（压抑、爆发、温暖等）
    writing_style = Column(Text)  # 写作风格描述

    # 人物提取
    characters_extracted = Column(JSON)  # 提取的人物列表 [{"name": "XX", "role": "主角", "traits": []}]

    # 情节结构
    plot_structure = Column(JSON)  # 情节结构 [{"chapter": 1, "summary": "", "emotion": ""}]

    # 同款度评分（用于推荐相似素材）
    similarity_tags = Column(JSON)  # 相似度标签 {"狗血": 0.9, "虐恋": 0.8}

    # 使用统计
    usage_count = Column(Integer, default=0)  # 被使用的次数
    like_count = Column(Integer, default=0)  # 点赞数
    is_favorite = Column(Integer, default=0)  # 是否收藏

    # 状态
    status = Column(String(20), default="pending")  # pending(待分析), analyzing(分析中), completed(已完成), failed(失败)
    analysis_progress = Column(Integer, default=0)  # 分析进度 0-100

    # 元信息
    uploaded_by = Column(String(100))  # 上传者ID
    notes = Column(Text)  # 备注笔记

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now)


class WritingStyle(Base):
    """写作风格表 - AI风格学习系统（星月风格）"""
    __tablename__ = 'writing_styles'

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer)  # 关联的项目ID

    # 风格特征（自动提取）
    avg_sentence_length = Column(Integer)  # 平均句长（字数）
    sentence_length_distribution = Column(JSON)  # 句长分布 {"short": 30, "medium": 50, "long": 20}
    dialogue_ratio = Column(Integer)  # 对话占比（0-100）
    description_density = Column(String(20))  # 描写密度：sparse(稀疏), medium(中等), dense(密集)

    # 词汇特征
    vocabulary_complexity = Column(String(20))  # 词汇复杂度：simple(简单), moderate(中等), complex(复杂)
    common_words = Column(JSON)  # 高频词汇列表 ["词语", "频率"]
    metaphor_usage = Column(Integer)  # 比喻使用频率（每千字）

    # 节奏特征
    pacing = Column(String(20))  # 节奏类型：fast(快), medium(中等), slow(慢)
    paragraph_avg_length = Column(Integer)  # 平均段落数

    # 风格标签
    style_tags = Column(JSON)  # 风格标签 ["简洁有力", "对话驱动", "心理描写丰富"]
    emotion_intensity = Column(String(20))  # 情绪强度：mild(温和), moderate(中等), intense(强烈)

    # 示例文本（用于AI学习）
    sample_dialogue = Column(Text)  # 对话示例
    sample_narration = Column(Text)  # 旁白示例
    sample_description = Column(Text)  # 描写示例

    # 学习来源
    source_chapters = Column(JSON)  # 学习的章节 [1, 2, 3]
    source_word_count = Column(Integer)  # 学习的字数
    learned_at = Column(DateTime)  # 学习时间

    # 应用设置
    style_strength = Column(Integer, default=80)  # 风格强度（0-100），控制AI模仿程度
    enable_style_learning = Column(Integer, default=1)  # 是否启用风格学习：1=启用, 0=禁用

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now)


class ChannelAgent(Base):
    """渠道投稿智能体表 - 针对不同公众号/渠道的定制AI"""
    __tablename__ = 'channel_agents'

    id = Column(Integer, primary_key=True, index=True)

    # 基本信息
    name = Column(String(200), nullable=False)  # 智能体名称，如"武志红公众号"
    description = Column(Text)  # 智能体描述
    channel_type = Column(String(50))  # 渠道类型：psychology(心理), emotion(情感), career(职场), parenting(育儿)
    target_audience = Column(String(200))  # 目标受众：如"25-35岁都市女性"

    # 联系信息（投稿相关）
    contact_info = Column(JSON)  # 投稿联系信息
    # {
    #   "email": "submission@example.com",
    #   "wechat": "xxx_wechat",
    #   "submission_url": "https://example.com/submit",
    #   "payment_info": "稿费xxx元/篇",
    #   "response_time": "3-7个工作日"
    # }

    # 渠道特点（用户上传的配置）
    channel_characteristics = Column(JSON)  # 渠道特点配置
    # {
    #   "topics": ["亲密关系", "个人成长", "情绪管理"],
    #   "tone": "温暖、包容、有深度",
    #   "forbidden_topics": ["政治", "宗教极端"],
    #   "special_requirements": "需要案例支撑"
    # }

    # 训练语料文件
    training_files = Column(JSON)  # 上传的语料文件列表 [{"filename": "xxx.txt", "upload_time": "..."}]
    corpus_word_count = Column(Integer, default=0)  # 语料总字数

    # AI提取的风格特征（自动学习）
    title_style = Column(JSON)  # 标题风格特征
    # {
    #   "avg_length": 15,  # 平均标题长度
    #   "patterns": ["疑问句式", "数字标题", "对比式"],
    #   "examples": ["为什么你总是___？", "3个方法___"]
    # }

    topic_preferences = Column(JSON)  # 话题偏好
    # {
    #   "hot_topics": ["原生家庭", "依恋类型", "自我成长"],
    #   "topic_weights": {"亲密关系": 0.8, "职场": 0.2},
    #   "forbidden": ["政治敏感", "极端观点"]
    # }

    writing_style = Column(JSON)  # 文风特征
    # {
    #   "tone": "温暖、包容、专业",  # 语调
    #   "sentence_style": "中等偏短，亲和力强",  # 句式风格
    #   "opening_pattern": "故事/案例引入",  # 开篇方式
    #   "closing_pattern": "行动建议/鼓励",  # 结尾方式
    #   "pronoun_preference": "第二人称'你'为主"  # 人称偏好
    # }

    content_structure = Column(JSON)  # 内容结构
    # {
    #   "sections": ["案例引入", "分析解读", "方法建议", "总结升华"],
    #   "case_ratio": 0.3,  # 案例占比
    #   "theory_ratio": 0.5,  # 理论分析占比
    #   "action_ratio": 0.2  # 行动建议占比
    # }

    length_requirements = Column(JSON)  # 字数要求
    # {
    #   "min_words": 1500,
    #   "max_words": 3000,
    #   "optimal_words": 2000,
    #   "flexibility": 0.1  # 允许10%浮动
    # }

    # 词汇和表达特征
    vocabulary_features = Column(JSON)  # 词汇特征
    # {
    #   "common_terms": ["原生家庭", "依恋", "边界", "自我关怀"],
    #   "avoid_terms": ["神经症", "变态"],
    #   "metaphor_preference": "生活化比喻，如'情感账户'"
    # }

    # 训练状态
    training_status = Column(String(20), default="pending")  # pending(待训练), training(训练中), completed(已完成), failed(失败)
    training_progress = Column(Integer, default=0)  # 训练进度 0-100
    last_training_at = Column(DateTime)  # 最后训练时间
    training_error = Column(Text)  # 训练错误信息

    # 模型参数
    temperature = Column(Integer, default=70)  # 温度参数 (0-100)，控制创造性
    top_p = Column(Integer, default=90)  # Top-P采样 (0-100)
    frequency_penalty = Column(Integer, default=0)  # 频率惩罚 (0-100)

    # 生成配置
    generation_template = Column(Text)  # 生成提示词模板
    example_outputs = Column(JSON)  # 示例输出（用于质量校准）

    # 使用统计
    usage_count = Column(Integer, default=0)  # 使用次数
    success_count = Column(Integer, default=0)  # 成功生成次数

    # 权限和状态
    is_active = Column(Integer, default=1)  # 是否启用：1=启用, 0=禁用
    is_public = Column(Integer, default=0)  # 是否公开：1=公开, 0=私有

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now)
