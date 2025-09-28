#!/usr/bin/env python3
"""
TOM-216脚本生成功能验收测试
使用真实数据库中的AnalysisCard数据进行端到端验证
"""

import asyncio
import os
import sys
import time
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

import asyncpg
from loguru import logger
from typing import Optional, Dict, Any

from app.models.script_generation import AnalysisCardSchema, ScriptStyleConfig
from app.services.analysis.script_generator import ScriptGenerator
from app.services.ai.deepseek import DeepSeekService
from app.services.prompts.manager import PromptManager
from app.core.config import settings


class TOM216AcceptanceTest:
    """TOM-216验收测试类"""
    
    def __init__(self):
        self.settings = settings
        self.db_pool: Optional[asyncpg.Pool] = None
        self.script_generator: Optional[ScriptGenerator] = None
        
        # 配置日志
        logger.remove()
        logger.add(
            sys.stdout, 
            format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
            level="INFO"
        )
        logger.add(
            f"{project_root}/logs/acceptance_test.log",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
            level="DEBUG",
            rotation="10 MB"
        )
    
    async def setup(self):
        """初始化测试环境"""
        logger.info("🚀 开始初始化TOM-216验收测试环境")
        
        # 初始化数据库连接池
        try:
            database_url = self.settings.database_url
            if not database_url:
                raise ValueError("DATABASE_URL配置未设置")
            
            # 移除schema参数，因为asyncpg不支持
            if "?schema=" in database_url:
                database_url = database_url.split("?schema=")[0]
            
            self.db_pool = await asyncpg.create_pool(
                database_url,
                min_size=1,
                max_size=3,
                command_timeout=60
            )
            logger.info("✅ 数据库连接池初始化成功")
        except Exception as e:
            logger.error(f"❌ 数据库连接初始化失败: {e}")
            raise
        
        # 初始化AI服务和脚本生成器
        try:
            ai_service = DeepSeekService(
                api_key=self.settings.ai_api_key,
                base_url=self.settings.ai_base_url,
                model=self.settings.ai_model,
                timeout=self.settings.ai_timeout
            )
            prompt_manager = PromptManager()
            
            # 初始化prompt管理器
            await prompt_manager.initialize()
            
            self.script_generator = ScriptGenerator(ai_service, prompt_manager)
            
            # 健康检查
            is_healthy = await self.script_generator.health_check()
            if not is_healthy:
                raise RuntimeError("脚本生成器健康检查失败")
            
            logger.info("✅ 脚本生成器初始化成功")
        except Exception as e:
            logger.error(f"❌ 脚本生成器初始化失败: {e}")
            raise
        
        logger.info("🎉 测试环境初始化完成")
    
    async def fetch_analysis_card(self, card_id: str) -> Optional[Dict[str, Any]]:
        """从数据库获取AnalysisCard数据"""
        logger.info(f"📖 开始从数据库获取AnalysisCard: {card_id}")
        
        query = """
        SELECT 
            ac.id,
            ac."versionTitle",
            ac."hookCopy",
            ac."hookTypes",
            ac."hookNotes",
            ac."coreIdea",
            ac."argumentCase",
            ac."valueDelivery",
            ac."reusableElements",
            ac."valueNotes",
            ac."createdAt",
            ac."updatedAt",
            s.title as source_title,
            s.transcript
        FROM baokuan_app."AnalysisCard" ac
        LEFT JOIN baokuan_app."AnalysisSource" s ON ac."sourceId" = s.id
        WHERE ac.id = $1
        """
        
        async with self.db_pool.acquire() as conn:
            try:
                row = await conn.fetchrow(query, card_id)
                if not row:
                    logger.warning(f"⚠️ 未找到ID为 {card_id} 的AnalysisCard")
                    return None
                
                # 转换为字典
                card_data = dict(row)
                logger.info(f"✅ 成功获取AnalysisCard数据:")
                logger.info(f"   - 版本标题: {card_data['versionTitle']}")
                logger.info(f"   - 钩子文案: {card_data['hookCopy'][:50] if card_data['hookCopy'] else '无'}...")
                logger.info(f"   - 核心观点: {card_data['coreIdea'][:50] if card_data['coreIdea'] else '无'}...")
                logger.info(f"   - 钩子类型: {len(card_data['hookTypes'])}个")
                logger.info(f"   - 价值交付: {len(card_data['valueDelivery'])}个")
                
                return card_data
                
            except Exception as e:
                logger.error(f"❌ 数据库查询失败: {e}")
                raise
    
    def convert_to_analysis_card_schema(self, card_data: Dict[str, Any]) -> AnalysisCardSchema:
        """将数据库数据转换为AnalysisCardSchema"""
        logger.info("🔄 转换数据库数据为AnalysisCardSchema格式")
        
        return AnalysisCardSchema(
            id=card_data['id'],
            version_title=card_data['versionTitle'] or "未命名版本",
            hook_copy=card_data['hookCopy'],
            hook_types=card_data['hookTypes'] or [],
            hook_notes=card_data['hookNotes'],
            core_idea=card_data['coreIdea'],
            argument_case=card_data['argumentCase'],
            value_delivery=card_data['valueDelivery'] or [],
            reusable_elements=card_data['reusableElements'],
            value_notes=card_data['valueNotes']
        )
    
    async def test_script_generation(self, card_id: str) -> bool:
        """执行脚本生成测试"""
        logger.info(f"🎬 开始执行脚本生成测试: {card_id}")
        
        try:
            # 1. 获取数据库数据
            card_data = await self.fetch_analysis_card(card_id)
            if not card_data:
                logger.error(f"❌ 无法获取AnalysisCard数据: {card_id}")
                return False
            
            # 2. 转换数据格式
            analysis_card = self.convert_to_analysis_card_schema(card_data)
            
            # 3. 配置脚本风格
            style_config = ScriptStyleConfig(
                tone="professional",
                target_audience="数码产品消费者",
                length_preference="medium"
            )
            
            # 4. 调用脚本生成服务
            logger.info("🤖 开始调用AI脚本生成服务...")
            start_time = time.time()
            
            script_framework = await self.script_generator.generate_script_framework(
                analysis_card,
                style_config
            )
            
            generation_time = int((time.time() - start_time) * 1000)
            logger.info(f"⏱️ 脚本生成完成，耗时: {generation_time}ms")
            
            # 5. 验证生成结果
            self.validate_script_result(script_framework)
            
            # 6. 输出结果摘要
            self.print_result_summary(script_framework)
            
            logger.info("🎉 脚本生成测试成功完成!")
            return True
            
        except Exception as e:
            logger.error(f"❌ 脚本生成测试失败: {e}")
            import traceback
            logger.error(f"详细错误信息:\n{traceback.format_exc()}")
            return False
    
    def validate_script_result(self, script_framework):
        """验证脚本生成结果"""
        logger.info("🔍 验证脚本生成结果...")
        
        # 验证基本结构
        assert script_framework.title, "脚本标题不能为空"
        assert script_framework.hook, "钩子段落不能为空"
        assert script_framework.problem, "痛点段落不能为空"
        assert script_framework.solution, "解决方案段落不能为空"
        assert script_framework.proof, "价值证明段落不能为空"
        assert script_framework.cta, "行动召唤段落不能为空"
        assert script_framework.meta, "元数据不能为空"
        
        # 验证每个段落的内容
        sections = [
            ("hook", script_framework.hook),
            ("problem", script_framework.problem),
            ("solution", script_framework.solution),
            ("proof", script_framework.proof),
            ("cta", script_framework.cta)
        ]
        
        for section_name, section in sections:
            assert section.title, f"{section_name}段落标题不能为空"
            assert section.content, f"{section_name}段落内容不能为空"
            assert section.tips, f"{section_name}段落要点不能为空"
            assert section.duration, f"{section_name}段落时长不能为空"
            assert len(section.content) > 20, f"{section_name}段落内容过短"
        
        # 验证元数据
        assert script_framework.meta.ai_model, "AI模型信息不能为空"
        assert script_framework.meta.processing_time_ms > 0, "处理时间必须大于0"
        assert script_framework.meta.status == "completed", "生成状态必须为completed"
        
        logger.info("✅ 脚本结果验证通过")
    
    def print_result_summary(self, script_framework):
        """打印结果摘要"""
        logger.info("📊 生成结果摘要:")
        logger.info("=" * 80)
        logger.info(f"📝 脚本标题: {script_framework.title}")
        logger.info(f"🤖 AI模型: {script_framework.meta.ai_model}")
        logger.info(f"⏱️ 处理时间: {script_framework.meta.processing_time_ms}ms")
        logger.info(f"📅 生成时间: {script_framework.meta.timestamp}")
        logger.info("")
        
        sections = [
            ("🎣 钩子段落", script_framework.hook),
            ("😣 痛点段落", script_framework.problem),
            ("💡 解决方案", script_framework.solution),
            ("✅ 价值证明", script_framework.proof),
            ("📢 行动召唤", script_framework.cta)
        ]
        
        for emoji_title, section in sections:
            logger.info(f"{emoji_title}: {section.title}")
            logger.info(f"   内容长度: {len(section.content)}字符")
            logger.info(f"   关键词: {', '.join(section.keywords) if section.keywords else '无'}")
            logger.info(f"   内容预览: {section.content[:100]}...")
            logger.info("")
        
        logger.info("=" * 80)
        logger.info("🎊 AI接口调用成功，脚本生成功能验证通过!")
    
    async def cleanup(self):
        """清理资源"""
        if self.db_pool:
            await self.db_pool.close()
            logger.info("🧹 数据库连接池已关闭")


async def main():
    """主函数"""
    test = TOM216AcceptanceTest()
    
    try:
        # 设置测试参数
        TEST_CARD_ID = "dba7a2bf-9975-4d9e-b3f4-bfd9722b8721"
        
        logger.info("🎯 TOM-216脚本生成功能验收测试")
        logger.info(f"📋 测试卡片ID: {TEST_CARD_ID}")
        logger.info("=" * 80)
        
        # 初始化
        await test.setup()
        
        # 执行测试
        success = await test.test_script_generation(TEST_CARD_ID)
        
        if success:
            logger.info("🎉 验收测试PASSED - TOM-216功能正常!")
            return 0
        else:
            logger.error("❌ 验收测试FAILED - 发现问题需要修复!")
            return 1
            
    except Exception as e:
        logger.error(f"💥 验收测试异常: {e}")
        import traceback
        logger.error(f"详细错误:\n{traceback.format_exc()}")
        return 1
    finally:
        await test.cleanup()


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)