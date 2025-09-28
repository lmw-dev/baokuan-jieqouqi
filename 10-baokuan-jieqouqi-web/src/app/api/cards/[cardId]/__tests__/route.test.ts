import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/cards/[cardId]/route';
import { AuthService } from '@/lib/auth-service';
import { PrismaClient } from '@prisma/client';

// Mock dependencies
jest.mock('@/lib/auth-service');
jest.mock('@prisma/client');

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockPrisma = {
  analysisCard: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
} as unknown as jest.Mocked<PrismaClient>;

// 模拟全局 prisma
(global as any).globalForPrisma = { prisma: mockPrisma };

describe('/api/cards/[cardId] API Routes', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    logtoId: 'logto-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    phoneNumber: null,
    image: null,
  };

  const mockCard = {
    id: 'card-1',
    versionTitle: 'AI初稿',
    hookCopy: '测试钩子文案',
    hookTypes: ['建立权威'],
    hookNotes: '测试笔记',
    coreIdea: '测试核心观点',
    argumentCase: '测试论证案例',
    valueDelivery: ['知识技能'],
    reusableElements: '测试可复用要素',
    valueNotes: '测试价值笔记',
    sourceId: 'source-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    source: {
      id: 'source-1',
      ownerId: 'user-1',
      title: '测试分析源',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/cards/[cardId]', () => {
    it('应该成功返回用户有权限的分析卡片', async () => {
      // 模拟认证成功
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);
      
      // 模拟查找卡片成功
      mockPrisma.analysisCard.findUnique.mockResolvedValue(mockCard);

      const request = new NextRequest('http://localhost/api/cards/card-1');
      const params = { cardId: 'card-1' };

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('card-1');
      expect(mockPrisma.analysisCard.findUnique).toHaveBeenCalledWith({
        where: { id: 'card-1' },
        include: {
          source: {
            select: {
              id: true,
              ownerId: true,
              title: true,
            }
          }
        }
      });
    });

    it('应该拒绝未认证用户的访问', async () => {
      // 模拟认证失败
      mockAuthService.getCurrentUser.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/cards/card-1');
      const params = { cardId: 'card-1' };

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('用户未认证');
    });

    it('应该拒绝无权限用户的访问', async () => {
      const otherUser = { ...mockUser, id: 'user-2' };
      
      // 模拟认证成功但用户不同
      mockAuthService.getCurrentUser.mockResolvedValue(otherUser);
      
      // 模拟查找卡片成功
      mockPrisma.analysisCard.findUnique.mockResolvedValue(mockCard);

      const request = new NextRequest('http://localhost/api/cards/card-1');
      const params = { cardId: 'card-1' };

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('无权限访问此分析卡片');
    });

    it('应该返回404当卡片不存在时', async () => {
      // 模拟认证成功
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);
      
      // 模拟查找卡片失败
      mockPrisma.analysisCard.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/cards/nonexistent');
      const params = { cardId: 'nonexistent' };

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('分析卡片不存在');
    });
  });

  describe('PUT /api/cards/[cardId]', () => {
    const validUpdateData = {
      versionTitle: '更新版本',
      hookCopy: '更新的钩子文案',
      hookTypes: ['制造冲突'],
      hookNotes: '更新的笔记',
      coreIdea: '更新的核心观点',
      argumentCase: '更新的论证案例',
      valueDelivery: ['实用方法'],
      reusableElements: '更新的可复用要素',
      valueNotes: '更新的价值笔记',
    };

    it('应该成功更新用户有权限的分析卡片', async () => {
      // 模拟认证成功
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);
      
      // 模拟查找卡片成功
      mockPrisma.analysisCard.findUnique.mockResolvedValue(mockCard);
      
      // 模拟更新成功
      const updatedCard = { ...mockCard, ...validUpdateData };
      mockPrisma.analysisCard.update.mockResolvedValue(updatedCard);

      const request = new NextRequest('http://localhost/api/cards/card-1', {
        method: 'PUT',
        body: JSON.stringify(validUpdateData),
        headers: { 'Content-Type': 'application/json' },
      });
      const params = { cardId: 'card-1' };

      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.versionTitle).toBe('更新版本');
      expect(data.message).toBe('分析卡片更新成功');
    });

    it('应该拒绝无效的数据格式', async () => {
      // 模拟认证成功
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);

      const invalidData = {
        versionTitle: '', // 无效：空字符串
        hookTypes: new Array(10).fill('类型'), // 无效：超过5个
      };

      const request = new NextRequest('http://localhost/api/cards/card-1', {
        method: 'PUT',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      });
      const params = { cardId: 'card-1' };

      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('数据格式错误');
      expect(data.details).toBeDefined();
    });

    it('应该拒绝未认证用户的更新请求', async () => {
      // 模拟认证失败
      mockAuthService.getCurrentUser.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/cards/card-1', {
        method: 'PUT',
        body: JSON.stringify(validUpdateData),
        headers: { 'Content-Type': 'application/json' },
      });
      const params = { cardId: 'card-1' };

      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('用户未认证');
    });

    it('应该拒绝无权限用户的更新请求', async () => {
      const otherUser = { ...mockUser, id: 'user-2' };
      
      // 模拟认证成功但用户不同
      mockAuthService.getCurrentUser.mockResolvedValue(otherUser);
      
      // 模拟查找卡片成功
      mockPrisma.analysisCard.findUnique.mockResolvedValue(mockCard);

      const request = new NextRequest('http://localhost/api/cards/card-1', {
        method: 'PUT',
        body: JSON.stringify(validUpdateData),
        headers: { 'Content-Type': 'application/json' },
      });
      const params = { cardId: 'card-1' };

      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('无权限修改此分析卡片');
    });
  });
});