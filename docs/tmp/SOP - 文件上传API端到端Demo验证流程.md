---
tags: [sop, how-to, demo, api, file-upload, cos]
creation_date: 2025-07-04
last_updated: 2025-07-04
---

# SOP - 文件上传API端到端Demo验证流程 (V2 - 临时密钥方案)

> [!info] 目标与背景
> 本SOP的目标是，在不涉及复杂前端UI的情况下，创建一个最小化的技术演示，以端到端地验证我们设计的、基于**腾讯云COS临时密钥**的“前端直传”文件上传流程是否技术上完全可行。

---
## 前提条件
- [x] 本地Docker开发环境已可通过`./start.sh`正常启动。
- [x] 腾讯云COS存储桶已创建，相关的`SecretId`和`SecretKey`已配置在根目录的`.env`文件中。
- [x] `prisma migrate dev`已成功执行，数据库中已包含`MediaFile`等相关表格。

## 操作步骤

### **第一步：实现`web`端的后端API**

#### 1.1 **创建临时密钥接口 (`credentials`)**
- **任务**: 严格按照我们最新设计的技术方案，在`10-baokuan-jieqouqi-web`项目中，创建并实现`src/app/api/uploads/credentials/route.ts`。
- **核心逻辑**:
  - 验证用户登录状态。
  - 调用`cos-nodejs-sdk-v5`中的`STS.getCredential`方法。
  - **必须**配置合理的权限策略（`policy`），例如只允许向`uploads/*`路径执行上传操作。
  - 将获取到的有时效的临时密钥（`credentials`）返回给前端。

#### 1.2 **创建上传完成通知接口 (`complete`)**
- **任务**: 在`web`项目中，创建并实现`src/app/api/uploads/complete/route.ts`。
- **核心逻辑**: (此部分逻辑与之前方案一致)
  - 验证用户登录状态并接收`mediaFileId`。
  - 更新`MediaFile`表中的记录状态。
  - 调用`ai`协处理器的`/api/v1/analyze`接口，异步触发分析任务。

### **第二步：实现`ai`端的模拟接口**

#### 2.1 **创建模拟分析接口 (`analyze`)**
- **任务**: 在`11-baokuan-jieqouqi-ai`项目中，实现`/analyze`端点。
- **核心逻辑**: (此部分逻辑与之前方案一致)
  - 接收请求并在控制台打印日志 `INFO: Received analysis task for mediaFileId: [id]`。
  - 立即返回`200 OK`响应。

### **第三步：创建前端Demo验证页面**

#### 3.1 **安装前端SDK**
- **任务**: 在`10-baokuan-jieqouqi-web`目录下，运行`pnpm add cos-js-sdk-v5`。

#### 3.2 **编写页面UI和逻辑**
- **任务**: 创建`src/app/demo/upload/page.tsx`。
- **UI**: 页面上只需要一个HTML元素：`<input type="file" />`。
- **逻辑**:
  1.  为`input`元素添加`onChange`事件监听器。
  2.  当用户选择文件后，在`onChange`函数中执行以下操作：
      a.  向我们的后端`/api/uploads/credentials`发起`POST`请求，获取**临时的密钥**。
      b.  使用获取到的临时密钥，**在前端初始化一个新的COS SDK实例**。
      c.  使用这个前端COS实例的`putObject`方法，将文件（`Body: file`）上传。
      d.  在`putObject`成功的回调函数中，再向我们的后端`/api/uploads/complete`发起`POST`请求。
      e.  在浏览器的开发者控制台打印出每一步的状态。

## 验证方法
- [ ] 启动本地开发环境 (`./start-dev.sh`)。
- [ ] 在浏览器中打开 `http://localhost:3000/demo/upload` 页面。
- [ ] 打开浏览器的“开发者工具”，切换到“网络(Network)”面板。
- [ ] 通过页面上的`<input>`选择一个视频文件。
- [ ] **观察网络面板**:
    - [ ] 应能看到一个对`/api/uploads/credentials`的`POST`请求成功（状态200），其响应内容应包含`tmpSecretId`等密钥信息。
    - [ ] 紧接着，应能看到一个对`*.cos.ap-guangzhou.myqcloud.com`（腾讯云COS地址）的`PUT`或`POST`请求成功（状态200或204）。
    - [ ] 最后，应能看到一个对`/api/uploads/complete`的`POST`请求成功（状态200）。
- [ ] **检查数据库**: 查询`MediaFile`表，确认已创建了对应的记录。
- [ ] **检查AI服务日志**: 运行`docker logs fast_api_service`，应能看到“Received analysis task...”的日志输出。

## 常见问题
- **问题**: 上传到COS时出现CORS（跨域）错误。
- **解决方案**: 登录腾讯云COS控制台，找到对应的存储桶（Bucket），进入“安全管理” -> “跨源访问CORS设置”，添加一条规则，来源（Origin）填写`http://localhost:3000`，允许的方法选择`PUT`, `POST`。