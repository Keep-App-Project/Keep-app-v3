import { formatDateBR, parseISODate } from './date';

// Retorna textos completos, inclusive quando o catálogo tem nome inválido.
function nameOf(product) {
  const value = typeof product?.name === 'string' ? product.name.replace(/\s+/g, ' ').trim() : '';
  return (value || 'Produto sem nome').slice(0, 80);
}

function isValidDate(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateString || ''))) return null;
  const result = parseISODate(dateString);
  if (!result || Number.isNaN(result.getTime())) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  return result.getFullYear() === year && result.getMonth() + 1 === month && result.getDate() === day ? result : null;
}

function messageFor(items, date, expiryDay) {
  const names = items.map(nameOf);
  if (items.length === 1) {
    const product = items[0];
    const name = names[0];
    const expiry = formatDateBR(product.expiryDate);
    const title = expiryDay ? `Vence hoje: ${name}` : `Validade próxima: ${name}`;
    const body = expiryDay
      ? `O produto ${name} vence hoje (${expiry}). Confira sua despensa no Keep.`
      : `O produto ${name} vence em breve (${expiry}). Confira sua despensa no Keep.`;
    return { title, body };
  }
  const title = expiryDay
    ? `${items.length} produtos vencem hoje`
    : `${items.length} produtos com validade próxima`;
  const visible = names.slice(0, 3).join(', ');
  const remaining = items.length > 3 ? ` e mais ${items.length - 3}` : '';
  return { title, body: `${visible}${remaining}. Confira as datas na sua despensa do Keep.` };
}

export function buildExpiryReminders(products, { batch = false, now = new Date() } = {}) {
  const groups = new Map();
  for (const product of Array.isArray(products) ? products : []) {
    if (!(Number(product?.quantity) > 0)) continue;
    const expiry = isValidDate(product.expiryDate);
    if (!expiry) continue;
    expiry.setHours(9, 0, 0, 0);
    const warning = new Date(expiry);
    warning.setDate(warning.getDate() - 3);
    const created = product.createdAt ? new Date(product.createdAt) : null;
    if (created && !Number.isNaN(created.getTime()) && created >= warning && created < expiry) {
      warning.setTime(created.getTime());
      warning.setHours(9, 0, 0, 0);
      if (warning <= created) warning.setDate(warning.getDate() + 1);
    }
    const dates = warning < expiry ? [warning, expiry] : [expiry];
    for (const date of dates) {
      if (date <= now) continue;
      const expiryDay = date.getTime() === expiry.getTime();
      const key = batch ? `${date.getTime()}-${expiryDay ? 'hoje' : 'breve'}` : `${date.getTime()}-${product.id}`;
      const group = groups.get(key) ?? { key, date, expiryDay, products: [] };
      group.products.push(product);
      groups.set(key, group);
    }
  }
  return [...groups.values()]
    .sort((a, b) => a.date - b.date)
    .slice(0, 60)
    .map(({ key, date, products: items, expiryDay }) => {
      items.sort((a, b) => String(a.id).localeCompare(String(b.id)));
      const { title, body } = messageFor(items, date, expiryDay);
      return { key, date, title, body, productIds: items.map(({ id }) => id) };
    });
}
