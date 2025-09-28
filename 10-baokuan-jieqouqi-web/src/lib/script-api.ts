/**
 * TOM-218: 脚本管理API客户端
 * 集成TOM-217的7个脚本管理端点，提供类型安全的API调用
 */

import apiClient from '@/lib/api-client'
import {
  ScriptCreateRequest,
  ScriptUpdateRequest,
  ScriptDetail,
  ScriptGenerationResponse,
  ScriptDetailResponse,
  DeleteResponse,
  CopyResponse,
  HealthResponse,
  ExportFormat,
  APIResponse,
  BusinessCode
} from '@/types/script'

export class ScriptAPIError extends Error {
  constructor(
    message: string,
    public code: number,
    public originalError?: any
  ) {
    super(message)
    this.name = 'ScriptAPIError'
  }
}

/**
 * 处理API响应，检查业务状态码
 */
function handleAPIResponse<T>(response: APIResponse<T>): T {
  if (response.code !== BusinessCode.SUCCESS) {
    throw new ScriptAPIError(
      response.message || 'API请求失败',
      response.code,
      response
    )
  }
  
  if (!response.data) {
    throw new ScriptAPIError('API返回数据为空', response.code)
  }
  
  return response.data
}

/**
 * 脚本API客户端类
 * 提供完整的脚本生命周期管理功能
 */
export class ScriptApiClient {
  private readonly baseUrl = '/api/v1'

  /**
   * 生成脚本框架
   * @param cardId 分析卡片ID
   * @param config 脚本风格配置
   * @returns 生成的脚本详情
   */
  async generateScript(
    cardId: string,
    config?: ScriptCreateRequest
  ): Promise<ScriptDetail> {
    console.log('🚀 ScriptApiClient.generateScript 被调用')
    console.log('参数 - cardId:', cardId)
    console.log('参数 - config:', config)
    
    try {
      const url = `${this.baseUrl}/cards/${cardId}/generate-script`
      console.log('📡 准备发送POST请求到:', url)
      console.log('请求体:', config || {})
      
      const response = await apiClient.post<ScriptGenerationResponse>(
        url,
        config || {}
      )
      
      console.log('📨 收到API响应:', response)
      const result = handleAPIResponse(response)
      console.log('✅ 处理后的结果:', result)
      
      return result
    } catch (error) {
      console.error('❌ ScriptApiClient.generateScript 出错:', error)
      if (error instanceof ScriptAPIError) {
        throw error
      }
      throw new ScriptAPIError(
        '脚本生成失败，请稍后重试',
        BusinessCode.SCRIPT_GENERATION_ERROR,
        error
      )
    }
  }

  /**
   * 获取脚本详情
   * @param scriptId 脚本ID
   * @returns 脚本详情
   */
  async getScript(scriptId: string): Promise<ScriptDetail> {
    try {
      const response = await apiClient.get<ScriptDetailResponse>(
        `${this.baseUrl}/scripts/${scriptId}`
      )
      return handleAPIResponse(response)
    } catch (error) {
      if (error instanceof ScriptAPIError) {
        throw error
      }
      throw new ScriptAPIError(
        '获取脚本详情失败',
        BusinessCode.NOT_FOUND,
        error
      )
    }
  }

  /**
   * 更新脚本内容
   * @param scriptId 脚本ID
   * @param updates 更新数据
   * @returns 更新后的脚本详情
   */
  async updateScript(
    scriptId: string,
    updates: ScriptUpdateRequest
  ): Promise<ScriptDetail> {
    try {
      const response = await apiClient.put<ScriptDetailResponse>(
        `${this.baseUrl}/scripts/${scriptId}`,
        updates
      )
      return handleAPIResponse(response)
    } catch (error) {
      if (error instanceof ScriptAPIError) {
        throw error
      }
      throw new ScriptAPIError(
        '脚本更新失败',
        BusinessCode.UNKNOWN_ERROR,
        error
      )
    }
  }

