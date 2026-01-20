#!/bin/bash
# contract_checks.sh - Validates sandbox Python contracts at startup
set -e

echo "[TerminAI] Running sandbox contract checks..."

# Check T-APTS is importable
python3 -c "import terminai_apts" || {
    echo "ERROR: terminai_apts package not installed"
    exit 1
}

# Check required symbols exist
python3 -c "
from terminai_apts.model import ObjectTableLabels
assert hasattr(ObjectTableLabels, 'TRANSIT'), 'Missing TRANSIT'
assert hasattr(ObjectTableLabels, 'KEEP'), 'Missing KEEP'
assert hasattr(ObjectTableLabels, 'DELETE'), 'Missing DELETE'
print('Contract checks passed')
" || {
    echo "ERROR: Python contract check failed"
    echo "This sandbox image is incompatible with the current TerminAI version."
    exit 1
}

# Check legacy shim
python3 -c "from apts.model import ObjectTableLabels; ObjectTableLabels.TRANSIT" 2>/dev/null || {
    echo "WARNING: Legacy apts shim not working (non-fatal)"
}

echo "[TerminAI] Contract checks passed ✓"
