"use client";

import { useState } from "react";

interface ComponentPanelProps {
  onComponentDragStart: (componentType: string) => void;
}

// 组件分类和定义
const COMPONENT_CATEGORIES = [
  {
    name: "基础组件",
    icon: "📦",
    components: [
      { type: "Text", name: "文本", icon: "📝", description: "文本内容" },
      { type: "Button", name: "按钮", icon: "🔘", description: "可点击按钮" },
      { type: "Image", name: "图片", icon: "🖼", description: "图片占位" },
      { type: "Icon", name: "图标", icon: "⭐", description: "图标组件" },
      { type: "Link", name: "链接", icon: "🔗", description: "超链接" },
      { type: "Divider", name: "分割线", icon: "➖", description: "水平分割线" },
    ],
  },
  {
    name: "表单组件",
    icon: "📋",
    components: [
      { type: "Input", name: "输入框", icon: "✏️", description: "文本输入" },
      { type: "Textarea", name: "文本域", icon: "📄", description: "多行文本" },
      { type: "Select", name: "下拉选择", icon: "📑", description: "下拉选择器" },
      { type: "Checkbox", name: "复选框", icon: "☑️", description: "多选" },
      { type: "Radio", name: "单选框", icon: "🔘", description: "单选" },
      { type: "Switch", name: "开关", icon: "🔀", description: "开关切换" },
      { type: "Slider", name: "滑块", icon: "🎚", description: "滑动选择" },
    ],
  },
  {
    name: "数据展示",
    icon: "📊",
    components: [
      { type: "Card", name: "卡片", icon: "🃏", description: "内容卡片" },
      { type: "List", name: "列表", icon: "📃", description: "列表展示" },
      { type: "Table", name: "表格", icon: "📊", description: "数据表格" },
      { type: "Tag", name: "标签", icon: "🏷", description: "标签/徽章" },
      { type: "Badge", name: "角标", icon: "🔴", description: "数字角标" },
      { type: "Avatar", name: "头像", icon: "👤", description: "用户头像" },
      { type: "Progress", name: "进度条", icon: "📈", description: "进度展示" },
    ],
  },
  {
    name: "导航组件",
    icon: "🧭",
    components: [
      { type: "NavBar", name: "导航栏", icon: "🔝", description: "顶部导航" },
      { type: "TabBar", name: "标签栏", icon: "📑", description: "底部标签栏" },
      { type: "Sidebar", name: "侧边栏", icon: "📋", description: "侧边导航" },
      { type: "Tabs", name: "标签页", icon: "📑", description: "内容标签页" },
      { type: "Pagination", name: "分页", icon: "📄", description: "分页器" },
    ],
  },
  {
    name: "反馈组件",
    icon: "💬",
    components: [
      { type: "Modal", name: "弹窗", icon: "💬", description: "对话框" },
      { type: "Toast", name: "提示", icon: "💭", description: "轻提示" },
      { type: "Alert", name: "警告", icon: "⚠️", description: "警告提示" },
      { type: "Tooltip", name: "气泡", icon: "💬", description: "气泡提示" },
      { type: "Loading", name: "加载", icon: "⏳", description: "加载状态" },
    ],
  },
  {
    name: "布局组件",
    icon: "📐",
    components: [
      { type: "Header", name: "页头", icon: "🔝", description: "页面头部" },
      { type: "Footer", name: "页脚", icon: "🔚", description: "页面底部" },
      { type: "Grid", name: "栅格", icon: "📐", description: "栅格布局" },
      { type: "Stack", name: "堆叠", icon: "📚", description: "堆叠布局" },
    ],
  },
];

export function ComponentPanel({ onComponentDragStart }: ComponentPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    COMPONENT_CATEGORIES.map((c) => c.name)
  );
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([]);

  const toggleCategory = (name: string) => {
    setExpandedCategories((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  // 记录最近使用的组件
  const handleDragStart = (componentType: string) => {
    setRecentlyUsed((prev) => {
      const filtered = prev.filter((t) => t !== componentType);
      return [componentType, ...filtered].slice(0, 5);
    });
    onComponentDragStart(componentType);
  };

  // 获取最近使用的组件
  const recentComponents = recentlyUsed
    .map((type) => {
      for (const cat of COMPONENT_CATEGORIES) {
        const comp = cat.components.find((c) => c.type === type);
        if (comp) return comp;
      }
      return null;
    })
    .filter(Boolean);

  // 过滤组件
  const filteredCategories = COMPONENT_CATEGORIES.map((category) => ({
    ...category,
    components: category.components.filter(
      (comp) =>
        comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((category) => category.components.length > 0);

  if (isCollapsed) {
    return (
      <div className="w-10 bg-white border-r flex flex-col items-center py-4 shrink-0">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 hover:bg-gray-100 rounded"
          title="展开组件面板"
        >
          📦
        </button>
      </div>
    );
  }

  return (
    <div className="w-56 bg-white border-r flex flex-col shrink-0">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <h3 className="font-semibold text-sm">组件库</h3>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1 hover:bg-gray-100 rounded text-muted-foreground"
          title="收起面板"
        >
          ←
        </button>
      </div>

      {/* Search */}
      <div className="p-2 border-b">
        <input
          type="text"
          placeholder="搜索组件..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Component List */}
      <div className="flex-1 overflow-y-auto">
        {/* Recently Used */}
        {!searchQuery && recentComponents.length > 0 && (
          <div className="border-b">
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
              ⏱ 最近使用
            </div>
            <div className="grid grid-cols-2 gap-1 px-2 pb-2">
              {recentComponents.map((comp) => comp && (
                <div
                  key={`recent-${comp.type}`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("componentType", comp.type);
                    handleDragStart(comp.type);
                  }}
                  className="p-2 rounded border cursor-grab hover:border-primary hover:bg-blue-50 active:cursor-grabbing transition-colors"
                  title={comp.description}
                >
                  <div className="text-lg text-center">{comp.icon}</div>
                  <div className="text-xs text-center mt-1 truncate">
                    {comp.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredCategories.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            没有找到匹配的组件
          </div>
        ) : (
          <div className="py-1">
            {filteredCategories.map((category) => (
              <div key={category.name}>
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.name)}
                  className="w-full px-3 py-2 text-left text-sm font-medium hover:bg-gray-50 flex items-center justify-between"
                >
                  <span>
                    {category.icon} {category.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {expandedCategories.includes(category.name) ? "▼" : "▶"}
                  </span>
                </button>

                {/* Components */}
                {expandedCategories.includes(category.name) && (
                  <div className="grid grid-cols-2 gap-1 px-2 pb-2">
                    {category.components.map((comp) => (
                      <div
                        key={comp.type}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("componentType", comp.type);
                          // 创建拖拽预览
                          const preview = document.createElement("div");
                          preview.className = "bg-white border-2 border-blue-400 rounded px-3 py-2 text-sm shadow-lg";
                          preview.textContent = comp.name;
                          preview.style.position = "absolute";
                          preview.style.top = "-1000px";
                          document.body.appendChild(preview);
                          e.dataTransfer.setDragImage(preview, 0, 0);
                          setTimeout(() => document.body.removeChild(preview), 0);
                          handleDragStart(comp.type);
                        }}
                        className="p-2 rounded border cursor-grab hover:border-primary hover:bg-blue-50 active:cursor-grabbing transition-colors"
                        title={comp.description}
                      >
                        <div className="text-lg text-center">{comp.icon}</div>
                        <div className="text-xs text-center mt-1 truncate">
                          {comp.name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t text-xs text-muted-foreground text-center">
        拖拽组件到画布
      </div>
    </div>
  );
}
