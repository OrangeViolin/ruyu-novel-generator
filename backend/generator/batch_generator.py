"""
批量生成处理器 - 支持并行生成多篇文章
"""

from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any
import threading
from datetime import datetime, timedelta
from backend.ai.ai_factory import AIClientFactory
from backend.database.models import get_db, NovelProject, Manuscript, BatchGenerationTask, GenerationTask
from backend.generator.novel_builder import NovelBuilder
import json


class BatchGenerator:
    """批量生成器 - 支持并行生成"""

    def __init__(self, max_workers: int = 3):
        """
        Args:
            max_workers: 最大并行任务数（建议2-5，取决于API限流）
        """
        self.max_workers = max_workers
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.active_tasks = {}  # task_id -> Thread

    def create_batch_task(self, task_name: str, task_type: str,
                         settings_template: Dict, variations: List[Dict]) -> int:
        """创建批量生成任务

        Args:
            task_name: 任务名称
            task_type: 任务类型 (short_story/long_novel/inspiration)
            settings_template: 基础设定模板
            variations: 变化参数列表 [{genre: "甜宠", perspective: "first"}, ...]

        Returns:
            batch_task_id: 批量任务ID
        """
        db = next(get_db())

        # 创建批量任务
        batch_task = BatchGenerationTask(
            task_name=task_name,
            task_type=task_type,
            status="pending",
            total_count=len(variations),
            settings_template=settings_template,
            variations=variations,
            results=[],
            progress_percentage=0.0
        )

        db.add(batch_task)
        db.commit()
        db.refresh(batch_task)

        batch_id = batch_task.id
        db.close()

        # 创建子任务
        for idx, variation in enumerate(variations):
            db = next(get_db())

            sub_task = GenerationTask(
                batch_id=batch_id,
                task_name=f"{task_name} - 变体{idx + 1}",
                status="pending",
                generation_params={**settings_template, **variation}
            )

            db.add(sub_task)
            db.commit()
            db.close()

        # 启动批量生成
        self._start_batch_generation(batch_id)

        return batch_id

    def _start_batch_generation(self, batch_id: int):
        """启动批量生成（在后台线程执行）"""

        def run_batch():
            db = next(get_db())

            # 更新批量任务状态
            batch_task = db.query(BatchGenerationTask).filter(
                BatchGenerationTask.id == batch_id
            ).first()

            if not batch_task:
                return

            batch_task.status = "running"
            batch_task.started_at = datetime.now()
            batch_task.current_step = "初始化中..."

            # 计算预计完成时间（假设每篇5分钟）
            batch_task.estimated_completion = datetime.now() + timedelta(
                minutes=batch_task.total_count * 5
            )

            db.commit()

            # 获取所有待处理的子任务
            sub_tasks = db.query(GenerationTask).filter(
                GenerationTask.batch_id == batch_id,
                GenerationTask.status == "pending"
            ).all()

            db.close()

            # 并行执行子任务
            completed = 0
            results = []

            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                # 提交所有任务
                future_to_task = {
                    executor.submit(self._generate_single_task, task.id): task
                    for task in sub_tasks
                }

                # 处理完成的任务
                for future in as_completed(future_to_task):
                    task = future_to_task[future]
                    task_id = task.id

                    try:
                        result = future.result()
                        completed += 1

                        # 更新进度
                        db = next(get_db())
                        batch_task = db.query(BatchGenerationTask).filter(
                            BatchGenerationTask.id == batch_id
                        ).first()

                        if batch_task:
                            batch_task.completed_count = completed
                            batch_task.progress_percentage = (completed / len(sub_tasks)) * 100
                            batch_task.current_step = f"正在生成 ({completed}/{len(sub_tasks)})"

                            if result and result.get('success'):
                                results.append(result)
                                batch_task.results = results
                            else:
                                batch_task.failed_count += 1

                            # 检查是否全部完成
                            if completed == len(sub_tasks):
                                batch_task.status = "completed"
                                batch_task.completed_at = datetime.now()
                                batch_task.current_step = "全部完成"

                            db.commit()

                        db.close()

                    except Exception as e:
                        import traceback
                        traceback.print_exc()

                        # 更新失败状态
                        db = next(get_db())
                        batch_task = db.query(BatchGenerationTask).filter(
                            BatchGenerationTask.id == batch_id
                        ).first()

                        if batch_task:
                            batch_task.failed_count += 1
                            batch_task.error_message = str(e)
                            db.commit()

                        db.close()

        # 在后台线程运行
        thread = threading.Thread(target=run_batch, daemon=True)
        thread.start()

        self.active_tasks[batch_id] = thread

    def _generate_single_task(self, task_id: int) -> Dict:
        """生成单个任务"""
        db = next(get_db())

        # 获取任务信息
        task = db.query(GenerationTask).filter(GenerationTask.id == task_id).first()

        if not task:
            db.close()
            return {"success": False, "error": "任务不存在"}

        # 保存参数（避免session问题）
        params = task.generation_params
        batch_task_id = task.batch_id

        # 获取批量任务类型（需要在关闭session前）
        from backend.database.models import BatchGenerationTask
        batch_task = db.query(BatchGenerationTask).filter(
            BatchGenerationTask.id == batch_task_id
        ).first()
        task_type = batch_task.task_type if batch_task else "short_story"

        # 更新任务状态
        task.status = "running"
        task.started_at = datetime.now()
        db.commit()
        db.close()

        try:

            # 根据任务类型调用不同的生成逻辑
            if task_type == "short_story":
                result = self._generate_short_story(task_id, params)
            elif task_type == "long_novel":
                result = self._generate_long_novel(task_id, params)
            else:
                result = {"success": False, "error": "不支持的任务类型"}

            # 更新任务完成状态
            db = next(get_db())
            task = db.query(GenerationTask).filter(GenerationTask.id == task_id).first()

            if task:
                task.status = "completed" if result.get("success") else "failed"
                task.completed_at = datetime.now()
                task.progress_percentage = 100.0
                task.result = result

                if not result.get("success"):
                    task.error_message = result.get("error", "未知错误")

                db.commit()

            db.close()

            return result

        except Exception as e:
            import traceback
            traceback.print_exc()

            # 更新失败状态
            db = next(get_db())
            task = db.query(GenerationTask).filter(GenerationTask.id == task_id).first()

            if task:
                task.status = "failed"
                task.error_message = str(e)
                db.commit()

            db.close()

            return {"success": False, "error": str(e)}

    def _generate_short_story(self, task_id: int, params: Dict) -> Dict:
        """生成短篇故事（优化版：减少等待）"""

        db = next(get_db())

        try:
            # 更新进度
            task = db.query(GenerationTask).filter(GenerationTask.id == task_id).first()
            if task:
                task.current_step = "生成设定中..."
                task.progress_percentage = 10.0
                db.commit()

            # 1. 生成设定
            from backend.api.app import generate_short_story_settings
            settings_result = generate_short_story_settings(
                genre=params.get("genre", "甜宠"),
                perspective=params.get("perspective", "first"),
                summary=params.get("summary", ""),
                target_words=params.get("targetWords", 22000),
                chapter_count=params.get("chapterCount", 8),
                tropes=params.get("tropes", []),
                model_provider=params.get("model_provider", "deepseek")
            )

            if not settings_result.get("success"):
                return {"success": False, "error": "设定生成失败"}

            # 更新进度
            if task:
                task.current_step = "生成大纲中..."
                task.progress_percentage = 30.0
                db.commit()

            # 2. 生成大纲
            manuscript_id = settings_result.get("manuscript_id")
            outline_result = generate_short_story_outline(
                manuscript_id=manuscript_id,
                settings=settings_result.get("settings")
            )

            if not outline_result.get("success"):
                return {"success": False, "error": "大纲生成失败"}

            # 更新进度
            if task:
                task.current_step = "生成章节中..."
                task.progress_percentage = 50.0
                db.commit()

            # 3. 生成章节（并行）
            chapters_result = generate_short_story_chapters(
                manuscript_id=manuscript_id,
                chapter_count=params.get("chapterCount", 8)
            )

            if not chapters_result.get("success"):
                return {"success": False, "error": "章节生成失败"}

            # 更新进度
            if task:
                task.current_step = "生成全文中..."
                task.progress_percentage = 80.0
                db.commit()

            # 4. 生成全文
            novel_result = generate_short_story_novel(
                manuscript_id=manuscript_id
            )

            if not novel_result.get("success"):
                return {"success": False, "error": "全文生成失败"}

            # 获取生成的项目
            manuscript = db.query(Manuscript).filter(Manuscript.id == manuscript_id).first()

            result = {
                "success": True,
                "project_id": manuscript.project_id if manuscript else None,
                "manuscript_id": manuscript_id,
                "title": settings_result.get("settings", {}).get("title", "未命名"),
                "word_count": manuscript.word_count if manuscript else 0
            }

            db.close()
            return result

        except Exception as e:
            import traceback
            traceback.print_exc()
            db.close()
            return {"success": False, "error": str(e)}

    def _generate_long_novel(self, task_id: int, params: Dict) -> Dict:
        """生成长篇小说"""
        # TODO: 实现长篇生成逻辑
        return {"success": False, "error": "长篇生成功能开发中"}

    def get_batch_progress(self, batch_id: int) -> Dict:
        """获取批量任务进度"""
        db = next(get_db())

        batch_task = db.query(BatchGenerationTask).filter(
            BatchGenerationTask.id == batch_id
        ).first()

        if not batch_task:
            db.close()
            return {"error": "任务不存在"}

        # 获取子任务列表
        sub_tasks = db.query(GenerationTask).filter(
            GenerationTask.batch_id == batch_id
        ).all()

        sub_tasks_info = [
            {
                "id": t.id,
                "task_name": t.task_name,
                "status": t.status,
                "progress": t.progress_percentage,
                "current_step": t.current_step
            }
            for t in sub_tasks
        ]

        result = {
            "batch_id": batch_task.id,
            "task_name": batch_task.task_name,
            "status": batch_task.status,
            "total_count": batch_task.total_count,
            "completed_count": batch_task.completed_count,
            "failed_count": batch_task.failed_count,
            "progress_percentage": batch_task.progress_percentage,
            "current_step": batch_task.current_step,
            "results": batch_task.results or [],
            "sub_tasks": sub_tasks_info,
            "created_at": batch_task.created_at.isoformat() if batch_task.created_at else None,
            "started_at": batch_task.started_at.isoformat() if batch_task.started_at else None,
            "estimated_completion": batch_task.estimated_completion.isoformat() if batch_task.estimated_completion else None
        }

        db.close()
        return result

    def cancel_batch_task(self, batch_id: int) -> bool:
        """取消批量任务"""
        db = next(get_db())

        batch_task = db.query(BatchGenerationTask).filter(
            BatchGenerationTask.id == batch_id
        ).first()

        if not batch_task or batch_task.status in ["completed", "failed"]:
            db.close()
            return False

        batch_task.status = "cancelled"
        batch_task.current_step = "已取消"
        db.commit()
        db.close()

        return True

    def get_all_batch_tasks(self) -> List[Dict]:
        """获取所有批量任务列表"""
        db = next(get_db())

        tasks = db.query(BatchGenerationTask).order_by(
            BatchGenerationTask.created_at.desc()
        ).all()

        result = [
            {
                "id": t.id,
                "task_name": t.task_name,
                "task_type": t.task_type,
                "status": t.status,
                "total_count": t.total_count,
                "completed_count": t.completed_count,
                "progress_percentage": t.progress_percentage,
                "created_at": t.created_at.isoformat() if t.created_at else None
            }
            for t in tasks
        ]

        db.close()
        return result
