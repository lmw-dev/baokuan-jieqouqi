/**
 * TOM-218: Script API Client测试
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { ScriptApiClient, ScriptAPIError } from '../script-api'
import { ScriptDetail, ScriptStatus, SectionType, ImportanceLevel, BusinessCode } from '@/types/script'

// Mock API Client
const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}

jest.mock('@/lib/api-client', () => ({
  default: mockApiClient,
}))

// Mock fetch for export functionality
global.fetch = jest.fn()

// 测试数据
const mockScript: ScriptDetail = {
  id: 'test-script-1',
  cardId: 'test-card-1',
  title: '测试脚本',
  status: ScriptStatus.DRAFT,
  sections: [
    {
      id: 'section-1',
      scriptId: 'test-script-1',
      sectionType: SectionType.HOOK,
      title: '开场钩子',
      content: '测试内容',
      tips: ['提示1'],
      importance: ImportanceLevel.HIGH,
      orderIndex: 1,
      updatedAt: '2023-01-01T00:00:00Z'
    }
  ],
  metadata: {
    totalSections: 1,
    lastUpdated: '2023-01-01T00:00:00Z',
    creatorId: 'test-user'
  },
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z'
}

describe('ScriptApiClient', () => {
  let scriptApi: ScriptApiClient

  beforeEach(() => {
    jest.clearAllMocks()
    scriptApi = new ScriptApiClient()
  })

  describe('generateScript', () => {
    it('应该成功生成脚本', async () => {
      const mockResponse = {
        code: BusinessCode.SUCCESS,
        message: '脚本生成成功',
        data: mockScript
      }
      mockApiClient.post.mockResolvedValue(mockResponse)

      const result = await scriptApi.generateScript('test-card-1', {})

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/v1/cards/test-card-1/generate-script',
        {}
      )
      expect(result).toEqual(mockScript)
    })

    it('API错误时应该抛出ScriptAPIError', async () => {
      const mockResponse = {
        code: BusinessCode.SCRIPT_GENERATION_ERROR,
        message: '脚本生成失败',
        data: null
      }
      mockApiClient.post.mockResolvedValue(mockResponse)

      await expect(scriptApi.generateScript('test-card-1')).rejects.toThrow(
        ScriptAPIError
      )
    })

    it('网络错误时应该抛出ScriptAPIError', async () => {
      mockApiClient.post.mockRejectedValue(new Error('网络错误'))

      await expect(scriptApi.generateScript('test-card-1')).rejects.toThrow(
        ScriptAPIError
      )
    })
  })

  describe('getScript', () => {
    it('应该成功获取脚本详情', async () => {
      const mockResponse = {
        code: BusinessCode.SUCCESS,
        message: '获取成功',
        data: mockScript
      }
      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await scriptApi.getScript('test-script-1')

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/scripts/test-script-1')
      expect(result).toEqual(mockScript)
    })

    it('脚本不存在时应该抛出错误', async () => {
      const mockResponse = {
        code: BusinessCode.NOT_FOUND,
        message: '脚本不存在',
        data: null
      }
      mockApiClient.get.mockResolvedValue(mockResponse)

      await expect(scriptApi.getScript('non-existent')).rejects.toThrow(
        ScriptAPIError
      )
    })
  })

  describe('updateScript', () => {
    it('应该成功更新脚本', async () => {
      const updateData = { title: '新标题' }
      const updatedScript = { ...mockScript, title: '新标题' }
      const mockResponse = {
        code: BusinessCode.SUCCESS,
        message: '更新成功',
        data: updatedScript
      }
      mockApiClient.put.mockResolvedValue(mockResponse)

      const result = await scriptApi.updateScript('test-script-1', updateData)

      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/api/v1/scripts/test-script-1',
        updateData
      )
      expect(result).toEqual(updatedScript)
    })
  })

  describe('deleteScript', () => {
    it('应该成功删除脚本', async () => {
      const mockResponse = {
        code: BusinessCode.SUCCESS,
        message: '删除成功',
        data: { scriptId: 'test-script-1' }
      }
      mockApiClient.delete.mockResolvedValue(mockResponse)

      const result = await scriptApi.deleteScript('test-script-1')

      expect(mockApiClient.delete).toHaveBeenCalledWith('/api/v1/scripts/test-script-1')
      expect(result).toEqual({ scriptId: 'test-script-1' })
    })
  })

  describe('exportScript', () => {
    it('应该成功导出脚本', async () => {
      const mockBlob = new Blob(['脚本内容'], { type: 'text/plain' })
      const mockResponse = {
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const result = await scriptApi.exportScript('test-script-1', 'txt', true, true)

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/scripts/test-script-1/export?format=txt&include_metadata=true&include_tips=true',
        expect.objectContaining({
          method: 'GET'
        })
      )
      expect(result).toEqual(mockBlob)
    })

    it('导出失败时应该抛出错误', async () => {
      const mockResponse = {
        ok: false,
        statusText: '导出失败'
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      await expect(
        scriptApi.exportScript('test-script-1', 'txt')
      ).rejects.toThrow(ScriptAPIError)
    })
  })

  describe('copyScript', () => {
    it('应该成功复制脚本内容', async () => {
      const mockResponse = {
        code: BusinessCode.SUCCESS,
        message: '复制成功',
        data: { content: '复制的内容', format: 'txt' }
      }
      mockApiClient.post.mockResolvedValue(mockResponse)

      const result = await scriptApi.copyScript('test-script-1', 'txt')

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/v1/scripts/test-script-1/copy?format=txt',
        {}
      )
      expect(result).toBe('复制的内容')
    })
  })

  describe('checkScriptHealth', () => {
    it('应该成功检查脚本健康状态', async () => {
      const mockResponse = {
        code: BusinessCode.SUCCESS,
        message: '健康检查成功',
        data: {
          scriptId: 'test-script-1',
          accessible: true,
          title: '测试脚本',
          status: 'draft'
        }
      }
      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await scriptApi.checkScriptHealth('test-script-1')

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/scripts/test-script-1/health')
      expect(result).toEqual({
        scriptId: 'test-script-1',
        accessible: true,
        title: '测试脚本',
        status: 'draft'
      })
    })

    it('健康检查失败时应该返回不可访问状态', async () => {
      mockApiClient.get.mockRejectedValue(new Error('健康检查失败'))

      const result = await scriptApi.checkScriptHealth('test-script-1')

      expect(result).toEqual({
        scriptId: 'test-script-1',
        accessible: false
      })
    })
  })

  describe('batchCheckHealth', () => {
    it('应该批量检查多个脚本的健康状态', async () => {
      const scriptIds = ['script-1', 'script-2', 'script-3']
      
      // Mock不同的响应
      mockApiClient.get
        .mockResolvedValueOnce({
          code: BusinessCode.SUCCESS,
          data: { scriptId: 'script-1', accessible: true }
        })
        .mockResolvedValueOnce({
          code: BusinessCode.SUCCESS,
          data: { scriptId: 'script-2', accessible: true }
        })
        .mockRejectedValueOnce(new Error('失败'))

      const results = await scriptApi.batchCheckHealth(scriptIds)

      expect(results).toHaveLength(3)
      expect(results[0]).toEqual({ scriptId: 'script-1', accessible: true })
      expect(results[1]).toEqual({ scriptId: 'script-2', accessible: true })
      expect(results[2]).toEqual({ scriptId: 'script-3', accessible: false })
    })
  })
})

describe('ScriptAPIError', () => {
  it('应该正确创建错误实例', () => {
    const error = new ScriptAPIError('测试错误', BusinessCode.NOT_FOUND, { extra: 'data' })

    expect(error.message).toBe('测试错误')
    expect(error.code).toBe(BusinessCode.NOT_FOUND)
    expect(error.originalError).toEqual({ extra: 'data' })
    expect(error.name).toBe('ScriptAPIError')
  })
})