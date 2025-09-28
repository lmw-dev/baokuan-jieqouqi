#!/usr/bin/env python3
"""
验证数据是否存储到正确的schema中
"""

import asyncio
import aiohttp
import json
import sys
import uuid
from datetime import datetime
from pathlib import Path

# 添加项目路径到sys.path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app.db.session import get_db_session
from app.models.analysis import AnalysisCard, AnalysisSource, MediaFile
from sqlalchemy import select, text


async def test_schema_storage():
    """测试数据是否存储到正确的schema"""
    print("🔍 测试Schema存储验证")
    print("=" * 60)
    
    # 1. 首先创建一个新的测试MediaFile
    test_media_file_id = f"test-schema-{str(uuid.uuid4())[:8]}"
    
    async with get_db_session() as db:
        # 创建测试MediaFile
        media_file = MediaFile(
            id=test_media_file_id,
            original_filename="schema-test.mp4",
            storage_path=f"uploads/test/{test_media_file_id}.mp4",
            file_size=12345678,
            mime_type="video/mp4",
            status="ready",
            file_hash="test-hash",
            created_at=datetime.utcnow()
        )
        
        db.add(media_file)
        await db.commit()
        print(f"✅ 创建测试MediaFile: {test_media_file_id}")
    
    # 2. 调用API进行分析
    print(f"\n📡 调用分析API...")
    
    url = "http://localhost:8000/api/v1/web/analyze"
    test_data = {
        "media_file_id": test_media_file_id,
        "user_id": "schema-test-user",
        "file_info": {
            "filename": "schema-test.mp4",
            "storage_path": f"uploads/test/{test_media_file_id}.mp4",
            "mime_type": "video/mp4",
            "file_size": 12345678
        }
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=test_data) as response:
                result = await response.json()
                
                if response.status == 200 and result.get("success"):
                    print(f"✅ API调用成功")
                    print(f"📋 分析结果ID: {result['data'].get('analysis_card_id')}")
                else:
                    print(f"❌ API调用失败: {result}")
                    return
                    
    except Exception as e:
        print(f"❌ API调用异常: {str(e)}")
        return
    
    # 3. 验证数据存储位置
    print(f"\n🔍 验证数据存储位置...")
    
    async with get_db_session() as db:
        # 查询当前连接的schema
        schema_query = text("SELECT current_schema()")
        result = await db.execute(schema_query)
        current_schema = result.scalar()
        print(f"📍 当前连接的schema: {current_schema}")
        
        # 查询AnalysisSource
        stmt = select(AnalysisSource).where(AnalysisSource.media_file_id == test_media_file_id)
        result = await db.execute(stmt)
        analysis_source = result.scalar_one_or_none()
        
        if analysis_source:
            print(f"✅ 找到AnalysisSource: {analysis_source.id}")
            
            # 查询AnalysisCard
            stmt = select(AnalysisCard).where(AnalysisCard.source_id == analysis_source.id)
            result = await db.execute(stmt)
            analysis_card = result.scalar_one_or_none()
            
            if analysis_card:
                print(f"✅ 找到AnalysisCard: {analysis_card.id}")
                print(f"📊 钩子类型: {analysis_card.hook_types}")
                print(f"📝 版本标题: {analysis_card.version_title}")
                print(f"🕐 更新时间: {analysis_card.updated_at}")
            else:
                print("❌ 未找到AnalysisCard")
        else:
            print("❌ 未找到AnalysisSource")
    
    # 4. 使用原生SQL查询验证schema
    print(f"\n🔍 使用原生SQL验证schema...")
    
    async with get_db_session() as db:
        # 检查baokuan_app schema中的数据
        baokuan_query = text('''
            SELECT COUNT(*) as count 
            FROM baokuan_app."AnalysisCard" 
            WHERE "sourceId" IN (
                SELECT id FROM baokuan_app."AnalysisSource" 
                WHERE "mediaFileId" = :media_file_id
            )
        ''')
        
        try:
            result = await db.execute(baokuan_query, {"media_file_id": test_media_file_id})
            baokuan_count = result.scalar()
            print(f"📊 baokuan_app schema中的记录数: {baokuan_count}")
        except Exception as e:
            print(f"❌ 查询baokuan_app schema失败: {str(e)}")
        
        # 检查public schema中的数据
        public_query = text('''
            SELECT COUNT(*) as count 
            FROM public."AnalysisCard" 
            WHERE "sourceId" IN (
                SELECT id FROM public."AnalysisSource" 
                WHERE "mediaFileId" = :media_file_id
            )
        ''')
        
        try:
            result = await db.execute(public_query, {"media_file_id": test_media_file_id})
            public_count = result.scalar()
            print(f"📊 public schema中的记录数: {public_count}")
        except Exception as e:
            print(f"❌ 查询public schema失败: {str(e)}")
    
    print(f"\n🏁 Schema验证完成")


async def main():
    """主函数"""
    print("🚀 Schema存储验证工具")
    print("=" * 70)
    
    await test_schema_storage()
    
    print("=" * 70)
    print("🏁 验证完成")


if __name__ == "__main__":
    asyncio.run(main()) 