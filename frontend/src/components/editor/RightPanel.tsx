"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHistoryStore } from "@/stores/history";
import { useTemplatesStore } from "@/stores/templates";

// ============================================
// 常量定义
// ============================================

const FONT_FAMILIES = [
  { value: "Arial", label: "Arial" },
  { value: "Helvetica", label: "Helvetica" },
  { value: "Microsoft YaHei", label: "微软雅黑" },
  { value: "PingFang SC", label: "苹方" },
  { value: "SimSun", label: "宋体" },
  { value: "SimHei", label: "黑体" },
  { value: "Georgia", label: "Georgia" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Courier New", label: "Courier New" },
];

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64];

const COLOR_PRESETS = [
  "#000000", "#374151", "#6B7280", "#9CA3AF", "#D1D5DB", "#F3F4F6", "#FFFFFF",
  "#EF4444", "#F97316", "#F59E0B", "#EAB308", "#84CC16", "#22C55E", "#10B981",
  "#14B8A6", "#06B6D4", "#0EA5E9", "#3B82F6", "#6366F1", "#8B5CF6", "#A855F7",
  "#D946EF", "#EC4899", "#F43F5E",
];

const ALIGN_OPTIONS = [
  { value: "left", icon: "⫷", label: "左对齐" },
  { value: "center", icon: "⫼", label: "居中" },
  { value: "right", icon: "⫸", label: "右对齐" },
];

// ============================================
// 组件定义
// ============================================

interface RightPanelProps {
  selectedComponent: any;
  onComponentUpdate: (componentId: string, data: any) => void;
  pageId?: string;
}

