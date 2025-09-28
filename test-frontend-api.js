// 测试前端API调用
async function testFrontendAPI() {
    console.log('🚀 测试前端API调用');
    console.log('=' .repeat(50));
    
    const mediaFileId = '98d43cdb-9ea0-4ac3-ac78-17762a64b21d';
    
    try {
        // 调用前端API
        const response = await fetch(`http://localhost:3000/api/analyze/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mediaFileId: mediaFileId,
                analysisType: 'full'
            })
        });
        
        console.log('📊 前端API响应状态:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ 前端API调用成功');
            console.log('📋 前端响应数据:');
            console.log(JSON.stringify(result, null, 2));
            
            if (result.success) {
                console.log('\n🎉 前端API处理成功！');
                console.log('📝 数据映射结果:');
                console.log('  信任之钩 openingHook:', result.data.trustHook?.openingHook);
                console.log('  信任之钩 authoritySignal:', result.data.trustHook?.authoritySignal);
                console.log('  共情之锚 emotionalTrigger:', result.data.empathyAnchor?.emotionalTrigger);
                console.log('  价值图谱 benefitPoints:', result.data.valueMap?.benefitPoints);
                
                // 检查调试信息
                if (result.debug) {
                    console.log('\n🔍 调试信息:');
                    console.log('  AI服务钩子类型:', result.debug.hookTypes);
                    console.log('  AI服务钩子文案:', result.debug.hookCopy);
                    console.log('  AI服务钩子数量:', result.debug.totalHooksCount);
                }
            } else {
                console.log('❌ 前端API处理失败:', result.error);
            }
        } else {
            const errorText = await response.text();
            console.log('❌ 前端API HTTP错误:', response.status);
            console.log('错误内容:', errorText);
        }
        
    } catch (error) {
        console.log('❌ 前端API请求异常:', error.message);
    }
}

// 运行测试
testFrontendAPI();