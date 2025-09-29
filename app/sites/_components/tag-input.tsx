"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setDraft("");
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((item) => item !== tag));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/40 dark:text-blue-200"
          >
            {tag}
            <button
              type="button"
              aria-label={`移除标签 ${tag}`}
              className="text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-300"
              onClick={() => removeTag(tag)}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag(draft);
            } else if (e.key === "Backspace" && !draft) {
              onChange(value.slice(0, -1));
            }
          }}
          placeholder={placeholder}
          className={cn(
            "min-w-[120px] flex-1 bg-transparent text-sm outline-none",
            value.length === 0 ? "text-slate-400" : "text-slate-600 dark:text-slate-200",
          )}
        />
      </div>
    </div>
  );
}
