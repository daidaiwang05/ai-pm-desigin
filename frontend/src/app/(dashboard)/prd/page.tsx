"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadFile } from "@/lib/utils";

const AI_ENGINE_URL = process.env.NEXT_PUBLIC_AI_URL || "http://localhost:8000";

interface PRDData {
  title: string;
  overview: string;
  target_users: Array<{ role: string; needs: string; pain_points: string }>;
  user_stories: Array<{ as_a: string; i_want: string; so_that: string; priority: string }>;
  features: Array<{
    name: string;
    description: string;
    priority: string;
    acceptance_criteria: string[];
  }>;
  acceptance_criteria: string[];
  timeline: Record<string, string>;
  risks: Array<{ risk: string; impact: string; mitigation: string }>;
}

export default function PRDPage() {
  const router = useRouter();
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [targetUsers, setTargetUsers] = useState("");
  const [coreFeatures, setCoreFeatures] = useState("");
  const [industry, setIndustry] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [prd, setPrd] = useState<PRDData | null>(null);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!productName.trim() || !description.trim()) {
      setError("请填写产品名称和描述");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const response = await fetch(`${AI_ENGINE_URL}/ai/generate-prd`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: productName,
          description: description,
          target_users: targetUsers || undefined,
          core_features: coreFeatures ? coreFeatures.split("\n").filter(Boolean) : undefined,
          industry: industry || undefined,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setPrd(result);
      } else {
        setError(result.detail || "生成失败");
      }
    } catch (err) {
      setError("网络错误，请检查 AI 引擎是否启动");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportMarkdown = () => {
    if (!prd) return;

    let md = `# ${prd.title}\n\n`;
    md += `## 产品概述\n\n${prd.overview}\n\n`;

    md += `## 目标用户\n\n`;
    md += `| 角色 | 核心需求 | 痛点 |\n|------|----------|------|\n`;
    prd.target_users.forEach((u) => {
      md += `| ${u.role} | ${u.needs} | ${u.pain_points} |\n`;
    });
    md += "\n";

    md += `## 用户故事\n\n`;
    prd.user_stories.forEach((s, i) => {
      md += `${i + 1}. **${s.priority}** 作为${s.as_a}，我想要${s.i_want}，以便${s.so_that}\n`;
    });
    md += "\n";

    md += `## 功能列表\n\n`;
    prd.features.forEach((f) => {
      md += `### ${f.name} (${f.priority})\n\n`;
      md += `${f.description}\n\n`;
      md += `**验收标准：**\n`;
      f.acceptance_criteria.forEach((c) => {
        md += `- ${c}\n`;
      });
      md += "\n";
    });

    md += `## 整体验收标准\n\n`;
    prd.acceptance_criteria.forEach((c) => {
      md += `- ${c}\n`;
    });
    md += "\n";

    md += `## 产品路线图\n\n`;
    Object.entries(prd.timeline).forEach(([phase, desc]) => {
      md += `- **${phase.toUpperCase()}**: ${desc}\n`;
    });
    md += "\n";

    md += `## 风险分析\n\n`;
    md += `| 风险 | 影响 | 应对措施 |\n|------|------|----------|\n`;
    prd.risks.forEach((r) => {
      md += `| ${r.risk} | ${r.impact} | ${r.mitigation} |\n`;
    });

    downloadFile(md, `${prd.title}.md`, "text/markdown");
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">PRD 智能生成</h2>
          <p className="text-muted-foreground mt-1">
            输入产品描述，AI 自动生成结构化的产品需求文档
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/")}>
          返回工作台
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>产品信息</CardTitle>
            <CardDescription>填写产品基本信息，越详细生成的 PRD 越准确</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="productName">产品名称 *</Label>
              <Input
                id="productName"
                placeholder="例如：健身打卡 App"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">产品描述 *</Label>
              <textarea
                id="description"
                placeholder="详细描述你的产品想法、核心功能、目标用户等..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 border rounded-md resize-none h-32 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetUsers">目标用户</Label>
              <Input
                id="targetUsers"
                placeholder="例如：18-35岁健身爱好者"
                value={targetUsers}
                onChange={(e) => setTargetUsers(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coreFeatures">核心功能（每行一个）</Label>
              <textarea
                id="coreFeatures"
                placeholder="记录每日训练&#10;饮食管理&#10;数据统计"
                value={coreFeatures}
                onChange={(e) => setCoreFeatures(e.target.value)}
                className="w-full p-3 border rounded-md resize-none h-24 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">行业领域</Label>
              <Input
                id="industry"
                placeholder="例如：健康、电商、教育"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? "生成中..." : "🚀 生成 PRD"}
            </Button>
          </CardContent>
        </Card>

        {/* PRD Result */}
        {prd ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{prd.title}</CardTitle>
                  <CardDescription>AI 生成的产品需求文档</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleExportMarkdown}>
                  📥 导出 Markdown
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 max-h-[600px] overflow-y-auto">
              {/* Overview */}
              <div>
                <h3 className="font-semibold mb-2">产品概述</h3>
                <p className="text-sm text-muted-foreground">{prd.overview}</p>
              </div>

              {/* Target Users */}
              <div>
                <h3 className="font-semibold mb-2">目标用户</h3>
                <div className="space-y-2">
                  {prd.target_users.map((user, i) => (
                    <div key={i} className="p-2 bg-gray-50 rounded text-sm">
                      <span className="font-medium">{user.role}</span>: {user.needs}（痛点：{user.pain_points}）
                    </div>
                  ))}
                </div>
              </div>

              {/* User Stories */}
              <div>
                <h3 className="font-semibold mb-2">用户故事</h3>
                <div className="space-y-1">
                  {prd.user_stories.map((story, i) => (
                    <div key={i} className="text-sm">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        story.priority === "P0" ? "bg-red-100 text-red-800" :
                        story.priority === "P1" ? "bg-orange-100 text-orange-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {story.priority}
                      </span>{" "}
                      作为{story.as_a}，我想要{story.i_want}，以便{story.so_that}
                    </div>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div>
                <h3 className="font-semibold mb-2">功能列表</h3>
                <div className="space-y-3">
                  {prd.features.map((feature, i) => (
                    <div key={i} className="p-3 border rounded">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium">{feature.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs ${
                          feature.priority === "P0" ? "bg-red-100 text-red-800" :
                          feature.priority === "P1" ? "bg-orange-100 text-orange-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {feature.priority}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h3 className="font-semibold mb-2">产品路线图</h3>
                <div className="space-y-1">
                  {Object.entries(prd.timeline).map(([phase, desc]) => (
                    <div key={phase} className="text-sm">
                      <span className="font-medium uppercase">{phase}</span>: {desc}
                    </div>
                  ))}
                </div>
              </div>

              {/* Risks */}
              <div>
                <h3 className="font-semibold mb-2">风险分析</h3>
                <div className="space-y-2">
                  {prd.risks.map((risk, i) => (
                    <div key={i} className="p-2 bg-orange-50 rounded text-sm">
                      <span className="font-medium">{risk.risk}</span>（影响：{risk.impact}）
                      <br />
                      <span className="text-muted-foreground">应对：{risk.mitigation}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center text-muted-foreground">
                <div className="text-4xl mb-4">📄</div>
                <p>填写产品信息后点击"生成 PRD"</p>
                <p className="text-sm mt-2">AI 将自动生成结构化的产品需求文档</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
