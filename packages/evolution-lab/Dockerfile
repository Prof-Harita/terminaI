FROM node:20-bullseye

# Install essential tools for system admin, networking, file management
RUN apt-get update && apt-get install -y \
  git \
  curl \
  jq \
  htop \
  vim \
  wget \
  iputils-ping \
  dnsutils \
  netcat-openbsd \
  openssh-client \
  procps \
  net-tools \
  lsof \
  tree \
  zip \
  unzip \
  python3 \
  python3-pip \
  && rm -rf /var/lib/apt/lists/*

# Create workspace
WORKDIR /app

# Copy the entire monorepo
COPY . .

# Install dependencies
RUN npm ci --ignore-scripts

# Build packages
RUN npm run build --workspace @terminai/core
RUN npm run build --workspace @terminai/cli

# Create symlink for terminai
RUN ln -s /app/packages/cli/dist/index.js /usr/local/bin/terminai-runner

# Set up non-root user
RUN useradd -m -s /bin/bash evolution && \
  chown -R evolution:evolution /app
USER evolution

# Create workspace for sandbox
WORKDIR /workspace
ENV HOME=/workspace
ENV NODE_ENV=production
ENV TERMINAI_CLI_PATH="node /app/packages/cli/dist/index.js"

CMD ["sleep", "infinity"]
