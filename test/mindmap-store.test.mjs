import assert from 'node:assert/strict';
import test from 'node:test';
import { MindMapStore, ROOT_ID, layoutNodes, outlineFromState, parseOutline } from '../src/mindmap-store.mjs';

function ids() {
  let index = 0;
  return () => `n${++index}`;
}

test('creates a usable default root node', () => {
  const store = new MindMapStore({ idFactory: ids() });
  assert.equal(store.state.nodes.length, 1);
  assert.equal(store.state.nodes[0].id, ROOT_ID);
});

test('adds and edits a child node', () => {
  const store = new MindMapStore({ idFactory: ids() });
  const child = store.addNode({ parentId: ROOT_ID, text: '  First idea  ' });
  assert.equal(child.text, 'First idea');
  assert.equal(child.parentId, ROOT_ID);
  assert.equal(store.updateNode(child.id, 'Renamed').text, 'Renamed');
});

test('deleting a node removes its descendant branch', () => {
  const store = new MindMapStore({ idFactory: ids() });
  const a = store.addNode({ parentId: ROOT_ID, text: 'A' });
  const b = store.addNode({ parentId: a.id, text: 'B' });
  store.addNode({ parentId: b.id, text: 'C' });
  const removed = store.deleteNode(a.id);
  assert.equal(removed.length, 3);
  assert.deepEqual(store.state.nodes.map((node) => node.id), [ROOT_ID]);
});

test('reparenting prevents cycles and moving the root', () => {
  const store = new MindMapStore({ idFactory: ids() });
  const a = store.addNode({ parentId: ROOT_ID, text: 'A' });
  const b = store.addNode({ parentId: a.id, text: 'B' });
  assert.throws(() => store.reparentNode(a.id, b.id), /descendants/);
  assert.throws(() => store.reparentNode(ROOT_ID, a.id), /root node/);
});

test('parses an indented markdown outline into hierarchy', () => {
  const nodes = parseOutline('Root\n- A\n  - A1\n- B', ids());
  const a = nodes.find((node) => node.text === 'A');
  const a1 = nodes.find((node) => node.text === 'A1');
  const b = nodes.find((node) => node.text === 'B');
  assert.equal(a.parentId, ROOT_ID);
  assert.equal(a1.parentId, a.id);
  assert.equal(b.parentId, ROOT_ID);
});

test('layout gives descendants increasing x positions', () => {
  const laidOut = layoutNodes([
    { id: ROOT_ID, parentId: null, text: 'Root', x: 99, y: 99 },
    { id: 'a', parentId: ROOT_ID, text: 'A', x: 0, y: 0 },
    { id: 'b', parentId: 'a', text: 'B', x: 0, y: 0 },
  ]);
  const byId = new Map(laidOut.map((node) => [node.id, node]));
  assert.ok(byId.get('a').x > byId.get(ROOT_ID).x);
  assert.ok(byId.get('b').x > byId.get('a').x);
});

test('outline serialization preserves readable hierarchy', () => {
  const store = new MindMapStore({ idFactory: ids() });
  const a = store.addNode({ parentId: ROOT_ID, text: 'A' });
  store.addNode({ parentId: a.id, text: 'A1' });
  assert.equal(outlineFromState(store.state), 'Main idea\n- A\n  - A1');
});

test('mutations persist the resulting state', () => {
  const saved = [];
  const store = new MindMapStore({ persist: (state) => saved.push(state), idFactory: ids() });
  store.addNode({ parentId: ROOT_ID, text: 'A' });
  store.setTitle('Map');
  assert.equal(saved.length, 2);
  assert.equal(saved.at(-1).title, 'Map');
});
