'use client'

// 简化的文件上传Demo页面

import { useState, useRef } from 'react'
import { useSimpleFileUpload } from '@/hooks/use-simple-file-upload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, File, X, RefreshCw, Check, AlertCircle } from 'lucide-react'

export default function UploadDemoPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const {
    isUploading,
    error,
    result,
    uploadFile,
    reset
  } = useSimpleFileUpload({
    onSuccess: (uploadResult) => {
      console.log('Upload success:', uploadResult)
    },
    onError: (uploadError) => {
      console.error('Upload error:', uploadError)
    }
  })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    
    try {
      reset()
      await uploadFile(selectedFile)
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }

  const handleReset = () => {
    reset()
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">简化文件上传 Demo</h1>
        <p className="text-gray-600">
          测试简化的文件上传功能，直接使用putObject接口，无进度显示
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 文件选择区域 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              文件上传
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-sm text-gray-600 mb-4">
                选择视频或音频文件进行上传
              </p>
              <Input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/mov,audio/mp3,audio/wav,audio/m4a"
                onChange={handleFileSelect}
                className="mb-4"
              />
              <p className="text-xs text-gray-500">
                支持的格式：MP4, MOV, MP3, WAV, M4A <br />
                最大文件大小：100MB
              </p>
            </div>

            {selectedFile && (
              <div className="space-y-2">
                <h4 className="font-semibold">已选择文件：</h4>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <File className="h-4 w-4" />
                    <span className="text-sm">{selectedFile.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {formatFileSize(selectedFile.size)}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="flex-1"
              >
                {isUploading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                {isUploading ? '上传中...' : '开始上传'}
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                重置
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 上传状态区域 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              上传状态
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                  <span className="text-sm text-blue-800">正在上传文件...</span>
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>上传失败：</strong> {error}
                </AlertDescription>
              </Alert>
            )}

            {result && (
              <Alert>
                <Check className="h-4 w-4" />
                <AlertDescription>
                  <strong>上传成功！</strong>
                  <div className="mt-2 text-sm space-y-1">
                    <p>文件ID：{result.mediaFileId}</p>
                    <p>原文件名：{result.originalFilename}</p>
                    <p>文件大小：{formatFileSize(result.fileSize || 0)}</p>
                    {result.cosUrl && (
                      <p>访问链接：
                        <a 
                          href={result.cosUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline ml-1"
                        >
                          查看文件
                        </a>
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {!error && !result && !isUploading && (
              <div className="text-center text-gray-500 py-8">
                <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>请选择文件并点击上传</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 技术说明 */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>技术说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">简化功能</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• 直接使用COS putObject接口</li>
                <li>• 无进度监控，简化上传流程</li>
                <li>• 统一错误处理</li>
                <li>• 单文件上传模式</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">技术架构</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• 前端：简化的React Hook</li>
                <li>• 后端：统一的上传API</li>
                <li>• 存储：腾讯云COS直传</li>
                <li>• 数据库：PostgreSQL + Prisma</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}