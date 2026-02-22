# lightweight version of Node.js
FROM node:20-alpine

# a folder inside the container where our code will live
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

CMD ["npm", "run", "dev"]