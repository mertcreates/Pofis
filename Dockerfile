FROM oven/bun:1.4.3 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN POFIS_STANDALONE=1 bun run build

FROM oven/bun:1.4.3 AS runtime
ENV NODE_ENV=production \
    TZ=Europe/Istanbul \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    POFIS_SESSION_DIR=/var/lib/pofis/sessions
RUN apt-get update \
    && apt-get install -y --no-install-recommends tzdata \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /var/lib/pofis/sessions \
    && chown -R bun:bun /var/lib/pofis
WORKDIR /app
COPY --from=build --chown=bun:bun /app/.next/standalone ./
COPY --from=build --chown=bun:bun /app/LICENSE /app/ASSET-LICENSE.md ./
COPY --from=build --chown=bun:bun /app/public ./public
COPY --from=build --chown=bun:bun /app/.next/static ./.next/static
USER bun
EXPOSE 3000
CMD ["bun", "server.js"]
