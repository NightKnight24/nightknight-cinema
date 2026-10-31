FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Ensure user 1000 has ownership for Hugging Face Spaces non-root execution
RUN chown -R 1000:1000 /app

USER 1000

# Support Hugging Face Spaces default port (7860), Render ($PORT env), or local
ENV PORT=7860
EXPOSE 7860

CMD ["node", "server.js"]
