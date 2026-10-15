$ErrorActionPreference = 'Stop'
$frontend = Split-Path -Parent $PSScriptRoot
$tempParent = 'C:\Users\diego\AppData\Local\Temp\opencode'
if (!(Test-Path -LiteralPath $tempParent)) { throw 'Approved temporary parent is absent' }
$runner = @'
const fs = require('fs');
const path = require('path');
const net = require('net');
const { spawn } = require('child_process');
const { randomBytes, randomUUID } = require('crypto');
const frontend = process.argv[2];
const backend = path.resolve(frontend, '../dms-backend');
const parent = 'C:/Users/diego/AppData/Local/Temp/opencode';
const pgBin = 'C:/Program Files/PostgreSQL/18/bin';
const runId = randomUUID();
const root = path.join(parent, 'catalog-role-' + runId);
const data = path.join(root, 'pgdata');
const database = 'catalog_e2e';
const dbUser = 'catalog_' + randomBytes(8).toString('hex');
const dbPassword = randomBytes(32).toString('hex');
const databaseUrl = `postgresql://${dbUser}:${dbPassword}@127.0.0.1:55433/${database}?schema=public`;
const env = {};
for (const key of ['PATH', 'SystemRoot', 'WINDIR', 'COMSPEC', 'PATHEXT', 'TEMP', 'TMP']) {
  if (process.env[key]) env[key] = process.env[key];
}
Object.assign(env, { DATABASE_URL: databaseUrl, PGPASSWORD: dbPassword,
  PGHOST: '127.0.0.1', PGPORT: '55433', PGUSER: dbUser, PGDATABASE: database,
  JWT_SECRET: randomBytes(48).toString('hex'), CATALOG_AUTHORIZATION_ENABLED: 'true',
  NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3101/api', NEXT_TELEMETRY_DISABLED: '1',
  CATALOG_E2E_ROOT: root, CATALOG_E2E_RUN_ID: runId,
  CATALOG_E2E_ADMIN_EMAIL: 'admin-' + runId + '@example.test',
  CATALOG_E2E_PASSWORD: 'Aa1!' + randomBytes(20).toString('hex'),
  TS_NODE_PROJECT: path.join(backend, 'tsconfig.json'), TS_NODE_TRANSPILE_ONLY: 'true' });
