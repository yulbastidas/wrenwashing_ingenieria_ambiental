export const materialNames = {paper:'Papel de oficina',cardboard:'Cartón',thermal:'Recibo o papel térmico',tissue:'Servilleta o papel sanitario',plastic:'Envase plástico',electronic:'Equipo electrónico, pila o tóner',other:'Otro material o material desconocido'};
export const wasteSources = [
  {name:'Código de colores colombiano · Resolución 2184 de 2019',url:'https://www.cancilleria.gov.co/normograma/compilacion/docs/resolucion_minambienteds_2184_2019.htm'},
  {name:'Orientación de MinAmbiente sobre separación',url:'https://bpm.minambiente.gov.co/index.php/noticias-minambiente/4595-gobierno-unifica-el-codigo-de-colores-para-la-separacion-de-residuos-en-la-fuente-a-nivel-nacional'},
  {name:'Gestión de residuos eléctricos y electrónicos',url:'https://www.minambiente.gov.co/documento-normativa/ley-1672-de-2013/'}
];
export function classifyWaste({material,condition,confidential,reusable}) {
  if (!Object.hasOwn(materialNames,material) || !['clean','wet','food','chemical','unknown'].includes(condition) ||
      !['yes','no','unknown'].includes(confidential) || !['yes','no','unknown'].includes(reusable)) throw new Error('Completa las cuatro preguntas.');
  const result=(route,title,steps)=>({route,title,steps,material:materialNames[material]});
  if (condition==='chemical' || material==='electronic') return result('special','Gestión diferenciada',[
    'No mezcles este residuo con papel, envases ni residuos ordinarios.',
    'Consulta al responsable ambiental y al gestor competente. Si es un equipo, revisa reparación segura y borrado de datos antes del retiro.',
    'Conserva el soporte de entrega. La app no determina la peligrosidad mediante el código o la apariencia.'
  ]);
  if (confidential==='yes') return result('secure','Protege la información antes de gestionar',[
    'Mantén el documento en el circuito confidencial. No subas fotos ni escribas datos de clientes en la app.',
    'Verifica autorización y plazos de conservación antes de destruirlo. Si contiene material aprovechable, coordina destrucción segura y recuperación con el proveedor autorizado por la entidad.',
    'El contenedor blanco no sustituye el protocolo de archivo y protección de datos.'
  ]);
  if (confidential==='unknown' || condition==='unknown' || material==='other') return result('review','Revisión del responsable ambiental',[
    'Identifica el material, la contaminación y la posible información confidencial antes de separarlo.',
    'Manténlo apartado y consulta la ruta disponible en la oficina; no lo declares reciclado sin comprobar su destino.'
  ]);
  if (material==='thermal') return result('review','Papel térmico fuera del papel de archivo',[
    'No lo mezcles automáticamente con papel de oficina. Su recubrimiento requiere confirmar aceptación con el gestor.',
    'Prioriza recibos digitales cuando sean procedentes y accesibles. Sigue la ruta local que indique el responsable ambiental.'
  ]);
  if (material==='tissue' || condition==='food') return result('black','Residuo no aprovechable en la ruta ordinaria',[
    'Deposita servilletas, papel sanitario y papel o cartón contaminado con comida en el recipiente negro.',
    'Evita contaminar el papel limpio. Si existen químicos o riesgos sanitarios especiales, se requiere otra evaluación.'
  ]);
  if (condition==='wet') return result('review','Acondicionar y confirmar antes de entregar',[
    'Mantén el material separado del aprovechable seco. La humedad puede impedir su recuperación.',
    'Si solo se mojó con agua y es seguro secarlo, consulta la aceptación del gestor después. No registres reciclaje confirmado todavía.'
  ]);
  if (reusable==='yes') return result('reuse','Primero reutiliza',[
    'Conserva el material en uso si es seguro e higiénico. El papel sin datos sensibles puede aprovecharse por su cara libre; el cartón puede volver a proteger o almacenar.',
    'Cuando ya no pueda usarse, el papel o cartón limpio y seco corresponde a la corriente blanca. Para envases, confirma material y aceptación del gestor.',
    'Reutilizar no acredita por sí solo que todo el producto o su fabricante sea ecológico.'
  ]);
  return result('white','Separar para aprovechamiento · recipiente blanco',[
    'El papel y cartón limpios y secos pertenecen a la corriente blanca. Para el envase plástico, verifica su material y la aceptación en la ruta de la oficina.',
    'Separar es el primer paso: registra la entrega al gestor solo cuando ocurra y conserva el comprobante.',
    'Esto orienta la separación; no certifica reciclaje efectivo ni ausencia de greenwashing.'
  ]);
}
export function normalizeWasteRecords(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(r=>r && typeof r.id==='string' && typeof r.date==='string' && Number.isFinite(Date.parse(r.date)) &&
    Object.hasOwn(materialNames,r.material) && Number.isFinite(r.kg) && r.kg>0 && r.kg<=10000 &&
    ['reuse','separated','delivered','special'].includes(r.action) && typeof r.reference==='string' &&
    (r.action!=='delivered' || r.reference.trim())).slice(0,200).map(r=>({id:r.id.slice(0,100),date:r.date,material:r.material,kg:r.kg,action:r.action,reference:r.reference.slice(0,100)}));
}
export function wasteCsv(records) {
  const safe=value=>'"'+String(value).replace(/^\s*[=+@\-]/,"'$&").replaceAll('"','""')+'"';
  return '\uFEFF'+[['Fecha','Material','Peso kg','Acción','Referencia'],...records.map(r=>[r.date,materialNames[r.material],r.kg,r.action,r.reference])].map(row=>row.map(safe).join(';')).join('\r\n');
}
