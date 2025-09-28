"use client"

import React, { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Wand2, Edit3, Save, RefreshCw, Settings, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AnalysisError } from "@/components/analysis/AnalysisError"
import { GenerateScriptButton } from "@/components/script/GenerateScriptButton"

const SimpleEditableField = ({
  isEditing,
  value,
  onChange,
  multiline = false,
  className = "",
  fieldId,
}: {
  isEditing: boolean
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  className?: string
  fieldId: string
}) => {
  if (isEditing) {
    if (multiline) {
      return (
        <textarea
          id={fieldId}
          value={value}
          onChange={(e) => {
            console.log(`${fieldId} onChange triggered:`, e.target.value)
            onChange(e.target.value)
          }}
          className={`w-full min-h-[80px] p-3 border rounded-md resize-y ${className}`}
        />
      )
    } else {
      return (
        <input
          id={fieldId}
          type="text"
          value={value}
          onChange={(e) => {
            console.log(`${fieldId} onChange triggered:`, e.target.value)
            onChange(e.target.value)
          }}
          className={`w-full p-3 border rounded-md ${className}`}
        />
      )
    }
  } else {
    const bgClass =
      className.includes("blue") ? "bg-blue-50 border-blue-100" :
      className.includes("green") ? "bg-green-50 border-green-100" :
      "bg-purple-50 border-purple-100"

    return (
      <div className={`text-sm p-3 rounded border ${multiline ? "min-h-[80px] flex items-center" : ""} ${bgClass}`}>
        {value}
      </div>
    )
  }
}

const trustHookFields = [
    { key: 'openingHook', label: '开场钩子', multiline: true, className: "border-blue-200 focus:border-blue-400" },
    { key: 'credibilityProof', label: '可信度证明', className: "border-blue-200 focus:border-blue-400" },
    { key: 'authoritySignal', label: '权威信号', className: "border-blue-200 focus:border-blue-400" }
];
const empathyAnchorFields = [
    { key: 'painPoint', label: '痛点识别', className: "border-green-200 focus:border-green-400" },
    { key: 'targetAudience', label: '目标受众', className: "border-green-200 focus:border-green-400" },
    { key: 'emotionalTrigger', label: '情感触发器', className: "border-green-200 focus:border-green-400" },
];
const valueMapFields = [
    { key: 'coreValue', label: '核心价值', multiline: true, className: "border-purple-200 focus:border-purple-400" },
    { key: 'actionGuide', label: '行动指引', className: "border-purple-200 focus:border-purple-400" },
];

