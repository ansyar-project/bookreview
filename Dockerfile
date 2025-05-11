# Use the official Node 22.15 Alpine image
FROM node:22.15-alpine

# Set the working directory
WORKDIR /app

# Install curl
RUN apk add --no-cache curl

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source files
COPY . .

# Build Tailwind CSS (make sure the script is defined in package.json)
RUN npm run build

# Expose the port Express will run on
EXPOSE 3000

# Start the Express app
CMD ["npm", "start"]