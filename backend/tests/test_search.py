import json
import httpx, pytest
from fastapi.testclient import TestClient
from backend.main import create_app

@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.delenv('OPENAI_API_KEY', raising=False)
    return TestClient(create_app(tmp_path / 'test.sqlite'))

def test_fortunate_discovery(client):
    r = client.post('/api/search', json={'description': 'an unexpected fortunate discovery by chance'})
    assert r.status_code == 200
    assert r.json()['suggestions'][0]['word'] == 'serendipity'
    assert r.json()['mode'] == 'local'

def test_no_match_is_empty_not_invented(client):
    assert client.post('/api/search', json={'description': 'zzzzzzzz'}).json()['suggestions'] == []

@pytest.mark.parametrize('payload', [{'description': ' '}, {'description': 'a' * 301}, {'description': 'hello', 'limit': 6}, {'description': 'hello', 'limit': 0}, {'description': 'hello', 'mode': 'fake'}, {'description': 'hello', 'unknown': True}])
def test_invalid_requests(client, payload):
    assert client.post('/api/search', json=payload).status_code == 422

def test_missing_provider(client):
    assert client.post('/api/search', json={'description': 'fortunate discovery', 'mode': 'openai'}).status_code == 503

def test_stable_limit(client):
    query = {'description': 'calm quiet peaceful', 'limit': 2}
    a = client.post('/api/search', json=query).json()
    b = client.post('/api/search', json=query).json()
    assert a == b
    assert len(a['suggestions']) <= 2

def test_reranks_only_existing_ids(client, monkeypatch):
    monkeypatch.setenv('OPENAI_API_KEY', 'test-only-placeholder')

    async def post(self, url, **kwargs):
        candidates = json.loads(kwargs['json']['messages'][1]['content'])['candidates']
        ids = [c['id'] for c in reversed(candidates)]
        return httpx.Response(200, json={'choices': [{'message': {'content': json.dumps({'ranked_ids': ids})}}]}, request=httpx.Request('POST', url))
    monkeypatch.setattr(httpx.AsyncClient, 'post', post)
    r = client.post('/api/search', json={'description': 'calm quiet peaceful', 'mode': 'rerank', 'limit': 2})
    assert r.status_code == 200
    assert r.json()['mode'] == 'rerank'
    assert len(r.json()['suggestions']) == 2

@pytest.mark.parametrize('content', ['not JSON', '{"ranked_ids":[99999]}', '{"ranked_ids":[1,1]}', '{"ranked_ids":[true]}', '{"ranked_ids":[]}'])
def test_bad_model_output(client, monkeypatch, content):
    monkeypatch.setenv('OPENAI_API_KEY', 'test-only-placeholder')

    async def post(self, url, **kwargs):
        return httpx.Response(200, json={'choices': [{'message': {'content': content}}]}, request=httpx.Request('POST', url))
    monkeypatch.setattr(httpx.AsyncClient, 'post', post)
    assert client.post('/api/search', json={'description': 'fortunate discovery', 'mode': 'rerank'}).status_code == 502

@pytest.mark.parametrize('failure', ['timeout', 'quota'])
def test_provider_errors(client, monkeypatch, failure):
    monkeypatch.setenv('OPENAI_API_KEY', 'test-only-placeholder')

    async def post(self, url, **kwargs):
        if failure == 'timeout':
            raise httpx.ReadTimeout('timeout')
        return httpx.Response(429, json={'error': 'quota'}, request=httpx.Request('POST', url))
    monkeypatch.setattr(httpx.AsyncClient, 'post', post)
    assert client.post('/api/search', json={'description': 'fortunate discovery', 'mode': 'openai'}).status_code == 502

@pytest.mark.parametrize('status,code,expected_status,fragment', [
    (401, 'invalid_api_key', 503, 'rejected the API key'),
    (403, 'permission_denied', 502, 'does not permit'),
    (429, 'insufficient_quota', 502, 'insufficient API quota'),
    (429, 'rate_limit_exceeded', 502, 'rate-limiting'),
])
def test_provider_failures_are_actionable_without_exposing_secrets(client, monkeypatch, status, code, expected_status, fragment):
    monkeypatch.setenv('OPENAI_API_KEY', 'test-only-placeholder')
    async def post(self, url, **kwargs):
        return httpx.Response(status, json={'error': {'code': code, 'message': 'SENSITIVE-PROVIDER-MESSAGE'}}, request=httpx.Request('POST', url))
    monkeypatch.setattr(httpx.AsyncClient, 'post', post)
    response = client.post('/api/search', json={'description': 'fortunate discovery', 'mode': 'openai'})
    assert response.status_code == expected_status
    assert fragment in response.json()['detail']
    assert 'SENSITIVE-PROVIDER-MESSAGE' not in response.text

