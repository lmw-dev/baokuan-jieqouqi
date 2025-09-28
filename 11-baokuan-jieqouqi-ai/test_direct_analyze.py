#!/usr/bin/env python3
"""
直接测试AI分析服务的完整流程
使用本地demo视频文件，跳过Web服务和COS上传
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


async def test_direct_file_analysis():
    """测试直接文件分析"""
    
    # 1. 准备测试文件
    demo_file_path = "../docs/data/sample/demo-douyi-video.mp4"
    
    if not os.path.exists(demo_file_path):
        print(f"❌ 测试文件不存在: {demo_file_path}")
        return False
    
    print(f"✅ 找到测试文件: {demo_file_path}")
    print(f"   文件大小: {os.path.getsize(demo_file_path) / 1024 / 1024:.2f} MB")
    
    # 2. 读取文件数据
    with open(demo_file_path, 'rb') as f:
        file_data = f.read()
    
    print(f"✅ 文件读取完成，大小: {len(file_data)} 字节")
    
    # 3. 创建分析请求
    analysis_options = AnalysisOptions(
        enable_hook_detection=True,
        enable_asr=True,  # 启用ASR
        output_format="structured"
    )
    
    request = AnalyzeRequest(
        content_type="file",
        analysis_options=analysis_options
    )
    
    print(f"✅ 分析请求创建完成")
    
    # 4. 初始化分析服务
    print("🔧 初始化分析服务...")
    analysis_service = AnalysisService()
    
    # 5. 执行分析
    print("🚀 开始完整分析流程...")
    print("   这可能需要几分钟时间，包括：")
    print("   - 上传文件到COS")
    print("   - 视频转音频 (FFmpeg)")
    print("   - 腾讯云ASR语音识别")
    print("   - 信任之钩分析")
    
    try:
        result = await analysis_service.analyze_content(
            request=request,
            file_data=file_data,
            original_filename="demo-douyi-video.mp4"
        )
        
        print("\n" + "="*50)
        print("📊 分析结果:")
        print("="*50)
        
        print(f"任务ID: {result.task_id}")
        print(f"状态: {result.status.value}")
        print(f"进度: {result.progress*100:.1f}%")
        
        if result.error_message:
            print(f"错误信息: {result.error_message}")
            return False
        
        print(f"标题: {result.title}")
        print(f"摘要: {result.summary}")
        
        if result.transcribed_text:
            text_preview = result.transcribed_text[:200] + "..." if len(result.transcribed_text) > 200 else result.transcribed_text
            print(f"转录文本预览: {text_preview}")
            print(f"转录文本长度: {len(result.transcribed_text)} 字符")
        
        if result.trust_hooks:
            print(f"\n🎯 识别到 {len(result.trust_hooks)} 个信任之钩:")
            for i, hook in enumerate(result.trust_hooks, 1):
                print(f"  {i}. {hook.hook_type.value} - {hook.content} (置信度: {hook.confidence:.2f})")
        else:
            print("未识别到信任之钩")
        
        if result.file_name:
            print(f"文件名: {result.file_name}")
            print(f"文件大小: {result.file_size} 字节")
            
        if result.duration:
            print(f"时长: {result.duration:.2f} 秒")
            
        print(f"创建时间: {result.created_at}")
        print(f"完成时间: {result.updated_at}")
        
        print("\n🎉 完整流程测试成功！")
        return True
        
    except Exception as e:
        print(f"\n❌ 分析失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_text_analysis():
    """测试文本分析"""
    print("\n" + "="*50)
    print("🧪 测试纯文本分析")
    print("="*50)
    
    test_text = """
    作为一个用了10年iPhone的老用户，今天我要告诉你一个残酷的真相。
    我是数码评测博主，测试过200+款手机，每次换手机都纠结，怕买错后悔。
    但是通过我的专业测试，我发现了iPhone购买的核心秘密。
    99%的人都不知道这个技巧，能帮你省下好几千块钱。
    作为业内专家，我必须告诉你这个重要信息。
    """
    
    analysis_options = AnalysisOptions(
        enable_hook_detection=True,
        output_format="structured"
    )
    
    request = AnalyzeRequest(
        content_type="text",
        text_content=test_text.strip(),
        analysis_options=analysis_options
    )
    
    analysis_service = AnalysisService()
    
    try:
        result = await analysis_service.analyze_content(request=request)
        
        print(f"状态: {result.status.value}")
        print(f"摘要: {result.summary}")
        
        if result.trust_hooks:
            print(f"\n🎯 识别到 {len(result.trust_hooks)} 个信任之钩:")
            for i, hook in enumerate(result.trust_hooks, 1):
                print(f"  {i}. {hook.hook_type.value} - '{hook.content}' (置信度: {hook.confidence:.2f})")
        
        return True
        
    except Exception as e:
        print(f"❌ 文本分析失败: {str(e)}")
        return False


async def main():
    """主函数"""
    print("🚀 开始AI服务完整流程测试")
    print("=" * 50)
    
    # 测试1：文本分析（快速验证）
    text_success = await test_text_analysis()
    
    if not text_success:
        print("❌ 文本分析失败，停止测试")
        return
    
    # 测试2：文件分析（完整流程）
    print("\n继续进行文件分析测试...")
    input("按回车键继续（文件分析可能需要几分钟）...")
    
    file_success = await test_direct_file_analysis()
    
    if file_success:
        print("\n🎉 所有测试通过！AI服务完整流程正常工作。")
    else:
        print("\n⚠️ 文件分析测试失败，但文本分析正常。")
        print("   可能的原因：FFmpeg、腾讯云ASR或COS配置问题")


if __name__ == "__main__":
    asyncio.run(main())