#Stage 1
FROM node:latest as build-stage

# RUN apt-get update && apt-get upgrade

WORKDIR /frontend
COPY package.json ./
RUN npm install
COPY . .

RUN npm run build

# Stage 2

FROM nginx:1.17.0-alpine

COPY --from=build-stage /frontend/dist /usr/share/nginx/html

EXPOSE 5173
