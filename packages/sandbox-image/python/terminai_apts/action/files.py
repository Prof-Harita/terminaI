import os
import shutil
import json
from pathlib import Path
from typing import List, Dict, Optional, Union
from ..model import ObjectTableLabels

def delete_files(
    paths: List[str],
    recursive: bool = False,
    dry_run: bool = True
) -> Dict[str, Union[List[str], Dict[str, str]]]:
    """
    Delete a list of files or directories.
    
    Args:
        paths: List of absolute paths to delete.
        recursive: If True, delete directories recursively.
        dry_run: If True, only simulate deletion.
        
    Returns:
        Dict containing 'deleted' (list of paths) and 'errors' (dict of path -> error).
    """
    report = {
        "deleted": [],
        "errors": {}
    }
    
    for path_str in paths:
        path_obj = Path(path_str)
        if not path_obj.exists():
            report["errors"][path_str] = "Path does not exist"
            continue
            
        try:
            if path_obj.is_file() or path_obj.is_symlink():
                if not dry_run:
                    path_obj.unlink()
                report["deleted"].append(path_str)
            elif path_obj.is_dir():
                if recursive:
                    if not dry_run:
                        shutil.rmtree(path_obj)
                    report["deleted"].append(path_str)
                else:
                    report["errors"][path_str] = "Is a directory (use recursive=True)"
            else:
                 report["errors"][path_str] = "Unknown file type"
        except Exception as e:
            report["errors"][path_str] = str(e)
            
    return report

def list_directory(
    path: str,
    offset: int = 0,
    limit: int = 100,
    recursive: bool = False # Note: Recursive not fully implemented in this iteration to keep it safe
) -> Dict[str, Union[str, int, bool, List[Dict]]]:
    """
    List contents of a directory with pagination.
    
    Args:
        path: Absolute path to directory.
        offset: Pagination start index.
        limit: Max items to return.
        
    Returns:
        Dict with 'items', 'total', 'offset', 'limit', 'has_more'.
    """
    p = Path(path)
    if not p.exists():
        return {"error": f"Path {path} does not exist"}
    if not p.is_dir():
        return {"error": f"Path {path} is not a directory"}
        
    try:
        # We need to sort specifically to ensure stable pagination
        # This can be slow for massive directories, but os.scandir is efficient
        all_entries = sorted([e for e in os.scandir(p)], key=lambda e: (not e.is_dir(), e.name))
        total = len(all_entries)
        
        sliced_entries = all_entries[offset : offset + limit]
        
        items = []
        for entry in sliced_entries:
            stat = entry.stat()
            items.append({
                "name": entry.name,
                "path": entry.path,
                "is_dir": entry.is_dir(),
                "size": stat.st_size if not entry.is_dir() else 0,
                "modified": stat.st_mtime
            })
            
        return {
            "path": str(p),
            "files": items,
            "total": total,
            "offset": offset,
            "limit": limit,
            "has_more": (offset + limit) < total
        }
    except Exception as e:
        return {"error": str(e)}

def read_file(path: str, encoding: str = 'utf-8') -> Dict[str, Union[str, float, int]]:
    """
    Read the contents of a file.
    
    Args:
        path: Absolute path to the file.
        encoding: Text encoding (default: utf-8).
        
    Returns:
        Dict with 'content', 'path', 'encoding', 'size' or 'error'.
    """
    try:
        p = Path(path)
        if not p.exists():
            return {"error": f"Path {path} does not exist"}
        if not p.is_file():
            return {"error": f"Path {path} is not a file"}
            
        content = p.read_text(encoding=encoding)
        return {
            "path": str(p),
            "content": content,
            "encoding": encoding,
            "size": len(content)
        }
    except Exception as e:
        return {"error": str(e)}

def write_file(
    path: str, 
    content: str, 
    encoding: str = 'utf-8', 
    overwrite: bool = False
) -> Dict[str, Union[str, bool, int]]:
    """
    Write content to a file.
    
    Args:
        path: Absolute path to the file.
        content: Text content to write.
        encoding: Text encoding (default: utf-8).
        overwrite: Whether to overwrite existing files.
        
    Returns:
        Dict with 'success', 'path', 'bytes_written' or 'error'.
    """
    try:
        p = Path(path)
        if p.exists():
            if not overwrite:
                 return {"error": f"File {path} exists and overwrite=False"}
            if not p.is_file():
                 return {"error": f"Path {path} exists but is not a file"}
        
        # Ensure parent directories exist
        p.parent.mkdir(parents=True, exist_ok=True)
        
        p.write_text(content, encoding=encoding)
        return {
            "path": str(p),
            "success": True,
            "bytes_written": len(content)
        }
    except Exception as e:
         return {"error": str(e)}

def search_files(
    query: str, 
    path: str, 
    recursive: bool = False,
    file_pattern: str = "*"
) -> Dict[str, Union[List[Dict[str, Union[str, int]]], str, int]]:
    """
    Search for text content within files (grep-like).
    
    Args:
        query: Text to search for.
        path: Root directory to search.
        recursive: Whether to search recursively.
        file_pattern: Glob pattern for filenames to include (default: *).
        
    Returns:
        Dict with 'matches' (list of dicts with path, line_number, snippet) or 'error'.
    """
    try:
        root = Path(path)
        if not root.exists():
            return {"error": f"Path {path} does not exist"}
            
        matches = []
        MAX_RESULTS = 500
        count = 0
        
        iterator = root.rglob(file_pattern) if recursive else root.glob(file_pattern)
            
        for p in iterator:
            if not p.is_file():
                continue
                
            try:
                # Read line by line to be memory efficient and find line numbers
                with p.open('r', encoding='utf-8', errors='ignore') as f:
                    for i, line in enumerate(f, 1):
                        if query in line:
                            matches.append({
                                "path": str(p),
                                "line": i,
                                "content": line.strip()[:200] # Truncate long lines
                            })
                            count += 1
                            if count >= MAX_RESULTS:
                                return {
                                    "path": str(root),
                                    "query": query,
                                    "matches": matches,
                                    "truncated": True
                                }
            except Exception:
                # Ignore read errors (binary files, permissions)
                continue
                
        return {
            "path": str(root),
            "query": query,
            "matches": matches,
            "truncated": False
        }
    except Exception as e:
        return {"error": str(e)}
