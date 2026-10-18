import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BoxGeometry,BufferGeometry} from 'three';
import {estimatePrintTime} from '../src/utils/printEstimator';
import {analyzeGCode} from '../src/utils/gcodeAnalyzer';
const s={layerHeight:1,infillDensity:100,printSpeed:100,outerWallSpeed:100,infillSpeed:100,travelSpeed:100,printTemperature:200,bedTemperature:60,supportMaterial:false,raftEnabled:false,nozzleDiameter:.5/1.2};
test('uncached bounds and dimensional infill path',()=>{const r=estimatePrintTime(new BoxGeometry(10,10,1),s)!;assert.equal(r.breakdown.infill,2);assert.equal(r.requiresConfirmation,true);});
test('invalid geometry and settings never create usable estimates',()=>{assert.equal(estimatePrintTime(new BufferGeometry(),s),null);assert.equal(estimatePrintTime(new BoxGeometry(10,10,0),s),null);assert.equal(estimatePrintTime(new BoxGeometry(),{...s,layerHeight:0}),null);});
test('G-code remains preliminary',()=>{assert.equal(analyzeGCode('G91\nG1 X10 E1').requiresConfirmation,true);});
