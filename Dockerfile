# Exact Node and Alpine versions - a rebuild does not silently pick up a new runtime
FROM node:24.22.3-alpine3.24

WORKDIR /app
ENV NODE_ENV=production
# No "new npm version available" notice from npx in the container logs
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

# pnpm in the version pinned by "packageManager" in package.json (via corepack)
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

# Dependencies before the code: this layer is rebuilt only when package.json or the
# lockfile change, not on every code change. --frozen-lockfile: exactly the versions
# from pnpm-lock.yaml (fails if it is out of date), --prod: no devDependencies.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY . .

# Not root inside the container
USER node
EXPOSE 3000

# Migrations on every start (nothing to do when the schema is up to date), then the
# server. exec replaces the shell, so node is PID 1 and receives SIGTERM directly.
CMD ["sh", "-c", "npx knex migrate:latest && exec node src/server.js"]
