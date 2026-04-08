FROM node:22-slim

# Install Playwright system dependencies (Chromium)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2 libxshmfence1 \
    libxfixes3 libxext6 libx11-6 libx11-xcb1 libxcb1 \
    libxcursor1 libxi6 libxtst6 libglib2.0-0 \
    fonts-noto-cjk fonts-freefont-ttf \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install all dependencies (dev deps needed for build)
COPY package.json package-lock.json* ./
RUN npm ci

# Install Playwright Chromium browser
RUN npx playwright install chromium

# Copy source and build
COPY . .
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --omit=dev

EXPOSE 3000

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

CMD ["npm", "start"]
