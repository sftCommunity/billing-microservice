FROM node:21-alpine3.19

WORKDIR /repo/microservices/billing-microservice

COPY microservices/billing-microservice/package.json microservices/billing-microservice/package-lock.json ./
COPY packages/shared /repo/packages/shared

RUN cd /repo/packages/shared && npm ci && npm run build

RUN npm install

COPY microservices/billing-microservice/ .

EXPOSE 3006
