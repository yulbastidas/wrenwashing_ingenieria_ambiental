import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validCode} from '../public/evaluation.js';
import {lookup} from '../server.mjs';

test('validates GTIN check digits while keeping leading zeros',()=>{
  assert.equal(validCode('3017620422003'),true);
  assert.equal(validCode('0036000291452'),true);
  assert.equal(validCode('3017620422004'),false);
  assert.equal(validCode('12345'),false);
});
test('maps a real catalogue response to evidence without inventing a grade',async()=>{
  const {report}=await lookup('3017620422003',async url=>url.includes('openfoodfacts')
    ? Response.json({status:1,product:{product_name:'Nutella',brands:'Nutella, Ferrero',environmental_score_grade:'unknown',labels_tags:['en:recyclable','en:fairtrade']}})
    : new Response(null,{status:404}));
  assert.equal(report.grade,null);
  assert.deepEqual(report.claims,['en:recyclable']);
  assert.deepEqual(report.seals,['en:fairtrade']);
  assert.equal(report.context.company,'Ferrero');
  assert.ok(report.context.independentUrl);
});
test('distinguishes an incomplete lookup from a code absent from every catalogue',async()=>{
  assert.deepEqual(await lookup('3017620422003',async()=>new Response(null,{status:404})),{unavailable:false});
  assert.deepEqual(await lookup('3017620422003',async()=>{throw new Error('Offline');}),{unavailable:true});
});
