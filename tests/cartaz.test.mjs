import test from 'node:test';
import assert from 'node:assert/strict';
import { posterCycle } from '../public/content-utils.js';

test('ciclo do cartaz soma apenas produtos ativos e diferencia layouts com e sem rotação', () => {
  const rows = [{ name: 'A', active: true }, { name: 'B', active: false }, { name: 'C', active: true }, { name: 'D' }];
  assert.deepEqual(posterCycle(rows, 10, 'list-spotlight'), { items: 3, rotates: true, seconds: 30 });
  assert.deepEqual(posterCycle(rows, 10, 'spotlight'), { items: 3, rotates: true, seconds: 30 });
  assert.deepEqual(posterCycle(rows, 10, 'campaign'), { items: 3, rotates: true, seconds: 30 });
  assert.deepEqual(posterCycle(rows, 10, 'grid'), { items: 3, rotates: false, seconds: 0 });
  assert.deepEqual(posterCycle([], 10, 'list-spotlight'), { items: 0, rotates: true, seconds: 0 });
  assert.equal(posterCycle(rows, 0, 'spotlight').seconds, 30);
  assert.equal(posterCycle(rows, 'invalid', 'spotlight').seconds, 30);
  // Fracionários, negativos e acima do limite do servidor (3600) caem no padrão de 10s.
  assert.equal(posterCycle(rows, 1.5, 'spotlight').seconds, 30);
  assert.equal(posterCycle(rows, -5, 'spotlight').seconds, 30);
  assert.equal(posterCycle(rows, 3601, 'spotlight').seconds, 30);
  assert.equal(posterCycle(rows, 3600, 'spotlight').seconds, 10800);
  assert.equal(posterCycle('invalid', 10, 'spotlight').items, 0);
});
