/**
 * TOM-218: 脚本管理自定义Hook
 * 提供完整的脚本状态管理和API集成
 */

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/components/ui/use-toast'
import scriptApi, { ScriptAPIError } from '@/lib/script-api'
import {
  ScriptDetail,
  ScriptLoadingState,
  ScriptEditorState,
  ScriptUpdateRequest,
  ExportFormat,
  UseScriptReturn,
  UseScriptGenerationReturn,
  ScriptCreateRequest,
  BusinessCode
} from '@/types/script'

/**
 * 脚本管理Hook
 * @param scriptId 脚本ID
 * @param autoSaveDelay 自动保存延迟（毫秒）
 */
export function useScript(
  scriptId: string, 
  autoSaveDelay: number = 3000
): UseScriptReturn {
  // 状态管理
  const [script, setScript] = useState<ScriptDetail | null>(null)
  const [loadingState, setLoadingState] = useState<ScriptLoadingState>({
    isLoading: true,
    isGenerating: false,
    isSaving: false,
    isExporting: false,
  })
  const [editorState, setEditorState] = useState<ScriptEditorState>({
    isEditing: false,
    hasUnsavedChanges: false,
    autoSaveEnabled: true,
  })

  // Toast通知
  const { toast } = useToast()

  // 自动保存定时器
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null)
  const [pendingUpdates, setPendingUpdates] = useState<ScriptUpdateRequest | null>(null)

  // 加载脚本数据
  const loadScript = useCallback(async () => {
    try {
      setLoadingState(prev => ({ ...prev, isLoading: true, error: undefined }))
      const scriptData = await scriptApi.getScript(scriptId)
      setScript(scriptData)
    } catch (error) {
      const errorMessage = error instanceof ScriptAPIError 
        ? error.message 
        : '加载脚本失败，请稍后重试'
      setLoadingState(prev => ({ ...prev, error: errorMessage }))
    } finally {
      setLoadingState(prev => ({ ...prev, isLoading: false }))
    }
  }, [scriptId])

  // 保存脚本
  const saveScript = useCallback(async (updates?: ScriptUpdateRequest) => {
    if (!script) return

    const updatesToSave = updates || pendingUpdates
    if (!updatesToSave) return

    try {
      setLoadingState(prev => ({ ...prev, isSaving: true, error: undefined }))
      const updatedScript = await scriptApi.updateScript(scriptId, updatesToSave)
      setScript(updatedScript)
      setPendingUpdates(null)
      setEditorState(prev => ({ 
        ...prev, 
        hasUnsavedChanges: false,
        lastSaveTime: new Date()
      }))
      
      // 显示保存成功提示
      toast({
        title: "保存成功",
        description: "脚本内容已保存",
      })
    } catch (error) {
      const errorMessage = error instanceof ScriptAPIError 
        ? error.message 
        : '保存失败，请稍后重试'
      setLoadingState(prev => ({ ...prev, error: errorMessage }))
      throw error
    } finally {
      setLoadingState(prev => ({ ...prev, isSaving: false }))
    }
  }, [script, scriptId, pendingUpdates])

  // 更新脚本（带自动保存）
  const updateScript = useCallback(async (updates: ScriptUpdateRequest) => {
    setPendingUpdates(updates)
    setEditorState(prev => ({ ...prev, hasUnsavedChanges: true }))

    // 清除之前的自动保存定时器
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer)
    }

    // 如果启用自动保存，设置新的定时器
    if (editorState.autoSaveEnabled) {
      const timer = setTimeout(() => {
        saveScript(updates).catch(console.error)
      }, autoSaveDelay)
      setAutoSaveTimer(timer)
    }
  }, [autoSaveTimer, editorState.autoSaveEnabled, autoSaveDelay, saveScript])

  // 导出脚本
  const exportScript = useCallback(async (format: ExportFormat) => {
    if (!script) return

    try {
      setLoadingState(prev => ({ ...prev, isExporting: true }))
      const blob = await scriptApi.exportScript(scriptId, format, true, true)
      
      // 创建下载链接
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${script.title}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      const errorMessage = error instanceof ScriptAPIError 
        ? error.message 
        : '导出失败，请稍后重试'
      setLoadingState(prev => ({ ...prev, error: errorMessage }))
      throw error
    } finally {
      setLoadingState(prev => ({ ...prev, isExporting: false }))
    }
  }, [script, scriptId])

  // 复制脚本
  const copyScript = useCallback(async (format: ExportFormat = ExportFormat.TXT): Promise<string> => {
    try {
      const content = await scriptApi.copyScript(scriptId, format)
      await navigator.clipboard.writeText(content)
      return content
    } catch (error) {
      const errorMessage = error instanceof ScriptAPIError 
        ? error.message 
        : '复制失败，请稍后重试'
      setLoadingState(prev => ({ ...prev, error: errorMessage }))
      throw error
    }
  }, [scriptId])

  // 删除脚本
  const deleteScript = useCallback(async () => {
    try {
      await scriptApi.deleteScript(scriptId)
    } catch (error) {
      const errorMessage = error instanceof ScriptAPIError 
        ? error.message 
        : '删除失败，请稍后重试'
      setLoadingState(prev => ({ ...prev, error: errorMessage }))
      throw error
    }
  }, [scriptId])

  // 切换编辑模式
  const toggleEditMode = useCallback(() => {
    setEditorState(prev => ({ ...prev, isEditing: !prev.isEditing }))
  }, [])

  // 刷新脚本数据
  const refresh = useCallback(() => {
    return loadScript()
  }, [loadScript])

  // 组件挂载时加载数据
  useEffect(() => {
    loadScript()
  }, [loadScript])

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer)
      }
    }
  }, [autoSaveTimer])

  return {
    script,
    loadingState,
    editorState,
    updateScript,
    saveScript: () => saveScript(),
    exportScript,
    copyScript,
    deleteScript,
    toggleEditMode,
    refresh,
  }
}

/**
 * 脚本生成Hook
 */
export function useScriptGeneration(): UseScriptGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string>()

  const generateScript = useCallback(async (
    cardId: string, 
    config?: ScriptCreateRequest
  ): Promise<ScriptDetail> => {
    try {
      setIsGenerating(true)
      setError(undefined)
      const script = await scriptApi.generateScript(cardId, config)
      return script
    } catch (error) {
      const errorMessage = error instanceof ScriptAPIError 
        ? error.message 
        : '脚本生成失败，请稍后重试'
      setError(errorMessage)
      throw error
    } finally {
      setIsGenerating(false)
    }
  }, [])

  return {
    generateScript,
    isGenerating,
    error,
  }
}