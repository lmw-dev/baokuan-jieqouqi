"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Search, Filter, FileText, Calendar, User, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { ScriptDetail, ScriptStatus } from "@/types/script"

export default function ScriptListPage() {
  const [scripts, setScripts] = useState<ScriptDetail[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<ScriptStatus | "all">("all")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 加载脚本列表
  const loadScripts = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      console.log('🔄 开始加载脚本列表...')
      
      const response = await fetch('/api/v1/scripts')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      console.log('✅ 脚本列表加载成功:', result)
      
      if (result.code === 0 && result.data) {
        // 如果是分页响应
        if (Array.isArray(result.data)) {
          setScripts(result.data)
        } else if (result.data.items && Array.isArray(result.data.items)) {
          setScripts(result.data.items)
        } else {
          console.warn('⚠️ 意外的数据格式:', result.data)
          setScripts([])
        }
      } else {
        console.warn('⚠️ API返回非成功状态:', result)
        setScripts([])
      }
    } catch (error) {
      console.error('❌ 加载脚本列表失败:', error)
      setError(error instanceof Error ? error.message : '加载失败')
      setScripts([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadScripts()
  }, [])

  // 获取状态徽章样式
  const getStatusBadge = (status: ScriptStatus) => {
    const statusConfig = {
      draft: { label: '草稿', className: 'bg-yellow-100 text-yellow-700' },
      published: { label: '已发布', className: 'bg-green-100 text-green-700' },
      archived: { label: '已归档', className: 'bg-gray-100 text-gray-700' },
    }
    
    const config = statusConfig[status] || statusConfig.draft
    return (
      <Badge variant="secondary" className={config.className}>
        {config.label}
      </Badge>
    )
  }

  // 过滤脚本列表
  const filteredScripts = scripts.filter(script => {
    const matchesSearch = script.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || script.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">脚本管理</h1>
              <p className="text-gray-600 mt-1">管理您的所有脚本创作框架</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={loadScripts}
                disabled={isLoading}
                className="flex items-center"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                刷新
              </Button>
              <Link href="/analysis">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  创建新脚本
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* 搜索和过滤 */}
          <div className="flex items-center space-x-4 mb-8">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索脚本标题..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="draft">草稿</SelectItem>
                <SelectItem value="published">已发布</SelectItem>
                <SelectItem value="archived">已归档</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 脚本列表 */}
          {isLoading ? (
            <Card className="text-center py-12">
              <CardContent>
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  正在加载脚本列表...
                </h3>
                <p className="text-gray-500">
                  请稍候，我们正在获取您的脚本数据
                </p>
              </CardContent>
            </Card>
          ) : error ? (
            <Card className="text-center py-12 border-red-200 bg-red-50">
              <CardContent>
                <div className="text-red-500 text-xl mb-4">⚠️</div>
                <h3 className="text-lg font-medium text-red-900 mb-2">
                  加载失败
                </h3>
                <p className="text-red-700 mb-4">
                  {error}
                </p>
                <Button onClick={loadScripts} variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
                  重新加载
                </Button>
              </CardContent>
            </Card>
          ) : filteredScripts.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {scripts.length === 0 ? "还没有脚本" : "没有找到匹配的脚本"}
                </h3>
                <p className="text-gray-500 mb-6">
                  {scripts.length === 0 
                    ? "开始分析视频内容，生成您的第一个脚本框架"
                    : "尝试调整搜索条件或状态过滤器"
                  }
                </p>
                <Link href="/analysis">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    创建第一个脚本
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredScripts.map((script) => (
                <Link key={script.id} href={`/script/${script.id}`}>
                  <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-indigo-200">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <CardTitle className="text-lg line-clamp-2">
                            {script.title}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {script.metadata.totalSections} 个段落
                          </CardDescription>
                        </div>
                        {getStatusBadge(script.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {/* 脚本预览 */}
                        <div className="text-sm text-gray-600 line-clamp-2">
                          {script.sections[0]?.content || "暂无内容"}
                        </div>
                        
                        {/* 元信息 */}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(script.updatedAt).toLocaleDateString()}
                            </div>
                            <div className="flex items-center">
                              <User className="h-3 w-3 mr-1" />
                              {script.metadata.creatorId.slice(0, 8)}...
                            </div>
                          </div>
                          <div className="text-indigo-600 font-medium">
                            查看详情 →
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}