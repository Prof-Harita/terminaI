# apts/__init__.py
"""Compatibility shim for legacy apts imports.

This module re-exports from terminai_apts for backward compatibility.
New code should import from terminai_apts directly.
"""
import warnings
from terminai_apts import *

# We emit the warning when the module is imported
warnings.warn(
    "Importing from 'apts' is deprecated. Use 'terminai_apts' instead.",
    DeprecationWarning,
    stacklevel=2
)
