# Use the official Node.js image as the base image
FROM node:20.14.0-alpine

# Set the working directory in the container
WORKDIR /app

# Copy the package.json and package-lock.json files
COPY package*.json ./

# Install the specified npm version
RUN npm install -g npm@10.7.0

# Install the dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port that the app runs on
EXPOSE 5000

# Define the command to run the app
CMD ["node", "src/app.js"]
