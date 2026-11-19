import { validCode } from './evaluation.js';

// Read both current backups and the original array stored by EcoLupa.
export function normalizeHistory(value) {
  const products = Array.isArray(value) ? value : value?.version === 1 ? value.products : null;
  if (!Array.isArray(products)) throw new Error('El archivo no es un respaldo de EcoLupa.');
  const unique = new Map();
  for (const product of products) {
    if (!product || typeof product.code !== 'string' || !(validCode(product.code) || /^manual:[a-f0-9]{16}$/.test(product.code)) ||
        typeof product.name !== 'string' || !product.name.trim()) continue;
    const strings = items => Array.isArray(items) ? items.filter(item => typeof item === 'string').slice(0, 20) : [];
    const safeLink = source => {
      if (!source || typeof source !== 'object') return null;
      const result = {};
      for (const field of ['name', 'company', 'description']) {
        if (typeof source[field] === 'string') result[field] = source[field].slice(0, 2000);
      }
      for (const field of ['url', 'independentUrl']) {
        try {
          const url = new URL(source[field]);
          if (url.protocol === 'https:') result[field] = url.href;
        } catch { /* Missing links remain unavailable. */ }
      }
      return result;
    };
    const report = {
      code: product.code, name: product.name.slice(0, 300),
      identitySource: product.code.startsWith('manual:') ? 'user' : product.identitySource==='web'?'web':'catalogue',
      brand: typeof product.brand === 'string' ? product.brand.slice(0, 300) : '',
      grade: /^(A\+|[A-F])$/.test(product.grade) ? product.grade : null,
      claims: strings(product.claims), seals: strings(product.seals),
      date: Number.isNaN(Date.parse(product.date)) ? new Date().toISOString() : product.date,
      favorite: product.favorite === true,
      notes: typeof product.notes === 'string' ? product.notes.slice(0, 2000) : '',
      source: safeLink(product.source), context: safeLink(product.context),
      summary: typeof product.summary === 'string' ? product.summary.slice(0, 2000) : '',
      aiStatus: product.aiStatus === 'ready' ? 'ready' : 'disabled'
    };
    if (product.aiStage==='research_only') {report.aiStage='research_only';report.aiReviewStatus='unavailable';}
    if (product.assessment && ['indicios','sin_indicios','insuficiente'].includes(product.assessment.conclusion)) {
      report.assessment = {
        conclusion: product.assessment.conclusion,
        scope: product.assessment.scope === 'marca' ? 'marca' : 'producto',
        reasons: strings(product.assessment.reasons),
        missing: strings(product.assessment.missing)
      };
    }
    if (product.research && typeof product.research.text === 'string') {
      report.research = {
        status: product.research.status === 'ready' ? 'ready' : 'unavailable',
        text: product.research.text.slice(0,14000),
        sources: Array.isArray(product.research.sources) ? product.research.sources.map(safeLink).filter(item=>item?.url).slice(0,8) : []
      };
    }
    if (!unique.has(report.code)) unique.set(report.code, report);
  }
  if (products.length && !unique.size) throw new Error('El respaldo no contiene productos válidos.');
  return [...unique.values()].slice(0, 100);
}