const owned = [];
let pgOwned = false;
function safe(text) {
  for (const value of [dbPassword, databaseUrl, env.JWT_SECRET, env.CATALOG_E2E_PASSWORD]) {
    text = text.split(value).join('[REDACTED]');
  }
  return text.replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]');
}
function command(exe, args, input) {
  return new Promise((resolve, reject) => {
    const control = path.basename(exe).toLowerCase() === 'pg_ctl.exe';
    const log = control ? fs.openSync(path.join(root, 'pg-control.log'), 'a') : undefined;
    const child = spawn(exe, args, { cwd: root, env, windowsHide: true,
      stdio: control ? ['ignore', log, log] : ['pipe', 'pipe', 'pipe'] });
    if (log !== undefined) fs.closeSync(log);
    const timer = setTimeout(() => child.kill(), 120000);
    let output = '';
    child.stdout?.on('data', chunk => { output += chunk; });
    child.stderr?.on('data', chunk => { output += chunk; });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on(control ? 'exit' : 'close', code => {
      clearTimeout(timer);
      console.log(safe(output));
      code === 0 ? resolve() : reject(new Error(path.basename(exe) + ' exited ' + code));
    });
    child.stdin?.end(input);
  });
}
async function portFree(port) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', () => reject(new Error('Reserved loopback port occupied: ' + port)));
    server.listen(port, '127.0.0.1', () => server.close(resolve));
  });
}
function assertDatabase() {
  const url = new URL(env.DATABASE_URL);
  if (!pgOwned || url.hostname !== '127.0.0.1' || url.port !== '55433' ||
      url.pathname !== '/' + database || !fs.existsSync(path.join(data, 'postmaster.pid'))) {
    throw new Error('Disposable database ownership check failed');
  }
  const identity = fs.readFileSync(path.join(data, 'postmaster.pid'), 'utf8').split('\n');
  if (path.resolve(identity[1]) !== path.resolve(data) || identity[3] !== '55433' || identity[5] !== '127.0.0.1') {
    throw new Error('Disposable PostgreSQL identity mismatch');
  }
  const pid = Number(identity[0]);
  process.kill(pid, 0);
}
function service(args) {
  const child = spawn(process.execPath, args, { cwd: root, env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  owned.push(child);
  child.on('error', error => console.error(safe(error.message)));
  child.stdout.on('data', chunk => {
    if (String(chunk).includes('Scoped production Auth/User/Role API ready on loopback 3101')) child.catalogReady = true;
    console.log(safe(String(chunk)));
  });
  child.stderr.on('data', chunk => console.log(safe(String(chunk))));
  return child;
}
async function waitFor(url, child) {
  let lastStatus = 'no HTTP response';
  for (let i = 0; i < 180; i++) {
    if (child.exitCode !== null) throw new Error('Owned service exited before readiness');
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      lastStatus = String(response.status);
      if (response.status === 200) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('Owned service readiness timeout; last status=' + lastStatus);
}
async function waitForApi(child) {
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) throw new Error('Owned API exited before fixture readiness');
    if (child.catalogReady) {
      assertDatabase();
      const login = await fetch('http://127.0.0.1:3101/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: env.CATALOG_E2E_ADMIN_EMAIL, password: env.CATALOG_E2E_PASSWORD }),
        signal: AbortSignal.timeout(10000),
      });
      console.log('Owned API readiness login status: ' + login.status);
      if (login.status !== 200) throw new Error('Readiness fixture login failed: HTTP ' + login.status);
      const session = await login.json();
      if (!session.access_token || session.user?.email !== env.CATALOG_E2E_ADMIN_EMAIL ||
          !['users.manage', 'roles.manage'].every(permission => session.permissions?.includes(permission))) {
        throw new Error('Readiness login fixture projection mismatch');
      }
      const settings = await fetch('http://127.0.0.1:3101/api/settings', {
        headers: { Authorization: 'Bearer ' + session.access_token }, signal: AbortSignal.timeout(10000),
      });
      console.log('Owned API readiness authenticated settings status: ' + settings.status);
      if (settings.status !== 200) throw new Error('Readiness settings failed: HTTP ' + settings.status);
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('Owned API fixture-ready indicator timeout');
}
async function main() {
  if (!fs.existsSync(parent)) throw new Error('Approved temporary parent is absent');
  for (const port of [55433, 3101, 3100]) await portFree(port);
  if (!fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')) {
    throw new Error('Previously verified installed Chrome executable is absent');
  }
  fs.mkdirSync(root);
  env.TEMP = root;
  env.TMP = root;
  console.log('Owned runtime directory: ' + root);
  const schema = path.join(backend, 'prisma/schema.prisma');
  for (const dir of [root, path.dirname(schema)]) {
    if (fs.existsSync(path.join(dir, '.env'))) throw new Error('Unexpected dotenv file at migration boundary');
  }
  await command(path.join(pgBin, 'initdb.exe'), ['-D', data, '-U', dbUser,
    '--auth=scram-sha-256', '--encoding=UTF8', '--locale=C']);
  if (fs.existsSync(path.join(data, 'postmaster.pid'))) throw new Error('Unexpected live cluster before offline password setup');
  await command(path.join(pgBin, 'postgres.exe'), ['--single', '-D', data,
    '-c', 'log_statement=none', '-c', 'log_min_error_statement=panic', 'postgres'],
    `ALTER ROLE ${dbUser} PASSWORD '${dbPassword}';\n`);
  pgOwned = true;
  await command(path.join(pgBin, 'pg_ctl.exe'), ['-D', data, '-l', path.join(root, 'postgres.log'),
    '-o', '-h 127.0.0.1 -p 55433', '-t', '30', '-w', 'start']);
  assertDatabase();
  await new Promise((resolve, reject) => {
    const probe = spawn(path.join(pgBin, 'psql.exe'), ['-w', '-h', '127.0.0.1', '-p', '55433',
      '-U', dbUser, '-d', 'postgres', '-c', 'SELECT 1'], {
      cwd: root, env: { ...env, PGPASSWORD: randomBytes(32).toString('hex') },
      windowsHide: true, stdio: 'ignore',
    });
    const timer = setTimeout(() => { probe.kill(); reject(new Error('Authentication probe timeout')); }, 10000);
    probe.once('error', error => { clearTimeout(timer); reject(error); });
    probe.once('exit', code => { clearTimeout(timer); code === 2 ? resolve() : reject(new Error('Password authentication probe failed')); });
  });
  console.log('Incorrect disposable password rejected before migrations');
  console.log('SCRAM initialized and password set offline before opening the loopback listener; no trust bootstrap');
  await command(path.join(pgBin, 'createdb.exe'), ['-h', '127.0.0.1', '-p', '55433', '-U', dbUser, database]);
  assertDatabase();
  console.log('Migration command: installed Prisma migrate deploy --schema ' + schema);
  await command(process.execPath, [path.join(backend, 'node_modules/prisma/build/index.js'),
    'migrate', 'deploy', '--schema', schema]);
  assertDatabase();
  const api = service(['-e', `
    const fs=require('fs'), path=require('path');
    const read=fs.readFileSync.bind(fs);
    fs.readFileSync=function(p,...args) {
      if(path.basename(String(p)).startsWith('.env')) throw Object.assign(new Error('Environment file access disabled'),{code:'ENOENT'});
      return read(p,...args);
    };
    require(${JSON.stringify(path.join(backend, 'node_modules/ts-node/register'))});
    require(${JSON.stringify(path.join(backend, 'test/catalog-role-e2e-server.ts'))});
  `]);
  await waitForApi(api);
  fs.writeFileSync(path.join(root, 'tsconfig.json'), JSON.stringify({
    extends: path.join(frontend, 'tsconfig.json'),
    compilerOptions: { baseUrl: frontend, incremental: false },
    include: [path.join(frontend, 'next-env.d.ts'), path.join(frontend, '**/*.ts'), path.join(frontend, '**/*.tsx')],
    exclude: [path.join(frontend, 'node_modules')],
  }));
  const web = service(['-e', `
    const fs = require('fs'), path = require('path');
    const root = process.env.CATALOG_E2E_ROOT;
    const inside = p => path.resolve(String(p)).startsWith(root + path.sep);
    const dotenv = p => path.basename(String(p)).startsWith('.env');
    const absent = () => Object.assign(new Error('Environment file access disabled'), {code:'ENOENT'});
    const read = fs.readFileSync.bind(fs);
    fs.readFileSync = function(p, ...args) { if(dotenv(p)) throw absent(); return read(p,...args); };
    const promiseRead = fs.promises.readFile.bind(fs.promises);
    fs.promises.readFile = async function(p,...args) { if(dotenv(p)) throw absent(); return promiseRead(p,...args); };
    const callbackRead = fs.readFile.bind(fs);
    fs.readFile = function(p,...args) { if(dotenv(p)) return args.at(-1)(absent()); return callbackRead(p,...args); };
    for (const method of ['writeFileSync','appendFileSync','mkdirSync','renameSync','unlinkSync','rmSync']) {
      const original = fs[method].bind(fs);
      fs[method] = function(p,...args) {
        if (!inside(p)) {
          if (method==='writeFileSync' && fs.existsSync(p) && Buffer.from(read(p)).equals(Buffer.from(args[0]))) return;
          throw new Error('Out-of-scope frontend write blocked: ' + p);
        }
        if(method==='renameSync' && !inside(args[0])) throw new Error('Out-of-scope rename blocked');
        return original(p,...args);
      };
    }
    for (const method of ['writeFile','appendFile','mkdir','rename','unlink','rm']) {
      const original = fs.promises[method].bind(fs.promises);
      fs.promises[method] = async function(p,...args) {
        if(!inside(p)) {
          if(method==='writeFile' && fs.existsSync(p) && Buffer.from(read(p)).equals(Buffer.from(args[0]))) return;
          throw new Error('Out-of-scope frontend write blocked: ' + p);
        }
        if(method==='rename' && !inside(args[0])) throw new Error('Out-of-scope rename blocked');
        return original(p,...args);
      };
      const callback = fs[method].bind(fs);
      fs[method] = function(p,...args) {
        if(!inside(p) || (method==='rename' && !inside(args[0]))) return args.at(-1)(new Error('Out-of-scope frontend write blocked: ' + p));
        return callback(p,...args);
      };
    }
    const stream=fs.createWriteStream.bind(fs);
    fs.createWriteStream=function(p,...args) { if(!inside(p)) throw new Error('Out-of-scope write stream blocked'); return stream(p,...args); };
    for (const protocol of ['http','https']) {
      const transport=require(protocol);
      for (const method of ['request','get']) {
        const original=transport[method].bind(transport);
        transport[method]=function(target,...args) {
          const host=typeof target==='string' ? new URL(target).hostname : target.hostname || target.host;
          if(!['127.0.0.1','localhost','::1'].includes(host)) throw new Error('Non-loopback frontend request blocked');
          return original(target,...args);
        };
      }
    }
    const nativeFetch=global.fetch;
    global.fetch=function(target,...args) {
      const url=new URL(typeof target==='string' ? target : target.url || target.href);
      if(!['127.0.0.1','localhost','::1'].includes(url.hostname)) throw new Error('Non-loopback frontend fetch blocked');
      return nativeFetch(target,...args);
    };
    const next = require(${JSON.stringify(path.join(frontend, 'node_modules/next'))});
    const app = next({ dev:true, customServer:false, dir:${JSON.stringify(frontend)}, hostname:'127.0.0.1', port:3100,
      conf:{distDir:path.relative(${JSON.stringify(frontend)},path.join(root,'next')),
        typescript:{tsconfigPath:path.relative(${JSON.stringify(frontend)},path.join(root,'tsconfig.json'))},
        experimental:{typedRoutes:false}} });
    app.prepare().then(() => {
      const server=require('http').createServer(app.getRequestHandler());
      server.listen(3100,'127.0.0.1');
      process.stdin.on('data',async()=>{await app.close();server.close(()=>process.exit(0));});
    }).catch(e=>{console.error(e.message);process.exit(1);});
  `]);
  await waitFor('http://127.0.0.1:3100/auth/login', web);
  assertDatabase();
  console.log('Playwright command: node_modules/.bin/playwright.cmd test --config playwright.catalog.config.ts --project chromium --workers 1');
  await command(env.COMSPEC || 'cmd.exe', ['/d', '/s', '/c',
    '"' + path.join(frontend, 'node_modules/.bin/playwright.cmd') + '" test --config "' +
    path.join(frontend, 'playwright.catalog.config.ts') + '" --project chromium --workers 1']);
}
main().catch(error => { console.error(safe(error.message)); process.exitCode = 1; }).finally(async () => {
  for (const child of owned.reverse()) {
    if (child.exitCode !== null) continue;
    child.stdin.write('stop\n');
    await Promise.race([new Promise(resolve => child.once('close', resolve)),
      new Promise(resolve => setTimeout(resolve, 10000))]);
    if (child.exitCode === null) { child.kill(); await new Promise(resolve => child.once('close', resolve)); }
  }
  if (pgOwned && fs.existsSync(path.join(data, 'postmaster.pid'))) {
    try { assertDatabase(); await command(path.join(pgBin, 'pg_ctl.exe'), ['-D', data, '-m', 'fast', '-t', '30', '-w', 'stop']); }
    catch (error) { console.error(safe(error.message)); process.exitCode = 1; }
  }
  for (const port of [55433, 3101, 3100]) {
    try { await portFree(port); console.log('Loopback port closed: ' + port); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
  }
  console.log('Stopped disposable data retained: ' + data + '; present=' + fs.existsSync(data));
});
'@
$runner | & node - $frontend
exit $LASTEXITCODE
