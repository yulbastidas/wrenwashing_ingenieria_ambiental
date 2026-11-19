import {classifyWaste,materialNames,normalizeWasteRecords,wasteCsv,wasteSources} from './circular.js';

export function initOffice(openScanner) {
  const $=s=>document.querySelector(s), key='ecolupa.office.v1';
  const el=(tag,text,cls)=>{const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n;};
  let records=[];
  try {records=normalizeWasteRecords(JSON.parse(localStorage.getItem(key)));} catch {}
  for (const select of [$('#waste-material'),$('#record-material')]) {
    for (const [value,label] of Object.entries(materialNames)) select.add(new Option(label,value));
  }
  const reportStatus=text=>{$('#office-status').textContent=text;};
  function persist(next) {
    try {localStorage.setItem(key,JSON.stringify(next)); records=next;return true;} catch {reportStatus('No se pudo guardar. Exporta tus registros antes de cerrar el navegador.');return false;}
  }
  function render() {
    const metrics=$('#office-metrics');metrics.replaceChildren();
    const kg=action=>records.filter(r=>r.action===action).reduce((s,r)=>s+r.kg,0).toLocaleString('es-CO',{maximumFractionDigits:3});
    for (const [title,value] of [['kg separados',kg('separated')],['kg reutilizados',kg('reuse')],['kg con entrega registrada',kg('delivered')]]) {
      const card=el('article','','panel activity-metric');card.append(el('strong',value),el('h3',title));metrics.append(card);
    }
    const list=$('#waste-records');list.replaceChildren();
    if (!records.length) list.append(el('p','Todavía no hay registros. Añade un pesaje real de la oficina para empezar.','empty'));
    const actions={reuse:'Reutilización',separated:'Separación pendiente de entrega',delivered:'Entrega con referencia',special:'Gestión diferenciada pendiente'};
    for (const r of records) {
      const card=el('article','','waste-record');
      const body=el('div','');body.append(el('strong',materialNames[r.material]),el('p',`${r.kg.toLocaleString('es-CO')} kg · ${actions[r.action]} · ${new Date(r.date).toLocaleDateString('es-CO')}`));
      if (r.reference) body.append(el('p','Referencia: '+r.reference));
      const remove=el('button','Eliminar','link');remove.type='button';remove.setAttribute('aria-label','Eliminar registro de '+materialNames[r.material]);
      remove.onclick=()=>{if (confirm('¿Eliminar este registro local?') && persist(records.filter(x=>x.id!==r.id))) {render();reportStatus('Registro eliminado.');}};
      card.append(body,remove);list.append(card);
    }
    $('#export-waste').disabled=!records.length;
  }
  $('#waste-guide').onsubmit=event=>{
    event.preventDefault(); const result=$('#waste-result');
    const values=Object.fromEntries(new FormData(event.currentTarget));
    const outcome=classifyWaste(values);result.replaceChildren();result.hidden=false;result.dataset.route=outcome.route;
    result.append(el('span','ORIENTACIÓN SEGÚN TUS RESPUESTAS','section-tag'),el('h2',outcome.title));
    const list=el('ol','');for (const step of outcome.steps) list.append(el('li',step));result.append(list);
    result.append(el('p','No es reconocimiento automático por imagen ni un certificado ambiental. Confirma la ruta con el responsable y el gestor local.'));
    $('#record-material').value=values.material;
    $('#record-action').value=outcome.route==='reuse'?'reuse':['special','secure'].includes(outcome.route)?'special':'separated';
    $('#record-reference').required=false;
    result.focus({preventScroll:true});result.scrollIntoView({behavior:'smooth',block:'nearest'});
  };
  $('#waste-record-form').onsubmit=event=>{
    event.preventDefault();
    const f=new FormData(event.currentTarget), kg=Number(f.get('kg')), action=f.get('action'), reference=f.get('reference').trim();
    if (!Number.isFinite(kg) || kg<=0 || kg>10000) return reportStatus('Registra un peso mayor que cero y de hasta 10.000 kg.');
    if (action==='delivered' && !reference) return reportStatus('Para registrar una entrega, añade la referencia del acta o comprobante.');
    const next=normalizeWasteRecords([{id:crypto.randomUUID(),date:new Date().toISOString(),material:f.get('material'),kg,action,reference},...records]);
    if (persist(next)) {render();$('#record-weight').value='';$('#record-reference').value='';reportStatus('Registro guardado en este navegador. La referencia es declarada por ti; la app no valida el comprobante.');}
  };
  $('#record-action').onchange=()=>{$('#record-reference').required=$('#record-action').value==='delivered';};
  $('#export-waste').onclick=()=>{
    const url=URL.createObjectURL(new Blob([wasteCsv(records)],{type:'text/csv;charset=utf-8'}));const a=el('a','');a.href=url;a.download='ecolupa-oficina-circular.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  for (const source of wasteSources) {const a=el('a',source.name);a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';$('#waste-sources').append(a);}
  $('#office-scan').onclick=openScanner;
  render();
  return {render,prefill(name){$('#waste-product-context').textContent='Producto consultado: '+name+'. Selecciona el material real del residuo; su código no lo determina.';}};
}
