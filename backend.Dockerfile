# ---------- Base Stage ----------
FROM node:20-bullseye-slim AS base

LABEL maintainer="Sohel Rana <me.sohelrana@gmail.com>"

ARG EXTRA_INSTALL_APT_PACKAGES=""
ARG UID=1000
ARG GID=1000

RUN if [ ! -z "${EXTRA_INSTALL_APT_PACKAGES}" ]; then \
      apt update && apt install -y ${EXTRA_INSTALL_APT_PACKAGES} && \
      apt clean && apt autoremove -y && rm -rf /var/lib/apt/lists/*; \
    fi

# Create app user
RUN userdel -r node && \
    groupadd --gid ${GID} appuser && \
    useradd --uid ${UID} --create-home --system --comment "AppUser" --shell /bin/bash --gid appuser appuser && \
    mkdir -p /home/appuser/appsrc && \
    chown -R appuser:appuser /home/appuser/appsrc

WORKDIR /home/appuser/appsrc

USER appuser

# Copy initial files for dependency install
COPY --chown=appuser:appuser ./package.json ./package-lock*.json ./
COPY --chown=appuser:appuser ./.env.example ./.env

# ---------- Development Stage ----------
FROM base AS dev

USER root

RUN apt-get update && apt-get install -y \
    curl libssl-dev procps telnet \
    && rm -rf /var/lib/apt/lists/*

USER appuser

RUN echo "-- Install Local NPM Packages --" && \
    npm ci --ignore-scripts --no-audit && \
    npm config rm proxy && npm config rm https-proxy && npm config rm noproxy

# Copy full source (after deps to avoid re-install on every change)
COPY --chown=appuser:appuser ./ ./

STOPSIGNAL SIGTERM

CMD [ "node", "node_modules/.bin/nest", "start", "--watch" ]
