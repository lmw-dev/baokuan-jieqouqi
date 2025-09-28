#!/usr/bin/env python3
"""手动上传测试文件到COS"""
import asyncio
import sys
import os

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(__file__))

from app.services.cos_service import COSService
from app.db.session import get_db_session
from app.models.analysis import MediaFile
from sqlalchemy import select

async def main():
    """上传测试文件"""
    try:
        cos_service = COSService()
        
        print("=== 手动上传测试文件 ===\n")
        
        # 使用COS中现有的文件 uploads/1751962187408-x98ridese-file (49MB)
        existing_file_key = "uploads/1751962187408-x98ridese-file"
        target_file_key = "uploads/test-user-001/1751962187169-002.mp4"
        
        print(f"📁 源文件: {existing_file_key}")
        print(f"📁 目标路径: {target_file_key}")
        
        # 1. 检查源文件是否存在
        source_exists = await cos_service.file_exists(existing_file_key)
        if not source_exists:
            print(f"❌ 源文件不存在: {existing_file_key}")
            return
        
        print(f"✅ 源文件存在: {existing_file_key}")
        
        # 2. 下载源文件
        print("📥 下载源文件...")
        download_result = await cos_service.download_file(existing_file_key)
        
        if not download_result["success"]:
            print(f"❌ 下载失败: {download_result['error']}")
            return
        
        local_file_path = download_result["local_path"]
        print(f"✅ 下载成功: {local_file_path}")
        
        # 3. 上传到目标路径
        print("📤 上传到目标路径...")
        target_url = await cos_service.upload_file_from_path(
            local_file_path, 
            target_file_key,
            "video/mp4"
        )
        
        print(f"✅ 上传成功: {target_url}")
        
        # 4. 验证目标文件存在
        target_exists = await cos_service.file_exists(target_file_key)
        print(f"✅ 目标文件验证: {'存在' if target_exists else '不存在'}")
        
        # 5. 清理临时文件
        try:
            os.unlink(local_file_path)
            print(f"🗑️  清理临时文件: {local_file_path}")
        except:
            pass
        
        # 6. 测试AI分析
        print("\n🤖 测试AI分析功能...")
        from app.services.complete_analysis_service import CompleteAnalysisService
        
        analysis_service = CompleteAnalysisService()
        result = await analysis_service.analyze_media_file("1a9cb51e-576b-42b3-ae82-0b28e9ee13ed")
        
        if result["success"]:
            print("✅ AI分析成功!")
            print(f"📝 转录文本长度: {len(result.get('transcript', ''))}")
            print(f"🎯 检测到钩子数量: {result.get('trust_hooks_count', 0)}")
            print(f"🔗 钩子类型: {result.get('hook_types', [])}")
        else:
            print(f"❌ AI分析失败: {result}")
            
    except Exception as e:
        print(f"❌ 操作失败: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main()) 