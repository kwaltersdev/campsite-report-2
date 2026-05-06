FROM node:20-slim

WORKDIR /usr/src/app

COPY package.json package-lock.json* tsconfig.json ./
RUN npm install

COPY . ./

EXPOSE 3000

CMD ["npm", "run", "dev"]
