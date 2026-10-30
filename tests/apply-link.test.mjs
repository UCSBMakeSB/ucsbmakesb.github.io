import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { loadBindings, transform } from 'next/dist/build/swc/index.js';

await loadBindings();
const source = readFileSync(new URL('../components/apply-link.jsx', import.meta.url), 'utf8');
const { code } = await transform(source, {
  filename: 'apply-link.jsx',
  jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } },
  module: { type: 'commonjs' },
});

function setup({ session = null, authError = false, clipboardError = false } = {}) {
  const result = { navigated: null, copied: null, message: '', opened: false };
  const dialog = { open: false, showModal() { this.open = true; result.opened = true; } };
  const jsx = (type, props) => ({ type, props });
  const modules = {
    react: { useId: () => 'test-title', useRef: () => ({ current: dialog }), useState: () => ['', (value) => { result.message = value; }] },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    '../lib/supabase-browser': { getSupabaseBrowser: () => ({ auth: { getSession: async () => {
      if (authError) throw new Error('unavailable');
      return { data: { session }, error: null };
    } } }) },
  };
  const exports = {};
  const window = { location: { assign: (url) => { result.navigated = url; } } };
  const navigator = { clipboard: { writeText: async (text) => {
    if (clipboardError) throw new Error('denied');
    result.copied = text;
  } } };
  new Function('require', 'exports', 'window', 'navigator', code)((name) => modules[name], exports, window, navigator);
  const tree = exports.ApplyLink({ children: 'Apply', className: 'test' });
  return { result, link: tree.props.children[0] };
}

test('anonymous Apply navigates to /apply in the current tab', async () => {
  const { link, result } = setup();
  assert.equal(link.props.href, '/apply');
  await link.props.onClick({ preventDefault() {} });
  assert.equal(result.navigated, '/apply');
  assert.equal(result.opened, false);
});

test('signed-in Apply opens the popup and copies the share link without navigating', async () => {
  const { link, result } = setup({ session: { user: { id: 'test' } } });
  await link.props.onClick({ preventDefault() {} });
  assert.equal(result.navigated, null);
  assert.equal(result.opened, true);
  assert.equal(result.copied, 'makesb.org/apply');
  assert.match(result.message, /Copied.*Share/);
});

test('clipboard denial gives a manual copy link without claiming success', async () => {
  const { link, result } = setup({ session: {}, clipboardError: true });
  await link.props.onClick({ preventDefault() {} });
  assert.equal(result.opened, true);
  assert.equal(result.navigated, null);
  assert.match(result.message, /couldn’t copy.*makesb.org\/apply/);
});

test('unavailable auth still lets the user reach /apply', async () => {
  const { link, result } = setup({ authError: true });
  await link.props.onClick({ preventDefault() {} });
  assert.equal(result.navigated, '/apply');
});
