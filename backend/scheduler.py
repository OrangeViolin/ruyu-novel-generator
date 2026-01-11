from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
import sys
import os

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from backend.database.models import get_db, CrawlTask, Corpus
from backend.crawler.zhihu_crawler import ZhihuCrawler
from backend.crawler.xiaohongshu_crawler import XiaohongshuCrawler
from backend.crawler.jinjiang_crawler import JinjiangCrawler
from backend.crawler.qidian_crawler import QidianCrawler
from backend.crawler.feilu_crawler import FeiluCrawler
from backend.crawler.k17_crawler import K17Crawler
from backend.analyzer.plot_extractor import PlotExtractor
from backend.ai.deepseek_client import DeepSeekClient
from config.settings import settings

# 创建调度器
scheduler = AsyncIOScheduler()

# 初始化组件
zhihu_crawler = ZhihuCrawler()
xiaohongshu_crawler = XiaohongshuCrawler()
jinjiang_crawler = JinjiangCrawler()
qidian_crawler = QidianCrawler()
feilu_crawler = FeiluCrawler()
k17_crawler = K17Crawler()
plot_extractor = PlotExtractor()
ai_client = DeepSeekClient(api_key=settings.deepseek_api_key)


async def scheduled_crawl_job():
    """定时抓取任务 - 专注各大小说平台热榜"""
    print(f"[{datetime.now()}] 开始定时抓取各大小说平台热榜...")

    db = next(get_db())

    total_saved = 0

    # 小说平台热榜配置
    novel_platforms = [
        {
            "name": "晋江",
            "crawler": jinjiang_crawler,
            "categories": ["modern", "ancient"],  # 现代、古代
            "limit": 20
        },
        {
            "name": "起点",
            "crawler": qidian_crawler,
            "categories": ["xuanhuan", "dushi", "xianxia"],  # 玄幻、都市、仙侠
            "limit": 15
        },
        {
            "name": "飞卢",
            "crawler": feilu_crawler,
            "categories": ["xuanhuan", "dushi"],  # 玄幻、都市
            "limit": 15
        },
        {
            "name": "17k",
            "crawler": k17_crawler,
            "categories": ["xuanhuan", "dushi"],  # 玄幻、都市
            "limit": 15
        },
    ]

    # 抓取小说平台热榜
    for platform in novel_platforms:
        for category in platform["categories"]:
            try:
                task = CrawlTask(
                    source=platform["name"],
                    status="running",
                    started_at=datetime.now()
                )
                db.add(task)
                db.commit()

                # 获取热榜
                results = platform["crawler"].get_hot_list(category=category, limit=platform["limit"])
                success_count = 0

                for item in results:
                    # 检查是否已存在
                    existing = db.query(Corpus).filter(Corpus.url == item["url"]).first()
                    if not existing:
                        # 获取完整内容
                        content = platform["crawler"].fetch_content(item["url"])

                        if content and content.get("content"):
                            # 分析情节标签
                            try:
                                analysis = plot_extractor.extract_by_rules(content.get("content", ""))
                            except:
                                analysis = {"tags": []}

                            corpus = Corpus(
                                source=platform["name"],
                                title=content.get("title", item.get("title", "")),
                                content=content.get("content", ""),
                                url=item["url"],
                                plot_tags=analysis.get("tags", []),
                                emotion_score=plot_extractor.calculate_emotion_score(content.get("content", "")),
                                view_count=content.get("views", 0)
                            )
                            db.add(corpus)
                            success_count += 1

                task.status = "success"
                task.url_count = len(results)
                task.success_count = success_count
                task.finished_at = datetime.now()
                total_saved += success_count

                db.commit()
                print(f"[{platform['name']} - {category}] 找到 {len(results)} 条，保存 {success_count} 条")

            except Exception as e:
                print(f"抓取失败 {platform['name']} - {category}: {e}")
                if task:
                    task.status = "failed"
                    task.error_message = str(e)
                    task.finished_at = datetime.now()
                    db.commit()

    # 仍然抓取一些知乎内容作为补充（针对狗血文关键词）
    keywords = ["追妻火葬场", "豪门", "掉马", "假死", "复仇"]

    for keyword in keywords:
        try:
            task = CrawlTask(
                source="zhihu",
                status="running",
                started_at=datetime.now()
            )
            db.add(task)
            db.commit()

            results = zhihu_crawler.search(keyword, limit=5)
            success_count = 0

            for item in results:
                existing = db.query(Corpus).filter(Corpus.url == item["url"]).first()
                if not existing:
                    content = zhihu_crawler.fetch_content(item["url"])

                    if content:
                        try:
                            analysis = plot_extractor.extract_by_rules(content.get("content", ""))
                        except:
                            analysis = {"tags": []}

                        corpus = Corpus(
                            source="zhihu",
                            title=content.get("title", item.get("title", "")),
                            content=content.get("content", ""),
                            url=item["url"],
                            plot_tags=analysis.get("tags", []),
                            emotion_score=plot_extractor.calculate_emotion_score(content.get("content", "")),
                            view_count=content.get("views", 0)
                        )
                        db.add(corpus)
                        success_count += 1

            task.status = "success"
            task.url_count = len(results)
            task.success_count = success_count
            task.finished_at = datetime.now()
            total_saved += success_count

            db.commit()

        except Exception as e:
            print(f"抓取失败 zhihu - {keyword}: {e}")
            if task:
                task.status = "failed"
                task.error_message = str(e)
                task.finished_at = datetime.now()
                db.commit()

    print(f"[{datetime.now()}] 抓取完成，保存了 {total_saved} 条新语料")


async def analyze_corpus_job():
    """分析现有语料，使用AI提取情节"""
    print(f"[{datetime.now()}] 开始AI分析语料...")

    db = next(get_db())

    # 获取未分析的语料（plot_tags为空的）
    unanalyzed = db.query(Corpus).filter(Corpus.plot_tags == None).limit(20).all()

    for corpus in unanalyzed:
        try:
            analysis = plot_extractor.extract_by_ai(corpus.content)
            corpus.plot_tags = analysis.get("tags", [])
            # 假设AI返回了emotion_intensity
            corpus.emotion_score = analysis.get("emotion_intensity", 0)
            db.commit()
        except Exception as e:
            print(f"分析失败 corpus_id={corpus.id}: {e}")

    print(f"[{datetime.now()}] 分析完成")


def start_scheduler():
    """启动调度器"""
    # 每天凌晨2点执行抓取（各大小说平台热榜）
    scheduler.add_job(
        scheduled_crawl_job,
        trigger=CronTrigger.from_crontab(settings.crawl_schedule),
        id="daily_crawl",
        name="各大小说平台热榜抓取",
        replace_existing=True
    )

    # 每天凌晨3点执行AI分析
    scheduler.add_job(
        analyze_corpus_job,
        trigger=CronTrigger.from_crontab("0 3 * * *"),
        id="daily_analyze",
        name="每日AI分析",
        replace_existing=True
    )

    scheduler.start()
    print("调度器已启动")
    print(f"- 每日热榜抓取: {settings.crawl_schedule}")
    print("  平台: 晋江、起点、飞卢、17k、知乎")
    print("- 每日分析: 0 3 * * *")


def stop_scheduler():
    """停止调度器"""
    scheduler.shutdown()
    print("调度器已停止")


if __name__ == "__main__":
    # 测试运行
    import asyncio

    async def test():
        await scheduled_crawl_job()

    asyncio.run(test())
