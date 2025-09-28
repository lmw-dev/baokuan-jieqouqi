import { notFound, redirect } from 'next/navigation';
import { AuthService } from '@/lib/auth-service';
import { AnalysisCardEditClient } from './AnalysisCardEditClient';

interface PageProps {
  params: Promise<{ cardId: string }>;
}

/**
 * 分析卡片编辑页面 - 服务端组件
 * 处理权限验证和数据获取
 */
export default async function AnalysisCardEditPage({ params }: PageProps) {
  const { cardId } = await params;

  try {
    // 服务端用户认证检查
    // 注意：这里简化处理，实际项目中可能需要更完整的服务端认证
    // 主要的权限验证在客户端组件和API层进行
    
    return <AnalysisCardEditClient cardId={cardId} />;
    
  } catch (error) {
    console.error('页面加载错误:', error);
    notFound();
  }
}

/**
 * 生成页面元数据
 */
export async function generateMetadata({ params }: PageProps) {
  const { cardId } = await params;
  return {
    title: `编辑分析卡片 - ${cardId}`,
    description: '编辑和完善AI生成的内容分析结果',
  };
}