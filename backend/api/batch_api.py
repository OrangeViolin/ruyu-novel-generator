"""
批量生成API接口
"""

from fastapi import HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from backend.generator.batch_generator import BatchGenerator
from backend.database.models import get_db, BatchGenerationTask, GenerationTask


# ========== 数据模型 ==========

class CreateBatchRequest(BaseModel):
    """创建批量任务请求"""
    task_name: str  # 任务名称
    task_type: str = "short_story"  # short_story / long_novel
    base_settings: Dict[str, Any]  # 基础设定
    variations: List[Dict[str, Any]]  # 变化参数列表
    max_workers: int = 3  # 最大并行数


class VariationTemplate(BaseModel):
    """变化参数模板"""
    genres: List[str] = []  # 题材变化 ["甜宠", "悬疑", "大女主"]
    perspectives: List[str] = []  # 视角变化 ["first", "third"]
    summary_variations: List[str] = []  # 摘要变化


# ========== API端点 ==========

# 全局批量生成器实例
batch_generator = BatchGenerator(max_workers=3)


def create_batch_generation_api(app):
    """注册批量生成API"""

    @app.post("/api/batch/create")
    async def create_batch_task(request: CreateBatchRequest):
        """创建批量生成任务"""
        try:
            # 创建批量任务
            batch_id = batch_generator.create_batch_task(
                task_name=request.task_name,
                task_type=request.task_type,
                settings_template=request.base_settings,
                variations=request.variations
            )

            # 获取任务信息
            progress = batch_generator.get_batch_progress(batch_id)

            return {
                "success": True,
                "batch_id": batch_id,
                "message": f"已创建批量任务，将生成 {len(request.variations)} 篇文章",
                "progress": progress
            }

        except Exception as e:
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/api/batch/progress/{batch_id}")
    async def get_batch_progress(batch_id: int):
        """获取批量任务进度"""
        try:
            progress = batch_generator.get_batch_progress(batch_id)
            return {"success": True, "progress": progress}
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/api/batch/cancel/{batch_id}")
    async def cancel_batch_task(batch_id: int):
        """取消批量任务"""
        try:
            success = batch_generator.cancel_batch_task(batch_id)

            if success:
                return {"success": True, "message": "任务已取消"}
            else:
                return {"success": False, "message": "无法取消任务（可能已完成或不存在）"}

        except Exception as e:
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/api/batch/tasks")
    async def list_batch_tasks():
        """获取所有批量任务列表"""
        try:
            tasks = batch_generator.get_all_batch_tasks()
            return {"success": True, "tasks": tasks}
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/api/batch/task/{batch_id}")
    async def get_batch_task_detail(batch_id: int):
        """获取批量任务详情"""
        try:
            db = next(get_db())

            batch_task = db.query(BatchGenerationTask).filter(
                BatchGenerationTask.id == batch_id
            ).first()

            if not batch_task:
                raise HTTPException(status_code=404, detail="任务不存在")

            # 获取子任务
            sub_tasks = db.query(GenerationTask).filter(
                GenerationTask.batch_id == batch_id
            ).all()

            sub_tasks_detail = []
            for t in sub_tasks:
                sub_tasks_detail.append({
                    "id": t.id,
                    "task_name": t.task_name,
                    "status": t.status,
                    "progress": t.progress_percentage,
                    "current_step": t.current_step,
                    "result": t.result,
                    "error": t.error_message,
                    "created_at": t.created_at.isoformat() if t.created_at else None,
                    "started_at": t.started_at.isoformat() if t.started_at else None,
                    "completed_at": t.completed_at.isoformat() if t.completed_at else None
                })

            result = {
                "id": batch_task.id,
                "task_name": batch_task.task_name,
                "task_type": batch_task.task_type,
                "status": batch_task.status,
                "total_count": batch_task.total_count,
                "completed_count": batch_task.completed_count,
                "failed_count": batch_task.failed_count,
                "progress_percentage": batch_task.progress_percentage,
                "current_step": batch_task.current_step,
                "results": batch_task.results or [],
                "sub_tasks": sub_tasks_detail,
                "error_message": batch_task.error_message,
                "created_at": batch_task.created_at.isoformat() if batch_task.created_at else None,
                "started_at": batch_task.started_at.isoformat() if batch_task.started_at else None,
                "completed_at": batch_task.completed_at.isoformat() if batch_task.completed_at else None,
                "estimated_completion": batch_task.estimated_completion.isoformat() if batch_task.estimated_completion else None
            }

            db.close()
            return {"success": True, "task": result}

        except Exception as e:
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=str(e))


# 快速创建批量任务的便捷API

class QuickCreateRequest(BaseModel):
    """快速批量创建请求"""
    task_name: str
    base_summary: str
    genres: List[str]
    chapter_count: int = 8
    target_words: int = 22000


def register_quick_create_api(app):
    """注册快速创建API"""

    @app.post("/api/batch/quick-create")
    async def quick_create_batch(request: QuickCreateRequest):
        """快速创建批量任务 - 只需提供基础信息和题材列表"""
        try:
            # 基础设定
            base_settings = {
                "summary": request.base_summary,
                "chapterCount": request.chapter_count,
                "targetWords": request.target_words,
                "perspective": "first",
                "tropes": []
            }

            # 生成变体
            variations = []
            for genre in request.genres:
                variations.append({
                    "genre": genre,
                    "model_provider": "deepseek"
                })

            # 创建任务
            batch_id = batch_generator.create_batch_task(
                task_name=request.task_name,
                task_type="short_story",
                settings_template=base_settings,
                variations=variations
            )

            return {
                "success": True,
                "batch_id": batch_id,
                "message": f"开始批量生成 {len(request.genres)} 篇不同题材的文章"
            }

        except Exception as e:
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=str(e))

