// 分析错误状态组件
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'

interface AnalysisErrorProps {
  errorCode: number
  errorMessage: string
  fileName: string
  fileSize: number
  onRetry: () => void
}

export function AnalysisError({ 
  errorCode, 
  errorMessage, 
  fileName, 
  fileSize, 
  onRetry 
}: AnalysisErrorProps) {
  const getErrorIcon = () => {
    switch (errorCode) {
      case 5001: // 服务不可用
        return "🚧"
      case 5002: // 超时
        return "⏱️"
      case 5003: // 文件处理失败
        return "📄"
      default:
        return "😔"
    }
  }

  const getErrorTitle = () => {
    switch (errorCode) {
      case 5001:
        return "分析服务暂时不可用"
      case 5002:
        return "分析超时"
      case 5003:
        return "文件处理失败"
      default:
        return "分析暂时无法完成"
    }
  }

  const showRetryButton = errorCode === 5001 || errorCode === 5002

  return (
    <div className="space-y-6">
      {/* 文件信息 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <span className="text-lg">📁</span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">文件信息</h3>
              <p className="text-sm text-gray-600">
                文件名: {fileName} | 大小: {(fileSize / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 错误信息 */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            {/* 错误图标 */}
            <div className="text-6xl">
              {getErrorIcon()}
            </div>
            
            {/* 错误标题 */}
            <h2 className="text-xl font-semibold text-gray-900">
              {getErrorTitle()}
            </h2>
            
            {/* 错误描述 */}
            <p className="text-gray-600 max-w-md mx-auto">
              {errorMessage}
            </p>
            
            {/* 操作按钮 */}
            <div className="flex gap-3 justify-center pt-4">
              {showRetryButton && (
                <Button onClick={onRetry} className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  重新分析
                </Button>
              )}
              
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/'}
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                返回首页
              </Button>
            </div>
            
            {/* 提示信息 */}
            {errorCode === 5001 && (
              <p className="text-xs text-gray-500 mt-4">
                如果问题持续，请联系客服或稍后再试
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}