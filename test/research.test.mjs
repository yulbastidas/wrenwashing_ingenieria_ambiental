import {test} from 'node:test';
import assert from 'node:assert/strict';
import {researchProduct} from '../research.mjs';

test('research requires browser search and returns public HTTPS links', async()=>{
  const result=await researchProduct({code:'6281001112013',name:'Colgate'},async(_url,options)=>{
    const body=JSON.parse(options.body);
    assert.deepEqual(body.tools,[{type:'browser_search'}]);
    assert.equal(body.tool_choice,'required');
    assert.equal(body.response_format,undefined);
    return Response.json({choices:[{message:{content:'Una afirmación sobre el envase. Fuente https://example.com/report . Otra https://127.0.0.1/private'}}]});
  },{AI_API_KEY:'test-key'});
  assert.equal(result.status,'ready');
  assert.deepEqual(result.sources,[{name:'example.com',url:'https://example.com/report'}]);
});

test('search failure keeps an explicit unavailable state', async()=>{
  const result=await researchProduct({code:'6281001112013'},async()=>new Response(null,{status:429}),{AI_API_KEY:'test-key'});
  assert.equal(result.status,'unavailable');
  assert.equal(result.httpStatus,429);
  assert.deepEqual(result.sources,[]);
});

test('cited search assessment retains scope and only confirmed product identities', async()=>{
  const payload={nombre:'Producto',marca:'Marca',identidadConfirmada:true,resumen:'Afirmación contrastada con fuentes.',
    conclusion:'sin_indicios',alcance:'marca',razones:['Fuente de la marca'],faltantes:[],investigacion:'Hechos limitados a la marca.',
    fuentes:[{nombre:'Fuente',url:'https://example.com/report'}]};
  const result=await researchProduct({code:'6281001112013'},async()=>Response.json({
    choices:[{message:{content:JSON.stringify(payload)}}]
  }),{AI_API_KEY:'test-key'});
  assert.equal(result.assessment.scope,'marca');
  assert.equal(result.assessment.conclusion,'sin_indicios');
  assert.equal(result.identity.name,'Producto');
  assert.equal(result.sources[0].url,'https://example.com/report');
});
