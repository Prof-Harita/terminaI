from terminai_apts.model import ObjectTableLabels

def test_contract_transit_exists():
    """CRITICAL: Verifies the TRANSIT symbol exists on ObjectTableLabels."""
    assert hasattr(ObjectTableLabels, 'TRANSIT')
    assert ObjectTableLabels.TRANSIT.value == "transit"

def test_contract_required_labels():
    required = {'TRANSIT', 'KEEP', 'DELETE', 'ARCHIVE', 'UNKNOWN'}
    actual = {e.name for e in ObjectTableLabels}
    for r in required:
        assert r in actual, f"Contract violation: Missing label {r}"
