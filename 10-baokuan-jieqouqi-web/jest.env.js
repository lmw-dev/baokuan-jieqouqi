// Jest环境配置 - 为TOM-201 Dashboard测试设置环境变量

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.NEXT_PHASE = 'phase-test';

// Mock environment variables for testing
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000/api';

// Suppress console warnings during tests
process.env.SUPPRESS_NO_CONFIG_WARNING = 'true';

// 设置时区为UTC，确保测试结果一致
process.env.TZ = 'UTC';

// Mock实现一些全局对象
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(cb) {
    this.cb = cb;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor(cb) {
    this.cb = cb;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', { 
  value: jest.fn(), 
  writable: true 
});

// 为测试提供一些常用的Mock函数
global.mockConsole = () => {
  const originalConsole = { ...console };
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  
  afterEach(() => {
    console.error.mockRestore();
    console.warn.mockRestore();
    console.log.mockRestore();
  });
  
  return originalConsole;
}; 