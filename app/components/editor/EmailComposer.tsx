"use client";

import { useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExtension from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import { FontSize } from "./Toolbar";

import {
  Minus, Maximize2, X, ChevronDown,
  Paperclip, Lock, MoreVertical, Trash2,
  Clock, Tag, Users, Printer, ChevronUp,
  CheckCircle2, AlertCircle, Loader2,
} from "lucide-react";

import RecipientInput from "./RecipientInput";
import { Toolbar } from "./Toolbar";

interface EmailComposerProps {
  onClose: () => void;
}

interface AttachmentPayload {
  name: string;
  size: number;
  type: string;
  content: string;
}

interface EmailPayload {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  bodyHtml: string;
  bodyText: string;
  attachments: AttachmentPayload[];
  sentAt: string;
  scheduled: boolean;
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(new Error(`Failed to read: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export default function EmailComposer({ onClose }: EmailComposerProps) {
  const [to, setTo] = useState<string[]>([]);
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSendMenu, setShowSendMenu] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sendState, setSendState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [sendError, setSendError] = useState("");

  const attachRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      UnderlineExtension,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      LinkExtension.configure({ openOnClick: false }),
      ImageExtension.configure({ inline: false }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: "" }),
    ],
    editorProps: {
      attributes: { class: "tiptap-editor", spellcheck: "true" },
    },
  });

  const handleAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAttachments((prev) => [...prev, ...Array.from(e.target.files || [])]);
    e.target.value = "";
  };

  const removeAttachment = (i: number) =>
    setAttachments((prev) => prev.filter((_, idx) => idx !== i));

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const discardDraft = () => {
    setSubject(""); editor?.commands.clearContent();
    setTo([]); setCc([]); setBcc([]);
    setAttachments([]); setSendState("idle"); setSendError("");
  };

  const handleSend = async (scheduled = false) => {
    if (!editor) return;

    if (to.length === 0) {
      setSendError("Please add at least one recipient.");
      setSendState("error");
      setTimeout(() => { setSendState("idle"); setSendError(""); }, 3500);
      return;
    }

    const bodyHtml = editor.getHTML();
    const bodyText = htmlToPlainText(bodyHtml);

    setSendState("sending");

    let attachmentPayloads: AttachmentPayload[] = [];
    try {
      attachmentPayloads = await Promise.all(
        attachments.map(async (file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
          content: await fileToBase64(file),
        }))
      );
    } catch (fileErr) {
      const msg = fileErr instanceof Error ? fileErr.message : "Failed to read attachments.";
      setSendError(msg);
      setSendState("error");
      setTimeout(() => { setSendState("idle"); setSendError(""); }, 4000);
      return;
    }

    const payload: EmailPayload = {
      to, cc, bcc,
      subject: subject.trim() || "(no subject)",
      bodyHtml,
      bodyText,
      attachments: attachmentPayloads,
      sentAt: new Date().toISOString(),
      scheduled,
    };

    console.group("📧 Sending to /api/send-email");
    console.log("To:", payload.to);
    console.log("Cc:", payload.cc);
    console.log("Bcc:", payload.bcc);
    console.log("Subject:", payload.subject);
    console.log("Scheduled:", payload.scheduled);
    console.log("Files:", payload.attachments.map((a) => a.name));
    console.log("HTML:\n", payload.bodyHtml);
    console.groupEnd();

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || `Server error ${response.status}`);
      }

      console.log("✅ Sent:", data);
      setSendState("success");
      setTimeout(() => onClose(), 2000);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send. Please try again.";
      setSendError(msg);
      setSendState("error");
      setTimeout(() => { setSendState("idle"); setSendError(""); }, 5000);
    }
  };

  if (sendState === "success") {
    return (
      <div className="w-full sm:w-[480px] md:w-[556px] bg-[#404040] text-white
                      text-[14px] px-4 py-3 rounded-t-xl flex items-center gap-3 shadow-2xl"
        style={{ animation: "fadeIn .18s ease-out" }}>
        <CheckCircle2 size={18} className="text-green-400 shrink-0" />
        Message sent successfully.
      </div>
    );
  }

  const composerCls = [
    "bg-white flex flex-col shadow-2xl",
    isMaximized
      ? "fixed inset-0 rounded-none w-full h-screen"
      : "w-full sm:w-[480px] md:w-[556px] rounded-t-xl",
  ].join(" ");

  return (
    <div className={composerCls} style={{ zIndex: 1000 }}>

      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-[#404040]
                      rounded-t-xl cursor-pointer select-none shrink-0"
        onClick={() => isMinimized && setIsMinimized(false)}>
        <span className="text-[13px] sm:text-[14px] font-medium text-white">New Message</span>
        <div className="flex items-center gap-0.5">
          <button type="button"
            onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/20 text-white/90 transition-colors">
            <Minus size={15} />
          </button>
          <button type="button"
            onClick={(e) => { e.stopPropagation(); setIsMaximized(!isMaximized); }}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/20 text-white/90 transition-colors">
            {isMaximized ? <ChevronDown size={15} /> : <Maximize2 size={13} />}
          </button>
          <button type="button"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/20 text-white/90 transition-colors">
            <X size={15} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {sendState === "error" && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border-b
                            border-red-100 text-[13px] text-red-700 shrink-0">
              <AlertCircle size={14} className="shrink-0" />
              <span>{sendError}</span>
            </div>
          )}

          <div className="relative">
            <RecipientInput label="To" recipients={to} onChange={setTo} placeholder="Recipients" />
            {!showCc && !showBcc && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-0.5">
                <button type="button" onClick={() => setShowCc(true)}
                  className="text-[11px] sm:text-[12px] text-[#444746] hover:text-[#202124]
                             px-1.5 py-0.5 rounded hover:bg-[#f1f3f4] transition-colors font-medium">
                  Cc
                </button>
                <button type="button" onClick={() => setShowBcc(true)}
                  className="text-[11px] sm:text-[12px] text-[#444746] hover:text-[#202124]
                             px-1.5 py-0.5 rounded hover:bg-[#f1f3f4] transition-colors font-medium">
                  Bcc
                </button>
              </div>
            )}
          </div>

          {showCc && <RecipientInput label="Cc" recipients={cc} onChange={setCc} placeholder="Carbon copy" />}
          {showBcc && <RecipientInput label="Bcc" recipients={bcc} onChange={setBcc} placeholder="Blind carbon copy" />}

          <div className="border-b border-[#e0e0e0]">
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="w-full px-3 py-2 text-[13px] sm:text-[14px] text-[#202124]
                         placeholder:text-[#80868b] bg-transparent outline-none" />
          </div>

          <div className={`flex-1 min-h-0 ${isMaximized ? "overflow-y-auto" : ""}`}
            onClick={() => editor?.commands.focus()}>
            <EditorContent editor={editor} />
          </div>

          {attachments.length > 0 && (
            <div className="border-t border-[#e0e0e0] px-3 py-2 flex flex-wrap gap-1.5">
              {attachments.map((file, i) => (
                <div key={i} className="flex items-center gap-1 bg-[#f1f3f4] rounded-full
                                        pl-2 pr-1 py-0.5 text-[11px] text-[#202124] max-w-[180px]">
                  <Paperclip size={11} className="text-[#5f6368] shrink-0" />
                  <span className="truncate">{file.name}</span>
                  <span className="text-[#5f6368] shrink-0 hidden sm:inline">({formatFileSize(file.size)})</span>
                  <button type="button" onClick={() => removeAttachment(i)}
                    className="w-3.5 h-3.5 rounded-full hover:bg-[#dadce0] flex items-center
                               justify-center transition-colors shrink-0 ml-0.5">
                    <X size={9} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Toolbar editor={editor} />

          {/* Bottom bar */}
          <div className="bg-[#f1f3f4] px-2 sm:px-3 py-2 flex items-center gap-1
                          rounded-b-xl border-t border-[#e0e0e0] shrink-0 flex-wrap">

            <div className="relative flex items-stretch shrink-0">
              <button type="button" onClick={() => handleSend(false)}
                disabled={sendState === "sending"}
                className="bg-[#1a73e8] hover:bg-[#1557b0] disabled:opacity-60 text-white
                           text-[13px] sm:text-[14px] font-medium px-4 sm:px-5 py-1.5 sm:py-2
                           rounded-l-2xl transition-colors leading-none whitespace-nowrap
                           flex items-center gap-1.5">
                {sendState === "sending" && <Loader2 size={13} className="animate-spin" />}
                {sendState === "sending" ? "Sending…" : "Send"}
              </button>
              <button type="button" onClick={() => setShowSendMenu(!showSendMenu)}
                disabled={sendState === "sending"}
                className="bg-[#1a73e8] hover:bg-[#1557b0] disabled:opacity-60 text-white
                           px-2 rounded-r-2xl border-l border-[#1557b0]/50 transition-colors">
                <ChevronDown size={13} />
              </button>
              {showSendMenu && (
                <div className="absolute bottom-12 left-0 bg-white rounded-lg shadow-lg
                                border border-[#e0e0e0] py-1 min-w-[170px] z-50">
                  <button type="button"
                    onClick={() => { setShowSendMenu(false); handleSend(true); }}
                    className="flex items-center gap-2 px-4 py-2 text-[13px] text-[#202124]
                               hover:bg-[#f1f3f4] w-full transition-colors">
                    <Clock size={14} className="text-[#5f6368]" />
                    Schedule send
                  </button>
                </div>
              )}
            </div>

            <button type="button" onClick={() => attachRef.current?.click()} title="Attach files"
              className="flex items-center justify-center w-8 h-8 rounded text-[#444746] hover:bg-[#e8eaed] transition-colors shrink-0">
              <Paperclip size={17} />
            </button>
            <input ref={attachRef} type="file" multiple className="hidden" onChange={handleAttach} />

            <button type="button" title="Confidential mode"
              className="flex items-center justify-center w-8 h-8 rounded text-[#444746] hover:bg-[#e8eaed] transition-colors shrink-0">
              <Lock size={17} />
            </button>
            <button type="button" title="Label"
              className="flex items-center justify-center w-8 h-8 rounded text-[#444746] hover:bg-[#e8eaed] transition-colors shrink-0">
              <Tag size={17} />
            </button>
            <button type="button" title="Insert signature"
              className="flex items-center justify-center w-8 h-8 rounded text-[#444746] hover:bg-[#e8eaed] transition-colors shrink-0">
              <Users size={17} />
            </button>
            <button type="button" title="Print" onClick={() => window.print()}
              className="flex items-center justify-center w-8 h-8 rounded text-[#444746] hover:bg-[#e8eaed] transition-colors shrink-0">
              <Printer size={17} />
            </button>

            <div className="flex-1" />

            <div className="relative">
              <button type="button" onClick={() => setShowMoreMenu(!showMoreMenu)} title="More options"
                className="flex items-center justify-center w-8 h-8 rounded text-[#444746] hover:bg-[#e8eaed] transition-colors shrink-0">
                <MoreVertical size={17} />
              </button>
              {showMoreMenu && (
                <div className="absolute bottom-10 right-0 bg-white rounded-lg shadow-lg
                                border border-[#e0e0e0] py-1 min-w-[200px] z-50">
                  <button type="button"
                    onClick={() => { discardDraft(); setShowMoreMenu(false); }}
                    className="flex items-center gap-2 px-4 py-2 text-[13px] text-[#202124] hover:bg-[#f1f3f4] w-full transition-colors">
                    <X size={14} className="text-[#5f6368]" /> Discard draft
                  </button>
                  <button type="button"
                    onClick={() => { setIsMaximized(true); setShowMoreMenu(false); }}
                    className="flex items-center gap-2 px-4 py-2 text-[13px] text-[#202124] hover:bg-[#f1f3f4] w-full transition-colors">
                    <ChevronUp size={14} className="text-[#5f6368]" /> Default to full-screen
                  </button>
                </div>
              )}
            </div>

            <button type="button" onClick={onClose} title="Discard draft"
              className="flex items-center justify-center w-8 h-8 rounded text-[#444746]
                         hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
              <Trash2 size={17} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}