export function RightPanel({ selectedComponent, onComponentUpdate, pageId }: RightPanelProps) {
  const { push: pushHistory } = useHistoryStore();
  const { addTemplate, getTemplatesForType, applyTemplate } = useTemplatesStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [props, setProps] = useState<Record<string, any>>({});
  const [layout, setLayout] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [styles, setStyles] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<"props" | "style" | "layout">("props");
  const [propSearch, setPropSearch] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateName, setTemplateName] = useState("");

  useEffect(() => {
    if (selectedComponent) {
      setProps(selectedComponent.props || {});
      setLayout(selectedComponent.layout || { x: 0, y: 0, w: 0, h: 0 });
      setStyles(selectedComponent.styles || {});
    }
  }, [selectedComponent]);

  // 防抖定时器引用（用于批量记录历史）
  const historyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingHistoryRef = useRef<any>(null);

  const handlePropChange = (key: string, value: any) => {
    const oldProps = { ...props };
    const newProps = { ...props, [key]: value };
    setProps(newProps);
    if (selectedComponent) {
      // 立即更新组件（实时预览）
      onComponentUpdate(selectedComponent.id, { props: newProps });

      // 防抖记录历史（300ms 内的修改合并为一条）
      if (historyTimerRef.current) {
        clearTimeout(historyTimerRef.current);
      }
      pendingHistoryRef.current = {
        type: "update",
        description: `修改 "${selectedComponent.name || selectedComponent.componentType}" 的 ${key}`,
        data: {
          pageId: pageId || "",
          componentId: selectedComponent.id,
          before: { props: oldProps },
          after: { props: newProps },
        },
      };
      historyTimerRef.current = setTimeout(() => {
        if (pendingHistoryRef.current) {
          pushHistory(pendingHistoryRef.current);
          pendingHistoryRef.current = null;
        }
      }, 300);
    }
  };

  const handleLayoutChange = (key: string, value: number) => {
    // 防止 NaN
    if (isNaN(value)) return;

    const oldLayout = { ...layout };
    const newLayout = { ...layout, [key]: value };
    setLayout(newLayout);
    if (selectedComponent) {
      onComponentUpdate(selectedComponent.id, { layout: newLayout });

      if (historyTimerRef.current) {
        clearTimeout(historyTimerRef.current);
      }
      pendingHistoryRef.current = {
        type: "update",
        description: `修改 "${selectedComponent.name || selectedComponent.componentType}" 的 ${key}`,
        data: {
          pageId: pageId || "",
          componentId: selectedComponent.id,
          before: { layout: oldLayout },
          after: { layout: newLayout },
        },
      };
      historyTimerRef.current = setTimeout(() => {
        if (pendingHistoryRef.current) {
          pushHistory(pendingHistoryRef.current);
          pendingHistoryRef.current = null;
        }
      }, 300);
    }
  };

  const handleStyleChange = (key: string, value: any) => {
    const oldStyles = { ...styles };
    const newStyles = { ...styles, [key]: value };
    setStyles(newStyles);
    if (selectedComponent) {
      onComponentUpdate(selectedComponent.id, { styles: newStyles });

      if (historyTimerRef.current) {
        clearTimeout(historyTimerRef.current);
      }
      pendingHistoryRef.current = {
        type: "update",
        description: `修改 "${selectedComponent.name || selectedComponent.componentType}" 的样式 ${key}`,
        data: {
          pageId: pageId || "",
          componentId: selectedComponent.id,
          before: { styles: oldStyles },
          after: { styles: newStyles },
        },
      };
      historyTimerRef.current = setTimeout(() => {
        if (pendingHistoryRef.current) {
          pushHistory(pendingHistoryRef.current);
          pendingHistoryRef.current = null;
        }
      }, 300);
    }
  };

  // 折叠状态
  if (isCollapsed) {
    return (
      <div className="w-10 bg-white border-l flex flex-col items-center py-4 shrink-0">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 hover:bg-gray-100 rounded"
          title="展开面板"
        >
          ←
        </button>
      </div>
    );
  }

  // 无选中组件
  if (!selectedComponent) {
    return (
      <div className="w-72 bg-white border-l flex flex-col shrink-0">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-sm">属性</h3>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 hover:bg-gray-100 rounded text-muted-foreground"
          >
            →
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          选择一个组件以编辑属性
        </div>
      </div>
    );
  }

  const isLocked = selectedComponent.isLocked || false;

  const handleToggleLock = () => {
    onComponentUpdate(selectedComponent.id, { isLocked: !isLocked });
  };

  return (
    <div className="w-72 lg:w-80 xl:w-96 bg-white border-l flex flex-col shrink-0 transition-all duration-200">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm truncate">{selectedComponent.componentType}</h3>
            {selectedComponent.name && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{selectedComponent.name}</p>
            )}
          </div>
          <div className="flex items-center space-x-1 shrink-0">
            <button
              onClick={handleToggleLock}
              className={`p-1 rounded text-sm ${
                isLocked ? "text-amber-500 bg-amber-50" : "hover:bg-gray-100 text-muted-foreground"
              }`}
              title={isLocked ? "解锁组件" : "锁定组件"}
            >
              {isLocked ? "🔒" : "🔓"}
            </button>
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1 hover:bg-gray-100 rounded text-muted-foreground"
            >
              →
            </button>
          </div>
        </div>
        {/* Template actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex-1 px-2 py-1 text-xs bg-gray-50 hover:bg-gray-100 rounded border"
          >
            📋 模板
          </button>
          <button
            onClick={() => {
              const name = prompt("保存为模板:", selectedComponent.name || selectedComponent.componentType);
              if (name) {
                addTemplate(name, selectedComponent.componentType, props, styles);
              }
            }}
            className="flex-1 px-2 py-1 text-xs bg-gray-50 hover:bg-gray-100 rounded border"
          >
            💾 保存
          </button>
        </div>
      </div>

      {/* Templates dropdown */}
      {showTemplates && (
        <div className="p-3 border-b bg-gray-50">
          <div className="text-xs font-medium mb-2">组件模板</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {getTemplatesForType(selectedComponent.componentType).length === 0 ? (
              <p className="text-xs text-muted-foreground">暂无模板</p>
            ) : (
              getTemplatesForType(selectedComponent.componentType).map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    const applied = applyTemplate(template.id);
                    if (applied) {
                      setProps(applied.props);
                      setStyles(applied.styles);
                      onComponentUpdate(selectedComponent.id, {
                        props: applied.props,
                        styles: applied.styles,
                      });
                    }
                    setShowTemplates(false);
                  }}
                  className="w-full px-2 py-1.5 text-xs text-left hover:bg-white rounded border"
                >
                  {template.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">组件预览</span>
          <span className="text-xs font-mono text-muted-foreground bg-gray-100 px-2 py-0.5 rounded">
            {layout.w} × {layout.h}
          </span>
        </div>
        <div
          className="border rounded-lg overflow-hidden bg-white shadow-sm"
          style={{ minHeight: 60 }}
        >
          <ComponentPreview
            type={selectedComponent.componentType}
            props={props}
            styles={styles}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b bg-gray-50/50">
        <div className="flex">
          {(["props", "style", "layout"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-blue-500 text-blue-600 bg-white"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-gray-100"
              }`}
            >
              {tab === "props" ? "📝 属性" : tab === "style" ? "🎨 样式" : "📐 布局"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Props Tab */}
        {activeTab === "props" && (
          <div className="p-4 space-y-4 animate-in fade-in duration-200">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="搜索属性..."
                value={propSearch}
                onChange={(e) => setPropSearch(e.target.value)}
                className="w-full px-3 py-1.5 pl-8 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="absolute left-2.5 top-2 text-muted-foreground">🔍</span>
            </div>
            <ComponentPropsEditor
              componentType={selectedComponent.componentType}
              props={props}
              onPropChange={handlePropChange}
              searchQuery={propSearch}
            />
          </div>
        )}

        {/* Style Tab */}
        {activeTab === "style" && (
          <div className="p-4 space-y-4 animate-in fade-in duration-200">
            <StyleEditor styles={styles} onStyleChange={handleStyleChange} />
          </div>
        )}

        {/* Layout Tab */}
        {activeTab === "layout" && (
          <div className="p-4 space-y-4 animate-in fade-in duration-200">
            <LayoutEditor layout={layout} onLayoutChange={handleLayoutChange} />

            {/* Layer Controls */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">层级</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const newSortOrder = (selectedComponent.sortOrder || 0) + 1000;
                    onComponentUpdate(selectedComponent.id, { sortOrder: newSortOrder });
                  }}
                  className="px-2 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 rounded border"
                  title="置顶"
                >
                  ⬆ 置顶
                </button>
                <button
                  onClick={() => {
                    const newSortOrder = Math.max(0, (selectedComponent.sortOrder || 0) - 1000);
                    onComponentUpdate(selectedComponent.id, { sortOrder: newSortOrder });
                  }}
                  className="px-2 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 rounded border"
                  title="置底"
                >
                  ⬇ 置底
                </button>
                <button
                  onClick={() => {
                    const newSortOrder = (selectedComponent.sortOrder || 0) + 1;
                    onComponentUpdate(selectedComponent.id, { sortOrder: newSortOrder });
                  }}
                  className="px-2 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 rounded border"
                  title="上移一层"
                >
                  ↑ 上移
                </button>
                <button
                  onClick={() => {
                    const newSortOrder = Math.max(0, (selectedComponent.sortOrder || 0) - 1);
                    onComponentUpdate(selectedComponent.id, { sortOrder: newSortOrder });
                  }}
                  className="px-2 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 rounded border"
                  title="下移一层"
                >
                  ↓ 下移
                </button>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                当前层级: {selectedComponent.sortOrder || 0}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// 组件属性编辑器（带懒加载）
// ============================================

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="text-sm text-muted-foreground">加载中...</div>
    </div>
  );
}

function ComponentPropsEditor({
  componentType,
  props,
  onPropChange,
  searchQuery = "",
}: {
  componentType: string;
  props: Record<string, any>;
  onPropChange: (key: string, value: any) => void;
  searchQuery?: string;
}) {
  // 根据组件类型渲染对应的编辑器
  const renderEditor = () => {
    switch (componentType) {
      case "Text":
        return <TextProps props={props} onChange={onPropChange} />;
      case "Button":
        return <ButtonProps props={props} onChange={onPropChange} />;
      case "Input":
        return <InputProps props={props} onChange={onPropChange} />;
      case "Card":
        return <CardProps props={props} onChange={onPropChange} />;
      case "Image":
        return <ImageProps props={props} onChange={onPropChange} />;
    case "Tag":
      return <TagProps props={props} onChange={onPropChange} />;
    case "Select":
      return <SelectProps props={props} onChange={onPropChange} />;
    case "Switch":
      return <SwitchProps props={props} onChange={onPropChange} />;
    case "Checkbox":
      return <CheckboxProps props={props} onChange={onPropChange} />;
    case "Radio":
      return <RadioProps props={props} onChange={onPropChange} />;
    case "Textarea":
      return <TextareaProps props={props} onChange={onPropChange} />;
    case "Badge":
      return <BadgeProps props={props} onChange={onPropChange} />;
    case "Avatar":
      return <AvatarProps props={props} onChange={onPropChange} />;
    case "Link":
      return <LinkProps props={props} onChange={onPropChange} />;
    case "Divider":
      return <DividerProps props={props} onChange={onPropChange} />;
    case "Icon":
      return <IconProps props={props} onChange={onPropChange} />;
    case "Modal":
      return <ModalProps props={props} onChange={onPropChange} />;
    case "List":
      return <ListProps props={props} onChange={onPropChange} />;
    case "Table":
      return <TableProps props={props} onChange={onPropChange} />;
    case "Alert":
      return <AlertProps props={props} onChange={onPropChange} />;
    case "Progress":
      return <ProgressProps props={props} onChange={onPropChange} />;
    default:
      return <GenericProps props={props} onChange={onPropChange} />;
    }
  };

  return <LoadingFallback />;
}

// ============================================
// 各组件属性编辑器
// ============================================

function TextProps({ props, onChange }: { props: any; onChange: (k: string, v: any) => void }) {
  return (
    <>
      <PropField label="内容">
        <textarea
          value={props.content || ""}
          onChange={(e) => onChange("content", e.target.value)}
          className="w-full p-2 border rounded text-sm resize-none"
          rows={3}
        />
      </PropField>
      <PropField label="字号">
        <select
          value={props.fontSize || 14}
          onChange={(e) => onChange("fontSize", Number(e.target.value))}
          className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
        >
          {FONT_SIZES.map((size) => (
            <option key={size} value={size}>{size}px</option>
          ))}
        </select>
      </PropField>
      <PropField label="字体">
        <select
          value={props.fontFamily || "Arial"}
          onChange={(e) => onChange("fontFamily", e.target.value)}
          className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font.value} value={font.value}>{font.label}</option>
          ))}
        </select>
      </PropField>
      <PropField label="字重">
        <select
          value={props.fontWeight || "normal"}
          onChange={(e) => onChange("fontWeight", e.target.value)}
          className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="normal">正常</option>
          <option value="bold">粗体</option>
          <option value="lighter">细体</option>
        </select>
      </PropField>
      <PropField label="颜色">
        <ColorPicker value={props.color || "#000000"} onChange={(v) => onChange("color", v)} />
      </PropField>
      <PropField label="对齐">
        <AlignPicker value={props.align || "left"} onChange={(v) => onChange("align", v)} />
      </PropField>
      <PropField label="行高">
        <Input
          type="number"
          value={props.lineHeight || 1.5}
          onChange={(e) => onChange("lineHeight", Number(e.target.value))}
          className="h-8 text-sm"
          step={0.1}
        />
      </PropField>
    </>
  );
}

function ButtonProps({ props, onChange }: { props: any; onChange: (k: string, v: any) => void }) {
  return (
    <>
      <PropField label="文本">
        <Input
          value={props.text || ""}
          onChange={(e) => onChange("text", e.target.value)}
          className="h-8 text-sm"
        />
      </PropField>
      <PropField label="样式">
        <select
          value={props.variant || "primary"}
          onChange={(e) => onChange("variant", e.target.value)}
          className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="primary">主要</option>
          <option value="secondary">次要</option>
          <option value="ghost">幽灵</option>
          <option value="danger">危险</option>
          <option value="outline">轮廓</option>
          <option value="link">链接</option>
        </select>
      </PropField>
      <PropField label="尺寸">
        <select
          value={props.size || "md"}
          onChange={(e) => onChange("size", e.target.value)}
          className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="sm">小</option>
          <option value="md">中</option>
          <option value="lg">大</option>
        </select>
      </PropField>
      <PropField label="圆角">
        <Input
          type="number"
          value={props.borderRadius || 6}
          onChange={(e) => onChange("borderRadius", Number(e.target.value))}
          className="h-8 text-sm"
        />
      </PropField>
      <PropField label="禁用">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={props.disabled || false}
            onChange={(e) => onChange("disabled", e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">禁用状态</span>
        </label>
      </PropField>
    </>
  );
}

function InputProps({ props, onChange }: { props: any; onChange: (k: string, v: any) => void }) {
  return (
    <>
      <PropField label="标签">
        <Input
          value={props.label || ""}
          onChange={(e) => onChange("label", e.target.value)}
          className="h-8 text-sm"
        />
      </PropField>
      <PropField label="占位符">
        <Input
          value={props.placeholder || ""}
          onChange={(e) => onChange("placeholder", e.target.value)}
          className="h-8 text-sm"
        />
      </PropField>
      <PropField label="类型">
        <select
          value={props.type || "text"}
          onChange={(e) => onChange("type", e.target.value)}
          className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="text">文本</option>
          <option value="password">密码</option>
          <option value="email">邮箱</option>
          <option value="tel">电话</option>
          <option value="number">数字</option>
          <option value="url">网址</option>
          <option value="search">搜索</option>
        </select>
      </PropField>
      <PropField label="必填">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={props.required || false}
            onChange={(e) => onChange("required", e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">必填字段</span>
        </label>
      </PropField>
      <PropField label="禁用">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={props.disabled || false}
            onChange={(e) => onChange("disabled", e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">禁用状态</span>
        </label>
      </PropField>
    </>
  );
}

function CardProps({ props, onChange }: { props: any; onChange: (k: string, v: any) => void }) {
  return (
    <>
      <PropField label="标题">
        <Input
          value={props.title || ""}
          onChange={(e) => onChange("title", e.target.value)}
          className="h-8 text-sm"
        />
      </PropField>
      <PropField label="内容">
        <textarea
          value={props.content || ""}
          onChange={(e) => onChange("content", e.target.value)}
          className="w-full p-2 border rounded text-sm resize-none"
          rows={3}
        />
      </PropField>
      <PropField label="阴影">
        <select
          value={props.shadow || "sm"}
          onChange={(e) => onChange("shadow", e.target.value)}
          className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="none">无</option>
          <option value="sm">小</option>
          <option value="md">中</option>
          <option value="lg">大</option>
        </select>
      </PropField>
    </>
  );
}

function ImageProps({ props, onChange }: { props: any; onChange: (k: string, v: any) => void }) {
  return (
    <>
      <PropField label="描述">
        <Input
          value={props.alt || ""}
          onChange={(e) => onChange("alt", e.target.value)}
          className="h-8 text-sm"
        />
      </PropField>
      <PropField label="圆角">
        <Input
          type="number"
          value={props.borderRadius || 0}
          onChange={(e) => onChange("borderRadius", Number(e.target.value))}
          className="h-8 text-sm"
        />
      </PropField>
      <PropField label="填充方式">
        <select
          value={props.objectFit || "cover"}
          onChange={(e) => onChange("objectFit", e.target.value)}
          className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="cover">覆盖</option>
          <option value="contain">包含</option>
          <option value="fill">拉伸</option>
        </select>
      </PropField>
    </>
  );
}

function TagProps({ props, onChange }: { props: any; onChange: (k: string, v: any) => void }) {
  return (
    <>
      <PropField label="文本">
        <Input
          value={props.text || ""}
          onChange={(e) => onChange("text", e.target.value)}
          className="h-8 text-sm"
        />
      </PropField>
      <PropField label="颜色">
        <select
          value={props.color || "default"}
          onChange={(e) => onChange("color", e.target.value)}
          className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="default">默认</option>
          <option value="primary">主要</option>
          <option value="success">成功</option>
          <option value="warning">警告</option>
          <option value="danger">危险</option>
          <option value="info">信息</option>
        </select>
      </PropField>
      <PropField label="可关闭">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={props.closable || false}
            onChange={(e) => onChange("closable", e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">显示关闭按钮</span>
        </label>
      </PropField>
    </>
  );
}

function SelectProps({ props, onChange }: { props: any; onChange: (k: string, v: any) => void }) {
  return (
    <>
      <PropField label="标签">
        <Input
          value={props.label || ""}
          onChange={(e) => onChange("label", e.target.value)}
          className="h-8 text-sm"
        />
      </PropField>
      <PropField label="占位符">
        <Input
          value={props.placeholder || ""}
          onChange={(e) => onChange("placeholder", e.target.value)}
          className="h-8 text-sm"
        />
      </PropField>
      <PropField label="选项">
        <textarea
          value={(props.options || []).map((o: any) => `${o.value}:${o.label}`).join("\n")}
          onChange={(e) => {
            const options = e.target.value.split("\n").filter(Boolean).map((line) => {
              const [value, label] = line.split(":");
              return { value: value?.trim() || "", label: label?.trim() || value?.trim() || "" };
            });
            onChange("options", options);
          }}
          placeholder="每行一个选项，格式: value:label"
          className="w-full p-2 border rounded text-sm resize-none font-mono"
          rows={4}
        />
      </PropField>
      <PropField label="多选">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={props.multiple || false}
            onChange={(e) => onChange("multiple", e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">允许多选</span>
        </label>
      </PropField>
    </>
  );
}

function SwitchProps({ props, onChange }: { props: any; onChange: (k: string, v: any) => void }) {
  return (
    <>
      <PropField label="标签">
        <Input
          value={props.label || ""}
          onChange={(e) => onChange("label", e.target.value)}
          className="h-8 text-sm"
        />
      </PropField>
      <PropField label="默认值">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={props.defaultChecked || false}
            onChange={(e) => onChange("defaultChecked", e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">默认开启</span>
        </label>
      </PropField>
      <PropField label="禁用">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={props.disabled || false}
            onChange={(e) => onChange("disabled", e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">禁用状态</span>
        </label>
      </PropField>
    </>
  );
}

function CheckboxProps({ props, onChange }: { props: any; onChange: (k: string, v: any) => void }) {
  return (
    <>
      <PropField label="标签">
        <Input
          value={props.label || ""}
          onChange={(e) => onChange("label", e.target.value)}
          className="h-8 text-sm"
        />
      </PropField>
      <PropField label="默认值">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={props.defaultChecked || false}
            onChange={(e) => onChange("defaultChecked", e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">默认选中</span>
        </label>
      </PropField>
    </>
  );
}

function RadioProps({ props, onChange }: { props: any; onChange: (k: string, v: any) => void }) {
  return (
    <>
      <PropField label="标签">
        <Input
          value={props.label || ""}
          onChange={(e) => onChange("label", e.target.value)}
          className="h-8 text-sm"
        />
      </PropField>
      <PropField label="选项">
        <textarea
          value={(props.options || []).map((o: any) => `${o.value}:${o.label}`).join("\n")}
          onChange={(e) => {
            const options = e.target.value.split("\n").filter(Boolean).map((line) => {
              const [value, label] = line.split(":");
              return { value: value?.trim() || "", label: label?.trim() || value?.trim() || "" };
            });
            onChange("options", options);
          }}
          placeholder="每行一个选项，格式: value:label"
          className="w-full p-2 border rounded text-sm resize-none font-mono"
          rows={4}
        />
      </PropField>
    </>
  );
}

function TextareaProps({ props, onChange }: { props: any; onChange: (k: string, v: any) => void }) {
  return (
    <>
      <PropField label="标签">
        <Input
          value={props.label || ""}
          onChange={(e) => onChange("label", e.target.value)}
          className="h-8 text-sm"
        />
      </PropField>
      <PropField label="占位符">
        <Input
          value={props.placeholder || ""}
          onChange={(e) => onChange("placeholder", e.target.value)}
          className="h-8 text-sm"
        />
      </PropField>
      <PropField label="行数">
        <Input
          type="number"
          value={props.rows || 4}
          onChange={(e) => onChange("rows", Number(e.target.value))}
          className="h-8 text-sm"
        />
      </PropField>
      <PropField label="最大长度">
        <Input
          type="number"
          value={props.maxLength || ""}
          onChange={(e) => onChange("maxLength", e.target.value ? Number(e.target.value) : undefined)}
          className="h-8 text-sm"
          placeholder="不限"
        />
      </PropField>
    </>
  );
}

function BadgeProps({ props, onChange }: { props: any; onChange: (k: string, v: any) => void }) {
  return (
    <>
      <PropField label="内容">
        <Input
          value={props.content || ""}
          onChange={(e) => onChange("content", e.target.value)}
          className="h-8 text-sm"
        />
      </PropField>
      <PropField label="颜色">
        <select
          value={props.color || "default"}
          onChange={(e) => onChange("color", e.target.value)}
          className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="default">默认</option>
          <option value="primary">主要</option>
          <option value="success">成功</option>
          <option value="warning">警告</option>
          <option value="danger">危险</option>
        </select>
      </PropField>
      <PropField label="圆点">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={props.dot || false}
            onChange={(e) => onChange("dot", e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">显示为圆点</span>
        </label>
      </PropField>
    </>
  );
}

function AvatarProps({ props, onChange }: { props: any; onChange: (k: string, v: any) => void }) {
  return (
    <>
      <PropField label="名称">
        <Input
          value={props.name || ""}
          onChange={(e) => onChange("name", e.target.value)}
          className="h-8 text-sm"
        />
      </PropField>
      <PropField label="形状">
        <select
          value={props.shape || "circle"}
          onChange={(e) => onChange("shape", e.target.value)}
          className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="circle">圆形</option>
          <option value="square">方形</option>
        </select>
      </PropField>
      <PropField label="尺寸">
        <select
          value={props.size || "md"}
          onChange={(e) => onChange("size", e.target.value)}
          className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="sm">小</option>
          <option value="md">中</option>
          <option value="lg">大</option>
        </select>
      </PropField>
    </>
  );
}

function LinkProps({ props, onChange }: { props: any; onChange: (k: string, v: any) => void }) {
  return (
    <>
      <PropField label="文本">
        <Input
          value={props.text || ""}
          onChange={(e) => onChange("text", e.target.value)}
          className="h-8 text-sm"
        />
      </PropField>
      <PropField label="链接">
        <Input
          value={props.href || ""}
          onChange={(e) => onChange("href", e.target.value)}
          className="h-8 text-sm"
          placeholder="https://"
        />
      </PropField>
      <PropField label="新窗口">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={props.target === "_blank"}
            onChange={(e) => onChange("target", e.target.checked ? "_blank" : "_self")}
            className="rounded"
          />
          <span className="text-sm">新窗口打开</span>
        </label>
      </PropField>
    </>
  );
}

function DividerProps({ props, onChange }: { props: any; onChange: (k: string, v: any) => void }) {
  return (
    <>
      <PropField label="方向">
        <select
          value={props.direction || "horizontal"}
          onChange={(e) => onChange("direction", e.target.value)}
          className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="horizontal">水平</option>
          <option value="vertical">垂直</option>
        </select>
      </PropField>
      <PropField label="颜色">
        <ColorPicker value={props.color || "#e5e7eb"} onChange={(v) => onChange("color", v)} />
      </PropField>
    </>
  );
}

function IconProps({ props, onChange }: { props: any; onChange: (k: string, v: any) => void }) {
  return (
    <>
      <PropField label="图标名">
        <Input
          value={props.name || ""}
          onChange={(e) => onChange("name", e.target.value)}
          className="h-8 text-sm"
          placeholder="例如: home, user, settings"
        />
      </PropField>
      <PropField label="大小">
        <Input
          type="number"
          value={props.size || 24}
          onChange={(e) => onChange("size", Number(e.target.value))}
          className="h-8 text-sm"
        />
      </PropField>
      <PropField label="颜色">
        <ColorPicker value={props.color || "#000000"} onChange={(v) => onChange("color", v)} />
      </PropField>
    </>
  );
}

function ModalProps({ props, onChange }: { props: any; onChange: (k: string, v: any) => void }) {
  return (
    <>
      <PropField label="标题">
        <Input
          value={props.title || ""}
          onChange={(e) => onChange("title", e.target.value)}
          className="h-8 text-sm"
        />
      </PropField>
      <PropField label="内容">
        <textarea
          value={props.content || ""}
          onChange={(e) => onChange("content", e.target.value)}
          className="w-full p-2 border rounded text-sm resize-none"
          rows={3}
        />
      </PropField>
      <PropField label="显示关闭按钮">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={props.closable !== false}
            onChange={(e) => onChange("closable", e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">显示</span>
        </label>
      </PropField>
    </>
  );
}

function ListProps({ props, onChange }: { props: any; onChange: (k: string, v: any) => void }) {
  return (
    <>
      <PropField label="列表项">
        <textarea
          value={(props.items || []).join("\n")}
          onChange={(e) => onChange("items", e.target.value.split("\n").filter(Boolean))}
          placeholder="每行一个列表项"
          className="w-full p-2 border rounded text-sm resize-none font-mono"
          rows={5}
        />
      </PropField>
      <PropField label="有序列表">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={props.ordered || false}
            onChange={(e) => onChange("ordered", e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">使用数字编号</span>
        </label>
      </PropField>
    </>
  );
}

function TableProps({ props, onChange }: { props: any; onChange: (k: string, v: any) => void }) {
  return (
    <>
      <PropField label="表头">
        <textarea
          value={(props.headers || []).join(",")}
          onChange={(e) => onChange("headers", e.target.value.split(",").filter(Boolean))}
          placeholder="用逗号分隔表头"
          className="w-full p-2 border rounded text-sm resize-none font-mono"
          rows={2}
        />
      </PropField>
      <PropField label="行数">
        <Input
          type="number"
          value={props.rows || 3}
          onChange={(e) => onChange("rows", Number(e.target.value))}
          className="h-8 text-sm"
          min={1}
        />
      </PropField>
      <PropField label="边框">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={props.bordered !== false}
            onChange={(e) => onChange("bordered", e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">显示边框</span>
        </label>
      </PropField>
    </>
  );
}

function AlertProps({ props, onChange }: { props: any; onChange: (k: string, v: any) => void }) {
  return (
    <>
      <PropField label="标题">
        <Input
          value={props.title || ""}
          onChange={(e) => onChange("title", e.target.value)}
          className="h-8 text-sm"
        />
      </PropField>
      <PropField label="描述">
        <textarea
          value={props.description || ""}
          onChange={(e) => onChange("description", e.target.value)}
          className="w-full p-2 border rounded text-sm resize-none"
          rows={2}
        />
      </PropField>
      <PropField label="类型">
        <select
          value={props.type || "info"}
          onChange={(e) => onChange("type", e.target.value)}
          className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="info">信息</option>
          <option value="success">成功</option>
          <option value="warning">警告</option>
          <option value="error">错误</option>
        </select>
      </PropField>
    </>
  );
}

function ProgressProps({ props, onChange }: { props: any; onChange: (k: string, v: any) => void }) {
  return (
    <>
      <PropField label="进度值">
        <Input
          type="number"
          value={props.value || 0}
          onChange={(e) => onChange("value", Math.min(100, Math.max(0, Number(e.target.value))))}
          className="h-8 text-sm"
          min={0}
          max={100}
        />
      </PropField>
      <PropField label="显示百分比">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={props.showPercent !== false}
            onChange={(e) => onChange("showPercent", e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">显示</span>
        </label>
      </PropField>
      <PropField label="颜色">
        <ColorPicker value={props.color || "#3b82f6"} onChange={(v) => onChange("color", v)} />
      </PropField>
    </>
  );
}

function GenericProps({ props, onChange }: { props: any; onChange: (k: string, v: any) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">此组件类型暂无专用属性编辑器</p>
      <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
        {JSON.stringify(props, null, 2)}
      </pre>
    </div>
  );
}

// ============================================
// 样式编辑器
// ============================================

function StyleEditor({
  styles,
  onStyleChange,
}: {
  styles: Record<string, any>;
  onStyleChange: (k: string, v: any) => void;
}) {
  return (
    <>
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-2">背景</h4>
        <PropField label="背景色">
          <ColorPicker
            value={styles.bgColor || "transparent"}
            onChange={(v) => onStyleChange("bgColor", v)}
          />
        </PropField>
      </div>

      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-2">边框</h4>
        <PropField label="边框颜色">
          <ColorPicker
            value={styles.borderColor || "#e5e7eb"}
            onChange={(v) => onStyleChange("borderColor", v)}
          />
        </PropField>
        <PropField label="边框宽度">
          <Input
            type="number"
            value={styles.borderWidth || 0}
            onChange={(e) => onStyleChange("borderWidth", Number(e.target.value))}
            className="h-8 text-sm"
            min={0}
          />
        </PropField>
        <PropField label="边框样式">
          <select
            value={styles.borderStyle || "solid"}
            onChange={(e) => onStyleChange("borderStyle", e.target.value)}
            className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="solid">实线</option>
            <option value="dashed">虚线</option>
            <option value="dotted">点线</option>
            <option value="none">无</option>
          </select>
        </PropField>
        <PropField label="圆角">
          <Input
            type="number"
            value={styles.borderRadius || 0}
            onChange={(e) => onStyleChange("borderRadius", Number(e.target.value))}
            className="h-8 text-sm"
            min={0}
          />
        </PropField>
      </div>

      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-2">阴影</h4>
        <PropField label="阴影">
          <select
            value={styles.shadow || "none"}
            onChange={(e) => onStyleChange("shadow", e.target.value)}
            className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="none">无</option>
            <option value="sm">小</option>
            <option value="md">中</option>
            <option value="lg">大</option>
          </select>
        </PropField>
      </div>

      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-2">透明度</h4>
        <PropField label="透明度">
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={styles.opacity ?? 1}
              onChange={(e) => onStyleChange("opacity", Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-xs w-10 text-right">{Math.round((styles.opacity ?? 1) * 100)}%</span>
          </div>
        </PropField>
      </div>
    </>
  );
}

// ============================================
// 布局编辑器
// ============================================

function LayoutEditor({
  layout,
  onLayoutChange,
}: {
  layout: { x: number; y: number; w: number; h: number };
  onLayoutChange: (k: string, v: number) => void;
}) {
  // 安全的数值解析（防止 NaN）
  const safeNumber = (value: string, fallback: number = 0): number => {
    const num = Number(value);
    return isNaN(num) ? fallback : num;
  };

  return (
    <>
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-2">位置</h4>
        <div className="grid grid-cols-2 gap-2">
          <PropField label="X">
            <Input
              type="number"
              value={layout.x}
              onChange={(e) => onLayoutChange("x", safeNumber(e.target.value, layout.x))}
              className="h-8 text-sm"
            />
          </PropField>
          <PropField label="Y">
            <Input
              type="number"
              value={layout.y}
              onChange={(e) => onLayoutChange("y", safeNumber(e.target.value, layout.y))}
              className="h-8 text-sm"
            />
          </PropField>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-2">尺寸</h4>
        <div className="grid grid-cols-2 gap-2">
          <PropField label="宽度">
            <Input
              type="number"
              value={layout.w}
              onChange={(e) => onLayoutChange("w", safeNumber(e.target.value, layout.w))}
              className="h-8 text-sm"
            />
          </PropField>
          <PropField label="高度">
            <Input
              type="number"
              value={layout.h}
              onChange={(e) => onLayoutChange("h", safeNumber(e.target.value, layout.h))}
              className="h-8 text-sm"
            />
          </PropField>
        </div>
      </div>

      {/* 快捷尺寸 */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-2">快捷尺寸</h4>
        <div className="grid grid-cols-3 gap-1">
          {[
            { label: "1:1", w: layout.w, h: layout.w },
            { label: "4:3", w: layout.w, h: Math.round(layout.w * 0.75) },
            { label: "16:9", w: layout.w, h: Math.round(layout.w * 0.5625) },
            { label: "全宽", w: 1440, h: layout.h },
            { label: "半宽", w: 720, h: layout.h },
            { label: "自适应", w: layout.w, h: 0 },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                onLayoutChange("w", preset.w);
                onLayoutChange("h", preset.h);
              }}
              className="px-2 py-1 text-xs bg-gray-50 hover:bg-gray-100 rounded border"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ============================================
// 通用组件
// ============================================

function PropField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [showPresets, setShowPresets] = useState(false);

  return (
    <div className="space-y-1">
      <div className="flex items-center space-x-2">
        <div
          className="w-8 h-8 rounded border cursor-pointer"
          style={{ backgroundColor: value }}
          onClick={() => setShowPresets(!showPresets)}
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-sm font-mono flex-1"
        />
        <Input
          type="color"
          value={value === "transparent" ? "#ffffff" : value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 p-0 cursor-pointer"
        />
      </div>
      {showPresets && (
        <div className="grid grid-cols-7 gap-1 p-2 bg-gray-50 rounded border">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              onClick={() => {
                onChange(color);
                setShowPresets(false);
              }}
              className={`w-6 h-6 rounded border ${
                value === color ? "ring-2 ring-blue-500" : ""
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
          <button
            onClick={() => {
              onChange("transparent");
              setShowPresets(false);
            }}
            className="w-6 h-6 rounded border bg-white text-xs text-red-500"
            title="透明"
          >
            ∅
          </button>
        </div>
      )}
    </div>
  );
}

function AlignPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex border rounded overflow-hidden">
      {ALIGN_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`flex-1 py-1 text-sm ${
            value === option.value
              ? "bg-blue-100 text-blue-700"
              : "hover:bg-gray-50 text-gray-600"
          }`}
          title={option.label}
        >
          {option.icon}
        </button>
      ))}
    </div>
  );
}

