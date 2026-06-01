FROM node:20-alpine AS build

WORKDIR /build
COPY . .
RUN yarn install
RUN yarn build

FROM node:20-alpine AS prod

WORKDIR /app

COPY --from=build /build/dist ./dist
COPY --from=build /build/node_modules ./node_modules
COPY --from=build /build/package.json .
COPY --from=build /build/migrations ./migrations
COPY --from=build /build/scripts ./scripts

ENV AUTO_MIGRATE=1
ENV NODE_ENV=production

EXPOSE 4000

# Run pending SQL migrations, then start NestJS
CMD [ "node", "scripts/docker-entrypoint.mjs" ]
