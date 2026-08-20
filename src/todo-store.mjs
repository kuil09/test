export const FILTERS = Object.freeze({
  ALL: 'all',
  ACTIVE: 'active',
  COMPLETED: 'completed',
});

function sanitizeText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export class TodoStore {
  #todos;
  #persist;
  #idFactory;

  constructor({ todos = [], persist = () => {}, idFactory = createId } = {}) {
    this.#persist = persist;
    this.#idFactory = idFactory;
    this.#todos = todos
      .filter((todo) => todo && typeof todo === 'object')
      .map((todo) => ({
        id: String(todo.id),
        text: sanitizeText(todo.text),
        completed: Boolean(todo.completed),
      }))
      .filter((todo) => todo.id && todo.text);
  }

  get todos() {
    return this.#todos.map((todo) => ({ ...todo }));
  }

  get remainingCount() {
    return this.#todos.filter((todo) => !todo.completed).length;
  }

  get completedCount() {
    return this.#todos.filter((todo) => todo.completed).length;
  }

  add(text) {
    const cleanText = sanitizeText(text);
    if (!cleanText) {
      return null;
    }

    const todo = {
      id: String(this.#idFactory()),
      text: cleanText,
      completed: false,
    };

    this.#todos = [...this.#todos, todo];
    this.#commit();
    return { ...todo };
  }

  toggle(id) {
    let changed = false;
    this.#todos = this.#todos.map((todo) => {
      if (todo.id !== id) {
        return todo;
      }

      changed = true;
      return { ...todo, completed: !todo.completed };
    });

    if (changed) {
      this.#commit();
    }

    return changed;
  }

  remove(id) {
    const nextTodos = this.#todos.filter((todo) => todo.id !== id);
    if (nextTodos.length === this.#todos.length) {
      return false;
    }

    this.#todos = nextTodos;
    this.#commit();
    return true;
  }

  clearCompleted() {
    const nextTodos = this.#todos.filter((todo) => !todo.completed);
    const removedCount = this.#todos.length - nextTodos.length;
    if (removedCount === 0) {
      return 0;
    }

    this.#todos = nextTodos;
    this.#commit();
    return removedCount;
  }

  visible(filter = FILTERS.ALL) {
    if (filter === FILTERS.ACTIVE) {
      return this.todos.filter((todo) => !todo.completed);
    }

    if (filter === FILTERS.COMPLETED) {
      return this.todos.filter((todo) => todo.completed);
    }

    return this.todos;
  }

  #commit() {
    this.#persist(this.todos);
  }
}
