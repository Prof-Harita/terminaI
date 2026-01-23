import pytest
from pathlib import Path
from terminai_apts.action.files import read_file, write_file, search_files

def test_read_file(tmp_path):
    f = tmp_path / "hello.txt"
    f.write_text("Hello World", encoding="utf-8")
    
    result = read_file(str(f))
    assert result["content"] == "Hello World"
    assert "error" not in result

def test_read_missing_file(tmp_path):
    result = read_file(str(tmp_path / "missing.txt"))
    assert "error" in result

def test_write_file(tmp_path):
    f = tmp_path / "output.txt"
    result = write_file(str(f), "Some content")
    assert result["success"] is True
    assert f.read_text() == "Some content"

def test_write_no_overwrite(tmp_path):
    f = tmp_path / "existing.txt"
    f.write_text("Original")
    
    result = write_file(str(f), "New", overwrite=False)
    assert "error" in result
    assert f.read_text() == "Original"

def test_write_overwrite(tmp_path):
    f = tmp_path / "existing.txt"
    f.write_text("Original")
    
    result = write_file(str(f), "New", overwrite=True)
    assert result["success"] is True
    assert f.read_text() == "New"
    
def test_search_files(tmp_path):
    (tmp_path / "a.txt").write_text("foo bar baz")
    (tmp_path / "b.txt").write_text("hello world")
    subdir = tmp_path / "sub"
    subdir.mkdir()
    (subdir / "c.txt").write_text("bar inside")
    
    # Simple search
    res = search_files("bar", str(tmp_path), recursive=False)
    # Should find 'a.txt' but not 'c.txt'
    paths = [m['path'] for m in res['matches']]
    assert any("a.txt" in p for p in paths)
    assert not any("c.txt" in p for p in paths)
    
    # Recursive
    res_rec = search_files("bar", str(tmp_path), recursive=True)
    paths_rec = [m['path'] for m in res_rec['matches']]
    assert any("a.txt" in p for p in paths_rec)
    assert any("c.txt" in p for p in paths_rec)
