import { test, expect } from "@playwright/test";
import { BoxGeometry, Mesh, Vector3 } from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { readFile } from "node:fs/promises";
import {createRequire} from "node:module";
const require=createRequire(process.cwd()+"/functions/package.json");
const {initializeApp,getApps}=require("firebase-admin/app");
const {getStorage}=require("firebase-admin/storage");
const model = (x = 20, y = 10, z = 5) =>
  Buffer.from(
    new STLExporter().parse(new Mesh(new BoxGeometry(x, y, z)), {
      binary: true,
    }).buffer,
  );
test("dimension drafts, proportional/unlocked edit, download and quote dimensions", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "resize.stl",
      mimeType: "application/octet-stream",
      buffer: model(),
    });
  await page.getByText("Customize STL dimensions", { exact: true }).click();
  await expect(
    page.getByLabel("X dimension (mm)", { exact: true }),
  ).toHaveValue("20");
  await page.getByLabel("X dimension (mm)", { exact: true }).fill("40");
  await expect(
    page.getByLabel("Y dimension (mm)", { exact: true }),
  ).toHaveValue("20");
  await page.getByRole('button',{name:'Reset original dimensions'}).click();
  await expect(page.getByLabel('X dimension (mm)',{exact:true})).toHaveValue('20');
  await page.getByLabel('X dimension (mm)',{exact:true}).fill('40');
  await expect(
    page.getByRole("button", { name: "Download edited STL" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Get print quote / My orders" })
    .click();
  await expect(
    page.getByRole("button", { name: "Estimate price", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Close checkout" }).click();
  await page.getByRole("button", { name: "Apply dimensions" }).click();
  await expect(
    page.getByText("Placed build dimensions: 40.00 × 20.00 × 10.00 mm"),
  ).toBeVisible();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download edited STL" }).click();
  const bytes = await readFile((await (await downloaded).path())!);
  const g = new STLLoader().parse(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
  g.computeBoundingBox();
  expect(g.boundingBox!.getSize(new Vector3()).toArray()).toEqual([40, 20, 10]);
  g.dispose();
  await page.getByRole("button", { name: "Reset original dimensions" }).click();
  await page.getByLabel("Lock proportions for dimension edits").uncheck();
  await page.getByLabel("Z dimension (mm)", { exact: true }).fill("8");
  await expect(
    page.getByText(/Independent scaling changes holes/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Apply dimensions" }).click();
  await expect(
    page.getByText("Placed build dimensions: 20.00 × 10.00 × 8.00 mm"),
  ).toBeVisible();
  await page.getByLabel('Lock proportions for dimension edits').check();
  await page.getByLabel('X dimension (mm)',{exact:true}).fill('40');
  await expect(page.getByLabel('Z dimension (mm)',{exact:true})).toHaveValue('16');
  await page.getByRole('button',{name:'Apply dimensions'}).click();
  await expect(page.getByText('Placed build dimensions: 40.00 × 20.00 × 16.00 mm')).toBeVisible();
  const finalDownload=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download edited STL'}).click();
  const expectedBytes=await readFile((await (await finalDownload).path())!);
  let submitted:any;
  page.on('request',r=>{if(r.url().endsWith('/requestQuote') && r.method()==='POST')submitted=r.postDataJSON().data;});
  await page
    .getByRole("button", { name: "Get print quote / My orders" })
    .click();
  await expect(page.getByLabel('Add reference photos')).toHaveCount(0);
  await expect(page.getByLabel('Reference notes')).toHaveCount(0);
  await expect(page.getByLabel('Known measurement (mm)',{exact:true})).toHaveCount(0);
  await page
    .getByRole("button", { name: "Estimate price", exact: true })
    .click();
  await expect(
    page.getByText("Estimated total", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Name", { exact: true }).fill("Customization demo");
  await page.getByLabel("Email", { exact: true }).fill("demo@example.test");
  await page.getByLabel("Phone", { exact: true }).fill("81234567");
  await page.getByRole("button", { name: "Request confirmed quote" }).click();
  await expect(
    page.getByText("Awaiting owner slicing and quote confirmation"),
  ).toBeVisible();
  const order = page
    .locator("article")
    .filter({ hasText: "Awaiting owner slicing" });
  await order.getByText("Model dimensions", { exact: true }).click();
  await expect(order.getByText("Source: resize.stl")).toBeVisible();
  const admin=getApps().find((a:any)=>a.name==='customization-e2e')??initializeApp({projectId:'demo-print-checkout'},'customization-e2e');
  const [uploaded]=await getStorage(admin).bucket('demo-print-checkout.firebasestorage.app').file(submitted.modelPath).download();
  expect(Buffer.compare(uploaded,expectedBytes)).toBe(0);
  expect(submitted).not.toHaveProperty("references");
  expect(submitted).not.toHaveProperty("referenceNotes");

});
test("oversize export permitted, G-code and empty input cannot quote", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Get print quote / My orders" })
    .click();
  await expect(page.getByRole('button',{name:'Estimate price',exact:true})).toHaveCount(0);
  await expect(page.getByLabel('Add reference photos')).toHaveCount(0);
  await page.getByRole("button", { name: "Close checkout" }).click();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "large.stl",
      mimeType: "application/octet-stream",
      buffer: model(300),
    });
  await page.getByText("Customize STL dimensions", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Download edited STL" }),
  ).toBeEnabled();
  await expect(page.getByText(/Outside the A1 build volume/)).toBeVisible();
  await page
    .getByRole("button", { name: "Get print quote / My orders" })
    .click();
  await expect(
    page.getByRole("button", { name: "Estimate price", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Close checkout" }).click();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "toolpath.gcode",
      mimeType: "text/plain",
      buffer: Buffer.from("G28\nG1 X10 Y10 Z1 E1 F1200\n"),
    });
  await expect(page.getByText(/G-code is read-only analysis/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download edited STL" }),
  ).toHaveCount(0);
});

test('late estimates and model uploads cannot submit a changed model',async({page})=>{
 await page.goto('/');
 const load=(x:number)=>page.locator('input[type=file]').first().setInputFiles({name:`part-${x}.stl`,mimeType:'application/octet-stream',buffer:model(x)});
 await load(20);
 await page.getByRole('button',{name:'Get print quote / My orders'}).click();
 let release=()=>{};let started=()=>{};
 const waiting=new Promise<void>(resolve=>{started=resolve;});
 const hold=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/previewQuote',async route=>{if(route.request().method()==='OPTIONS'){await route.continue();return;}started();await hold;await route.continue();});
 await page.getByRole('button',{name:'Estimate price',exact:true}).click();await waiting;
 await load(30);release();
 await expect(page.getByRole('button',{name:'Estimate price',exact:true})).toBeEnabled();
 await expect(page.getByText('Estimated total',{exact:false})).toHaveCount(0);
 await page.unroute('**/previewQuote');
 await page.getByRole('button',{name:'Estimate price',exact:true}).click();
 await page.getByLabel('Name',{exact:true}).fill('Race demo');await page.getByLabel('Email',{exact:true}).fill('race@example.test');await page.getByLabel('Phone',{exact:true}).fill('81234567');
 let uploadStarted=()=>{},releaseUpload=()=>{},requests=0;
 const uploadWaiting=new Promise<void>(r=>{uploadStarted=r;}),uploadHold=new Promise<void>(r=>{releaseUpload=r;});
 page.on('request',r=>{if(r.url().endsWith('/requestQuote') && r.method()==='POST')requests++;});
 await page.route('**/v0/b/**',async route=>{if(route.request().method()!=='POST'){await route.continue();return;}uploadStarted();await uploadHold;await route.continue();});
 await page.getByRole('button',{name:'Request confirmed quote'}).click();await uploadWaiting;
 await load(40);
 await expect(page.getByText('Quoting part-40.stl:',{exact:false})).toBeVisible();
 releaseUpload();
 await expect(page.getByText('Your draft changed during upload. Review it and submit again.')).toBeVisible();
 expect(requests).toBe(0);
});

test('phone dimension actions remain exposed with room for the model', async ({page}) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({width,height:844});
    await page.goto('/');
    await page.locator('input[type=file]').first().setInputFiles({name:'phone.stl',mimeType:'application/octet-stream',buffer:model()});
    await page.getByText('Customize STL dimensions',{exact:true}).click();
    for (const name of ['Apply dimensions','Reset original dimensions','Download edited STL']) {
      const button=page.getByRole('button',{name,exact:true});
      // Visibility must include clipping and overlays, not merely DOM visibility.
      expect(await button.evaluate(e=>{
        const r=e.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
        return hit===e || e.contains(hit);
      }),name).toBe(true);
    }
    expect((await page.getByTestId('inspection-viewer').boundingBox())!.height).toBeGreaterThanOrEqual(340);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
  }
});
