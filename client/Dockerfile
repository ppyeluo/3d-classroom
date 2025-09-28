# 基于 Node.js 镜像
FROM node:lts-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 yarn.lock
COPY package.json yarn.lock./

# 使用 yarn 安装依赖
RUN yarn install --frozen-lockfile

# 复制项目代码
COPY . .

# 构建生产版本
RUN yarn build

# 暴露端口
EXPOSE 5173

# 启动预览服务
CMD ["yarn", "preview"]