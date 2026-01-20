from pathlib import Path
from terminai_apts.action.cleanup import cleanup_downloads, classify_file
from terminai_apts.model import ObjectTableLabels

def test_classify_file(tmp_path):
    tmp_file = tmp_path / "test.tmp"
    tmp_file.touch()
    assert classify_file(tmp_file) == ObjectTableLabels.TRANSIT
    
    download_file = tmp_path / "test.crdownload"
    download_file.touch()
    assert classify_file(download_file) == ObjectTableLabels.TRANSIT
    
    archive_file = tmp_path / "test.zip"
    archive_file.touch()
    assert classify_file(archive_file) == ObjectTableLabels.ARCHIVE
    
    txt_file = tmp_path / "test.txt"
    txt_file.touch()
    assert classify_file(txt_file) == ObjectTableLabels.UNKNOWN

def test_cleanup_downloads_empty(tmp_path):
    results = cleanup_downloads(downloads_dir=tmp_path)
    for label in ObjectTableLabels:
        assert results[label.value] == []

def test_cleanup_downloads_files(tmp_path):
    (tmp_path / "test.tmp").touch()
    (tmp_path / "test.zip").touch()
    (tmp_path / "test.txt").touch()
    
    results = cleanup_downloads(downloads_dir=tmp_path)
    
    assert str(tmp_path / "test.tmp") in results[ObjectTableLabels.TRANSIT.value]
    assert str(tmp_path / "test.zip") in results[ObjectTableLabels.ARCHIVE.value]
    assert str(tmp_path / "test.txt") in results[ObjectTableLabels.UNKNOWN.value]
