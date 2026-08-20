import { MindMapStore, ROOT_ID } from './mindmap-store.mjs';
import { registerWebMcp } from './webmcp.mjs';

const STORAGE_KEY = 'orbit-mindmap:v1';
const NODE_WIDTH = 190;
const NODE_HEIGHT = 60;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 1.8;

const sampleOutline = `WebMCP Mindmap
- Product
  - Human-first canvas
  - Local persistence
- Agent interface
  - Read map state
  - Create branches
  - Edit structure
- Delivery
  - GitHub Pages
  - Automated tests`;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const initialState = loadState();
const store = new MindMapStore({ state: initialState, persist: persistState });
if (!initialState) store.replaceFromOutline(sampleOutline, { title: 'WebMCP Mindmap' });

const canvas = document.querySelector('[data-canvas]');
const world = document.querySelector('[data-world]');
const edges = document.querySelector('[data-edges]');
const nodeLayer = document.querySelector('[data-node-layer]');
const titleInput = document.querySelector('[data-map-title]');
const nodeText = document.querySelector('[data-node-text]');
const parentSelect = document.querySelector('[data-parent-select]');
const nodeX = document.querySelector('[data-node-x]');
const nodeY = document.querySelector('[data-node-y]');
const nodeId = document.querySelector('[data-node-id]');
const inspectorTitle = document.querySelector('[data-inspector-title]');
const importInput = document.querySelector('[data-import-input]');
const zoomLabel = document.querySelector('[data-zoom-label]');
const toast = document.querySelector('[data-toast]');
const webMcpStatus = document.querySelector('[data-webmcp-status]');
const webMcpDot = document.querySelector('[data-webmcp-dot]');
const webMcpTools = document.querySelector('[data-webmcp-tools]');

let selectedId = ROOT_ID;
let view = { x: 0, y: 0, zoom: 1 };
let panState = null;
let nodeDrag = null;
let toastTimer = null;

function nodeById(id) {
  return store.state.nodes.find((node) => node.id === id) ?? null;
}

function descendantIds(state, id) {
  const result = new Set();
  const queue = [id];
  while (queue.length) {
    const current = queue.shift();
    for (const node of state.nodes) {
      if (node.parentId === current && !result.has(node.id)) {
        result.add(node.id);
        queue.push(node.id);
      }
    }
  }
  return result;
}

function applyView() {
  world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`;
  zoomLabel.textContent = `${Math.round(view.zoom * 100)}%`;
}

function render() {
  const state = store.state;
  if (!state.nodes.some((node) => node.id === selectedId)) selectedId = ROOT_ID;

  titleInput.value = state.title;
  nodeLayer.replaceChildren(...state.nodes.map(renderNode));
  renderEdges();
  renderInspector(state);
  applyView();
}

function renderNode(node) {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = 'mind-node';
  element.dataset.nodeId = node.id;
  element.dataset.root = String(node.id === ROOT_ID);
  element.dataset.selected = String(node.id === selectedId);
  element.style.left = `${node.x}px`;
  element.style.top = `${node.y}px`;
  element.setAttribute('aria-pressed', String(node.id === selectedId));

  const bullet = document.createElement('span');
  bullet.className = 'node-bullet';
  bullet.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.className = 'node-label';
  label.textContent = node.text;

  element.append(bullet, label);
  element.addEventListener('click', () => selectNode(node.id));
  element.addEventListener('dblclick', () => {
    selectNode(node.id);
    nodeText.focus();
    nodeText.select();
  });
  element.addEventListener('pointerdown', (event) => startNodeDrag(event, node));
  return element;
}

function renderEdges(positionOverride = null) {
  const state = store.state;
  const byId = new Map(state.nodes.map((node) => [node.id, { ...node }]));
  if (positionOverride) {
    const target = byId.get(positionOverride.id);
    if (target) Object.assign(target, positionOverride);
  }

  const fragments = [];
  for (const node of byId.values()) {
    if (!node.parentId) continue;
    const parent = byId.get(node.parentId);
    if (!parent) continue;

    const childOnRight = node.x >= parent.x;
    const startX = parent.x + (childOnRight ? NODE_WIDTH : 0);
    const startY = parent.y + NODE_HEIGHT / 2;
    const endX = node.x + (childOnRight ? 0 : NODE_WIDTH);
    const endY = node.y + NODE_HEIGHT / 2;
    const bend = Math.max(70, Math.abs(endX - startX) * 0.48);
    const c1x = startX + (childOnRight ? bend : -bend);
    const c2x = endX - (childOnRight ? bend : -bend);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${startX} ${startY} C ${c1x} ${startY}, ${c2x} ${endY}, ${endX} ${endY}`);
    fragments.push(path);
  }
  edges.replaceChildren(...fragments);
}

