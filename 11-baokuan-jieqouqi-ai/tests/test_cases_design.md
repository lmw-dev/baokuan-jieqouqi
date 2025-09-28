# TOM-217 测试用例设计

## 核心测试用例设计 (第0步要求)

### 1. API端点测试用例

#### 1.1 POST /cards/{card_id}/generate-script
**输入**:
```json
{
  "card_id": "550e8400-e29b-41d4-a716-446655440000",
  "style_config": {
    "tone": "casual",
    "target_audience": "18-35岁年轻人"
  }
}
```

**期望输出**:
```json
{
  "success": true,
  "data": {
    "id": "generated-uuid",
    "card_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "AI生成脚本框架",
    "status": "draft",
    "sections": [
      {
        "id": "section-uuid-1",
        "section_type": "hook",
        "title": "开场钩子 (0-15秒)",
        "content": "生成的钩子内容...",
        "tips": ["创作提示1", "创作提示2"],
        "order_index": 1
      }
    ],
    "created_at": "2025-07-12T...",
    "updated_at": "2025-07-12T..."
  }
}
```

#### 1.2 GET /scripts/{script_id}
**输入**: script_id + 用户认证
**期望输出**: 完整脚本详情
**权限测试**: 非所有者访问应返回403

#### 1.3 PUT /scripts/{script_id}
**输入**:
```json
{
  "title": "更新后的标题",
  "sections": [
    {
      "section_type": "hook",
      "title": "修改后的钩子",
      "content": "修改后的内容..."
    }
  ]
}
```
**期望输出**: 更新后的脚本详情

#### 1.4 DELETE /scripts/{script_id}
**期望输出**: 
```json
{
  "success": true,
  "message": "脚本删除成功"
}
```

#### 1.5 GET /scripts/{script_id}/export?format=markdown
**期望输出**: StreamingResponse with markdown content

#### 1.6 POST /scripts/{script_id}/copy
**期望输出**: 
```json
{
  "success": true,
  "data": {
    "content": "复制的脚本内容...",
    "format": "txt"
  }
}
```

### 2. 权限验证测试用例

#### 2.1 用户隔离测试
- 用户A创建脚本，用户B尝试访问 → 应返回403
- 用户A创建脚本，用户A访问 → 成功返回数据

#### 2.2 未认证访问测试
- 所有API端点不提供认证Token → 应返回401

### 3. 数据库操作测试用例

#### 3.1 脚本创建测试
**输入**: AnalysisCard ID + User ID
**期望结果**: 
- scripts表创建1条记录
- script_sections表创建5条记录(hook/problem/solution/proof/cta)
- script_edit_history表创建1条创建记录

#### 3.2 脚本更新测试
**输入**: 修改section内容
**期望结果**:
- script_sections表更新对应记录
- script_edit_history表新增修改记录

#### 3.3 脚本删除测试
**期望结果**:
- scripts表记录被删除
- 关联的script_sections记录级联删除
- script_edit_history记录保留(历史审计)

### 4. 错误处理测试用例

#### 4.1 业务错误测试
- 不存在的card_id → 404 Not Found
- 不存在的script_id → 404 Not Found
- 权限不足 → 403 Forbidden

#### 4.2 系统错误测试
- TOM-216算法调用失败 → 500 Internal Server Error
- 数据库连接失败 → 500 Internal Server Error

### 5. 性能测试用例

#### 5.1 响应时间测试
- 脚本生成API < 30秒
- 查询API < 2秒
- 更新API < 2秒
- 导出API < 5秒

#### 5.2 并发测试
- 10个并发请求同时生成脚本
- 期望: 所有请求成功，无数据冲突

### 6. 导出功能测试用例

#### 6.1 TXT格式导出
**期望输出**:
```
脚本标题：AI生成脚本框架

一、开场钩子 (0-15秒)
生成的钩子内容...

二、痛点共鸣 (15-45秒)
生成的问题内容...
...
```

#### 6.2 Markdown格式导出
**期望输出**:
```markdown
# AI生成脚本框架

## 一、开场钩子 (0-15秒)
生成的钩子内容...

## 二、痛点共鸣 (15-45秒)
生成的问题内容...
...
```

#### 6.3 JSON格式导出
**期望输出**: 完整的脚本数据JSON格式

### 7. 边界条件测试用例

#### 7.1 空数据测试
- 空的section内容
- 空的tips数组
- null值处理

#### 7.2 长度限制测试
- 超长标题 (>255字符)
- 超长内容 (>10000字符)
- 大量sections (>100个)

### 8. 集成测试用例

#### 8.1 端到端流程测试
1. 调用生成API创建脚本
2. 调用查询API验证数据
3. 调用更新API修改内容
4. 调用导出API验证格式
5. 调用删除API清理数据

#### 8.2 TOM-216集成测试
- Mock TOM-216算法返回预期数据
- 验证数据映射正确性
- 验证错误处理机制

## 测试覆盖率目标

- **单元测试覆盖率**: ≥ 80%
- **集成测试覆盖率**: ≥ 70%
- **API端点覆盖率**: 100% (所有6个端点)
- **权限验证覆盖率**: 100%
- **错误场景覆盖率**: ≥ 90%

## Mock数据准备

### Mock AnalysisCard数据
```python
mock_analysis_card = {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "version_title": "测试分析卡片",
    "hook_copy": "吸引人的开场",
    "core_idea": "核心理念",
    "argument_case": "论证案例",
    "value_delivery": ["价值点1", "价值点2"],
    "source_id": "source-uuid",
    "created_at": "2025-07-12T..."
}
```

### Mock User数据
```python
mock_user = {
    "id": "user-uuid-1",
    "name": "测试用户",
    "email": "test@example.com",
    "logto_id": "logto-123"
}
```

### Mock ScriptFramework数据
```python
mock_script_framework = {
    "title": "AI生成脚本框架",
    "hook": ScriptSection(title="开场钩子", content="钩子内容..."),
    "problem": ScriptSection(title="痛点共鸣", content="问题内容..."),
    "solution": ScriptSection(title="解决方案", content="方案内容..."),
    "proof": ScriptSection(title="价值证明", content="证明内容..."),
    "cta": ScriptSection(title="行动召唤", content="召唤内容...")
}
```