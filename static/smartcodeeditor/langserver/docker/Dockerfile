FROM node:20-bookworm

# Java 21 (za jdtls)
RUN apt-get update && apt-get install -y wget apt-transport-https gnupg ca-certificates && \
    wget -qO- https://packages.adoptium.net/artifactory/api/gpg/key/public \
       | gpg --dearmor -o /usr/share/keyrings/adoptium.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/adoptium.gpg] https://packages.adoptium.net/artifactory/deb bookworm main" \
       > /etc/apt/sources.list.d/adoptium.list && \
    apt-get update && apt-get install -y temurin-21-jdk && \
    rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/usr/lib/jvm/temurin-21-amd64
ENV PATH="${JAVA_HOME}/bin:${PATH}"

# clangd + osnovna orodja za C/C++
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    clangd \
    clang \
    cmake \
    build-essential \
    rsync \
    && rm -rf /var/lib/apt/lists/*

# jdtls
ARG JDTLS_VERSION=1.9.0
ARG JDTLS_DATE=202203031534
RUN mkdir -p /opt/jdtls && \
    wget -q "https://download.eclipse.org/jdtls/snapshots/jdt-language-server-latest.tar.gz" \
         -O /tmp/jdtls.tar.gz && \
    tar -xzf /tmp/jdtls.tar.gz -C /opt/jdtls && \
    rm /tmp/jdtls.tar.gz

WORKDIR /app
RUN mkdir -p /algator_lsync_root /tmp/jdtls-data

COPY js/package.json js/package-lock.json /app/
RUN npm ci --omit=dev

COPY js/server.js /app/server.js
COPY docker/start.sh /app/start.sh

# Pomembno za Windows: odstrani CRLF in nastavi pravice.
RUN sed -i 's/\r$//' /app/start.sh && chmod +x /app/start.sh

# LSP vidi samo sinhronizirano kopijo projektov.
# Originalne mape <algator_root> ne mountamo v ta container.
VOLUME ["/algator_lsync_root"]

EXPOSE 3000
CMD ["/bin/bash", "/app/start.sh"]
