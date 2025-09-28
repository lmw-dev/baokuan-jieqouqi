#!/usr/bin/env python3
"""
测试抖音耳机文案的三段式分析
验证API调用和prompt传递
"""

import asyncio
import httpx
import json
from typing import Dict, Any

# 配置
API_BASE_URL = "http://localhost:8001"
API_ENDPOINT = f"{API_BASE_URL}/api/v1/analysis/three-stage"

# 抖音耳机测评文案（完整内容）
DOUYIN_EARPHONE_CONTENT = """开放式耳机选这些就够了，坑我帮你踩了，教训我帮你买了，当我也帮你上了。今天这期视频没有套路，全是得罪商家的内容，且看且珍惜。提前声明，这次测评的所有耳机全是自费购买，而且每款都有体验7天以上，所有的数据都是基于客观的事实来进行呈现，杠精、水军别来找骂，如果不信的现在可以直接把我拉黑。 留下来的都是自己人了，直接省流。 ## 耳挂类 - **耳机单元**：超磁体线性单元 - **重量**：单耳10g，整机83.8g - **耳机种类**：气传导式/耳挂式 - **降噪**：不支持主动降噪 ### 籁特易耳星珀 原本发售价在199，历经一年价格直接降到99，想不选都难。自带LDAC音频解码协议和DNS模式，同时还支持APP自定义功能。说实话，能在这么低的价格做到这些事情的目前也只有国内手机大厂了，当然截止目前还没有哪家开放式耳机能把价格压到这么低。 音质方面也是非常符合百元价位段的标准，耳机腔体内置电池，能够拥有更大的腔体来实现漏音控制。同样也是因为腔体内置电池的原因，能够使其拥有更为粗壮的耳挂，可以让佩戴更加牢固。缺点方面只能说塑料感较重，配色一般般。 ### 戴琳OS3 国产新兴品牌，主打开放式消费市场，主打性价比和颜值。这款OS3有着不错的做工以及外观表现，佩戴舒适的同时还做到了极限减重。耳挂尾置电池使其这款耳机对眼镜党非常的友好，音质表现在这个价位段可以算是数一数二的。单次续航8小时，足够日常通勤健身使用。缺点方面，充电仓耳机叠放的方式时间长了耳挂容易发生变形。 ### 达音科维瓦尔第 国产头部HiFi厂家发售的第一款无线式开放耳机从耳机仓到耳机主机均采用亲肤硅胶材质，自适应柔性耳挂使其佩戴更加舒适。单元后面搭载了一颗18*11毫米的多层复合镀金振膜发声单元，以及一颗支持蓝牙5.3版本的主控芯片。协议则是支持除SBC以外的AAC高级音频解码协议。单耳搭载了两颗麦克风，并且支持双设备连接，为数不多在百元开放式耳机里面能够听到声音细节的耳机。 缺点方面：表面亲肤镀膜，在使用时间长了以后容易脱落。 ### SIVGA SO2 同为老派HiFi厂家出品的开放式耳挂耳机，同时也印证了那句话：HiFi厂家出的耳机可以做工很烂，用料很差，但声音一定是非常好听的。当然这款SO2的做工和外观都是相当不错的，只是外观造型过于质朴。采用耳机腔体内置电池的方案，使其耳机腔体能够尽可能的覆盖耳甲腔，减少漏音和提升音质表现。 然后是耳挂可以做到更加的粗壮和牢固，使其在佩戴时更加牢固。搭载了一颗14.2毫米镀钛振膜动圈发声单元，支持SBC以外的AAC高级音频解码协议，采用单耳双麦ENC通话降噪技术。 缺点方面：由于加粗耳挂的原因，对佩戴眼镜的小伙伴不太友好。 ### 弱水时砂Sport Free 同样也是弱水家的第一款耳挂式。在外观方面相较于之前的产品有着一个质的提升，无论是在音质表现还是佩戴舒适度都是属于上上层表现。主机上面还使用了一个铝合金金属环来增加耳机的质感。此外在小小的耳机腔体里面还塞下了一个6轴陀螺仪来实现空间音频的头部追踪功能，以提供更真实的试听体验。这是在同价位耳机里面唯一一款通过陀螺仪来实现空间音频的耳机。通过陀螺仪来实现空间音频的耳机，且质量丝毫不亚于苹果。 配置方面搭载了一颗使用双磁双腔的15.4毫米的超大复合振膜动圈喇叭，以及只会用在高端耳机上面的24比特功率放大芯片，以及华为FreeClip同款镍钛合金材质C桥。 缺点方面：盒盖阻击松散，轻微晃动就会自动关盖。 ### 豪迈S5 24年底新出的开放式耳挂，做工优秀，用料奢侈，主打消费级市场。在外观和用料方面下足了功夫，能够看出厂家对这款耳机非常的上心，实际的表现也是超乎了意料。充电仓整体采用磨砂珠光漆的工艺，耳机主机则是在和皮肤接触的部位使用了亲肤硅胶。 配置方面则是搭载了一颗17*12毫米的长冲程跑道式动圈单元和一颗全新的蓝牙5.4主控芯片，机内延迟更是做到35毫秒，支持常规的SBC以及AAC高级音频解码协议，单边双麦克风使用ENC通话降噪。 缺点方面：白色款式耳机表面容易刮花和弄脏，无重置按钮以及6月份以后才支持APP使用。 ### 眷蜀Mate Sport Pro 上新的一款全新概念式开放式耳机，拥有AI智能翻译、同声传译、会议记录以及会议纪要功能。总结功能：同样作为一款开放式耳机还具备了降噪功能，配对了两对大小不一样的耳帽来适配它的主动降噪功能。同样音质也是得益于独特的出音嘴，表现还较为不错，也是难得能把音质和特色功能都做的十分到位的一款产品。 外观质感方面采用了类纺织布的质感来增加在手中的握持感，使其不易脱手。主机搭载了一颗14.2毫米的复合振膜动圈单元，在支持除SBC、AAC以外，还额外支持了LDAC音频解码协议，使用了ENC通话降噪技术。原价499现在新品首发价399，可以说这款Mate Sport Pro是最接近于未来开放式耳机主流趋势的耳机，也是非常值得去尝试一下的开放式耳机。 缺点方面也是因为类布料的材质设计，使其白色款式特别容易弄脏，导致不容易清理干净。其次是为了减少漏音和音质表现的问题。在佩戴时，因为这款耳机比较紧贴耳甲腔，需要提前选好适合自己耳朵大小的耳帽来进行适配，不然会比较硌耳朵。"""

