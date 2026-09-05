import { MindMapNode, MindMapPreset, MindMapEdge } from '../types/mindmap';
import {
  GENYE_2026_MINDMAP,
  WUGONGSHAN_MINDMAP,
  DEFAULT_TRIP_MINDMAP,
  PRESET_MINDMAPS,
} from '../data/presetMindMaps';

const STORAGE_PREFIX = 'hike_mindmap_v1_';

export const mindMapStorageService = {
  async fetchMindMapFromServer(listId: string): Promise<{
    root: MindMapNode | null;
    edges: MindMapEdge[] | null;
    layoutMode: string | null;
    viewport: any | null;
  } | null> {
    try {
      if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
        const res = await fetch(`/api/mindmap/${encodeURIComponent(listId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.root) {
            const key = STORAGE_PREFIX + listId;
            localStorage.setItem(key, JSON.stringify(data.root));
            if (Array.isArray(data.edges)) {
              localStorage.setItem(`hike_edges_${listId}`, JSON.stringify(data.edges));
            }
            if (data.layoutMode) {
              localStorage.setItem(`hike_mindmap_layoutmode_${listId}`, data.layoutMode);
            }
            if (data.viewport) {
              localStorage.setItem(`hike_mindmap_viewport_${listId}`, JSON.stringify(data.viewport));
            }
            return {
              root: data.root,
              edges: data.edges || null,
              layoutMode: data.layoutMode || null,
              viewport: data.viewport || null,
            };
          }
        }
      }
    } catch (e) {
      console.warn('[MindMapStorage] Fetch from server failed, fallback to local:', e);
    }
    return null;
  },

  getMindMap(listId: string, listTitle?: string, destination?: string): MindMapNode {
    try {
      const key = STORAGE_PREFIX + listId;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id && parsed.title) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to read mind map from localStorage:', e);
    }

    // Fallback based on trip destination / title
    const titleLower = (listTitle || '').toLowerCase();
    const destLower = (destination || '').toLowerCase();

    if (titleLower.includes('格聂') || destLower.includes('格聂')) {
      const initial = JSON.parse(JSON.stringify(GENYE_2026_MINDMAP));
      this.saveMindMap(listId, initial);
      return initial;
    }

    if (titleLower.includes('武功山') || destLower.includes('武功山')) {
      const initial = JSON.parse(JSON.stringify(WUGONGSHAN_MINDMAP));
      this.saveMindMap(listId, initial);
      return initial;
    }

    // Default template
    const initial = JSON.parse(JSON.stringify(DEFAULT_TRIP_MINDMAP));
    if (listTitle) {
      initial.title = `${listTitle} · 行程导图`;
    }
    this.saveMindMap(listId, initial);
    return initial;
  },

  saveMindMap(
    listId: string,
    root: MindMapNode,
    edges?: MindMapEdge[],
    layoutMode?: string,
    viewport?: any
  ): void {
    try {
      const key = STORAGE_PREFIX + listId;
      localStorage.setItem(key, JSON.stringify(root));
      if (edges) {
        localStorage.setItem(`hike_edges_${listId}`, JSON.stringify(edges));
      }
      if (layoutMode) {
        localStorage.setItem(`hike_mindmap_layoutmode_${listId}`, layoutMode);
      }
      if (viewport) {
        localStorage.setItem(`hike_mindmap_viewport_${listId}`, JSON.stringify(viewport));
      }

      // Sync to cloud server
      if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
        fetch(`/api/mindmap/${encodeURIComponent(listId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            root,
            edges: edges || [],
            layoutMode: layoutMode || 'timeline-flow',
            viewport: viewport || null,
          }),
        }).catch((e) => console.warn('[MindMapStorage] Cloud save error:', e));
      }
    } catch (e) {
      console.error('Failed to save mind map:', e);
    }
  },

  deleteMindMap(listId: string): void {
    if (!listId) return;
    try {
      localStorage.removeItem(STORAGE_PREFIX + listId);
      localStorage.removeItem(`hike_edges_${listId}`);
      localStorage.removeItem(`hike_mindmap_layoutmode_${listId}`);
      localStorage.removeItem(`hike_mindmap_viewport_${listId}`);
      localStorage.removeItem(`hike_mindmap_mapopen_${listId}`);

      if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
        fetch(`/api/mindmap/${encodeURIComponent(listId)}`, {
          method: 'DELETE',
        }).catch((e) => console.warn('[MindMapStorage] Cloud delete error:', e));
      }
    } catch (e) {
      console.error('Failed to delete mind map:', e);
    }
  },

  resetToPreset(listId: string, presetId: string): MindMapNode {
    const matched = PRESET_MINDMAPS.find((p) => p.id === presetId) || PRESET_MINDMAPS[0];
    const cloned = JSON.parse(JSON.stringify(matched.root));
    this.saveMindMap(listId, cloned);
    return cloned;
  },

  getAvailablePresets(): MindMapPreset[] {
    return PRESET_MINDMAPS;
  },

  // Deep clone helper
  cloneNode(node: MindMapNode): MindMapNode {
    return JSON.parse(JSON.stringify(node));
  },

  // Tree manipulation utilities
  findNode(root: MindMapNode, id: string): MindMapNode | null {
    if (root.id === id) return root;
    if (root.children) {
      for (const child of root.children) {
        const found = this.findNode(child, id);
        if (found) return found;
      }
    }
    return null;
  },

  findParent(root: MindMapNode, id: string): { parent: MindMapNode; index: number } | null {
    if (!root.children) return null;
    for (let i = 0; i < root.children.length; i++) {
      if (root.children[i].id === id) {
        return { parent: root, index: i };
      }
      const found = this.findParent(root.children[i], id);
      if (found) return found;
    }
    return null;
  },

  updateNode(
    root: MindMapNode,
    id: string,
    updates: Partial<Omit<MindMapNode, 'id' | 'children'>>
  ): MindMapNode {
    const cloned = this.cloneNode(root);
    const target = this.findNode(cloned, id);
    if (target) {
      Object.assign(target, updates);
    }
    return cloned;
  },

  addChildNode(root: MindMapNode, parentId: string, newNode: Partial<MindMapNode>): MindMapNode {
    const cloned = this.cloneNode(root);
    const parent = this.findNode(cloned, parentId);
    if (parent) {
      if (!parent.children) parent.children = [];
      const created: MindMapNode = {
        id: newNode.id || ('node-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6)),
        title: newNode.title || '新节点',
        description: newNode.description,
        time: newNode.time,
        elevation: newNode.elevation,
        tag: newNode.tag,
        color: newNode.color,
        position: newNode.position,
        detached: newNode.detached,
        isFloating: newNode.isFloating,
        collapsed: false,
        children: newNode.children || [],
      };
      parent.children.push(created);
      parent.collapsed = false; // ensure expanded so new child is visible
    }
    return cloned;
  },

  addSiblingNode(root: MindMapNode, targetId: string, newNode: Partial<MindMapNode>): MindMapNode {
    if (root.id === targetId) {
      // Cannot add sibling to root, add as child instead
      return this.addChildNode(root, targetId, newNode);
    }
    const cloned = this.cloneNode(root);
    const parentInfo = this.findParent(cloned, targetId);
    if (parentInfo) {
      const created: MindMapNode = {
        id: newNode.id || ('node-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6)),
        title: newNode.title || '新节点',
        description: newNode.description,
        time: newNode.time,
        elevation: newNode.elevation,
        tag: newNode.tag,
        color: newNode.color,
        position: newNode.position,
        detached: newNode.detached,
        isFloating: newNode.isFloating,
        collapsed: false,
        children: newNode.children || [],
      };
      parentInfo.parent.children?.splice(parentInfo.index + 1, 0, created);
    }
    return cloned;
  },

  deleteNode(root: MindMapNode, targetId: string): MindMapNode {
    if (root.id === targetId) {
      return root;
    }
    const cloned = this.cloneNode(root);
    const parentInfo = this.findParent(cloned, targetId);
    if (parentInfo && parentInfo.parent.children) {
      const targetNode = parentInfo.parent.children[parentInfo.index];
      const children = targetNode.children || [];

      // Preserve all children! Move them to root as independent nodes so they are never lost!
      children.forEach((child) => {
        child.detached = true;
        child.isFloating = true;
        cloned.children = cloned.children || [];
        cloned.children.push(child);
      });

      // Remove only targetNode itself
      parentInfo.parent.children.splice(parentInfo.index, 1);
    }
    return cloned;
  },

  toggleCollapse(root: MindMapNode, id: string): MindMapNode {
    const cloned = this.cloneNode(root);
    const target = this.findNode(cloned, id);
    if (target) {
      target.collapsed = !target.collapsed;
    }
    return cloned;
  },

  toggleCompleted(root: MindMapNode, id: string): MindMapNode {
    const cloned = this.cloneNode(root);
    const target = this.findNode(cloned, id);
    if (target) {
      target.completed = !target.completed;
    }
    return cloned;
  },

  moveNodeUp(root: MindMapNode, id: string): MindMapNode {
    const cloned = this.cloneNode(root);
    const parentInfo = this.findParent(cloned, id);
    if (parentInfo && parentInfo.parent.children && parentInfo.index > 0) {
      const children = parentInfo.parent.children;
      const idx = parentInfo.index;
      const temp = children[idx];
      children[idx] = children[idx - 1];
      children[idx - 1] = temp;
    }
    return cloned;
  },

  moveNodeDown(root: MindMapNode, id: string): MindMapNode {
    const cloned = this.cloneNode(root);
    const parentInfo = this.findParent(cloned, id);
    if (
      parentInfo &&
      parentInfo.parent.children &&
      parentInfo.index < parentInfo.parent.children.length - 1
    ) {
      const children = parentInfo.parent.children;
      const idx = parentInfo.index;
      const temp = children[idx];
      children[idx] = children[idx + 1];
      children[idx + 1] = temp;
    }
    return cloned;
  },

  duplicateNode(root: MindMapNode, id: string): MindMapNode {
    const cloned = this.cloneNode(root);
    const parentInfo = this.findParent(cloned, id);
    if (parentInfo && parentInfo.parent.children) {
      const original = parentInfo.parent.children[parentInfo.index];
      const copy = this.cloneNode(original);
      const renewIds = (n: MindMapNode) => {
        n.id = 'node-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
        if (n.children) n.children.forEach(renewIds);
      };
      renewIds(copy);
      copy.title = `${copy.title} (副本)`;
      parentInfo.parent.children.splice(parentInfo.index + 1, 0, copy);
    }
    return cloned;
  },

  reparentNode(root: MindMapNode, sourceId: string, newParentId: string): MindMapNode {
    if (sourceId === root.id || sourceId === newParentId) return root;
    const cloned = this.cloneNode(root);
    const sourceNode = this.findNode(cloned, sourceId);
    if (!sourceNode) return root;

    // Check if newParentId is descendant of sourceId to prevent cycles
    const isDescendant = (node: MindMapNode, targetId: string): boolean => {
      if (!node.children) return false;
      for (const child of node.children) {
        if (child.id === targetId || isDescendant(child, targetId)) return true;
      }
      return false;
    };
    if (isDescendant(sourceNode, newParentId)) return root;

    // Remove from old parent
    const parentInfo = this.findParent(cloned, sourceId);
    if (parentInfo && parentInfo.parent.children) {
      parentInfo.parent.children.splice(parentInfo.index, 1);
    }

    // Add to new parent
    const newParent = this.findNode(cloned, newParentId);
    if (newParent) {
      if (!newParent.children) newParent.children = [];
      newParent.children.push(sourceNode);
      newParent.collapsed = false;
    }
    return cloned;
  },

  setAllCollapsed(root: MindMapNode, collapsed: boolean): MindMapNode {
    const cloned = this.cloneNode(root);
    const traverse = (node: MindMapNode, isRoot: boolean) => {
      if (!isRoot) {
        node.collapsed = collapsed;
      }
      if (node.children) {
        node.children.forEach((c) => traverse(c, false));
      }
    };
    traverse(cloned, true);
    return cloned;
  },

  clearAllPositions(root: MindMapNode): MindMapNode {
    const cloned = this.cloneNode(root);
    const traverse = (node: MindMapNode) => {
      delete node.position;
      if (node.children) node.children.forEach(traverse);
    };
    traverse(cloned);
    return cloned;
  },

  updateNodePositions(
    root: MindMapNode,
    positionMap: Record<string, { x: number; y: number }>
  ): MindMapNode {
    const cloned = this.cloneNode(root);
    const traverse = (node: MindMapNode) => {
      if (positionMap[node.id]) {
        node.position = positionMap[node.id];
      }
      if (node.children) node.children.forEach(traverse);
    };
    traverse(cloned);
    return cloned;
  },

  countNodes(root: MindMapNode): number {
    let count = 1;
    if (root.children) {
      for (const child of root.children) {
        count += this.countNodes(child);
      }
    }
    return count;
  },
};

