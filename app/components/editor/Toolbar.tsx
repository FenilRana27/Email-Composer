"use client";

import { Editor } from "@tiptap/react";
import { useState, useRef } from "react";
import { Extension } from "@tiptap/core";
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Link, Image as ImageIcon,
  Palette, RemoveFormatting, PenLine,
  ChevronDown, Quote, Code2, Undo2, Redo2,
  X as XIcon,
} from "lucide-react";


export const FontSize = Extension.create({
  name: "fontSize",
  addOptions() { return { types: ["textStyle"] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (element) =>
            (element as HTMLElement).style.fontSize.replace("px", "") || null,
          renderHTML: (attributes) =>
            attributes.fontSize
              ? { style: `font-size: ${attributes.fontSize}px` }
              : {},
        },
      },
    }];
  },
});

/* ─ Constants ─ */
const FONT_SIZES = ["8", "9", "10", "11", "12", "14", "16", "18", "20", "24", "28", "32", "36", "48", "72"];

const FONT_FAMILIES: { label: string; value: string }[] = [
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Comic Sans MS", value: "'Comic Sans MS', cursive" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Garamond", value: "Garamond, serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Impact", value: "Impact, sans-serif" },
  { label: "Lucida Console", value: "'Lucida Console', monospace" },
  { label: "Palatino", value: "'Palatino Linotype', serif" },
  { label: "Tahoma", value: "Tahoma, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
];

const TEXT_COLORS = [
  "#000000", "#434343", "#666666", "#999999", "#b7b7b7",
  "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff",
  "#0000ff", "#9900ff", "#ff00ff", "#e06666", "#f6b26b",
  "#ffd966", "#93c47d", "#76a5af", "#6fa8dc", "#8e7cc3",
];

const BG_COLORS = [
  "transparent", "#ffffff", "#f3f3f3", "#ffe599", "#b6d7a8",
  "#9fc5e8", "#ea9999", "#ff0000", "#ff9900", "#ffff00",
  "#00ff00", "#00ffff", "#0000ff", "#9900ff", "#ff00ff",
  "#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3",
];

interface ToolbarProps { editor: Editor | null; }