def test_ai_search_finds_a_word_outside_the_local_catalog(client, monkeypatch):
    monkeypatch.setenv('OPENAI_API_KEY', 'test-only-placeholder')
    calls = []
    async def post(self, url, **kwargs):
        calls.append(kwargs['json'])
        return httpx.Response(200, json={'choices': [{'message': {'content': json.dumps({'suggestions': [{'word': 'aunt', 'definition': 'The sister of a parent.'}]})}}]}, request=httpx.Request('POST', url))
    monkeypatch.setattr(httpx.AsyncClient, 'post', post)
    query = {'description': 'The sister of my mother', 'mode': 'openai'}
    response = client.post('/api/search', json=query)
    assert response.status_code == 200
    assert response.json()['suggestions'][0]['word'] == 'aunt'
    assert response.json()['suggestions'][0]['source'] == 'openai'
    assert 'score' not in response.json()['suggestions'][0]
    assert len(calls) == 1
    assert client.post('/api/search', json={**query, 'mode': 'local'}).json()['suggestions'] == []

@pytest.mark.parametrize('payload', [
    {'ranked_ids': [1]},
    {'suggestions': 'aunt'},
    {'suggestions': [{'word': '', 'definition': 'A parent sister.'}]},
    {'suggestions': [{'word': '<script>', 'definition': 'A parent sister.'}]},
    {'suggestions': [{'word': '123', 'definition': 'A parent sister.'}]},
    {'suggestions': [{'word': 'aunt', 'definition': None}]},
    {'suggestions': [{'word': 'aunt', 'definition': '   '}]},
    {'suggestions': [{'word': 'aunt', 'definition': 'A parent sister.', 'confidence': 1}]},
    {'suggestions': [{'word': 'aunt', 'definition': 'A parent sister.'}, {'word': 'AUNT', 'definition': 'A parent sister.'}]},
])
def test_ai_search_rejects_invalid_generated_results(client, monkeypatch, payload):
    monkeypatch.setenv('OPENAI_API_KEY', 'test-only-placeholder')
    async def post(self, url, **kwargs):
        return httpx.Response(200, json={'choices': [{'message': {'content': json.dumps(payload)}}]}, request=httpx.Request('POST', url))
    monkeypatch.setattr(httpx.AsyncClient, 'post', post)
    response = client.post('/api/search', json={'description': 'The sister of my mother', 'mode': 'openai'})
    assert response.status_code == 502
    assert response.json()['detail'] == 'OpenAI returned invalid word suggestions. Please try again.'

def test_ai_search_enforces_the_requested_result_limit(client, monkeypatch):
    monkeypatch.setenv('OPENAI_API_KEY', 'test-only-placeholder')
    async def post(self, url, **kwargs):
        payload = {'suggestions': [{'word': 'aunt', 'definition': 'The sister of a parent.'}, {'word': 'relative', 'definition': 'A member of a family.'}]}
        return httpx.Response(200, json={'choices': [{'message': {'content': json.dumps(payload)}}]}, request=httpx.Request('POST', url))
    monkeypatch.setattr(httpx.AsyncClient, 'post', post)
    assert client.post('/api/search', json={'description': 'The sister of my mother', 'mode': 'openai', 'limit': 1}).status_code == 502

def test_ai_search_allows_no_established_match_without_inventing_a_word(client, monkeypatch):
    monkeypatch.setenv('OPENAI_API_KEY', 'test-only-placeholder')
    async def post(self, url, **kwargs):
        return httpx.Response(200, json={'choices': [{'message': {'content': '{"suggestions": []}'}}]}, request=httpx.Request('POST', url))
    monkeypatch.setattr(httpx.AsyncClient, 'post', post)
    response = client.post('/api/search', json={'description': 'A meaning with no established term', 'mode': 'openai'})
    assert response.status_code == 200
    assert response.json()['suggestions'] == []
