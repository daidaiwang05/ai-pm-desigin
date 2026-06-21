"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PreviewPage {
  id: string;
  name: string;
  deviceType: string;
  viewportW: number;
  viewportH: number;
  bgColor: string;
  components: any[];
}

interface PreviewData {
  requiresPassword?: boolean;
  previewLinkId?: string;
  iteration: {
    id: string;
    name: string;
    version: string;
    pages: PreviewPage[];
  };
}

export default function PreviewPage() {
  const params = useParams();
  const [data, setData] = useState<PreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [showAnnotations, setShowAnnotations] = useState(true);

  // 评论相关状态
  const [showCommentPanel, setShowCommentPanel] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<any>(null);
  const [commentText, setCommentText] = useState("");
  const [commenterPhone, setCommenterPhone] = useState("");
  const [commenterCode, setCommenterCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [codeCountdown, setCodeCountdown] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    accessPreview();
    // 清理定时器
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [params.token]);

  const accessPreview = async (pwd?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const response = await fetch(
        `${apiUrl}/preview/${params.token}/access`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: pwd }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        if (result.error?.code === "UNAUTHORIZED") {
          setRequiresPassword(true);
          setError("密码错误");
        } else if (result.error?.code === "FORBIDDEN") {
          // 链接已失效/过期，清除密码状态显示错误页面
          setRequiresPassword(false);
          setPassword("");
          setError(result.error?.message || "预览链接已失效");
        } else {
          // 其他错误（如 500），保留密码表单让用户重试
          setError(result.error?.message || "访问失败，请重试");
        }
        return;
      }

      if (result.data.requiresPassword) {
        setRequiresPassword(true);
        return;
      }

      setData(result.data);
      setRequiresPassword(false);

      // 记录访问
      trackVisitor(result.data.previewLinkId);
    } catch (err: any) {
      setError(err.message || "加载失败");
    } finally {
      setIsLoading(false);
    }
  };

  // 记录访客访问
  const trackVisitor = async (previewLinkId?: string) => {
    if (!previewLinkId) return;

    try {
      // 生成或获取访客 ID
      let visitorId = localStorage.getItem("visitor_id");
      if (!visitorId) {
        visitorId = `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem("visitor_id", visitorId);
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      await fetch(`${apiUrl}/analytics/${previewLinkId}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId }),
      });
    } catch (err) {
      // 静默失败，不影响用户体验
      console.error("Failed to track visitor:", err);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    accessPreview(password);
  };

  // 发送验证码
  const handleSendCode = async () => {
    if (!commenterPhone || !/^1[3-9]\d{9}$/.test(commenterPhone)) {
      alert("请输入正确的手机号");
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const response = await fetch(`${apiUrl}/verification/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: commenterPhone, purpose: "comment" }),
      });

      const result = await response.json();
      if (result.success) {
        setIsCodeSent(true);
        setCodeCountdown(60);
        // 清理旧定时器
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
        }
        countdownTimerRef.current = setInterval(() => {
          setCodeCountdown((prev) => {
            if (prev <= 1) {
              if (countdownTimerRef.current) {
                clearInterval(countdownTimerRef.current);
                countdownTimerRef.current = null;
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        alert(result.error?.message || "发送失败");
      }
    } catch (err) {
      alert("发送验证码失败");
    }
  };

  // 验证验证码
  const handleVerifyCode = async () => {
    if (!commenterPhone || !commenterCode) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const response = await fetch(`${apiUrl}/verification/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: commenterPhone,
          code: commenterCode,
          purpose: "comment",
        }),
      });

      const result = await response.json();
      if (result.success) {
        setIsVerified(true);
      } else {
        alert(result.error?.message || "验证码错误");
      }
    } catch (err) {
      alert("验证失败");
    }
  };

  // 提交评论
  const handleSubmitComment = async () => {
    if (!selectedComponent || !commentText.trim() || !isVerified) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const response = await fetch(`${apiUrl}/preview/${params.token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          componentId: selectedComponent.id,
          content: commentText,
          phone: commenterPhone,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setCommentText("");
        // 重新加载评论
        loadComments(selectedComponent.id);
      } else {
        alert(result.error?.message || "评论失败");
      }
    } catch (err) {
      alert("评论提交失败");
    }
  };

  // 加载评论
  const loadComments = async (componentId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const response = await fetch(
        `${apiUrl}/preview/${params.token}/comments?componentId=${componentId}`
      );
      const result = await response.json();
      if (result.success) {
        setComments(result.data || []);
      }
    } catch (err) {
      console.error("Failed to load comments:", err);
    }
  };

  // 选择组件
  const handleComponentClick = (component: any) => {
    setSelectedComponent(component);
    setShowCommentPanel(true);
    loadComments(component.id);
  };

  const currentPage = data?.iteration.pages[currentPageIndex];

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>需要密码</CardTitle>
            <CardDescription>此预览链接需要密码才能访问</CardDescription>
          </CardHeader>
          <form onSubmit={handlePasswordSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              <Input
                type="password"
                placeholder="请输入访问密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button type="submit" className="w-full">
                访问
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😢</div>
          <h1 className="text-2xl font-bold mb-2">无法访问</h1>
          <p className="text-muted-foreground">{error || "预览链接无效或已过期"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="font-semibold">{data.iteration.name}</h1>
            <span className="text-sm text-muted-foreground">
              v{data.iteration.version}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAnnotations(!showAnnotations)}
              className={`px-3 py-1.5 text-sm rounded ${
                showAnnotations
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {showAnnotations ? "隐藏标注" : "显示标注"}
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Page Navigation */}
        {data.iteration.pages.length > 1 && (
          <nav className="w-48 bg-white border-r min-h-[calc(100vh-56px)] p-4">
            <h3 className="text-sm font-medium mb-3">页面</h3>
            <div className="space-y-1">
              {data.iteration.pages.map((page, index) => (
                <button
                  key={page.id}
                  onClick={() => setCurrentPageIndex(index)}
                  className={`w-full text-left px-3 py-2 text-sm rounded ${
                    currentPageIndex === index
                      ? "bg-blue-50 text-blue-700"
                      : "hover:bg-gray-50"
                  }`}
                >
                  {page.name}
                </button>
              ))}
            </div>
          </nav>
        )}

        {/* Canvas Area */}
        <main className="flex-1 overflow-auto p-8">
          {currentPage && (
            <div
              className="mx-auto relative bg-white shadow-lg"
              style={{
                width: currentPage.viewportW,
                height: currentPage.viewportH,
                backgroundColor: currentPage.bgColor,
              }}
            >
              {/* Render components */}
              {currentPage.components.map((comp) => (
                <div
                  key={comp.id}
                  className={`absolute cursor-pointer transition-all ${
                    selectedComponent?.id === comp.id
                      ? "ring-2 ring-blue-500 ring-offset-2"
                      : "hover:ring-1 hover:ring-gray-300"
                  }`}
                  style={{
                    left: comp.layout.x,
                    top: comp.layout.y,
                    width: comp.layout.w,
                    height: comp.layout.h,
                  }}
                  onClick={() => handleComponentClick(comp)}
                >
                  <PreviewComponent
                    component={comp}
                    showAnnotations={showAnnotations}
                  />
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Comment Panel */}
        {showCommentPanel && selectedComponent && (
          <aside className="w-80 bg-white border-l min-h-[calc(100vh-56px)] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-sm">评论</h3>
              <button
                onClick={() => {
                  setShowCommentPanel(false);
                  setSelectedComponent(null);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                ✕
              </button>
            </div>

            {/* Component Info */}
            <div className="p-3 border-b bg-gray-50">
              <div className="text-xs text-muted-foreground">选中组件</div>
              <div className="font-medium text-sm">
                {selectedComponent.name || selectedComponent.componentType}
              </div>
            </div>

            {/* Phone Verification */}
            {!isVerified && (
              <div className="p-4 border-b space-y-3">
                <p className="text-xs text-muted-foreground">
                  请先验证手机号后再评论
                </p>
                <div className="flex space-x-2">
                  <Input
                    type="tel"
                    placeholder="手机号"
                    value={commenterPhone}
                    onChange={(e) => setCommenterPhone(e.target.value)}
                    maxLength={11}
                    className="h-8 text-sm flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSendCode}
                    disabled={codeCountdown > 0}
                    className="shrink-0 h-8"
                  >
                    {codeCountdown > 0 ? `${codeCountdown}s` : "获取验证码"}
                  </Button>
                </div>
                {isCodeSent && (
                  <div className="flex space-x-2">
                    <Input
                      type="text"
                      placeholder="6位验证码"
                      value={commenterCode}
                      onChange={(e) => setCommenterCode(e.target.value)}
                      maxLength={6}
                      className="h-8 text-sm flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={handleVerifyCode}
                      className="shrink-0 h-8"
                    >
                      验证
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {comments.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">
                  暂无评论
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 rounded p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {comment.userName || "匿名用户"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleString("zh-CN")}
                      </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Comment Input */}
            {isVerified && (
              <div className="p-4 border-t space-y-2">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="输入评论..."
                  className="w-full p-2 border rounded text-sm resize-none"
                  rows={3}
                />
                <Button
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim()}
                  className="w-full"
                  size="sm"
                >
                  提交评论
                </Button>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

function PreviewComponent({
  component,
  showAnnotations,
}: {
  component: any;
  showAnnotations: boolean;
}) {
  const { componentType, props, layout, annotations } = component;

  const renderComponent = () => {
    switch (componentType) {
      case "Text":
        return (
          <div
            style={{
              fontSize: props.fontSize || 14,
              fontWeight: props.fontWeight || "normal",
              color: props.color || "#000",
              textAlign: props.align || "left",
            }}
          >
            {props.content || "文本"}
          </div>
        );

      case "Button":
        const variantStyles: Record<string, string> = {
          primary: "bg-blue-600 text-white",
          secondary: "bg-gray-200 text-gray-800",
          ghost: "bg-transparent text-gray-800 border",
          danger: "bg-red-600 text-white",
        };
        return (
          <button
            className={`w-full h-full rounded ${
              variantStyles[props.variant || "primary"]
            }`}
          >
            {props.text || "按钮"}
          </button>
        );

      case "Input":
        return (
          <div className="w-full h-full flex flex-col justify-center">
            {props.label && (
              <label className="text-xs text-gray-600 mb-1">
                {props.label}
              </label>
            )}
            <div className="border rounded px-3 py-2 bg-gray-50 text-gray-400">
              {props.placeholder || "输入框"}
            </div>
          </div>
        );

      case "Card":
        return (
          <div className="w-full h-full border rounded-lg p-4 bg-white shadow-sm">
            {props.title && (
              <h3 className="font-medium mb-2">{props.title}</h3>
            )}
            {props.content && (
              <p className="text-sm text-gray-600">{props.content}</p>
            )}
          </div>
        );

      case "Image":
        return (
          <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center text-gray-400">
            {props.alt || "图片"}
          </div>
        );

      case "Avatar":
        return (
          <div className="w-full h-full rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
            {(props.name || "U")[0]}
          </div>
        );

      case "Tag":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100">
            {props.text || "标签"}
          </span>
        );

      case "Divider":
        return <hr className="border-gray-200" />;

      default:
        return (
          <div className="w-full h-full bg-gray-100 border border-dashed border-gray-300 rounded flex items-center justify-center text-xs text-gray-400">
            {componentType}
          </div>
        );
    }
  };

  return (
    <div className="relative w-full h-full">
      {renderComponent()}

      {/* Annotations */}
      {showAnnotations && annotations?.length > 0 && (
        <div className="absolute -top-2 -right-2 flex flex-wrap gap-1">
          {annotations.map((anno: any) => {
            const tagColors: Record<string, string> = {
              R1: "bg-red-500",
              R2: "bg-orange-500",
              R3: "bg-gray-500",
            };
            return (
              <div
                key={anno.id}
                className={`px-1.5 py-0.5 rounded text-white text-xs ${
                  tagColors[anno.tag || ""] || "bg-blue-500"
                }`}
                title={anno.content}
              >
                {anno.tag || "标注"}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
