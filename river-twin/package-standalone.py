"""Create a runnable package from an explicit public-file allowlist."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import re

root = Path(__file__).resolve().parents[1]
app = root / 'river-twin'
out = root / 'dist' / 'HydroTwin-River-Twin.zip'
out.parent.mkdir(exist_ok=True)
runtime = ['index.html', 'style.css', 'README.md', 'app.mjs', 'state.mjs',
           'connection.mjs', 'lifetime.mjs', 'world.mjs', 'geodesy.mjs',
           'view-quality.mjs', 'view-state.mjs', 'navigation.mjs', 'billboard.mjs', 'viewer-credits.mjs', 'panel.mjs', 'credits.mjs', 'readings.mjs', 'banks.mjs']
files = [app / name for name in runtime]
for folder in ['chart', 'data', 'vendor', 'test-fixtures', 'data-space']:
    files.extend(p for p in (app / folder).rglob('*') if p.is_file() and not p.name.endswith('.test.mjs'))
files.extend(root / name for name in ['serve_local.py', '.env.example'])
with ZipFile(out, 'w', ZIP_DEFLATED) as archive:
    for path in sorted(files):
        if path.name == '.env' or 'node_modules' in path.parts:
            raise ValueError('Private or development file in package')
        data = path.read_bytes()
        if re.search(rb'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+', data):
            raise ValueError('Possible token in public package')
        archive.writestr(path.relative_to(root).as_posix(), data)
    archive.writestr('README.txt', 'Run: python3 serve_local.py\nOpen: http://127.0.0.1:8783/\n'
                     'Use Imagery setup for service access, or copy .env.example to .env and fill it locally.\n'
                     'The package includes no saved access token, Google imagery tiles, old website or Unity project.\n'
                     'See river-twin/README.md for controls, sources and limitations.\n')
print(f'{out.name}: {out.stat().st_size / 1024 / 1024:.1f} MB; {len(files)} public files')
