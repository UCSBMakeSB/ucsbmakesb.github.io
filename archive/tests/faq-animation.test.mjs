import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

test('repeated FAQ opens restart the smile and cancel a running fish animation', () => {
  const classes = new Set();
  const timers = new Map();
  let id = 0;
  let intersect;
  let toggle;
  let cancellations = 0;
  const part = { animate: () => ({ cancel() { cancellations++; } }) };
  const mascot = {
    querySelector: () => part,
    classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c) },
  };
  const question = { open: true, addEventListener(event, fn) { toggle = fn; } };
  runInNewContext(readFileSync(new URL('../faq-animation.js', import.meta.url), 'utf8'), {
    document: { hidden: false, querySelector: () => mascot, querySelectorAll: () => [question], addEventListener() {} },
    window: { matchMedia: () => ({ matches: false, addEventListener() {} }) },
    IntersectionObserver: class { constructor(fn) { intersect = fn; } observe() {} },
    setTimeout(fn, delay) { timers.set(++id, { fn, delay }); return id; },
    clearTimeout(key) { timers.delete(key); },
  });
  intersect([{ isIntersecting: true }]);
  const start = [...timers.values()][0].fn;
  timers.clear();
  start();
  toggle();
  assert.equal(cancellations, 3);
  const oldSmileTimer = [...timers.keys()][0];
  toggle();
  assert.equal(timers.has(oldSmileTimer), false);
  assert.equal(timers.size, 1);
  assert.equal(classes.has('smiling'), true);
  const finish = [...timers.values()][0];
  assert.equal(finish.delay, 1600);
  timers.clear();
  finish.fn();
  assert.equal(classes.has('smiling'), false);
  assert.equal([...timers.values()][0].delay, 12000);
});