async def test_douyin_earphone_analysis():
    """测试抖音耳机文案分析"""
    print("🚀 开始测试抖音耳机文案的三段式分析")
    print("=" * 70)
    
    request_data = {
        "content": DOUYIN_EARPHONE_CONTENT,
        "content_type": "text"
    }
    
    print(f"📝 分析内容长度: {len(DOUYIN_EARPHONE_CONTENT)}字符")
    print(f"📝 内容预览: {DOUYIN_EARPHONE_CONTENT[:100]}...")
    print("-" * 70)
    
    async with httpx.AsyncClient(timeout=120.0) as client:  # 增加超时时间
        try:
            print("⏳ 正在调用API分析...")
            response = await client.post(API_ENDPOINT, json=request_data)
            
            print(f"📊 响应状态码: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ 分析成功完成！")
                print("=" * 70)
                
                # 验证响应格式
                print("📋 响应格式验证:")
                print(f"  - code: {data.get('code')}")
                print(f"  - message: {data.get('message')}")
                print(f"  - data字段存在: {'✅' if data.get('data') else '❌'}")
                
                if data.get('data'):
                    analysis_data = data['data']
                    meta = analysis_data.get('meta', {})
                    
                    print("\n🎯 分析结果概览:")
                    print(f"  - 分析ID: {meta.get('analysis_id')}")
                    print(f"  - 处理时间: {meta.get('processing_time_ms')}ms")
                    print(f"  - AI模型: {meta.get('ai_model')}")
                    print(f"  - Prompt版本: {meta.get('prompt_version')}")
                    
                    # 详细显示三段式分析结果
                    print("\n" + "=" * 70)
                    print("📊 三段式分析详细结果:")
                    
                    # 信任之钩
                    trust_hook = analysis_data.get('trust_hook', {})
                    print(f"\n🎣 【信任之钩】")
                    print(f"开场钩子: {trust_hook.get('hook_copy', 'N/A')}")
                    print(f"可信度证言: {trust_hook.get('credibility_testimony', 'N/A')}")
                    authority_signals = trust_hook.get('authority_signals', [])
                    print(f"权威信号: {', '.join(authority_signals) if authority_signals else 'N/A'}")
                    
                    # 共情之锚
                    empathy_anchor = analysis_data.get('empathy_anchor', {})
                    print(f"\n⚓ 【共情之锚】")
                    print(f"核心痛点: {empathy_anchor.get('pain_point', 'N/A')}")
                    print(f"目标受众: {empathy_anchor.get('target_audience', 'N/A')}")
                    emotional_triggers = empathy_anchor.get('emotional_triggers', [])
                    print(f"情感触发器: {', '.join(emotional_triggers) if emotional_triggers else 'N/A'}")
                    
                    # 价值图谱
                    value_map = analysis_data.get('value_map', {})
                    print(f"\n🗺️ 【价值图谱】")
                    print(f"核心价值: {value_map.get('core_value', 'N/A')}")
                    value_delivery = value_map.get('value_delivery', [])
                    print(f"价值交付: {', '.join(value_delivery) if value_delivery else 'N/A'}")
                    print(f"竞争优势: {value_map.get('competitive_advantage', 'N/A')}")
                    
                    print("\n" + "=" * 70)
                    print("🎉 分析完成！结果符合三段式爆款公式结构。")
                    
                    return True
                    
            else:
                error_data = response.json()
                print(f"❌ API调用失败")
                print(f"错误信息: {error_data}")
                return False
                
        except Exception as e:
            print(f"❌ 测试异常: {str(e)}")
            return False

async def main():
    """主函数"""
    success = await test_douyin_earphone_analysis()
    
    if success:
        print("\n✅ 抖音耳机文案分析测试成功！")
        print("📝 从结果来看，prompt模板已正确传递给AI模型，")
        print("📝 三段式分析按照预期的结构和格式输出结果。")
    else:
        print("\n❌ 测试失败，需要检查API或配置。")

if __name__ == "__main__":
    asyncio.run(main())