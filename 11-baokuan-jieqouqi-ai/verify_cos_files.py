#!/usr/bin/env python3
"""验证 COS 中的文件是否存在"""
import asyncio
import sys
import os

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(__file__))

from app.db.session import get_db_session
from app.models.analysis import MediaFile
from app.services.cos_service import COSService
from sqlalchemy import select

async def main():
    """验证 COS 文件存在性"""
    try:
        cos_service = COSService()
        
        async with get_db_session() as db:
            print("=== COS 文件存在性验证 ===\n")
            
            # 查询状态为 ready 的文件
            stmt = select(MediaFile).where(MediaFile.status == "ready").order_by(MediaFile.created_at.desc()).limit(5)
            result = await db.execute(stmt)
            media_files = result.scalars().all()
            
            if not media_files:
                print("❌ 没有找到状态为 ready 的文件")
                return
            
            print(f"✅ 找到 {len(media_files)} 个 ready 状态的文件:\n")
            
            for i, media_file in enumerate(media_files, 1):
                print(f"📄 文件 {i}: {media_file.original_filename}")
                print(f"   ID: {media_file.id}")
                print(f"   存储路径: {media_file.storage_path}")
                
                # 检查文件是否存在
                exists = await cos_service.file_exists(media_file.storage_path)
                
                if exists:
                    print(f"   ✅ COS 文件存在")
                    
                    # 获取文件信息
                    file_info = await cos_service.get_file_info(media_file.storage_path)
                    if file_info:
                        print(f"   📏 文件大小: {file_info['content_length']} bytes")
                        print(f"   🔗 访问URL: {file_info['url']}")
                    
                else:
                    print(f"   ❌ COS 文件不存在")
                
                print("-" * 60)
            
            # 如果有存在的文件，选择一个进行测试下载
            for media_file in media_files:
                exists = await cos_service.file_exists(media_file.storage_path)
                if exists:
                    print(f"\n=== 测试下载文件: {media_file.original_filename} ===")
                    try:
                        download_result = await cos_service.download_file(media_file.storage_path)
                        if download_result["success"]:
                            print(f"✅ 下载成功: {download_result['local_path']}")
                            print(f"📏 文件大小: {download_result['file_size']} bytes")
                            
                            # 清理下载的临时文件
                            import os
                            if os.path.exists(download_result['local_path']):
                                os.unlink(download_result['local_path'])
                                print("🗑️ 清理临时文件完成")
                        else:
                            print(f"❌ 下载失败: {download_result['error']}")
                    except Exception as e:
                        print(f"❌ 下载异常: {str(e)}")
                    break
                
    except Exception as e:
        print(f"❌ 错误: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main()) 