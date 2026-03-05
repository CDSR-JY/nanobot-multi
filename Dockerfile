# 使用 uv 官方镜像作为基础 (基于 Debian Bookworm)
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

# ---------------------------------------------------------
# 1. 系统级优化：替换 APT 源为阿里云 (直连)
# ---------------------------------------------------------
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources && \
    sed -i 's/security.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources && \
    sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list 2>/dev/null || true

# ---------------------------------------------------------
# 2. 安装基础工具 & Node.js 20 (直连阿里云)
# ---------------------------------------------------------
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl iputils-ping tmux gh ca-certificates gnupg git openssh-client && \
    mkdir -p /etc/apt/keyrings && \
    # 下载 NodeSource 密钥 (如果直连失败，可尝试使用国内镜像源替代 nodesource，这里先试直连)
    # 备选方案：如果下面 curl 失败，可以使用 cnpmjs 或其他国内源替代 nodejs 安装方式
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" > /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends nodejs && \
    apt-get purge -y gnupg && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------
# 3. 配置 NPM 全局使用淘宝镜像 (关键！无需代理)
# ---------------------------------------------------------
RUN npm config set registry https://registry.npmmirror.com && \
    npm config set fetch-retries 5 && \
    npm config set fetch-timeout 120000

# ---------------------------------------------------------
# 4. 安装全局 npm 工具 (走淘宝镜像)
# ---------------------------------------------------------
RUN npm i -g @steipete/summarize
RUN npm install -g agent-browser
RUN agent-browser install

# ---------------------------------------------------------
# 5. 优化 Playwright 依赖安装 (直连阿里云)
# ---------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libdbus-1-3 libxkbcommon0 libatspi2.0-0 libxcomposite1 libxdamage1 \
    libxfixes3 libxrandr2 libgbm1 libasound2 libpango-1.0-0 libcairo2 \
    libglib2.0-0 libx11-6 libxcb1 libxext6 libxrender1 libxtst6 \
    libgtk-3-0 libharfbuzz0b libpangocairo-1.0-0 libwebp7 \
    fonts-noto-color-emoji fonts-unifont xfonts-scalable fonts-liberation \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
# 安装浏览器二进制 (Playwright 会尝试从微软 CDN 下载，如果太慢可能需要代理)
# 尝试设置 Playwright 使用国内镜像源 (如果支持) 或直连
RUN npx playwright install chromium

# ---------------------------------------------------------
# 6. 设置工作目录 & 安装 Python 依赖
# ---------------------------------------------------------
WORKDIR /app

COPY pyproject.toml README.md LICENSE ./
RUN mkdir -p nanobot bridge && touch nanobot/__init__.py && \
    uv pip install --system --no-cache . && \
    rm -rf nanobot bridge

COPY nanobot/ nanobot/
COPY bridge/ bridge/
RUN uv pip install --system --no-cache .

# ---------------------------------------------------------
# 7. 构建 WhatsApp Bridge
#    - Git SSH 转 HTTPS (防止需要密钥)
#    - 依然使用淘宝 npm 镜像
#    - 【重要】不再设置代理环境变量，完全直连
# ---------------------------------------------------------
WORKDIR /app/bridge
COPY bridge/package.json ./

RUN git config --global url."https://github.com/".insteadOf ssh://git@github.com/ && \
    git config --global url."https://github.com/".insteadOf git@github.com: && \
    # 确保 npm 配置依然是淘宝源
    npm config set registry https://registry.npmmirror.com && \
    npm install --loglevel info

COPY bridge/ ./
RUN npm run build

# ---------------------------------------------------------
# 8. 最终配置 & 启动
# ---------------------------------------------------------
WORKDIR /app

RUN mkdir -p /root/.nanobot
COPY marketplaces.json /root/.nanobot/marketplaces.json

EXPOSE 18790

ENTRYPOINT ["nanobot"]
CMD ["status"]