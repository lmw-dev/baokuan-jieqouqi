# 使用一个轻量的Python官方镜像
FROM python:3.11-slim

# 使用国内镜像源并安装系统依赖 (包括ffmpeg用于视频处理)
RUN sed -i 's/deb.debian.org/mirrors.ustc.edu.cn/g' /etc/apt/sources.list.d/debian.sources && \
    apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# 设置工作目录
WORKDIR /code

# 复制依赖清单文件
COPY requirements.txt .

# 安装依赖
# --no-cache-dir 选项可以减小镜像体积
# +++ 修改后的配置 +++
RUN pip install --no-cache-dir --upgrade -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 复制所有源代码到工作目录
COPY . .

# 暴露我们API服务运行的端口
EXPOSE 8000

# 容器启动时运行的命令
# --host 0.0.0.0 确保容器外的请求可以访问
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
