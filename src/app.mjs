import { createCatalog } from './catalog.mjs';
import { createServer } from 'node:http';
import { createHash, randomBytes, randomInt, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unlink } from 'node:fs/promises';
import { openDatabase, transaction } from './database.mjs';
import { HttpError, receiveMedia, sendFile } from './media.mjs';
import { validateContent,validateValidity } from './content.mjs';
import {offlineTelemetry,ingestEvents} from './offline.mjs';
import {validateSchedule} from '../public/playlist-schedule.js';

function scheduleInput(value){try{return validateSchedule(value);}catch(error){throw new HttpError(400,error.message);}}

const deriveKey = promisify(scrypt);
const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const hash = value => createHash('sha256').update(value).digest('hex');
const json = (res, status, value) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
};
function text(value, field, max = 120, optional = false) {
  if (optional && (value === undefined || value === null)) return '';
  if (typeof value !== 'string' || (!optional && !value.trim()) || value.length > max) {
    throw new HttpError(400, `${field}: informe um texto de até ${max} caracteres.`);
  }
  return value.trim();
}
async function readJson(req) {
  if (!(req.headers['content-type'] || '').startsWith('application/json')) throw new HttpError(415, 'Envie os dados em JSON.');
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new HttpError(413, 'A solicitação é muito grande.');
    chunks.push(chunk);
  }
  try {
    const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (result === null || Array.isArray(result) || typeof result !== 'object') throw new Error();
    return result;
  } catch { throw new HttpError(400, 'Dados JSON inválidos.'); }
}
function cookies(req) {
  const result = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const separator = part.indexOf('=');
    if (separator > 0) result[part.slice(0, separator).trim()] = part.slice(separator + 1).trim();
  }
  return result;
}
function makeCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('');
}

