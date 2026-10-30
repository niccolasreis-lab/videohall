// Gera um manifesto de hashes do código-fonte, já que este ambiente não tem git.
// Uso: node scripts/baseline.mjs [--check]
//   sem --check: escreve docs/BASELINE.json
//   com --check: compara com o manifesto existente e falha se algo mudou
import { createHash } from 'node:crypto';
import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = join(root, 'docs', 'BASELINE.json');
const ignored = new Set(['data', 'backups', '.test-data', 'node_modules', 'verification']);

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.') && entry.name !== '.gitignore') continue;
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (ignored.has(entry.name)) continue;
      files.push(...await collect(full));
    } else if (entry.isFile()) {
      const info = await stat(full);
      if (full === output) continue; // o manifesto não se lista
      const bytes = await readFile(full);
      files.push({
        path: relative(root, full).split(sep).join('/'),
        bytes: info.size,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      });
    }
  }
  return files;
}

const files = await collect(root);
const manifest = Object.fromEntries(files.map(file => [file.path, file.sha256]));

if (process.argv.includes('--check')) {
  let previous;
  try { previous = JSON.parse(await readFile(output, 'utf8')); }
  catch { console.error('Manifesto ausente. Rode sem --check para criar docs/BASELINE.json.'); process.exit(1); }
  const current = previous.files || {};
  const changed = Object.keys(manifest).filter(path => current[path] && current[path] !== manifest[path]);
  const added = Object.keys(manifest).filter(path => !current[path]);
  const removed = Object.keys(current).filter(path => !manifest[path]);
  if (!changed.length && !added.length && !removed.length) { console.log(`Sem alterações em ${files.length} arquivos.`); process.exit(0); }
  for (const path of changed) console.log(`alterado  ${path}`);
  for (const path of added) console.log(`novo      ${path}`);
  for (const path of removed) console.log(`removido  ${path}`);
  process.exit(1);
}

await writeFile(output, `${JSON.stringify({ generatedAt: new Date().toISOString(), files: manifest }, null, 2)}\n`);
console.log(`Manifesto criado com ${files.length} arquivos em docs/BASELINE.json`);
