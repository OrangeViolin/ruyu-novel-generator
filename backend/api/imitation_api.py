"""
仿写生成系统的API实现
"""

from fastapi import HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from backend.ai.ai_factory import AIClientFactory
from backend.prompts.imitation_prompts import (
    DECONSTRUCTION_PROMPT,
    RECONSTRUCTION_PROMPT,
    GENERATION_PROMPT
)
import json


# ========== 数据模型 ==========

class DeconstructionRequest(BaseModel):
    """阶段一：拆解请求"""
    original_title: str
    original_content: str
    original_source: Optional[str] = None


class ConfigurationRequest(BaseModel):
    """阶段二：配置请求"""
    project_id: int
    new_worldview: str  # 世界观类型
    protagonist_setting: Dict[str, Any]  # 主角人设
    core_conflict: str  # 核心冲突
    golden_finger: str  # 金手指设定


class PreviewRequest(BaseModel):
    """阶段三：预览请求"""
    project_id: int


class GenerationRequest(BaseModel):
    """阶段四：生成请求"""
    project_id: int


# ========== 响应模型 ==========

class DeconstructionResponse(BaseModel):
    """拆解响应"""
    success: bool
    project_id: Optional[int] = None
    analysis: Optional[Dict[str, Any]] = None
    message: Optional[str] = None


class ConfigurationResponse(BaseModel):
    """配置响应"""
    success: bool
    message: Optional[str] = None


class PreviewResponse(BaseModel):
    """预览响应"""
    success: bool
    blueprint: Optional[Dict[str, Any]] = None
    message: Optional[str] = None


class GenerationResponse(BaseModel):
    """生成响应"""
    success: bool
    content: Optional[str] = None
    message: Optional[str] = None


# ========== 核心逻辑 ==========

