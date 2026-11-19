import {test} from 'node:test';
import assert from 'node:assert/strict';
import productHandler from '../api/product.js';
import {summarize,retainResearchSummary} from '../server.mjs';

test('a failed reviewer preserves an existing cited AI summary but never its unreviewed verdict',()=>{
  const r=retainResearchSummary({research:{status:'ready',sources:[{url:'https://example.com/report'}],summary:'Resumen real de la investigación.',assessment:{conclusion:'indicios'}}},{aiStatus:'unavailable',aiFailure:'quota'});
  assert.equal(r.aiStatus,'ready');assert.equal(r.summary,'Resumen real de la investigación.');
  assert.equal(r.aiStage,'research_only');assert.equal(r.assessment,undefined);
  assert.equal(retainResearchSummary({research:{status:'unavailable',summary:'No verificable'}},{aiStatus:'unavailable'}).aiStatus,'unavailable');
});

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

test('manual product research remains explicitly user supplied and keeps a distinct history identifier',async()=>{
  const oldFetch=globalThis.fetch,oldKey=process.env.AI_API_KEY,oldModel=process.env.OLLAMA_MODEL;
  delete process.env.AI_API_KEY;process.env.OLLAMA_MODEL='test-local';
  globalThis.fetch=async()=>Response.json({message:{content:JSON.stringify({resumen:'No hay una promesa comprobada.',conclusion:'insuficiente',razones:[],faltantes:[]})}});
  let status,payload;
  try {
    await productHandler({method:'GET',url:'/api/product?name=Pasta+dental+variante+de+prueba&brand=Marca+de+prueba'}, {writeHead(code){status=code;},end(body){payload=JSON.parse(body);}});
    assert.equal(status,200);assert.equal(payload.identitySource,'user');assert.match(payload.code,/^manual:[a-f0-9]{16}$/);assert.equal(payload.source,null);
  } finally {
    globalThis.fetch=oldFetch;
    if(oldKey===undefined) delete process.env.AI_API_KEY;else process.env.AI_API_KEY=oldKey;
    if(oldModel===undefined) delete process.env.OLLAMA_MODEL;else process.env.OLLAMA_MODEL=oldModel;
  }
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
  assert.deepEqual(result, {aiStatus:'unavailable',aiFailure:'quota',aiHttpStatus:429});
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

test('hosted default model requests strict assessments with a reasoning budget', async () => {
  const result = await summarize({name:'Producto',claims:[]}, async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.model,'openai/gpt-oss-20b');
    assert.equal(body.response_format.type,'json_schema');
    assert.equal(body.response_format.json_schema.strict,true);
    assert.equal(body.reasoning_effort,'low');
    assert.ok(body.max_completion_tokens >= 1500);
    return Response.json({choices:[{message:{content:JSON.stringify({
      resumen:'Datos insuficientes.',conclusion:'insuficiente',razones:[],faltantes:[]
    })}}]});
  }, {AI_API_KEY:'test-key'});
  assert.equal(result.aiStatus,'ready');
});

test('a high impact grade and uncited research cannot become a greenwashing finding', async()=>{
  const result=await summarize({name:'Producto',grade:'F',claims:[],research:{status:'ready',text:'Impacto estimado alto.',sources:[{url:'https://example.com/impact'}]}},
    async()=>Response.json({choices:[{message:{content:JSON.stringify({resumen:'Faltan datos.',conclusion:'indicios',razones:['Impacto alto'],faltantes:[]})}}]}),
    {AI_API_KEY:'test-key'});
  assert.equal(result.assessment.conclusion,'insuficiente');
});
