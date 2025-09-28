// 空状态组件
'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Inbox } from 'lucide-react';
import type { EmptyStateProps } from '@/types/dashboard';

export function EmptyState({
  title = '还没有分析卡片',
  description = '创建您的第一个分析，开始构建灵感库',
  actionText = '开始分析',
  onAction
}: EmptyStateProps) {
  const handleAction = () => {
    if (onAction) {
      onAction();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[400px] w-full">
      <Card className="w-full max-w-md border-dashed border-2 border-muted-foreground/25 hover:border-primary/50 transition-all duration-300 bg-gradient-to-br from-card to-card/50">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 hover:bg-primary/20 transition-colors duration-300 group">
            <Inbox className="h-10 w-10 text-primary group-hover:scale-110 transition-transform duration-200" />
          </div>
          <CardTitle className="text-xl text-foreground">{title}</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="space-y-4">
            <Link href="/" className="inline-block">
              <Button size="lg" className="w-full sm:w-auto group hover:scale-105 transition-all duration-200">
                <Plus className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform duration-200" />
                {actionText}
              </Button>
            </Link>
            <div className="text-sm text-muted-foreground">
              <p>或者您可以：</p>
              <div className="mt-2 space-x-2">
                <Link href="/quick-fix" className="text-primary hover:underline hover:scale-105 transition-all duration-200 inline-block">
                  快速修复
                </Link>
                <span>·</span>
                <Link href="/script" className="text-primary hover:underline hover:scale-105 transition-all duration-200 inline-block">
                  脚本框架
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 