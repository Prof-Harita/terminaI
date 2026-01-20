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

def cleanup_downloads(
    downloads_dir: Optional[Path] = None,
    dry_run: bool = True,
    scan_limit: int = 10000
) -> Dict[str, List[str]]:
    """
    Analyze downloads directory and propose cleanup actions.
    Includes a scan_limit to prevent hanging on massive directories.
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
