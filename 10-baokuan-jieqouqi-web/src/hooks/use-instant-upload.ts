// 增强的文件上传Hook - 支持基于哈希的秒传功能
import { useState, useCallback } from 'react'
import { calculateFileHash, isHashCalculationSupported, type HashProgress } from '@/lib/file-hash'

export interface InstantUploadResult {
  success: boolean
  mediaFileId?: string
  originalFilename?: string
  cosUrl?: string
  fileSize?: number
  isInstantUpload?: boolean // 是否为秒传
  message?: string
  error?: string
}

export interface InstantUploadProgress {
  stage: 'hash' | 'upload' | 'completed' | 'error'
  progress: number // 0-100
  message: string
}

interface UseInstantUploadOptions {
  enableHashCalculation?: boolean // 是否启用哈希计算，默认true
  onProgress?: (progress: InstantUploadProgress) => void
  onSuccess?: (result: InstantUploadResult) => void
  onError?: (error: string) => void
}

export function useInstantUpload(options: UseInstantUploadOptions = {}) {
  const {
    enableHashCalculation = true,
    onProgress,
    onSuccess,
    onError
  } = options

  const [isUploading, setIsUploading] = useState(false)
  const [currentProgress, setCurrentProgress] = useState<InstantUploadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<InstantUploadResult | null>(null)

  const updateProgress = useCallback((progress: InstantUploadProgress) => {
    setCurrentProgress(progress)
    onProgress?.(progress)
  }, [onProgress])

  const uploadFile = useCallback(async (file: File): Promise<InstantUploadResult> => {
    try {
      setIsUploading(true)
      setError(null)
      setResult(null)

      let fileHash: string | null = null

      // 阶段1: 计算文件哈希（如果启用且支持）
      if (enableHashCalculation && isHashCalculationSupported()) {
        updateProgress({
          stage: 'hash',
          progress: 0,
          message: '正在计算文件指纹...'
        })

        try {
          fileHash = await calculateFileHash(file, {
            onProgress: (hashProgress: HashProgress) => {
              updateProgress({
                stage: 'hash',
                progress: hashProgress.progress,
                message: `正在计算文件指纹... ${hashProgress.progress}%`
              })
            }
          })
          
          console.log('=== File hash calculated:', fileHash.substring(0, 16) + '...')
        } catch (hashError) {
          console.warn('Hash calculation failed, proceeding without hash:', hashError)
          // 哈希计算失败不影响上传，继续正常流程
        }
      }

      // 阶段2: 上传文件（带哈希值）
      updateProgress({
        stage: 'upload',
        progress: 0,
        message: fileHash ? '检查文件是否已存在...' : '开始上传文件...'
      })

      const formData = new FormData()
      formData.append('file', file)
      if (fileHash) {
        formData.append('fileHash', fileHash)
      }

      const response = await fetch('/api/uploads', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        let errorMessage = '上传失败'
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || `服务器错误 (${response.status})`
        } catch (jsonError) {
          // 如果响应不是JSON格式，尝试获取文本内容
          try {
            const errorText = await response.text()
            errorMessage = `服务器错误 (${response.status}): ${errorText.substring(0, 100)}`
          } catch (textError) {
            errorMessage = `网络错误 (${response.status})`
          }
        }
        throw new Error(errorMessage)
      }

      let uploadResult: any
      try {
        uploadResult = await response.json()
      } catch (jsonError) {
        throw new Error('服务器返回了无效的响应格式')
      }

      if (uploadResult.code !== 0) {
        throw new Error(uploadResult.message)
      }

      const result: InstantUploadResult = {
        success: true,
        mediaFileId: uploadResult.data.mediaFileId,
        originalFilename: uploadResult.data.originalFilename,
        cosUrl: uploadResult.data.cosUrl,
        fileSize: uploadResult.data.fileSize,
        isInstantUpload: uploadResult.data.isInstantUpload || false,
        message: uploadResult.message
      }

      // 阶段3: 完成
      updateProgress({
        stage: 'completed',
        progress: 100,
        message: result.isInstantUpload ? '秒传成功！' : '上传完成！'
      })

      setResult(result)
      onSuccess?.(result)
      
      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上传失败'
      
      updateProgress({
        stage: 'error',
        progress: 0,
        message: errorMessage
      })

      setError(errorMessage)
      onError?.(errorMessage)

      return {
        success: false,
        error: errorMessage
      }
    } finally {
      setIsUploading(false)
    }
  }, [enableHashCalculation, updateProgress, onSuccess, onError])

  const reset = useCallback(() => {
    setIsUploading(false)
    setCurrentProgress(null)
    setError(null)
    setResult(null)
  }, [])

  return {
    isUploading,
    progress: currentProgress,
    error,
    result,
    uploadFile,
    reset,
    // 检查功能支持状态
    supportsInstantUpload: enableHashCalculation && isHashCalculationSupported()
  }
}