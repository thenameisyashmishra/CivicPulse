# Multi-stage frontend dockerization
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Server stage using lightweight Nginx container
FROM nginx:alpine

# Copy built bundles from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Replace default Nginx server block with proxy definitions
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $$uri $$uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host $$host;
        proxy_set_header X-Real-IP $$remote_addr;
    }

    location /uploads {
        proxy_pass http://backend:8000;
        proxy_set_header Host $$host;
        proxy_set_header X-Real-IP $$remote_addr;
    }
}
EOF

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
