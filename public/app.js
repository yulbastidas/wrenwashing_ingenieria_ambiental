import {validCode} from './evaluation.js';
import {normalizeHistory} from './history.js';
const $=s=>document.querySelector(s);
const key='ecolupa.history.v1';
let history=[];
try { history=normalizeHistory(JSON.parse(localStorage.getItem(key)) || []); } catch {}
const demo={demo:true,name:'Jabón Bosque Claro',brand:'Marca ficticia',grade:'B',claims:['biodegradable'],seals:[],date:new Date().toISOString()};
let cameraToken=0,stream,timer,controls,busy=false;
const status=message=>{$('#status').textContent=message;};
const node=(tag,content,cls)=>{const el=document.createElement(tag);el.textContent=content;if(cls)el.className=cls;return el;};
const formatDate=value=>{const d=new Date(value);return Number.isNaN(+d)?'':d.toLocaleString('es-CO',{dateStyle:'medium',timeStyle:'short'});};
const cleanLabel=value=>value.replace(/^[a-z]{2}:/,'').replaceAll('-',' ');
function stopCamera(){
  ++cameraToken;clearTimeout(timer);controls?.stop();controls=null;
  stream?.getTracks().forEach(t=>t.stop());stream=null;
  const video=$('#video');video.srcObject=null;video.hidden=true;
  $('#camera-label').textContent='CÁMARA INACTIVA';$('#camera').firstChild.textContent='Activar cámara ';
}
function page(name){
  if(name!=='scan') stopCamera();
  for(const id of ['home','scan','history','compare','activity']) $('#'+id).hidden=id!==name;
  document.querySelectorAll('[data-page]').forEach(b=>b.dataset.page===name?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current'));
  if(name==='history') renderHistory();
  if(name==='compare') renderComparison();
  if(name==='activity') renderActivity();
  if(name==='home') renderHome();
  const titles = {home:'Tu espacio de consumo consciente',scan:'Escáner de productos',history:'Tu biblioteca de consultas',compare:'Comparador de productos',activity:'Tu actividad en EcoLupa'};
  $('#page-location').textContent = titles[name];
  window.scrollTo({top:0,behavior:'instant'});
}
function save(){
  $('#count').textContent=history.length;
  try {localStorage.setItem(key,JSON.stringify(history));return true;}
  catch {return false;}
}
function link(text,url){
  try {if(new URL(url).protocol!=='https:')return;}catch{return;}
  const a=node('a',text+' ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';$('.sources').append(a);
}
function showReport(r){
  const result=$('#result');result.replaceChildren($('#report').content.cloneNode(true));result.hidden=false;
  result.querySelector('.section-tag').textContent=r.demo?'EJEMPLO FICTICIO':'03 / INFORME DEL PRODUCTO';
  $('#result-title').textContent=r.name;
  $('.meta').textContent=[r.brand,r.code,r.demo?'No se guarda en el historial':formatDate(r.date)].filter(Boolean).join(' · ');
  const labels=(r.claims||[]).map(cleanLabel),seals=(r.seals||[]).map(cleanLabel);
  const cards=[
    ['Impacto ambiental',r.grade?'Green-Score '+r.grade:'Sin clasificación',r.grade?(['A+','A','B'].includes(r.grade)?'Impacto estimado relativamente bajo según esta escala.':r.grade==='C'?'Impacto estimado intermedio según esta escala.':'Impacto estimado relativamente alto según esta escala.')+' No es una certificación del producto.':'No hay datos suficientes para clasificarlo como ecológico.'],
    ['Posible greenwashing',labels.length?'Afirmaciones por verificar':'Sin evidencia suficiente',labels.length?'El catálogo registra: '+labels.join(', ')+'. Revisa qué respalda cada afirmación; esto no demuestra engaño.':'La ficha no aporta afirmaciones ambientales suficientes para evaluar si son engañosas.'],
    ['Reputación empresarial',r.context?r.context.company+' · evidencia parcial':'Sin verificación',r.context?r.context.description:'El código no acredita la reputación de la empresa. Busca evaluaciones independientes y verifica la fecha y el alcance.']
  ];
  if(seals.length) cards[0][2]+=' Sellos registrados: '+seals.join(', ')+'. Confirma su vigencia con la entidad certificadora.';
  for(const [title,value,description] of cards){
    const card=node('article','','report-card');card.append(node('h3',title),node('strong',value),node('p',description));$('.report-grid').append(card);
  }
  if (r.grade) {
    const scale = node('div', '', 'grade-scale');
    scale.setAttribute('aria-label', 'Green-Score del producto');
    for (const grade of ['A+', 'A', 'B', 'C', 'D', 'E', 'F']) {
      const step = node('span', grade);
      if (grade === r.grade) step.setAttribute('aria-current', 'true');
      scale.append(step);
    }
    $('.report-card').append(scale);
  }
  const ai=$('.ai');ai.hidden=false;
  if (r.assessment) {
    const names = {indicios:'Indicios de greenwashing',sin_indicios:'Sin indicios en la evidencia revisada',insuficiente:'Evidencia insuficiente para concluir'};
    const verdict = node('section', '', 'ai-verdict');
    verdict.dataset.verdict = r.assessment.conclusion;
    verdict.append(node('div', 'EVALUACIÓN CON IA', 'section-tag'), node('h2', names[r.assessment.conclusion] || names.insuficiente));
    for (const [title, values] of [['Razones',r.assessment.reasons],['Qué falta comprobar',r.assessment.missing]]) {
      if (!values?.length) continue;
      verdict.append(node('h3',title));
      const list = document.createElement('ul');
      for (const value of values) list.append(node('li', value));
      verdict.append(list);
    }
    result.insertBefore(verdict, result.querySelector('.report-grid'));
  }
  ai.append(node('strong',r.demo?'Cómo leer este informe':r.summary?'Resumen generado por IA':'Resumen con datos del catálogo'));
  ai.append(node('p',r.demo?'Un Green-Score B aporta contexto sobre el impacto estimado. La afirmación «biodegradable» requiere evidencia específica, como condiciones y plazo de degradación.':r.summary|| (r.aiStatus==='unavailable'?'El resumen de IA no está disponible. Consulta la evidencia y sus fuentes.':'Revisa la ficha original, la fecha de consulta y el alcance de cada sello para tomar una decisión informada.')));
  if(r.source) link(r.source.name,r.source.url);
  if(r.grade && r.source?.name==='Open Food Facts') link('Cómo se calcula el Green-Score','https://blog.openfoodfacts.org/en/EN-Pro-Platform-User-Guide.pdf');
  if(r.context?.url) link('Declaración de '+r.context.company,r.context.url);
  if(r.context?.independentUrl) link('Evaluación WWF · 2026',r.context.independentUrl);
  if(r.brand && !r.demo) link('Buscar fuentes independientes','https://www.google.com/search?q='+encodeURIComponent('"'+(r.context?.company || r.brand.split(',')[0])+'" sostenibilidad sanciones ambientales investigación independiente'));
  addReportActions(r);
  $('#result-title').focus({preventScroll:true});result.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
}
async function analyze(raw){
  if(busy || readingPhoto)return;
  const code=raw.replace(/[\s-]/g,'');
  if(!validCode(code)){status('Ingresa un código EAN, UPC-A o GTIN válido, con 8, 12, 13 o 14 dígitos.');return;}
  stopCamera();$('#barcode').value=code;busy=true;
  $('#result').hidden=true;$('#lookup button').disabled=true;$('#camera').disabled=true;$('#demo').disabled=true;
  $('#lookup').setAttribute('aria-busy','true');
  status('Identificando el producto y evaluando su evidencia con IA. El modelo local puede tardar hasta 3 minutos en el primer análisis…');
  try{
    const res=await fetch('/api/product?code='+code,{signal:AbortSignal.timeout(205000)});
    const report=await res.json();
    if(!res.ok){
      const cached = history.find(entry => entry.code === code);
      if (res.status >= 500 && cached) {
        showReport(cached);
        const warning = node('p', 'No fue posible actualizar la ficha. Estás viendo tu consulta guardada del ' + formatDate(cached.date) + '.', 'app-notice');
        warning.setAttribute('role', 'status');
        $('#result').prepend(warning);
        status('Mostrando la última consulta guardada.');
      } else {
        status(report.error);
        if (res.status === 404) showMissingProduct(code);
      }
      return;
    }
    report.favorite = history.find(entry=>entry.code===code)?.favorite === true;
    report.notes = history.find(entry=>entry.code===code)?.notes || '';
    history=[report,...history.filter(r=>r.code!==code)].slice(0,100);
    const saved=save();
    status(saved?'Consulta guardada en tu historial.':'El navegador no permitió guardar la consulta.');
    if (!$('#scan').hidden) showReport(report);
    else if (!$('#history').hidden) renderHistory();
    else if (!document.querySelector('#compare').hidden) renderComparison();
    else if (!$('#activity').hidden) renderActivity();
    else renderHome();
  }catch{status('No pudimos completar la consulta. Comprueba la conexión e inténtalo de nuevo.');}
  finally{busy=false;$('#lookup').removeAttribute('aria-busy');$('#lookup button').disabled=false;$('#camera').disabled=false;$('#demo').disabled=false;}
}
async function startCamera(){
  if (busy || readingPhoto) return;
  if(stream || $('#camera-label').textContent==='INICIANDO…'){stopCamera();return;}
  const token=++cameraToken;
  const video=$('#video');
  $('#camera-label').textContent='INICIANDO…';$('#camera').firstChild.textContent='Cancelar cámara ';
  status('');
  const formats=['ean_13','ean_8','upc_a','itf'];
  try{
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('secure');
    const media=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'}}});
    if(token!==cameraToken){media.getTracks().forEach(t=>t.stop());return;}
    stream=media;video.srcObject=media;video.hidden=false;await video.play();
    if(token!==cameraToken)return;
    $('#camera-label').textContent='BUSCANDO CÓDIGO';$('#camera').firstChild.textContent='Detener cámara ';
    const available=window.BarcodeDetector?await window.BarcodeDetector.getSupportedFormats().catch(()=>[]):[];
    const accepted=formats.filter(f=>available.includes(f));
    if(token!==cameraToken)return;
    if(accepted.length===formats.length){
      const detector=new BarcodeDetector({formats:accepted});
      const frame=async()=>{
        if(token!==cameraToken)return;
        try{
          const codes=await detector.detect(video);
          if(token!==cameraToken)return;
          const code=codes.find(x=>validCode(x.rawValue))?.rawValue;
          if(code){analyze(code);return;}
        }catch{if(token===cameraToken){stopCamera();status('No se pudo leer la cámara. Puedes ingresar el código manualmente.');}return;}
        timer=setTimeout(frame,180);
      };
      frame();
    }else{
      const {BrowserMultiFormatReader}=await import('https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm');
      if(token!==cameraToken)return;
      const scanner=await new BrowserMultiFormatReader().decodeFromStream(media,video,(result,_err,active)=>{
        if(token!==cameraToken){active.stop();return;}
        const code=result?.getText();
        if(code && validCode(code)){active.stop();analyze(code);}
      });
      if(token!==cameraToken)scanner.stop();else controls=scanner;
    }
  }catch(err){
    if(token!==cameraToken)return;
    stopCamera();status(err.name==='NotAllowedError'?'El permiso de cámara está bloqueado. Puedes ingresar el código manualmente.':'Cámara o lector no disponible. Puedes ingresar el código manualmente.');
  }
}
function renderHistory(){
  const list=$('#history-list');list.replaceChildren();
  const query=$('#search').value.trim().toLowerCase();
  const gradeFilter = document.querySelector('#grade-filter').value;
  const filtered=history.filter(r=>(!$('#only-favorites').checked || r.favorite) && (!gradeFilter || (r.grade || "unknown") === gradeFilter) && [r.name,r.brand,r.code,r.notes].join(' ').toLowerCase().includes(query));
  const order = document.querySelector('#history-order')?.value || 'recent';
  const gradeOrder = ['A+', 'A', 'B', 'C', 'D', 'E', 'F'];
  filtered.sort((a, b) => {
    if (order === 'name') return a.name.localeCompare(b.name, 'es');
    if (order === 'grade') {
      const rank = report => report.grade ? gradeOrder.indexOf(report.grade) : 99;
      return rank(a) - rank(b);
    }
    return Date.parse(b.date) - Date.parse(a.date);
  });
  $('#clear').disabled=!history.length;
  document.querySelector('#history-summary').textContent = filtered.length + ' de ' + history.length + ' productos';
  if(!filtered.length){list.append(node('p',history.length?'No hay consultas que coincidan.':'Todavía no tienes consultas. Escanea un producto para empezar.','empty'));return;}
  for(const report of filtered){
    const row=node('div','','history-row');
    const open=node('button','');open.append(node('strong',report.name),node('small',[report.brand,report.code,formatDate(report.date)].filter(Boolean).join(' · ')));
    open.onclick=()=>{page('scan');showReport(report);};
    const remove=node('button','Quitar','secondary');remove.setAttribute('aria-label','Quitar '+report.name);remove.onclick=()=>{history=history.filter(x=>x.code!==report.code);save();renderHistory();};
    const favorite = node('button', report.favorite ? '★' : '☆', 'secondary favorite');
    favorite.setAttribute('aria-label', 'Favorito: ' + report.name);
    favorite.setAttribute('aria-pressed', String(!!report.favorite));
    favorite.onclick = () => {
      report.favorite = !report.favorite;
      save();
      if ($('#only-favorites').checked) {
        renderHistory();
        $('#only-favorites').focus();
      } else {
        favorite.textContent = report.favorite ? '★' : '☆';
        favorite.setAttribute('aria-pressed', String(report.favorite));
      }
    };
    row.append(open,favorite,remove);list.append(row);
  }
}
$('#camera').onclick=startCamera;
$('#lookup').onsubmit=e=>{e.preventDefault();analyze($('#barcode').value);};
$('#demo').onclick=()=>{stopCamera();status('');showReport(demo);};
$('#search').oninput=renderHistory;
$('#clear').onclick=()=>{if(confirm('¿Borrar todas las consultas guardadas en este navegador?')){history=[];save();renderHistory();}};
document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>page(b.dataset.page));
window.addEventListener('pagehide',stopCamera);
$('#count').textContent=history.length;




$('#try-real').hidden = true;
$('#demo').closest('.notice').hidden = true;

const photoInput = document.querySelector('#photo');
const photoButton = document.querySelector('#photo-button');
let readingPhoto = false;
photoButton.onclick = () => {
  if (!busy && !readingPhoto) photoInput.click();
};
photoInput.onchange = async () => {
  const file = photoInput.files[0];
  photoInput.value = '';
  if (!file || busy || readingPhoto) return;
  if (file.size > 20 * 1024 * 1024) {
    status('Elige una imagen de hasta 20 MB.');
    return;
  }

  stopCamera();
  readingPhoto = true;
  photoButton.disabled = true;
  status('Leyendo el código de la foto…');
  let bitmap;
  let code;
  try {
    bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const {BrowserMultiFormatReader} = await import('https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm');
    const decoded = await new BrowserMultiFormatReader().decodeFromCanvas(canvas);
    code = decoded.getText();
    if (!validCode(code)) throw new Error("Código de producto inválido");
  } catch {
    status('No pudimos leer el código. Prueba una foto nítida con el código completo o escríbelo.');
  } finally {
    bitmap?.close();
    readingPhoto = false;
    photoButton.disabled = false;
  }

  if (code) analyze(code);
};



$('#only-favorites').onchange = renderHistory;
const compareSelects = [$('#compare-a'), $('#compare-b')];

function renderComparison() {
  $('#compare-controls').hidden = history.length < 2;
  for (const select of compareSelects) {
    const selected = select.value;
    const placeholder = new Option('Elige un producto', '');
    select.replaceChildren(placeholder, ...history.map(report => {
      const label = [report.favorite ? '★ ' + report.name : report.name, report.code].join(' · ');
      return new Option(label, report.code);
    }));
    if (history.some(report => report.code === selected)) select.value = selected;
  }
  if (history.length >= 2 && !compareSelects[0].value && !compareSelects[1].value) {
    compareSelects[0].value = history[0].code;
    compareSelects[1].value = history[1].code;
  }
  updateComparison();
}

function updateComparison() {
  const container = $('#compare-result');
  container.replaceChildren();
  const [first, second] = compareSelects.map(select => history.find(report => report.code === select.value));
  if (history.length < 2) {
    $('#compare-help').textContent = 'Analiza dos productos diferentes para empezar.';
    return;
  }
  if (!first || !second || first.code === second.code) {
    $('#compare-help').textContent = 'Selecciona dos productos diferentes.';
    return;
  }
  $('#compare-help').textContent = 'Compara los datos disponibles. Si falta una calificación, el impacto queda sin clasificar.';
  for (const report of [first, second]) {
    const card = node('article', '', 'report-card compare-card');
    card.append(
      node('div', report.grade ? 'Green-Score ' + report.grade : 'Sin Green-Score', 'compare-grade'),
      node('h2', report.name),
      node('p', [report.brand, report.code].filter(Boolean).join(' · ')),
      node('strong', 'Sellos registrados'),
      node('p', report.seals?.length ? report.seals.map(cleanLabel).join(', ') : 'Sin sellos en la ficha'),
      node('strong', 'Afirmaciones por verificar'),
      node('p', report.claims?.length ? report.claims.map(cleanLabel).join(', ') : 'Sin afirmaciones registradas'),
      node('strong', 'Contexto empresarial'),
      node('p', report.context?.company || 'Sin evaluación disponible')
    );
    const details = node('button', 'Ver informe y fuentes →', 'link');
    details.onclick = () => { page('scan'); showReport(report); };
    card.append(details);
    container.append(card);
  }
}

for (const select of compareSelects) select.onchange = updateComparison;

document.querySelector('#grade-filter').onchange = renderHistory;


function renderActivity() {
  const graded = history.filter(report => report.grade).length;
  const favorites = history.filter(report => report.favorite).length;
  const metrics = $('#activity-metrics');
  metrics.replaceChildren();
  for (const [label, value] of [
    ['Productos consultados', history.length],
    ['Con Green-Score', graded],
    ['Favoritos', favorites]
  ]) {
    const card = node('article', '', 'panel activity-metric');
    card.append(node('h2', label), node('strong', value));
    metrics.append(card);
  }

  $('#export-history').disabled = !history.length;
  const chart = $('#grade-chart');
  chart.replaceChildren();
  if (!history.length) {
    chart.append(node('p', 'Consulta un producto para empezar a ver tu actividad.', 'empty'));
    return;
  }

  for (const grade of ['A+', 'A', 'B', 'C', 'D', 'E', 'F', null]) {
    const count = history.filter(report => (report.grade || null) === grade).length;
    const row = node('div', '', 'chart-row');
    const meter = document.createElement('meter');
    meter.min = 0;
    meter.max = history.length;
    meter.value = count;
    meter.setAttribute('aria-label', grade || 'Sin Green-Score');
    row.append(node('span', grade || 'Sin nota'), meter, node('strong', count));
    chart.append(row);
  }
}

$('#export-history').onclick = () => {
  if (!history.length) return;
  const payload = JSON.stringify({ version: 1, products: history }, null, 2);
  const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'ecolupa-historial.json';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

function addReportActions(report) {
  const toolbar = node('div', '', 'report-toolbar');
  const print = node('button', 'Imprimir / guardar PDF', 'secondary');
  print.type = 'button';
  print.onclick = () => window.print();
  toolbar.append(print);

  const stored = history.find(entry => entry.code === report.code);
  if (stored) {
    const refresh = node('button', 'Actualizar ficha ↻', 'secondary');
    refresh.type = 'button';
    refresh.onclick = () => analyze(stored.code);
    toolbar.append(refresh);
    const favorite = node('button', stored.favorite ? '★ En favoritos' : '☆ Guardar favorito', 'secondary');
    favorite.type = 'button';
    favorite.setAttribute('aria-pressed', String(!!stored.favorite));
    favorite.onclick = () => {
      stored.favorite = !stored.favorite;
      const persisted = save();
      favorite.textContent = stored.favorite ? '★ En favoritos' : '☆ Guardar favorito';
      favorite.setAttribute('aria-pressed', String(stored.favorite));
      feedback.textContent = persisted ? 'Favorito actualizado.' : 'No se pudo guardar en este navegador.';
    };
    const compare = node('button', 'Comparar este producto →', 'secondary');
    compare.type = 'button';
    compare.onclick = () => {
      page('compare');
      compareSelects[0].value = report.code;
      updateComparison();
    };
    toolbar.prepend(favorite, compare);

    const notes = node('div', '', 'personal-notes');
    const label = node('label', 'Mis notas de compra');
    label.htmlFor = 'product-notes';
    const input = document.createElement('textarea');
    input.id = 'product-notes';
    input.maxLength = 2000;
    input.rows = 3;
    input.placeholder = 'Anota qué comprobar, dónde lo viste o una alternativa…';
    input.value = stored.notes || '';
    const feedback = node('p', '', 'app-notice');
    feedback.setAttribute('role', 'status');
    input.oninput = () => {
      stored.notes = input.value;
      feedback.textContent = save() ? 'Notas guardadas en este dispositivo.' : 'No se pudieron guardar las notas.';
    };
    notes.append(label, input, feedback);
    $('#result').append(toolbar, notes);
    return;
  }
  $('#result').append(toolbar);
}

const backupTools = node('div', '', 'panel backup-tools');
backupTools.append(node('h2', 'Tus consultas, contigo'), node('p', 'Restaura un respaldo de EcoLupa. Los productos nuevos se suman al historial y conservas tus notas actuales.'));
const importButton = node('button', 'Importar respaldo JSON', 'secondary');
const importInput = document.createElement('input');
importInput.type = 'file';
importInput.accept = '.json,application/json';
importInput.hidden = true;
const importStatus = node('p', '', 'app-notice');
importStatus.setAttribute('role', 'status');
importButton.onclick = () => importInput.click();
importInput.onchange = async () => {
  const file = importInput.files[0];
  importInput.value = '';
  if (!file) return;
  importButton.disabled = true;
  try {
    if (file.size > 2 * 1024 * 1024) throw new Error('El respaldo supera 2 MB.');
    const incoming = normalizeHistory(JSON.parse(await file.text()));
    const existing = new Set(history.map(report => report.code));
    const additions = incoming.filter(report => !existing.has(report.code));
    const merged = [...history, ...additions].slice(0, 100);
    localStorage.setItem(key, JSON.stringify(merged));
    const added = merged.length - history.length;
    history = merged;
    $('#count').textContent = history.length;
    renderActivity();
    importStatus.textContent = added + ' productos incorporados. El historial admite hasta 100 productos.';
  } catch (error) {
    importStatus.textContent = error instanceof SyntaxError ? 'El archivo contiene JSON inválido.' : error.message;
  } finally {
    importButton.disabled = false;
  }
};
backupTools.append(importButton, importInput, importStatus);
$('#activity').append(backupTools);

function renderHome() {
  const metrics = $('#home-metrics');
  metrics.replaceChildren();
  for (const [value, label] of [
    [history.length, 'Productos explorados'],
    [history.filter(report => report.favorite).length, 'Favoritos guardados']
  ]) {
    const card = node('div', '', 'home-stat');
    card.append(node('strong', value), node('span', label));
    metrics.append(card);
  }
  const recent = $('#recent-products');
  recent.replaceChildren();
  if (!history.length) {
    const empty = node('div', '', 'panel home-empty');
    empty.append(node('span', '◎', 'empty-symbol'), node('h3', 'Tu próximo descubrimiento empieza aquí'),
      node('p', 'Consulta tu primer producto o prueba con un código real para conocer el informe.'));
    const tryProduct = node('button', 'Escanear mi producto →', 'secondary');
    tryProduct.onclick = () => { page('scan'); $('#barcode').focus(); };
    empty.append(tryProduct);
    recent.append(empty);
    return;
  }
  for (const report of history.slice(0, 4)) {
    const card = node('button', '', 'recent-card');
    const badge = node('span', report.grade || '—', 'product-grade');
    badge.dataset.grade = report.grade || 'unknown';
    const text = node('span', '', 'recent-copy');
    text.append(node('strong', report.name), node('small', report.brand || 'Marca sin registrar'));
    card.append(badge, text, node('span', '↗', 'recent-arrow'));
    card.onclick = () => { page('scan'); showReport(report); };
    recent.append(card);
  }
}

$('#launch-scan').onclick = () => { page('scan'); $('#barcode').focus({preventScroll:true}); };
$('#launch-compare').onclick = () => page('compare');
$('#launch-history').onclick = () => page('history');
$('.brand').onclick = event => { event.preventDefault(); page('home'); };
renderHome();

// Library controls are generated here so they also work with older saved queries.
const historyOrder = document.createElement('select');
historyOrder.id = 'history-order';
historyOrder.append(new Option('Más recientes', 'recent'), new Option('Nombre A–Z', 'name'),
  new Option('Green-Score A+ → F', 'grade'));
const orderLabel = node('label', 'Ordenar por');
orderLabel.htmlFor = historyOrder.id;
const orderControl = node('div', '');
orderControl.append(orderLabel, historyOrder);
$('.history-tools').append(orderControl);
historyOrder.onchange = renderHistory;
$('#search').placeholder = 'Nombre, marca, código o tus notas';

const csvButton = node('button', 'Exportar CSV', 'secondary');
csvButton.type = 'button';
$('#activity .history-head').append(csvButton);
const csvStatus = node('p', '', 'app-notice');
csvStatus.setAttribute('role', 'status');
$('#activity').append(csvStatus);
csvButton.onclick = () => {
  if (!history.length) {
    csvStatus.textContent = 'Consulta un producto para exportar el historial.';
    return;
  }
  // Prefix spreadsheet formulas to keep notes and catalogue text inert in Excel.
  const cell = value => {
    let text = String(value ?? '').replaceAll('\r', ' ').replaceAll('\n', ' ');
    if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  const columns = ['Producto', 'Marca', 'Código', 'Green-Score', 'Favorito', 'Fecha', 'Notas', 'Fuente'];
  const rows = history.map(report => [report.name, report.brand, report.code,
    report.grade || 'Sin nota', report.favorite ? 'Sí' : 'No', report.date,
    report.notes || '', report.source?.url || '']);
  const csv = '\uFEFF' + [columns, ...rows].map(row => row.map(cell).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8'}));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'ecolupa-consultas.csv';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  csvStatus.textContent = history.length + ' productos exportados.';
};


function showMissingProduct(code) {
  const result = $('#result');
  result.replaceChildren(node('div', 'CÓDIGO ' + code, 'section-tag'),
    node('h2', 'Producto pendiente de identificar'),
    node('p', 'Este código no aparece en los catálogos consultados. Busca el nombre y la marca en el envase para contrastar sus afirmaciones ambientales.'));
  const sources = node('div', '', 'sources');
  result.append(sources);
  for (const [name, url] of [
    ['Buscar este código', 'https://www.google.com/search?q=' + encodeURIComponent(code)],
    ['Consultar Open Food Facts', 'https://world.openfoodfacts.org/product/' + code],
    ['Consultar Open Beauty Facts', 'https://world.openbeautyfacts.org/product/' + code]
  ]) {
    const anchor = node('a', name + ' ↗');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    sources.append(anchor);
  }
  result.hidden = false;
  result.scrollIntoView({behavior:'smooth', block:'start'});
}
