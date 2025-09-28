import type { Metadata } from 'next'
import './globals.css'
import { AuthInitializer } from '@/components/auth/AuthInitializer'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: '爆款解构器 - 将爆款视频解构为创作框架',
  description: '为评测类内容创作者提供结构化分析 + 启发式创作的效率工具',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <AuthInitializer />
        {children}
        <Toaster 
          position="top-right"
          richColors
          closeButton
          duration={4000}
        />
      </body>
    </html>
  )
}
