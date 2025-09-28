import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

/**
 * 分析卡片编辑页面加载状态
 */
export default function Loading() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 导航区域骨架 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-20" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>

      {/* 表单头部骨架 */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>

      {/* 字段区块骨架 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="w-full">
            <CardContent className="p-6 space-y-6">
              {/* 区块标题 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <Skeleton className="h-4 w-full" />
              </div>

              {/* 字段骨架 */}
              {[1, 2, 3].map((j) => (
                <div key={j} className="space-y-2">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 底部控制栏骨架 */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-md">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-9 w-16" />
      </div>
    </div>
  );
}