function renderInspector(state) {
  const selected = state.nodes.find((node) => node.id === selectedId) ?? state.nodes[0];
  const blocked = descendantIds(state, selected.id);
  blocked.add(selected.id);

  inspectorTitle.textContent = selected.id === ROOT_ID ? '루트 노드' : '선택된 노드';
  nodeId.textContent = selected.id;
  nodeText.value = selected.text;
  nodeX.value = Math.round(selected.x);
  nodeY.value = Math.round(selected.y);

  parentSelect.replaceChildren(
    ...state.nodes
      .filter((node) => !blocked.has(node.id))
      .map((node) => {
        const option = document.createElement('option');
        option.value = node.id;
        option.textContent = node.text;
        option.selected = node.id === selected.parentId;
        return option;
      }),
  );
  parentSelect.disabled = selected.id === ROOT_ID;
  document.querySelector('[data-action="delete"]').disabled = selected.id === ROOT_ID;
}

function selectNode(id, { reveal = false } = {}) {
  if (!nodeById(id)) return;
  selectedId = id;
  render();
  if (reveal) revealNode(id);
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 2200);
}

function addChild() {
  const node = store.addNode({ parentId: selectedId, text: 'New idea' });
  selectedId = node.id;
  render();
  nodeText.focus();
  nodeText.select();
}

function deleteSelected() {
  if (selectedId === ROOT_ID) return;
  const node = nodeById(selectedId);
  if (!node) return;
  if (!confirm(`“${node.text}” 브랜치를 삭제할까요? 하위 노드도 함께 삭제됩니다.`)) return;
  store.deleteNode(selectedId);
  selectedId = ROOT_ID;
  render();
}

function fitView() {
  const nodes = store.state.nodes;
  if (nodes.length === 0) return;
  const minX = Math.min(...nodes.map((node) => node.x));
  const minY = Math.min(...nodes.map((node) => node.y));
  const maxX = Math.max(...nodes.map((node) => node.x + NODE_WIDTH));
  const maxY = Math.max(...nodes.map((node) => node.y + NODE_HEIGHT));
  const rect = canvas.getBoundingClientRect();
  const padding = 130;
  const usableWidth = Math.max(240, rect.width - padding * 2);
  const usableHeight = Math.max(200, rect.height - padding * 2);
  const zoom = Math.min(1.05, usableWidth / (maxX - minX), usableHeight / (maxY - minY));
  view.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  view.x = rect.width / 2 - centerX * view.zoom;
  view.y = rect.height / 2 - centerY * view.zoom;
  applyView();
}

function revealNode(id) {
  const node = nodeById(id);
  if (!node) return;
  const rect = canvas.getBoundingClientRect();
  view.x = rect.width / 2 - (node.x + NODE_WIDTH / 2) * view.zoom;
  view.y = rect.height / 2 - (node.y + NODE_HEIGHT / 2) * view.zoom;
  applyView();
}

function zoomAt(factor, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const pointX = clientX - rect.left;
  const pointY = clientY - rect.top;
  const worldX = (pointX - view.x) / view.zoom;
  const worldY = (pointY - view.y) / view.zoom;
  const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, view.zoom * factor));
  view.x = pointX - worldX * nextZoom;
  view.y = pointY - worldY * nextZoom;
  view.zoom = nextZoom;
  applyView();
}

function startNodeDrag(event, node) {
  if (event.button !== 0) return;
  event.stopPropagation();
  const element = event.currentTarget;
  element.setPointerCapture(event.pointerId);
  nodeDrag = {
    id: node.id,
    element,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startX: node.x,
    startY: node.y,
    moved: false,
  };
}

function onNodePointerMove(event) {
  if (!nodeDrag) return;
  const dx = (event.clientX - nodeDrag.startClientX) / view.zoom;
  const dy = (event.clientY - nodeDrag.startClientY) / view.zoom;
  if (Math.abs(dx) + Math.abs(dy) > 3) nodeDrag.moved = true;
  const x = nodeDrag.startX + dx;
  const y = nodeDrag.startY + dy;
  nodeDrag.element.style.left = `${x}px`;
  nodeDrag.element.style.top = `${y}px`;
  renderEdges({ id: nodeDrag.id, x, y });
}

function finishNodeDrag(event) {
  if (!nodeDrag) return;
  const dx = (event.clientX - nodeDrag.startClientX) / view.zoom;
  const dy = (event.clientY - nodeDrag.startClientY) / view.zoom;
  if (nodeDrag.moved) {
    store.moveNode(nodeDrag.id, nodeDrag.startX + dx, nodeDrag.startY + dy);
    selectedId = nodeDrag.id;
    render();
  }
  nodeDrag = null;
}

