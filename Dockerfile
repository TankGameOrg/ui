FROM node:20-alpine AS frontend

# Install frontend build dependencies
COPY frontend/package*.json /build/frontend/
RUN cd /build/frontend && npm ci

# Build frontend
ARG BUILD_INFO
COPY frontend/ /build/frontend/
COPY common/ /build/common/
RUN cd /build/frontend && ls /build/* && npm run build

FROM docker.io/openjdk:21-jdk-bookworm AS engine
WORKDIR /build/

RUN apt-get update && \
    apt-get install -y --no-install-recommends maven git && \
    rm -rf /var/lib/apt/lists/*

# Pin the included tank game engine to the last compatible version
ARG ENGINE_VERSION=4b980b600a9b12ff961fe818cd8d549e3faa694e

# Build tank game engine to be included with the default image
RUN --mount=type=cache,target=/root/.m2 \
    git clone https://github.com/TrevorBrunette/tankgame.git && \
    cd tankgame && \
    git checkout "${ENGINE_VERSION}" && \
    mvn package && \
    cd target && \
    # Rename the executable to include the git hash for easy debugging \
    mv $(echo TankGame-*.jar) "$(basename $(echo TankGame-*.jar) .jar)-$(git rev-parse --short HEAD)".jar

FROM node:20-alpine

WORKDIR /app/backend

# Install java for the entine
RUN apk --no-cache --update add openjdk21-jre-headless

# Install backend dependencies
COPY backend/package*.json /app/backend/
RUN npm ci

ARG BUILD_INFO
ENV BUILD_INFO=${BUILD_INFO}

# Copy everything over to the final image
COPY backend/ /app/backend/
COPY common/ /app/common/
COPY --from=frontend /build/frontend/dist/ /app/www/
COPY --from=engine /build/tankgame/target/TankGame-*.jar /app/engine/

# Place some sample data in /data so users can try out the app
COPY example/*.json /data/games/

ENV TANK_GAMES_FOLDER=/data

CMD ["/usr/local/bin/npm", "start"]
