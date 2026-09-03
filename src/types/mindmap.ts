export type MindMapLayoutMode = 'timeline-flow' | 'classic-tree';

export interface MindMapNode {
  id: string;
  title: string;
  description?: string;
  time?: string; // e.g. "10:00", "08:30-12:00"
  elevation?: string; // e.g. "4350m", "4870m"
  tag?: string;
  color?: string; // Hex color or Tailwind accent identifier
  collapsed?: boolean;
  completed?: boolean; // Checkbox打卡状态
  position?: { x: number; y: number }; // 自由拖拽定位坐标
  detached?: boolean; // 是否为独立未连线节点
  isFloating?: boolean; // 自由浮动
  children?: MindMapNode[];
}

export interface MindMapLayoutNode {
  data: MindMapNode;
  x: number;
  y: number;
  width: number;
  height: number;
  hasChildren: boolean;
  isCollapsed: boolean;
  depth: number;
  isDateColumnHeader?: boolean;
  children?: MindMapLayoutNode[];
}

export interface MindMapEdge {
  id: string;
  sourceId: string;
  targetId: string;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  midX?: number;
  midY?: number;
  path?: string; // SVG path command d
  color?: string;
  type?: 'timeline-spine' | 'vertical-step' | 'curve';
  label?: string;
}

export type MindMapTagType =
  | 'timeline'
  | 'camp'
  | 'transport'
  | 'check'
  | 'safety'
  | 'gear'
  | 'photo'
  | 'note';

export interface MindMapPreset {
  id: string;
  title: string;
  description: string;
  root: MindMapNode;
}