export function Toolbar({ editor }: ToolbarProps) {
  const [showTextColor, setShowTextColor] = useState(false);
  const [showBgColor, setShowBgColor] = useState(false);
  const [showFontFamily, setShowFontFamily] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [currentSize, setCurrentSize] = useState("14");
  const [currentFont, setCurrentFont] = useState("Arial");
  const [linkUrl, setLinkUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!editor) return null;

  const closeAll = () => {
    setShowTextColor(false); setShowBgColor(false);
    setShowFontFamily(false); setShowFontSize(false);
    setShowLinkInput(false);
  };

  const applyFontSize = (size: string) => {
    setCurrentSize(size);
    setShowFontSize(false);
    editor.chain().focus().setMark("textStyle", { fontSize: size }).run();
  };

  const applyFontFamily = (family: { label: string; value: string }) => {
    setCurrentFont(family.label);
    setShowFontFamily(false);
    editor.chain().focus().setMark("textStyle", { fontFamily: family.value }).run();
  };

  const applyLink = () => {
    if (!linkUrl.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    setShowLinkInput(false);
    setLinkUrl("");
  };

  const insertImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) =>
      editor.chain().focus().setImage({ src: ev.target?.result as string }).run();
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  /* ─ icon button ─ */
  const Btn = ({
    onClick, active = false, disabled = false, title, children,
  }: {
    onClick: () => void; active?: boolean;
    disabled?: boolean; title: string; children: React.ReactNode;
  }) => (
    <button type="button" title={title} disabled={disabled} onClick={onClick}
      className={[
        "flex items-center justify-center w-8 h-8 rounded transition-colors shrink-0",
        active ? "bg-[#e8f0fe] text-[#1a73e8]" : "text-[#444746] hover:bg-[#e8eaed]",
        disabled ? "opacity-40 cursor-not-allowed hover:bg-transparent" : "",
      ].join(" ")}
    >
      {children}
    </button>
  );

  /* ─ upward popup ─ */
  const PopupLeft = ({ children, width = "auto" }: { children: React.ReactNode; width?: string }) => (
    <div style={{
      position: "absolute", bottom: "calc(100% + 6px)", left: 0,
      zIndex: 9999, width, background: "#fff",
      border: "1px solid #e0e0e0", borderRadius: 8,
      boxShadow: "0 8px 32px rgba(0,0,0,0.18)", maxHeight: 320, overflowY: "auto",
    }}>
      {children}
    </div>
  );

  const Div = () => <div className="w-px h-5 bg-[#dadce0] mx-0.5 shrink-0" />;

  return (
    <>
      {/* ─ Link dialog ─ */}
      {showLinkInput && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.25)" }}
            onClick={() => setShowLinkInput(false)}
          />
          <div style={{
            position: "fixed", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)", zIndex: 10001,
            width: "min(340px, calc(100vw - 32px))",
            background: "#fff", border: "1px solid #dadce0",
            borderRadius: 12, boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
            padding: "20px 20px 16px",
          }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[14px] font-semibold text-[#202124]">Insert link</span>
              <button type="button" onClick={() => setShowLinkInput(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full
                           text-[#5f6368] hover:bg-[#f1f3f4] transition-colors">
                <XIcon size={15} />
              </button>
            </div>
            <label className="block text-[12px] text-[#5f6368] mb-1 font-medium">
              Web address (URL)
            </label>
            <input
              autoFocus
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyLink();
                if (e.key === "Escape") setShowLinkInput(false);
              }}
              placeholder="https://example.com"
              className="w-full border border-[#dadce0] rounded-lg px-3 py-2
                         text-[13px] outline-none
                         focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20"
            />
            <p className="text-[11px] text-[#80868b] mt-1.5">
              Press Enter or click Apply to insert
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setShowLinkInput(false)}
                className="text-[13px] font-medium text-[#1a73e8]
                           hover:bg-[#e8f0fe] px-4 py-1.5 rounded-lg transition-colors">
                Cancel
              </button>
              <button type="button" onClick={applyLink}
                className="text-[13px] font-medium bg-[#1a73e8] text-white
                           px-4 py-1.5 rounded-lg hover:bg-[#1557b0] transition-colors">
                Apply
              </button>
            </div>
          </div>
        </>
      )}

      
      <div className="bg-[#f1f3f4] border-t border-[#e0e0e0]">
        <div className="flex flex-col px-1.5 py-1 gap-0.5">

          
          <div className="flex items-center gap-0.5 flex-wrap">

            <Btn onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()} title="Undo (Ctrl+Z)">
              <Undo2 size={15} />
            </Btn>
            <Btn onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()} title="Redo (Ctrl+Y)">
              <Redo2 size={15} />
            </Btn>

            <Div />

            {/* Font Family */}
            <div className="relative">
              <button type="button" title="Font family"
                onClick={() => { closeAll(); setShowFontFamily(!showFontFamily); }}
                className="flex items-center gap-1 h-8 px-2 rounded hover:bg-[#e8eaed]
                           text-[12px] text-[#444746] transition-colors shrink-0 max-w-[110px]">
                <span className="truncate">{currentFont}</span>
                <ChevronDown size={11} className="shrink-0" />
              </button>
              {showFontFamily && (
                <PopupLeft width="180px">
                  {FONT_FAMILIES.map((f) => (
                    <button key={f.value} type="button"
                      onClick={() => applyFontFamily(f)}
                      style={{ fontFamily: f.value }}
                      className="flex items-center w-full px-3 py-2 text-[13px] text-[#202124]
                                 hover:bg-[#f1f3f4] transition-colors text-left">
                      {f.label}
                    </button>
                  ))}
                </PopupLeft>
              )}
            </div>

            {/* Font Size */}
            <div className="relative">
              <button type="button" title="Font size"
                onClick={() => { closeAll(); setShowFontSize(!showFontSize); }}
                className="flex items-center gap-0.5 h-8 px-2 rounded hover:bg-[#e8eaed]
                           text-[12px] text-[#444746] transition-colors shrink-0 min-w-[46px]">
                <span>{currentSize}</span>
                <ChevronDown size={11} className="shrink-0" />
              </button>
              {showFontSize && (
                <PopupLeft width="64px">
                  {FONT_SIZES.map((size) => (
                    <button key={size} type="button"
                      onClick={() => applyFontSize(size)}
                      className={[
                        "flex items-center justify-center w-full py-1.5 text-[13px]",
                        "text-[#202124] hover:bg-[#f1f3f4] transition-colors",
                        currentSize === size ? "bg-[#e8f0fe] font-semibold text-[#1a73e8]" : "",
                      ].join(" ")}>
                      {size}
                    </button>
                  ))}
                </PopupLeft>
              )}
            </div>

            <Div />

            
            <button type="button" title="Insert signature"
              className="flex items-center gap-1 h-8 px-2 rounded hover:bg-[#e8eaed]
                         text-[12px] text-[#444746] transition-colors shrink-0">
              <PenLine size={14} />
              <span className="hidden sm:inline text-[12px]">Signature</span>
            </button>

            <Div />

            <Btn onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive("bold")} title="Bold (Ctrl+B)">
              <Bold size={15} />
            </Btn>
            <Btn onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive("italic")} title="Italic (Ctrl+I)">
              <Italic size={15} />
            </Btn>
            <Btn onClick={() => editor.chain().focus().toggleUnderline().run()}
              active={editor.isActive("underline")} title="Underline (Ctrl+U)">
              <Underline size={15} />
            </Btn>
            <Btn onClick={() => editor.chain().focus().toggleStrike().run()}
              active={editor.isActive("strike")} title="Strikethrough">
              <Strikethrough size={15} />
            </Btn>

          </div>

          
          <div className="flex items-center gap-0.5 flex-wrap">

            {/* Text Color */}
            <div className="relative">
              <Btn onClick={() => { closeAll(); setShowTextColor(!showTextColor); }}
                active={showTextColor} title="Text color">
                <Palette size={15} />
              </Btn>
              {showTextColor && (
                <PopupLeft width="168px">
                  <div className="p-3">
                    <p className="text-[11px] text-[#5f6368] mb-2 font-semibold uppercase tracking-wide">
                      Text color
                    </p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {TEXT_COLORS.map((color) => (
                        <button key={color} type="button" title={color}
                          onClick={() => { editor.chain().focus().setColor(color).run(); setShowTextColor(false); }}
                          style={{ backgroundColor: color }}
                          className="w-6 h-6 rounded border border-[#e0e0e0] hover:scale-110 transition-transform cursor-pointer" />
                      ))}
                    </div>
                  </div>
                </PopupLeft>
              )}
            </div>

            {/* Highlight Color */}
            <div className="relative">
              <Btn onClick={() => { closeAll(); setShowBgColor(!showBgColor); }}
                active={showBgColor} title="Highlight color">
                <span className="text-[13px] font-bold leading-none"
                  style={{ textDecoration: "underline", textDecorationColor: "#fbbc04", textDecorationThickness: 2 }}>
                  A
                </span>
              </Btn>
              {showBgColor && (
                <PopupLeft width="168px">
                  <div className="p-3">
                    <p className="text-[11px] text-[#5f6368] mb-2 font-semibold uppercase tracking-wide">
                      Highlight
                    </p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {BG_COLORS.map((color) => (
                        <button key={color} type="button"
                          onClick={() => {
                            color === "transparent"
                              ? editor.chain().focus().unsetHighlight().run()
                              : editor.chain().focus().toggleHighlight({ color }).run();
                            setShowBgColor(false);
                          }}
                          style={{
                            backgroundColor: color === "transparent" ? "#fff" : color,
                            backgroundImage: color === "transparent"
                              ? "linear-gradient(45deg,#ccc 25%,transparent 25%),linear-gradient(-45deg,#ccc 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ccc 75%),linear-gradient(-45deg,transparent 75%,#ccc 75%)"
                              : undefined,
                            backgroundSize: "8px 8px",
                          }}
                          className="w-6 h-6 rounded border border-[#e0e0e0] hover:scale-110 transition-transform cursor-pointer" />
                      ))}
                    </div>
                  </div>
                </PopupLeft>
              )}
            </div>

            <Div />

            <Btn onClick={() => editor.chain().focus().setTextAlign("left").run()}
              active={editor.isActive({ textAlign: "left" })} title="Align left">
              <AlignLeft size={15} />
            </Btn>
            <Btn onClick={() => editor.chain().focus().setTextAlign("center").run()}
              active={editor.isActive({ textAlign: "center" })} title="Align center">
              <AlignCenter size={15} />
            </Btn>
            <Btn onClick={() => editor.chain().focus().setTextAlign("right").run()}
              active={editor.isActive({ textAlign: "right" })} title="Align right">
              <AlignRight size={15} />
            </Btn>

            <Div />

            <Btn onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive("bulletList")} title="Bullet list">
              <List size={15} />
            </Btn>
            <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive("orderedList")} title="Numbered list">
              <ListOrdered size={15} />
            </Btn>

            <Div />

            <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()}
              active={editor.isActive("blockquote")} title="Quote">
              <Quote size={15} />
            </Btn>
            <Btn onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              active={editor.isActive("codeBlock")} title="Code block">
              <Code2 size={15} />
            </Btn>

            <Div />

            {/* Link */}
            <Btn
              onClick={() => {
                const wasOpen = showLinkInput;
                closeAll();
                if (!wasOpen) {
                  setLinkUrl(editor.getAttributes("link").href || "");
                  setShowLinkInput(true);
                }
              }}
              active={editor.isActive("link") || showLinkInput}
              title="Insert link">
              <Link size={15} />
            </Btn>

            {/* Image */}
            <Btn onClick={() => fileInputRef.current?.click()} title="Insert image">
              <ImageIcon size={15} />
            </Btn>
            <input ref={fileInputRef} type="file" accept="image/*"
              className="hidden" onChange={insertImage} />

            <Div />

            <Btn onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
              title="Remove formatting">
              <RemoveFormatting size={15} />
            </Btn>

          </div>
        </div>
      </div>
    </>
  );
}

export default Toolbar;