const EditableCard = React.memo(({
    section,
    title,
    description,
    borderColor,
    titleColor,
    data,
    fields,
    isEditing,
    onToggleEdit,
    onFieldChange,
  }: {
    section: string
    title: string
    description: string
    borderColor: string
    titleColor: string
    data: any
    fields: {key: string, label: string, multiline?: boolean, className: string}[],
    isEditing: boolean,
    onToggleEdit: () => void,
    onFieldChange: (key: string, value: string) => void
  }) => {

    return (
      <Card className={`${borderColor} group hover:shadow-lg transition-all duration-200 relative`}>
        {/* 悬停时显示的编辑按钮 */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button
            variant={isEditing ? "default" : "ghost"}
            size="sm"
            onClick={onToggleEdit}
            className={isEditing ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {isEditing ? (
              <>
                <Save className="h-4 w-4 mr-1" />
                保存
              </>
            ) : (
              <>
                <Edit3 className="h-4 w-4 mr-1" />
                编辑
              </>
            )}
          </Button>
        </div>

        <CardHeader className="pr-20">
          <CardTitle className={titleColor}>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {fields.map(field => (
                <div key={field.key}>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">{field.label}</label>
                    <SimpleEditableField
                        isEditing={isEditing}
                        value={data[field.key]}
                        onChange={(value) => onFieldChange(field.key, value)}
                        multiline={field.multiline}
                        className={field.className}
                        fieldId={`field-${section}-${field.key}`}
                    />
                </div>
            ))}
            {section === 'valueMap' && (
                <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">利益点</label>
                    <div className="flex flex-wrap gap-2">
                      {data.benefitPoints.map((point: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-purple-700 border-purple-200">
                          {point}
                        </Badge>
                      ))}
                    </div>
                </div>
            )}
        </CardContent>
      </Card>
    )
})
EditableCard.displayName = 'EditableCard'


function AnalysisContent() {
  const searchParams = useSearchParams()
  const mediaFileId = searchParams.get('mediaFileId')
  const urlCardId = searchParams.get('card') // 仪表板传递的卡片ID
  const analysisType = searchParams.get('type') // 'text' 或 'media'
  
  // 优先使用urlCardId，如果没有则使用mediaFileId
  const targetId = urlCardId || mediaFileId
  
  const [isLoading, setIsLoading] = useState(true)
  const [fileInfo, setFileInfo] = useState<any>(null)
  const [cardId, setCardId] = useState<string | null>(urlCardId)
  const [analysisError, setAnalysisError] = useState<{
    code: number
    message: string
  } | null>(null)
  const [editingStates, setEditingStates] = useState({
    trustHook: false,
    empathyAnchor: false,
    valueMap: false,
  })

  const [isReanalyzing, setIsReanalyzing] = useState(false)

  const [analysisData, setAnalysisData] = useState({
    // 信任之钩模块
    trustHook: {
      openingHook: "",
      credibilityProof: "",
      authoritySignal: "",
    },
    // 共情之锚模块
    empathyAnchor: {
      painPoint: "",
      targetAudience: "",
      emotionalTrigger: "",
    },
    // 价值图谱模块
    valueMap: {
      coreValue: "",
      benefitPoints: [],
      actionGuide: "",
    },
  })

  // 添加状态变化监听
  useEffect(() => {
    console.log('analysisData updated:', analysisData)
  }, [analysisData])

  // 加载已保存的分析数据
  const loadSavedAnalysisData = useCallback(async (): Promise<boolean> => {
    if (!targetId) return false

    try {
      // 优先尝试使用card参数加载，如果失败再尝试mediaFileId
      let response
      if (urlCardId) {
        // 从仪表板过来，使用card ID
        response = await fetch(`/api/analysis/load?cardId=${urlCardId}`)
      } else if (mediaFileId) {
        // 从其他地方过来，使用mediaFileId
        response = await fetch(`/api/analysis/load?mediaFileId=${mediaFileId}`)
      } else {
        return false
      }
      
      if (response.ok) {
        const result = await response.json()
        console.log('Loaded saved analysis:', result)
        // 使用安全的数据合并
        setAnalysisData(prevData => ({
          ...prevData,
          ...result.data,
          trustHook: {
            ...prevData.trustHook,
            ...result.data?.trustHook
          },
          empathyAnchor: {
            ...prevData.empathyAnchor,
            ...result.data?.empathyAnchor
          },
          valueMap: {
            ...prevData.valueMap,
            ...result.data?.valueMap
          }
        }))
        
        // 从API响应中提取cardId（如果存在）
        if (result.cardId) {
          console.log('Setting cardId:', result.cardId)
          setCardId(result.cardId)
        } else {
          console.log('No cardId in response:', result)
        }
        
        return true
      } else if (response.status === 404) {
        console.log('No saved analysis found, using default data')
        return false
      } else {
        throw new Error('Failed to load saved analysis')
      }
    } catch (error) {
      console.error('Error loading saved analysis:', error)
      return false
    }
  }, [targetId, urlCardId, mediaFileId])

  // 获取文件信息并开始分析
  useEffect(() => {
    const fetchFileAndAnalyze = async () => {
      console.log('=== Analysis Page useEffect triggered ===')
      console.log('=== Current URL:', window.location.href)
      console.log('=== Search params:', window.location.search)
      console.log('=== mediaFileId from URL:', mediaFileId)
      console.log('=== urlCardId from URL:', urlCardId)
      console.log('=== targetId (resolved):', targetId)
      console.log('=== analysisType from URL:', analysisType)
      
      // 检查是否是文本分析
      if (analysisType === 'text') {
        console.log('=== 处理文本分析结果 ===')
        
        try {
          const storedResult = sessionStorage.getItem('textAnalysisResult')
          if (storedResult) {
            const textAnalysisData = JSON.parse(storedResult)
            console.log('=== 从sessionStorage加载文本分析结果:', textAnalysisData)
            
            // 使用安全的数据合并
            setAnalysisData(prevData => ({
              ...prevData,
              ...textAnalysisData,
              trustHook: {
                ...prevData.trustHook,
                ...textAnalysisData.trustHook
              },
              empathyAnchor: {
                ...prevData.empathyAnchor,
                ...textAnalysisData.empathyAnchor
              },
              valueMap: {
                ...prevData.valueMap,
                ...textAnalysisData.valueMap
              }
            }))
            setFileInfo({
              originalFilename: '文本分析',
              fileSize: 0,
              status: 'ready',
              createdAt: new Date().toISOString()
            })
            
            // 清除sessionStorage中的数据
            sessionStorage.removeItem('textAnalysisResult')
          } else {
            console.log('=== 未找到文本分析结果，使用默认数据 ===')
          }
        } catch (error) {
          console.error('解析文本分析结果失败:', error)
        }
        
        setIsLoading(false)
        return
      }
      
      // 检查是否是视频分析
      if (analysisType === 'video') {
        console.log('=== 处理视频分析结果 ===')
        
        try {
          const storedResult = sessionStorage.getItem('videoAnalysisResult')
          if (storedResult) {
            const videoAnalysisData = JSON.parse(storedResult)
            console.log('=== 从sessionStorage加载视频分析结果:', videoAnalysisData)
            
            // 使用安全的数据合并
            setAnalysisData(prevData => ({
              ...prevData,
              ...videoAnalysisData,
              trustHook: {
                ...prevData.trustHook,
                ...videoAnalysisData.trustHook
              },
              empathyAnchor: {
                ...prevData.empathyAnchor,
                ...videoAnalysisData.empathyAnchor
              },
              valueMap: {
                ...prevData.valueMap,
                ...videoAnalysisData.valueMap
              }
            }))
            
            // 清除sessionStorage中的数据
            sessionStorage.removeItem('videoAnalysisResult')
            
            // 如果有mediaFileId，获取文件信息
            if (mediaFileId) {
              try {
                const response = await fetch(`/api/files/${mediaFileId}`)
                if (response.ok) {
                  const result = await response.json()
                  const fileData = result.data || result
                  setFileInfo(fileData)
                  console.log('视频文件信息:', fileData)
                }
              } catch (fileError) {
                console.error('获取视频文件信息失败:', fileError)
                // 使用默认文件信息
                setFileInfo({
                  originalFilename: '视频分析',
                  fileSize: 0,
                  status: 'ready',
                  createdAt: new Date().toISOString()
                })
              }
            }
          } else {
            console.log('=== 未找到视频分析结果，尝试常规加载 ===')
            // 没有缓存的分析结果，继续执行常规的媒体文件处理逻辑
          }
        } catch (error) {
          console.error('解析视频分析结果失败:', error)
        }
        
        // 如果没有从sessionStorage加载到数据，继续执行常规逻辑
        const storedResult = sessionStorage.getItem('videoAnalysisResult')
        if (storedResult) {
          setIsLoading(false)
          return
        }
      }
      
      // 原有的媒体文件处理逻辑
      if (!targetId) {
        console.log('=== No targetId provided, using demo data ===')
        setIsLoading(false)
        return
      }

      try {
        console.log('=== Fetching file info for targetId:', targetId)
        
        // 根据参数类型选择不同的获取方式
        if (urlCardId) {
          // 如果是从仪表板来的，直接加载分析数据
          console.log('=== Loading from dashboard with cardId:', urlCardId)
          const savedDataLoaded = await loadSavedAnalysisData()
          if (savedDataLoaded) {
            console.log('=== Successfully loaded analysis data from cardId')
            // 设置一个模拟的文件信息用于显示
            setFileInfo({
              originalFilename: '分析卡片',
              fileSize: 0,
              status: 'ready',
              createdAt: new Date().toISOString()
            })
          } else {
            throw new Error('Failed to load analysis data from card')
          }
        } else if (mediaFileId) {
          // 如果是直接的media file，获取文件信息然后加载分析数据
          console.log('=== Loading from media file:', mediaFileId)
          const response = await fetch(`/api/files/${mediaFileId}`)
          if (!response.ok) {
            throw new Error('Failed to fetch file info')
          }
          
          const result = await response.json()
          const fileData = result.data || result
          setFileInfo(fileData)
          console.log('File info:', fileData)
          
          // 然后尝试加载已保存的分析数据
          const savedDataLoaded = await loadSavedAnalysisData()
          if (savedDataLoaded) {
            console.log('=== Loaded saved data from database ===')
          } else {
            console.log('=== No saved data found ===')
            console.log('=== 提示：请通过首页的"开始分析视频"按钮进行分析 ===')
            
            // 不再自动进行AI分析，显示提示信息
            setAnalysisError({
              code: 4001,
              message: '请返回首页，通过"开始分析视频"按钮进行分析。直接访问此页面无法进行AI分析。'
            })
          }
        } else {
          throw new Error('No valid ID provided')
        }
        
      } catch (error) {
        console.error('Error fetching file or starting analysis:', error)
        setAnalysisError({
          code: 5001,
          message: '获取文件信息失败，请重新上传文件进行分析'
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchFileAndAnalyze()
  }, [targetId, urlCardId, mediaFileId, analysisType, loadSavedAnalysisData])

  // 专门的重新分析函数
  const reAnalyzeMedia = async (fileId: string) => {
    try {
      console.log('=== 开始重新分析，mediaFileId:', fileId)
      setIsReanalyzing(true)
      
      // 直接调用AI服务的重新分析接口
      const response = await fetch(`http://localhost:8000/api/v1/analysis/retry/${fileId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: 'web-user-001',
          force_new_card: true // 强制创建新卡片
        })
      })
      
      if (!response.ok) {
        throw new Error(`重新分析失败: ${response.status} ${response.statusText}`)
      }
      
      const result = await response.json()
      console.log('重新分析结果:', result)
      console.log('=== 详细数据结构调试 ===')
      console.log('result.data:', JSON.stringify(result.data, null, 2))
      
      if (!result.success) {
        throw new Error(result.message || '重新分析失败')
      }
      
      // 检查返回的数据结构并进行安全访问
      const analysisData = result.data || {}
      console.log('分析数据结构:', analysisData)
      
      // 安全地获取各个分析模块的数据
      const trustHook = analysisData.trust_hook || {}
      const empathyAnchor = analysisData.empathy_anchor || {}
      const valueMap = analysisData.value_map || {}
      
      // 添加调试日志
      console.log('=== AI返回的原始数据结构 ===')
      console.log('trustHook:', trustHook)
      console.log('empathyAnchor:', empathyAnchor)
      console.log('valueMap:', valueMap)
      
      // 将AI返回的数据格式转换为页面期望的格式
      const mappedData = {
        trustHook: {
          openingHook: trustHook.hook_copy || '',
          credibilityProof: trustHook.credibility_testimony || '',
          authoritySignal: Array.isArray(trustHook.authority_signals) ? trustHook.authority_signals.join(', ') : (trustHook.authority_signals || ''),
        },
        empathyAnchor: {
          painPoint: empathyAnchor.pain_point || '',
          targetAudience: empathyAnchor.target_audience || '',
          emotionalTrigger: Array.isArray(empathyAnchor.emotional_triggers) ? empathyAnchor.emotional_triggers.join(', ') : (empathyAnchor.emotional_triggers || ''),
        },
        valueMap: {
          coreValue: valueMap.core_value || '',
          benefitPoints: Array.isArray(valueMap.value_delivery) ? valueMap.value_delivery : [],
          actionGuide: valueMap.competitive_advantage || '',
        },
      }
      
      console.log('=== 映射后的数据结构 ===')
      console.log('mappedData:', mappedData)
      
      // 更新分析数据
      setAnalysisData(mappedData)
      setAnalysisError(null)
      
      console.log('=== 重新分析完成，数据已更新')
      
      // 自动保存重新分析的结果到数据库
      console.log('=== 自动保存重新分析结果到数据库')
      console.log('=== 准备保存的数据 ===')
      console.log('mappedData.empathyAnchor.emotionalTrigger:', mappedData.empathyAnchor.emotionalTrigger)
      console.log('完整的mappedData:', JSON.stringify(mappedData, null, 2))
      
      try {
        const saveResponse = await fetch('/api/analysis/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            mediaFileId: fileId,
            analysisData: mappedData
          })
        })
        
        if (saveResponse.ok) {
          console.log('=== 重新分析结果保存成功')
        } else {
          console.error('=== 重新分析结果保存失败:', saveResponse.status)
        }
      } catch (saveError) {
        console.error('=== 保存重新分析结果时出错:', saveError)
      }
      
    } catch (error) {
      console.error('重新分析失败:', error)
      setAnalysisError({
        code: 5001,
        message: error instanceof Error ? error.message : '重新分析失败，请稍后重试'
      })
    } finally {
      setIsReanalyzing(false)
    }
  }

  const startAnalysis = async (fileId: string, forceNewCard: boolean = false) => {
    try {
      console.log('=== Starting analysis function called with fileId:', fileId, 'forceNewCard:', forceNewCard)
      
      if (forceNewCard) {
        setIsReanalyzing(true)
      }
      
      // 调用AI服务进行分析
      const response = await fetch('/api/analyze/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mediaFileId: fileId,
          analysisType: 'full',
          forceNewCard: forceNewCard // 传递新参数
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to start analysis')
      }
      
      const analysisResult = await response.json()
      console.log('Analysis result:', analysisResult)
      
      // 检查API响应格式
      if (analysisResult.code !== 0) {
        // API返回了错误
        setAnalysisError({
          code: analysisResult.code,
          message: analysisResult.message
        })
        return
      }
      
      // 更新分析数据
      if (analysisResult.data) {
        // 使用安全的数据合并
        setAnalysisData(prevData => ({
          ...prevData,
          ...analysisResult.data,
          trustHook: {
            ...prevData.trustHook,
            ...analysisResult.data?.trustHook
          },
          empathyAnchor: {
            ...prevData.empathyAnchor,
            ...analysisResult.data?.empathyAnchor
          },
          valueMap: {
            ...prevData.valueMap,
            ...analysisResult.data?.valueMap
          }
        }))
        setAnalysisError(null) // 清除任何之前的错误
        
        if (forceNewCard) {
          // TODO: 可以添加成功提示，告知用户创建了新版本
          console.log('=== 新版本分析完成')
        }
      }
      
    } catch (error) {
      const isDevelopment = process.env.NODE_ENV === 'development'
      
      if (isDevelopment) {
        console.error('Error starting analysis:', error)
      }
      
      // 设置默认错误状态
      setAnalysisError({
        code: 5001, // 服务不可用
        message: '分析服务暂时不可用，请稍后重试'
      })
    } finally {
      if (forceNewCard) {
        setIsReanalyzing(false)
      }
    }
  }

  const toggleEdit = useCallback((section: string) => {
    setEditingStates((prev) => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev],
    }))
  }, [])

  const handleFieldChange = useCallback((section: string, field: string, value: string) => {
    setAnalysisData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value,
      },
    }))
  }, [])

  // 保存分析数据到数据库
  const saveAnalysisData = useCallback(async () => {
    if (!mediaFileId) {
      console.error('No mediaFileId available for saving')
      return
    }

    try {
      console.log('Saving analysis data...', analysisData)
      
      const response = await fetch('/api/analysis/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mediaFileId,
          analysisData
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save analysis')
      }

      const result = await response.json()
      console.log('Analysis saved successfully:', result)
      
      // 显示保存成功提示
      // TODO: 可以添加Toast通知
      
    } catch (error) {
      console.error('Error saving analysis:', error)
      // TODO: 可以添加错误提示
    }
  }, [mediaFileId, analysisData])

  // 修改toggleEdit函数，在点击保存时调用保存函数
  const handleToggleEdit = useCallback((section: string) => {
    const currentlyEditing = editingStates[section as keyof typeof editingStates]
    
    if (currentlyEditing) {
      // 如果当前是编辑状态，点击保存时保存数据
      saveAnalysisData()
    }
    
    toggleEdit(section)
  }, [editingStates, toggleEdit, saveAnalysisData])

  // 创建一个完全独立的输入组件
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  返回首页
                </Button>
              </Link>
              <h1 className="text-xl font-semibold">视频分析卡片</h1>
            </div>
            <div className="flex items-center space-x-2">
              {/* 编辑卡片按钮 - TOM-219新功能入口 */}
              {cardId && (
                <Link href={`/cards/${cardId}/edit`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-purple-200 text-purple-700 hover:bg-purple-50"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    高级编辑
                  </Button>
                </Link>
              )}
              
              
              {/* 重新分析按钮 - 仅对媒体文件显示 */}
              {mediaFileId && fileInfo && !analysisError && analysisType !== 'text' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => reAnalyzeMedia(mediaFileId)}
                  disabled={isReanalyzing}
                  className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                >
                  {isReanalyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent mr-2"></div>
                      重新分析中...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      重新分析
                    </>
                  )}
                </Button>
              )}
              
              {/* 生成脚本按钮 - TOM-218集成 */}
              <GenerateScriptButton 
                cardId={cardId}
                disabled={isLoading || !!analysisError}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* 加载状态 */}
          {isLoading && (
            <Card className="mb-8">
              <CardContent className="py-8">
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>
                  <span>正在加载分析结果...</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 文件信息显示 */}
          {fileInfo && (
            <Card className="mb-8 border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-blue-800">
                  <span>📁 文件信息</span>
                  <Badge variant="outline" className="border-blue-300 text-blue-700">
                    {fileInfo.status === 'ready' ? '已就绪' : '处理中'}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-blue-600">
                  文件名: {fileInfo.originalFilename} | 
                  大小: {(fileInfo.fileSize / 1024 / 1024).toFixed(2)} MB |
                  上传时间: {new Date(fileInfo.createdAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* 错误状态显示 */}
          {analysisError && fileInfo && (
            <AnalysisError
              errorCode={analysisError.code}
              errorMessage={analysisError.message}
              fileName={fileInfo.originalFilename}
              fileSize={fileInfo.fileSize}
              onRetry={() => startAnalysis(mediaFileId!, true)} // 重试时创建新卡片
            />
          )}

          {/* 分析概览 - 只在没有错误时显示 */}
          {!analysisError && (
            <>
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>分析概览</span>
                    <Badge variant="secondary">
                      {fileInfo ? fileInfo.originalFilename : 'iPhone评测视频'}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {fileInfo ? '基于上传文件的智能解构分析结果' : '基于上传内容的智能解构分析结果'}，悬停卡片可进行编辑
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* 三大核心模块 */}
              <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {/* 信任之钩 */}
            <EditableCard
              section="trustHook"
              title="信任之钩"
              description="建立可信度和权威性"
              borderColor="border-l-4 border-l-blue-500"
              titleColor="text-blue-700"
              data={analysisData.trustHook}
              fields={trustHookFields}
              isEditing={editingStates.trustHook}
              onToggleEdit={() => handleToggleEdit('trustHook')}
              onFieldChange={(key, value) => handleFieldChange('trustHook', key, value)}
            />

            {/* 共情之锚 */}
            <EditableCard
              section="empathyAnchor"
              title="共情之锚"
              description="触发情感共鸣和认同"
              borderColor="border-l-4 border-l-green-500"
              titleColor="text-green-700"
              data={analysisData.empathyAnchor}
              fields={empathyAnchorFields}
              isEditing={editingStates.empathyAnchor}
              onToggleEdit={() => handleToggleEdit('empathyAnchor')}
              onFieldChange={(key, value) => handleFieldChange('empathyAnchor', key, value)}
            />

            {/* 价值图谱 */}
            <EditableCard
              section="valueMap"
              title="价值图谱"
              description="明确价值主张和行动指引"
              borderColor="border-l-4 border-l-purple-500"
              titleColor="text-purple-700"
              data={analysisData.valueMap}
              fields={valueMapFields}
              isEditing={editingStates.valueMap}
              onToggleEdit={() => handleToggleEdit('valueMap')}
              onFieldChange={(key, value) => handleFieldChange('valueMap', key, value)}
            />
          </div>

          {/* 编辑状态提示 */}
          {Object.values(editingStates).some((state) => state) && (
            <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                <p className="text-amber-800 text-sm">正在编辑中，记得点击&quot;保存&quot;按钮保存更改</p>
              </div>
            </div>
          )}

          {/* 底部操作区 - 移除错误的生成脚本按钮，改为查看脚本管理 */}
          <div className="flex justify-center space-x-4">
            <Link href="/script">
              <Button
                variant="outline"
                size="lg"
                className="px-8"
              >
                <FileText className="h-5 w-5 mr-2" />
                查看脚本管理
              </Button>
            </Link>
          </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AnalysisContent />
    </Suspense>
  )
}
