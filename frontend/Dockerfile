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

# Replace default Nginx server block with high-performance proxy & caching definitions
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $$uri $$uri/ /index.html;
    }

    # Static assets long-term cache headers
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        root /usr/share/nginx/html;
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        add_header X-Content-Type-Options "nosniff";
    }

    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host $$host;
        proxy_set_header X-Real-IP $$remote_addr;
        proxy_set_header X-Forwarded-For $$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $$scheme;
    }

    location /uploads {
        proxy_pass http://backend:8000;
        proxy_set_header Host $$host;
        proxy_set_header X-Real-IP $$remote_addr;
    }

    location /metrics {
        proxy_pass http://backend:8000;
        proxy_set_header Host $$host;
        proxy_set_header X-Real-IP $$remote_addr;
    }
}
EOF

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
