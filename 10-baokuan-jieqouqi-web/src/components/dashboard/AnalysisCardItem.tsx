// 分析卡片组件
'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, Tag } from 'lucide-react';
import type { AnalysisCardItemProps } from '@/types/dashboard';

export function AnalysisCardItem({ card, onClick }: AnalysisCardItemProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(card);
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDateTimestamp = (date: Date | string) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.getTime();
  };

  return (
    <Link href={`/analysis?card=${card.id}`} className="block group">
      <Card className="h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-2 cursor-pointer border-2 border-transparent hover:border-primary/20 bg-gradient-to-br from-card to-card/50">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors duration-200">
                <FileText className="h-5 w-5 text-primary group-hover:scale-110 transition-transform duration-200" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base font-semibold line-clamp-2 group-hover:text-primary transition-colors duration-200">
                  {card.versionTitle}
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-1 line-clamp-1">
                  {card.sourceTitle}
                </CardDescription>
              </div>
            </div>
            {card.analysisType && (
              <Badge variant="secondary" className="flex-shrink-0 ml-2 group-hover:scale-105 transition-transform duration-200">
                {card.analysisType}
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3">
            {/* 创建时间 */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(card.createdAt)}</span>
            </div>

            {/* 标签 */}
            {card.tags && card.tags.length > 0 && (
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-wrap gap-1">
                  {card.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {card.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{card.tags.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* 更新时间（如果不同于创建时间） */}
            {getDateTimestamp(card.updatedAt) !== getDateTimestamp(card.createdAt) && (
              <div className="text-xs text-muted-foreground">
                更新于 {formatDate(card.updatedAt)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
} 