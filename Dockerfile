FROM node:20-bullseye-slim

# Install Chromium dependencies for headless puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    PORT=7860

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 7860
CMD ["node", "index.js"]
