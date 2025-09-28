// 简化的文件上传服务 - 直接使用putObject，无进度监控
export interface SimpleUploadResult {
  success: boolean
  mediaFileId?: string
  originalFilename?: string
  cosUrl?: string
  fileSize?: number
  error?: string
}

export class SimpleFileUploadService {
  
  async uploadFile(file: File): Promise<SimpleUploadResult> {
    try {
      console.log('=== Simple upload start:', file.name)
      
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/uploads', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        return {
          success: false,
          error: errorData.message || '上传失败'
        }
      }
      
      const result = await response.json()
      
      if (result.code !== 0) {
        return {
          success: false,
          error: result.message
        }
      }
      
      return {
        success: true,
        mediaFileId: result.data.mediaFileId,
        originalFilename: result.data.originalFilename,
        cosUrl: result.data.cosUrl,
        fileSize: result.data.fileSize
      }
      
    } catch (error) {
      console.error('Upload error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '网络错误'
      }
    }
  }
}

// 导出单例
export const simpleFileUploadService = new SimpleFileUploadService()