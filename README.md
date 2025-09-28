# 3D-Classroom (立体课堂) - 中小学教师 3D 教学资源平台
### 定位：专为中小学教师设计的 3D 教学资源平台，解决抽象知识教学难问题，让 3D 素材 “零门槛获取、一键即用”。
### 🌟  项目简介
在物理 “杠杆原理”、数学 “立体几何”、生物 “细胞结构” 等教学场景中，传统黑板画图或静态图片难以让学生理解抽象概念。「立体课堂」通过 “AI 生成 + 素材市场 + 基础编辑” 三大核心能力，帮助教师：
- 无需建模基础：通过 “文本描述” 或 “图片上传” 快速生成教学用 3D 模型
- 高效获取素材：在素材市场浏览、下载适配教材的免费 3D 资源
- 简单编辑适配：对模型添加知识点标注、调整展示效果，直接用于课堂演示
- 核心价值：降低 3D 教学资源使用门槛，让 “直观化教学” 覆盖每一间中小学教室。
- 
#### 🛠️ 技术栈
##### 前端技术栈：
| 技术             | 描述                       |
| ---------------- | -------------------------- |
|  **React 18**   | 组件化构建 UI，核心库（如 Header/ModelModal 等组件复用） |
|  **TypeScript** | 静态类型定义，减少运行时错误 |
|  **Vite**  | 项目构建与热更新，开发环境启动速度快（≤3 秒）            |
|  **Three.js**     | 模型加载与交互（GLB 格式解析、相机控制）   |
|  **Ant Design**    | UI 组件库（表单 / 弹窗 / 按钮等），适配教学场景视觉风格             |
|  **Zustand**     | 高性能Web服务器与反向代理    |
|  **Axios**  | HTTP 请求封装，统一处理 Token 拦截、错误提示 |

##### 后端技术栈：
| 技术             | 描述                       |
| ---------------- | -------------------------- |
|  **NestJS**   | 组件化构建 UI，核心库（如 Header/ModelModal 等组件复用） |
|  **TypeORM** | ORM 框架，用 TypeScript 类定义数据库实体 |
|  **PostgreSQL**  | 关系型数据库，存储用户 / 模型 / 素材数据            |
|  **Redis**     | Redis：缓存热点数据（素材列表）；Bull：异步处理模型生成状态轮询）   |
|  **七牛云 SDK**    | 对象存储，存储 3D 模型 / 图片，CDN 加速提升加载速度             |
|  **Zustand**     | 高性能Web服务器与反向代理    |
|  **Axios**  | HTTP 请求封装，统一处理 Token 拦截、错误提示 |
### 🚀 核心功能（已实现）
#### 3D 模型生成	
- 文本生成：支持选择学科（物理 / 数学等）、教学模块，自动优化提示词
- 图片生成：支持 WebP/PNG/JPEG 上传，8 种风格可选（卡通 / 黏土等）
- 历史记录：查询个人生成的模型，支持下载	
#### 素材市场	
- 素材展示：卡片式呈现（含下载量 / 上传时间）
- 3D 预览
#### 用户系统	
- 身份认证：手机号注册 / 登录，JWT
- 个人中心：查看 / 编辑学科、学段信息

#### ⚡ 快速开始（本地部署）
##### 1. 前置依赖
确保本地安装以下环境：
Node.js ≥ 22.19.0
Yarn ≥ 1.22.0 或 npm ≥ 9.0.0
PostgreSQL ≥ 14.0（推荐 16.1）
Redis ≥ 6.0（推荐 7.2.3）
##### 2. 项目克隆
###### 克隆仓库
```bash 
git clone https://github.com/ppyeluo/3d-classroom.git
cd 3d-classroom
```
##### 3前端部署（client 目录）
###### 3.1安装依赖
```bash
cd client
yarn install
# 或 npm install
```
###### 3.2 配置环境变量
在 client/.env 文件中添加以下配置：
```bash
# 后端API基础地址（本地开发默认）
VITE_API_BASE_URL=http://localhost:3000
```
3.3 启动开发环境
```bash
yarn dev
# 或 npm run dev
```
前端服务默认运行在：http://localhost:5173
访问后可看到登录 / 注册页面，正常加载即部署成功
##### 4. 后端部署（server 目录）
###### 4.1 安装依赖
```bash
# 返回项目根目录，进入server
cd ../server
yarn install
# 或 npm install
```
###### 4.2 配置环境变量
在 server/.env 文件中添加以下配置（替换为你的服务信息）：
```bash
# 服务配置
PORT=3000
NODE_ENV=development

# JWT配置
JWT_SECRET=3d_classroom_jwt_secret_2024  # 自定义密钥
JWT_EXPIRES_IN=7d

# PostgreSQL配置
DB_HOST=localhost          # 数据库地址
DB_PORT=5432               # 数据库端口
DB_USER=postgres           # 数据库用户名
DB_PASSWORD=你的数据库密码  # 数据库密码
DB_NAME=3d_classroom       # 数据库名称（需提前创建）

# Redis配置
REDIS_HOST=localhost        # Redis地址
REDIS_PORT=6379             # Redis端口
REDIS_PASSWORD=             # Redis密码（无则留空）

# 七牛云配置
QINIU_ACCESS_KEY=你的七牛AccessKey
QINIU_SECRET_KEY=你的七牛SecretKey
QINIU_BUCKET=你的七牛存储空间名
QINIU_DOMAIN=你的七牛CDN域名

# Tripo3D API配置
TRIPO3D_API_KEY=你的Tripo3D_API_Key
TRIPO3D_API_URL=https://api.tripo3d.ai/v2/openapi/task

# 素材上传配置
ASSET_UPLOAD_PATH=./uploads/3d-assets
ALLOWED_3D_FORMATS=glb,gltf,obj
MAX_3D_FILE_SIZE=50
```
###### 4.3 初始化数据库
打开 PostgreSQL 客户端，创建数据库：
```bash
CREATE DATABASE 3d_classroom;
```
启动后端服务，TypeORM 会自动同步表结构（开发环境）：
```bash
yarn start:dev
# 或 npm run start:dev
```
###### 4.4 验证后端服务
后端 API 默认运行在：http://localhost:3000/api
API 文档（Swagger）地址：http://localhost:3000/api/docs
访问文档能看到所有接口列表，说明后端启动成功