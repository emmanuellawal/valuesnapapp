'use strict';
const { spawn } = require('child_process');
const http = require('http');
const { NgrokClientError } = require('./src/client');

const NGROK_BIN = '/usr/local/bin/ngrok';
const READY_RE = /starting web service.*addr=([\d.]+:\d+)/;
const SESSION_READY_RE = /client session established|tunnel session started/;
const SESSION_CLOSED_RE = /session closed, starting reconnect loop/;
const START_TIMEOUT_MS = 9000;
const CONNECT_RETRY_DELAY_MS = 250;
const CONNECT_RETRY_ATTEMPTS = 20;

let _proc = null;
let _apiBase = null;

function apiPost(base, path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(base + path);
    const req = http.request(
      {
        hostname: u.hostname,
        port: parseInt(u.port, 10),
        path: u.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let buf = '';
        res.on('data', (chunk) => {
          buf += chunk;
        });
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(buf);
          } catch (error) {
            parsed = buf;
          }
          if (res.statusCode >= 400) {
            reject(
              new NgrokClientError(
                (parsed && parsed.msg) || buf,
                { statusCode: res.statusCode },
                parsed
              )
            );
          } else {
            resolve(parsed);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isSessionNotReadyError(error) {
  const statusCode = error && error.response && error.response.statusCode;
  const details = error && error.body && error.body.details;
  const err = details && details.err;
  return (
    (statusCode === 502 && err === 'tunnel session not ready yet') ||
    (statusCode === 503 && err === 'a successful ngrok tunnel session has not yet been established')
  );
}

function killProc() {
  if (!_proc) return Promise.resolve();
  const proc = _proc;
  const exited = new Promise((resolve) => proc.once('exit', resolve));
  proc.kill();
  _proc = null;
  _apiBase = null;
  return exited.then(() => delay(200));
}

function startProc(onStatusChange) {
  if (_proc && _apiBase) return Promise.resolve(_apiBase);
  return new Promise((resolve, reject) => {
    const proc = spawn(NGROK_BIN, ['start', '--none', '--log=stdout'], {
      windowsHide: true,
    });
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error('ngrok start timeout'));
    }, START_TIMEOUT_MS);

    let done = false;
    let apiBase = null;
    let sessionReady = false;
    let stdoutBuffer = '';

    const maybeResolve = () => {
      if (done || !apiBase || !sessionReady) {
        return;
      }
      done = true;
      clearTimeout(timer);
      _proc = proc;
      _apiBase = apiBase;
      resolve(_apiBase);
    };

    proc.stdout.on('data', (chunk) => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop();

      for (const line of lines) {
        const apiMatch = line.match(READY_RE);
        if (apiMatch) {
          apiBase = 'http://' + apiMatch[1];
        }
        if (SESSION_READY_RE.test(line)) {
          sessionReady = true;
          if (typeof onStatusChange === 'function') {
            onStatusChange('connected');
          }
        }
        if (SESSION_CLOSED_RE.test(line) && typeof onStatusChange === 'function') {
          onStatusChange('closed');
        }
        maybeResolve();
      }
    });

    proc.stderr.on('data', (data) => {
      if (done) return;
      clearTimeout(timer);
      proc.kill();
      reject(new Error(data.toString().trim()));
    });

    proc.on('exit', () => {
      _proc = null;
      _apiBase = null;
    });

    proc.on('error', (error) => {
      clearTimeout(timer);
      if (!done) {
        reject(error);
      }
    });
  });
}

async function createTunnelWithRetry(base, tunnelOptions) {
  let lastError;

  for (let attempt = 0; attempt < CONNECT_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await apiPost(base, '/api/tunnels', tunnelOptions);
    } catch (error) {
      lastError = error;
      if (!isSessionNotReadyError(error)) {
        throw error;
      }
      await delay(CONNECT_RETRY_DELAY_MS);
    }
  }

  throw lastError;
}

async function connect(opts) {
  opts = opts || {};
  await killProc();
  const base = await startProc(opts.onStatusChange);
  const addr = String(opts.addr || opts.port || 80);
  const proto = opts.proto || 'http';
  let name;

  try {
    name = require('uuid').v4();
  } catch (error) {
    name = Math.random().toString(36).slice(2);
  }

  const result = await createTunnelWithRetry(base, { proto, addr, name });
  return result.public_url;
}

async function kill() {
  await killProc();
}

module.exports = {
  connect,
  disconnect: kill,
  kill,
  authtoken: async () => {},
  getVersion: async () => '3.x',
  getActiveProcess: () => _proc,
  getUrl: () => _apiBase,
  getApi: () => null,
  NgrokClientError,
};
