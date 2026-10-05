from backend.main import Store

def test_restart_keeps_catalog_unique(tmp_path):
    p = tmp_path / 'db.sqlite'
    a = Store(p)
    b = Store(p)
    with b.connect() as db:
        assert db.execute('SELECT count(*) FROM words').fetchone()[0] == 40
    assert a.search('recover after difficulty', 5)[0]['word'] == 'resilience'

def test_apostrophes_are_data(tmp_path):
    assert isinstance(Store(tmp_path / 'db.sqlite').search("someone's quiet sadness", 5), list)
