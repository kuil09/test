import assert from 'node:assert/strict';
import test from 'node:test';
import { MindMapStore, ROOT_ID } from '../src/mindmap-store.mjs';
import { createWebMcpTools, registerWebMcp } from '../src/webmcp.mjs';

function makeStore() {
  let index = 0;
  return new MindMapStore({ idFactory: () => `id-${++index}` });
}

test('exposes a small non-overlapping WebMCP tool surface', () => {
  const tools = createWebMcpTools({ store: makeStore() });
  assert.deepEqual(tools.map((tool) => tool.name), [
    'get_map',
    'create_map',
    'add_node',
    'update_node',
    'reparent_node',
    'delete_node',
    'focus_node',
  ]);
  assert.equal(tools[0].annotations.readOnlyHint, true);
  assert.equal(tools[1].annotations.readOnlyHint, false);
});

test('create_map tool replaces state from an outline', async () => {
  const store = makeStore();
  const tool = createWebMcpTools({ store }).find((item) => item.name === 'create_map');
  const result = await tool.execute({ outline: 'Topic\n- One\n- Two', title: 'Agent map' });
  assert.match(result, /3 nodes/);
  assert.equal(store.state.title, 'Agent map');
  assert.equal(store.state.nodes.length, 3);
});

test('add_node tool returns an addressable node id', async () => {
  const store = makeStore();
  const tool = createWebMcpTools({ store }).find((item) => item.name === 'add_node');
  const result = await tool.execute({ parent_id: ROOT_ID, text: 'Agent idea' });
  assert.match(result, /id-1/);
  assert.equal(store.state.nodes.at(-1).text, 'Agent idea');
});

test('registerWebMcp degrades cleanly when the API is unavailable', async () => {
  const registration = await registerWebMcp({ modelContext: null, store: makeStore() });
  assert.equal(registration.supported, false);
  assert.deepEqual(registration.names, []);
});

test('registerWebMcp registers every tool with an AbortSignal', async () => {
  const calls = [];
  const modelContext = {
    async registerTool(tool, options) {
      calls.push({ tool, options });
    },
  };
  const registration = await registerWebMcp({ modelContext, store: makeStore() });
  assert.equal(registration.supported, true);
  assert.equal(calls.length, 7);
  assert.ok(calls.every(({ options }) => options.signal instanceof AbortSignal));
  registration.dispose();
  assert.ok(calls.every(({ options }) => options.signal.aborted));
});
