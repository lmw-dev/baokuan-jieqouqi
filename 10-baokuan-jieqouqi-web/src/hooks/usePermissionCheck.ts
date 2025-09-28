import { useState, useEffect } from 'react';
import { type AnalysisCardWithSource, type PermissionResult } from '@/lib/validations/analysis-card';
import { AuthService } from '@/lib/auth-service';

/**
 * 权限检查Hook
 * 验证用户是否有权限访问指定的分析卡片
 */
export function usePermissionCheck(cardId: string | null) {
  const [permissionResult, setPermissionResult] = useState<PermissionResult>({
    hasPermission: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cardId) {
      setIsLoading(false);
      setError('无效的卡片ID');
      return;
    }

    const checkPermission = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 获取当前用户
        const currentUser = await AuthService.getCurrentUser();
        if (!currentUser) {
          setPermissionResult({
            hasPermission: false,
            error: '用户未认证'
          });
          return;
        }

        // 调用API获取卡片信息并验证权限
        const response = await fetch(`/api/cards/${cardId}`, {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json();
          
          if (response.status === 403) {
            setPermissionResult({
              hasPermission: false,
              error: '无权限访问此分析卡片'
            });
          } else if (response.status === 404) {
            setPermissionResult({
              hasPermission: false,
              error: '分析卡片不存在'
            });
          } else {
            setPermissionResult({
              hasPermission: false,
              error: errorData.error || '权限验证失败'
            });
          }
          return;
        }

        const { data } = await response.json();
        setPermissionResult({
          hasPermission: true,
          card: data
        });

      } catch (err) {
        console.error('权限检查失败:', err);
        setError('权限检查失败');
        setPermissionResult({
          hasPermission: false,
          error: '权限检查失败'
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkPermission();
  }, [cardId]);

  return {
    permissionResult,
    isLoading,
    error,
    hasPermission: permissionResult.hasPermission,
    card: permissionResult.card,
  };
}

/**
 * 用户认证检查Hook
 * 验证用户是否已登录
 */
export function useAuthCheck() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser();
        if (currentUser) {
          setIsAuthenticated(true);
          setUser(currentUser);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error('认证检查失败:', error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  return {
    isAuthenticated,
    isLoading,
    user,
  };
}