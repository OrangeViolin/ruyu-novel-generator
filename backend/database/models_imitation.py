"""
仿写系统的数据模型
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey
from datetime import datetime
from backend.database.models import Base


class ImitationProject(Base):
    """仿写项目表"""
    __tablename__ = 'imitation_projects'

    id = Column(Integer, primary_key=True, index=True)

    # 基本信息
    title = Column(String(200))  # 项目标题
    status = Column(String(20), default="deconstructing")  # deconstructing(拆解中), configuring(配置中), previewing(预览中), generating(生成中), completed(已完成)

    # 原文信息
    original_title = Column(String(200))  # 原文标题
    original_content = Column(Text)  # 原文内容
    original_source = Column(String(500))  # 原文来源（URL或文件名）

    # 新设定信息
    new_worldview = Column(String(100))  # 新世界观（玄幻/都市/科幻/末世等）
    protagonist_setting = Column(Text)  # 主角人设（JSON字符串）
    core_conflict = Column(Text)  # 核心冲突类型
    golden_finger = Column(Text)  # 金手指/外挂设定

    # 各阶段成果
    deconstruction_result = Column(JSON)  # 拆解结果（阶段一）
    reconstruction_blueprint = Column(JSON)  # 重构蓝图（阶段三）
    generated_content = Column(Text)  # 生成的仿写正文（阶段四）

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now)


class ImitationStep(Base):
    """仿写步骤记录表（类似ManuscriptStep）"""
    __tablename__ = 'imitation_steps'

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey('imitation_projects.id'))

    step_name = Column(String(50))  # 步骤名称：deconstruction, configuration, preview, generation
    step_data = Column(JSON)  # 步骤数据
    status = Column(String(20), default="pending")  # pending, in_progress, completed, failed
    error_message = Column(Text)  # 错误信息

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now)
