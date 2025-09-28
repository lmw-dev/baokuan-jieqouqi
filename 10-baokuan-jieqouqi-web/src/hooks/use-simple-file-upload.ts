// 简化的文件上传Hook - 无进度监控，只有状态切换
import { useState, useCallback } from 'react'
import { simpleFileUploadService, SimpleUploadResult } from '@/lib/simple-upload-service'

interface UseSimpleFileUploadOptions {
  onSuccess?: (result: SimpleUploadResult) => void
  onError?: (error: string) => void
}

export function useSimpleFileUpload(options?: UseSimpleFileUploadOptions) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SimpleUploadResult | null>(null)

  const uploadFile = useCallback(async (file: File): Promise<SimpleUploadResult> => {
    try {
      setIsUploading(true)
      setError(null)
      setResult(null)
      
      const uploadResult = await simpleFileUploadService.uploadFile(file)
      
      if (uploadResult.success) {
        setResult(uploadResult)
        options?.onSuccess?.(uploadResult)
      } else {
        setError(uploadResult.error || '上传失败')
        options?.onError?.(uploadResult.error || '上传失败')
      }
      
      return uploadResult
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上传失败'
      setError(errorMessage)
      options?.onError?.(errorMessage)
      
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      setIsUploading(false)
    }
  }, [options])

  const reset = useCallback(() => {
    setIsUploading(false)
    setError(null)
    setResult(null)
  }, [])

  return {
    isUploading,
    error,
    result,
    uploadFile,
    reset
  }
}