// ============================================
// 组件预览
// ============================================

function ComponentPreview({
  type,
  props,
  styles,
}: {
  type: string;
  props: Record<string, any>;
  styles: Record<string, any>;
}) {
  const baseStyle: React.CSSProperties = {
    padding: "8px",
    fontSize: 14,
    fontFamily: "Arial, sans-serif",
  };

  switch (type) {
    case "Text":
      return (
        <div
          style={{
            ...baseStyle,
            fontSize: props.fontSize || 14,
            fontWeight: props.fontWeight || "normal",
            color: props.color || "#000",
            textAlign: props.align || "left",
            lineHeight: props.lineHeight || 1.5,
          }}
        >
          {props.content || "文本内容"}
        </div>
      );

    case "Button":
      const btnVariantStyles: Record<string, React.CSSProperties> = {
        primary: { backgroundColor: "#2563eb", color: "#fff" },
        secondary: { backgroundColor: "#6b7280", color: "#fff" },
        ghost: { backgroundColor: "transparent", color: "#374151", border: "1px solid #d1d5db" },
        danger: { backgroundColor: "#dc2626", color: "#fff" },
        outline: { backgroundColor: "transparent", color: "#2563eb", border: "1px solid #2563eb" },
      };
      return (
        <button
          style={{
            ...baseStyle,
            borderRadius: props.borderRadius || 6,
            cursor: "pointer",
            border: "none",
            ...(btnVariantStyles[props.variant || "primary"] || btnVariantStyles.primary),
          }}
        >
          {props.text || "按钮"}
        </button>
      );

    case "Input":
      return (
        <div style={baseStyle}>
          {props.label && (
            <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>
              {props.label}
            </div>
          )}
          <div
            style={{
              border: "1px solid #d1d5db",
              borderRadius: 6,
              padding: "8px 12px",
              color: "#9ca3af",
              backgroundColor: "#f9fafb",
            }}
          >
            {props.placeholder || "输入框"}
          </div>
        </div>
      );

    case "Card":
      return (
        <div
          style={{
            ...baseStyle,
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            backgroundColor: "#fff",
          }}
        >
          {props.title && (
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{props.title}</div>
          )}
          {props.content && (
            <div style={{ fontSize: 13, color: "#6b7280" }}>{props.content}</div>
          )}
        </div>
      );

    case "Tag":
      const tagColors: Record<string, string> = {
        default: "#e5e7eb",
        primary: "#dbeafe",
        success: "#dcfce7",
        warning: "#fef3c7",
        danger: "#fee2e2",
      };
      return (
        <span
          style={{
            ...baseStyle,
            display: "inline-block",
            backgroundColor: tagColors[props.color || "default"],
            borderRadius: 12,
            fontSize: 12,
            padding: "2px 10px",
          }}
        >
          {props.text || "标签"}
        </span>
      );

    case "Badge":
      return (
        <span
          style={{
            ...baseStyle,
            display: "inline-block",
            backgroundColor: "#ef4444",
            color: "#fff",
            borderRadius: 10,
            fontSize: 11,
            padding: "2px 6px",
            minWidth: 18,
            textAlign: "center",
          }}
        >
          {props.content || "1"}
        </span>
      );

    case "Avatar":
      return (
        <div
          style={{
            ...baseStyle,
            width: 40,
            height: 40,
            borderRadius: props.shape === "square" ? 6 : "50%",
            backgroundColor: "#e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            fontWeight: 600,
            color: "#6b7280",
          }}
        >
          {(props.name || "U")[0]}
        </div>
      );

    case "Divider":
      return (
        <div style={{ ...baseStyle, padding: "4px 0" }}>
          <hr style={{ border: "none", borderTop: "1px solid #e5e7eb" }} />
        </div>
      );

    case "Link":
      return (
        <a
          style={{
            ...baseStyle,
            color: "#2563eb",
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          {props.text || "链接"}
        </a>
      );

    case "Switch":
      return (
        <div style={baseStyle}>
          <div
            style={{
              width: 44,
              height: 24,
              borderRadius: 12,
              backgroundColor: props.defaultChecked ? "#2563eb" : "#d1d5db",
              position: "relative",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                backgroundColor: "#fff",
                position: "absolute",
                top: 2,
                left: props.defaultChecked ? 22 : 2,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            />
          </div>
        </div>
      );

    case "Progress":
      return (
        <div style={baseStyle}>
          <div
            style={{
              width: "100%",
              height: 8,
              backgroundColor: "#e5e7eb",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${props.value || 0}%`,
                height: "100%",
                backgroundColor: props.color || "#3b82f6",
                borderRadius: 4,
                transition: "width 0.3s ease",
              }}
            />
          </div>
          {props.showPercent !== false && (
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2, textAlign: "right" }}>
              {props.value || 0}%
            </div>
          )}
        </div>
      );

    default:
      return (
        <div
          style={{
            ...baseStyle,
            backgroundColor: "#f3f4f6",
            border: "1px dashed #d1d5db",
            borderRadius: 4,
            textAlign: "center",
            color: "#6b7280",
            fontSize: 12,
          }}
        >
          {type}
        </div>
      );
  }
}
