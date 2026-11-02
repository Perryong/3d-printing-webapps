import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('gallery ships eight current designs with usable local previews and seven valid STL downloads', () => {
  const manifest = resolve('public/singapore-products/catalog.json');
  assert.ok(existsSync(manifest), 'Gallery catalog is not generated yet');
  const products = JSON.parse(readFileSync(manifest, 'utf8'));
  assert.equal(products.length, 8);
  assert.equal(new Set(products.map(p => p.id)).size, 8);
  assert.deepEqual(products.map(p => p.id), ['lapis-bloom', 'tutu-keychain', 'chope-marker', 'hdb-pencil-pot', 'kopi-clip-cup', 'peranakan-coaster', 'wafer-card-stand', 'kaya-reveal-concept']);
  assert.ok(products.some(p => p.id === 'tutu-keychain'));
  assert.ok(!products.some(p => /dragon|lapis-stack|tutu-touch/.test(p.id)));
  const prints = products.filter(p => p.stl);
  assert.equal(prints.length, 7);
  for (const product of products) {
    for (const asset of [product.viewer, product.preview, product.blend, product.stl].filter(Boolean)) {
      assert.ok(asset.startsWith('/singapore-products/'), asset);
      assert.ok(existsSync(resolve('public', '.' + asset)), asset);
    }
    const html = readFileSync(resolve('public', '.' + product.viewer), 'utf8');
    assert.ok(html.includes('getContext(\'webgl\''), 'Actual mesh renderer required');
    assert.ok(!html.includes('@@GEOMETRY@@'));
    if (product.stl) {
      const stl = readFileSync(resolve('public', '.' + product.stl));
      assert.equal(stl.length, 84 + 50 * stl.readUInt32LE(80));
      assert.ok(stl.readUInt32LE(80) > 0);
      assert.equal(product.status, 'Printable prototype');
    } else assert.equal(product.status, 'Concept only');
  }
});
