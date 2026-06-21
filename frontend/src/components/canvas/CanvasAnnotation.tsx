"use client";

import { useState, useRef, useCallback } from "react";

interface CanvasNote {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  createdAt: string;
}

interface CanvasAnnotationProps {
  notes: CanvasNote[];
  onAddNote: (note: Omit<CanvasNote, "id" | "createdAt">) => void;
  onUpdateNote: (id: string, text: string) => void;
  onDeleteNote: (id: string) => void;
  scale: number;
  position: { x: number; y: number };
}

const NOTE_COLORS = [
  { name: "黄色", value: "#fef3c7", border: "#f59e0b" },
  { name: "绿色", value: "#dcfce7", border: "#22c55e" },
  { name: "蓝色", value: "#dbeafe", border: "#3b82f6" },
  { name: "红色", value: "#fee2e2", border: "#ef4444" },
  { name: "紫色", value: "#f3e8ff", border: "#a855f7" },
];

export function CanvasAnnotation({
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  scale,
  position,
}: CanvasAnnotationProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newNotePos, setNewNotePos] = useState<{ x: number; y: number } | null>(null);
  const [newNoteText, setNewNoteText] = useState("");
  const [newNoteColor, setNewNoteColor] = useState(NOTE_COLORS[0].value);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isAdding) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left - position.x) / scale;
      const y = (e.clientY - rect.top - position.y) / scale;

      setNewNotePos({ x, y });
    },
    [isAdding, scale, position]
  );

  const handleAddNote = useCallback(() => {
    if (newNotePos && newNoteText.trim()) {
      onAddNote({
        x: newNotePos.x,
        y: newNotePos.y,
        text: newNoteText.trim(),
        color: newNoteColor,
      });
      setNewNotePos(null);
      setNewNoteText("");
      setIsAdding(false);
    }
  }, [newNotePos, newNoteText, newNoteColor, onAddNote]);

  const handleStartEdit = useCallback((note: CanvasNote) => {
    setEditingNote(note.id);
    setEditText(note.text);
  }, []);

  const handleSaveEdit = useCallback(
    (id: string) => {
      if (editText.trim()) {
        onUpdateNote(id, editText.trim());
      }
      setEditingNote(null);
      setEditText("");
    },
    [editText, onUpdateNote]
  );

  return (
    <>
      {/* Add Note Button */}
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={() => {
            setIsAdding(!isAdding);
            setNewNotePos(null);
          }}
          className={`px-3 py-1.5 text-sm rounded-lg shadow-sm border transition-colors ${
            isAdding
              ? "bg-blue-500 text-white border-blue-600"
              : "bg-white hover:bg-gray-50"
          }`}
          title={isAdding ? "取消添加" : "添加标注"}
        >
          📝 {isAdding ? "取消" : "标注"}
        </button>
      </div>

      {/* Click overlay for adding notes */}
      {isAdding && (
        <div
          className="absolute inset-0 z-5 cursor-crosshair"
          onClick={handleCanvasClick}
        />
      )}

      {/* Notes */}
      {notes.map((note) => {
        const colorConfig = NOTE_COLORS.find((c) => c.value === note.color) || NOTE_COLORS[0];
        const isEditing = editingNote === note.id;

        return (
          <div
            key={note.id}
            className="absolute z-20 group"
            style={{
              left: note.x * scale + position.x,
              top: note.y * scale + position.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            {/* Note marker */}
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs cursor-pointer shadow-md"
              style={{
                backgroundColor: colorConfig.border,
                color: "#fff",
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!isEditing) {
                  handleStartEdit(note);
                }
              }}
            >
              📝
            </div>

            {/* Note content */}
            <div
              className="absolute left-0 top-8 w-48 rounded-lg shadow-lg border p-3"
              style={{
                backgroundColor: colorConfig.value,
                borderColor: colorConfig.border,
              }}
            >
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full p-1 text-xs border rounded resize-none"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex justify-end space-x-1">
                    <button
                      onClick={() => setEditingNote(null)}
                      className="px-2 py-0.5 text-xs bg-white rounded border"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => handleSaveEdit(note.id)}
                      className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded"
                    >
                      保存
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs">{note.text}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(note.createdAt).toLocaleDateString("zh-CN")}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNote(note.id);
                      }}
                      className="text-[10px] text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      删除
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}

      {/* New note dialog */}
      {newNotePos && (
        <div
          className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center"
          onClick={() => setNewNotePos(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-4 w-80"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-sm mb-3">添加标注</h3>
            <textarea
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="输入标注内容..."
              className="w-full p-2 border rounded text-sm resize-none mb-3"
              rows={3}
              autoFocus
            />
            <div className="mb-3">
              <Label className="text-xs mb-1 block">颜色</Label>
              <div className="flex space-x-2">
                {NOTE_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setNewNoteColor(color.value)}
                    className={`w-6 h-6 rounded-full border-2 ${
                      newNoteColor === color.value ? "border-gray-800" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color.border }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="ghost" size="sm" onClick={() => setNewNotePos(null)}>
                取消
              </Button>
              <Button size="sm" onClick={handleAddNote} disabled={!newNoteText.trim()}>
                添加
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Import Label and Button from UI components
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
