import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import {
  Plus,
  Edit2,
  ChevronDown,
  Trash2,
  Info,
  Clock,
  Mountain,
  CheckSquare,
  Square,
  ArrowRight,
  ArrowDown,
  Calendar,
  Layers,
  GripHorizontal,
  Link,
  Sparkles,
  Scissors,
  X,
} from 'lucide-react';
import {
  MindMapNode,
  MindMapLayoutNode,
  MindMapEdge,
  MindMapLayoutMode,
} from '../../types/mindmap';
import { mindMapStorageService } from '../../services/mindMapStorageService';
import { MindMapToolbar } from './MindMapToolbar';
import { NodeEditModal } from './NodeEditModal';
import { ContextMenu } from './ContextMenu';
import { RouteMapPanel } from '../map/RouteMapPanel';

interface MindMapCanvasProps {
  listId: string;
  listTitle: string;
  destination?: string;
}

const TREE_LEVEL_GAP = 90;
const TREE_NODE_GAP = 28;

const TIMELINE_COL_WIDTH = 220;
const TIMELINE_COL_GAP = 64;
const TIMELINE_ROW_GAP = 32;

function getNodeSize(node: MindMapNode, depth: number, mode: MindMapLayoutMode) {
  if (depth === 0) return { width: 260, height: 88 };
  const cardWidth = mode === 'timeline-flow' ? TIMELINE_COL_WIDTH : 240;

  const hasMeta = !!(node.time || node.elevation || node.tag);
  const descLen = (node.description || '').length;
  const titleLen = (node.title || '').length;

  let h = 50;
  if (hasMeta) h += 22;
  if (titleLen > 14) h += 18;
  if (titleLen > 28) h += 18;
  if (descLen > 0) {
    h += descLen > 16 ? 34 : 18;
  }

  const finalH = Math.max(h, 56);
  return { width: cardWidth, height: finalH };
}

