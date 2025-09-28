'use client';

import Link from "next/link"
import { useState, useEffect } from "react"
import { Upload, FileText, Sparkles, AlertCircle, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AuthButton } from "@/components/auth/AuthButton"
import { UserAvatar } from "@/components/auth/UserAvatar"
import { useUserStore } from "@/stores/user-store"
import { useInstantUpload } from "@/hooks/use-instant-upload"

// 文件选择相关类型定义
type SelectedFile = {
  file: File;
  name: string;
  size: number;
  type: string;
} | null;

type FileSelectionError = {
  type: 'FILE_TYPE_NOT_SUPPORTED' | 'FILE_SIZE_TOO_LARGE' | 'NO_FILE_SELECTED';
  message: string;
} | null;

// 表单验证相关类型
type TextInputValidation = {
  value: string;
  error: string | null;
  isValid: boolean;
};

type FormSubmissionState = {
  isLoading: boolean;
  canSubmit: boolean;
};

// 页面状态管理Hook
function useLandingPageState() {
  // 客户端功能检测状态 - 避免SSR hydration不匹配
  const [isClient, setIsClient] = useState(false);
  
  // 文件选择状态
  const [selectedFile, setSelectedFile] = useState<SelectedFile>(null);
  const [fileError, setFileError] = useState<FileSelectionError>(null);
  
  // 文案输入状态
  const [textInput, setTextInput] = useState<TextInputValidation>({
    value: '',
    error: null,
    isValid: false
  });
  
  // 认证状态
  const { isAuthenticated, isLoading: authLoading, initializeAuth } = useUserStore();
  
  // 表单提交状态
  const [submissionState, setSubmissionState] = useState<FormSubmissionState>({
    isLoading: false,
    canSubmit: false
  });

  // 文件上传状态
  const {
    isUploading,
    progress,
    error: uploadError,
    result: uploadResult,
    uploadFile,
    reset: resetUpload,
    supportsInstantUpload
  } = useInstantUpload({
    onSuccess: (result) => {
      console.log('=== 首页上传成功 ===', result);
      console.log('=== result.mediaFileId:', result.mediaFileId);
      console.log('=== result.cosUrl:', result.cosUrl);
      console.log('=== 是否秒传:', result.isInstantUpload);
      
      // 文件上传成功后，不直接跳转，而是在handleSubmit中继续AI分析流程
      console.log('=== 文件上传完成，准备进行AI分析 ===');
    },
    onError: (error) => {
      console.error('文件上传失败:', error);
      setFileError({
        type: 'UPLOAD_FAILED' as any,
        message: error
      });
    }
  });

  // 初始化认证状态和客户端检测
  useEffect(() => {
    initializeAuth();
    setIsClient(true); // 标记为客户端，避免hydration不匹配
  }, [initializeAuth]);

  // 文件选择处理
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFileError(null);
    
    if (!file) {
      setSelectedFile(null);
      return;
    }

    // 文件类型验证
    const allowedTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/quicktime'];
    const allowedExtensions = ['.mp4', '.mov', '.avi'];
    
    const isValidType = allowedTypes.includes(file.type) || 
                       allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!isValidType) {
      setFileError({
        type: 'FILE_TYPE_NOT_SUPPORTED',
        message: '请选择 MP4, MOV, AVI 格式的视频文件'
      });
      setSelectedFile(null);
      return;
    }

    // 文件大小验证 (100MB限制)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      setFileError({
        type: 'FILE_SIZE_TOO_LARGE',
        message: '文件大小不能超过 100MB'
      });
      setSelectedFile(null);
      return;
    }

    // 文件选择成功
    setSelectedFile({
      file,
      name: file.name,
      size: file.size,
      type: file.type
    });
  };

  // 文案输入处理
  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    const trimmedValue = value.trim();
    
    setTextInput({
      value,
      error: trimmedValue.length === 0 ? '请输入视频文案内容' : null,
      isValid: trimmedValue.length > 0
    });
  };

  // 表单提交处理
  const handleSubmit = async (type: 'file' | 'text') => {
    setSubmissionState({ ...submissionState, isLoading: true });
    
    // 检查认证状态 - 直接跳转登录而不是显示提示
    if (!isAuthenticated) {
      console.log('🔑 User not authenticated, redirecting to login');
      setSubmissionState({ ...submissionState, isLoading: false });
      window.location.href = '/api/auth/sign-in?redirectTo=/';
      return;
    }

    try {
      if (type === 'file') {
        // 验证文件
        if (!selectedFile) {
          setFileError({
            type: 'NO_FILE_SELECTED',
            message: '请先选择视频文件'
          });
          setSubmissionState({ ...submissionState, isLoading: false });
          return;
        }

        // 视频分析处理
        console.log('🎥 开始视频分析流程');
        
        // 清除之前的错误
        setFileError(null);
        resetUpload();

        // 第一步：上传文件
        console.log('🚀 第一步：上传文件:', selectedFile.name);
        const uploadResult = await uploadFile(selectedFile.file);
        
        if (!uploadResult || !uploadResult.mediaFileId) {
          throw new Error('文件上传失败，无法获取文件ID');
        }
        
        console.log('✅ 文件上传成功，mediaFileId:', uploadResult.mediaFileId);
        
        // 第二步：调用视频分析API
        console.log('🧠 第二步：开始AI视频分析');
        console.log('📝 调用API: /api/analyze/video，参数:', { mediaFileId: uploadResult.mediaFileId });
        
        try {
          const analysisResponse = await fetch('/api/analyze/video', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              mediaFileId: uploadResult.mediaFileId,
              forceReprocess: false
            })
          });
          
          console.log('📡 AI分析API响应状态:', analysisResponse.status);
          
          if (!analysisResponse.ok) {
            const errorText = await analysisResponse.text();
            console.error('❌ AI分析API错误响应:', errorText);
            throw new Error(`视频分析失败: ${analysisResponse.status} ${analysisResponse.statusText}`);
          }
          
          const analysisResult = await analysisResponse.json();
          console.log('📊 AI分析结果:', analysisResult);
          
          if (analysisResult.code !== 0) {
            console.error('❌ AI分析返回错误:', analysisResult);
            throw new Error(analysisResult.message || '视频分析失败');
          }
          
          console.log('✅ 视频分析成功，准备跳转到分析页面');
          console.log('💾 存储分析结果到sessionStorage');
          
          // 将分析结果存储到sessionStorage，然后跳转
          sessionStorage.setItem('videoAnalysisResult', JSON.stringify(analysisResult.data));
          
          const redirectUrl = `/analysis?type=video&mediaFileId=${uploadResult.mediaFileId}`;
          console.log('🔗 跳转URL:', redirectUrl);
          
          window.location.href = redirectUrl;
          
        } catch (analysisError) {
          console.error('❌ 视频分析过程出错:', analysisError);
          setFileError({
            type: 'ANALYSIS_FAILED' as any,
            message: analysisError instanceof Error ? analysisError.message : '视频分析失败，请重试'
          });
          setSubmissionState({ ...submissionState, isLoading: false });
          return;
        }
        
      } else if (type === 'text') {
        // 验证文本输入
        if (!textInput.isValid) {
          setTextInput({
            ...textInput,
            error: '请输入视频文案内容'
          });
          setSubmissionState({ ...submissionState, isLoading: false });
          return;
        }

        // 文本分析处理
        console.log('🔤 开始文本分析，内容长度:', textInput.value.length);
        
        try {
          const response = await fetch('/api/analyze/text', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              content: textInput.value.trim(),
              title: '用户输入文案'
            })
          });
          
          if (!response.ok) {
            throw new Error(`文本分析失败: ${response.status} ${response.statusText}`);
          }
          
          const result = await response.json();
          
          if (result.code !== 0) {
            throw new Error(result.message || '文本分析失败');
          }
          
          console.log('✅ 文本分析成功，跳转到分析页面');
          
          // 将分析结果存储到sessionStorage，然后跳转
          sessionStorage.setItem('textAnalysisResult', JSON.stringify(result.data));
          window.location.href = '/analysis?type=text';
          
        } catch (error) {
          console.error('文本分析失败:', error);
          setTextInput({
            ...textInput,
            error: error instanceof Error ? error.message : '文本分析失败，请重试'
          });
          setSubmissionState({ ...submissionState, isLoading: false });
          return;
        }
      }
    } catch (error) {
      console.error('提交失败:', error);
      setSubmissionState({ ...submissionState, isLoading: false });
    }
  };

  // 计算是否可以提交
  useEffect(() => {
    const fileReady = selectedFile && !fileError;
    const textReady = textInput.isValid;
    
    setSubmissionState(prev => ({
      ...prev,
      canSubmit: (fileReady || textReady) && isAuthenticated
    }));
  }, [selectedFile, fileError, textInput.isValid, isAuthenticated]);

  return {
    // 状态
    selectedFile,
    fileError,
    textInput,
    submissionState,
    
    // 文件上传状态
    isUploading,
    progress,
    uploadError,
    uploadResult,
    supportsInstantUpload: isClient ? supportsInstantUpload : false, // 服务器端始终返回false
    
    // 操作方法
    handleFileSelect,
    handleTextChange,
    handleSubmit,
    
    // 计算属性
    isAuthenticated: isAuthenticated && !authLoading,
    authLoading,
    isClient, // 添加客户端检测状态
    
    // 清除错误
    clearFileError: () => setFileError(null),
    resetUpload
  };
}

