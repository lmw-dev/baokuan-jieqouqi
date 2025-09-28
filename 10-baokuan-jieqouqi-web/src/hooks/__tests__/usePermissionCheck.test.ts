import { renderHook, waitFor } from '@testing-library/react';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import { AuthService } from '@/lib/auth-service';

// Mock dependencies
jest.mock('@/lib/auth-service');

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('usePermissionCheck Hook', () => {
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
    mockFetch.mockClear();
  });

  it('应该在用户有权限时返回卡片数据', async () => {
    // 模拟认证成功
    mockAuthService.getCurrentUser.mockResolvedValue(mockUser);
    
    // 模拟API调用成功
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockCard }),
    } as Response);

    const { result } = renderHook(() => usePermissionCheck('card-1'));

    // 初始状态
    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasPermission).toBe(false);

    // 等待异步操作完成
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasPermission).toBe(true);
    expect(result.current.card).toEqual(mockCard);
    expect(result.current.error).toBe(null);
    expect(mockFetch).toHaveBeenCalledWith('/api/cards/card-1', {
      method: 'GET',
      credentials: 'include',
    });
  });

  it('应该在用户未认证时返回错误', async () => {
    // 模拟认证失败
    mockAuthService.getCurrentUser.mockResolvedValue(null);

    const { result } = renderHook(() => usePermissionCheck('card-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasPermission).toBe(false);
    expect(result.current.permissionResult.error).toBe('用户未认证');
    expect(result.current.card).toBeUndefined();
  });

  it('应该在用户无权限时返回权限错误', async () => {
    // 模拟认证成功
    mockAuthService.getCurrentUser.mockResolvedValue(mockUser);
    
    // 模拟API返回403权限错误
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: '无权限访问此分析卡片' }),
    } as Response);

    const { result } = renderHook(() => usePermissionCheck('card-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasPermission).toBe(false);
    expect(result.current.permissionResult.error).toBe('无权限访问此分析卡片');
    expect(result.current.card).toBeUndefined();
  });

  it('应该在卡片不存在时返回404错误', async () => {
    // 模拟认证成功
    mockAuthService.getCurrentUser.mockResolvedValue(mockUser);
    
    // 模拟API返回404错误
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: '分析卡片不存在' }),
    } as Response);

    const { result } = renderHook(() => usePermissionCheck('card-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasPermission).toBe(false);
    expect(result.current.permissionResult.error).toBe('分析卡片不存在');
    expect(result.current.card).toBeUndefined();
  });

  it('应该在cardId为null时立即返回错误', async () => {
    const { result } = renderHook(() => usePermissionCheck(null));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasPermission).toBe(false);
    expect(result.current.error).toBe('无效的卡片ID');
    
    // 不应该调用认证服务
    expect(mockAuthService.getCurrentUser).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('应该处理网络错误', async () => {
    // 模拟认证成功
    mockAuthService.getCurrentUser.mockResolvedValue(mockUser);
    
    // 模拟网络错误
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => usePermissionCheck('card-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasPermission).toBe(false);
    expect(result.current.error).toBe('权限检查失败');
    expect(result.current.permissionResult.error).toBe('权限检查失败');
  });

  it('应该在cardId变化时重新检查权限', async () => {
    // 模拟认证成功
    mockAuthService.getCurrentUser.mockResolvedValue(mockUser);
    
    // 模拟第一次API调用成功
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { ...mockCard, id: 'card-1' } }),
    } as Response);

    const { result, rerender } = renderHook(
      ({ cardId }) => usePermissionCheck(cardId),
      { initialProps: { cardId: 'card-1' } }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasPermission).toBe(true);
    expect(result.current.card?.id).toBe('card-1');

    // 模拟第二次API调用成功
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { ...mockCard, id: 'card-2' } }),
    } as Response);

    // 更改cardId
    rerender({ cardId: 'card-2' });

    await waitFor(() => {
      expect(result.current.card?.id).toBe('card-2');
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenLastCalledWith('/api/cards/card-2', {
      method: 'GET',
      credentials: 'include',
    });
  });
});