#!/usr/bin/env python3
"""检查COS存储桶中的文件"""
import asyncio
import sys
import os

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(__file__))

from app.services.cos_service import COSService

async def main():
    """检查COS存储桶内容"""
    try:
        cos_service = COSService()
        
        print("=== COS 存储桶文件检查 ===\n")
        
        # 检查 uploads 目录下的文件
        print("📁 检查 uploads/ 目录:")
        files = await cos_service.list_files("uploads/")
        
        if files:
            print(f"✅ 找到 {len(files)} 个文件:")
            for i, file_info in enumerate(files, 1):
                print(f"  {i}. {file_info['key']} (大小: {file_info['size']} bytes)")
        else:
            print("❌ uploads/ 目录为空")
        
        print("\n📁 检查根目录文件:")
        root_files = await cos_service.list_files("")
        
        if root_files:
            print(f"✅ 根目录找到 {len(root_files)} 个文件:")
            for i, file_info in enumerate(root_files[:10], 1):  # 只显示前10个
                print(f"  {i}. {file_info['key']} (大小: {file_info['size']} bytes)")
        else:
            print("❌ 根目录为空")
            
        # 检查特定文件路径
        print("\n🔍 检查数据库中记录的文件路径:")
        test_paths = [
            "uploads/test-user-001/1751962187169-002.mp4",
            "uploads/test-user-001/1751893534483-001.mp4",
            "test-user-001/002.mp4",
            "test-user-001/001.mp4",
            "002.mp4",
            "001.mp4"
        ]
        
        for path in test_paths:
            exists = await cos_service.file_exists(path)
            status = "✅ 存在" if exists else "❌ 不存在"
            print(f"  {path}: {status}")
            
    except Exception as e:
        print(f"❌ 检查失败: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main()) 