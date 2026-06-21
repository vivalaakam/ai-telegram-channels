import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { methods } from '../src/methods.js';

describe('methods', () => {
  it('defines all expected method names', () => {
    const names = methods.map((m) => m.name);
    assert.ok(names.includes('channels.list'));
    assert.ok(names.includes('channels.get'));
    assert.ok(names.includes('channels.getMessages'));
  });

  it('every method has a handler and description', () => {
    for (const m of methods) {
      assert.ok(typeof m.name === 'string' && m.name.length > 0, `method has a name`);
      assert.ok(typeof m.description === 'string' && m.description.length > 0, `${m.name} has a description`);
      assert.ok(typeof m.handler === 'function', `${m.name} has a handler`);
    }
  });

  it('required params are marked required', () => {
    const getMethod = methods.find((m) => m.name === 'channels.get')!;
    const idParam = getMethod.params.find((p) => p.name === 'id')!;
    assert.equal(idParam.required, true);

    const listMethod = methods.find((m) => m.name === 'channels.list')!;
    const limitParam = listMethod.params.find((p) => p.name === 'limit')!;
    assert.equal(limitParam.required, false);
  });

  it('every param has zod and jsonSchema', () => {
    for (const m of methods) {
      for (const p of m.params) {
        assert.ok(p.zod, `${m.name}.${p.name} has zod schema`);
        assert.ok(p.jsonSchema, `${m.name}.${p.name} has jsonSchema`);
        assert.ok(typeof p.jsonSchema.type === 'string', `${m.name}.${p.name} jsonSchema has type`);
      }
    }
  });
});