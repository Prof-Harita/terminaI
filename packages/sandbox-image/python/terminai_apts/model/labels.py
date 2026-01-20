from enum import Enum

class ObjectTableLabels(str, Enum):
    """Labels for classifying file objects during cleanup operations.

    Contract: These enum values are part of the public API.
    Do not remove or rename without a major version bump.
    """
    TRANSIT = "transit"    # Temporary files in-flight
    KEEP = "keep"          # Files to preserve
    DELETE = "delete"      # Files marked for deletion
    ARCHIVE = "archive"    # Files to archive
    UNKNOWN = "unknown"    # Unclassified files
