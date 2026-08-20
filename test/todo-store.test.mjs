import assert from 'node:assert/strict';
import test from 'node:test';
import { FILTERS, TodoStore } from '../src/todo-store.mjs';

function createStore(todos = []) {
  const snapshots = [];
  let nextId = 1;
  const store = new TodoStore({
    todos,
    idFactory: () => `todo-${nextId++}`,
    persist: (nextTodos) => snapshots.push(nextTodos),
  });

  return { store, snapshots };
}

test('add trims and normalizes task text', () => {
  const { store, snapshots } = createStore();
  const todo = store.add('  write   tests  ');

  assert.deepEqual(todo, { id: 'todo-1', text: 'write tests', completed: false });
  assert.equal(store.remainingCount, 1);
  assert.equal(snapshots.length, 1);
});

test('add ignores empty tasks without persisting', () => {
  const { store, snapshots } = createStore();

  assert.equal(store.add('   '), null);
  assert.deepEqual(store.todos, []);
  assert.equal(snapshots.length, 0);
});

test('toggle changes completion state and counts', () => {
  const { store } = createStore([{ id: '1', text: 'Ship', completed: false }]);

  assert.equal(store.toggle('1'), true);
  assert.equal(store.todos[0].completed, true);
  assert.equal(store.remainingCount, 0);
  assert.equal(store.completedCount, 1);
  assert.equal(store.toggle('missing'), false);
});

test('remove deletes only the matching task', () => {
  const { store } = createStore([
    { id: '1', text: 'One', completed: false },
    { id: '2', text: 'Two', completed: true },
  ]);

  assert.equal(store.remove('1'), true);
  assert.deepEqual(store.todos.map((todo) => todo.id), ['2']);
  assert.equal(store.remove('missing'), false);
});

test('clearCompleted removes completed tasks and returns the removed count', () => {
  const { store } = createStore([
    { id: '1', text: 'One', completed: false },
    { id: '2', text: 'Two', completed: true },
    { id: '3', text: 'Three', completed: true },
  ]);

  assert.equal(store.clearCompleted(), 2);
  assert.deepEqual(store.todos.map((todo) => todo.id), ['1']);
  assert.equal(store.clearCompleted(), 0);
});

test('visible filters tasks by active state', () => {
  const { store } = createStore([
    { id: '1', text: 'One', completed: false },
    { id: '2', text: 'Two', completed: true },
  ]);

  assert.deepEqual(store.visible(FILTERS.ALL).map((todo) => todo.id), ['1', '2']);
  assert.deepEqual(store.visible(FILTERS.ACTIVE).map((todo) => todo.id), ['1']);
  assert.deepEqual(store.visible(FILTERS.COMPLETED).map((todo) => todo.id), ['2']);
});

test('constructor discards invalid persisted records', () => {
  const { store } = createStore([
    null,
    { id: '', text: 'bad id', completed: false },
    { id: '2', text: '   ', completed: false },
    { id: 3, text: '  valid  item ', completed: 1 },
  ]);

  assert.deepEqual(store.todos, [{ id: '3', text: 'valid item', completed: true }]);
});
