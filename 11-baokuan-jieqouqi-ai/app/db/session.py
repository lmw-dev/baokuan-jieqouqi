from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import event, text
from contextlib import asynccontextmanager
from typing import AsyncGenerator
import re

from app.core.config import settings

# 创建数据库引擎
def get_database_url() -> str:
    """获取数据库连接URL，移除schema参数"""
    url = settings.database_url
    # 将postgresql://替换为postgresql+asyncpg://
    url = url.replace("postgresql://", "postgresql+asyncpg://")
    
    # 移除schema参数，因为asyncpg不支持URL中的schema参数
    if "?schema=" in url:
        url = url.split("?schema=")[0]
    elif "&schema=" in url:
        url = re.sub(r'[&]schema=[^&]*', '', url)
    
    return url

def get_schema_name() -> str:
    """从配置中提取schema名称"""
    url = settings.database_url
    schema_name = None
    
    if "?schema=" in url:
        parts = url.split("?schema=")
        schema_name = parts[1].split("&")[0]
    elif "&schema=" in url:
        match = re.search(r'[&?]schema=([^&]+)', url)
        if match:
            schema_name = match.group(1)
    
    return schema_name

# 获取schema名称
SCHEMA_NAME = get_schema_name()

# 创建引擎
engine = create_async_engine(
    get_database_url(),
    echo=settings.debug,
    pool_size=settings.database_pool_size,
    max_overflow=0,
    pool_pre_ping=True,
)

# 创建会话工厂
AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

# 数据库模型基类
Base = declarative_base()

# 如果有schema名称，为Base设置schema
if SCHEMA_NAME:
    Base.metadata.schema = SCHEMA_NAME


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """获取数据库会话"""
    async with AsyncSessionLocal() as session:
        try:
            # 如果有schema名称，设置搜索路径
            if SCHEMA_NAME:
                await session.execute(text(f"SET search_path TO {SCHEMA_NAME}"))
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@asynccontextmanager
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """获取数据库会话上下文管理器"""
    async with AsyncSessionLocal() as session:
        try:
            # 如果有schema名称，设置搜索路径
            if SCHEMA_NAME:
                await session.execute(text(f"SET search_path TO {SCHEMA_NAME}"))
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """初始化数据库"""
    async with engine.begin() as conn:
        # 创建所有表
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    """关闭数据库连接"""
    await engine.dispose()