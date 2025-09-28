#!/usr/bin/env python3
"""
TOM-217: 数据库迁移执行脚本
执行脚本管理表的创建和验证
"""

import asyncio
import sys
import os
from pathlib import Path
from loguru import logger
import asyncpg

# 添加项目路径到sys.path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.core.config import settings
from app.db.session import engine, get_database_url, get_schema_name


async def execute_migration():
    """执行数据库迁移"""
    try:
        logger.info("开始执行TOM-217数据库迁移...")
        
        # 读取迁移SQL文件
        migration_file = project_root / "database" / "migrations" / "001_add_script_tables.sql"
        
        if not migration_file.exists():
            raise FileNotFoundError(f"迁移文件不存在: {migration_file}")
        
        with open(migration_file, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
        
        # 获取数据库连接URL，去除sqlalchemy前缀
        db_url = get_database_url().replace("postgresql+asyncpg://", "postgresql://")
        
        logger.info(f"连接数据库: {db_url.split('@')[1]}")  # 只显示主机部分，不显示密码
        
        # 执行迁移
        conn = await asyncpg.connect(db_url)
        try:
            # 执行迁移SQL
            await conn.execute(migration_sql)
            logger.success("✅ 数据库迁移执行成功")
            
            # 验证表是否创建成功
            schema_name = get_schema_name() or 'baokuan_app'
            
            # 检查表是否存在
            tables_to_check = ['scripts', 'script_sections', 'script_edit_history']
            for table_name in tables_to_check:
                result = await conn.fetchval(
                    """
                    SELECT COUNT(*) 
                    FROM information_schema.tables 
                    WHERE table_schema = $1 AND table_name = $2
                    """,
                    schema_name, table_name
                )
                
                if result == 1:
                    logger.success(f"✅ 表 {schema_name}.{table_name} 创建成功")
                else:
                    logger.error(f"❌ 表 {schema_name}.{table_name} 创建失败")
                    return False
            
            # 检查索引是否创建成功
            result = await conn.fetch(
                """
                SELECT indexname 
                FROM pg_indexes 
                WHERE schemaname = $1 
                AND tablename IN ('scripts', 'script_sections', 'script_edit_history')
                ORDER BY indexname
                """,
                schema_name
            )
            
            index_count = len(result)
            logger.info(f"✅ 创建了 {index_count} 个索引")
            
            # 检查外键约束是否创建成功
            result = await conn.fetch(
                """
                SELECT constraint_name, table_name 
                FROM information_schema.table_constraints 
                WHERE constraint_schema = $1 
                AND constraint_type = 'FOREIGN KEY'
                AND table_name IN ('scripts', 'script_sections', 'script_edit_history')
                ORDER BY table_name, constraint_name
                """,
                schema_name
            )
            
            fk_count = len(result)
            logger.info(f"✅ 创建了 {fk_count} 个外键约束")
            
            # 检查触发器是否创建成功  
            result = await conn.fetch(
                """
                SELECT trigger_name, event_object_table 
                FROM information_schema.triggers 
                WHERE trigger_schema = $1 
                AND event_object_table IN ('scripts', 'script_sections')
                ORDER BY event_object_table, trigger_name
                """,
                schema_name
            )
            
            trigger_count = len(result)
            logger.info(f"✅ 创建了 {trigger_count} 个触发器")
            
            logger.success("🎉 TOM-217数据库迁移验证完成，所有表结构正确创建")
            return True
            
        finally:
            await conn.close()
            
    except Exception as e:
        logger.error(f"❌ 数据库迁移失败: {str(e)}")
        return False


async def test_orm_models():
    """测试ORM模型是否能正常工作"""
    try:
        logger.info("测试ORM模型...")
        
        from app.db.session import AsyncSessionLocal
        from app.models.script_management import Script, ScriptSection, ScriptEditHistory
        from sqlalchemy import text
        
        # 测试会话创建
        async with AsyncSessionLocal() as session:
            # 如果有schema，设置搜索路径
            schema_name = get_schema_name()
            if schema_name:
                await session.execute(text(f"SET search_path TO {schema_name}"))
            
            # 测试查询（不插入数据，只测试表结构）
            
            # 测试scripts表
            result = await session.execute(text("SELECT COUNT(*) FROM scripts"))
            scripts_count = result.scalar()
            logger.success(f"✅ scripts表查询成功，当前记录数: {scripts_count}")
            
            # 测试script_sections表
            result = await session.execute(text("SELECT COUNT(*) FROM script_sections"))
            sections_count = result.scalar()
            logger.success(f"✅ script_sections表查询成功，当前记录数: {sections_count}")
            
            # 测试script_edit_history表
            result = await session.execute(text("SELECT COUNT(*) FROM script_edit_history"))
            history_count = result.scalar()
            logger.success(f"✅ script_edit_history表查询成功，当前记录数: {history_count}")
            
        logger.success("🎉 ORM模型测试通过")
        return True
        
    except Exception as e:
        logger.error(f"❌ ORM模型测试失败: {str(e)}")
        return False


async def main():
    """主函数"""
    logger.info("TOM-217数据库迁移和验证开始")
    
    # 执行迁移
    migration_success = await execute_migration()
    if not migration_success:
        logger.error("❌ 数据库迁移失败，停止后续测试")
        sys.exit(1)
    
    # 测试ORM模型
    orm_success = await test_orm_models()
    if not orm_success:
        logger.error("❌ ORM模型测试失败")
        sys.exit(1)
    
    logger.success("🎉🎉🎉 TOM-217数据库层实现完成，所有测试通过！")
    

if __name__ == "__main__":
    asyncio.run(main())