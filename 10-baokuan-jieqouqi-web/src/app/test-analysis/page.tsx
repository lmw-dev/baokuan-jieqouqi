"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

export default function TestAnalysisPage() {
  const [text, setText] = useState('作为一个用了10年iPhone的老用户，今天我要告诉你一个残酷的真相')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleDirectAITest = async () => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('content_type', 'text')
      formData.append('text_content', text)
      formData.append('analysis_options', JSON.stringify({
        include_trust_hooks: true,
        include_empathy_anchors: true,
        include_value_mapping: true,
        output_format: 'structured'
      }))

      const response = await fetch('http://localhost:8000/api/v1/analyze', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error:', error)
      setResult({ error: error instanceof Error ? error.message : String(error) })
    } finally {
      setLoading(false)
    }
  }

  const handleWebServiceTest = async () => {
    setLoading(true)
    try {
      // 这里我们需要一个真实的mediaFileId，先测试连接
      const response = await fetch('/api/analyze/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mediaFileId: 'test-id',
          analysisType: 'full'
        })
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error:', error)
      setResult({ error: error instanceof Error ? error.message : String(error) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>AI分析服务测试</CardTitle>
          <CardDescription>测试AI服务的连接和分析功能</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">测试文本:</label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="w-full"
            />
          </div>
          
          <div className="flex gap-4">
            <Button 
              onClick={handleDirectAITest}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? '分析中...' : '直接调用AI服务 (8000端口)'}
            </Button>
            
            <Button 
              onClick={handleWebServiceTest}
              disabled={loading}
              variant="outline"
            >
              {loading ? '测试中...' : '通过Web服务调用'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>分析结果</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}