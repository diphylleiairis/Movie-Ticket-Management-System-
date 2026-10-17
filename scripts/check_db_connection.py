"""Read-only PostgreSQL and Supabase API probe; never print credential values."""
import os
import json
from pathlib import Path
import shutil
import subprocess
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlsplit
from urllib.request import Request, urlopen


def read_config(root):
    config = {}
    env_file = root / '.env'
    if env_file.exists():
        for line in env_file.read_text(encoding='utf-8-sig').splitlines():
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if line.startswith('export '):
                line = line[7:]
            key, separator, value = line.partition('=')
            if not separator:
                continue
            value = value.strip()
            if value.startswith(('"', "'")):
                quote = value[0]
                end = value.find(quote, 1)
                if end >= 1:
                    value = value[1:end]
            else:
                value = value.split(' #', 1)[0].rstrip()
            config[key.strip()] = value
    config.update(os.environ)
    return config


def postgres_probe(root, config):
    java = shutil.which('java')
    jars = sorted((Path.home() / '.m2/repository/org/postgresql/postgresql').glob('*/*.jar'))
    if not java or not jars:
        print('PostgreSQL: NOT TESTED (Java or cached JDBC driver missing)')
        return 1
    host, database, user = (config.get(k, '') for k in ('POSTGRES_HOST', 'POSTGRES', 'POSTGRES_USER'))
    password = config.get('POSTGRES_PASSWORD', '')
    port = config.get('POSTGRES_PORT', '5432')
    if not (host and database and user and password):
        parsed = urlsplit(config.get('POSTGRES_URL', '').removeprefix('jdbc:'))
        if parsed.scheme not in ('postgres', 'postgresql'):
            print('PostgreSQL: NOT TESTED (connection variables missing)')
            return 1
        host, database = parsed.hostname, parsed.path.lstrip('/')
        port, user = str(parsed.port or 5432), unquote(parsed.username or '')
        password = password or unquote(parsed.password or '')
    if not (host and database and user and password):
        print('PostgreSQL: NOT TESTED (connection variables missing)')
        return 1
    child_env = dict(os.environ)
    child_env.update(DB_PROBE_HOST=host, DB_PROBE_PORT=port, DB_PROBE_DATABASE=database,
                     DB_PROBE_USER=user, DB_PROBE_PASSWORD=password)
    try:
        result = subprocess.run([java, '--class-path', str(jars[-1]),
                                 str(root / 'scripts/DbConnectionProbe.java')],
                                env=child_env, capture_output=True, text=True, timeout=35)
        # Java emits only fixed messages and SQLSTATE, never an exception message.
        print(result.stdout.strip() or 'PostgreSQL: FAILED (probe could not start)')
        return result.returncode
    except subprocess.TimeoutExpired:
        print('PostgreSQL: FAILED (connection timeout)')
        return 3


def api_probe(config):
    endpoint = config.get('SUPABASE_URL', '').rstrip('/')
    if urlsplit(endpoint).scheme != 'https':
        print('Supabase API: NOT TESTED (HTTPS SUPABASE_URL missing)')
        return 1
    failure = 0
    for name in ('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY',
                 'SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY'):
        value = config.get(name, '')
        if not value:
            print(f'{name}: MISSING')
            failure = max(failure, 1)
            continue
        request = Request(endpoint + '/rest/v1/', headers={'apikey': value})
        try:
            with urlopen(request, timeout=10) as response:
                print(f'{name}: API reachable, HTTP {response.status}')
        except HTTPError as error:
            # Classify known errors without exposing the raw server response.
            try:
                details = json.loads(error.read(4096))
                message = str(details.get('message', '')).lower()
                code = str(details.get('code', ''))
            except (ValueError, AttributeError):
                message, code = '', ''
            reason = 'access rejected'
            if 'invalid api key' in message:
                reason = 'invalid API key'
            elif 'permission denied' in message or code == '42501':
                reason = 'database permission denied'
            elif 'jwt' in message or code in ('PGRST301', 'PGRST303'):
                reason = 'JWT validation rejected'
            elif 'schema' in message:
                reason = 'schema access rejected'
            print(f'{name}: FAILED (HTTP {error.code}; {reason})')
            failure = max(failure, 1)
        except (URLError, TimeoutError, OSError):
            print(f'{name}: FAILED (network/DNS/TLS connection)')
            failure = 3
    return failure


def main():
    root = Path(__file__).resolve().parent.parent
    config = read_config(root)
    # Key values, URLs, exception messages and provider response bodies are omitted.
    db_result = postgres_probe(root, config)
    api_result = api_probe(config)
    return max(db_result, api_result)


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception:
        print('Probe: FAILED (configuration or runtime error; details suppressed)')
        sys.exit(1)