export default function HomePage() {
  const {
    selectedFile,
    fileError,
    textInput,
    submissionState,
    isUploading,
    progress,
    uploadError,
    uploadResult,
    supportsInstantUpload,
    handleFileSelect,
    handleTextChange,
    handleSubmit,
    isAuthenticated,
    authLoading,
    isClient
  } = useLandingPageState();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-8 w-8 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">爆款解构器</h1>
            </div>
            <div className="flex items-center space-x-4">
              <nav className="hidden md:flex space-x-6">
                <Link href="#" className="text-gray-600 hover:text-gray-900">
                  功能介绍
                </Link>
                <Link href="#" className="text-gray-600 hover:text-gray-900">
                  使用指南
                </Link>
              </nav>
              
              {/* 认证组件 */}
              <div className="flex items-center space-x-2">
                <AuthButton redirectTo="/dashboard" />
                <UserAvatar showName />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">将爆款视频解构为创作框架</h2>
            <p className="text-xl text-gray-600 mb-8">为评测类内容创作者提供结构化分析 + 启发式创作的效率工具</p>
            
            {/* 认证状态提示已移除 - 现在直接跳转登录 */}
          </div>

          {/* Upload Options */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* File Upload */}
            <Card className="border-2 border-dashed border-gray-300 hover:border-indigo-400 transition-colors">
              <CardHeader className="text-center">
                <Upload className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
                <CardTitle>上传视频文件 {isClient && supportsInstantUpload ? '⚡' : ''}</CardTitle>
                <CardDescription>
                  支持 MP4, MOV, AVI 等格式，自动提取音频转文字
                  {isClient && supportsInstantUpload && (
                    <span className="block text-xs text-indigo-600 mt-1">
                      ⚡ 支持秒传功能，相同文件无需重复上传
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:bg-gray-50 cursor-pointer">
                  <input 
                    type="file" 
                    accept="video/*,.mp4,.mov,.avi"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <p className="text-gray-500 pointer-events-none">点击或拖拽文件到此处</p>
                </div>
                
                {/* 文件选择状态显示 */}
                {selectedFile && !isUploading && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-800">
                        已选择: {selectedFile.name}
                      </span>
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      文件大小: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  </div>
                )}

                {/* 文件上传状态显示 */}
                {isUploading && progress && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                      <span className="text-sm text-blue-800">
                        {progress.stage === 'hash' ? '⚙️ 计算文件指纹' : 
                         progress.stage === 'upload' ? '📤 上传文件' : 
                         progress.stage === 'completed' ? '✅ 完成' : '❌ 错误'}
                      </span>
                    </div>
                    <div className="text-xs text-blue-600 mb-1">
                      {progress.message}
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress.progress}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-blue-600 mt-1 text-right">
                      {progress.progress}%
                    </div>
                  </div>
                )}

                {/* 上传成功状态 */}
                {uploadResult && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-800">
                        {uploadResult.isInstantUpload ? 
                          '🚀 文件秒传成功！正在跳转到分析页面...' : 
                          '✅ 文件上传成功！正在跳转到分析页面...'}
                      </span>
                    </div>
                    {uploadResult.isInstantUpload && (
                      <div className="text-xs text-green-600 mt-1">
                        检测到相同文件，直接复用已上传内容
                      </div>
                    )}
                  </div>
                )}
                
                {/* 文件错误显示 */}
                {(fileError || uploadError) && (
                  <Alert className="mt-4 border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      {fileError?.message || uploadError}
                    </AlertDescription>
                  </Alert>
                )}
                
                <Button 
                  className="w-full mt-4" 
                  size="lg"
                  onClick={() => handleSubmit('file')}
                  disabled={!selectedFile || !!fileError || isUploading || submissionState.isLoading || authLoading}
                >
                  {isUploading ? '上传中...' :
                   submissionState.isLoading ? '处理中...' : 
                   !isAuthenticated ? '请先登录' : 
                   uploadResult ? '上传成功' : '开始分析视频'}
                </Button>
              </CardContent>
            </Card>

            {/* Text Input */}
            <Card className="border-2 border-gray-200 hover:border-indigo-400 transition-colors">
              <CardHeader className="text-center">
                <FileText className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
                <CardTitle>粘贴视频文案</CardTitle>
                <CardDescription>直接粘贴已有的视频文案或字幕内容</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea 
                  placeholder="请粘贴视频文案内容..." 
                  className={`min-h-[120px] resize-none ${textInput.error ? 'border-red-500' : ''}`}
                  value={textInput.value}
                  onChange={handleTextChange}
                />
                
                {/* 文案输入错误显示 */}
                {textInput.error && textInput.value.length > 0 && (
                  <Alert className="mt-4 border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      {textInput.error}
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* 文案验证成功提示 */}
                {textInput.isValid && (
                  <div className="mt-2 flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-800">文案内容已准备就绪</span>
                  </div>
                )}
                
                <Button 
                  className="w-full mt-4" 
                  size="lg"
                  onClick={() => handleSubmit('text')}
                  disabled={!textInput.isValid || submissionState.isLoading || authLoading}
                >
                  {submissionState.isLoading ? '处理中...' : 
                   !isAuthenticated ? '请先登录' : '开始分析文案'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Features Preview */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-indigo-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="font-semibold mb-2">智能解构</h3>
              <p className="text-gray-600 text-sm">自动识别信任之钩、共情之锚、价值图谱</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                <FileText className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">结构化分析</h3>
              <p className="text-gray-600 text-sm">9个维度全面解析爆款内容结构</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                <Upload className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">一键生成</h3>
              <p className="text-gray-600 text-sm">快速生成可编辑的脚本创作框架</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
