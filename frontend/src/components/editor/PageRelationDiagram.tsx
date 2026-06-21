"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

interface Page {
  id: string;
  name: string;
  slug?: string;
  components: Array<{
    id: string;
    componentType: string;
    name?: string;
    props: any;
    interactions: Array<{
      trigger: string;
      action: string;
      target: string;
    }>;
  }>;
}

interface PageRelationDiagramProps {
  pages: Page[];
  onClose: () => void;
  onPageSelect: (pageId: string) => void;
}

interface Node {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Edge {
  from: string;
  to: string;
  label?: string;
}

export function PageRelationDiagram({
  pages,
  onClose,
  onPageSelect,
}: PageRelationDiagramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 700 });

  // 获取容器尺寸（避免 SSR 问题）
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setCanvasSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // 分析页面关系
  useEffect(() => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const pageMap = new Map(pages.map((p) => [p.id, p]));

    // 创建节点
    const cols = Math.ceil(Math.sqrt(pages.length));
    pages.forEach((page, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      newNodes.push({
        id: page.id,
        name: page.name,
        x: col * 220 + 100,
        y: row * 160 + 100,
        width: 180,
        height: 80,
      });
    });

    // 分析跳转关系
    pages.forEach((page) => {
      page.components.forEach((comp) => {
        if (comp.interactions) {
          comp.interactions.forEach((interaction) => {
            if (
              interaction.action === "navigate" &&
              interaction.target
            ) {
              // 查找目标页面
              const targetPage = pages.find(
                (p) =>
                  p.id === interaction.target ||
                  p.slug === interaction.target ||
                  p.name === interaction.target
              );
              if (targetPage) {
                newEdges.push({
                  from: page.id,
                  to: targetPage.id,
                  label: comp.props?.text || comp.name,
                });
              }
            }
          });
        }
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [pages]);

  // 绘制图表
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 应用变换
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // 绘制连线
    edges.forEach((edge) => {
      const fromNode = nodes.find((n) => n.id === edge.from);
      const toNode = nodes.find((n) => n.id === edge.to);
      if (!fromNode || !toNode) return;

      const fromX = fromNode.x + fromNode.width / 2;
      const fromY = fromNode.y + fromNode.height / 2;
      const toX = toNode.x + toNode.width / 2;
      const toY = toNode.y + toNode.height / 2;

      // 计算连线角度
      const angle = Math.atan2(toY - fromY, toX - fromX);
      const nodeRadius = 50;

      // 调整起点和终点（从节点边缘开始）
      const startX = fromX + Math.cos(angle) * nodeRadius;
      const startY = fromY + Math.sin(angle) * nodeRadius;
      const endX = toX - Math.cos(angle) * nodeRadius;
      const endY = toY - Math.sin(angle) * nodeRadius;

      // 绘制连线
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2;
      ctx.stroke();

      // 绘制箭头
      const arrowSize = 10;
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - arrowSize * Math.cos(angle - Math.PI / 6),
        endY - arrowSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        endX - arrowSize * Math.cos(angle + Math.PI / 6),
        endY - arrowSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = "#94a3b8";
      ctx.fill();

      // 绘制标签
      if (edge.label) {
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        ctx.fillStyle = "#64748b";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.fillText(edge.label, midX, midY - 8);
      }
    });

    // 绘制节点
    nodes.forEach((node) => {
      const isSelected = selectedNode === node.id;

      // 节点背景
      ctx.fillStyle = isSelected ? "#3b82f6" : "#ffffff";
      ctx.strokeStyle = isSelected ? "#2563eb" : "#e2e8f0";
      ctx.lineWidth = 2;

      // 圆角矩形
      const radius = 8;
      ctx.beginPath();
      ctx.roundRect(node.x, node.y, node.width, node.height, radius);
      ctx.fill();
      ctx.stroke();

      // 节点文字
      ctx.fillStyle = isSelected ? "#ffffff" : "#1e293b";
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        node.name,
        node.x + node.width / 2,
        node.y + node.height / 2
      );
    });

    ctx.restore();
  }, [nodes, edges, selectedNode, pan, zoom]);

  // 鼠标事件
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    // 查找点击的节点
    const clickedNode = nodes.find(
      (node) =>
        x >= node.x &&
        x <= node.x + node.width &&
        y >= node.y &&
        y <= node.y + node.height
    );

    if (clickedNode) {
      setSelectedNode(clickedNode.id);
      setIsDragging(true);
      setDragOffset({
        x: x - clickedNode.x,
        y: y - clickedNode.y,
      });
    } else {
      setSelectedNode(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedNode) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    setNodes((prev) =>
      prev.map((node) =>
        node.id === selectedNode
          ? { ...node, x: x - dragOffset.x, y: y - dragOffset.y }
          : node
      )
    );
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.min(Math.max(prev * delta, 0.5), 2));
  };

  const handleDoubleClick = () => {
    if (selectedNode) {
      onPageSelect(selectedNode);
    }
  };

  // 自动布局
  const handleAutoLayout = () => {
    const cols = Math.ceil(Math.sqrt(nodes.length));
    setNodes((prev) =>
      prev.map((node, index) => ({
        ...node,
        x: (index % cols) * 220 + 100,
        y: Math.floor(index / cols) * 160 + 100,
      }))
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-[90vw] h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">页面关系图</h2>
          <div className="flex items-center space-x-2">
            <Button onClick={handleAutoLayout} variant="outline" size="sm">
              自动布局
            </Button>
            <Button onClick={onClose} variant="ghost" size="sm">
              关闭
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div ref={containerRef} className="flex-1 overflow-hidden">
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="w-full h-full cursor-grab"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            onDoubleClick={handleDoubleClick}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>
              {nodes.length} 个页面 · {edges.length} 个跳转关系
            </span>
            <span>双击节点打开页面 · 滚轮缩放 · 拖拽移动节点</span>
          </div>
        </div>
      </div>
    </div>
  );
}
