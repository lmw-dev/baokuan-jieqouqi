// Mock Prisma Client first
jest.mock('@prisma/client', () => {
  const mockPrismaUser = {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  
  return {
    PrismaClient: jest.fn(() => ({
      user: mockPrismaUser,
    })),
  };
});

// Mock auth service dependencies
jest.mock('../auth-service', () => ({
  AuthService: {
    handleCallback: jest.fn(),
    getUserByLogtoId: jest.fn(),
    createUser: jest.fn(),
    validateUserAccess: jest.fn(),
  },
}));

// 认证服务单元测试
import { AuthService } from '../auth-service';
import type { LogtoUserInfo } from '@/types/auth';

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleCallback', () => {
    const mockLogtoUserInfo: LogtoUserInfo = {
      sub: 'logto-user-123',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
    };

    const mockAccessToken = 'mock-access-token';

    it('应该为新用户创建账户', async () => {
      // Mock user not found, then create new user
      mockPrismaUser.findUnique.mockResolvedValue(null);
      mockPrismaUser.create.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        image: 'https://example.com/avatar.jpg',
        logtoId: 'logto-user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        phoneNumber: null,
      });

      const result = await AuthService.handleCallback(mockLogtoUserInfo, mockAccessToken);

      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { logtoId: 'logto-user-123' }
      });
      expect(mockPrismaUser.create).toHaveBeenCalledWith({
        data: {
          logtoId: 'logto-user-123',
          email: 'test@example.com',
          name: 'Test User',
          image: 'https://example.com/avatar.jpg',
          phoneNumber: undefined,
        }
      });
      expect(result.success).toBe(true);
      expect(result.token).toBe(mockAccessToken);
      expect(result.user.logtoId).toBe('logto-user-123');
    });

    it('应该为现有用户更新信息', async () => {
      const existingUser = {
        id: 'user-123',
        email: 'old@example.com',
        name: 'Old Name',
        image: null,
        logtoId: 'logto-user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        phoneNumber: null,
      };

      const updatedUser = {
        ...existingUser,
        email: 'test@example.com',
        name: 'Test User',
        image: 'https://example.com/avatar.jpg',
      };

      // Mock user found, then update user
      mockPrismaUser.findUnique.mockResolvedValue(existingUser);
      mockPrismaUser.update.mockResolvedValue(updatedUser);

      const result = await AuthService.handleCallback(mockLogtoUserInfo, mockAccessToken);

      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { logtoId: 'logto-user-123' }
      });
      expect(mockPrismaUser.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          email: 'test@example.com',
          name: 'Test User',
          image: 'https://example.com/avatar.jpg',
          phoneNumber: undefined,
        }
      });
      expect(result.success).toBe(true);
      expect(result.user.email).toBe('test@example.com');
    });

    it('应该处理数据库错误', async () => {
      mockPrismaUser.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(
        AuthService.handleCallback(mockLogtoUserInfo, mockAccessToken)
      ).rejects.toThrow('认证回调处理失败');
    });
  });

  describe('getUserByLogtoId', () => {
    it('应该返回找到的用户', async () => {
      const mockUser = {
        id: 'user-123',
        logtoId: 'logto-user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockPrismaUser.findUnique.mockResolvedValue(mockUser);

      const result = await AuthService.getUserByLogtoId('logto-user-123');

      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { logtoId: 'logto-user-123' }
      });
      expect(result).toEqual(mockUser);
    });

    it('应该在用户不存在时返回null', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      const result = await AuthService.getUserByLogtoId('non-existent');

      expect(result).toBeNull();
    });

    it('应该处理数据库错误', async () => {
      mockPrismaUser.findUnique.mockRejectedValue(new Error('Database error'));

      const result = await AuthService.getUserByLogtoId('logto-user-123');

      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    it('应该成功创建用户', async () => {
      const userData = {
        logtoId: 'logto-user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      const createdUser = {
        id: 'user-123',
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
        phoneNumber: null,
        image: null,
      };

      mockPrismaUser.create.mockResolvedValue(createdUser);

      const result = await AuthService.createUser(userData);

      expect(mockPrismaUser.create).toHaveBeenCalledWith({
        data: userData
      });
      expect(result).toEqual(createdUser);
    });

    it('应该处理创建错误', async () => {
      const userData = {
        logtoId: 'logto-user-123',
        email: 'test@example.com',
      };

      mockPrismaUser.create.mockRejectedValue(new Error('Unique constraint failed'));

      await expect(AuthService.createUser(userData)).rejects.toThrow('创建用户失败');
    });
  });

  describe('validateUserAccess', () => {
    it('应该验证现有用户的访问权限', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockPrismaUser.findUnique.mockResolvedValue(mockUser);

      const result = await AuthService.validateUserAccess('user-123');

      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' }
      });
      expect(result).toBe(true);
    });

    it('应该拒绝不存在用户的访问', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      const result = await AuthService.validateUserAccess('non-existent');

      expect(result).toBe(false);
    });

    it('应该处理验证错误', async () => {
      mockPrismaUser.findUnique.mockRejectedValue(new Error('Database error'));

      const result = await AuthService.validateUserAccess('user-123');

      expect(result).toBe(false);
    });
  });
}); 