#!/usr/bin/env python3
"""
检查数据库中的分析记录
"""

import asyncio
import sys
from pathlib import Path

# 添加项目路径到sys.path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app.db.session import get_db_session
from app.models.analysis import AnalysisSource, AnalysisCard, MediaFile
from sqlalchemy import select, func


async def check_database_records():
    """检查数据库中的所有相关记录"""
    print("🔍 检查数据库中的分析记录")
    print("=" * 60)
    
    try:
        async with get_db_session() as db:
            # 1. 检查MediaFile记录
            print("📁 MediaFile 记录:")
            print("-" * 30)
            stmt = select(MediaFile)
            result = await db.execute(stmt)
            media_files = result.scalars().all()
            
            for media_file in media_files:
                print(f"  ID: {media_file.id}")
                print(f"  文件名: {media_file.original_filename}")
                print(f"  状态: {media_file.status}")
                print(f"  创建时间: {media_file.created_at}")
                print()
            
            print(f"总计: {len(media_files)} 个MediaFile记录\n")
            
            # 2. 检查AnalysisSource记录
            print("📝 AnalysisSource 记录:")
            print("-" * 30)
            stmt = select(AnalysisSource)
            result = await db.execute(stmt)
            analysis_sources = result.scalars().all()
            
            for source in analysis_sources:
                print(f"  ID: {source.id}")
                print(f"  标题: {source.title}")
                print(f"  媒体文件ID: {source.media_file_id}")
                print(f"  转录文本长度: {len(source.transcript or '')}")
                print(f"  创建时间: {source.created_at}")
                print()
            
            print(f"总计: {len(analysis_sources)} 个AnalysisSource记录\n")
            
            # 3. 检查AnalysisCard记录
            print("🎯 AnalysisCard 记录:")
            print("-" * 30)
            stmt = select(AnalysisCard)
            result = await db.execute(stmt)
            analysis_cards = result.scalars().all()
            
            for card in analysis_cards:
                print(f"  ID: {card.id}")
                print(f"  版本标题: {card.version_title}")
                print(f"  钩子类型: {card.hook_types}")
                print(f"  钩子文案: {card.hook_copy}")
                print(f"  核心观点: {card.core_idea}")
                print(f"  源ID: {card.source_id}")
                print(f"  创建时间: {card.created_at}")
                print(f"  更新时间: {card.updated_at}")
                print()
            
            print(f"总计: {len(analysis_cards)} 个AnalysisCard记录\n")
            
            # 4. 检查特定文件的分析记录
            target_file_id = "98d43cdb-9ea0-4ac3-ac78-17762a64b21d"
            print(f"🎯 检查文件 {target_file_id} 的分析记录:")
            print("-" * 50)
            
            # 查询该文件的AnalysisSource
            stmt = select(AnalysisSource).where(AnalysisSource.media_file_id == target_file_id)
            result = await db.execute(stmt)
            target_source = result.scalar_one_or_none()
            
            if target_source:
                print(f"✅ 找到AnalysisSource: {target_source.id}")
                print(f"   标题: {target_source.title}")
                print(f"   转录文本: {target_source.transcript[:100]}...")
                
                # 查询对应的AnalysisCard
                stmt = select(AnalysisCard).where(AnalysisCard.source_id == target_source.id)
                result = await db.execute(stmt)
                target_card = result.scalar_one_or_none()
                
                if target_card:
                    print(f"✅ 找到AnalysisCard: {target_card.id}")
                    print(f"   版本标题: {target_card.version_title}")
                    print(f"   钩子类型: {target_card.hook_types}")
                    print(f"   钩子文案: {target_card.hook_copy}")
                    print(f"   核心观点: {target_card.core_idea}")
                else:
                    print("❌ 未找到对应的AnalysisCard")
            else:
                print("❌ 未找到AnalysisSource记录")
                
    except Exception as e:
        print(f"❌ 检查数据库失败: {str(e)}")
        import traceback
        traceback.print_exc()


async def main():
    """主函数"""
    print("🚀 数据库记录检查工具")
    print("=" * 70)
    
    await check_database_records()
    
    print("=" * 70)
    print("🏁 检查完成")


if __name__ == "__main__":
    asyncio.run(main())