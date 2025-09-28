"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, Copy, Download, Edit3, Sparkles, AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

import { ExportFormat, ScriptStatus } from "@/types/script"
import { ScriptEditor } from "@/components/script/ScriptEditor"
import { useScript } from "@/hooks/useScript"

export function ScriptDetailClient({ scriptId }: { scriptId: string }) {
  const router = useRouter()

  // 使用自定义Hook管理脚本状态
  const {
    script,
    loadingState,
    editorState,
    updateScript,
    saveScript,
    exportScript,
    copyScript,
    toggleEditMode,
    refresh,
  } = useScript(scriptId)

  // 获取状态徽章
  const getStatusBadge = (status: ScriptStatus) => {
    const statusConfig = {
      draft: { label: "草稿", variant: "secondary" as const },
      published: { label: "已发布", variant: "default" as const },
      archived: { label: "已归档", variant: "outline" as const },
    }
    return statusConfig[status] || statusConfig.draft
  }

  // 处理导出操作
  const handleExport = async (format: ExportFormat) => {
    try {
      await exportScript(format)
    } catch (error) {
      console.error('导出失败:', error)
    }
  }

  // 处理复制操作
  const handleCopy = async (format: ExportFormat) => {
    try {
      await copyScript(format)
    } catch (error) {
      console.error('复制失败:', error)
    }
  }

  if (loadingState.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-slate-600">正在加载脚本详情...</p>
        </div>
      </div>
    )
  }

  if (loadingState.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">加载失败</h3>
              <p className="text-slate-600 mb-4">{loadingState.error}</p>
              <Button onClick={refresh} variant="outline">
                重试
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!script) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">脚本不存在</h3>
              <p className="text-slate-600 mb-4">找不到指定的脚本</p>
              <Link href="/script-management">
                <Button variant="outline">返回脚本管理</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statusBadge = getStatusBadge(script.status)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* 顶部导航栏 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="flex items-center text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回
              </Button>
              <div className="h-6 w-px bg-slate-300" />
              <div>
                <h1 className="text-xl font-semibold text-slate-900">{script.title}</h1>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant={statusBadge.variant}>
                    {statusBadge.label}
                  </Badge>
                  <span className="text-sm text-slate-500">
                    更新于 {new Date(script.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* 编辑模式切换 */}
              <Button
                variant={editorState.isEditing ? "default" : "outline"}
                size="sm"
                onClick={toggleEditMode}
                disabled={loadingState.isSaving}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                {editorState.isEditing ? "退出编辑" : "编辑"}
              </Button>

              {/* 复制按钮 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(ExportFormat.TXT)}
                disabled={loadingState.isLoading}
              >
                {loadingState.isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                复制
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 脚本内容编辑器 */}
          <div className="lg:col-span-3">
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Sparkles className="h-5 w-5 mr-2 text-indigo-600" />
                      脚本内容
                    </CardTitle>
                    <CardDescription>
                      {editorState.isEditing ? "编辑模式：您可以修改脚本内容" : "查看模式：脚本内容为只读"}
                    </CardDescription>
                  </div>
                  {editorState.hasUnsavedChanges && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-amber-600">有未保存的更改</span>
                      <Button
                        size="sm"
                        onClick={saveScript}
                        disabled={loadingState.isSaving}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                      >
                        {loadingState.isSaving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : null}
                        保存
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ScriptEditor
                  script={script}
                  editable={editorState.isEditing}
                  onUpdate={updateScript}
                />
              </CardContent>
            </Card>
          </div>

          {/* 侧边栏 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 脚本信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">脚本信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">脚本ID</label>
                  <p className="text-sm text-slate-600 font-mono">{script.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">分析卡片</label>
                  <p className="text-sm text-slate-600">{script.cardId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">创建时间</label>
                  <p className="text-sm text-slate-600">
                    {new Date(script.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">字数统计</label>
                  <p className="text-sm text-slate-600">
                    约 {script.sections.reduce((total, section) => total + section.content.length, 0)} 字
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 操作区域 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">操作</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    导出的文档将包含完整的脚本框架和创作建议
                  </AlertDescription>
                </Alert>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport(ExportFormat.TXT)}
                  disabled={loadingState.isExporting}
                  className="w-full"
                >
                  {loadingState.isExporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  导出为TXT
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport(ExportFormat.JSON)}
                  disabled={loadingState.isExporting}
                  className="w-full"
                >
                  {loadingState.isExporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  导出为JSON
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="mt-8 flex justify-center">
          <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-4">
            <Button
              size="lg"
              onClick={() => handleExport(ExportFormat.JSON)}
              disabled={loadingState.isExporting}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              {loadingState.isExporting ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Download className="h-5 w-5 mr-2" />
              )}
              导出为JSON
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}