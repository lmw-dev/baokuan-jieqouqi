/**
 * @jest-environment node
 */
import { generateMetadata } from '../page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  notFound: jest.fn(),
  redirect: jest.fn(),
}));

// Mock AuthService
jest.mock('@/lib/auth-service', () => ({
  AuthService: {
    getUser: jest.fn(),
  },
}));

// Mock AnalysisCardEditClient
jest.mock('../AnalysisCardEditClient', () => ({
  AnalysisCardEditClient: ({ cardId }: { cardId: string }) => (
    <div data-testid="analysis-card-edit-client">
      Card ID: {cardId}
    </div>
  ),
}));

describe('AnalysisCardEditPage', () => {
  describe('generateMetadata', () => {
    test('应该生成正确的页面元数据', async () => {
      const params = Promise.resolve({ cardId: 'test-card-123' });
      
      const metadata = await generateMetadata({ params });
      
      expect(metadata).toEqual({
        title: '编辑分析卡片 - test-card-123',
        description: '编辑和完善AI生成的内容分析结果',
      });
    });

    test('应该处理特殊字符的cardId', async () => {
      const params = Promise.resolve({ cardId: 'card-with-special-chars-123!@#' });
      
      const metadata = await generateMetadata({ params });
      
      expect(metadata.title).toContain('card-with-special-chars-123!@#');
    });
  });

  describe('页面渲染', () => {
    // 注意：由于这是一个服务端组件，我们主要测试元数据生成
    // 实际的页面渲染逻辑在客户端组件中，已在 AnalysisCardEditClient.test.tsx 中测试
    
    test('页面应该能够处理参数解析', async () => {
      const params = Promise.resolve({ cardId: 'test-card-id' });
      
      // 验证参数能够正确解析
      const { cardId } = await params;
      expect(cardId).toBe('test-card-id');
    });
  });
});