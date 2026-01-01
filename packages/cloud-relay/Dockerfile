FROM node:20-slim

WORKDIR /app

# Copy root workspace configs (if needed for isolated build, but here we assume standalone context or pre-built)
# For simplicity in this mono-repo structure, we'll just copy the built output if we were doing a rigorous build,
# but to make it self-contained for Cloud Run:

COPY package.json tsconfig.json ./
COPY src ./src

RUN npm install
RUN npm run build

# Cloud Run sets PORT (default 8080)
ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
