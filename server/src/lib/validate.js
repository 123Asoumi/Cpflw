import { badRequest } from './http.js';

/**
 * Minimal schema validator.
 * schema: { field: { type: 'string'|'number'|'boolean'|'email'|'date'|'time'|'enum'|'id',
 *                    required?, min?, max?, values?, label } }
 * Returns a cleaned object containing only known fields.
 * partial=true lets you validate PATCH/PUT bodies (required ignored for absent fields).
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validate(body, schema, { partial = false } = {}) {
  const errors = {};
  const out = {};
  const src = body || {};
  for (const [key, rule] of Object.entries(schema)) {
    const label = rule.label || key;
    let v = src[key];
    const absent = v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
    if (absent) {
      if (rule.required && !partial) errors[key] = `${label} est obligatoire.`;
      else if (key in src && !rule.required) out[key] = rule.type === 'string' ? '' : null;
      continue;
    }
    switch (rule.type) {
      case 'string':
      case 'id':
        if (typeof v !== 'string') { errors[key] = `${label} doit être un texte.`; break; }
        v = v.trim();
        if (rule.min && v.length < rule.min) errors[key] = `${label} doit contenir au moins ${rule.min} caractères.`;
        else if (rule.max && v.length > rule.max) errors[key] = `${label} ne doit pas dépasser ${rule.max} caractères.`;
        else out[key] = v;
        break;
      case 'email':
        if (typeof v !== 'string' || !EMAIL.test(v.trim())) errors[key] = `${label} n’est pas une adresse e-mail valide.`;
        else out[key] = v.trim().toLowerCase();
        break;
      case 'number': {
        const num = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
        if (!Number.isFinite(num)) errors[key] = `${label} doit être un nombre.`;
        else if (rule.min !== undefined && num < rule.min) errors[key] = `${label} doit être ≥ ${rule.min}.`;
        else if (rule.max !== undefined && num > rule.max) errors[key] = `${label} doit être ≤ ${rule.max}.`;
        else if (rule.integer && !Number.isInteger(num)) errors[key] = `${label} doit être un entier.`;
        else out[key] = num;
        break;
      }
      case 'boolean':
        out[key] = v === true || v === 'true';
        break;
      case 'date':
        if (!DATE.test(v) || Number.isNaN(Date.parse(v))) errors[key] = `${label} doit être une date valide (AAAA-MM-JJ).`;
        else out[key] = v;
        break;
      case 'time':
        if (!TIME.test(v)) errors[key] = `${label} doit être une heure valide (HH:MM).`;
        else out[key] = v;
        break;
      case 'enum':
        if (!rule.values.includes(v)) errors[key] = `${label} doit être l’une des valeurs : ${rule.values.join(', ')}.`;
        else out[key] = v;
        break;
      default:
        out[key] = v;
    }
  }
  if (Object.keys(errors).length) {
    throw badRequest(Object.values(errors)[0], errors);
  }
  return out;
}

export function passwordRule(label = 'Le mot de passe') {
  return { type: 'string', min: 8, max: 128, label };
}
