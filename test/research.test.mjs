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
