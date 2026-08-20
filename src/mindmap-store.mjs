export const ROOT_ID = 'root';
export const DEFAULT_TITLE = 'Untitled map';
const HORIZONTAL_GAP = 260;
const VERTICAL_GAP = 112;

function cleanText(value, fallback = 'New idea') {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ');
  return text || fallback;
}

function clone(value) {
  return structuredClone(value);
}

function makeDefaultState() {
  return {
    title: DEFAULT_TITLE,
    nodes: [
      {
        id: ROOT_ID,
        parentId: null,
        text: 'Main idea',
        x: 0,
        y: 0,
      },
    ],
  };
}

function normalizeState(input) {
  if (!input || !Array.isArray(input.nodes) || input.nodes.length === 0) {
    return makeDefaultState();
  }

  const seen = new Set();
  const nodes = input.nodes.map((node, index) => {
    const id = index === 0 ? ROOT_ID : cleanText(node.id, `node-${index}`);
    if (seen.has(id)) throw new Error(`Duplicate node id: ${id}`);
    seen.add(id);
    return {
      id,
      parentId: index === 0 ? null : node.parentId ?? ROOT_ID,
      text: cleanText(node.text, index === 0 ? 'Main idea' : 'New idea'),
      x: Number.isFinite(node.x) ? node.x : index * HORIZONTAL_GAP,
      y: Number.isFinite(node.y) ? node.y : 0,
    };
  });

  const ids = new Set(nodes.map((node) => node.id));
  for (const node of nodes.slice(1)) {
    if (!ids.has(node.parentId)) node.parentId = ROOT_ID;
  }

  return {
    title: cleanText(input.title, DEFAULT_TITLE),
    nodes,
  };
}

function childMap(nodes) {
  const children = new Map(nodes.map((node) => [node.id, []]));
  for (const node of nodes) {
    if (node.parentId && children.has(node.parentId)) {
      children.get(node.parentId).push(node);
    }
  }
  return children;
}

export function layoutNodes(nodes) {
  const next = clone(nodes);
  const byId = new Map(next.map((node) => [node.id, node]));
  const children = childMap(next);
  let leaf = 0;

  function visit(id, depth) {
    const node = byId.get(id);
    const branch = children.get(id) ?? [];
    node.x = depth * HORIZONTAL_GAP;

    if (branch.length === 0) {
      node.y = leaf * VERTICAL_GAP;
      leaf += 1;
      return node.y;
    }

    const ys = branch.map((child) => visit(child.id, depth + 1));
    node.y = (ys[0] + ys.at(-1)) / 2;
    return node.y;
  }

  visit(ROOT_ID, 0);
  const rootY = byId.get(ROOT_ID)?.y ?? 0;
  for (const node of next) node.y -= rootY;
  return next;
}

function stripOutlineMarker(line) {
  return line.replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)?/, '').trim();
}

export function parseOutline(outline, idFactory = () => crypto.randomUUID()) {
  const lines = String(outline ?? '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) throw new Error('Outline must contain at least one line.');

  const firstText = stripOutlineMarker(lines[0]);
  const nodes = [{ id: ROOT_ID, parentId: null, text: cleanText(firstText, 'Main idea'), x: 0, y: 0 }];
  const stack = [{ depth: 0, id: ROOT_ID }];

  for (const line of lines.slice(1)) {
    const leading = line.match(/^\s*/)?.[0] ?? '';
    const spaces = leading.replace(/\t/g, '  ').length;
    const hasMarker = /^\s*(?:[-*+]\s+|\d+[.)]\s+)/.test(line);
    const depth = Math.max(1, Math.floor(spaces / 2) + (hasMarker ? 1 : 1));
    const text = cleanText(stripOutlineMarker(line));

    while (stack.length > 0 && stack.at(-1).depth >= depth) stack.pop();
    const parentId = stack.at(-1)?.id ?? ROOT_ID;
    const id = idFactory();
    nodes.push({ id, parentId, text, x: 0, y: 0 });
    stack.push({ depth, id });
  }

  return layoutNodes(nodes);
}

