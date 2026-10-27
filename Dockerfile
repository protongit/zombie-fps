FROM nginx:1.27-alpine

# Compatible con plataformas que ejecutan con UID aleatorio no-root (OpenShift/Knative):
# pid y cachés en rutas escribibles, sin privilegios.
RUN sed -i 's|/var/run/nginx.pid|/tmp/nginx.pid|' /etc/nginx/nginx.conf \
 && mkdir -p /var/cache/nginx /var/run \
 && chmod -R a+rwX /var/cache/nginx /var/run /var/log/nginx /tmp /etc/nginx

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY index.html /usr/share/nginx/html/index.html
COPY assets /usr/share/nginx/html/assets
COPY lib /usr/share/nginx/html/lib

EXPOSE 8123

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8123/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
