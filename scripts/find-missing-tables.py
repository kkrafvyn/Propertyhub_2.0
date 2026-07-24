import re
from pathlib import Path

text = Path("src/lib/database.types.ts").read_text(encoding="utf-8")
tables = set(re.findall(r"^\s{6}([a-z_][a-z0-9_]*): \{", text, re.M))
from_calls = set()
for path in Path("src").rglob("*.ts"):
    content = path.read_text(encoding="utf-8", errors="ignore")
    from_calls.update(re.findall(r"""\.from\(['"]([a-z_][a-z0-9_]*)['"]\)""", content))

missing = sorted(from_calls - tables)
print(f"missing {len(missing)}")
for name in missing:
    print(name)
