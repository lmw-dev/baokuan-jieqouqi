#!/usr/bin/env python3
"""检查数据库中的 MediaFile 记录"""
import asyncio
import sys
import os

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(__file__))

from app.db.session import get_db_session
from app.models.analysis import MediaFile
from sqlalchemy import select

async def main():
    """检查 MediaFile 记录"""
    try:
        async with get_db_session() as db:
            print("=== MediaFile 记录检查 ===\n")
            
            # 查询所有 MediaFile 记录
            stmt = select(MediaFile).order_by(MediaFile.created_at.desc()).limit(10)
            result = await db.execute(stmt)
            media_files = result.scalars().all()
            
            if not media_files:
                print("❌ 数据库中没有找到 MediaFile 记录")
                return
            
            print(f"✅ 找到 {len(media_files)} 个 MediaFile 记录:\n")
            
            for i, media_file in enumerate(media_files, 1):
                print(f"📁 记录 {i}:")
                print(f"   ID: {media_file.id}")
                print(f"   文件名: {media_file.original_filename}")
                print(f"   存储路径: {media_file.storage_path}")
                print(f"   文件大小: {media_file.file_size} bytes")
                print(f"   状态: {media_file.status}")
                print(f"   创建时间: {media_file.created_at}")
                print("-" * 50)
            
            # 重点检查最近的几个文件
            print("\n=== COS 路径分析 ===")
            for media_file in media_files[:3]:
                cos_path = media_file.storage_path
                print(f"\n📄 文件: {media_file.original_filename}")
                print(f"   数据库存储路径: {cos_path}")
                print(f"   完整COS URL: https://baokuan-1357274285.cos.ap-guangzhou.myqcloud.com/{cos_path}")
                
    except Exception as e:
        print(f"❌ 错误: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main()) 