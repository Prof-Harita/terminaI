#!/bin/bash
set -e

# Run contract checks (fast, <1s) unless requested to skip
if [ "${TERMINAI_SKIP_CONTRACT_CHECKS:-0}" != "1" ] && [ -f /opt/terminai/contract_checks.sh ]; then
    /opt/terminai/contract_checks.sh
fi

# Execute the original command
exec "$@"
