import {test} from 'node:test';
import assert from 'node:assert/strict';
import productHandler from '../api/product.js';
import {summarize} from '../server.mjs';

test('Vercel adapter rejects invalid codes before any catalogue request', async () => {
  let status;
  let payload;
  const response = {
    writeHead(code) { status = code; },
    end(body) { payload = JSON.parse(body); }
  };
  await productHandler({method:'GET', url:'/api/product?code=123'}, response);
  assert.equal(status, 400);
  assert.equal(typeof payload.error, 'string');
});

test('cloud summary keeps credentials server-side and parses provider response', async () => {
  const result = await summarize({name:'Producto', claims:[], seals:[]}, async (url, options) => {
    assert.equal(String(url), 'https://api.groq.com/openai/v1/chat/completions');
    assert.equal(options.headers.Authorization, 'Bearer test-key');
    const request = JSON.parse(options.body);
    assert.equal(request.model, 'test-model');
    assert.equal(request.response_format.type, 'json_object');
    return Response.json({choices:[{message:{content:JSON.stringify({resumen:'Revisa la ficha del producto.'})}}]});
  }, {AI_API_KEY:'test-key', AI_MODEL:'test-model'});
  assert.deepEqual(result, {aiStatus:'ready', aiProvider:'cloud', summary:'Revisa la ficha del producto.',
    assessment:{conclusion:'insuficiente',reasons:[],missing:[]}});
  assert.equal(JSON.stringify(result).includes('test-key'), false);
});

test('provider outages preserve the evidence report fallback', async () => {
  const result = await summarize({name:'Producto'}, async () => new Response(null, {status:429}), {
    AI_API_KEY:'test-key', AI_MODEL:'test-model'
  });
  assert.deepEqual(result, {aiStatus:'unavailable'});
});

test('local assessment uses the selected model and avoids unsupported verdicts', async () => {
  const result = await summarize({name:'Producto', claims:[], seals:[]}, async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'qwen3:4b');
    assert.equal(body.think, false);
    return Response.json({message:{content:JSON.stringify({
      resumen:'Falta una afirmación ambiental concreta.',
      conclusion:'indicios', razones:['Falta información'], faltantes:['Etiqueta ambiental']
    })}});
  }, {OLLAMA_MODEL:'qwen3:4b'});
  assert.equal(result.aiProvider,'local');
  assert.equal(result.assessment.conclusion,'insuficiente');
  assert.deepEqual(result.assessment.missing,['Etiqueta ambiental']);
});
