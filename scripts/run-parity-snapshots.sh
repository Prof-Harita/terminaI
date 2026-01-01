#!/bin/bash
set -e

# Base directory for the script
ROOT_DIR=$(pwd)
CLI_DIR="$ROOT_DIR/packages/cli"
FIXTURES_DIR="$CLI_DIR/test/fixtures/settings-scenarios"
SNAPSHOTS_DIR="$CLI_DIR/test/fixtures/settings-snapshots"

mkdir -p "$FIXTURES_DIR"
mkdir -p "$SNAPSHOTS_DIR"

# Scenarios
# 1. Default
cat > "$FIXTURES_DIR/default.json" << 'INNER_EOF'
{}
INNER_EOF

# 2. User Overrides
cat > "$FIXTURES_DIR/user-overrides.json" << 'INNER_EOF'
{
  "general": {
    "previewFeatures": true
  },
  "model": {
    "name": "gemini-3-pro-preview"
  }
}
INNER_EOF

# 3. Workspace Overrides
cat > "$FIXTURES_DIR/workspace-overrides.json" << 'INNER_EOF'
{
  "tools": {
    "allowed": ["ls", "cat"]
  }
}
INNER_EOF

# 6. V1 Flat Settings
cat > "$FIXTURES_DIR/v1-flat.json" << 'INNER_EOF'
{
  "previewFeatures": true,
  "yolo": true,
  "model": "gemini-1.5-pro"
}
INNER_EOF

# 7. Complex Nested
cat > "$FIXTURES_DIR/complex-nested.json" << 'INNER_EOF'
{
  "tools": {
    "shell": {
      "enableInteractiveShell": false,
      "inactivityTimeout": 300
    }
  },
  "ui": {
    "accessibility": {
      "screenReader": true
    }
  }
}
INNER_EOF

# 8. Environment Variables
cat > "$FIXTURES_DIR/env-vars.json" << 'INNER_EOF'
{
  "model": {
    "name": "${OVERRIDE_MODEL}"
  }
}
INNER_EOF

# 9. Banned Tools
cat > "$FIXTURES_DIR/banned-tools.json" << 'INNER_EOF'
{
  "tools": {
    "exclude": ["shell"]
  }
}
INNER_EOF

# 10. Sandbox Enabled
cat > "$FIXTURES_DIR/sandbox-enabled.json" << 'INNER_EOF'
{
  "general": {
    "sandbox": true
  }
}
INNER_EOF

# Function to run CLI and capture config
capture_config() {
  local name=$1
  local ws_target_dir=$2
  local user_settings=$3
  local env_vars=$4 # optional: k1=v1;k2=v2
  
  echo "Generating snapshot for: $name"
  
  local tmp_home=$(mktemp -d)
  mkdir -p "$tmp_home/.config/terminai"
  
  if [ -f "$user_settings" ]; then
    cp "$user_settings" "$tmp_home/.config/terminai/settings.json"
  fi
  
  # Set env vars and run CLI from the target workspace directory
  (
    export HOME="$tmp_home"
    export XDG_CONFIG_HOME="$tmp_home/.config"
    if [ -n "$env_vars" ]; then
      IFS=';' read -ra ADDR <<< "$env_vars"
      for i in "${ADDR[@]}"; do
        export "$i"
      done
    fi
    cd "$ws_target_dir"
    node "$CLI_DIR/dist/index.js" --dump-config > "$SNAPSHOTS_DIR/${name}.snapshot.json"
  )
  
  rm -rf "$tmp_home"
}

# Run captures
capture_config "01_default" "$ROOT_DIR" "$FIXTURES_DIR/default.json"
capture_config "02_user_overrides" "$ROOT_DIR" "$FIXTURES_DIR/user-overrides.json"

TMP_WS=$(mktemp -d)
mkdir -p "$TMP_WS/.terminai"
cp "$FIXTURES_DIR/workspace-overrides.json" "$TMP_WS/.terminai/settings.json"
capture_config "03_workspace_overrides" "$TMP_WS" "$FIXTURES_DIR/default.json"

capture_config "04_both_overrides" "$TMP_WS" "$FIXTURES_DIR/user-overrides.json"

# 5. Untrusted Workspace
# We don't have a clean way to mock trust without editing the trusted_folders.json
# But we can just run it in a new folder, it should be untrusted by default.
TMP_UNTRUSTED=$(mktemp -d)
capture_config "05_untrusted_workspace" "$TMP_UNTRUSTED" "$FIXTURES_DIR/default.json"
rm -rf "$TMP_UNTRUSTED"

# 6. V1 Flat
capture_config "06_v1_flat" "$ROOT_DIR" "$FIXTURES_DIR/v1-flat.json"

# 7. Complex Nested
capture_config "07_complex_nested" "$ROOT_DIR" "$FIXTURES_DIR/complex-nested.json"

# 8. Env Vars
capture_config "08_env_vars" "$ROOT_DIR" "$FIXTURES_DIR/env-vars.json" "OVERRIDE_MODEL=gemini-ultra"

# 9. Banned Tools
capture_config "09_banned_tools" "$ROOT_DIR" "$FIXTURES_DIR/banned-tools.json"

# 10. Sandbox
capture_config "10_sandbox" "$ROOT_DIR" "$FIXTURES_DIR/sandbox-enabled.json"

rm -rf "$TMP_WS"
echo "Snapshots generated in $SNAPSHOTS_DIR"
