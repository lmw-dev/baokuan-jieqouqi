#!/usr/bin/env python3
"""
测试文件分析功能（无交互）
"""

import asyncio
import sys
import os
from pathlib import Path

# 添加项目路径到sys.path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app.services.analysis_service import AnalysisService
from app.schemas.analyze_schema import AnalyzeRequest, AnalysisOptions


async def test_file_analysis():
    """测试文件分析"""
    
    # 准备测试文件
    demo_file_path = "../docs/data/sample/demo-douyi-video.mp4"
    
    if not os.path.exists(demo_file_path):
        print(f"❌ 测试文件不存在: {demo_file_path}")
        return False
    
    print(f"✅ 找到测试文件: {demo_file_path}")
    
    # 读取文件数据
    with open(demo_file_path, 'rb') as f:
        file_data = f.read()
    
    print(f"✅ 文件读取完成，大小: {len(file_data) / 1024 / 1024:.2f} MB")
    
    # 创建分析请求
    analysis_options = AnalysisOptions(
        enable_hook_detection=True,
        enable_asr=True,  # 启用真实ASR
        output_format="structured"
    )
    
    request = AnalyzeRequest(
        content_type="file",
        analysis_options=analysis_options
    )
    
    # 初始化分析服务
    print("🔧 初始化分析服务...")
    analysis_service = AnalysisService()
    
    # 执行分析
    print("🚀 开始文件分析流程...")
    print("   预计时间: 2-5分钟")
    print("   包括: 文件上传 → 视频转音频 → ASR → 钩子分析")
    
    try:
        result = await analysis_service.analyze_content(
            request=request,
            file_data=file_data,
            original_filename="demo-douyi-video.mp4"
        )
        
        print("\n" + "="*60)
        print("📊 文件分析结果")
        print("="*60)
        
        print(f"任务ID: {result.task_id}")
        print(f"状态: {result.status.value}")
        print(f"进度: {result.progress*100:.1f}%")
        
        if result.error_message:
            print(f"❌ 错误: {result.error_message}")
            return False
        
        print(f"文件: {result.file_name}")
        if result.file_size:
            print(f"大小: {result.file_size / 1024 / 1024:.2f} MB")
        
        if result.duration:
            print(f"时长: {result.duration:.1f} 秒")
        
        if result.transcribed_text:
            print(f"\n📝 转录文本长度: {len(result.transcribed_text)} 字符")
            # 显示转录文本的前300字符
            preview = result.transcribed_text[:300]
            print(f"转录预览: {preview}...")
        else:
            print("❌ 未获得转录文本")
        
        if result.trust_hooks:
            print(f"\n🎯 信任之钩分析结果 ({len(result.trust_hooks)} 个):")
            for i, hook in enumerate(result.trust_hooks, 1):
                print(f"  {i}. [{hook.hook_type.value}] {hook.content}")
                print(f"     置信度: {hook.confidence:.2f}")
        else:
            print("❓ 未识别到信任之钩")
        
        print(f"\n⏱️ 处理耗时: {(result.updated_at - result.created_at).total_seconds():.1f} 秒")
        print("🎉 文件分析完成！")
        
        return True
        
    except Exception as e:
        print(f"\n❌ 文件分析失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("🎬 测试视频文件分析功能")
    print("=" * 50)
    
    success = asyncio.run(test_file_analysis())
    
    if success:
        print("\n✅ 测试通过 - AI服务文件分析功能正常")
    else:
        print("\n❌ 测试失败 - 请检查配置和依赖")