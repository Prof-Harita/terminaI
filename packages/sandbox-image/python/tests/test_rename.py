from terminai_apts.action import scan_downloads, cleanup_downloads
from terminai_apts.model import ObjectTableLabels

def test_scan_downloads(tmp_path):
    (tmp_path / "test.tmp").touch()
    results = scan_downloads(downloads_dir=tmp_path)
    assert str(tmp_path / "test.tmp") in results[ObjectTableLabels.TRANSIT.value]

def test_cleanup_deprecation(tmp_path, capsys):
    (tmp_path / "test.tmp").touch()
    # Should work but print warning
    results = cleanup_downloads(downloads_dir=tmp_path, dry_run=False) # dry_run ignored
    assert str(tmp_path / "test.tmp") in results[ObjectTableLabels.TRANSIT.value]
    
    captured = capsys.readouterr()
    assert "WARNING: cleanup_downloads is deprecated" in captured.out
