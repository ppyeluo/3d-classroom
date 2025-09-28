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

# 暴露端口
EXPOSE 3000

# 启动后端服务（根据实际启动命令调整）
CMD ["yarn", "start"]