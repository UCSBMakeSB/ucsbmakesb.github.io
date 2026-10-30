import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { loadBindings, transform } from 'next/dist/build/swc/index.js';

await loadBindings();
async function compile(path) {
  const { code } = await transform(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    filename: path,
    jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } },
    module: { type: 'commonjs' },
  });
  return code;
}
const routeCode = await compile('../app/api/settings/route.js');
const componentCode = await compile('../components/portal/settings.jsx');

function route({ invalidCurrent = false } = {}) {
  let updates = 0;
  const limiter = { limit: async () => ({ success: true }) };
  const modules = {
    '@supabase/supabase-js': { createClient: () => ({ auth: { signInWithPassword: async () => ({ error: invalidCurrent ? {} : null }) } }) },
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    '../../../lib/rate-limit': { getClientIp: () => 'test', getRateLimiters: () => new Proxy({}, { get: () => limiter }) },
    '../../../lib/supabase-server': {
      getSupabaseServer: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'test', email: 'test@example.com' } } }) } }),
      getSupabaseAdmin: () => ({ auth: { admin: { updateUserById: async () => { updates++; return { error: null }; } } } }),
    },
    '../../../lib/portal-data': { revalidatePortalAccount() {} },
  };
  const exports = {};
  const process = { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://example.com', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-only' } };
  new Function('require', 'exports', 'process', routeCode)((name) => modules[name], exports, process);
  return { patch: exports.PATCH, updates: () => updates };
}
const currentPassword = 'CurrentPass123!';
function request(newPassword) {
  return new Request('https://example.com/api/settings', { method: 'PATCH', body: JSON.stringify({ section: 'password', currentPassword, newPassword, confirmPassword: newPassword }) });
}

test('settings API rejects reusing the current password without updating the account', async () => {
  const api = route();
  const response = await api.patch(request(currentPassword));
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /different from your current password/);
  assert.equal(api.updates(), 0);
});

test('settings API permits a different valid password', async () => {
  const api = route();
  assert.equal((await api.patch(request('DifferentPass123!'))).status, 200);
  assert.equal(api.updates(), 1);
});

test('settings API still rejects an incorrect current password', async () => {
  const api = route({ invalidCurrent: true });
  assert.equal((await api.patch(request('DifferentPass123!'))).status, 401);
  assert.equal(api.updates(), 0);
});

function descendants(node) {
  if (!node || typeof node !== 'object') return [];
  const children = [node.props?.children].flat(Infinity);
  return [node, ...children.flatMap(descendants)];
}

test('both new-password fields have independent accessible visibility toggles that do not submit', () => {
  let visible = false;
  const jsx = (type, props) => ({ type, props });
  const modules = {
    react: { useId: () => 'password-test', useState: (initial) => [typeof initial === 'boolean' ? visible : initial, (update) => { visible = update(visible); }] },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    './account': { usePortalAccount: () => ({ account: { email: 'test@example.com' } }) },
  };
  const exports = {};
  new Function('require', 'exports', componentCode)((name) => modules[name], exports);
  const fields = descendants(exports.AccountSettings()).filter((node) => typeof node.type === 'function' && ['newPassword', 'confirmPassword'].includes(node.props.name));
  assert.equal(fields.length, 2);
  for (const field of fields) {
    visible = false;
    let nodes = descendants(field.type(field.props));
    assert.equal(nodes.find((n) => n.type === 'input').props.type, 'password');
    const button = nodes.find((n) => n.type === 'button');
    assert.equal(button.props.type, 'button');
    assert.match(button.props['aria-label'], /^Show /);
    button.props.onClick();
    nodes = descendants(field.type(field.props));
    assert.equal(nodes.find((n) => n.type === 'input').props.type, 'text');
    assert.match(nodes.find((n) => n.type === 'button').props['aria-label'], /^Hide /);
    nodes.find((n) => n.type === 'button').props.onClick();
    assert.equal(descendants(field.type(field.props)).find((n) => n.type === 'input').props.type, 'password');
  }
});