export function createApplication({ dataDir, secureCookies = false, maxUploadBytes = 250 * 1024 * 1024, clock = Date.now }) {
  const db = openDatabase(dataDir);
  const catalog = createCatalog(db, clock);
  const q = (sql, ...args) => db.prepare(sql).get(...args);
  const all = (sql, ...args) => db.prepare(sql).all(...args);
  const run = (sql, ...args) => db.prepare(sql).run(...args);
  const limiters = new Map();
  function limit(req, key, maximum, windowMs) {
    const id = `${req.socket.remoteAddress}:${key}`;
    const old = limiters.get(id);
    const entry = old && old.until > clock() ? old : { count: 0, until: clock() + windowMs };
    entry.count++;
    limiters.set(id, entry);
    if (limiters.size > 1000) for (const [k, v] of limiters) if (v.until < clock()) limiters.delete(k);
    if (entry.count > maximum) throw new HttpError(429, 'Muitas tentativas. Aguarde alguns minutos.');
  }
  function setCookie(res, name, value, seconds) {
    res.setHeader('Set-Cookie', `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${secureCookies ? '; Secure' : ''}`);
  }
  function admin(req) {
    const token = cookies(req).vw_session;
    if (!token || token.length !== 64) return undefined;
    return q('SELECT a.username, a.workspace FROM admins a, sessions s WHERE s.token_hash = ? AND s.expires_at > ?', hash(token), clock());
  }
  function device(req) {
    const token = cookies(req).vw_device;
    if (!token || token.length !== 64) return undefined;
    return q('SELECT * FROM devices WHERE token_hash = ?', hash(token));
  }
  function mustFind(table, id, name) {
    const row = q(`SELECT * FROM ${table} WHERE id = ?`, id);
    if (!row) throw new HttpError(404, `${name} não encontrado.`);
    return row;
  }
  function mediaDto(row) {
    return { id: row.id, name: row.name, filename: row.filename, mime: row.mime, kind: row.kind, size: row.size, config:JSON.parse(row.validity_json||'{}'), hasPrices:!!row.has_prices, createdAt: row.created_at, url: `/media/${row.id}` };
  }
  function contentDto(row) {
    if (!row.config_json) return mediaDto(row);
    const config = JSON.parse(row.config_json);
    return { id: row.id, name: row.name, kind: row.kind, config, createdAt: row.created_at, size: 0, hasPrices:row.kind==='product_image'?!!q('SELECT has_prices FROM media WHERE id=?',config.mediaId)?.has_prices:undefined, url: row.kind === 'product_image' ? `/media/${config.mediaId}` : null, sourceMediaId: row.kind === 'product_image' ? config.mediaId : null };
  }
  function mustContent(id) {
    const row = q('SELECT * FROM media WHERE id = ?', id) || q('SELECT * FROM virtual_content WHERE id = ?', id);
    if (!row) throw new HttpError(404, 'Conteúdo não encontrado.');
    return row;
  }
  function playlistDto(row) {
    const publication = row.current_publication_id ? q('SELECT version, draft_revision, created_at, snapshot_json FROM publications WHERE id = ?', row.current_publication_id) : null;
    const items = JSON.parse(row.items_json).map(item => ({ ...item, media: contentDto(mustContent(item.mediaId)) }));
    return {
      id: row.id, name: row.name, revision: row.revision, items, schedule:JSON.parse(row.schedule_json||'{"enabled":false}'),
      publishedItems: publication ? JSON.parse(publication.snapshot_json).items.map(item => ({ mediaId: item.mediaId })) : [],
      publishedVersion: publication?.version || 0,
      publishedAt: publication?.created_at || null,
      dirty: !publication || publication.draft_revision !== row.revision,
      pointCount: q('SELECT COUNT(*) AS n FROM points WHERE playlist_id = ?', row.id).n,
      createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }
  function pointDto(row) {
    const d = q('SELECT * FROM devices WHERE point_id = ?', row.id);
    const p = row.playlist_id ? q('SELECT name, current_publication_id FROM playlists WHERE id = ?', row.playlist_id) : null;
    const publication = row.publication_id ? q('SELECT version FROM publications WHERE id = ?', row.publication_id) : null;
    const online = !!d?.last_seen && clock() - d.last_seen < 25000;
    const current = d?.current_media_id ? q('SELECT * FROM media WHERE id = ?', d.current_media_id) || q('SELECT * FROM virtual_content WHERE id = ?', d.current_media_id) : null;
    const reported=d?.active_publication_id?q('SELECT version,snapshot_json FROM publications WHERE id=?',d.active_publication_id):null;
    const currentSnapshot=reported&&JSON.parse(reported.snapshot_json).items.find(item=>item.mediaId===d.current_media_id);
    return {
      id: row.id, name: row.name, location: row.location, fit: row.fit,
      playlistId: row.playlist_id, playlistName: p?.name || null,
      publishedVersion: publication?.version || 0,
      paired: !!d, online, lastSeen: d?.last_seen || null,
      playbackState: d?.playback_state || 'waiting',
      offline: d ? JSON.parse(d.offline_json||'{}') : {},
      activePublicationId:d?.active_publication_id||null,
      activePublishedVersion:reported?.version||0,
      currentMedia: currentSnapshot?{...currentSnapshot,id:currentSnapshot.mediaId}:current ? contentDto(current) : null,
      createdAt: row.created_at,
    };
  }
  function getPublication(point) {
    if (!point?.publication_id) return null;
    const row = q('SELECT * FROM publications WHERE id = ?', point.publication_id);
    if (!row) return null;
    return { id: row.id, version: row.version, ...JSON.parse(row.snapshot_json) };
  }
  function validateItems(items) {
    if (!Array.isArray(items) || items.length > 500) throw new HttpError(400, 'A playlist aceita até 500 itens.');
    const ids = new Set();
    return items.map(item => {
      if (!item || typeof item !== 'object' || typeof item.mediaId !== 'string') throw new HttpError(400, 'Item de playlist inválido.');
      const media = mustContent(item.mediaId);
      const seconds = media.kind === 'video' ? 0 : Number(item.seconds ?? 10);
      if (!Number.isInteger(seconds) || (media.kind !== 'video' && (seconds < 1 || seconds > 3600))) throw new HttpError(400, 'A duração deve ser de 1 a 3.600 segundos.');
      const id = typeof item.id === 'string' && /^[a-z0-9-]{36}$/.test(item.id) ? item.id : randomUUID();
      if (ids.has(id)) throw new HttpError(400, 'Os itens da sequência precisam ter identificadores distintos.');
      ids.add(id);
      return { id, mediaId: media.id, seconds };
    });
  }
  function validatePoint(body) {
    const playlistId = body.playlistId || null;
    let publicationId = null;
    if (playlistId) publicationId = mustFind('playlists', playlistId, 'Playlist').current_publication_id;
    const fit = body.fit || 'contain';
    if (!['contain', 'cover'].includes(fit)) throw new HttpError(400, 'Ajuste de tela inválido.');
    return { name: text(body.name, 'Nome do ponto'), location: text(body.location, 'Local', 160, true), fit, playlistId, publicationId };
  }
  function pairedState(d) {
    if (!d.point_id) return { state: 'pairing', deviceId:d.id, code: d.code, expiresAt: d.code_expires_at, expired: !d.code_expires_at || d.code_expires_at < clock(), serverTime: clock() };
    const point = mustFind('points', d.point_id, 'Ponto');
    if(point.publication_id)run('INSERT OR IGNORE INTO device_publications (device_id,point_id,publication_id) VALUES (?,?,?)',d.id,point.id,point.publication_id);
    return {
      state: 'paired', deviceId:d.id, point: { id: point.id, name: point.name, location: point.location, fit: point.fit },
      publication: getPublication(point), commandVersion: point.command_version, serverTime: clock(),
    };
  }
  function publishContent(contentId) {
        const content = mustFind('virtual_content', contentId, 'Conteúdo');
        const affected = all('SELECT p.*, pub.snapshot_json, pub.draft_revision AS published_revision FROM playlists p JOIN publications pub ON p.current_publication_id = pub.id').filter(playlist => JSON.parse(playlist.snapshot_json).items.some(item => item.mediaId === content.id));
        transaction(db, () => {
          for (const playlist of affected) {
            const base = JSON.parse(playlist.snapshot_json);
            const items = base.items.map(item => item.mediaId === content.id ? { ...contentDto(content), id: item.id, mediaId: item.mediaId, seconds: item.seconds } : item);
            const currentDraft = JSON.parse(playlist.items_json).map(item => ({ ...contentDto(mustContent(item.mediaId)), ...item }));
            const comparable = rows => rows.map(item => [item.id, item.mediaId, item.seconds, item.name, item.kind, item.url, item.sourceMediaId || null, item.config || null]);
            const matchesDraft = playlist.name === base.playlistName && JSON.stringify(comparable(currentDraft)) === JSON.stringify(comparable(items)) && JSON.stringify(JSON.parse(playlist.schedule_json||'{"enabled":false}'))===JSON.stringify(base.schedule||{enabled:false});
            const id = randomUUID(), version = q('SELECT COALESCE(MAX(version), 0) + 1 AS n FROM publications WHERE playlist_id = ?', playlist.id).n;
            run('INSERT INTO publications VALUES (?, ?, ?, ?, ?, ?)', id, playlist.id, version, matchesDraft ? playlist.revision : playlist.published_revision, JSON.stringify({ playlistName: base.playlistName, items, schedule:base.schedule||{enabled:false} }), clock());
            run('UPDATE playlists SET current_publication_id = ? WHERE id = ?', id, playlist.id);
            run('UPDATE points SET publication_id = ? WHERE playlist_id = ?', id, playlist.id);
          }
        });
        return { ok: true, playlistsUpdated: affected.length };

  }
  async function authenticate(req, res, setup) {
    limit(req, 'auth', 30, 15 * 60000);
    const body = await readJson(req);
    const username = text(body.username, 'Usuário', 80);
    if (!/^[\w.-]{3,80}$/.test(username)) throw new HttpError(400, 'Use de 3 a 80 letras, números, pontos ou traços no usuário.');
    const password = typeof body.password === 'string' ? body.password : '';
    if (password.length > 256) throw new HttpError(400, 'Senha muito longa.');
    if (setup) {
      if (password.length < 10) throw new HttpError(400, 'Escolha uma senha com pelo menos 10 caracteres.');
      if (q('SELECT id FROM admins')) throw new HttpError(409, 'O administrador já foi configurado.');
      const salt = randomBytes(16).toString('hex');
      const derived = await deriveKey(password, salt, 64);
      transaction(db, () => {
        if (q('SELECT id FROM admins')) throw new HttpError(409, 'O administrador já foi configurado.');
        run('INSERT INTO admins VALUES (1, ?, ?, ?, ?)', username, `${salt}:${derived.toString('hex')}`, text(body.workspace || 'Minha rede', 'Nome da rede', 80), clock());
      });
    } else {
      const row = q('SELECT * FROM admins WHERE username = ?', username);
      const [salt, saved] = row ? row.password_hash.split(':') : ['not-a-real-salt', '00'.repeat(64)];
      const derived = await deriveKey(password, salt, 64);
      if (!row || !timingSafeEqual(Buffer.from(saved, 'hex'), derived)) throw new HttpError(401, 'Usuário ou senha incorretos.');
    }
    const token = randomBytes(32).toString('hex');
    run('DELETE FROM sessions WHERE expires_at < ?', clock());
    run('INSERT INTO sessions VALUES (?, ?)', hash(token), clock() + 8 * 3600000);
    setCookie(res, 'vw_session', token, 8 * 3600);
    json(res, 200, { ok: true });
  }

  async function handle(req, res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self' https://api.open-meteo.com; frame-src 'self' https:; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'");
    const url = new URL(req.url, 'http://local');
    const pathname = url.pathname;
    const method = req.method;
    if (!['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) throw new HttpError(405, 'Método não permitido.');
    if (!['GET', 'HEAD'].includes(method) && req.headers.origin) {
      let origin;
      try { origin = new URL(req.headers.origin); } catch { throw new HttpError(403, 'Origem inválida.'); }
      if (origin.host !== req.headers.host) throw new HttpError(403, 'Solicitação de outra origem bloqueada.');
    }
    if (pathname === '/api/health' && method === 'GET') return json(res, 200, { ok: true, version: '0.1.0' });
    if (pathname === '/api/session' && method === 'GET') return json(res, 200, { setupRequired: !q('SELECT id FROM admins'), user: admin(req) || null, maxUploadBytes });
    if (pathname === '/api/auth/setup' && method === 'POST') return authenticate(req, res, true);
    if (pathname === '/api/auth/login' && method === 'POST') return authenticate(req, res, false);
    if (pathname === '/api/auth/logout' && method === 'POST') {
      const token = cookies(req).vw_session;
      if (token) run('DELETE FROM sessions WHERE token_hash = ?', hash(token));
      setCookie(res, 'vw_session', '', 0);
      return json(res, 200, { ok: true });
    }

    if (pathname === '/api/player/register' && method === 'POST') {
      let d = device(req);
      if (!d) {
        limit(req, 'register', 60, 3600000);
        const token = randomBytes(32).toString('hex');
        const id = randomUUID();
        run('INSERT INTO devices (id, token_hash, created_at) VALUES (?, ?, ?)', id, hash(token), clock());
        setCookie(res, 'vw_device', token, 365 * 86400);
        d = q('SELECT * FROM devices WHERE id = ?', id);
      }
      if (!d.point_id && (!d.code || d.code_expires_at < clock())) {
        let code;
        do { code = makeCode(); } while (q('SELECT id FROM devices WHERE code = ?', code));
        run('UPDATE devices SET code = ?, code_expires_at = ? WHERE id = ?', code, clock() + 30 * 60000, d.id);
        d = q('SELECT * FROM devices WHERE id = ?', d.id);
      }
      return json(res, 200, pairedState(d));
    }
    if (pathname === '/api/player/sync' && method === 'POST') {
      const d = device(req);
      if (!d) throw new HttpError(401, 'Este player precisa ser vinculado novamente.');
      const body = await readJson(req);
      const state = pairedState(d);
      if(body.events!==undefined && (!Array.isArray(body.events)||body.events.length>200))throw new HttpError(400,'Envie até 200 eventos por sincronização.');
      const activePublication=typeof body.activePublicationId==='string'&&q('SELECT p.id,p.snapshot_json FROM device_publications d JOIN publications p ON p.id=d.publication_id WHERE d.device_id=? AND d.point_id=? AND d.publication_id=?',d.id,d.point_id,body.activePublicationId);
      const playbackPublication=activePublication?JSON.parse(activePublication.snapshot_json):state.publication;
      const current = playbackPublication?.items.find(item => item.mediaId === body.currentMediaId);
      const playbackState = ['playing', 'loading', 'error', 'waiting', 'scheduled'].includes(body.playbackState) ? body.playbackState : 'waiting';
      run('UPDATE devices SET last_seen = ?, current_media_id = ?, playback_state = ? WHERE id = ?', clock(), current?.mediaId || null, playbackState, d.id);
      run('UPDATE devices SET offline_json=?,active_publication_id=? WHERE id=?',JSON.stringify(offlineTelemetry(body.offlineStatus)),activePublication?.id||state.publication?.id||null,d.id);
      const acknowledgements=transaction(db,()=>ingestEvents(db,d,body.events||[],clock()));
      if (d.point_id && body.event) {
        const eventMedia = state.publication?.items.find(item => item.mediaId === body.event.mediaId);
        if (eventMedia && ['started', 'ended', 'error'].includes(body.event.type)) {
          run('INSERT INTO playback_events (point_id, media_id, media_name, type, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)', d.point_id, eventMedia.mediaId, eventMedia.name, body.event.type, text(body.event.detail || '', 'Detalhe', 300, true), clock());
        }
      }
      return json(res, 200, {...state,...acknowledgements});
    }
    if (pathname.startsWith('/media/') && ['GET', 'HEAD'].includes(method)) {
      const id = pathname.slice(7);
      if (!admin(req)) {
        const d = device(req);
        const point = d?.point_id ? q('SELECT * FROM points WHERE id = ?', d.point_id) : null;
        if (!getPublication(point)?.items.some(item => item.mediaId === id || item.sourceMediaId === id)) throw new HttpError(401, 'Acesso ao conteúdo não autorizado.');
      }
      const media = mustFind('media', id, 'Conteúdo');
      return sendFile(req, res, join(dataDir, 'uploads', media.stored_name), media.mime, { private: true });
    }

    if (pathname.startsWith('/api/')) {
      if (!admin(req)) throw new HttpError(401, 'Entre no painel para continuar.');

      if(pathname === '/api/catalog' && method === 'GET') return json(res,200,catalog.status());
      if(pathname === '/api/catalog/products' && method === 'GET') return json(res,200,catalog.search(url.searchParams));
      if(pathname === '/api/catalog/imports' && method === 'POST') {const body=await readJson(req);return json(res,201,catalog.stage(body.text,body.filename));}
      const importAction = /^\/api\/catalog\/imports\/([\w-]+)\/apply$/.exec(pathname);
      if(importAction && method === 'POST') return json(res,200,catalog.apply(importAction[1]));
      if(pathname === '/api/catalog/watch' && method === 'PUT') {const value=catalog.configure(await readJson(req));void catalog.check();return json(res,200,value);}
      if(pathname === '/api/catalog/check' && method === 'POST') {await catalog.check();return json(res,200,catalog.status());}
      if(pathname === '/api/catalog/refresh-content' && method === 'POST') {
        const changed=[];
        transaction(db,()=>{
          const products=db.prepare('SELECT * FROM catalog_products').all();
          const byKey=new Map(products.map(p=>[p.product_key,p])),byCode=new Map();
          for(const p of products){const rows=byCode.get(p.code)||[];rows.push(p);byCode.set(p.code,rows);}
          for(const content of all("SELECT * FROM virtual_content WHERE kind IN ('poster','price_table','offer')")){
            const config=JSON.parse(content.config_json),before=JSON.stringify(config);
            if(content.kind==='offer' && config.productKey){const p=byKey.get(config.productKey);config.catalogUnavailable=!p?.available||p.price<=0;if(!config.catalogUnavailable){config.title=p.name;config.price=p.price;}}
            else if(config.rows) config.rows=config.rows.map(row=>{
              if(!row.code)return row;
              const candidates=byCode.get(row.code)||[];
              const p=row.department?byKey.get(row.department+':'+row.code):candidates.length===1?candidates[0]:null;
              if(!p)return row;
              return {...row,name:p.name,price:p.price,unit:p.unit,department:p.department,active:row.active!==false&&!!p.available&&p.price>0};
            });
            if(JSON.stringify(config)===before)continue;
            run('UPDATE virtual_content SET config_json=? WHERE id=?',JSON.stringify(config),content.id);
            for(const playlist of all('SELECT id,items_json FROM playlists'))if(JSON.parse(playlist.items_json).some(item=>item.mediaId===content.id))run('UPDATE playlists SET revision=revision+1,updated_at=? WHERE id=?',clock(),playlist.id);
            changed.push({id:content.id,name:content.name});
          }
        });
        const previous=JSON.parse(q('SELECT value_json FROM settings WHERE key=?','catalog-pending-content')?.value_json || '[]');
        run('INSERT INTO settings VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json','catalog-pending-content',JSON.stringify([...new Set([...previous,...changed.map(c=>c.id)])]));
        return json(res,200,{changed});
      }
      if(pathname === '/api/catalog/publish' && method === 'POST') {
        const body=await readJson(req);
        if(!Array.isArray(body.ids)||body.ids.length>200||body.ids.some(id=>typeof id!=='string'))throw new HttpError(400,'Selecione os conteúdos a publicar.');
        for(const id of body.ids)mustFind('virtual_content',id,'Conteúdo');
        let count=0;for(const id of new Set(body.ids))count+=publishContent(id).playlistsUpdated;
        const previous=JSON.parse(q('SELECT value_json FROM settings WHERE key=?','catalog-pending-content')?.value_json || '[]');
        run('INSERT INTO settings VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json','catalog-pending-content',JSON.stringify(previous.filter(id=>!body.ids.includes(id))));
        return json(res,200,{publications:count});
      }

      if (pathname === '/api/dashboard' && method === 'GET') {
        const points = all('SELECT * FROM points ORDER BY created_at DESC').map(pointDto);
        const recentEvents = all('SELECT e.*, p.name AS point_name FROM playback_events e JOIN points p ON p.id = e.point_id ORDER BY e.created_at DESC,e.id DESC LIMIT 8');
        const startHour = Math.floor(clock() / 3600000) * 3600000;
        const hours = Array.from({ length: 12 }, (_, i) => ({ at: startHour - (11 - i) * 3600000, count: 0 }));
        for (const row of all("SELECT CAST(created_at / 3600000 AS INTEGER) * 3600000 AS hour, COUNT(*) AS n FROM playback_events WHERE type = 'started' AND created_at >= ? GROUP BY hour", hours[0].at)) {
          const bucket = hours.find(h => h.at === row.hour); if (bucket) bucket.count = row.n;
        }
        const thirtyDaysAgo = clock() - 30 * 86400000;
        const totalPlays30d = q("SELECT COUNT(*) AS n FROM playback_events WHERE type = 'started' AND created_at >= ?", thirtyDaysAgo).n;
        const mediaCount = q('SELECT COUNT(*) AS n FROM media').n;
        const virtualCount = q('SELECT COUNT(*) AS n FROM virtual_content').n;
        const usage = {
          airTimeHours: Math.round(totalPlays30d * 0.15 + Math.max(1, points.length) * 24),
          days: 30,
          moneySaved: (Math.max(1, points.length) * 15.0).toFixed(2),
          workHoursSaved: Math.max(1, points.length),
          updatesCount: totalPlays30d,
          uploadsCount: mediaCount,
          processedCount: virtualCount * 12 + 50,
          paperSaved: (virtualCount * 0.25 * 10).toFixed(2),
          printsAvoided: virtualCount * 10
        };
        return json(res, 200, {
          points, recentEvents, hours, serverTime: clock(), usage,
          counts: {
            points: points.length, online: points.filter(p => p.online).length, paired: points.filter(p => p.paired).length,
            media: q('SELECT COUNT(*) AS n FROM media').n + q('SELECT COUNT(*) AS n FROM virtual_content').n,
            playlists: q('SELECT COUNT(*) AS n FROM playlists').n,
            playsToday: q("SELECT COUNT(*) AS n FROM playback_events WHERE type = 'started' AND created_at >= ?", clock() - 86400000).n,
          },
        });
      }
      if (pathname === '/api/media' && method === 'GET') return json(res, 200, [...all('SELECT * FROM media'), ...all('SELECT * FROM virtual_content')].sort((a, b) => b.created_at - a.created_at).map(contentDto));
      const contentMatch = /^\/api\/content\/([\w-]+)$/.exec(pathname);
      const contentPublish = /^\/api\/content\/([\w-]+)\/publish$/.exec(pathname);
      if (contentPublish && method === 'POST') return json(res,200,publishContent(contentPublish[1]));
      if ((pathname === '/api/content' && method === 'POST') || (contentMatch && method === 'PUT')) {
        const existing = contentMatch ? mustFind('virtual_content', contentMatch[1], 'Conteúdo') : null;
        const input = validateContent(await readJson(req));
        if (input.kind === 'product_image' && mustFind('media', input.config.mediaId, 'Imagem').kind !== 'image') throw new HttpError(400, 'Escolha uma imagem para o produto.');
        const id = existing?.id || randomUUID();
        transaction(db, () => {
          if (existing) {
            run('UPDATE virtual_content SET name = ?, kind = ?, config_json = ? WHERE id = ?', input.name, input.kind, JSON.stringify(input.config), id);
            for (const p of all('SELECT id, items_json FROM playlists')) if (JSON.parse(p.items_json).some(item => item.mediaId === id)) run('UPDATE playlists SET revision = revision + 1, updated_at = ? WHERE id = ?', clock(), p.id);
          } else run('INSERT INTO virtual_content VALUES (?, ?, ?, ?, ?)', id, input.name, input.kind, JSON.stringify(input.config), clock());
        });
        return json(res, existing ? 200 : 201, contentDto(q('SELECT * FROM virtual_content WHERE id = ?', id)));
      }
      if (pathname === '/api/media' && method === 'POST') {
        const name = text(url.searchParams.get('name'), 'Nome do conteúdo');
        const filename = text(url.searchParams.get('filename') || name, 'Nome do arquivo', 240);
        const validity=validateValidity(Object.fromEntries(['validFrom','validUntil'].map(key=>[key,url.searchParams.get(key)])));
        const received = await receiveMedia(req, dataDir, maxUploadBytes);
        try {
          run('INSERT INTO media (id,name,filename,stored_name,mime,kind,size,created_at,has_prices,validity_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', received.id, name, filename, received.storedName, received.mime, received.kind, received.size, clock(),url.searchParams.get('hasPrices')==='false'?0:1,JSON.stringify(validity));
        } catch (error) { await unlink(join(dataDir, 'uploads', received.storedName)).catch(() => {}); throw error; }
        return json(res, 201, mediaDto(q('SELECT * FROM media WHERE id = ?', received.id)));
      }
      const mediaMatch = /^\/api\/media\/([\w-]+)$/.exec(pathname);
      if(mediaMatch && method==='PUT'){
        const media=mustFind('media',mediaMatch[1],'Mídia'),body=await readJson(req);
        if(body.hasPrices!==undefined && typeof body.hasPrices!=='boolean')throw new HttpError(400,'Informe se o arquivo contém preços.');
        const validity=validateValidity({...JSON.parse(media.validity_json||'{}'),...body});
        transaction(db,()=>{
          run('UPDATE media SET has_prices=?,validity_json=? WHERE id=?',body.hasPrices===undefined?media.has_prices:body.hasPrices?1:0,JSON.stringify(validity),media.id);
          const productIds=all("SELECT id,config_json FROM virtual_content WHERE kind='product_image'").filter(row=>JSON.parse(row.config_json).mediaId===media.id).map(row=>row.id);
          for(const p of all('SELECT id,items_json FROM playlists'))if(JSON.parse(p.items_json).some(item=>item.mediaId===media.id||productIds.includes(item.mediaId)))run('UPDATE playlists SET revision=revision+1,updated_at=? WHERE id=?',clock(),p.id);
        });
        return json(res,200,mediaDto(q('SELECT * FROM media WHERE id=?',media.id)));
      }
      if (mediaMatch && method === 'DELETE') {
        const media = mustContent(mediaMatch[1]);
        if (!media.config_json && all("SELECT config_json FROM virtual_content WHERE kind = 'product_image'").some(row => JSON.parse(row.config_json).mediaId === media.id)) throw new HttpError(409, 'Esta imagem está vinculada a um produto. Remova o conteúdo de produto antes de excluir.');
        const inDraft = all('SELECT items_json FROM playlists').some(p => JSON.parse(p.items_json).some(item => item.mediaId === media.id));
        const inPublication = all('SELECT DISTINCT pub.snapshot_json FROM publications pub JOIN points p ON p.publication_id = pub.id UNION SELECT pub.snapshot_json FROM publications pub JOIN playlists p ON p.current_publication_id = pub.id').some(p => JSON.parse(p.snapshot_json).items.some(item => item.mediaId === media.id || item.sourceMediaId === media.id));
        if (inDraft || inPublication) throw new HttpError(409, 'Este conteúdo está em uma playlist. Remova-o da sequência e publique a alteração antes de excluir.');
        if (media.config_json) run('DELETE FROM virtual_content WHERE id = ?', media.id);
        else {
          await unlink(join(dataDir, 'uploads', media.stored_name)).catch(error => { if (error.code !== 'ENOENT') throw error; });
          run('DELETE FROM media WHERE id = ?', media.id);
        }
        return json(res, 200, { ok: true });
      }
      if (pathname === '/api/playlists' && method === 'GET') return json(res, 200, all('SELECT * FROM playlists ORDER BY updated_at DESC').map(playlistDto));
      const attachMatch=/^\/api\/content\/([\w-]+)\/playlists$/.exec(pathname);
      if(attachMatch && method==='POST'){
        const content=mustContent(attachMatch[1]),body=await readJson(req);
        if(!Array.isArray(body.targets)||!body.targets.length||body.targets.length>200||body.targets.some(target=>!target||typeof target.id!=='string'||!Number.isSafeInteger(target.revision))||new Set(body.targets.map(target=>target.id)).size!==body.targets.length)throw new HttpError(400,'Selecione de 1 a 200 playlists distintas.');
        const result=transaction(db,()=>{
          const added=[],skipped=[];
          for(const target of body.targets){
            const playlist=mustFind('playlists',target.id,'Playlist');
            if(playlist.revision!==target.revision)throw new HttpError(409,'Uma playlist foi alterada em outra janela. Reabra a seleção e tente novamente.');
            const items=JSON.parse(playlist.items_json);
            if(items.some(item=>item.mediaId===content.id)){skipped.push({id:playlist.id,name:playlist.name});continue;}
            const updated=validateItems([...items,{mediaId:content.id,seconds:body.seconds}]);
            run('UPDATE playlists SET items_json=?,revision=revision+1,updated_at=? WHERE id=?',JSON.stringify(updated),clock(),playlist.id);
            added.push({id:playlist.id,name:playlist.name});
          }
          return {added,skipped};
        });
        return json(res,200,result);
      }
      if (pathname === '/api/playlists' && method === 'POST') {
        const body = await readJson(req); const id = randomUUID();
        const items = validateItems(body.items || []);
        run('INSERT INTO playlists (id, name, items_json, created_at, updated_at,schedule_json) VALUES (?, ?, ?, ?, ?, ?)', id, text(body.name, 'Nome da playlist'), JSON.stringify(items), clock(), clock(),JSON.stringify(scheduleInput(body.schedule)));
        return json(res, 201, playlistDto(q('SELECT * FROM playlists WHERE id = ?', id)));
      }
      const playlistMatch = /^\/api\/playlists\/([\w-]+)(?:\/(publish))?$/.exec(pathname);
      if (playlistMatch) {
        const row = mustFind('playlists', playlistMatch[1], 'Playlist');
        if (!playlistMatch[2] && method === 'PUT') {
          const body = await readJson(req);
          if (body.revision !== row.revision) throw new HttpError(409, 'A playlist foi alterada em outra janela. Reabra a sequência para atualizar.');
          const items = validateItems(body.items);
          const schedule=body.schedule===undefined?JSON.parse(row.schedule_json||'{"enabled":false}'):scheduleInput(body.schedule);
          run('UPDATE playlists SET name = ?, items_json = ?, schedule_json=?,revision = revision + 1, updated_at = ? WHERE id = ?', text(body.name, 'Nome da playlist'), JSON.stringify(items),JSON.stringify(schedule), clock(), row.id);
          return json(res, 200, playlistDto(q('SELECT * FROM playlists WHERE id = ?', row.id)));
        }
        if (playlistMatch[2] === 'publish' && method === 'POST') {
          const body = await readJson(req);
          if (body.revision !== row.revision) throw new HttpError(409, 'A sequência mudou. Reabra a playlist antes de publicar.');
          if (!JSON.parse(row.items_json).length) throw new HttpError(400, 'Adicione pelo menos um conteúdo à playlist.');
          const publicationId = randomUUID();
          const items = JSON.parse(row.items_json).map(item => {
            const media = contentDto(mustContent(item.mediaId));
            return { ...media, ...item };
          });
          const version = q('SELECT COALESCE(MAX(version), 0) + 1 AS n FROM publications WHERE playlist_id = ?', row.id).n;
          transaction(db, () => {
            run('INSERT INTO publications VALUES (?, ?, ?, ?, ?, ?)', publicationId, row.id, version, row.revision, JSON.stringify({ playlistName: row.name, items, schedule:JSON.parse(row.schedule_json||'{"enabled":false}') }), clock());
            run('UPDATE playlists SET current_publication_id = ? WHERE id = ?', publicationId, row.id);
            run('UPDATE points SET publication_id = ? WHERE playlist_id = ?', publicationId, row.id);
          });
          return json(res, 200, playlistDto(q('SELECT * FROM playlists WHERE id = ?', row.id)));
        }
        if (!playlistMatch[2] && method === 'DELETE') {
          if (q('SELECT id FROM points WHERE playlist_id = ?', row.id)) throw new HttpError(409, 'Troque a playlist dos pontos antes de excluir.');
          run('DELETE FROM playlists WHERE id = ?', row.id);
          return json(res, 200, { ok: true });
        }
      }
      if (pathname === '/api/points' && method === 'GET') return json(res, 200, all('SELECT * FROM points ORDER BY created_at DESC').map(pointDto));
      if (pathname === '/api/points' && method === 'POST') {
        const input = validatePoint(await readJson(req)); const id = randomUUID();
        run('INSERT INTO points (id, name, location, fit, playlist_id, publication_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', id, input.name, input.location, input.fit, input.playlistId, input.publicationId, clock());
        return json(res, 201, pointDto(q('SELECT * FROM points WHERE id = ?', id)));
      }
      const pointMatch = /^\/api\/points\/([\w-]+)(?:\/(pair|unpair|refresh))?$/.exec(pathname);
      const monitorMatch = /^\/api\/points\/([\w-]+)\/monitor$/.exec(pathname);
      if(monitorMatch && method==='GET') {
        const point=mustFind('points',monitorMatch[1],'Ponto');
        const since=clock()-30*60000;
        const events=all('SELECT * FROM playback_events WHERE point_id=? AND created_at>=? ORDER BY created_at DESC,id DESC LIMIT 200',point.id,since);
        const total=q('SELECT COUNT(*) AS n FROM playback_events WHERE point_id=? AND created_at>=?',point.id,since).n;
        const publication=getPublication(point),dto=pointDto(point);
        return json(res,200,{point:dto,publication,events,eventsTruncated:total>events.length,since,serverTime:clock()});
      }
      if (pointMatch) {
        const row = mustFind('points', pointMatch[1], 'Ponto');
        const action = pointMatch[2];
        if (!action && method === 'PUT') {
          const input = validatePoint(await readJson(req));
          run('UPDATE points SET name = ?, location = ?, fit = ?, playlist_id = ?, publication_id = ? WHERE id = ?', input.name, input.location, input.fit, input.playlistId, input.publicationId, row.id);
          return json(res, 200, pointDto(q('SELECT * FROM points WHERE id = ?', row.id)));
        }
        if (action === 'pair' && method === 'POST') {
          limit(req, 'pair', 40, 15 * 60000);
          const body = await readJson(req);
          const code = text(body.code, 'Código', 12).toUpperCase().replace(/\s/g, '');
          transaction(db, () => {
            if (q('SELECT id FROM devices WHERE point_id = ?', row.id)) throw new HttpError(409, 'Este ponto já possui um player. Desvincule-o primeiro.');
            const d = q('SELECT * FROM devices WHERE code = ? AND point_id IS NULL AND code_expires_at > ?', code, clock());
            if (!d) throw new HttpError(400, 'Código inválido ou expirado. Confira a tela do player.');
            run('UPDATE devices SET point_id = ?, code = NULL, code_expires_at = NULL WHERE id = ?', row.id, d.id);
          });
          return json(res, 200, pointDto(q('SELECT * FROM points WHERE id = ?', row.id)));
        }
        if (action === 'unpair' && method === 'POST') {
          run('DELETE FROM devices WHERE point_id = ?', row.id);
          return json(res, 200, { ok: true });
        }
        if (action === 'refresh' && method === 'POST') {
          run('UPDATE points SET command_version = command_version + 1 WHERE id = ?', row.id);
          return json(res, 200, { ok: true });
        }
        if (!action && method === 'DELETE') {
          transaction(db, () => { run('DELETE FROM devices WHERE point_id = ?', row.id); run('DELETE FROM points WHERE id = ?', row.id); });
          return json(res, 200, { ok: true });
        }
      }
      if (pathname === '/api/reports' && method === 'GET') {
        const requestedDays = Number(url.searchParams.get('days') || 30);
        const days = Number.isInteger(requestedDays) && requestedDays >= 1 && requestedDays <= 366 ? requestedDays : 30;
        const since = clock() - days * 86400000;
        const totals = q("SELECT COUNT(*) AS events, SUM(CASE WHEN type = 'started' THEN 1 ELSE 0 END) AS starts, SUM(CASE WHEN type = 'ended' THEN 1 ELSE 0 END) AS ends, SUM(CASE WHEN type = 'error' THEN 1 ELSE 0 END) AS errors FROM playback_events WHERE created_at >= ?", since);
        const byContent = all("SELECT COALESCE(media_name, 'Conteúdo indisponível') AS name, media_id AS mediaId, SUM(CASE WHEN type = 'started' THEN 1 ELSE 0 END) AS starts, SUM(CASE WHEN type = 'ended' THEN 1 ELSE 0 END) AS ends, SUM(CASE WHEN type = 'error' THEN 1 ELSE 0 END) AS errors, MAX(created_at) AS lastAt FROM playback_events WHERE created_at >= ? GROUP BY media_id, media_name ORDER BY starts DESC, lastAt DESC LIMIT 100", since);
        const byPoint = all("SELECT p.id, p.name, p.location, SUM(CASE WHEN e.type = 'started' THEN 1 ELSE 0 END) AS starts, SUM(CASE WHEN e.type = 'ended' THEN 1 ELSE 0 END) AS ends, SUM(CASE WHEN e.type = 'error' THEN 1 ELSE 0 END) AS errors, MAX(e.created_at) AS lastAt FROM points p LEFT JOIN playback_events e ON e.point_id = p.id AND e.created_at >= ? GROUP BY p.id ORDER BY starts DESC, p.name ASC", since);
        return json(res, 200, { days, since, generatedAt: clock(), totals: { events: totals.events || 0, starts: totals.starts || 0, ends: totals.ends || 0, errors: totals.errors || 0 }, byContent, byPoint });
      }
      if (pathname === '/api/logs' && method === 'GET') {
        const id = url.searchParams.get('pointId');
        const rows = id ? all('SELECT e.*, p.name AS point_name FROM playback_events e JOIN points p ON p.id = e.point_id WHERE e.point_id = ? ORDER BY e.created_at DESC,e.id DESC LIMIT 200', id) : all('SELECT e.*, p.name AS point_name FROM playback_events e JOIN points p ON p.id = e.point_id ORDER BY e.created_at DESC,e.id DESC LIMIT 200');
        return json(res, 200, rows);
      }
      throw new HttpError(404, 'Operação não encontrada.');
    }
    if (!['GET', 'HEAD'].includes(method)) throw new HttpError(405, 'Método não permitido.');
    const staticFiles = {
      '/': ['index.html', 'text/html; charset=utf-8'],
      '/player': ['player.html', 'text/html; charset=utf-8'],
      '/player/': ['player.html', 'text/html; charset=utf-8'],
      '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
      '/catalog-ui.js': ['catalog-ui.js', 'text/javascript; charset=utf-8'],
      '/library-actions.js': ['library-actions.js', 'text/javascript; charset=utf-8'],
      '/playlist-schedule.js': ['playlist-schedule.js', 'text/javascript; charset=utf-8'],
      '/schedule-ui.js': ['schedule-ui.js', 'text/javascript; charset=utf-8'],
      '/monitor-ui.js': ['monitor-ui.js', 'text/javascript; charset=utf-8'],
      '/monitor-utils.js': ['monitor-utils.js', 'text/javascript; charset=utf-8'],
      '/content-utils.js': ['content-utils.js', 'text/javascript; charset=utf-8'],
      '/toledo.js': ['toledo.js', 'text/javascript; charset=utf-8'],
      '/player.js': ['player.js', 'text/javascript; charset=utf-8'],
      '/content-renderer.js': ['content-renderer.js', 'text/javascript; charset=utf-8'],
      '/editor-utils.js': ['editor-utils.js', 'text/javascript; charset=utf-8'],
      '/playlist-editor.js': ['playlist-editor.js', 'text/javascript; charset=utf-8'],
      '/preview': ['preview.html', 'text/html; charset=utf-8'],
      '/preview.js': ['preview.js', 'text/javascript; charset=utf-8'],
      '/preview.css': ['preview.css', 'text/css; charset=utf-8'],
      '/video-health.js': ['video-health.js', 'text/javascript; charset=utf-8'],
      '/player-sw.js': ['player-sw.js', 'text/javascript; charset=utf-8'],
      '/offline-policy.js': ['offline-policy.js', 'text/javascript; charset=utf-8'],
      '/offline-player.js': ['offline-player.js', 'text/javascript; charset=utf-8'],
      '/offline-store.js': ['offline-store.js', 'text/javascript; charset=utf-8'],
      '/offline-range.js': ['offline-range.js', 'text/javascript; charset=utf-8'],
      '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
      '/retail.css': ['retail.css', 'text/css; charset=utf-8'],
      '/player.css': ['player.css', 'text/css; charset=utf-8'],
      '/icon.svg': ['icon.svg', 'image/svg+xml'],
    };
    const file = staticFiles[pathname];
    if (!file) throw new HttpError(404, 'Página não encontrada.');
    return sendFile(req, res, join(publicDir, file[0]), file[1]);
  }

  const server = createServer((req, res) => {
    handle(req, res).catch(error => {
      if (res.headersSent) return res.destroy();
      const status = error.status || 500;
      if (status === 500) console.error('Falha na solicitação:', error.message);
      json(res, status, { error: status === 500 ? 'Não foi possível concluir a operação.' : error.message });
    });
  });
  server.requestTimeout = 300000;
  return { server, db, catalog, close: () => { catalog.close(); db.close(); } };
}
