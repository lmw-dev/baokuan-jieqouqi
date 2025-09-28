/**
 * TOM-218: useScript Hook测试
 */

import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { useScript, useScriptGeneration } from '../useScript'
import { ScriptDetail, ScriptStatus, SectionType, ImportanceLevel } from '@/types/script'

// Mock Toast
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

// Mock Script API
const mockScriptApi = {
  getScript: jest.fn(),
  updateScript: jest.fn(),
  generateScript: jest.fn(),
  exportScript: jest.fn(),
  copyScript: jest.fn(),
  deleteScript: jest.fn(),
}

jest.mock('@/lib/script-api', () => ({
  default: mockScriptApi,
  ScriptAPIError: class extends Error {
    constructor(message: string, public code: number) {
      super(message)
      this.name = 'ScriptAPIError'
    }
  },
}))

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

describe('useScript', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('脚本加载', () => {
    it('应该在组件挂载时加载脚本', async () => {
      mockScriptApi.getScript.mockResolvedValue(mockScript)

      const { result } = renderHook(() => useScript('test-script-1'))

      expect(result.current.loadingState.isLoading).toBe(true)
      expect(mockScriptApi.getScript).toHaveBeenCalledWith('test-script-1')

      await waitFor(() => {
        expect(result.current.loadingState.isLoading).toBe(false)
        expect(result.current.script).toEqual(mockScript)
      })
    })

    it('加载失败时应该设置错误状态', async () => {
      const error = new Error('加载失败')
      mockScriptApi.getScript.mockRejectedValue(error)

      const { result } = renderHook(() => useScript('test-script-1'))

      await waitFor(() => {
        expect(result.current.loadingState.isLoading).toBe(false)
        expect(result.current.loadingState.error).toBe('加载脚本失败，请稍后重试')
      })
    })
  })

  describe('脚本更新', () => {
    it('应该能够更新脚本', async () => {
      const updatedScript = { ...mockScript, title: '更新后的标题' }
      mockScriptApi.getScript.mockResolvedValue(mockScript)
      mockScriptApi.updateScript.mockResolvedValue(updatedScript)

      const { result } = renderHook(() => useScript('test-script-1'))

      // 等待初始加载完成
      await waitFor(() => {
        expect(result.current.script).toEqual(mockScript)
      })

      // 执行更新
      const updateData = { title: '更新后的标题' }
      await act(async () => {
        await result.current.updateScript(updateData)
      })

      expect(result.current.editorState.hasUnsavedChanges).toBe(true)
    })

    it('应该支持自动保存', async () => {
      mockScriptApi.getScript.mockResolvedValue(mockScript)
      mockScriptApi.updateScript.mockResolvedValue(mockScript)

      const { result } = renderHook(() => useScript('test-script-1', 100)) // 100ms自动保存

      // 等待初始加载完成
      await waitFor(() => {
        expect(result.current.script).toEqual(mockScript)
      })

      // 触发更新
      await act(async () => {
        await result.current.updateScript({ title: '新标题' })
      })

      // 等待自动保存触发
      await waitFor(() => {
        expect(mockScriptApi.updateScript).toHaveBeenCalledWith(
          'test-script-1',
          { title: '新标题' }
        )
      }, { timeout: 1000 })
    })
  })

  describe('脚本导出', () => {
    it('应该能够导出脚本', async () => {
      const mockBlob = new Blob(['脚本内容'], { type: 'text/plain' })
      mockScriptApi.getScript.mockResolvedValue(mockScript)
      mockScriptApi.exportScript.mockResolvedValue(mockBlob)

      // Mock URL.createObjectURL
      global.URL.createObjectURL = vi.fn(() => 'mock-url')
      global.URL.revokeObjectURL = jest.fn()

      const { result } = renderHook(() => useScript('test-script-1'))

      // 等待初始加载完成
      await waitFor(() => {
        expect(result.current.script).toEqual(mockScript)
      })

      // 执行导出
      await act(async () => {
        await result.current.exportScript('txt')
      })

      expect(mockScriptApi.exportScript).toHaveBeenCalledWith(
        'test-script-1',
        'txt',
        true,
        true
      )
    })
  })

  describe('脚本复制', () => {
    it('应该能够复制脚本内容', async () => {
      mockScriptApi.getScript.mockResolvedValue(mockScript)
      mockScriptApi.copyScript.mockResolvedValue('复制的内容')

      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined),
        },
      })

      const { result } = renderHook(() => useScript('test-script-1'))

      // 等待初始加载完成
      await waitFor(() => {
        expect(result.current.script).toEqual(mockScript)
      })

      // 执行复制
      let copyResult: string
      await act(async () => {
        copyResult = await result.current.copyScript('txt')
      })

      expect(mockScriptApi.copyScript).toHaveBeenCalledWith('test-script-1', 'txt')
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('复制的内容')
    })
  })

  describe('编辑状态管理', () => {
    it('应该能够切换编辑模式', async () => {
      mockScriptApi.getScript.mockResolvedValue(mockScript)

      const { result } = renderHook(() => useScript('test-script-1'))

      expect(result.current.editorState.isEditing).toBe(false)

      act(() => {
        result.current.toggleEditMode()
      })

      expect(result.current.editorState.isEditing).toBe(true)
    })
  })
})

describe('useScriptGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该能够生成新脚本', async () => {
    mockScriptApi.generateScript.mockResolvedValue(mockScript)

    const { result } = renderHook(() => useScriptGeneration())

    expect(result.current.isGenerating).toBe(false)

    let generatedScript: ScriptDetail
    await act(async () => {
      generatedScript = await result.current.generateScript('test-card-1')
    })

    expect(mockScriptApi.generateScript).toHaveBeenCalledWith('test-card-1', undefined)
    expect(generatedScript).toEqual(mockScript)
  })

  it('生成失败时应该设置错误状态', async () => {
    const error = new Error('生成失败')
    mockScriptApi.generateScript.mockRejectedValue(error)

    const { result } = renderHook(() => useScriptGeneration())

    await act(async () => {
      try {
        await result.current.generateScript('test-card-1')
      } catch (e) {
        // 预期会抛出错误
      }
    })

    expect(result.current.error).toBe('脚本生成失败，请稍后重试')
    expect(result.current.isGenerating).toBe(false)
  })
})