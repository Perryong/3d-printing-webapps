import { test } from "node:test";
import assert from "node:assert/strict";
import { scaleForDimensions } from "../src/utils/modelDimensions";
test("dimension scale is absolute, proportional by default, independently editable", () => {
  const original = { x: 20, y: 10, z: 5 };
  assert.deepEqual(
    scaleForDimensions(original, { x: 40, y: 10, z: 5 }, "x", true),
    { x: 2, y: 2, z: 2 },
  );
  assert.deepEqual(
    scaleForDimensions(original, { x: 20, y: 10, z: 8 }, "z", false),
    { x: 1, y: 1, z: 1.6 },
  );
  assert.deepEqual(
    scaleForDimensions(original, { x: 40, y: 20, z: 10 }, "x", true),
    { x: 2, y: 2, z: 2 },
  );
  for (const x of [0, -1, NaN, Infinity])
    assert.throws(() =>
      scaleForDimensions(original, { x, y: 10, z: 5 }, "x", true),
    );
  assert.throws(() =>
    scaleForDimensions({ x: 20, y: 10, z: 0 }, original, "x", true),
  );
});

test('relocking proportions preserves the applied customized shape',()=>{
 const original={x:20,y:10,z:5},current={x:20,y:10,z:8};
 assert.deepEqual(scaleForDimensions(original,{x:40,y:10,z:8},'x',true,current),{x:2,y:2,z:3.2});
});
