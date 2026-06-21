"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/api/client";

interface AIAssistantPanelProps {
  currentPage?: any;
  onApplyGenerated: (pages: any[]) => void;
  onApplyRefined: (page: any) => void;
  onClose: () => void;
}

type AIMode = "generate" | "refine" | "addComponent";

export function AIAssistantPanel({
  currentPage,
  onApplyGenerated,
  onApplyRefined,
  onClose,
}: AIAssistantPanelProps) {
  const [mode, setMode] = useState<AIMode>("generate");
  const [prompt, setPrompt] = useState("");
  const [componentType, setComponentType] = useState("Button");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [deviceType, setDeviceType] = useState("desktop");
  const [pageCount, setPageCount] = useState(1);

  const componentTypes = [
    "Button", "Input", "Card", "Text", "Image", "Avatar",
    "Select", "Textarea", "Switch", "Tag", "Link", "Table",
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError("");
    setResult(null);
    setStreamingText("");

    try {
      if (mode === "generate") {
        // 使用流式生成
        const eventSource = apiClient.aiGenerateStream(prompt, {
          device_type: deviceType,
          page_count: pageCount,
        });

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.chunk) {
              setStreamingText(prev => prev + data.chunk);
            }

            if (data.done && data.result) {
              setResult(data.result);
              setIsGenerating(false);
            }

            if (data.error) {
              setError(data.error);
              setIsGenerating(false);
            }
          } catch (e) {
            // 忽略解析错误
          }
        };

        eventSource.onerror = () => {
          setError("生成失败，请重试");
          setIsGenerating(false);
        };
      } else if (mode === "refine" && currentPage) {
        const response = await apiClient.aiRefine(currentPage, prompt, deviceType);
        if (response.success && response.data) {
          setResult(response.data);
          onApplyRefined(response.data.pages?.[0] || currentPage);
        }
      } else if (mode === "addComponent" && currentPage) {
        const response = await apiClient.aiAddComponent(
          currentPage,
          componentType,
          prompt,
          deviceType
        );
        if (response.success && response.data) {
          setResult(response.data);
        }
      }
    } catch (err: any) {
      setError(err.message || "操作失败");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (!result) return;

    if (mode === "generate" && result.pages) {
      onApplyGenerated(result.pages);
    } else if (mode === "addComponent" && result.pages) {
      onApplyGenerated(result.pages);
    }

    setResult(null);
    setPrompt("");
  };

  return (
    <Card className="w-80 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">AI 助手</CardTitle>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 模式选择 */}
        <div className="flex space-x-2">
          <Button
            variant={mode === "generate" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("generate")}
          >
            生成
          </Button>
          <Button
            variant={mode === "refine" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("refine")}
            disabled={!currentPage}
          >
            优化
          </Button>
          <Button
            variant={mode === "addComponent" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("addComponent")}
            disabled={!currentPage}
          >
            添加组件
          </Button>
        </div>

        {/* 设备类型选择 */}
        {mode === "generate" && (
          <div className="flex space-x-2">
            <select
              value={deviceType}
              onChange={(e) => setDeviceType(e.target.value)}
              className="flex-1 p-2 border rounded-md text-sm"
            >
              <option value="desktop">桌面端</option>
              <option value="tablet">平板</option>
              <option value="mobile">移动端</option>
            </select>
            <select
              value={pageCount}
              onChange={(e) => setPageCount(Number(e.target.value))}
              className="w-20 p-2 border rounded-md text-sm"
            >
              <option value={1}>1 页</option>
              <option value={2}>2 页</option>
              <option value={3}>3 页</option>
              <option value={5}>5 页</option>
            </select>
          </div>
        )}

        {/* 组件类型选择 */}
        {mode === "addComponent" && (
          <select
            value={componentType}
            onChange={(e) => setComponentType(e.target.value)}
            className="w-full p-2 border rounded-md text-sm"
          >
            {componentTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        )}

        {/* 输入框 */}
        <div className="space-y-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              mode === "generate"
                ? "描述你想要的页面，例如：设计一个登录页面，包含用户名、密码输入框和登录按钮"
                : mode === "refine"
                ? "描述你想要的优化，例如：把按钮改成蓝色，增加圆角"
                : "描述组件的用途和样式，例如：一个主要的提交按钮，显示'立即注册'"
            }
            className="w-full p-2 border rounded-md text-sm resize-none h-24"
            disabled={isGenerating}
          />
        </div>

        {/* 生成按钮 */}
        <Button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
          className="w-full"
        >
          {isGenerating ? "生成中..." : "开始生成"}
        </Button>

        {/* 错误信息 */}
        {error && (
          <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        {/* 流式文本显示 */}
        {isGenerating && streamingText && (
          <div className="text-sm bg-gray-50 p-3 rounded max-h-40 overflow-y-auto">
            <div className="animate-pulse">{streamingText}</div>
          </div>
        )}

        {/* 结果预览 */}
        {result && !isGenerating && (
          <div className="space-y-2">
            <div className="text-sm font-medium">生成完成</div>
            {result.pages && (
              <div className="text-sm text-gray-500">
                生成了 {result.pages.length} 个页面
              </div>
            )}
            <Button onClick={handleApply} className="w-full">
              应用到画布
            </Button>
          </div>
        )}

        {/* 提示信息 */}
        <div className="text-xs text-gray-400">
          {mode === "generate" && "输入自然语言描述，AI 将生成对应的 UI 原型"}
          {mode === "refine" && "描述你想要的修改，AI 将优化当前页面"}
          {mode === "addComponent" && "选择组件类型并描述用途，AI 将智能添加到页面"}
        </div>
      </CardContent>
    </Card>
  );
}