class ImitationGenerator:
    """仿写生成器"""

    def __init__(self, db):
        self.db = db
        self.ai_client = AIClientFactory.get_client()

    def deconstruct(self, request: DeconstructionRequest) -> DeconstructionResponse:
        """阶段一：深度拆解"""

        try:
            # 调用AI进行拆解分析
            messages = [{"role": "user", "content": DECONSTRUCTION_PROMPT + request.original_content}]

            response = self.ai_client._call_api(
                messages,
                temperature=0.7,
                max_tokens=3000
            )

            # 解析JSON响应
            try:
                # 尝试提取JSON
                analysis = self._extract_json(response)

                # 创建仿写项目
                project = ImitationProject(
                    title=f"仿写: {request.original_title}",
                    status="configuring",
                    original_title=request.original_title,
                    original_content=request.original_content,
                    original_source=request.original_source,
                    deconstruction_result=analysis
                )

                self.db.add(project)
                self.db.commit()
                self.db.refresh(project)

                # 创建步骤记录
                step = ImitationStep(
                    project_id=project.id,
                    step_name="deconstruction",
                    step_data=analysis,
                    status="completed"
                )
                self.db.add(step)
                self.db.commit()

                return DeconstructionResponse(
                    success=True,
                    project_id=project.id,
                    analysis=analysis
                )

            except Exception as e:
                # JSON解析失败，返回原始文本
                return DeconstructionResponse(
                    success=False,
                    message=f"AI响应解析失败: {str(e)}\n原始响应: {response[:500]}"
                )

        except Exception as e:
            import traceback
            traceback.print_exc()
            return DeconstructionResponse(
                success=False,
                message=str(e)
            )

    def configure(self, request: ConfigurationRequest) -> ConfigurationResponse:
        """阶段二：配置新设定"""

        try:
            # 获取项目
            project = self.db.query(ImitationProject).filter(
                ImitationProject.id == request.project_id
            ).first()

            if not project:
                raise HTTPException(status_code=404, detail="项目不存在")

            # 更新项目配置
            project.new_worldview = request.new_worldview
            project.protagonist_setting = json.dumps(request.protagonist_setting, ensure_ascii=False)
            project.core_conflict = request.core_conflict
            project.golden_finger = request.golden_finger
            project.status = "previewing"

            # 创建步骤记录
            step = ImitationStep(
                project_id=project.id,
                step_name="configuration",
                step_data=request.dict(),
                status="completed"
            )
            self.db.add(step)

            self.db.commit()

            return ConfigurationResponse(success=True, message="配置成功")

        except Exception as e:
            import traceback
            traceback.print_exc()
            return ConfigurationResponse(success=False, message=str(e))

    def preview(self, request: PreviewRequest) -> PreviewResponse:
        """阶段三：生成重构蓝图预览"""

        try:
            # 获取项目
            project = self.db.query(ImitationProject).filter(
                ImitationProject.id == request.project_id
            ).first()

            if not project:
                raise HTTPException(status_code=404, detail="项目不存在")

            # 准备prompt参数
            protagonist_setting = json.loads(project.protagonist_setting) if isinstance(project.protagonist_setting, str) else project.protagonist_setting

            prompt = RECONSTRUCTION_PROMPT.format(
                original_analysis=json.dumps(project.deconstruction_result, ensure_ascii=False),
                new_worldview=project.new_worldview,
                protagonist_setting=json.dumps(protagonist_setting, ensure_ascii=False),
                core_conflict=project.core_conflict,
                golden_finger=project.golden_finger
            )

            # 调用AI生成蓝图
            messages = [{"role": "user", "content": prompt}]

            response = self.ai_client._call_api(
                messages,
                temperature=0.8,
                max_tokens=4000
            )

            # 解析JSON响应
            try:
                blueprint = self._extract_json(response)

                # 更新项目
                project.reconstruction_blueprint = blueprint
                project.status = "generating"

                # 创建步骤记录
                step = ImitationStep(
                    project_id=project.id,
                    step_name="preview",
                    step_data=blueprint,
                    status="completed"
                )
                self.db.add(step)

                self.db.commit()

                return PreviewResponse(
                    success=True,
                    blueprint=blueprint
                )

            except Exception as e:
                return PreviewResponse(
                    success=False,
                    message=f"AI响应解析失败: {str(e)}\n原始响应: {response[:500]}"
                )

        except Exception as e:
            import traceback
            traceback.print_exc()
            return PreviewResponse(success=False, message=str(e))

    def generate(self, request: GenerationRequest) -> GenerationResponse:
        """阶段四：生成正文"""

        try:
            # 获取项目
            project = self.db.query(ImitationProject).filter(
                ImitationProject.id == request.project_id
            ).first()

            if not project:
                raise HTTPException(status_code=404, detail="项目不存在")

            # 准备prompt参数
            protagonist_setting = json.loads(project.protagonist_setting) if isinstance(project.protagonist_setting, str) else project.protagonist_setting

            new_settings = {
                "worldview": project.new_worldview,
                "protagonist": protagonist_setting,
                "conflict": project.core_conflict,
                "golden_finger": project.golden_finger
            }

            prompt = GENERATION_PROMPT.format(
                new_settings=json.dumps(new_settings, ensure_ascii=False),
                reconstruction_blueprint=json.dumps(project.reconstruction_blueprint, ensure_ascii=False),
                original_chapter=project.original_content[:1000]  # 只取前1000字作为风格参考
            )

            # 调用AI生成正文
            messages = [{"role": "user", "content": prompt}]

            response = self.ai_client._call_api(
                messages,
                temperature=0.85,
                max_tokens=6000
            )

            # 更新项目
            project.generated_content = response
            project.status = "completed"

            # 创建步骤记录
            step = ImitationStep(
                project_id=project.id,
                step_name="generation",
                step_data={"word_count": len(response)},
                status="completed"
            )
            self.db.add(step)

            self.db.commit()

            return GenerationResponse(
                success=True,
                content=response
            )

        except Exception as e:
            import traceback
            traceback.print_exc()
            return GenerationResponse(success=False, message=str(e))

    def _extract_json(self, text: str) -> Dict[str, Any]:
        """从AI响应中提取JSON"""

        # 尝试直接解析
        try:
            return json.loads(text)
        except:
            pass

        # 尝试提取markdown代码块
        import re
        json_pattern = r'```json\s*(.*?)\s*```'
        match = re.search(json_pattern, text, re.DOTALL)

        if match:
            try:
                return json.loads(match.group(1))
            except:
                pass

        # 尝试提取花括号内容
        brace_pattern = r'\{.*\}'
        match = re.search(brace_pattern, text, re.DOTALL)

        if match:
            try:
                return json.loads(match.group(0))
            except:
                pass

        raise ValueError("无法提取有效JSON")
