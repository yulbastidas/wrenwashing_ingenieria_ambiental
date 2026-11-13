export function validCode(code) {
  if (!/^(?:\d{8}|\d{12,14})$/.test(code)) return false;
  const sum = [...code.slice(0,-1)].reverse().reduce((n,d,i)=>n+Number(d)*(i%2 ? 1 : 3),0);
  return (10-sum%10)%10 === Number(code.at(-1));
}
const claimsPattern = /sustainab|sostenib|biodegrad|compostab|carbon-neutral|climate-neutral|eco-friendly|ecol[oó]gic|recyclable|reciclable/i;
const sealsPattern = /(?:^|[-:])(?:organic|bio|eu-organic|fairtrade|rainforest-alliance|rspo|fsc)(?:$|[-:])/i;
export function evaluate(product, code, source, context = null) {
  const labels = Array.isArray(product.labels_tags) ? product.labels_tags.filter(x=>typeof x==='string') : [];
  const claims = labels.filter(x=>claimsPattern.test(x) && !sealsPattern.test(x) && !/(?:non|not|no)-/.test(x)).slice(0,10);
  const seals = labels.filter(x=>sealsPattern.test(x) && !/(?:non|not|no)-/.test(x)).slice(0,10);
  const grade = String(product.environmental_score_grade || product.ecoscore_grade || '').toLowerCase();
  return {
    code, source, name: product.product_name_es || product.product_name || 'Producto sin nombre',
    brand: product.brands || '', grade: /^(?:a\+|[a-f])$/.test(grade) ? grade.toUpperCase() : null,
    claims, seals, context,
    date: new Date().toISOString()
  };
}

