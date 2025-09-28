import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始播种数据库...');

  // 创建测试用户
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      id: 'test-user-001',
      email: 'test@example.com',
      name: '测试用户',
      image: '/placeholder-user.jpg',
      logtoId: 'logto-test-001'
    }
  });

  console.log('✅ 创建测试用户:', user.name);

  // 创建Mock分析源和分析卡片
  const mockSources = [
    {
      title: 'iPhone 15 Pro深度评测：值得升级吗？',
      sourceType: 'URL',
      sourceContent: 'https://example.com/iphone-15-pro-review',
      transcript: 'iPhone 15 Pro 是苹果今年推出的旗舰机型，搭载了全新的A17 Pro芯片...',
      cards: [
        {
          versionTitle: 'iPhone评测视频解构分析',
          hookCopy: '你还在用iPhone 14？看完这个视频你会立刻想换iPhone 15 Pro',
          hookTypes: ['痛点挖掘', '对比反差'],
          coreIdea: 'iPhone 15 Pro的性能提升足以让老用户升级',
          argumentCase: '实际测试显示，A17 Pro芯片性能比A16提升15%',
          valueDelivery: ['硬件评测', '购买建议'],
          reusableElements: '产品对比测试方法、性能跑分展示'
        }
      ]
    },
    {
      title: '2024年最佳笔记本电脑推荐',
      sourceType: 'FILE',
      sourceContent: 'laptop-guide-2024.mp4',
      transcript: '2024年笔记本市场竞争激烈，我们测试了20款热门机型...',
      cards: [
        {
          versionTitle: '笔记本选购指南分析',
          hookCopy: '买笔记本前必看！我花了3万块测试20款笔记本，告诉你哪款最值得买',
          hookTypes: ['权威背书', '成本投入'],
          coreIdea: '通过大量测试提供最客观的笔记本选购建议',
          argumentCase: '实际采购20款笔记本，累计3万元成本投入',
          valueDelivery: ['选购指南', '性价比分析'],
          reusableElements: '多产品对比框架、评测标准体系'
        }
      ]
    },
    {
      title: 'AirPods Pro 2代 vs Sony WF-1000XM4',
      sourceType: 'TEXT',
      sourceContent: 'AirPods Pro 2代对比Sony WF-1000XM4的详细文案...',
      transcript: 'AirPods Pro 2代和Sony WF-1000XM4都是顶级降噪耳机...',
      cards: [
        {
          versionTitle: '降噪耳机对比分析',
          hookCopy: 'AirPods Pro 2代 vs Sony降噪豆4，我用了3个月告诉你选哪个',
          hookTypes: ['长期体验', '二选一'],
          coreIdea: '通过长期使用对比两款顶级降噪耳机的优劣',
          argumentCase: '3个月深度使用，从音质、降噪、续航三个维度对比',
          valueDelivery: ['产品对比', '购买决策'],
          reusableElements: '耳机评测标准、长期体验分享框架'
        }
      ]
    },
    {
      title: '小米13 Ultra拍照体验',
      sourceType: 'URL',
      sourceContent: 'https://example.com/xiaomi-13-ultra-camera',
      transcript: '小米13 Ultra的拍照系统是目前安卓阵营最强的...',
      cards: [
        {
          versionTitle: '手机摄影功能分析',
          hookCopy: '小米13 Ultra拍照竟然比iPhone 14 Pro Max还强？实测告诉你真相',
          hookTypes: ['争议话题', '实测验证'],
          coreIdea: '小米13 Ultra在特定场景下拍照确实超越iPhone',
          argumentCase: '同场景对比拍摄50组样张，客观数据说话',
          valueDelivery: ['拍照评测', '手机推荐'],
          reusableElements: '手机拍照测试方法、样张对比展示'
        }
      ]
    },
    {
      title: 'MacBook Air M2 使用一年后感受',
      sourceType: 'FILE',
      sourceContent: 'macbook-air-m2-review.mp4',
      transcript: 'MacBook Air M2我已经使用了一年时间，今天来聊聊真实感受...',
      cards: [
        {
          versionTitle: '长期使用体验分析',
          hookCopy: 'MacBook Air M2用了一年，我后悔买它了...',
          hookTypes: ['反转剧情', '长期回顾'],
          coreIdea: 'MacBook Air M2长期使用中的优缺点真实分享',
          argumentCase: '一年使用数据：续航衰减、性能表现、使用场景',
          valueDelivery: ['长期体验', '购买建议'],
          reusableElements: '产品长期使用评价框架、数据化展示'
        }
      ]
    }
  ];

  // 创建分析源和分析卡片
  for (const sourceData of mockSources) {
    const source = await prisma.analysisSource.create({
      data: {
        title: sourceData.title,
        sourceType: sourceData.sourceType as any,
        sourceContent: sourceData.sourceContent,
        transcript: sourceData.transcript,
        ownerId: user.id
      }
    });

    for (const cardData of sourceData.cards) {
      await prisma.analysisCard.create({
        data: {
          versionTitle: cardData.versionTitle,
          hookCopy: cardData.hookCopy,
          hookTypes: cardData.hookTypes,
          coreIdea: cardData.coreIdea,
          argumentCase: cardData.argumentCase,
          valueDelivery: cardData.valueDelivery,
          reusableElements: cardData.reusableElements,
          sourceId: source.id
        }
      });
    }

    console.log(`✅ 创建分析源: ${source.title}`);
  }

  console.log('🎉 数据库播种完成！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