canvas.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || event.target.closest('.mind-node')) return;
  canvas.setPointerCapture(event.pointerId);
  panState = { x: event.clientX, y: event.clientY, viewX: view.x, viewY: view.y };
  canvas.dataset.panning = 'true';
});

canvas.addEventListener('pointermove', (event) => {
  if (nodeDrag) {
    onNodePointerMove(event);
    return;
  }
  if (!panState) return;
  view.x = panState.viewX + event.clientX - panState.x;
  view.y = panState.viewY + event.clientY - panState.y;
  applyView();
});

canvas.addEventListener('pointerup', (event) => {
  if (nodeDrag) finishNodeDrag(event);
  panState = null;
  canvas.dataset.panning = 'false';
});

canvas.addEventListener('pointercancel', (event) => {
  if (nodeDrag) finishNodeDrag(event);
  panState = null;
  canvas.dataset.panning = 'false';
});

canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  zoomAt(event.deltaY < 0 ? 1.1 : 0.9, event.clientX, event.clientY);
}, { passive: false });

titleInput.addEventListener('change', () => {
  store.setTitle(titleInput.value);
  render();
});

nodeText.addEventListener('change', () => {
  store.updateNode(selectedId, nodeText.value);
  render();
});

parentSelect.addEventListener('change', () => {
  try {
    store.reparentNode(selectedId, parentSelect.value);
    render();
  } catch (error) {
    showToast(error.message);
    render();
  }
});

function commitCoordinates() {
  const x = Number(nodeX.value);
  const y = Number(nodeY.value);
  try {
    store.moveNode(selectedId, x, y);
    render();
  } catch (error) {
    showToast(error.message);
  }
}
nodeX.addEventListener('change', commitCoordinates);
nodeY.addEventListener('change', commitCoordinates);

for (const button of document.querySelectorAll('[data-action]')) {
  button.addEventListener('click', () => {
    switch (button.dataset.action) {
      case 'add':
        addChild();
        break;
      case 'delete':
        deleteSelected();
        break;
      case 'arrange':
        store.arrange();
        render();
        fitView();
        break;
      case 'fit':
        fitView();
        break;
      case 'new':
        if (confirm('현재 마인드맵을 지우고 새 맵을 만들까요?')) {
          store.reset();
          selectedId = ROOT_ID;
          render();
          fitView();
        }
        break;
      case 'export': {
        const blob = new Blob([JSON.stringify(store.state, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${store.state.title.replace(/[^\p{L}\p{N}-]+/gu, '-').replace(/^-|-$/g, '') || 'mindmap'}.json`;
        link.click();
        URL.revokeObjectURL(url);
        showToast('JSON 파일로 내보냈습니다.');
        break;
      }
      case 'import':
        importInput.click();
        break;
    }
  });
}

importInput.addEventListener('change', async () => {
  const file = importInput.files?.[0];
  if (!file) return;
  try {
    store.replaceState(JSON.parse(await file.text()));
    selectedId = ROOT_ID;
    render();
    fitView();
    showToast('마인드맵을 가져왔습니다.');
  } catch (error) {
    showToast(`가져오기 실패: ${error.message}`);
  } finally {
    importInput.value = '';
  }
});

for (const button of document.querySelectorAll('[data-zoom]')) {
  button.addEventListener('click', () => {
    const rect = canvas.getBoundingClientRect();
    zoomAt(button.dataset.zoom === 'in' ? 1.15 : 0.87, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });
}

window.addEventListener('keydown', (event) => {
  const editable = event.target.matches('input, textarea, select, [contenteditable="true"]');
  if (editable) return;
  if (event.key === 'Enter') {
    event.preventDefault();
    addChild();
  } else if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    deleteSelected();
  } else if (event.key.toLowerCase() === 'f') {
    fitView();
  }
});

window.addEventListener('resize', () => applyView());

render();
requestAnimationFrame(fitView);

const webMcp = await registerWebMcp({
  store,
  ui: {
    onStateChange({ selectId, fit, reveal } = {}) {
      if (selectId && nodeById(selectId)) selectedId = selectId;
      render();
      if (fit) requestAnimationFrame(fitView);
      if (reveal) requestAnimationFrame(() => revealNode(selectedId));
    },
  },
});

if (webMcp.supported) {
  webMcpStatus.textContent = `활성화됨 · ${webMcp.names.length}개 도구`;
  webMcpDot.dataset.active = 'true';
  webMcpTools.replaceChildren(...webMcp.names.map((name) => {
    const item = document.createElement('li');
    item.textContent = name;
    return item;
  }));
} else {
  webMcpStatus.textContent = '이 브라우저에서는 비활성 · Chrome WebMCP 플래그/오리진 트라이얼 필요';
  webMcpDot.dataset.active = 'false';
  webMcpTools.replaceChildren();
}
