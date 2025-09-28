# TOM-216:task:AI脚本生成核心算法实现

**模块**: Feature: MVP-CoreValue  
**创建日期**: 2025-07-12  
**状态**: ✅ 已完成  

---

## 🎯 **快速决策摘要** (Quick Decision Summary)

### 业务决策
- **优先级**: 🔴 高
- **核心价值**: 基于TOM-220 AI引擎，实现分析卡片到脚本框架的智能转换，构建"人机协同"创作工作流的关键算法
- **用户影响**: 内容创作者能一键将爆款视频分析转化为可编辑的脚本框架，大幅提升创作效率和质量

### 技术决策
- **实现方式**: 复用TOM-220的prompt管理和AI服务架构，扩展脚本生成专用算法模块
- **时间预估**: 2-3天（算法设计1天 + 实现1天 + 测试优化1天）
- **风险点**: 
  - Prompt模板设计质量直接影响生成效果
  - 字段映射逻辑需要确保准确性
  - AI服务调用的稳定性和性能

---

## 🔑 **人机分工清单** (Human-AI Division)

### 👨‍💼 **人类负责** (Human Tasks)

**🎯 战略层面**:
- [x] 确认五段式脚本框架的业务逻辑和时间分配
- [x] 定义分析卡片字段到脚本段落的映射策略  
- [x] 验证TOM-220 prompt管理系统的复用方案

**🔧 准备工作**:
- [x] 确保TOM-220 AI分析引擎正常运行并可调用
- [x] 确认现有prompt管理器的扩展接口和使用方法
- [x] 准备测试用的AnalysisCard数据和期望的脚本输出
- [x] 验证AI服务工厂和DeepSeek API的可用性

**📋 验收确认**:
- [x] 验证生成的脚本框架内容质量和结构完整性
- [x] 确认字段映射逻辑的准确性和业务合理性
- [x] 测试不同风格和长度配置的生成效果
- [x] 验证与TOM-220架构的集成兼容性

### 🤖 **AI负责** (AI Tasks)

**💻 代码实现**:
- 根据TOM-220架构模式实现脚本生成服务
- 遵循项目编码规范和模块化设计原则
- **编写完整的单元测试和集成测试**
- **确保测试覆盖率达到80%以上**

**🧪 测试验证**:
- **编写并执行所有单元测试**
- **确保100%测试通过率**
- **验证prompt模板加载和AI服务调用**
- **生成测试覆盖率报告**

**📝 文档输出**:
- prompt模板文档和使用说明
- **测试报告和覆盖率数据**
- 算法实现过程记录
- 字段映射逻辑文档

**✅ 质量保证**:
- **运行FastAPI应用验证无错误**
- **运行测试套件验证 (pytest)**
- **修复所有linter错误**
- **完成Linear Issue中的验收清单**

---

## 📦 **AI指令包** (AI Instruction Package)
*当人类准备工作完成后，将此包作为完整指令交给AI执行*

### 🎯 **执行目标**
```
基于TOM-220已实现的AI分析引擎和prompt管理系统，创建专门的脚本生成算法模块(script_generator.py)，实现将AnalysisCard结构化数据智能转换为五段式脚本框架(开场钩子→痛点共鸣→解决方案→价值证明→行动召唤)，每个段落包含内容和创作要点。
```

### 📝 **业务背景**
```
TOM-203要实现"一键生成脚本框架"功能，让内容创作者能基于爆款视频分析快速生成可编辑的脚本大纲。TOM-220已提供了完整的AI分析引擎和prompt管理基础设施，现在需要扩展专门的脚本生成算法，构建从"分析输入"到"创作输出"的核心价值链。
```

### 🔧 **技术约束**
```
1. 必须严格复用TOM-220的架构模式(prompt管理、AI服务、错误处理)
2. 创建5个专门的脚本生成prompt模板，确保生成内容的连贯性
3. 实现字段映射策略：hookCopy+hookTypes→钩子，coreIdea+argumentCase→痛点等
4. 遵循FastAPI项目结构，使用Pydantic数据验证
5. 集成现有的DeepSeek AI服务和错误重试机制
6. 生成结果必须包含创作要点和时间安排指导
```

### 🗂️ **上下文引用**
```
@docs/development/TOM-220-dev-ai-analysis-engine-three-stage-formula.md
@11-baokuan-jieqouqi-ai/app/services/prompts/manager.py
@11-baokuan-jieqouqi-ai/app/services/ai/factory.py
@11-baokuan-jieqouqi-ai/app/services/analysis/orchestrator.py
@11-baokuan-jieqouqi-ai/app/models/analysis.py
@.cursor/rules/010-gen-coding-standards.mdc
@.cursor/rules/020-gen-typescript-best-practices.mdc
```

### ✅ **验收标准**
```
1. 成功创建app/services/analysis/script_generator.py脚本生成服务
2. 创建5个脚本生成prompt模板(hook/problem/solution/proof/cta_generator.md)
3. 实现generate_script_framework主函数，支持完整的数据转换
4. 单元测试覆盖率≥80%，包含prompt加载、AI调用、数据转换测试
5. 集成测试验证完整生成流程，从AnalysisCard到ScriptFramework
6. 生成的脚本包含完整五段式结构和创作要点
7. 错误处理完整，包括AI API失败、数据格式错误等场景
8. 与TOM-220的prompt管理器和AI服务完全兼容
```

### 📊 **成功指标**
```
1. 脚本生成成功率 > 95%
2. 字段映射准确率 = 100%
3. 生成内容质量评分 ≥ 4.0/5.0 (基于业务逻辑合理性)
4. API响应时间 < 30秒
5. 测试覆盖率 ≥ 80%
6. 所有prompt模板加载成功率 = 100%
7. 与现有AI服务架构集成无冲突
```

---

## 🔗 **文档链接** (Document Links)

- **开发文档**: `docs/development/TOM-216-dev-ai-script-generation-algorithm.md`
- **提示文档**: `docs/prompts/TOM-216.prompt.ai-script-generation-algorithm.md`
- **Linear Issue**: https://linear.app/tomorrow-persistence/issue/TOM-216/task-【ai】设计并实现脚本生成的核心算法

---

## 📈 **执行记录** (Execution Log)

### 时间记录
- **开始时间**: 2025-07-12 09:00
- **完成时间**: 2025-07-12 15:34
- **实际耗时**: 6.5小时

### 决策记录
| 时间 | 决策内容 | 原因 | 影响 |
|------|----------|------|------|
| 2025-07-12 | 复用TOM-220架构而非独立实现 | 保持技术一致性，避免重复造轮子 | 减少开发时间，提高系统稳定性 |
| 2025-07-12 | 设计5个独立的prompt模板 | 确保每个脚本段落的专业性和针对性 | 提升生成内容质量和结构完整性 |
| 2025-07-12 | 实现字段映射策略而非直接转换 | 确保分析数据到脚本内容的逻辑合理性 | 提高脚本的商业价值和实用性 |

### 完成确认
- [x] 功能验收通过
- [x] 质量标准达标
- [x] 文档更新完成

---

**📋 使用说明**: 本文档专注于快速决策和人机分工，技术实现细节请参考提示文档，完整过程记录请参考开发文档。