  /**
   * 删除脚本
   * @param scriptId 脚本ID
   * @returns 删除结果
   */
  async deleteScript(scriptId: string): Promise<{ scriptId: string }> {
    try {
      const response = await apiClient.delete<DeleteResponse>(
        `${this.baseUrl}/scripts/${scriptId}`
      )
      return handleAPIResponse(response)
    } catch (error) {
      if (error instanceof ScriptAPIError) {
        throw error
      }
      throw new ScriptAPIError(
        '脚本删除失败',
        BusinessCode.UNKNOWN_ERROR,
        error
      )
    }
  }

  /**
   * 导出脚本
   * @param scriptId 脚本ID
   * @param format 导出格式
   * @param includeMetadata 是否包含元数据
   * @param includeTips 是否包含创作提示
   * @returns 文件Blob对象
   */
  async exportScript(
    scriptId: string,
    format: ExportFormat,
    includeMetadata: boolean = true,
    includeTips: boolean = true
  ): Promise<Blob> {
    try {
      const params = new URLSearchParams({
        format,
        include_metadata: includeMetadata.toString(),
        include_tips: includeTips.toString()
      })

      // 使用fetch直接请求，因为导出返回的是文件流而不是JSON
      const response = await fetch(
        `${this.baseUrl}/scripts/${scriptId}/export?${params}`,
        {
          method: 'GET',
          credentials: 'include', // 包含cookies用于认证
        }
      )

      if (!response.ok) {
        // 尝试解析错误信息
        let errorMessage = `导出失败: ${response.statusText}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorMessage
        } catch (e) {
          // 无法解析JSON，使用默认错误信息
        }
        throw new Error(errorMessage)
      }

      return await response.blob()
    } catch (error) {
      console.error('❌ 脚本导出失败:', error)
      throw new ScriptAPIError(
        '脚本导出失败',
        BusinessCode.UNKNOWN_ERROR,
        error
      )
    }
  }

  /**
   * 复制脚本内容
   * @param scriptId 脚本ID
   * @param format 复制格式
   * @returns 可复制的文本内容
   */
  async copyScript(
    scriptId: string,
    format: ExportFormat = ExportFormat.TXT
  ): Promise<string> {
    try {
      const params = new URLSearchParams({ format })
      const response = await apiClient.post<CopyResponse>(
        `${this.baseUrl}/scripts/${scriptId}/copy?${params}`,
        {}
      )
      const data = handleAPIResponse(response)
      return data.content
    } catch (error) {
      if (error instanceof ScriptAPIError) {
        throw error
      }
      throw new ScriptAPIError(
        '脚本复制失败',
        BusinessCode.UNKNOWN_ERROR,
        error
      )
    }
  }

  /**
   * 脚本健康检查
   * @param scriptId 脚本ID
   * @returns 健康状态
   */
  async checkScriptHealth(scriptId: string): Promise<{
    scriptId: string
    accessible: boolean
    title?: string
    status?: string
  }> {
    try {
      const response = await apiClient.get<HealthResponse>(
        `${this.baseUrl}/scripts/${scriptId}/health`
      )
      return handleAPIResponse(response)
    } catch (error) {
      // 健康检查失败时返回不可访问状态，而不是抛出异常
      return {
        scriptId,
        accessible: false
      }
    }
  }

  /**
   * 批量检查脚本状态
   * @param scriptIds 脚本ID数组
   * @returns 状态检查结果
   */
  async batchCheckHealth(scriptIds: string[]): Promise<Array<{
    scriptId: string
    accessible: boolean
    title?: string
    status?: string
  }>> {
    const results = await Promise.allSettled(
      scriptIds.map(id => this.checkScriptHealth(id))
    )

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return {
          scriptId: scriptIds[index],
          accessible: false
        }
      }
    })
  }
}

// 创建默认实例
export const scriptApi = new ScriptApiClient()

// 导出类型和实例
export default scriptApi