// 认证服务 - 处理用户数据同步和认证逻辑
import { PrismaClient } from '@prisma/client';
import apiClient from './api-client';
import type { 
  AuthResponse, 
  User, 
  LogtoUserInfo, 
  AuthError,
  UserCreateData,
  UserUpdateData 
} from '@/types/auth';

// 确保Prisma客户端单例
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * 认证服务类
 */
export class AuthService {
  /**
   * 处理认证回调，创建或更新用户信息
   */
  static async handleCallback(
    logtoUserInfo: LogtoUserInfo,
    accessToken: string
  ): Promise<AuthResponse> {
    try {
      console.log('🔄 Processing auth callback for user:', logtoUserInfo.sub);
      
      // 🔍 详细调试日志 - 显示接收到的Logto用户信息
      console.log('🔍 Logto user info received in handleCallback:');
      console.log('  - sub:', logtoUserInfo.sub);
      console.log('  - email:', logtoUserInfo.email);
      console.log('  - phone_number:', logtoUserInfo.phone_number);
      console.log('  - name:', logtoUserInfo.name);
      console.log('  - picture:', logtoUserInfo.picture);
      
      // 查找现有用户
      let user = await prisma.user.findUnique({
        where: { logtoId: logtoUserInfo.sub }
      });

      if (user) {
        // 更新现有用户信息
        console.log('📝 Updating existing user:', user.id);
        console.log('🔍 Current user data before update:', JSON.stringify({
          id: user.id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          image: user.image
        }, null, 2));
        
        const updateData = this.mapLogtoUserToUpdateData(logtoUserInfo);
        console.log('🔍 Update data to be applied:', JSON.stringify(updateData, null, 2));
        
        // 检查是否有实际需要更新的字段
        const hasUpdates = Object.values(updateData).some(value => value !== null && value !== undefined);
        console.log('🔍 Has meaningful updates?', hasUpdates);
        
        user = await this.updateUser(user.id, updateData);
      } else {
        // 创建新用户
        console.log('🆕 Creating new user for Logto ID:', logtoUserInfo.sub);
        
        const createData = this.mapLogtoUserToCreateData(logtoUserInfo);
        console.log('🔍 Create data to be used:', JSON.stringify(createData, null, 2));
        
        // 检查创建数据的完整性
        const hasBasicInfo = createData.name || createData.email;
        console.log('🔍 Has basic info (name/email)?', hasBasicInfo);
        
        if (!hasBasicInfo) {
          console.log('⚠️  WARNING: Creating user without basic info (name/email)');
          console.log('    This suggests Logto registration did not collect this information');
        }
        
        user = await this.createUser(createData);
      }

      console.log('✅ Final user data:', JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        logtoId: user.logtoId
      }, null, 2));

