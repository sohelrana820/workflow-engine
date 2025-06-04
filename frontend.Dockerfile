FROM node:20-bullseye-slim AS base

LABEL maintainer="Sohel Rana <me.sohelrana@gmail.com>"

USER root

ARG EXTRA_INSTALL_APT_PACKAGES=""

RUN if [ ! -z "${EXTRA_INSTALL_APT_PACKAGES}" ]; then \
        apt update \
        && apt install -y ${EXTRA_INSTALL_APT_PACKAGES} \
        && apt clean -y \
        && apt autoremove -y \
        && rm -rf /var/lib/apt/lists/* \
    ;fi

ARG UID="1000"
ARG GID="1000"

RUN userdel -r node \
    && groupadd --gid ${GID} appuser \
    && useradd --uid ${UID} --create-home --system --comment "AppUser" --shell /bin/bash --gid appuser appuser \
    && mkdir -p /home/appuser/appsrc \
    && chown -R appuser:appuser /home/appuser/appsrc

WORKDIR /home/appuser/appsrc

COPY --chown=appuser:appuser ./package.json ./package-lock*.json ./
COPY --chown=appuser:appuser ./.env.example ./.env

USER appuser

######################################################

FROM base AS dev

USER root

RUN apt-get update \
    && apt-get install -y curl libssl-dev procps telnet\
    && rm -rf /var/lib/apt/lists/*

USER appuser

RUN echo "-- Install Local NPM Packages --" \
        && npm ci --ignore-scripts --no-audit \
    && echo "-- Remove NPM Proxy --" \
        && npm config rm proxy \
        && npm config rm https-proxy \
        && npm config rm noproxy \
    && echo "-- Remove ENV Proxy --"

COPY --chown=appuser:appuser ./ ./

STOPSIGNAL SIGTERM

CMD ["npm", "start"]

######################################################

FROM base AS prod

COPY --chown=appuser:appuser --from=builder /home/appuser/appsrc/node_modules ./node_modules
COPY --chown=appuser:appuser --from=builder /home/appuser/appsrc/dist ./dist
COPY --chown=appuser:appuser --from=builder /home/appuser/appsrc/package.json /home/appuser/appsrc/package-lock.json ./

# Unset ENVs
ENV http_proxy="" \
    https_proxy="" \
    no_proxy=""

STOPSIGNAL SIGTERM

CMD [ "node" ]