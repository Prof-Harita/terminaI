import pytest
from terminai_apts.model import ObjectTableLabels

def test_object_table_labels_values():
    assert ObjectTableLabels.TRANSIT == "transit"
    assert ObjectTableLabels.KEEP == "keep"
    assert ObjectTableLabels.DELETE == "delete"
    assert ObjectTableLabels.ARCHIVE == "archive"
    assert ObjectTableLabels.UNKNOWN == "unknown"

def test_object_table_labels_iteration():
    labels = list(ObjectTableLabels)
    assert len(labels) == 5
    assert "transit" in [l.value for l in labels]
