FROM node:20-alpine AS frontend

# Install build dependencies
COPY package*.json /build/
RUN apk add --update --no-cache bash && cd /build/ && npm ci

# Build frontend
ARG BUILD_INFO
COPY . /build/
RUN cd /build/ && npm run build

FROM docker.io/openjdk:21-jdk-bookworm AS engine

RUN apt-get update && \
    apt-get install -y --no-install-recommends maven git && \
    rm -rf /var/lib/apt/lists/*

# Build tank game engine to be included with the default image
COPY . /build/
WORKDIR /build/engine/
RUN --mount=type=cache,target=/root/.m2 mvn clean package

FROM node:20-alpine

WORKDIR /app/

# Install java for the engine
RUN apk --no-cache --update add openjdk21-jre-headless su-exec

# Install backend dependencies
COPY package*.json /app/
RUN npm ci --omit=dev

ARG BUILD_INFO
ENV BUILD_INFO=${BUILD_INFO}

# Copy everything over to the final image
COPY src /app/src
COPY --from=frontend /build/dist/ /app/www/
COPY --from=engine /build/engine/target/TankGame-*.jar /app/engine/
COPY entrypoint.sh /entrypoint.sh

# Place some sample data in /data so users can try out the app
COPY example/*.json /data/games/

ENV TANK_GAMES_FOLDER=/data/games/
ENV TANK_GAME_LOGS_FOLDER=/data/logs/
ENTRYPOINT ["/entrypoint.sh"]

CMD ["/usr/local/bin/npm", "start"]
