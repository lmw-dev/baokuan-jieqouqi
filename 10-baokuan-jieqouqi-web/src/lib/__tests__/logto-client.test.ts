// Mock @logto/next
jest.mock('@logto/next', () => ({
  __esModule: true,
  default: jest.fn(),
  LogtoNextConfig: jest.fn(),
}));

// Logto客户端配置测试
import { logtoConfig, validateLogtoConfig } from '../logto-client';

describe('Logto Client Configuration', () => {
  it('应该有正确的配置结构', () => {
    expect(logtoConfig).toHaveProperty('endpoint');
    expect(logtoConfig).toHaveProperty('appId');
    expect(logtoConfig).toHaveProperty('baseUrl');
    expect(logtoConfig).toHaveProperty('resources');
    expect(logtoConfig).toHaveProperty('scopes');
  });

  it('应该包含必要的OAuth scopes', () => {
    expect(logtoConfig.scopes).toContain('openid');
    expect(logtoConfig.scopes).toContain('profile');
    expect(logtoConfig.scopes).toContain('email');
  });

  it('应该验证配置完整性', () => {
    const validation = validateLogtoConfig();
    expect(validation).toHaveProperty('isValid');
    expect(validation).toHaveProperty('errors');
    expect(Array.isArray(validation.errors)).toBe(true);
  });
}); 