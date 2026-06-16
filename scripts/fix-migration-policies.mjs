import fs from 'fs'

const files = process.argv.slice(2)
for (const f of files) {
  let sql = fs.readFileSync(f, 'utf8')
  const next = sql.replace(
    /create policy "([^"]+)"\s+on public\.(\w+)/g,
    (_m, name, table) =>
      `drop policy if exists "${name}" on public.${table};\ncreate policy "${name}"\n  on public.${table}`,
  )
  if (next !== sql) {
    fs.writeFileSync(f, next)
    console.log('fixed', f)
  }
}
