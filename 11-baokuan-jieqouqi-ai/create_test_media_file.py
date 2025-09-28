#!/usr/bin/env python3
"""
创建测试用的MediaFile记录
"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime
import uuid

# 添加项目路径到sys.path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app.db.session import get_db_session
from app.models.analysis import MediaFile


async def create_test_media_file():
    """创建测试用的MediaFile记录"""
    print("🔧 创建测试用的MediaFile记录")
    print("=" * 50)
    
    try:
        async with get_db_session() as db:
            # 创建测试MediaFile记录
            test_media_file_id = "98d43cdb-9ea0-4ac3-ac78-17762a64b21d"
            
            # 检查是否已存在
            from sqlalchemy import select
            stmt = select(MediaFile).where(MediaFile.id == test_media_file_id)
            result = await db.execute(stmt)
            existing_file = result.scalar_one_or_none()
            
            if existing_file:
                print(f"✅ MediaFile记录已存在: {existing_file.originalFilename}")
                return existing_file
            
            # 创建新的MediaFile记录
            media_file = MediaFile(
                id=test_media_file_id,
                original_filename="demo-iphone-video.mp4",
                storage_path="uploads/test/demo-iphone-video.mp4",
                file_size=50*1024*1024,  # 50MB
                mime_type="video/mp4",
                status="ready",
                file_hash="test-hash-12345",
                thumbnail_url=None,
                created_at=datetime.utcnow()
            )
            
            db.add(media_file)
            await db.commit()
            
            print(f"✅ 创建MediaFile记录成功:")
            print(f"   ID: {media_file.id}")
            print(f"   文件名: {media_file.original_filename}")
            print(f"   存储路径: {media_file.storage_path}")
            print(f"   状态: {media_file.status}")
            
            return media_file
            
    except Exception as e:
        print(f"❌ 创建MediaFile记录失败: {str(e)}")
        return None


async def create_multiple_test_files():
    """创建多个测试文件"""
    print("\n🔧 创建多个测试文件")
    print("-" * 40)
    
    test_files = [
        {
            "id": "test-video-001",
            "filename": "iPhone评测视频.mp4",
            "path": "uploads/test/iphone-review.mp4"
        },
        {
            "id": "test-video-002", 
            "filename": "内容创作教程.mp4",
            "path": "uploads/test/content-tutorial.mp4"
        },
        {
            "id": "test-video-003",
            "filename": "产品介绍视频.mp4", 
            "path": "uploads/test/product-intro.mp4"
        }
    ]
    
    try:
        async with get_db_session() as db:
            created_files = []
            
            for file_info in test_files:
                # 检查是否已存在
                from sqlalchemy import select
                stmt = select(MediaFile).where(MediaFile.id == file_info["id"])
                result = await db.execute(stmt)
                existing_file = result.scalar_one_or_none()
                
                if existing_file:
                    print(f"✅ 文件已存在: {existing_file.originalFilename}")
                    created_files.append(existing_file)
                    continue
                
                # 创建新文件记录
                media_file = MediaFile(
                    id=file_info["id"],
                    original_filename=file_info["filename"],
                    storage_path=file_info["path"],
                    file_size=(40 + len(created_files) * 10) * 1024 * 1024,  # 40-70MB
                    mime_type="video/mp4",
                    status="ready",
                    file_hash=f"test-hash-{file_info['id']}",
                    thumbnail_url=None,
                    created_at=datetime.utcnow()
                )
                
                db.add(media_file)
                created_files.append(media_file)
                print(f"✅ 创建文件: {media_file.original_filename}")
            
            await db.commit()
            print(f"\n✅ 总共创建/确认了 {len(created_files)} 个测试文件")
            return created_files
            
    except Exception as e:
        print(f"❌ 创建测试文件失败: {str(e)}")
        return []


async def main():
    """主函数"""
    print("🚀 创建测试用的数据库记录")
    print("=" * 60)
    
    # 1. 创建主要的测试文件
    main_file = await create_test_media_file()
    
    # 2. 创建额外的测试文件
    additional_files = await create_multiple_test_files()
    
    print("\n" + "=" * 60)
    print("📊 创建结果总结")
    
    if main_file:
        print("✅ 主测试文件创建成功")
        print(f"   可以使用 {main_file.id} 进行分析测试")
    
    if additional_files:
        print(f"✅ 额外创建了 {len(additional_files)} 个测试文件")
        print("   可用的测试文件ID:")
        for file in additional_files:
            print(f"     - {file.id}: {file.original_filename}")
    
    print("\n🎯 下一步：运行 python test_complete_analysis.py 进行完整测试")
    print("🏁 数据库记录创建完成")


if __name__ == "__main__":
    asyncio.run(main())