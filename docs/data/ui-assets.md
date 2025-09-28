# TOM-201 UI图标和素材清单

## 🎨 需要的图标资源

### 1. 工作台相关图标
- **📊 工作台图标**: `LayoutDashboard` (来自 lucide-react)
- **📝 分析卡片图标**: `FileText` (来自 lucide-react) 
- **➕ 新建按钮图标**: `Plus` (来自 lucide-react)
- **📅 时间图标**: `Calendar` (来自 lucide-react)
- **🏷️ 标签图标**: `Tag` (来自 lucide-react)

### 2. 状态图标
- **📭 空状态图标**: `Inbox` (来自 lucide-react)
- **🔄 加载图标**: `Loader2` (来自 lucide-react) 
- **⚠️ 错误图标**: `AlertCircle` (来自 lucide-react)
- **✅ 成功图标**: `CheckCircle` (来自 lucide-react)

### 3. 交互图标
- **👆 点击图标**: `MousePointer` (来自 lucide-react)
- **🔗 跳转图标**: `ExternalLink` (来自 lucide-react)
- **👁️ 查看图标**: `Eye` (来自 lucide-react)
- **✏️ 编辑图标**: `Edit3` (来自 lucide-react)

## 🎨 颜色主题

### 工作台主色调
```css
/* 主色调 - 蓝色系 */
--primary: 220 13% 91%;        /* 浅蓝背景 */
--primary-foreground: 220 9% 46%;  /* 深蓝文字 */

/* 卡片强调色 */
--card-accent: 216 12% 84%;    /* 卡片边框 */
--card-hover: 214 32% 91%;     /* 悬停效果 */
```

### 状态颜色
```css
/* 成功状态 - 绿色 */
--success: 142 76% 36%;
--success-light: 142 69% 58%;

/* 警告状态 - 橙色 */  
--warning: 38 92% 50%;
--warning-light: 38 100% 67%;

/* 错误状态 - 红色 */
--error: 0 84% 60%;
--error-light: 0 93% 94%;
```

## 📐 布局规格

### 卡片尺寸
```css
/* 分析卡片 */
.analysis-card {
  min-height: 180px;
  max-width: 360px;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* 卡片标题 */
.card-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 8px;
}

/* 卡片副标题 */
.card-subtitle {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 12px;
}
```

### 网格布局
```css
/* 响应式网格 */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  padding: 20px 0;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .cards-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
```

## 🌟 动画效果

### 卡片悬停效果
```css
.analysis-card {
  transition: all 0.2s ease-in-out;
}

.analysis-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}
```

### 加载动画
```css
.loading-skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

## 🖼️ 空状态插图

### 空状态文案
```
标题：还没有分析卡片
副标题：创建您的第一个分析，开始构建灵感库
按钮：+ 开始分析
```

### 空状态布局
```
     📭
  还没有分析卡片
 创建您的第一个分析，开始构建灵感库
    [+ 开始分析]
```

## 📱 响应式断点

```css
/* 断点定义 */
--mobile: 640px;
--tablet: 768px; 
--desktop: 1024px;
--wide: 1280px;
```

## 使用说明

所有图标都使用 `lucide-react` 库，确保一致性和可维护性。
颜色值遵循 Tailwind CSS 的设计理念。
动画效果保持轻量，不影响性能。 