import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('gallery ships nine current designs with usable local previews and nine valid STL downloads', () => {
  const manifest = resolve('public/singapore-products/catalog.json');
  assert.ok(existsSync(manifest), 'Gallery catalog is not generated yet');
  const products = JSON.parse(readFileSync(manifest, 'utf8'));
  assert.equal(products.length, 9);
  assert.equal(new Set(products.map(p => p.id)).size, 9);
  assert.deepEqual(products.map(p => p.id), ['wafer-coin-collector', 'kopitiam-keycap-clicker', 'tutu-keychain', 'chope-marker', 'hdb-pencil-pot', 'dragon-playground-watch-holder', 'peranakan-coaster', 'hawker-bakes-clicker', 'kaya-toast-egg-clicker']);
  assert.ok(products.some(p => p.id === 'tutu-keychain'));
  assert.ok(!products.some(p => /dragon-cable-rest|kopi-clip-cup|lapis-stack|lapis-bloom|tutu-touch/.test(p.id)));
  for (const clicker of [products[1], products[7], products[8]]) assert.ok(clicker.threemf?.endsWith('.3mf'));
  const prints = products.filter(p => p.stl);
  assert.equal(prints.length, 9);
  for (const product of products) {
    for (const asset of [product.viewer, product.preview, product.blend, product.stl, product.stlParts, product.threemf].filter(Boolean)) {
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

test('production supports opening the gallery URL directly', () => {
  const config = JSON.parse(readFileSync(resolve('vercel.json'), 'utf8'));
  assert.ok(config.rewrites.some(rule => rule.source === '/singapore-gallery' && rule.destination === '/index.html'));
});
