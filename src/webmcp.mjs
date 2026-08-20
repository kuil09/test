import { outlineFromState, ROOT_ID } from './mindmap-store.mjs';

function compactResult(value, max = 1400) {
  const text = String(value);
  return text.length <= max ? text : `${text.slice(0, max - 40)}\n… output truncated`;
}

function mutationAnnotations() {
  return { readOnlyHint: false, untrustedContentHint: true };
}

export function createWebMcpTools({ store, ui = {} }) {
  return [
    {
      name: 'get_map',
      description: 'Read the current mind map as a concise indented outline with node IDs for follow-up edits.',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async () => {
        const state = store.state;
        const idLines = state.nodes.map((node) => `${node.id}: ${node.text}`).join('\n');
        return compactResult(`Title: ${state.title}\n\n${outlineFromState(state)}\n\nNode IDs:\n${idLines}`);
      },
    },
    {
      name: 'create_map',
      description: 'Replace the current mind map from a Markdown-style indented outline. The first line becomes the root topic.',
      inputSchema: {
        type: 'object',
        properties: {
          outline: { type: 'string', description: 'Indented outline. Use two spaces per nesting level.' },
          title: { type: 'string', description: 'Optional map title.' },
        },
        required: ['outline'],
      },
      annotations: mutationAnnotations(),
      execute: async ({ outline, title }) => {
        const state = store.replaceFromOutline(outline, { title });
        ui.onStateChange?.({ selectId: ROOT_ID, fit: true });
        return `Created mind map "${state.title}" with ${state.nodes.length} nodes.`;
      },
    },
    {
      name: 'add_node',
      description: 'Add one child idea beneath an existing mind-map node.',
      inputSchema: {
        type: 'object',
        properties: {
          parent_id: { type: 'string', description: 'Existing parent node ID.' },
          text: { type: 'string', description: 'Text for the new child idea.' },
        },
        required: ['parent_id', 'text'],
      },
      annotations: mutationAnnotations(),
      execute: async ({ parent_id, text }) => {
        const node = store.addNode({ parentId: parent_id, text });
        ui.onStateChange?.({ selectId: node.id });
        return `Added node ${node.id}: ${node.text}`;
      },
    },
    {
      name: 'update_node',
      description: 'Change the text of one existing mind-map node.',
      inputSchema: {
        type: 'object',
        properties: {
          node_id: { type: 'string', description: 'Node ID to edit.' },
          text: { type: 'string', description: 'Replacement node text.' },
        },
        required: ['node_id', 'text'],
      },
      annotations: mutationAnnotations(),
      execute: async ({ node_id, text }) => {
        const node = store.updateNode(node_id, text);
        ui.onStateChange?.({ selectId: node.id });
        return `Updated node ${node.id}: ${node.text}`;
      },
    },
    {
      name: 'reparent_node',
      description: 'Move one node and its descendants beneath a different parent node.',
      inputSchema: {
        type: 'object',
        properties: {
          node_id: { type: 'string', description: 'Node ID to move.' },
          new_parent_id: { type: 'string', description: 'Destination parent node ID.' },
        },
        required: ['node_id', 'new_parent_id'],
      },
      annotations: mutationAnnotations(),
      execute: async ({ node_id, new_parent_id }) => {
        const node = store.reparentNode(node_id, new_parent_id);
        ui.onStateChange?.({ selectId: node.id });
        return `Moved node ${node.id} beneath ${new_parent_id}.`;
      },
    },
    {
      name: 'delete_node',
      description: 'Delete one non-root node and its entire descendant branch.',
      inputSchema: {
        type: 'object',
        properties: { node_id: { type: 'string', description: 'Non-root node ID to delete.' } },
        required: ['node_id'],
      },
      annotations: mutationAnnotations(),
      execute: async ({ node_id }) => {
        const removed = store.deleteNode(node_id);
        ui.onStateChange?.({ selectId: ROOT_ID });
        return `Deleted ${removed.length} node${removed.length === 1 ? '' : 's'} from the branch.`;
      },
    },
    {
      name: 'focus_node',
      description: 'Select and reveal one mind-map node in the visible interface for the user.',
      inputSchema: {
        type: 'object',
        properties: { node_id: { type: 'string', description: 'Node ID to reveal and select.' } },
        required: ['node_id'],
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async ({ node_id }) => {
        const node = store.getNode(node_id);
        if (!node) throw new Error(`Unknown node id: ${node_id}`);
        ui.onStateChange?.({ selectId: node.id, reveal: true });
        return `Focused node ${node.id}: ${node.text}`;
      },
    },
  ];
}

export async function registerWebMcp({ modelContext = globalThis.document?.modelContext, store, ui } = {}) {
  if (!modelContext?.registerTool) {
    return { supported: false, names: [], dispose() {} };
  }

  const controller = new AbortController();
  const tools = createWebMcpTools({ store, ui });
  for (const tool of tools) {
    await modelContext.registerTool(tool, { signal: controller.signal });
  }

  return {
    supported: true,
    names: tools.map((tool) => tool.name),
    dispose() {
      controller.abort();
    },
  };
}