      return {
        success: true,
        user,
        token: accessToken,
        message: '认证成功'
      };
    } catch (error) {
      console.error('❌ Auth callback error:', error);
      throw this.createAuthError(
        'CALLBACK_ERROR',
        '认证回调处理失败',
        error
      );
    }
  }

  /**
   * 获取用户信息（通过token）
   */
  static async getUserByToken(token: string): Promise<User | null> {
    try {
      console.log('🔍 Getting user by token via API');
      
      // 调用 /api/auth/me 端点获取当前用户信息
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 包含 cookies
      });
      
      if (!response.ok) {
        console.log('❌ Failed to get user info:', response.status);
        return null;
      }
      
      const data = await response.json();
      console.log('✅ User info obtained via API:', data.data?.id);
      return data.data;
    } catch (error) {
      console.error('❌ Get user by token error:', error);
      return null;
    }
  }

  /**
   * 获取当前用户信息（客户端使用）
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      console.log('🔍 Getting current user via API');
      
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include', // 包含 cookies
      });
      
      if (!response.ok) {
        console.log('❌ Failed to get current user:', response.status);
        return null;
      }
      
      const data = await response.json();
      console.log('✅ Current user obtained:', data.data?.id);
      return data.data;
    } catch (error) {
      console.error('❌ Get current user error:', error);
      return null;
    }
  }

  /**
   * 获取当前用户信息（服务端使用，直接查询数据库）
   */
  static async getCurrentUserServer(): Promise<User | null> {
    try {
      console.log('🔍 Getting current user for server component');
      
      // 在服务端组件中，我们可以直接使用cookies()来获取会话信息
      // 但这需要import { cookies } from 'next/headers'
      // 暂时返回null，让页面处理未认证状态
      console.log('📌 Server-side user detection not implemented yet');
      return null;
    } catch (error) {
      console.error('❌ Get current user server error:', error);
      return null;
    }
  }

  /**
   * 通过Logto ID获取用户
   */
  static async getUserByLogtoId(logtoId: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { logtoId }
      });
      return user;
    } catch (error) {
      console.error('❌ Get user by Logto ID error:', error);
      return null;
    }
  }

  /**
   * 通过用户ID获取用户
   */
  static async getUserById(userId: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      return user;
    } catch (error) {
      console.error('❌ Get user by ID error:', error);
      return null;
    }
  }

  /**
   * 创建新用户
   */
  static async createUser(userData: UserCreateData): Promise<User> {
    try {
      const user = await prisma.user.create({
        data: userData
      });
      console.log('✅ User created successfully:', user.id);
      return user;
    } catch (error) {
      console.error('❌ Create user error:', error);
      throw this.createAuthError(
        'CREATE_USER_ERROR',
        '创建用户失败',
        error
      );
    }
  }

  /**
   * 更新用户信息
   */
  static async updateUser(userId: string, userData: UserUpdateData): Promise<User> {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: userData
      });
      console.log('✅ User updated successfully:', userId);
      return user;
    } catch (error) {
      console.error('❌ Update user error:', error);
      throw this.createAuthError(
        'UPDATE_USER_ERROR',
        '更新用户失败',
        error
      );
    }
  }

  /**
   * 删除用户
   */
  static async deleteUser(userId: string): Promise<void> {
    try {
      await prisma.user.delete({
        where: { id: userId }
      });
      console.log('✅ User deleted successfully:', userId);
    } catch (error) {
      console.error('❌ Delete user error:', error);
      throw this.createAuthError(
        'DELETE_USER_ERROR',
        '删除用户失败',
        error
      );
    }
  }

  /**
   * 将Logto用户信息映射为创建数据
   */
  private static mapLogtoUserToCreateData(logtoUserInfo: LogtoUserInfo): UserCreateData {
    // 优先使用username，然后是name，再从email生成，最后使用fallback
    let name = logtoUserInfo.username || logtoUserInfo.name;
    if (!name && logtoUserInfo.email) {
      name = logtoUserInfo.email.split('@')[0];
    }
    if (!name) {
      name = `用户${logtoUserInfo.sub.substring(0, 8)}`;
    }

    return {
      logtoId: logtoUserInfo.sub,
      email: logtoUserInfo.email || null,
      phoneNumber: logtoUserInfo.phone_number || null,
      name: name,
      image: logtoUserInfo.picture || null
    };
  }

  /**
   * 将Logto用户信息映射为更新数据（只更新非空字段）
   */
  private static mapLogtoUserToUpdateData(logtoUserInfo: LogtoUserInfo): UserUpdateData {
    const updateData: UserUpdateData = {};
    
    // 只更新非空字段，避免覆盖现有的有效数据
    if (logtoUserInfo.email) {
      updateData.email = logtoUserInfo.email;
    }
    if (logtoUserInfo.phone_number) {
      updateData.phoneNumber = logtoUserInfo.phone_number;
    }
    // 优先使用username，然后是name
    if (logtoUserInfo.username || logtoUserInfo.name) {
      updateData.name = logtoUserInfo.username || logtoUserInfo.name;
    }
    if (logtoUserInfo.picture) {
      updateData.image = logtoUserInfo.picture;
    }
    
    return updateData;
  }

  /**
   * 创建认证错误对象
   */
  private static createAuthError(code: string, message: string, details?: any): AuthError {
    return {
      code,
      message,
      details
    };
  }

  /**
   * 验证用户是否有权限访问资源
   */
  static async validateUserAccess(userId: string, resourceId?: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      // 基础验证：用户存在
      if (!user) {
        return false;
      }

      // 这里可以添加更复杂的权限验证逻辑
      // 比如检查用户是否有访问特定资源的权限
      
      return true;
    } catch (error) {
      console.error('❌ Validate user access error:', error);
      return false;
    }
  }

  /**
   * 清理过期的认证会话（可用于定时任务）
   */
  static async cleanupExpiredSessions(): Promise<void> {
    try {
      // 这里可以实现清理过期会话的逻辑
      console.log('🧹 Cleanup expired sessions (not implemented yet)');
    } catch (error) {
      console.error('❌ Cleanup expired sessions error:', error);
    }
  }
} 