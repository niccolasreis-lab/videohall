export function isContentActive(item, now = Date.now()) {
  if(item.config?.catalogUnavailable)return false;
  const { validFrom, validUntil } = item.config || {};
  return (!validFrom || now >= Date.parse(validFrom)) && (!validUntil || now < Date.parse(validUntil));
}

export function nextContentBoundary(items, now = Date.now()) {
  const times = items.flatMap(item => [item.config?.validFrom, item.config?.validUntil])
    .filter(Boolean).map(Date.parse).filter(time => Number.isFinite(time) && time > now);
  return times.length ? Math.min(...times) : null;
}

export function posterCycle(rows, secondsPerItem, layout) {
  const items = (Array.isArray(rows) ? rows : []).filter(row => row && row.active !== false).length;
  const rotates = ['list-spotlight', 'spotlight', 'campaign'].includes(layout);
  // Mesmo contrato do servidor: inteiro de 1 a 3600 segundos; qualquer outra coisa cai no padrão de 10s.
  const parsed = Number(secondsPerItem);
  const seconds = Number.isInteger(parsed) && parsed >= 1 && parsed <= 3600 ? parsed : 10;
  return { items, rotates, seconds: rotates ? items * seconds : 0 };
}

export function productPages(rows, pageSize = 5) {
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new Error('Tamanho de página inválido.');
  const active = rows.filter(row => row.active !== false);
  return Array.from({length:Math.ceil(active.length/pageSize)},(_,index)=>active.slice(index*pageSize,(index+1)*pageSize));
}

// CSV com cabeçalho: codigo;nome;preco;unidade. Aceita aspas e vírgula decimal.
export function parseProductCsv(input, maximum = 50) {
  if (input.length > 1024 * 1024) throw new Error('A carga aceita no máximo 1 MB.');
  const text = input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const separator = text.split('\n')[0].includes(';') ? ';' : ',';
  const records = []; let record = [], value = '', quoted = false;
  for (let i = 0; i <= text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted; }
    else if (!quoted && (c === separator || c === '\n' || c === undefined)) {
      record.push(value.trim()); value = '';
      if (c !== separator) { if (record.some(Boolean)) records.push(record); record = []; }
    } else if (c !== undefined) value += c;
  }
  if (quoted) throw new Error('CSV com aspas não fechadas.');
  if (records.length < 2) throw new Error('Informe um cabeçalho e pelo menos um produto.');
  const header = records.shift().map(x => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  const name = header.indexOf('nome'), price = header.indexOf('preco'), code = header.indexOf('codigo'), unit = header.indexOf('unidade');
  if (name < 0 || price < 0) throw new Error('O cabeçalho precisa das colunas nome e preco.');
  if (records.length > maximum) throw new Error(`Esta peça aceita até ${maximum} produtos. Divida a carga.`);
  return records.map((r, index) => {
    const raw = r[price] || '', amount = Number(raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw);
    if (!r[name] || r[name].length > 160 || !raw || !Number.isFinite(amount) || amount < 0 || amount > 99999999) throw new Error(`Produto ou preço inválido na linha ${index + 2}.`);
    return { name: r[name], price: Math.round(amount * 100) / 100, code: code < 0 ? '' : r[code] || '', unit: unit < 0 ? 'UN' : r[unit] || 'UN', active: true };
  });
}
