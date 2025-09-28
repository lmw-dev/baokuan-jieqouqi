"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { useInstantUpload } from '@/hooks/use-instant-upload'

export default function TestUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadResult, setUploadResult] = useState<any>(null)

  const { uploadFile, isUploading, progress, error, supportsInstantUpload } = useInstantUpload({
    onSuccess: (result) => {
      console.log('=== Upload Success ===', result)
      setUploadResult(result)
      
      // 模拟跳转到分析页面
      if (result.mediaFileId) {
        console.log('=== Would redirect to:', `/analysis?mediaFileId=${result.mediaFileId}`)
        // 实际跳转（取消注释以启用）
        // window.location.href = `/analysis?mediaFileId=${result.mediaFileId}`
      }
    },
    onError: (error) => {
      console.error('=== Upload Error ===', error)
    }
  })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setSelectedFile(file || null)
    setUploadResult(null)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    
    console.log('=== Starting upload ===', selectedFile.name)
    await uploadFile(selectedFile)
  }

  const testAnalysisAPI = async (mediaFileId: string) => {
    try {
      console.log('=== Testing analysis API with mediaFileId:', mediaFileId)
      
      const response = await fetch('/api/analyze/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mediaFileId: mediaFileId,
          analysisType: 'full'
        })
      })

      const result = await response.json()
      console.log('=== Analysis API result:', result)
      alert(`分析API结果: ${JSON.stringify(result, null, 2)}`)
      
    } catch (error) {
      console.error('=== Analysis API error:', error)
      alert(`分析API错误: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>文件上传测试 {supportsInstantUpload ? '(支持秒传)' : '(不支持哈希计算)'}</CardTitle>
          <CardDescription>测试完整的文件上传和分析流程，包括基于哈希的秒传功能</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">选择文件:</label>
            <Input
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="w-full"
            />
          </div>
          
          {selectedFile && (
            <div className="p-4 bg-gray-50 rounded">
              <p><strong>文件名:</strong> {selectedFile.name}</p>
              <p><strong>大小:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              <p><strong>类型:</strong> {selectedFile.type}</p>
            </div>
          )}
          
          {isUploading && progress && (
            <div className="space-y-2">
              <p>当前阶段: {progress.stage === 'hash' ? '计算文件指纹' : progress.stage === 'upload' ? '上传文件' : progress.stage === 'completed' ? '完成' : '错误'}</p>
              <p>进度: {progress.progress}%</p>
              <p>状态: {progress.message}</p>
              <Progress value={progress.progress} className="w-full" />
            </div>
          )}
          
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
              <p><strong>错误:</strong> {error}</p>
            </div>
          )}
          
          <Button 
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="w-full"
          >
            {isUploading ? '上传中...' : '开始上传'}
          </Button>
        </CardContent>
      </Card>

      {uploadResult && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>上传结果</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded">
              <p><strong>✅ {uploadResult.isInstantUpload ? '秒传成功!' : '上传成功!'}</strong></p>
              <p><strong>MediaFile ID:</strong> {uploadResult.mediaFileId}</p>
              <p><strong>COS URL:</strong> {uploadResult.cosUrl}</p>
              {uploadResult.isInstantUpload && (
                <p><strong>🚀 秒传:</strong> 文件已存在，直接复用</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Button 
                onClick={() => window.open(`/analysis?mediaFileId=${uploadResult.mediaFileId}`, '_blank')}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                🔗 打开分析页面
              </Button>
              
              <Button 
                onClick={() => testAnalysisAPI(uploadResult.mediaFileId)}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                🧪 测试分析API
              </Button>
            </div>
            
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(uploadResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}