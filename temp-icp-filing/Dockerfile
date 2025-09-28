# 使用一个超轻量级的官方Nginx镜像
FROM nginx:alpine

# 将我们写好的index.html文件，复制到Nginx的默认网站根目录
COPY ./index.html /usr/share/nginx/html/index.html

# 暴露80端口
EXPOSE 80