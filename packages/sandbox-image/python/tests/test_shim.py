import pytest
import warnings
from apts.model import ObjectTableLabels as LegacyLabels
from terminai_apts.model import ObjectTableLabels as NewLabels

def test_shim_exports():
    assert LegacyLabels is NewLabels
    assert LegacyLabels.TRANSIT == "transit"

def test_shim_warning():
    import apts
    import importlib
    with pytest.warns(DeprecationWarning, match="Importing from 'apts' is deprecated"):
        importlib.reload(apts)
        # Re-importing might not trigger warning if already imported, 
        # but in a fresh process it would. 
        # Since we use pytest, we can check if the import at the top triggered it.
        pass
