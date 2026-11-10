from pathlib import Path
import hashlib,re
root=Path(__file__).resolve().parents[1];assets=root/'assets/spatial-data'
pattern=r'(\./[\w-]+\.mjs)(?:\?v=[a-f0-9]+)?'
canonical={p:re.sub(pattern,r'\1',p.read_text()) for p in sorted(assets.glob('*.mjs'))}
version=hashlib.sha256((''.join(p.name+s for p,s in canonical.items())+(assets/'style.css').read_text()).encode()).hexdigest()[:12]
for p,s in canonical.items():p.write_text(re.sub(pattern,lambda m:m[1]+'?v='+version,s))
for p in (root/'data-space').glob('*.html'):
 s=p.read_text();s=re.sub(r'(spatial-data/(?:app\.mjs|style\.css))\?v=[a-f0-9]+',lambda m:m[1]+'?v='+version,s);p.write_text(s)
print(version)
