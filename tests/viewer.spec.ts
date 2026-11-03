import { test, expect } from '@playwright/test';
import { BoxGeometry, Mesh } from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';

test('inspection modes, dimensions, files, fullscreen and invalid STL', async ({page}) => {
  await page.goto('/');
  const load = async (name: string, size: number) => page.locator('input[type=file]').first().setInputFiles({name, mimeType:'application/octet-stream', buffer:Buffer.from(new STLExporter().parse(new Mesh(new BoxGeometry(size,30,40))))});
  await load('ascii.stl',20);
  await expect(page.locator('.viewer-dimension').first()).toBeVisible();
  for (const name of ['Grey solid', 'Wireframe', 'X-ray', 'Solid + edges']) {
    await page.getByRole('button',{name,exact:true}).click();
    await expect(page.getByRole('button',{name,exact:true})).toHaveAttribute('aria-pressed','true');
  }
  await page.getByRole('button',{name:'Dimensions',exact:true}).click();
  await expect(page.locator('.viewer-dimension').first()).toBeHidden();
  await page.getByRole('button',{name:'Grid',exact:true}).click();
  await expect(page.getByRole('button',{name:'Dimensions',exact:true})).toHaveAttribute('aria-pressed','false');
  await page.getByRole('button',{name:'Dimensions',exact:true}).click();
  await expect(page.locator('.viewer-dimension').first()).toBeVisible();
  await load('second.stl',50);
  await page.getByRole('button',{name:'Previous file',exact:true}).click();
  await expect(page.getByRole('combobox',{name:'Selected file'})).toContainText('ascii.stl');
  await expect(page.locator('.viewer-dimension').filter({hasText:'W 20.00 mm'})).toBeVisible();
  await page.getByRole('button',{name:'Next file',exact:true}).click();
  await expect(page.locator('.viewer-dimension').filter({hasText:'W 50.00 mm'})).toBeVisible();
  await page.getByRole('button',{name:'Fullscreen',exact:true}).click();
  await expect(page.getByRole('button',{name:'Exit fullscreen'})).toBeVisible();
  expect(await page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  const canvas = page.locator('canvas').first();
  const before = await canvas.boundingBox();
  await page.getByRole('button',{name:'Exit fullscreen'}).click();
  await page.setViewportSize({width:390,height:844});
  await expect.poll(async () => (await canvas.boundingBox())!.width).toBeLessThanOrEqual(390);
  expect(before!.height).toBeGreaterThan(100);
  await expect(page.getByRole('button',{name:'Fullscreen',exact:true})).toBeVisible();
  await page.locator('input[type=file]').first().setInputFiles({name:'broken.stl',mimeType:'application/octet-stream',buffer:Buffer.from('solid empty\nendsolid empty')});
  await expect(page.getByText(/Invalid STL:/)).toBeVisible();
  await expect(page.locator('.viewer-dimension').filter({hasText:'W 50.00 mm'})).toBeVisible();
  await page.getByRole('button',{name:'About',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Senior AI Engineer',exact:true})).toBeVisible();
});

test('dropping a collection STL on the workspace opens its 3D preview', async ({page}) => {
  await page.goto('/');
  const filePath = '/singapore-products/dragon-playground-watch-holder/dragon-playground-watch-holder.stl';
  const transfer = await page.evaluateHandle(async path => {
    const response = await fetch(path);
    if (!response.ok) throw Error('Missing STL fixture');
    const data = new DataTransfer();
    data.items.add(new File([await response.blob()], 'dragon-holder.stl'));
    return data;
  }, filePath);
  const target = page.getByRole('heading', {name: 'Drop an STL to view it in 3D'});
  await target.dispatchEvent('dragover', {dataTransfer: transfer});
  await target.dispatchEvent('drop', {dataTransfer: transfer});
  await expect(page.getByRole('combobox', {name: 'Selected file'}).locator('option:checked')).toHaveText('dragon-holder.stl');
  await expect(page.locator('.viewer-dimension').filter({hasText:'W 113.00 mm'})).toBeVisible();
});
