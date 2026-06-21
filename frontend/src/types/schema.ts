// ============================================
// Core Data Types
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  phone?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  logoUrl?: string;
  ownerId: string;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  orgId: string;
  ownerId: string;
  currentIterationId?: string;
  isPublic: boolean;
  thumbnailUrl?: string;
  settings: ProjectSettings;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface ProjectSettings {
  default_device: 'desktop' | 'tablet' | 'mobile';
  grid_visible: boolean;
  snap_to_grid: boolean;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: 'viewer' | 'editor' | 'admin' | 'owner';
  inviteEmail?: string;
  invitedBy?: string;
  joinedAt: string;
}

export interface Iteration {
  id: string;
  projectId: string;
  name: string;
  version: string;
  status: 'editing' | 'reviewing' | 'approved' | 'archived';
  description?: string;
  basedOnId?: string;
  createdBy: string;
  snapshotUrl?: string;
  isCurrent: boolean;
  reviewDeadline?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Page {
  id: string;
  iterationId: string;
  name: string;
  slug?: string;
  description?: string;
  pageType: 'screen' | 'component' | 'template';
  deviceType: 'desktop' | 'tablet' | 'mobile';
  viewportW: number;
  viewportH: number;
  bgColor: string;
  sortOrder: number;
  flowGroup?: string;
  isCover: boolean;
  aiPrompt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface Component {
  id: string;
  pageId: string;
  componentType: string;
  name?: string;
  props: Record<string, any>;
  layout: ComponentLayout;
  styles: Record<string, any>;
  interactions: Interaction[];
  states: Record<string, any>;
  parentId?: string;
  sortOrder: number;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ComponentLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  zIndex?: number;
}

export interface Interaction {
  trigger: 'click' | 'hover' | 'focus' | 'change';
  action: 'navigate' | 'toggle' | 'show' | 'hide' | 'submit';
  target: string;
}

export interface Annotation {
  id: string;
  componentId: string;
  pageId: string;
  iterationId: string;
  annotationType: 'requirement' | 'note' | 'status' | 'question' | 'todo' | 'bug';
  content: string;
  status: 'open' | 'resolved' | 'accepted' | 'rejected';
  priority: number;
  color: string;
  tag?: string;
  createdBy: string;
  assignedTo?: string;
  dueDate?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnnotationComment {
  id: string;
  annotationId: string;
  userId: string;
  content: string;
  mentions: Array<{
    userId: string;
    start: number;
    end: number;
  }>;
  attachments: Array<{
    url: string;
    name: string;
    type: string;
  }>;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PreviewLink {
  id: string;
  iterationId: string;
  token: string;
  name?: string;
  password?: string;
  viewCount: number;
  uniqueVisitors: number;
  expiresAt?: string;
  createdBy: string;
  lastAccessedAt?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Activity {
  id: string;
  projectId: string;
  userId: string;
  actionType: string;
  targetType?: string;
  targetId?: string;
  metadata: Record<string, any>;
  createdAt: string;
}

// ============================================
// Component Type Definitions
// ============================================

export type ComponentType =
  | 'Text'
  | 'Input'
  | 'Button'
  | 'Image'
  | 'Card'
  | 'NavBar'
  | 'TabBar'
  | 'List'
  | 'IconButton'
  | 'Checkbox'
  | 'Switch'
  | 'Badge'
  | 'Divider'
  | 'Avatar'
  | 'Tag'
  | 'Link'
  | 'Textarea'
  | 'Select'
  | 'Radio'
  | 'Slider'
  | 'DatePicker'
  | 'Toast'
  | 'Modal'
  | 'Alert'
  | 'Loading'
  | 'Sidebar'
  | 'Header'
  | 'Footer'
  | 'Grid'
  | 'Stack'
  | 'Table'
  | 'Form'
  | 'Stepper'
  | 'Pagination'
  | 'Empty'
  | 'Tooltip'
  | 'Progress';

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
  };
}

// ============================================
// Canvas Types
// ============================================

export interface CanvasState {
  scale: number;
  position: { x: number; y: number };
  selectedComponentId?: string;
  isDragging: boolean;
}

export interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}