export function outlineFromState(state) {
  const children = childMap(state.nodes);
  const byId = new Map(state.nodes.map((node) => [node.id, node]));
  const lines = [];

  function visit(id, depth) {
    const node = byId.get(id);
    if (!node) return;
    lines.push(`${depth === 0 ? '' : `${'  '.repeat(depth - 1)}- `}${node.text}`);
    for (const child of children.get(id) ?? []) visit(child.id, depth + 1);
  }

  visit(ROOT_ID, 0);
  return lines.join('\n');
}

export class MindMapStore {
  #state;
  #persist;
  #idFactory;

  constructor({ state, persist = () => {}, idFactory = () => crypto.randomUUID() } = {}) {
    this.#state = normalizeState(state);
    this.#persist = persist;
    this.#idFactory = idFactory;
  }

  get state() {
    return clone(this.#state);
  }

  getNode(id) {
    const node = this.#state.nodes.find((item) => item.id === id);
    return node ? clone(node) : null;
  }

  setTitle(title) {
    this.#state.title = cleanText(title, DEFAULT_TITLE);
    this.#commit();
    return this.#state.title;
  }

  addNode({ parentId = ROOT_ID, text = 'New idea' } = {}) {
    const parent = this.#requireNode(parentId);
    const siblings = this.#state.nodes.filter((node) => node.parentId === parentId);
    const slot = siblings.length;
    const direction = slot === 0 ? 0 : Math.ceil(slot / 2) * (slot % 2 === 1 ? 1 : -1);
    const node = {
      id: this.#idFactory(),
      parentId: parent.id,
      text: cleanText(text),
      x: parent.x + HORIZONTAL_GAP,
      y: parent.y + direction * VERTICAL_GAP,
    };
    this.#state.nodes.push(node);
    this.#commit();
    return clone(node);
  }

  updateNode(id, text) {
    const node = this.#requireNode(id);
    node.text = cleanText(text, node.text);
    this.#commit();
    return clone(node);
  }

  moveNode(id, x, y) {
    const node = this.#requireNode(id);
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('Coordinates must be finite numbers.');
    node.x = x;
    node.y = y;
    this.#commit();
    return clone(node);
  }

  reparentNode(id, newParentId) {
    if (id === ROOT_ID) throw new Error('The root node cannot be reparented.');
    const node = this.#requireNode(id);
    const parent = this.#requireNode(newParentId);
    if (id === newParentId || this.#descendantIds(id).has(newParentId)) {
      throw new Error('A node cannot be moved under itself or one of its descendants.');
    }
    node.parentId = parent.id;
    node.x = parent.x + HORIZONTAL_GAP;
    node.y = parent.y;
    this.#commit();
    return clone(node);
  }

  deleteNode(id) {
    if (id === ROOT_ID) throw new Error('The root node cannot be deleted.');
    this.#requireNode(id);
    const removed = this.#descendantIds(id);
    removed.add(id);
    this.#state.nodes = this.#state.nodes.filter((node) => !removed.has(node.id));
    this.#commit();
    return [...removed];
  }

  arrange() {
    this.#state.nodes = layoutNodes(this.#state.nodes);
    this.#commit();
    return this.state;
  }

  replaceFromOutline(outline, { title } = {}) {
    const nodes = parseOutline(outline, this.#idFactory);
    this.#state = {
      title: cleanText(title, nodes[0].text),
      nodes,
    };
    this.#commit();
    return this.state;
  }

  replaceState(state) {
    this.#state = normalizeState(state);
    this.#commit();
    return this.state;
  }

  reset() {
    this.#state = makeDefaultState();
    this.#commit();
    return this.state;
  }

  #requireNode(id) {
    const node = this.#state.nodes.find((item) => item.id === id);
    if (!node) throw new Error(`Unknown node id: ${id}`);
    return node;
  }

  #descendantIds(id) {
    const result = new Set();
    const queue = [id];
    while (queue.length > 0) {
      const current = queue.shift();
      for (const node of this.#state.nodes) {
        if (node.parentId === current && !result.has(node.id)) {
          result.add(node.id);
          queue.push(node.id);
        }
      }
    }
    return result;
  }

  #commit() {
    this.#persist(this.state);
  }
}
