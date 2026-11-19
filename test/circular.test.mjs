import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classifyWaste,normalizeWasteRecords,wasteCsv} from '../public/circular.js';
const input={material:'paper',condition:'clean',confidential:'no',reusable:'no'};
test('office guide separates clean paper, food contamination and reuse',()=>{
  assert.equal(classifyWaste(input).route,'white');
  assert.equal(classifyWaste({...input,condition:'food'}).route,'black');
  assert.equal(classifyWaste({...input,reusable:'yes'}).route,'reuse');
});
test('confidentiality and chemicals override ordinary recycling',()=>{
  assert.equal(classifyWaste({...input,confidential:'yes',reusable:'yes'}).route,'secure');
  assert.equal(classifyWaste({...input,condition:'chemical'}).route,'special');
  assert.equal(classifyWaste({...input,material:'electronic'}).route,'special');
});
test('unknown conditions, thermal paper and moisture require local review',()=>{
  for (const patch of [{condition:'unknown'},{condition:'wet'},{material:'thermal'},{confidential:'unknown'}]) assert.equal(classifyWaste({...input,...patch}).route,'review');
  assert.throws(()=>classifyWaste({...input,material:'invalid'}));
});
test('waste records require a positive measured mass and delivery reference',()=>{
  const r={id:'one',date:new Date().toISOString(),material:'paper',kg:2,action:'delivered',reference:'ACTA-01'};
  assert.equal(normalizeWasteRecords([r,{...r,kg:-1},{...r,reference:''}]).length,1);
  assert.match(wasteCsv([{...r,reference:'=CMD()'}]),/"'=CMD\(\)"/);
});
