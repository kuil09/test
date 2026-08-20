import { FILTERS, TodoStore } from './todo-store.mjs';

const STORAGE_KEY = 'simple-todo-webapp:v1';

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTodos(todos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

const store = new TodoStore({ todos: loadTodos(), persist: saveTodos });
let activeFilter = FILTERS.ALL;

const form = document.querySelector('[data-todo-form]');
const input = document.querySelector('[data-todo-input]');
const list = document.querySelector('[data-todo-list]');
const emptyState = document.querySelector('[data-empty-state]');
const remaining = document.querySelector('[data-remaining]');
const clearButton = document.querySelector('[data-clear-completed]');
const filterButtons = [...document.querySelectorAll('[data-filter]')];

function render() {
  const todos = store.visible(activeFilter);
  list.replaceChildren(...todos.map(renderTodo));

  emptyState.hidden = todos.length > 0;
  remaining.textContent = `${store.remainingCount}개 남음`;
  clearButton.hidden = store.completedCount === 0;

  for (const button of filterButtons) {
    const selected = button.dataset.filter === activeFilter;
    button.setAttribute('aria-pressed', String(selected));
  }
}

function renderTodo(todo) {
  const item = document.createElement('li');
  item.className = 'todo-item';
  item.dataset.completed = String(todo.completed);

  const label = document.createElement('label');
  label.className = 'todo-check';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = todo.completed;
  checkbox.setAttribute('aria-label', `${todo.text} 완료 여부`);
  checkbox.addEventListener('change', () => {
    store.toggle(todo.id);
    render();
  });

  const mark = document.createElement('span');
  mark.className = 'checkmark';
  mark.setAttribute('aria-hidden', 'true');

  label.append(checkbox, mark);

  const text = document.createElement('span');
  text.className = 'todo-text';
  text.textContent = todo.text;

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'delete-button';
  remove.setAttribute('aria-label', `${todo.text} 삭제`);
  remove.textContent = '삭제';
  remove.addEventListener('click', () => {
    store.remove(todo.id);
    render();
  });

  item.append(label, text, remove);
  return item;
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const created = store.add(input.value);
  if (!created) {
    input.focus();
    return;
  }

  input.value = '';
  activeFilter = FILTERS.ALL;
  render();
  input.focus();
});

for (const button of filterButtons) {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    render();
  });
}

clearButton.addEventListener('click', () => {
  store.clearCompleted();
  render();
});

render();
