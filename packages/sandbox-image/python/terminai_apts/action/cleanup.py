from pathlib import Path
from typing import Dict, List, Optional
from terminai_apts.model import ObjectTableLabels

def classify_file(path: Path) -> ObjectTableLabels:
    """Classify a file for cleanup operations."""
    if not path.is_file():
        return ObjectTableLabels.UNKNOWN
        
    suffix = path.suffix.lower()

    # Temporary files
    if suffix in {'.tmp', '.temp', '.crdownload', '.part'}:
        return ObjectTableLabels.TRANSIT

    # Known archive suffixes
    if suffix in {'.zip', '.tar', '.gz', '.7z', '.rar'}:
        return ObjectTableLabels.ARCHIVE

    # Known data formats
    if suffix in {'.csv', '.json', '.parquet'}:
        return ObjectTableLabels.KEEP

    # Default to unknown
    return ObjectTableLabels.UNKNOWN

import os

def scan_downloads(
    downloads_dir: Optional[Path] = None,
    # dry_run parameter removed as this is purely a scan tool
    scan_limit: int = 10000
) -> Dict[str, List[str]]:
    """
    Analyze downloads directory and classify files for potential cleanup.
    This is a READ-ONLY operation. It does NOT delete any files.
    """
    if downloads_dir is None:
        downloads_dir = Path.home() / "Downloads"
    else:
        downloads_dir = Path(downloads_dir)

    results: Dict[str, List[str]] = {
        label.value: [] for label in ObjectTableLabels
    }

    if not downloads_dir.exists():
        return results

    count = 0
    with os.scandir(downloads_dir) as it:
        for entry in it:
            if count >= scan_limit:
                break
            
            if entry.is_file():
                item = Path(entry.path)
                label = classify_file(item)
                results[label.value].append(str(item))
                count += 1

    return results

def cleanup_downloads(
    downloads_dir: Optional[Path] = None,
    dry_run: bool = True,
    scan_limit: int = 10000
) -> Dict[str, List[str]]:
    """
    DEPRECATED: Use scan_downloads() instead.
    This function was misleadingly named; it only scans and never deletes.
    """
    print("WARNING: cleanup_downloads is deprecated. It only scans files. Use delete_files to remove them.")
    return scan_downloads(downloads_dir, scan_limit)
