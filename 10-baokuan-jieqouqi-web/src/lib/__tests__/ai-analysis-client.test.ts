/**
 * AI分析客户端单元测试
 * TOM-219: 测试AI分析API调用、错误处理、超时机制
 */

import { AIAnalysisClient } from '../ai-analysis-client';
import type { AIAnalysisRequest, AIAnalysisResponse } from '@/types/ai-analysis';

// Mock global fetch
global.fetch = jest.fn();

describe('AIAnalysisClient', () => {
  let client: AIAnalysisClient;
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    client = new AIAnalysisClient({
      baseUrl: 'http://localhost:8000',
      timeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000
    });
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeContent', () => {
    const mockRequest: AIAnalysisRequest = {
      source_id: 'test-source-123',
      content_type: 'video_transcript'
    };

    const mockSuccessResponse: AIAnalysisResponse = {
      code: 0,
      message: '分析完成',
      data: {
        trust_hook: {
          hook_copy: '从582款蓝牙耳机中评测选出的性价比之王！',
          credibility_testimony: '所有产品均为自费购买，无任何广告植入。',
          authority_signals: ['10年评测经验', '海量评测', '性价比之王']
        },
        empathy_anchor: {
          pain_point: '在海量618信息中，害怕买错耳机而浪费钱',
          target_audience: '追求性价比的消费者',
          emotional_triggers: ['损失厌恶', '选择困难']
        },
        value_map: {
          core_value: '帮助用户选择性价比最高的蓝牙耳机',
          value_delivery: ['专业评测', '中立推荐', '性价比分析'],
          competitive_advantage: '自费评测保证客观性'
        },
        meta: {
          analysis_id: 'uuid-test-123',
          timestamp: '2025-07-11T10:00:00Z',
          processing_time_ms: 15000
        }
      }
    };

    it('应该成功调用AI分析API并返回结果', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse,
      } as Response);

      const result = await client.analyzeContent(mockRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/analysis/three-stage',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(mockRequest),
          signal: expect.any(AbortSignal),
        })
      );

      expect(result).toEqual(mockSuccessResponse);
    });

    it('应该处理API返回的业务错误', async () => {
      const mockErrorResponse = {
        code: 4001,
        message: '分析源不存在',
        data: null
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockErrorResponse,
      } as Response);

      await expect(client.analyzeContent(mockRequest)).rejects.toThrow('AI分析失败: 分析源不存在');
    });

    it('应该处理HTTP错误状态', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Source not found',
      } as Response);

      await expect(client.analyzeContent(mockRequest)).rejects.toThrow('AI分析服务暂时不可用');
    });

    it('应该处理网络错误', async () => {
      mockFetch.mockRejectedValueOnce(new Error('fetch failed'));

      await expect(client.analyzeContent(mockRequest)).rejects.toThrow('网络连接失败，请检查AI服务是否运行');
    });

    it('应该处理超时错误', async () => {
      const timeoutError = new Error('Timeout');
      timeoutError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(timeoutError);

      await expect(client.analyzeContent(mockRequest)).rejects.toThrow('分析请求超时，请检查网络连接或稍后重试');
    });

    it('应该处理无效的JSON响应', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => { throw new Error('Invalid JSON'); },
      } as Response);

      await expect(client.analyzeContent(mockRequest)).rejects.toThrow();
    });

    it('应该在请求中包含正确的超时设置', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse,
      } as Response);

      await client.analyzeContent(mockRequest);

      const [, options] = mockFetch.mock.calls[0];
      expect(options?.signal).toBeInstanceOf(AbortSignal);
    });

    it('应该验证响应数据格式', async () => {
      const invalidResponse = {
        code: 0,
        message: '分析完成',
        data: {
          trust_hook: {
            // 缺少hook_copy字段
            credibility_testimony: '测试',
            authority_signals: []
          },
          empathy_anchor: {
            pain_point: '测试',
            target_audience: '测试',
            emotional_triggers: []
          },
          value_map: {
            core_value: '测试',
            value_delivery: [],
            competitive_advantage: '测试'
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => invalidResponse,
      } as Response);

      await expect(client.analyzeContent(mockRequest)).rejects.toThrow('响应缺少trust_hook.hook_copy字段');
    });
  });

  describe('healthCheck', () => {
    it('应该成功检查AI服务健康状态', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response);

      const result = await client.healthCheck();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/health',
        expect.objectContaining({
          method: 'GET',
          signal: expect.any(AbortSignal),
        })
      );

      expect(result).toBe(true);
    });

    it('应该在AI服务不可用时返回false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      } as Response);

      const result = await client.healthCheck();
      expect(result).toBe(false);
    });

    it('应该在网络错误时返回false', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.healthCheck();
      expect(result).toBe(false);
    });
  });

  describe('构造函数和配置', () => {
    it('应该使用默认配置', () => {
      const defaultClient = new AIAnalysisClient();
      expect(defaultClient).toBeInstanceOf(AIAnalysisClient);
    });

    it('应该使用自定义配置', () => {
      const customConfig = {
        baseUrl: 'http://custom-url:8080',
        timeout: 5000,
        retryAttempts: 2,
        retryDelay: 500
      };
      const customClient = new AIAnalysisClient(customConfig);
      
      expect(customClient.getConfig()).toMatchObject(customConfig);
    });

    it('应该支持更新配置', () => {
      const newConfig = { timeout: 15000 };
      client.updateConfig(newConfig);
      
      expect(client.getConfig().timeout).toBe(15000);
    });
  });

  describe('重试机制', () => {
    beforeEach(() => {
      // 模拟较快的重试
      client.updateConfig({ retryDelay: 0 });
    });

    it('应该在网络错误时重试', async () => {
      // 第一次失败，第二次成功
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockSuccessResponse,
        } as Response);

      const result = await client.analyzeContent(mockRequest);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('应该在多次重试失败后抛出错误', async () => {
      // 连续3次失败
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      await expect(client.analyzeContent(mockRequest)).rejects.toThrow('网络连接失败，请检查AI服务是否运行');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('不应该在业务错误时重试', async () => {
      const mockErrorResponse = {
        code: 4001,
        message: '分析源不存在',
        data: null
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockErrorResponse,
      } as Response);

      await expect(client.analyzeContent(mockRequest)).rejects.toThrow('AI分析失败: 分析源不存在');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getServiceInfo', () => {
    it('应该成功获取服务信息', async () => {
      const mockServiceInfo = {
        version: '1.0.0',
        status: 'healthy'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockServiceInfo,
      } as Response);

      const result = await client.getServiceInfo();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/info',
        expect.objectContaining({
          method: 'GET',
          signal: expect.any(AbortSignal),
        })
      );

      expect(result).toEqual(mockServiceInfo);
    });

    it('应该在服务不可用时返回null', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      } as Response);

      const result = await client.getServiceInfo();
      expect(result).toBeNull();
    });

    it('应该在网络错误时返回null', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.getServiceInfo();
      expect(result).toBeNull();
    });
  });
});