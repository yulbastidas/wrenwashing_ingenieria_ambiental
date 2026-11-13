import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHistory } from '../public/history.js';

test('restores legacy products and rejects unsafe links and malformed fields', () => {
  const products = normalizeHistory([
    { code: '3017620422003', name: 'Nutella', claims: [null, 'en:organic'],
      source: { url: 'javascript:alert(1)' }, notes: 'Mis notas', favorite: true },
    { code: '3017620422003', name: 'Duplicado' },
    { code: '123', name: 'Inválido' }
  ]);
  assert.equal(products.length, 1);
  assert.deepEqual(products[0].claims, ['en:organic']);
  assert.equal(products[0].source.url, undefined);
  assert.equal(products[0].notes, 'Mis notas');
  assert.equal(products[0].favorite, true);
  assert.equal(products[0].grade, null);
});

test('checks backup version and keeps current export fields', () => {
  assert.throws(() => normalizeHistory({ version: 2, products: [] }));
  assert.throws(() => normalizeHistory({ version: 1, products: [{code: 'x'}] }));
  assert.equal(normalizeHistory({ version: 1, products: [
    {code: '3017620422003', name: 'Producto', grade: 'A+'}
  ]})[0].grade, 'A+');
});
