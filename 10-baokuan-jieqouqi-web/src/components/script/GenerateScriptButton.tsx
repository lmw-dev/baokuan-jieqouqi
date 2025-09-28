"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Wand2, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useScriptGeneration } from "@/hooks/useScript"

interface GenerateScriptButtonProps {
  cardId: string | null
  disabled?: boolean
  className?: string
}

export function GenerateScriptButton({ 
  cardId, 
  disabled = false, 
  className = "" 
}: GenerateScriptButtonProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { generateScript, isGenerating, error } = useScriptGeneration()

  const handleGenerateScript = async () => {
    console.log('=== GenerateScriptButton: handleGenerateScript 被调用')
    console.log('cardId:', cardId)
    
    if (!cardId) {
      console.log('❌ cardId 为空，显示错误toast')
      toast({
        title: "无法生成脚本",
        description: "无效的分析卡片ID",
        variant: "destructive",
      })
      return
    }

    try {
      console.log('✅ 开始生成脚本，cardId:', cardId)
      // 显示开始生成的提示
      toast({
        title: "开始生成脚本",
        description: "正在基于分析卡片生成脚本框架...",
      })
      
      console.log('📡 正在调用 generateScript API...')
      // 调用脚本生成API
      const newScript = await generateScript(cardId)
      
      console.log('✅ API调用成功，返回脚本:', newScript)
      // 显示成功提示
      toast({
        title: "脚本生成成功",
        description: `已生成脚本"${newScript.title}"，即将跳转...`,
      })
      
      // 延迟一点跳转，让用户看到成功提示
      setTimeout(() => {
        console.log('🔄 跳转到脚本详情页:', `/script/${newScript.id}`)
        router.push(`/script/${newScript.id}`)
      }, 1000)
    } catch (error) {
      console.error('❌ 脚本生成失败:', error)
      toast({
        title: "脚本生成失败",
        description: error instanceof Error ? error.message : "请稍后重试或联系技术支持",
        variant: "destructive",
      })
    }
  }

  const isDisabled = disabled || isGenerating || !cardId

  return (
    <Button
      size="sm"
      onClick={(e) => {
        console.log('🔥 按钮被点击了！事件对象:', e)
        console.log('🔥 按钮被点击了！cardId:', cardId)
        console.log('🔥 按钮被点击了！isDisabled:', isDisabled)
        e.preventDefault() // 阻止默认行为
        e.stopPropagation() // 阻止事件冒泡
        handleGenerateScript()
      }}
      disabled={isDisabled}
      className={`bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          生成中...
        </>
      ) : (
        <>
          <Wand2 className="h-4 w-4 mr-2" />
          一键生成脚本框架
        </>
      )}
    </Button>
  )
}