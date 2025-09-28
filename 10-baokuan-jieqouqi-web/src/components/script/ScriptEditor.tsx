"use client"

import { useState, useCallback } from "react"
import { Copy } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"

import { 
  ScriptDetail, 
  ScriptLoadingState, 
  ScriptEditorProps,
  ScriptSectionDetail,
  ScriptSectionUpdate,
  SectionType
} from "@/types/script"

interface ScriptSectionProps {
  section: ScriptSectionDetail
  isEditing: boolean
  onUpdate: (update: ScriptSectionUpdate) => void
  onCopy: (content: string) => void
}

// 段落组件
function ScriptSection({ section, isEditing, onUpdate, onCopy }: ScriptSectionProps) {
  const [localContent, setLocalContent] = useState(section.content)
  const { toast } = useToast()

  // 段落类型配置
  const sectionTypeConfig = {
    hook: { 
      title: "开场钩子", 
      color: "red", 
      bgColor: "bg-red-50",
      borderColor: "border-l-red-500",
      textColor: "text-red-700",
      badge: "关键时段"
    },
    problem: { 
      title: "痛点共鸣", 
      color: "orange", 
      bgColor: "bg-orange-50",
      borderColor: "border-l-orange-500",
      textColor: "text-orange-700",
      badge: null
    },
    solution: { 
      title: "解决方案", 
      color: "blue", 
      bgColor: "bg-blue-50",
      borderColor: "border-l-blue-500",
      textColor: "text-blue-700",
      badge: "核心内容"
    },
    proof: { 
      title: "价值证明", 
      color: "green", 
      bgColor: "bg-green-50",
      borderColor: "border-l-green-500",
      textColor: "text-green-700",
      badge: null
    },
    cta: { 
      title: "行动召唤", 
      color: "purple", 
      bgColor: "bg-purple-50",
      borderColor: "border-l-purple-500",
      textColor: "text-purple-700",
      badge: "转化关键"
    }
  }

  const config = sectionTypeConfig[section.sectionType as keyof typeof sectionTypeConfig] || {
    title: "未知段落", 
    color: "gray", 
    bgColor: "bg-gray-50",
    borderColor: "border-l-gray-500",
    textColor: "text-gray-700",
    badge: null
  }

  const handleContentChange = (newContent: string) => {
    setLocalContent(newContent)
    onUpdate({
      id: section.id,
      sectionType: section.sectionType,
      title: section.title,
      content: newContent,
      tips: section.tips || [],
      timeRange: section.timeRange,
      importance: section.importance,
      orderIndex: section.orderIndex
    })
  }

  const handleCopyClick = async () => {
    try {
      await navigator.clipboard.writeText(section.content)
      toast({
        title: "复制成功",
        description: `${config.title}内容已复制到剪贴板`,
      })
      onCopy(section.content)
    } catch (error) {
      toast({
        title: "复制失败",
        description: "请检查浏览器权限设置",
        variant: "destructive",
      })
    }
  }

  return (
    <Card className={`border-l-4 ${config.borderColor}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={`${config.textColor} flex items-center space-x-2`}>
              <span>{section.title}</span>
              {config.badge && (
                <Badge variant="outline" className="text-xs">
                  {config.badge}
                </Badge>
              )}
            </CardTitle>
            {section.timeRange && (
              <p className="text-sm text-gray-500 mt-1">
                时间段: {section.timeRange}
              </p>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleCopyClick}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <Textarea
            value={localContent}
            onChange={(e) => handleContentChange(e.target.value)}
            className="min-h-[120px] mb-4"
            placeholder={`输入${config.title}内容...`}
          />
        ) : (
          <div className={`text-gray-800 leading-relaxed mb-4 ${config.bgColor} p-4 rounded`}>
            <pre className="whitespace-pre-line font-sans">
              {section.content}
            </pre>
          </div>
        )}
        
        {/* 创作提示 */}
        {section.tips && section.tips.length > 0 && (
          <div className="bg-gray-50 p-3 rounded text-sm">
            <p className="font-medium text-gray-700 mb-1">创作要点：</p>
            <div className="text-gray-600">
              {section.tips.map((tip, index) => (
                <div key={index} className="mb-1">• {tip}</div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// 主脚本编辑器组件
export function ScriptEditor({ 
  script, 
  editable = false, 
  loadingState,
  onUpdate,
  onSave 
}: ScriptEditorProps) {
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, ScriptSectionUpdate>>({})
  const { toast } = useToast()

  // 处理段落更新
  const handleSectionUpdate = useCallback((update: ScriptSectionUpdate) => {
    setPendingUpdates(prev => ({
      ...prev,
      [update.id!]: update
    }))

    // 如果提供了onUpdate回调，立即调用
    if (onUpdate) {
      const allUpdates = Object.values({
        ...pendingUpdates,
        [update.id!]: update
      })
      onUpdate({ sections: allUpdates })
    }
  }, [pendingUpdates, onUpdate])

  // 复制内容到剪贴板
  const handleCopy = async (content: string) => {
    // 这个函数现在由段落组件自己处理，这里只是为了保持接口兼容
  }

  // 按顺序排序段落
  const sortedSections = [...script.sections].sort((a, b) => a.orderIndex - b.orderIndex)

  return (
    <div className="space-y-6">
      {sortedSections.map((section) => (
        <ScriptSection
          key={section.id}
          section={section}
          isEditing={editable}
          onUpdate={handleSectionUpdate}
          onCopy={handleCopy}
        />
      ))}

      {/* 保存状态提示 */}
      {editable && Object.keys(pendingUpdates).length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-800">
                有 {Object.keys(pendingUpdates).length} 处修改待保存
              </p>
              <p className="text-xs text-yellow-600">
                修改会自动保存，或点击手动保存按钮
              </p>
            </div>
            {onSave && (
              <Button 
                size="sm" 
                onClick={onSave}
                disabled={loadingState?.isSaving}
              >
                {loadingState?.isSaving ? '保存中...' : '立即保存'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}