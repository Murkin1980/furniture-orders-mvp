import { URL } from 'node:url';
import { checkAuth } from './auth.js';

const DEFAULT_MAX_BODY_BYTES = 262144;

export function createRouter() {
  const routes = [];

  function add(method, pathname, handler) {
    routes.push({ method: method.toUpperCase(), pathname, handler });
  }

  async function parseBody(req, maxBodyBytes = DEFAULT_MAX_BODY_BYTES) {
    return new Promise((resolve, reject) => {
      let raw = '';
      let size = 0;
      let tooLarge = false;
      req.on('data', chunk => {
        if (tooLarge) {
          return;
        }
        size += chunk.length;
        if (size > maxBodyBytes) {
          tooLarge = true;
          return;
        }
        raw += chunk;
      });
      req.on('end', () => {
        if (tooLarge) {
          reject(Object.assign(new Error('Request body is too large.'), { statusCode: 413 }));
          return;
        }
        if (!raw) return resolve(null);
        try { resolve(JSON.parse(raw)); }
        catch {
          reject(Object.assign(new Error('Request body must be valid JSON.'), { statusCode: 400 }));
        }
      });
      req.on('error', reject);
    });
  }

  function sendJson(res, statusCode, data) {
    const body = JSON.stringify(data) + '\n';
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    });
    res.end(body);
  }

  async function handle(req, res, config) {
    const host = req.headers.host || 'localhost';
    const url = new URL(req.url, `http://${host}`);
    const method = req.method.toUpperCase();
    const pathname = url.pathname;

    const query = {};
    for (const [k, v] of url.searchParams) query[k] = v;

    for (const route of routes) {
      if (route.method === method && route.pathname === pathname) {
        const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
        if (route.handler.requiresAuth && !checkAuth(authHeader, config).authorized) {
          sendJson(res, 401, makeError('unauthorized', 'Authorization token is invalid or missing.'));
          return;
        }

        try {
          let body = null;
          if (method !== 'GET' && method !== 'HEAD') {
            body = await parseBody(req, config.maxBodyBytes);
          }
          await route.handler({ req, res, body, query, config, sendJson });
        } catch (err) {
          if (err?.statusCode === 400) {
            sendJson(res, 400, makeError('invalid_json', err.message));
            return;
          }
          if (err?.statusCode === 413) {
            sendJson(res, 413, makeError('payload_too_large', err.message));
            return;
          }
          sendJson(res, 500, makeError('internal_error', 'An internal error occurred.'));
        }
        return;
      }
    }

    sendJson(res, 404, makeError('not_found', 'Endpoint not found.'));
  }

  return {
    get(pathname, handler) { add('GET', pathname, handler); },
    post(pathname, handler) { add('POST', pathname, handler); },
    handle,
    sendJson,
  };
}

export function makeError(error, message, fields) {
  const result = { success: false, error, message };
  if (fields) result.fields = fields;
  return result;
}
