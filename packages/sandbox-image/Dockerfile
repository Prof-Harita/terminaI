FROM docker.io/library/node:20-slim

ARG SANDBOX_NAME="terminai-sandbox"
ARG CLI_VERSION_ARG
ENV SANDBOX="$SANDBOX_NAME"
ENV CLI_VERSION=$CLI_VERSION_ARG

# install minimal set of packages, then clean up
RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 \
  python3-pip \
  make \
  g++ \
  man-db \
  curl \
  dnsutils \
  less \
  jq \
  bc \
  gh \
  git \
  unzip \
  rsync \
  ripgrep \
  procps \
  psmisc \
  lsof \
  socat \
  ca-certificates \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# set up npm global package folder under /usr/local/share
# give it to non-root user node, already set up in base image
RUN mkdir -p /usr/local/share/npm-global \
  && chown -R node:node /usr/local/share/npm-global
ENV NPM_CONFIG_PREFIX=/usr/local/share/npm-global
ENV PATH=$PATH:/usr/local/share/npm-global/bin

# switch to non-root user node
USER node

# install gemini-cli and clean up
COPY packages/cli/dist/terminai-cli-*.tgz /tmp/gemini-cli.tgz
COPY packages/core/dist/terminai-core-*.tgz /tmp/gemini-core.tgz
RUN npm install -g /tmp/gemini-cli.tgz /tmp/gemini-core.tgz \
  && npm cache clean --force \
  && rm -f /tmp/gemini-{cli,core}.tgz

# Switch to root to install system-wide Python package and scripts
USER root

# Add python3-venv for virtual environment creation
RUN apt-get update && apt-get install -y --no-install-recommends python3-venv \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# Copy T-APTS source
COPY packages/sandbox-image/python /tmp/terminai-apts

# Create venv and install T-APTS + pytest
# This avoids --break-system-packages by isolating Python deps in a venv
RUN python3 -m venv /opt/terminai/venv \
  && /opt/terminai/venv/bin/pip install --no-cache-dir /tmp/terminai-apts pytest \
  && rm -rf /tmp/terminai-apts

# Add venv to PATH so python3 commands use the venv
ENV PATH="/opt/terminai/venv/bin:$PATH"

# Copy scripts and tests
COPY packages/sandbox-image/scripts/entrypoint.sh /opt/terminai/entrypoint.sh
COPY packages/sandbox-image/scripts/contract_checks.sh /opt/terminai/contract_checks.sh
COPY packages/sandbox-image/python/tests /opt/terminai/tests
RUN chmod +x /opt/terminai/*.sh

# Switch back to node user
USER node

# default entrypoint when none specified
ENTRYPOINT ["/opt/terminai/entrypoint.sh"]
# NOTE: Both 'gemini' and 'terminai' commands are available and equivalent.
# We use 'terminai' as the default to reflect TerminAI branding.
# For backward compatibility, 'gemini' remains available as an alias.
CMD ["terminai"]