// Smart Edge Path Generator
function getSmartPath(
  source: { x: number; y: number; width: number; height: number },
  target: { x: number; y: number; width: number; height: number },
  kind: 'horizontal-spine' | 'vertical-step' | 'branch-curve' | 'custom-link'
): {
  path: string;
  marker: 'arrow-horizontal' | 'arrow-vertical' | 'none';
  midX: number;
  midY: number;
} {
  if (kind === 'horizontal-spine') {
    const x1 = source.x + source.width;
    const y1 = source.y + source.height / 2;
    const x2 = target.x;
    const y2 = target.y + target.height / 2;
    const midX = Math.round((x1 + x2) / 2);
    const midY = Math.round((y1 + y2) / 2);

    if (x2 >= x1 + 10) {
      if (Math.abs(y2 - y1) < 6) {
        return { path: `M ${x1} ${y1} L ${x2} ${y2}`, marker: 'arrow-horizontal', midX, midY };
      }
      return {
        path: `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`,
        marker: 'arrow-horizontal',
        midX,
        midY,
      };
    }
  }

  if (kind === 'vertical-step') {
    const x1 = Math.round(source.x + source.width / 2);
    const y1 = Math.round(source.y + source.height);
    const x2 = Math.round(target.x + target.width / 2);
    const y2 = Math.round(target.y);
    const midX = Math.round((x1 + x2) / 2);
    const midY = Math.round((y1 + y2) / 2);

    if (y2 >= y1) {
      if (Math.abs(x2 - x1) < 8) {
        return { path: `M ${x1} ${y1} L ${x1} ${y2}`, marker: 'arrow-vertical', midX: x1, midY };
      }
      return {
        path: `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`,
        marker: 'arrow-vertical',
        midX,
        midY,
      };
    } else {
      // Fallback if target was positioned above source
      const sy = Math.round(source.y);
      const ty = Math.round(target.y + target.height);
      return {
        path: `M ${x1} ${sy} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${ty}`,
        marker: 'arrow-vertical',
        midX,
        midY,
      };
    }
  }

  // Smooth Bezier Curve (Organic & Beautiful)
  // If target is predominantly below source:
  if (target.y >= source.y + source.height - 10) {
    const x1 = Math.round(source.x + source.width / 2);
    const y1 = Math.round(source.y + source.height);
    const x2 = Math.round(target.x + target.width / 2);
    const y2 = Math.round(target.y);
    const midX = Math.round((x1 + x2) / 2);
    const midY = Math.round((y1 + y2) / 2);
    if (Math.abs(x2 - x1) < 8) {
      return { path: `M ${x1} ${y1} L ${x1} ${y2}`, marker: 'arrow-vertical', midX: x1, midY };
    }
    const dy = Math.max(20, Math.abs(y2 - y1) * 0.5);
    return {
      path: `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`,
      marker: 'arrow-vertical',
      midX,
      midY,
    };
  }

  // If target is to the right of source:
  if (target.x >= source.x + source.width - 10) {
    const x1 = source.x + source.width;
    const y1 = source.y + source.height / 2;
    const x2 = target.x;
    const y2 = target.y + target.height / 2;
    const midX = Math.round((x1 + x2) / 2);
    const midY = Math.round((y1 + y2) / 2);
    const dx = Math.max(28, Math.abs(x2 - x1) * 0.5);
    return {
      path: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`,
      marker: 'arrow-horizontal',
      midX,
      midY,
    };
  }

  // If target is to the left of source:
  if (target.x + target.width <= source.x + 10) {
    const x1 = source.x;
    const y1 = source.y + source.height / 2;
    const x2 = target.x + target.width;
    const y2 = target.y + target.height / 2;
    const midX = Math.round((x1 + x2) / 2);
    const midY = Math.round((y1 + y2) / 2);
    const dx = Math.max(28, Math.abs(x1 - x2) * 0.5);
    return {
      path: `M ${x1} ${y1} C ${x1 - dx} ${y1}, ${x2 + dx} ${y2}, ${x2} ${y2}`,
      marker: 'arrow-horizontal',
      midX,
      midY,
    };
  }

  // Fallback: smooth S-curve between centers
  const sx = source.x + source.width / 2;
  const sy = source.y + source.height / 2;
  const tx = target.x + target.width / 2;
  const ty = target.y + target.height / 2;
  const midX = Math.round((sx + tx) / 2);
  const midY = Math.round((sy + ty) / 2);
  return {
    path: `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}`,
    marker: 'none',
    midX,
    midY,
  };
}

// Generate initial connections from starting mindmap hierarchy
function generateInitialEdges(rootNode: MindMapNode): MindMapEdge[] {
  if (!rootNode || !rootNode.id) return [];
  const edgeList: MindMapEdge[] = [];

  const timelineBranch = (rootNode.children || []).find((c) =>
    c.title?.includes('时间线') || c.title?.includes('行程')
  );
  const otherBranches = (rootNode.children || []).filter(
    (c) => c.id !== timelineBranch?.id
  );

  if (timelineBranch && !timelineBranch.detached) {
    edgeList.push({
      id: `edge-${rootNode.id}-${timelineBranch.id}`,
      sourceId: rootNode.id,
      targetId: timelineBranch.id,
      color: timelineBranch.color || '#D95D39',
      type: 'curve',
    });

    if (timelineBranch.children && timelineBranch.children.length > 0) {
      const dates = timelineBranch.children.filter((c) => !c.detached);
      if (dates.length > 0) {
        edgeList.push({
          id: `edge-${timelineBranch.id}-${dates[0].id}`,
          sourceId: timelineBranch.id,
          targetId: dates[0].id,
          color: '#D95D39',
          type: 'timeline-spine',
        });
      }

      for (let i = 0; i < dates.length - 1; i++) {
        edgeList.push({
          id: `edge-${dates[i].id}-${dates[i + 1].id}`,
          sourceId: dates[i].id,
          targetId: dates[i + 1].id,
          color: '#D95D39',
          type: 'timeline-spine',
        });
      }

      dates.forEach((dateNode) => {
        if (dateNode.children) {
          let prevId = dateNode.id;
          dateNode.children
            .filter((c) => !c.detached)
            .forEach((eventNode) => {
              edgeList.push({
                id: `edge-${prevId}-${eventNode.id}`,
                sourceId: prevId,
                targetId: eventNode.id,
                color: eventNode.color || dateNode.color || '#5A5A40',
                type: 'vertical-step',
              });
              prevId = eventNode.id;
            });
        }
      });
    }
  }

  otherBranches
    .filter((c) => !c.detached)
    .forEach((modNode) => {
      edgeList.push({
        id: `edge-${timelineBranch ? timelineBranch.id : rootNode.id}-${modNode.id}`,
        sourceId: timelineBranch ? timelineBranch.id : rootNode.id,
        targetId: modNode.id,
        color: modNode.color || '#5A5A40',
        type: 'curve',
      });

      if (modNode.children) {
        let prevId = modNode.id;
        modNode.children
          .filter((c) => !c.detached)
          .forEach((subItem) => {
            edgeList.push({
              id: `edge-${prevId}-${subItem.id}`,
              sourceId: prevId,
              targetId: subItem.id,
              color: modNode.color || '#5A5A40',
              type: 'vertical-step',
            });
            prevId = subItem.id;
          });
      }
    });

  return edgeList;
}

export const MindMapCanvas: React.FC<MindMapCanvasProps> = ({
  listId,
  listTitle,
  destination,
}) => {
  // Load initial root
  const [root, setRoot] = useState<MindMapNode>(() =>
    mindMapStorageService.getMindMap(listId, listTitle, destination)
  );

  // Keep root title in sync when user edits the list title in header
  useEffect(() => {
    if (listTitle && root && root.title !== listTitle) {
      setRoot((prev) => {
        if (prev.title === listTitle) return prev;
        const updated = { ...prev, title: listTitle };
        mindMapStorageService.saveMindMap(listId, updated);
        return updated;
      });
    }
  }, [listTitle, listId]);

  // Dedicated Edges State (100% Reliable Connection Line Management)
  const [edges, setEdges] = useState<MindMapEdge[]>(() => {
    try {
      const saved = localStorage.getItem(`hike_edges_${listId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return generateInitialEdges(root);
  });

  // Snapshot History for Undo/Redo
  interface Snapshot {
    root: MindMapNode;
    edges: MindMapEdge[];
  }
  const [history, setHistory] = useState<Snapshot[]>([{ root, edges }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Layout Mode: 'timeline-flow' (思维导图) with persistent storage
  const [layoutMode, setLayoutMode] = useState<MindMapLayoutMode>(() => {
    try {
      const saved = localStorage.getItem(`hike_mindmap_layoutmode_${listId}`);
      if (saved === 'timeline-flow') return 'timeline-flow';
    } catch (e) {}
    return 'timeline-flow';
  });

  // Selected Node & Edge State (Supports Box Selection & Multi-Selection)
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Helper for single node selection compatibility
  const selectedNodeId = selectedNodeIds.length === 1 ? selectedNodeIds[0] : null;
  const setSelectedNodeId = useCallback((id: string | null) => {
    setSelectedNodeIds(id ? [id] : []);
  }, []);

  // Free Connecting Mode State (Draw.io style)
  const [connectingFrom, setConnectingFrom] = useState<{
    nodeId: string;
    port: 'top' | 'bottom' | 'left' | 'right';
  } | null>(null);
  const [liveCursorPos, setLiveCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Free Node Dragging State (Multi-Node Dragging in Lockstep)
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffsets, setDragOffsets] = useState<Record<string, { x: number; y: number }>>({});
  const nodeDragStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    startPositions: Record<string, { x: number; y: number }>;
    activeIds: string[];
  } | null>(null);

  // Marquee Selection State (框选)
  const [marqueeBox, setMarqueeBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Canvas Viewport Panning State with persistence
  const [zoom, setZoom] = useState(() => {
    try {
      const saved = localStorage.getItem(`hike_mindmap_viewport_${listId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.zoom === 'number') return parsed.zoom;
      }
    } catch (e) {}
    return 0.85;
  });

  const [pan, setPan] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem(`hike_mindmap_viewport_${listId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.pan?.x === 'number' && typeof parsed.pan?.y === 'number') {
          return parsed.pan;
        }
      }
    } catch (e) {}
    return { x: 60, y: 100 };
  });

  const [isCanvasPanning, setIsCanvasPanning] = useState(false);
  const canvasPanStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Real-time Auto-Save Status
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  // Debounced Viewport Persistence
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(`hike_mindmap_viewport_${listId}`, JSON.stringify({ zoom, pan }));
      } catch (e) {}
    }, 200);
    return () => clearTimeout(timer);
  }, [zoom, pan, listId]);

  // Layout Mode Persistence
  useEffect(() => {
    try {
      localStorage.setItem(`hike_mindmap_layoutmode_${listId}`, layoutMode);
    } catch (e) {}
  }, [layoutMode, listId]);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    canvasX: number;
    canvasY: number;
    node?: MindMapNode;
    isRoot: boolean;
  } | null>(null);

  // Node Edit Modal State
  const [editingNode, setEditingNode] = useState<MindMapNode | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Mouse position tracking on canvas for Ctrl+V paste
  const mouseCanvasPosRef = useRef<{ x: number; y: number }>({ x: 300, y: 200 });
  // Node Clipboard for Ctrl+C / Ctrl+V (Supports multiple nodes)
  const clipboardRef = useRef<MindMapNode[] | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Reload when list changes and sync with cloud server
  useEffect(() => {
    const freshRoot = mindMapStorageService.getMindMap(listId, listTitle, destination);
    let freshEdges: MindMapEdge[] = [];
    try {
      const saved = localStorage.getItem(`hike_edges_${listId}`);
      if (saved) freshEdges = JSON.parse(saved);
      else freshEdges = generateInitialEdges(freshRoot);
    } catch (e) {
      freshEdges = generateInitialEdges(freshRoot);
    }
    setRoot(freshRoot);
    setEdges(freshEdges);
    setHistory([{ root: freshRoot, edges: freshEdges }]);
    setHistoryIndex(0);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setDragOffsets({});

    // Also fetch real-time cloud data
    let isCancelled = false;
    mindMapStorageService
      .fetchMindMapFromServer(listId)
      .then((serverData) => {
        if (isCancelled || !serverData) return;
        if (serverData.root) {
          setRoot(serverData.root);
          const nextEdges =
            Array.isArray(serverData.edges) && serverData.edges.length > 0
              ? serverData.edges
              : generateInitialEdges(serverData.root);
          setEdges(nextEdges);
          setHistory([{ root: serverData.root, edges: nextEdges }]);
          setHistoryIndex(0);
        }
        if (serverData.layoutMode) {
          if (
            serverData.layoutMode === 'timeline' ||
            serverData.layoutMode === 'timeline-flow'
          ) {
            setLayoutMode('timeline-flow');
          } else {
            setLayoutMode('classic-tree');
          }
        }
      })
      .catch((e) => console.warn('[MindMapCanvas] Cloud sync error:', e));

    return () => {
      isCancelled = true;
    };
  }, [listId, listTitle, destination]);

  // Push new state into history & auto-save to localStorage & cloud server
  const pushState = useCallback(
    (newRoot: MindMapNode, newEdges?: MindMapEdge[]) => {
      setSaveStatus('saving');
      const edgesToSave = newEdges ?? edges;
      setRoot(newRoot);
      setEdges(edgesToSave);
      mindMapStorageService.saveMindMap(listId, newRoot, edgesToSave, layoutMode, { zoom, pan });

      setHistory((prev) => {
        const next = prev.slice(0, historyIndex + 1);
        next.push({ root: newRoot, edges: edgesToSave });
        if (next.length > 30) next.shift();
        return next;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 29));
      setTimeout(() => setSaveStatus('saved'), 300);
    },
    [listId, historyIndex, edges, layoutMode, zoom, pan]
  );

  // Undo / Redo Actions
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const snap = history[prevIndex];
      setRoot(snap.root);
      setEdges(snap.edges);
      setHistoryIndex(prevIndex);
      mindMapStorageService.saveMindMap(listId, snap.root);
      try {
        localStorage.setItem(`hike_edges_${listId}`, JSON.stringify(snap.edges));
      } catch (e) {}
    }
  }, [historyIndex, history, listId]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const snap = history[nextIndex];
      setRoot(snap.root);
      setEdges(snap.edges);
      setHistoryIndex(nextIndex);
      mindMapStorageService.saveMindMap(listId, snap.root);
      try {
        localStorage.setItem(`hike_edges_${listId}`, JSON.stringify(snap.edges));
      } catch (e) {}
    }
  }, [historyIndex, history, listId]);

  // Screen to Canvas coordinate conversion
  const screenToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return { x: clientX, y: clientY };
      const rect = containerRef.current.getBoundingClientRect();
      const x = (clientX - rect.left - pan.x) / zoom;
      const y = (clientY - rect.top - pan.y) / zoom;
      return { x: Math.round(x), y: Math.round(y) };
    },
    [pan, zoom]
  );

  // 1. Compute Base Auto-Layout Positions
  const autoLayoutPositions = useMemo(() => {
    const posMap: Record<
      string,
      { x: number; y: number; width: number; height: number; depth: number }
    > = {};

    const edgeDefs: Array<{
      sourceId: string;
      targetId: string;
      kind: 'horizontal-spine' | 'vertical-step' | 'branch-curve';
      color?: string;
    }> = [];

    if (!root || !root.id) {
      return { posMap, edgeDefs };
    }

    if (layoutMode === 'timeline-flow') {
      // 1. Root Node at top left
      const rootSize = getNodeSize(root, 0, 'timeline-flow');
      posMap[root.id] = { x: 60, y: 40, ...rootSize, depth: 0 };

      // 2. Identify the Timeline Branch (if any)
      const timelineBranch = root.children?.find((c) =>
        c.title.includes('时间线') || c.title.includes('行程')
      );

      // Collect all Day nodes (either under timelineBranch or directly under root)
      const dayNodes: MindMapNode[] = [];
      if (timelineBranch?.children) {
        dayNodes.push(...timelineBranch.children);
      }
      (root.children || []).forEach((c) => {
        if (c.id !== timelineBranch?.id) {
          const isDay =
            c.tag?.startsWith('徒步D') ||
            c.tag?.startsWith('D') ||
            /^D\d+/i.test(c.title.trim()) ||
            (c.title.includes('第') && c.title.includes('天'));
          if (isDay && !dayNodes.some((d) => d.id === c.id)) {
            dayNodes.push(c);
          }
        }
      });

      let maxColBottomY = 400;

      const tlSize = timelineBranch
        ? getNodeSize(timelineBranch, 1, 'timeline-flow')
        : { width: 140, height: 50 };
      const tlX = 60;
      const tlY = 160;

      if (timelineBranch) {
        posMap[timelineBranch.id] = { x: tlX, y: tlY, ...tlSize, depth: 1 };
        edgeDefs.push({
          sourceId: root.id,
          targetId: timelineBranch.id,
          kind: 'branch-curve',
          color: timelineBranch.color || '#D95D39',
        });
      }

      // Lay out Day Nodes horizontally in columns with UNIFIED grid row alignment
      const startColX = timelineBranch ? tlX + TIMELINE_COL_WIDTH + TIMELINE_COL_GAP : 60;
      const colBottomY: Record<number, number> = {
        0: tlY + tlSize.height,
      };

      // 1. Calculate max height among all date headers so row 0 starts at identical Y
      let maxDateHeaderHeight = 54;
      dayNodes.forEach((d) => {
        const sz = getNodeSize(d, 2, 'timeline-flow');
        if (sz.height > maxDateHeaderHeight) {
          maxDateHeaderHeight = sz.height;
        }
      });

      // 2. Find max row count across all days
      let maxEventRows = 0;
      dayNodes.forEach((d) => {
        const count = (!d.collapsed && d.children) ? d.children.length : 0;
        if (count > maxEventRows) maxEventRows = count;
      });

      // 3. Find max height for each row index r across all days
      const maxRowHeights: number[] = [];
      for (let r = 0; r < maxEventRows; r++) {
        let maxH = 54;
        dayNodes.forEach((d) => {
          if (!d.collapsed && d.children && d.children[r]) {
            const sz = getNodeSize(d.children[r], 3, 'timeline-flow');
            if (sz.height > maxH) maxH = sz.height;
          }
        });
        maxRowHeights[r] = maxH;
      }

      // 4. Compute uniform row Y coordinates across ALL daily columns
      const eventRowY: number[] = [];
      let currentEventY = tlY + maxDateHeaderHeight + TIMELINE_ROW_GAP;
      for (let r = 0; r < maxEventRows; r++) {
        eventRowY[r] = currentEventY;
        currentEventY += maxRowHeights[r] + TIMELINE_ROW_GAP;
      }

      dayNodes.forEach((dateNode, colIdx) => {
        const dateSize = getNodeSize(dateNode, 2, 'timeline-flow');
        const thisColX = startColX + colIdx * (TIMELINE_COL_WIDTH + TIMELINE_COL_GAP);

        // Every date header aligns on tlY with uniform height
        posMap[dateNode.id] = {
          x: thisColX,
          y: tlY,
          width: dateSize.width,
          height: maxDateHeaderHeight,
          depth: 2,
        };

        if (timelineBranch && colIdx === 0) {
          edgeDefs.push({
            sourceId: timelineBranch.id,
            targetId: dateNode.id,
            kind: 'horizontal-spine',
            color: '#D95D39',
          });
        }
        if (colIdx < dayNodes.length - 1) {
          edgeDefs.push({
            sourceId: dateNode.id,
            targetId: dayNodes[colIdx + 1].id,
            kind: 'horizontal-spine',
            color: '#D95D39',
          });
        }

        let prevId = dateNode.id;

        // Vertical Events under this Date aligned to uniform grid rows
        if (!dateNode.collapsed && dateNode.children) {
          dateNode.children.forEach((eventNode, r) => {
            const eventSize = getNodeSize(eventNode, 3, 'timeline-flow');
            const thisY = eventRowY[r];

            posMap[eventNode.id] = {
              x: thisColX,
              y: thisY,
              width: eventSize.width,
              height: maxRowHeights[r],
              depth: 3,
            };

            edgeDefs.push({
              sourceId: prevId,
              targetId: eventNode.id,
              kind: 'vertical-step',
              color: eventNode.color || dateNode.color || '#5A5A40',
            });

            prevId = eventNode.id;
          });
        }

        const lastRowIdx = (!dateNode.collapsed && dateNode.children) ? dateNode.children.length - 1 : -1;
        const colBottom = lastRowIdx >= 0
          ? eventRowY[lastRowIdx] + maxRowHeights[lastRowIdx]
          : tlY + maxDateHeaderHeight;
        colBottomY[colIdx + 1] = colBottom;
        if (colBottom > maxColBottomY) {
          maxColBottomY = colBottom;
        }
      });

      // 3. Other Branches & Modules (02检查, 03高反撤退, 04装备)
      // Exactly matching the target version: positioned directly under columns 0, 1, 2
      const dayNodeIdSet = new Set(dayNodes.map((d) => d.id));
      const otherBranches = (root.children || []).filter(
        (c) => c.id !== timelineBranch?.id && !dayNodeIdSet.has(c.id)
      );

      if (otherBranches.length > 0) {
        const col0Bottom = colBottomY[0] || 220;
        const col1Bottom = colBottomY[1] || 480;
        const col2Bottom = colBottomY[2] || 480;
        const baseBottomY = Math.max(col0Bottom, col1Bottom, col2Bottom, 480) + 56;

        otherBranches.forEach((modNode, modIdx) => {
          const modSize = getNodeSize(modNode, 1, 'timeline-flow');
          const modX = 60 + modIdx * (TIMELINE_COL_WIDTH + TIMELINE_COL_GAP);
          const modY = baseBottomY;

          posMap[modNode.id] = { x: modX, y: modY, ...modSize, depth: 1 };

          if (!modNode.detached && !modNode.isFloating) {
            edgeDefs.push({
              sourceId: timelineBranch ? timelineBranch.id : root.id,
              targetId: modNode.id,
              kind: 'branch-curve',
              color: modNode.color || '#5A5A40',
            });
          }

          let prevY = modY;
          let prevH = modSize.height;
          let prevId = modNode.id;

          if (!modNode.collapsed && modNode.children) {
            modNode.children.forEach((subItem) => {
              const subSize = getNodeSize(subItem, 2, 'timeline-flow');
              const itemY = prevY + prevH + 18;

              posMap[subItem.id] = { x: modX, y: itemY, ...subSize, depth: 2 };

              edgeDefs.push({
                sourceId: prevId,
                targetId: subItem.id,
                kind: 'vertical-step',
                color: modNode.color || '#5A5A40',
              });

              prevId = subItem.id;
              prevY = itemY;
              prevH = subSize.height;
            });
          }
        });
      }
    } else {
      // Classic Tree Mode (Hierarchical Left-to-Right layout with Post-Order Subtree Bounding)
      const subtreeHeightMap: Record<string, number> = {};
      const computeSubtreeHeight = (n: MindMapNode, depth: number): number => {
        const ownHeight = getNodeSize(n, depth, 'classic-tree').height;
        if (n.collapsed || !n.children || n.children.length === 0) {
          subtreeHeightMap[n.id] = ownHeight;
          return ownHeight;
        }
        let childrenTotalH = 0;
        n.children.forEach((c, idx) => {
          if (idx > 0) childrenTotalH += TREE_NODE_GAP;
          childrenTotalH += computeSubtreeHeight(c, depth + 1);
        });
        const total = Math.max(ownHeight, childrenTotalH);
        subtreeHeightMap[n.id] = total;
        return total;
      };

      computeSubtreeHeight(root, 0);

      const placeNode = (n: MindMapNode, x: number, startY: number, depth: number) => {
        const size = getNodeSize(n, depth, 'classic-tree');
        posMap[n.id] = { x, y: startY, ...size, depth };

        if (!n.collapsed && n.children && n.children.length > 0) {
          const childX = x + size.width + TREE_LEVEL_GAP;
          let childY = startY;

          for (const child of n.children) {
            edgeDefs.push({
              sourceId: n.id,
              targetId: child.id,
              kind: 'branch-curve',
              color: child.color || n.color || '#5A5A40',
            });
            placeNode(child, childX, childY, depth + 1);
            const childSubtreeH =
              subtreeHeightMap[child.id] ||
              getNodeSize(child, depth + 1, 'classic-tree').height;
            childY += childSubtreeH + TREE_NODE_GAP;
          }
        }
      };

      placeNode(root, 60, 60, 0);
    }

    // 4. Universal Safety Pass: Guarantee EVERY node in the tree has a distinct, non-overlapping slot!
    let fallbackX = 60;
    let fallbackY = 1200;
    const ensurePlaced = (n: MindMapNode, d: number) => {
      if (!posMap[n.id]) {
        const sz = getNodeSize(n, d, layoutMode);
        posMap[n.id] = { x: fallbackX, y: fallbackY, ...sz, depth: d };
        fallbackX += sz.width + 48;
        if (fallbackX > 2000) {
          fallbackX = 60;
          fallbackY += sz.height + 40;
        }
      }
      if (n.children) {
        n.children.forEach((c) => ensurePlaced(c, d + 1));
      }
    };
    ensurePlaced(root, 0);

    return { posMap, edgeDefs };
  }, [root, layoutMode]);

  // 2. Compute Final Rendered Nodes (Combining custom positions + drag offsets + defaults)
  const { renderedNodes, renderedEdges, nodeMap } = useMemo(() => {
    const nodes: MindMapLayoutNode[] = [];
    const nMap: Record<string, MindMapLayoutNode> = {};

    if (!root || !root.id) {
      return { renderedNodes: [], renderedEdges: [], nodeMap: {} };
    }

    function traverse(node: MindMapNode, depth: number) {
      const defaultPos = autoLayoutPositions.posMap[node.id] || {
        x: 60 + depth * 180,
        y: 60 + depth * 60,
        width: 220,
        height: 60,
        depth,
      };

      let currentX = node.position ? node.position.x : defaultPos.x;
      let currentY = node.position ? node.position.y : defaultPos.y;

      if (dragOffsets[node.id]) {
        currentX += dragOffsets[node.id].x;
        currentY += dragOffsets[node.id].y;
      }

      const layoutNode: MindMapLayoutNode = {
        data: node,
        x: Math.round(currentX),
        y: Math.round(currentY),
        width: defaultPos.width,
        height: defaultPos.height,
        depth,
        hasChildren: !!(node.children && node.children.length > 0),
        isCollapsed: !!node.collapsed,
      };

      nodes.push(layoutNode);
      nMap[node.id] = layoutNode;

      if (!node.collapsed && node.children) {
        node.children.forEach((c) => traverse(c, depth + 1));
      }
    }

    traverse(root, 0);

    // Compute Rendered Edges Directly from Explicit `edges` State
    const edgeList: Array<MindMapEdge & { path: string; midX: number; midY: number }> = [];
    for (const edge of edges) {
      const src = nMap[edge.sourceId];
      const tgt = nMap[edge.targetId];

      if (src && tgt) {
        const smart = getSmartPath(
          src,
          tgt,
          edge.type === 'timeline-spine'
            ? 'horizontal-spine'
            : edge.type === 'vertical-step'
            ? 'vertical-step'
            : 'branch-curve'
        );
        edgeList.push({
          ...edge,
          x1: src.x,
          y1: src.y,
          x2: tgt.x,
          y2: tgt.y,
          midX: smart.midX,
          midY: smart.midY,
          path: smart.path,
        });
      }
    }

    return { renderedNodes: nodes, renderedEdges: edgeList, nodeMap: nMap };
  }, [root, autoLayoutPositions, dragOffsets, edges]);

  // Viewport Fit View (Adaptive for all resolutions: 4K, 2K, 1080p, Laptops, Mobile)
  const handleFitView = useCallback(() => {
    if (!containerRef.current || renderedNodes.length === 0) return;
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;
    if (containerW <= 0 || containerH <= 0) return;

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    for (const n of renderedNodes) {
      if (n.x < minX) minX = n.x;
      if (n.x + n.width > maxX) maxX = n.x + n.width;
      if (n.y < minY) minY = n.y;
      if (n.y + n.height > maxY) maxY = n.y + n.height;
    }

    const paddingX = Math.max(60, containerW * 0.04);
    const paddingY = Math.max(70, containerH * 0.06);
    const bboxW = maxX - minX + paddingX * 2;
    const bboxH = maxY - minY + paddingY * 2;

    const scaleX = containerW / bboxW;
    const scaleY = containerH / bboxH;
    let newZoom = Math.min(scaleX, scaleY);
    // Comfortably clamp zoom: min 0.35 on super complex maps, max 1.25 on high-res displays
    newZoom = Math.max(0.35, Math.min(1.25, newZoom));

    const newPanX = (containerW - (maxX + minX) * newZoom) / 2;
    const newPanY = (containerH - (maxY + minY) * newZoom) / 2;

    setZoom(+newZoom.toFixed(2));
    setPan({ x: Math.round(newPanX), y: Math.round(newPanY) });
  }, [renderedNodes]);

  const handleFitViewRef = useRef(handleFitView);
  handleFitViewRef.current = handleFitView;

  // Split-screen Route Map state (Left 40% Map, Right 60% Mind Map)
  const [isMapOpen, setIsMapOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(`hike_mindmap_mapopen_${listId}`);
      if (saved !== null) return saved === 'true';
    } catch (e) {}
    return typeof window !== 'undefined' && window.innerWidth >= 1024;
  });

  useEffect(() => {
    try {
      localStorage.setItem(`hike_mindmap_mapopen_${listId}`, String(isMapOpen));
    } catch (e) {}
  }, [isMapOpen, listId]);

  const toggleMap = useCallback(() => {
    setIsMapOpen((prev) => {
      const next = !prev;
      setTimeout(() => handleFitViewRef.current(), 200);
      return next;
    });
  }, []);

  // Auto-adapt when screen resolution or browser window size changes (DOM resize only)
  useEffect(() => {
    if (!containerRef.current) return;
    let timer: NodeJS.Timeout;
    let prevW = containerRef.current.clientWidth;
    let prevH = containerRef.current.clientHeight;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      // ONLY trigger when the DOM container's dimensions physically changed by more than 10px
      if (Math.abs(width - prevW) > 10 || Math.abs(height - prevH) > 10) {
        prevW = width;
        prevH = height;
        clearTimeout(timer);
        timer = setTimeout(() => {
          handleFitViewRef.current();
        }, 100);
      }
    });
    ro.observe(containerRef.current);
    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, []); // Run ONLY once on mount / unmount - NEVER rebind on node mutations!

  useEffect(() => {
    // 仅当用户未保存过自定义视口时才执行初始自动居中自适应，否则尊重用户调整过的缩放与平移
    const hasSaved = !!localStorage.getItem(`hike_mindmap_viewport_${listId}`);
    if (!hasSaved) {
      const timer = setTimeout(() => handleFitViewRef.current(), 150);
      return () => clearTimeout(timer);
    }
  }, [listId]); // ONLY depend on listId, NEVER on handleFitView!

  // Reset to Clean Auto Layout (Clear Manual Positions & Apply Clean Grid)
  const handleAutoLayout = useCallback(() => {
    // 1. Clear individual node manual overrides
    const cleared = mindMapStorageService.clearAllPositions(root);

    // 2. Unflag detached/floating and remove position on all nodes so auto-layout cleanly integrates all nodes
    const unflag = (n: MindMapNode): MindMapNode => ({
      ...n,
      position: undefined,
      detached: false,
      isFloating: false,
      children: n.children?.map(unflag),
    });
    const cleanTree = unflag(cleared);

    // 3. Reset any active selections & drag offsets
    setDragOffsets({});
    setSelectedNodeIds([]);
    setSelectedEdgeId(null);

    // 4. Force layoutMode to timeline-flow (the requested clean version)
    setLayoutMode('timeline-flow');

    // 5. Regenerate clean edges matching timeline layout
    const freshEdges = generateInitialEdges(cleanTree);

    // 6. Remove saved viewport so auto-layout fits cleanly once
    try {
      localStorage.removeItem(`hike_mindmap_viewport_${listId}`);
    } catch (e) {}

    pushState(cleanTree, freshEdges);
    setTimeout(() => handleFitViewRef.current(), 60);
  }, [root, listId, pushState]);

  // Node Dragging Handlers (Multi-Selection & Batch Dragging Support)
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('.port-handle')) return;

    // If currently in connecting mode, clicking this node completes the connection!
    if (connectingFrom) {
      e.stopPropagation();
      handleConnectToTarget(nodeId);
      return;
    }

    e.stopPropagation();
    setSelectedEdgeId(null);
    setDraggingNodeId(nodeId);

    let activeIds: string[];
    if (e.shiftKey) {
      activeIds = selectedNodeIds.includes(nodeId)
        ? selectedNodeIds.filter((id) => id !== nodeId)
        : [...selectedNodeIds, nodeId];
      setSelectedNodeIds(activeIds);
    } else {
      // If clicking on an already selected node among multiple selected, keep all of them!
      if (selectedNodeIds.includes(nodeId)) {
        activeIds = selectedNodeIds;
      } else {
        activeIds = [nodeId];
        setSelectedNodeIds(activeIds);
      }
    }

    // Record initial positions of ALL nodes being dragged together
    const initialPositions: Record<string, { x: number; y: number }> = {};
    for (const id of activeIds) {
      const n = nodeMap[id];
      if (n) {
        initialPositions[id] = { x: n.x, y: n.y };
      }
    }

    nodeDragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startPositions: initialPositions,
      activeIds,
    };
    setDragOffsets({});
  };

  const handleGlobalMouseMove = (e: React.MouseEvent) => {
    const cPos = screenToCanvas(e.clientX, e.clientY);
    mouseCanvasPosRef.current = cPos;

    // 1. Track live connection line
    if (connectingFrom) {
      setLiveCursorPos(cPos);
      return;
    }

    // 2. Dragging multiple nodes in lockstep
    if (draggingNodeId && nodeDragStartRef.current) {
      const dx = (e.clientX - nodeDragStartRef.current.mouseX) / zoom;
      const dy = (e.clientY - nodeDragStartRef.current.mouseY) / zoom;
      const nextOffsets: Record<string, { x: number; y: number }> = {};
      for (const id of nodeDragStartRef.current.activeIds) {
        nextOffsets[id] = { x: dx, y: dy };
      }
      setDragOffsets(nextOffsets);
      return;
    }

    // 3. Marquee Selection (框选)
    if (marqueeBox) {
      setMarqueeBox((prev) => (prev ? { ...prev, currentX: cPos.x, currentY: cPos.y } : null));

      const x1 = Math.min(marqueeBox.startX, cPos.x);
      const y1 = Math.min(marqueeBox.startY, cPos.y);
      const x2 = Math.max(marqueeBox.startX, cPos.x);
      const y2 = Math.max(marqueeBox.startY, cPos.y);

      // If dragged more than 3px, hit test nodes
      if (x2 - x1 > 3 || y2 - y1 > 3) {
        const hitIds = renderedNodes
          .filter((n) => {
            // AABB intersection
            return !(
              n.x + n.width < x1 ||
              n.x > x2 ||
              n.y + n.height < y1 ||
              n.y > y2
            );
          })
          .map((n) => n.data.id);

        setSelectedNodeIds(hitIds);
        setSelectedEdgeId(null);
      }
      return;
    }

    // 4. Panning canvas
    if (isCanvasPanning) {
      const dx = e.clientX - canvasPanStartRef.current.x;
      const dy = e.clientY - canvasPanStartRef.current.y;
      setPan({
        x: canvasPanStartRef.current.panX + dx,
        y: canvasPanStartRef.current.panY + dy,
      });
    }
  };

  const handleGlobalMouseUp = (e: React.MouseEvent) => {
    // 1. If currently in connecting mode and released over a node, complete connection!
    if (connectingFrom) {
      const cPos = screenToCanvas(e.clientX, e.clientY);
      const target = renderedNodes.find(
        (n) =>
          n.data.id !== connectingFrom.nodeId &&
          cPos.x >= n.x - 10 &&
          cPos.x <= n.x + n.width + 10 &&
          cPos.y >= n.y - 10 &&
          cPos.y <= n.y + n.height + 10
      );
      if (target) {
        handleConnectToTarget(target.data.id);
        return;
      }
    }

    // 2. Commit dragged nodes positions
    if (draggingNodeId && nodeDragStartRef.current) {
      const finalPosMap: Record<string, { x: number; y: number }> = {};
      for (const id of nodeDragStartRef.current.activeIds) {
        const s = nodeDragStartRef.current.startPositions[id];
        if (s) {
          const offset = dragOffsets[id] || { x: 0, y: 0 };
          finalPosMap[id] = {
            x: Math.round(s.x + offset.x),
            y: Math.round(s.y + offset.y),
          };
        }
      }

      const updated = mindMapStorageService.updateNodePositions(root, finalPosMap);
      pushState(updated);
      setDragOffsets({});
      setDraggingNodeId(null);
      nodeDragStartRef.current = null;
    }

    // 3. Clear marquee selection box
    if (marqueeBox) {
      setMarqueeBox(null);
    }

    setIsCanvasPanning(false);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.mindmap-card') || target.closest('button')) return;

    if (connectingFrom) {
      setConnectingFrom(null);
      setLiveCursorPos(null);
    }

    setContextMenu(null);

    // Middle click OR spacebar held -> Pan Canvas
    if (e.button === 1 || isSpacePressed) {
      setIsCanvasPanning(true);
      canvasPanStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
      return;
    }

    // Left click on empty canvas -> Marquee Box Selection (框选)
    if (e.button === 0) {
      const cPos = screenToCanvas(e.clientX, e.clientY);
      setMarqueeBox({
        startX: cPos.x,
        startY: cPos.y,
        currentX: cPos.x,
        currentY: cPos.y,
      });

      if (!e.shiftKey) {
        setSelectedNodeIds([]);
        setSelectedEdgeId(null);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((z) => {
      const next = Math.max(0.25, Math.min(2.0, z * factor));
      return +next.toFixed(2);
    });
  };

  // Complete Connection to Target Node: Supports ANY node to ANY node, and replaces old connection (re-link)
  const handleConnectToTarget = useCallback(
    (targetId: string) => {
      if (!connectingFrom) return;
      const sourceId = connectingFrom.nodeId;
      if (sourceId === targetId) {
        setConnectingFrom(null);
        setLiveCursorPos(null);
        return;
      }

      // Check if identical edge already exists
      const exists = edges.some(
        (e) => e.sourceId === sourceId && e.targetId === targetId
      );
      if (exists) {
        setConnectingFrom(null);
        setLiveCursorPos(null);
        return;
      }

      // 更改连线 / 替换旧连线:
      // 如果目标节点 targetId 已经有其他入度连线指向它，自动切断并替换为新的这条连线！
      const filteredEdges = edges.filter((e) => e.targetId !== targetId);

      const newEdge: MindMapEdge = {
        id: 'edge-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
        sourceId,
        targetId,
        color: '#2563EB',
        type: 'curve',
      };

      // 确保 target 节点取消 detached 状态
      const cloned = mindMapStorageService.cloneNode(root);
      const tgtNode = mindMapStorageService.findNode(cloned, targetId);
      if (tgtNode) {
        tgtNode.detached = false;
        tgtNode.isFloating = false;
      }

      pushState(cloned, [...filteredEdges, newEdge]);
      setConnectingFrom(null);
      setLiveCursorPos(null);
    },
    [connectingFrom, edges, root, pushState]
  );

  // Direct Node Deletion: Preserves all children (never accidentally deletes unselected nodes!)
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      if (nodeId === root.id) return;
      const nextRoot = mindMapStorageService.deleteNode(root, nodeId);
      const nextEdges = edges.filter(
        (e) => e.sourceId !== nodeId && e.targetId !== nodeId
      );
      pushState(nextRoot, nextEdges);
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
    },
    [root, edges, pushState, selectedNodeId]
  );

  // Direct Edge Deletion (via X button or Delete key)
  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      const nextEdges = edges.filter((e) => e.id !== edgeId);
      pushState(root, nextEdges);
      if (selectedEdgeId === edgeId) setSelectedEdgeId(null);
    },
    [edges, root, pushState, selectedEdgeId]
  );

  // Disconnect from parent node
  const handleDisconnectParent = useCallback(
    (nodeId: string) => {
      if (nodeId === root.id) return;
      const nextEdges = edges.filter((e) => e.targetId !== nodeId);
      pushState(root, nextEdges);
    },
    [root, edges, pushState]
  );

  // Right-Click Context Menu Trigger (on Node or Canvas)
  const handleNodeContextMenu = (e: React.MouseEvent, node: MindMapNode) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      canvasX: 0,
      canvasY: 0,
      node,
      isRoot: node.id === root.id,
    });
  };

  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const cPos = screenToCanvas(e.clientX, e.clientY);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      canvasX: cPos.x,
      canvasY: cPos.y,
      isRoot: false,
    });
  };

  // Add Child Itinerary Event under Day Node (vertical downward connection)
  const handleAddChildItinerary = useCallback(
    (parentNode: MindMapNode) => {
      const parentPos = nodeMap[parentNode.id];
      const newChildId = 'event-' + Date.now().toString(36);
      const newRoot = mindMapStorageService.addChildNode(root, root.id, {
        id: newChildId,
        title: '新行程活动安排',
        time: '09:00',
        description: '点击编辑时段与详情',
        color: parentNode.color || '#5A5A40',
        position: parentPos
          ? { x: parentPos.x, y: parentPos.y + parentPos.height + 36 }
          : undefined,
      });

      const newEdge: MindMapEdge = {
        id: 'edge-' + parentNode.id + '-' + newChildId,
        sourceId: parentNode.id,
        targetId: newChildId,
        color: parentNode.color || '#5A5A40',
        type: 'vertical-step',
      };

      pushState(newRoot, [...edges, newEdge]);

      // Open edit modal directly so user can type immediately
      setTimeout(() => {
        const created = mindMapStorageService.findNode(newRoot, newChildId);
        if (created) {
          setEditingNode(created);
          setIsEditModalOpen(true);
        }
      }, 50);
    },
    [root, nodeMap, edges, pushState]
  );

  // Add Day Node via Canvas Right Click (Independent, unconnected, at click point)
  const handleAddDayNode = useCallback(
    (canvasX: number, canvasY: number) => {
      const daysCount = (root.children || []).filter(
        (c) => c.tag?.startsWith('徒步D') || c.title.includes('D')
      ).length;
      const newDayId = 'day-' + Date.now().toString(36);

      const newRoot = mindMapStorageService.addChildNode(root, root.id, {
        id: newDayId,
        title: `10/${daysCount + 1} (D${daysCount + 1}) 行程`,
        tag: `徒步D${daysCount + 1}`,
        time: '全天',
        color: '#D95D39',
        position: { x: canvasX, y: canvasY },
        detached: true,
        isFloating: true,
      });
      pushState(newRoot);
      setSelectedNodeId(newDayId);
    },
    [root, pushState]
  );

  // Add Time/Event Node via Canvas Right Click (Independent, unconnected, at click point)
  const handleAddTimeNode = useCallback(
    (canvasX: number, canvasY: number) => {
      const newId = 'time-' + Date.now().toString(36);
      const newRoot = mindMapStorageService.addChildNode(root, root.id, {
        id: newId,
        title: '14:00 冲顶或营地拔营',
        time: '14:00',
        elevation: '4600m',
        color: '#2E7D5B',
        position: { x: canvasX, y: canvasY },
        detached: true,
        isFloating: true,
      });
      pushState(newRoot);
      setSelectedNodeId(newId);
    },
    [root, pushState]
  );

  // Add Category Branch via Canvas Right Click (Independent, unconnected, at click point)
  const handleAddCategoryBranch = useCallback(
    (canvasX: number, canvasY: number) => {
      const newId = 'cat-' + Date.now().toString(36);
      const newRoot = mindMapStorageService.addChildNode(root, root.id, {
        id: newId,
        title: '新主题规划模块',
        description: '点击编辑内容',
        color: '#B7791F',
        position: { x: canvasX, y: canvasY },
        detached: true,
        isFloating: true,
      });
      pushState(newRoot);
      setSelectedNodeId(newId);
    },
    [root, pushState]
  );

  const handleAddChild = useCallback(
    (parentId: string) => {
      const parentPos = nodeMap[parentId];
      const newRoot = mindMapStorageService.addChildNode(root, parentId, {
        title: '新节点',
        description: '点击编辑详情',
        time: '09:00',
        position: parentPos
          ? { x: parentPos.x, y: parentPos.y + parentPos.height + 40 }
          : undefined,
      });
      pushState(newRoot);
    },
    [root, nodeMap, pushState]
  );

  const handleAddSibling = useCallback(
    (targetId: string) => {
      const targetPos = nodeMap[targetId];
      const newRoot = mindMapStorageService.addSiblingNode(root, targetId, {
        title: '新同级节点',
        description: '点击编辑详情',
        position: targetPos
          ? { x: targetPos.x + targetPos.width + 40, y: targetPos.y }
          : undefined,
      });
      pushState(newRoot);
    },
    [root, nodeMap, pushState]
  );

  const handleOpenEdit = useCallback((node: MindMapNode) => {
    setEditingNode(node);
    setIsEditModalOpen(true);
  }, []);

  const handleSaveNode = useCallback(
    (nodeId: string, updates: Partial<MindMapNode>) => {
      pushState(mindMapStorageService.updateNode(root, nodeId, updates));
    },
    [root, pushState]
  );

  const handleMoveUp = useCallback(
    (nodeId: string) => {
      pushState(mindMapStorageService.moveNodeUp(root, nodeId));
    },
    [root, pushState]
  );

  const handleMoveDown = useCallback(
    (nodeId: string) => {
      pushState(mindMapStorageService.moveNodeDown(root, nodeId));
    },
    [root, pushState]
  );

  const handleDuplicate = useCallback(
    (nodeId: string) => {
      pushState(mindMapStorageService.duplicateNode(root, nodeId));
    },
    [root, pushState]
  );

  const handleChangeColor = useCallback(
    (nodeId: string, color: string) => {
      pushState(mindMapStorageService.updateNode(root, nodeId, { color }));
    },
    [root, pushState]
  );

  const handleToggleCollapse = useCallback(
    (nodeId: string) => {
      const node = mindMapStorageService.findNode(root, nodeId);
      if (!node) return;
      pushState(
        mindMapStorageService.updateNode(root, nodeId, { collapsed: !node.collapsed })
      );
    },
    [root, pushState]
  );

  const handleToggleCompleted = useCallback(
    (nodeId: string) => {
      const node = mindMapStorageService.findNode(root, nodeId);
      if (!node) return;
      pushState(
        mindMapStorageService.updateNode(root, nodeId, { completed: !node.completed })
      );
    },
    [root, pushState]
  );

  // Keyboard Shortcuts (Del direct delete, Tab, Enter, Escape, Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Spacebar for quick Canvas Panning (Hand mode)
      if (e.code === 'Space' && activeTag !== 'input' && activeTag !== 'textarea') {
        setIsSpacePressed(true);
      }

      // Escape -> Cancel connecting / deselect
      if (e.key === 'Escape') {
        setConnectingFrom(null);
        setSelectedNodeIds([]);
        setSelectedEdgeId(null);
        setContextMenu(null);
        return;
      }

      // Copy Nodes (Ctrl+C / Cmd+C, supports multi-selection!)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (selectedNodeIds.length > 0) {
          const copiedList: MindMapNode[] = [];
          for (const id of selectedNodeIds) {
            const node = mindMapStorageService.findNode(root, id);
            if (node && node.id !== root.id) {
              copiedList.push(mindMapStorageService.cloneNode(node));
            }
          }
          if (copiedList.length > 0) {
            e.preventDefault();
            clipboardRef.current = copiedList;
          }
        }
        return;
      }

      // Paste Nodes (Ctrl+V / Cmd+V, supports multi-node layout!)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (clipboardRef.current && clipboardRef.current.length > 0) {
          e.preventDefault();
          const mPos = mouseCanvasPosRef.current;
          const copiedList = clipboardRef.current;

          let minX = Infinity,
            minY = Infinity;
          for (const item of copiedList) {
            const px = item.position?.x ?? 0;
            const py = item.position?.y ?? 0;
            if (px < minX) minX = px;
            if (py < minY) minY = py;
          }

          const newSelectedIds: string[] = [];
          const cloned = mindMapStorageService.cloneNode(root);
          cloned.children = cloned.children || [];

          copiedList.forEach((origNode) => {
            const copy = mindMapStorageService.cloneNode(origNode);
            const newId =
              'node-' +
              Date.now().toString(36) +
              '-' +
              Math.random().toString(36).substring(2, 6);
            copy.id = newId;
            copy.detached = true;
            copy.isFloating = true;

            const origX = origNode.position?.x ?? minX;
            const origY = origNode.position?.y ?? minY;
            copy.position = {
              x: Math.round(mPos.x + (origX - minX)),
              y: Math.round(mPos.y + (origY - minY)),
            };

            const renewIds = (n: MindMapNode) => {
              n.id =
                'node-' +
                Date.now().toString(36) +
                '-' +
                Math.random().toString(36).substring(2, 6);
              if (n.children) n.children.forEach(renewIds);
            };
            if (copy.children) copy.children.forEach(renewIds);

            cloned.children.push(copy);
            newSelectedIds.push(newId);
          });

          pushState(cloned);
          setSelectedNodeIds(newSelectedIds);
        }
        return;
      }

      // Delete Nodes or Edge (Priority to selected edge, then multi-selected nodes)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedEdgeId) {
          handleDeleteEdge(selectedEdgeId);
          return;
        }
        if (selectedNodeIds.length > 0) {
          let currentRoot = root;
          let currentEdges = edges;
          for (const id of selectedNodeIds) {
            if (id === root.id) continue;
            currentRoot = mindMapStorageService.deleteNode(currentRoot, id);
            currentEdges = currentEdges.filter(
              (edge) => edge.sourceId !== id && edge.targetId !== id
            );
          }
          pushState(currentRoot, currentEdges);
          setSelectedNodeIds([]);
          return;
        }
        return;
      }

      if (!selectedNodeId) return;
      const targetNode = mindMapStorageService.findNode(root, selectedNodeId);
      if (!targetNode) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddSibling(selectedNodeId);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        handleAddChild(selectedNodeId);
      } else if (e.key === ' ' || e.key === 'F2') {
        e.preventDefault();
        handleOpenEdit(targetNode);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsCanvasPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    selectedNodeId,
    selectedNodeIds,
    selectedEdgeId,
    root,
    edges,
    handleAddSibling,
    handleAddChild,
    handleDeleteNode,
    handleDeleteEdge,
    handleOpenEdit,
    handleUndo,
    handleRedo,
    pushState,
  ]);

  // Export to PNG
  const handleExportPng = () => {
    if (renderedNodes.length === 0) return;

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    for (const n of renderedNodes) {
      if (n.x < minX) minX = n.x;
      if (n.x + n.width > maxX) maxX = n.x + n.width;
      if (n.y < minY) minY = n.y;
      if (n.y + n.height > maxY) maxY = n.y + n.height;
    }

    const padding = 60;
    const canvasWidth = maxX - minX + padding * 2;
    const canvasHeight = maxY - minY + padding * 2;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth * 2;
    canvas.height = canvasHeight * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(2, 2);
    ctx.fillStyle = '#FAF8F5';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw Edges
    for (const edge of renderedEdges) {
      if (!edge.path) continue;
      const p = new Path2D(edge.path);
      ctx.save();
      ctx.translate(-minX + padding, -minY + padding);
      ctx.strokeStyle = edge.color || '#5A5A40';
      ctx.lineWidth = edge.type === 'timeline-spine' ? 3 : 2;
      ctx.stroke(p);
      ctx.restore();
    }

    // Draw Nodes
    for (const n of renderedNodes) {
      const nx = n.x - minX + padding;
      const ny = n.y - minY + padding;
      const nw = n.width;
      const nh = n.height;
      const isRoot = n.depth === 0;

      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = n.data.color || (isRoot ? '#183153' : '#D9D4C7');
      ctx.lineWidth = isRoot ? 2.5 : 1.5;

      const radius = 12;
      ctx.beginPath();
      ctx.roundRect(nx, ny, nw, nh, radius);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#2C2C2C';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(n.data.title, nx + 14, ny + 26);

      ctx.restore();
    }

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${root.title || '格聂行程导图'}.png`;
    a.click();
  };

  return (
    <div className="flex flex-col md:flex-row w-full h-full min-h-0 relative overflow-hidden select-none bg-[#FAF8F5]">
      {/* Left: Two-Step Outdoor Route Map Panel (40% width) */}
      {isMapOpen && (
        <div className="w-full md:w-[40%] xl:w-[40%] h-[42vh] md:h-full shrink-0 relative z-10 border-b md:border-b-0 md:border-r border-[#D9D4C7]">
          <RouteMapPanel
            listId={listId}
            listTitle={listTitle}
            destination={destination}
            onClose={toggleMap}
          />
        </div>
      )}

      {/* Right: Mind Map Canvas Viewport (60% width when map open, 100% when closed) */}
      <div
        onMouseMove={handleGlobalMouseMove}
        onMouseUp={handleGlobalMouseUp}
        onContextMenu={handleCanvasContextMenu}
        className="flex-1 w-full h-full min-w-0 flex flex-col relative overflow-hidden select-none bg-[#FAF8F5]"
      >
        {/* Top Floating Control Bar */}
        <div className="absolute top-2.5 sm:top-4 left-2.5 sm:left-4 right-2.5 sm:right-4 z-20 pointer-events-auto">
          <MindMapToolbar
            isMapOpen={isMapOpen}
            onToggleMap={toggleMap}
            zoom={zoom}
            layoutMode={layoutMode}
            saveStatus={saveStatus}
            onToggleLayoutMode={(mode) => setLayoutMode(mode)}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onZoomIn={() => setZoom((z) => Math.min(2.0, +(z + 0.1).toFixed(2)))}
          onZoomOut={() => setZoom((z) => Math.max(0.25, +(z - 0.1).toFixed(2)))}
          onResetZoom={() => setZoom(1)}
          onFitView={handleFitView}
          onAutoLayout={handleAutoLayout}
          onExpandAll={() => {
            const expandAllNodes = (n: MindMapNode): MindMapNode => ({
              ...n,
              collapsed: false,
              children: n.children?.map(expandAllNodes),
            });
            pushState(expandAllNodes(root));
          }}
          onCollapseAll={() => {
            const collapseChildren = (n: MindMapNode): MindMapNode => ({
              ...n,
              collapsed: n.id !== root.id,
              children: n.children?.map(collapseChildren),
            });
            pushState(collapseChildren(root));
          }}
          onExportPng={handleExportPng}
          onSelectPreset={(presetId) => {
            const cloned = mindMapStorageService.resetToPreset(listId, presetId);
            const freshEdges = generateInitialEdges(cloned);
            pushState(cloned, freshEdges);
            setTimeout(() => handleFitView(), 50);
          }}
          presets={mindMapStorageService.getAvailablePresets()}
          totalNodes={renderedNodes.length}
        />
      </div>

      {/* Main Canvas Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleCanvasMouseDown}
        onWheel={handleWheel}
        className={`w-full h-full cursor-grab ${
          isCanvasPanning ? 'cursor-grabbing' : connectingFrom ? 'cursor-crosshair' : ''
        } relative overflow-hidden`}
        style={{
          backgroundImage:
            'radial-gradient(circle, #D9D4C7 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px',
        }}
      >
        {/* Transform Layer */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: isCanvasPanning || draggingNodeId ? 'none' : 'transform 0.08s ease-out',
            position: 'absolute',
            left: 0,
            top: 0,
            width: '1px',
            height: '1px',
          }}
        >
          {/* SVG Connecting Edges Layer */}
          <svg
            className="overflow-visible absolute left-0 top-0 pointer-events-auto"
            style={{ width: '1px', height: '1px' }}
          >
            <defs>
              <marker
                id="spine-arrow"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#D95D39" />
              </marker>
              <marker
                id="vertical-arrow"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#5A5A40" />
              </marker>
              <marker
                id="custom-arrow"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#2563EB" />
              </marker>
            </defs>

            {/* Finished Edges */}
            {renderedEdges.map((edge) => {
              if (!edge.path) return null;
              const isSelected = selectedEdgeId === edge.id;
              const isSpine = edge.type === 'timeline-spine';
              const isVertical = edge.type === 'vertical-step';

              const midX = edge.midX ?? Math.round((edge.x1 + edge.x2) / 2);
              const midY = edge.midY ?? Math.round((edge.y1 + edge.y2) / 2);

              return (
                <g key={edge.id} className="group/edge">
                  {/* Clickable Wider Hit Area */}
                  <path
                    d={edge.path}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={18}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEdgeId(edge.id);
                      setSelectedNodeId(null);
                    }}
                  />
                  {/* Visible Edge Stroke */}
                  <path
                    d={edge.path}
                    fill="none"
                    stroke={isSelected ? '#2563EB' : edge.color || '#5A5A40'}
                    strokeWidth={isSelected ? 4 : isSpine ? 3 : 2}
                    markerEnd={
                      isSelected
                        ? 'url(#custom-arrow)'
                        : isSpine
                        ? 'url(#spine-arrow)'
                        : isVertical
                        ? 'url(#vertical-arrow)'
                        : 'url(#custom-arrow)'
                    }
                    className="transition-colors pointer-events-none"
                  />

                  {/* Delete X Button at the Exact Center of Connection Line */}
                  <foreignObject
                    x={midX - 11}
                    y={midY - 11}
                    width={22}
                    height={22}
                    className={`overflow-visible pointer-events-auto transition-all duration-150 ${
                      isSelected
                        ? 'opacity-100 scale-105 z-30'
                        : 'opacity-0 group-hover/edge:opacity-100'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEdge(edge.id);
                      }}
                      className="w-5 h-5 rounded-full bg-white border border-[#D95D39] text-[#D95D39] hover:bg-[#D95D39] hover:text-white shadow-md flex items-center justify-center transition-transform hover:scale-125 cursor-pointer select-none"
                      title="删除此连线 (Delete)"
                    >
                      <X className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  </foreignObject>
                </g>
              );
            })}

            {/* Live Interactive Connecting Line (while dragging from anchor handle) */}
            {connectingFrom && liveCursorPos && nodeMap[connectingFrom.nodeId] && (
              (() => {
                const src = nodeMap[connectingFrom.nodeId];
                let sx = src.x + src.width / 2;
                let sy = src.y + src.height / 2;
                if (connectingFrom.port === 'top') sy = src.y;
                if (connectingFrom.port === 'bottom') sy = src.y + src.height;
                if (connectingFrom.port === 'left') sx = src.x;
                if (connectingFrom.port === 'right') sx = src.x + src.width;

                const tx = liveCursorPos.x;
                const ty = liveCursorPos.y;
                const midX = (sx + tx) / 2;

                return (
                  <path
                    d={`M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}`}
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    strokeDasharray="6 4"
                    className="animate-pulse"
                  />
                );
              })()
            )}
          </svg>

          {/* Node Cards Layer */}
          {renderedNodes.map((layoutNode) => {
            const node = layoutNode.data;
            const isSelected = selectedNodeIds.includes(node.id);
            const isRoot = layoutNode.depth === 0;
            const isCurrentlyDragged = draggingNodeId === node.id;
            const isConnectSource = connectingFrom?.nodeId === node.id;
            const accentColor = node.color || (isRoot ? '#183153' : '#5A5A40');

            return (
              <div
                key={node.id}
                data-node-id={node.id}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onContextMenu={(e) => handleNodeContextMenu(e, node)}
                onMouseUp={(e) => {
                  if (connectingFrom && connectingFrom.nodeId !== node.id) {
                    e.stopPropagation();
                    handleConnectToTarget(node.id);
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (connectingFrom) {
                    handleConnectToTarget(node.id);
                  } else {
                    if (e.shiftKey) {
                      const next = selectedNodeIds.includes(node.id)
                        ? selectedNodeIds.filter((id) => id !== node.id)
                        : [...selectedNodeIds, node.id];
                      setSelectedNodeIds(next);
                    } else {
                      setSelectedNodeIds([node.id]);
                    }
                    setSelectedEdgeId(null);
                  }
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  handleOpenEdit(node);
                }}
                style={{
                  transform: `translate(${layoutNode.x}px, ${layoutNode.y}px)`,
                  width: `${layoutNode.width}px`,
                  minHeight: `${layoutNode.height}px`,
                  zIndex: isCurrentlyDragged ? 40 : isSelected ? 30 : 10,
                }}
                className={`mindmap-card group absolute left-0 top-0 cursor-grab select-none flex flex-col transition-all duration-100 ${
                  isCurrentlyDragged
                    ? 'cursor-grabbing scale-102 shadow-2xl ring-2 ring-[#2563EB]'
                    : isSelected
                    ? 'scale-101 ring-2 ring-[#2563EB] border-[#2563EB] shadow-lg'
                    : ''
                }`}
              >
                {/* 4 Draw.io-Style Connection Anchor Handles (Top, Bottom, Left, Right) */}
                <button
                  type="button"
                  title="从顶部拉线连接"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setConnectingFrom({ nodeId: node.id, port: 'top' });
                  }}
                  className="port-handle absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-[#2563EB] shadow-xs opacity-0 group-hover:opacity-100 hover:scale-125 hover:bg-[#2563EB] transition z-30"
                />
                <button
                  type="button"
                  title="从底部拉线连接 (用于在下方连接当天行程)"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setConnectingFrom({ nodeId: node.id, port: 'bottom' });
                  }}
                  className="port-handle absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-[#2563EB] shadow-xs opacity-0 group-hover:opacity-100 hover:scale-125 hover:bg-[#2563EB] transition z-30"
                />
                <button
                  type="button"
                  title="从左侧拉线连接"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setConnectingFrom({ nodeId: node.id, port: 'left' });
                  }}
                  className="port-handle absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-[#2563EB] shadow-xs opacity-0 group-hover:opacity-100 hover:scale-125 hover:bg-[#2563EB] transition z-30"
                />
                <button
                  type="button"
                  title="从右侧拉线连接 (横向时间线推进)"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setConnectingFrom({ nodeId: node.id, port: 'right' });
                  }}
                  className="port-handle absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-[#2563EB] shadow-xs opacity-0 group-hover:opacity-100 hover:scale-125 hover:bg-[#2563EB] transition z-30"
                />

                {/* Inner Card Container */}
                <div
                  className={`relative p-2.5 sm:p-3 rounded-2xl bg-white border shadow-xs hover:shadow-md transition-all duration-150 flex-1 flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#5A5A40] ring-2 ring-[#5A5A40]/50 shadow-md'
                      : isConnectSource
                      ? 'border-[#2563EB] ring-2 ring-[#2563EB] shadow-md'
                      : isRoot
                      ? 'border-[#183153] ring-1 ring-[#183153]/25'
                      : connectingFrom
                      ? 'hover:ring-2 hover:ring-[#2E7D5B] hover:scale-101'
                      : 'border-[#D9D4C7] hover:border-[#5A5A40]'
                  } ${node.completed ? 'bg-[#F9FBF9]' : ''}`}
                  style={{
                    borderLeftWidth: '5px',
                    borderLeftColor: accentColor,
                  }}
                >
                  {/* Top Metadata Row */}
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      {/* Drag Grip Indicator */}
                      <span className="text-[#C4BEB2] group-hover:text-[#5A5A40] transition shrink-0 cursor-grab">
                        <GripHorizontal className="w-3.5 h-3.5" />
                      </span>

                      {/* Interactive Checkbox */}
                      {!isRoot && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleCompleted(node.id);
                          }}
                          className="text-[#7A7465] hover:text-[#2E7D5B] transition shrink-0"
                          title={node.completed ? '标记为未完成' : '打勾完成'}
                        >
                          {node.completed ? (
                            <CheckSquare className="w-3.5 h-3.5 text-[#2E7D5B]" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-[#A8A29E]" />
                          )}
                        </button>
                      )}

                      {/* Time Badge */}
                      {node.time && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#FAF8F5] border border-[#EAE7DF] text-[#D95D39] font-mono font-bold text-[10px] rounded-md shrink-0">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{node.time}</span>
                        </span>
                      )}

                      {/* Elevation Badge */}
                      {node.elevation && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#EAF6F0] border border-[#2E7D5B]/20 text-[#2E7D5B] font-bold text-[10px] rounded-md shrink-0">
                          <Mountain className="w-2.5 h-2.5" />
                          <span>{node.elevation}</span>
                        </span>
                      )}
                    </div>

                    {/* Tag Badge */}
                    {node.tag && (
                      <span
                        className="px-1.5 py-0.5 text-[9.5px] font-bold rounded-md tracking-wider truncate max-w-[80px]"
                        style={{
                          backgroundColor: `${accentColor}15`,
                          color: accentColor,
                        }}
                      >
                        {node.tag}
                      </span>
                    )}
                  </div>

                  {/* Node Title */}
                  <h4
                    className={`font-bold tracking-tight text-[#2C2C2C] leading-snug break-words ${
                      isRoot
                        ? 'text-sm'
                        : layoutNode.depth === 1
                        ? 'text-xs'
                        : 'text-[11.5px]'
                    } ${node.completed ? 'line-through text-[#7A7465]' : ''}`}
                  >
                    {node.title}
                  </h4>

                  {/* Description Preview */}
                  {node.description && (
                    <p className="text-[10px] text-[#7A7465] mt-1 line-clamp-2 leading-relaxed font-normal">
                      {node.description}
                    </p>
                  )}

                  {/* Expand / Collapse Indicator */}
                  {layoutNode.hasChildren && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleCollapse(node.id);
                      }}
                      className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white border border-[#D9D4C7] hover:border-[#5A5A40] flex items-center justify-center text-xs font-bold text-[#5A5A40] shadow-2xs transition hover:scale-110 z-20"
                      title={layoutNode.isCollapsed ? '展开子分支' : '折叠子分支'}
                    >
                      {layoutNode.isCollapsed ? (
                        <Plus className="w-2.5 h-2.5 stroke-[2.5]" />
                      ) : (
                        <ChevronDown className="w-2.5 h-2.5 stroke-[2.5]" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Marquee Selection Box (框选半透明高亮选框) */}
          {marqueeBox && (
            <div
              className="absolute pointer-events-none border-2 border-[#2563EB] bg-[#2563EB]/15 rounded-xs z-50 transition-none shadow-xs"
              style={{
                left: `${Math.min(marqueeBox.startX, marqueeBox.currentX)}px`,
                top: `${Math.min(marqueeBox.startY, marqueeBox.currentY)}px`,
                width: `${Math.abs(marqueeBox.currentX - marqueeBox.startX)}px`,
                height: `${Math.abs(marqueeBox.currentY - marqueeBox.startY)}px`,
              }}
            />
          )}
        </div>
      </div>

      {/* Floating Multi-Select Action Bar (多选批量操作悬浮条) */}
      {selectedNodeIds.length > 1 && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-40 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full shadow-2xl border border-[#2563EB]/40 flex items-center gap-3 text-sm text-[#183153] font-medium animate-in fade-in slide-in-from-bottom-2 pointer-events-auto">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] animate-pulse" />
            已框选 <strong className="text-[#2563EB] font-bold">{selectedNodeIds.length}</strong> 个节点
          </span>
          <span className="text-xs text-[#5A5A40] border-l border-gray-200 pl-3">
            拖动任一选中节点可整体平移 · 按 <kbd className="font-mono bg-[#EAE7DF] px-1 py-0.5 rounded">Del</kbd> 批量删除 · <kbd className="font-mono bg-[#EAE7DF] px-1 py-0.5 rounded">Ctrl+C</kbd> 批量复制
          </span>
          <button
            type="button"
            onClick={() => setSelectedNodeIds([])}
            className="text-xs px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition cursor-pointer"
          >
            取消多选
          </button>
        </div>
      )}

      {/* Floating Bottom Helper */}
      <div className="absolute bottom-3 left-4 right-4 z-10 hidden sm:flex items-center justify-between text-[11px] text-[#7A7465] pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1 bg-white/90 backdrop-blur border border-[#D9D4C7] rounded-xl shadow-2xs">
          <Info className="w-3.5 h-3.5 text-[#5A5A40]" />
          <span>
            💡 <strong>鼠标左键空白处可框选多选</strong> · 拖拽任一选中节点可<strong>整体平移</strong> · 悬停边缘蓝点<strong>拉线连接</strong> · 按住<strong>空格+拖拽</strong>可平移画布 · 选中按 <kbd className="font-mono bg-[#EAE7DF] px-1 py-0.5 rounded">Del</kbd> 删除 · <kbd className="font-mono bg-[#EAE7DF] px-1 py-0.5 rounded">Ctrl+Z</kbd> 撤销
          </span>
        </div>

        <div className="flex items-center gap-2">
          {selectedEdgeId && (
            <button
              type="button"
              onClick={() => handleDeleteEdge(selectedEdgeId)}
              className="pointer-events-auto flex items-center gap-1 px-2.5 py-1 bg-[#FDE8E8] text-[#B33A3A] font-bold rounded-xl shadow-2xs transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>删除选中连线</span>
            </button>
          )}

          <div className="px-2.5 py-1 bg-white/90 backdrop-blur border border-[#D9D4C7] rounded-xl shadow-2xs">
            当前视图：<strong>思维导图</strong>
          </div>
        </div>
      </div>
      </div>

      {/* Context Menu (Both Node & Empty Canvas) */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          canvasX={contextMenu.canvasX}
          canvasY={contextMenu.canvasY}
          node={contextMenu.node}
          isRoot={contextMenu.isRoot}
          onClose={() => setContextMenu(null)}
          onAddChildItinerary={handleAddChildItinerary}
          onAddChild={handleAddChild}
          onAddSibling={handleAddSibling}
          onStartConnect={(n) => setConnectingFrom({ nodeId: n.id, port: 'bottom' })}
          onEdit={handleOpenEdit}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onDuplicate={handleDuplicate}
          onDelete={handleDeleteNode}
          onChangeColor={handleChangeColor}
          onAddDayNode={handleAddDayNode}
          onAddTimeNode={handleAddTimeNode}
          onAddCategoryBranch={handleAddCategoryBranch}
          onFitView={handleFitView}
          onAutoLayout={handleAutoLayout}
        />
      )}

      {/* Node Edit Modal */}
      <NodeEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        node={editingNode}
        isRoot={editingNode?.id === root.id}
        onSave={handleSaveNode}
        onDelete={handleDeleteNode}
      />
    </div>
  );
};
