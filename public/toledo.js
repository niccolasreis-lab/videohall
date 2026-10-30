// Campos comuns documentados pela Toledo: DD(2) T(1) PLU(6) preço(6) validade(3) D1(25) D2(25).
// Fonte: https://help.toledobrasil.com/mgv6/v1_6_/Html_Pages/arquivos_de_cadastro.html
export function decodeProductText(bytes) {
  try { return {text:new TextDecoder('utf-8',{fatal:true}).decode(bytes),encoding:'UTF-8'}; }
  catch { return {text:new TextDecoder('windows-1252').decode(bytes),encoding:'Windows-1252'}; }
}

export function parseToledoMgv(input) {
  if (input.length > 5 * 1024 * 1024) throw new Error('A carga Toledo aceita até 5 MB.');
  const lines = input.replace(/^\uFEFF/,'').split(/\r\n|\n|\r/);
  const products = [], seen = new Set();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]; if (!line.trim()) continue;
    if (line.length < 68 || !/^\d{2}[0-5]\d{15}/.test(line)) throw new Error(`Layout Toledo não reconhecido na linha ${i+1}. Esperado ITENSMGV com campos fixos.`);
    const department = line.slice(0,2), type = Number(line[2]), code = line.slice(3,9), price = Number(line.slice(9,15))/100;
    const name = line.slice(18,68).replace(/\s{2,}/g,' ').trim();
    const key = department + ':' + code;
    if (!name || seen.has(key)) throw new Error(`Descrição vazia ou código duplicado no departamento na linha ${i+1}.`);
    seen.add(key);
    products.push({department,type,code,name,price,unit:[1,5].includes(type)?'UN':'KG',active:price>0,sourceLine:i+1});
  }
  if (!products.length) throw new Error('A carga Toledo está vazia.');
  return { products, zeroPrices:products.filter(p=>p.price===0).length, departments:[...new Set(products.map(p=>p.department))], lineLengths:[...new Set(lines.filter(l=>l.trim()).map(l=>l.length))] };
}

export function productsToCsv(products) {
  const field = value => '"'+String(value).replaceAll('"','""')+'"';
  return '\uFEFFcodigo;nome;preco;unidade\r\n'+products.map(p=>[p.code,p.name,p.price.toFixed(2).replace('.',','),p.unit].map(field).join(';')).join('\r\n')+'\r\n';
}
