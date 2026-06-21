import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { methods } from '../src/methods.js';

describe('JSON-RPC request validation', () => {
  it('rejects unknown method', () => {
    const def = methods.find((m) => m.name === 'nonexistent');
    assert.equal(def, undefined);
  });

  it('rejects missing required parameter via Zod', () => {
    const def = methods.find((m) => m.name === 'channels.get')!;
    const schema = z.object(Object.fromEntries(def.params.map((p) => [p.name, p.zod])));
    const result = schema.safeParse({});
    assert.equal(result.success, false);
    if (!result.success) {
      assert.ok(result.error.issues.some((i) => i.path.includes('id')));
    }
  });

  it('rejects wrong parameter type via Zod', () => {
    const def = methods.find((m) => m.name === 'channels.get')!;
    const schema = z.object(Object.fromEntries(def.params.map((p) => [p.name, p.zod])));
    const result = schema.safeParse({ id: 123 });
    assert.equal(result.success, false);
    if (!result.success) {
      assert.ok(result.error.issues.some((i) => i.path.includes('id')));
    }
  });

  it('rejects wrong type for optional parameter via Zod', () => {
    const def = methods.find((m) => m.name === 'channels.list')!;
    const schema = z.object(Object.fromEntries(def.params.map((p) => [p.name, p.zod])));
    const result = schema.safeParse({ limit: 'abc' });
    assert.equal(result.success, false);
    if (!result.success) {
      assert.ok(result.error.issues.some((i) => i.path.includes('limit')));
    }
  });

  it('accepts valid optional params omitted', () => {
    const def = methods.find((m) => m.name === 'channels.list')!;
    const schema = z.object(Object.fromEntries(def.params.map((p) => [p.name, p.zod])));
    const result = schema.safeParse({});
    assert.equal(result.success, true);
  });

  it('accepts valid required params present', () => {
    const def = methods.find((m) => m.name === 'channels.get')!;
    const schema = z.object(Object.fromEntries(def.params.map((p) => [p.name, p.zod])));
    const result = schema.safeParse({ id: '123' });
    assert.equal(result.success, true);
  });

  it('validates channels.getMessages with mixed params', () => {
    const def = methods.find((m) => m.name === 'channels.getMessages')!;
    const schema = z.object(Object.fromEntries(def.params.map((p) => [p.name, p.zod])));
    // Valid: required + optional
    assert.equal(schema.safeParse({ channelId: '123', limit: 10 }).success, true);
    // Invalid: wrong type for channelId
    assert.equal(schema.safeParse({ channelId: 123 }).success, false);
    // Invalid: wrong type for limit
    assert.equal(schema.safeParse({ channelId: '123', limit: 'abc' }).success, false);
  });
});