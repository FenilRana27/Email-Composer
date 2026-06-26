"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { X } from "lucide-react";

interface RecipientInputProps {
  label:        string;
  recipients:   string[];
  onChange:     (recipients: string[]) => void;
  placeholder?: string;
}

export default function RecipientInput({
  label, recipients, onChange, placeholder,
}: RecipientInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isValid,    setIsValid]    = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const addRecipient = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (!isValidEmail(trimmed)) { setIsValid(false); return; }
    if (!recipients.includes(trimmed)) onChange([...recipients, trimmed]);
    setInputValue("");
    setIsValid(true);
  };

  const removeRecipient = (index: number) =>
    onChange(recipients.filter((_, i) => i !== index));

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      e.preventDefault();
      addRecipient(inputValue);
    } else if (e.key === "Backspace" && inputValue === "" && recipients.length > 0) {
      removeRecipient(recipients.length - 1);
    } else {
      setIsValid(true);
    }
  };

  return (
    <div
      className="flex items-start min-h-[38px] px-3 border-b border-[#e0e0e0]
                 hover:bg-[#fafafa] transition-colors cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      <span className="text-[13px] text-[#444746] pt-[9px] w-8 shrink-0 select-none font-medium">
        {label}
      </span>

      <div className="flex flex-wrap gap-1 flex-1 py-1 min-h-[36px] items-center">
        {recipients.map((email, i) => (
          <span key={i}
            className="inline-flex items-center gap-1 bg-[#e8eaed] hover:bg-[#dadce0]
                       text-[#202124] text-[13px] px-2 py-0.5 rounded-full max-w-[200px]
                       transition-colors">
            <span className="truncate">{email}</span>
            <button type="button"
              onClick={(e) => { e.stopPropagation(); removeRecipient(i); }}
              className="flex items-center justify-center w-3.5 h-3.5 rounded-full
                         hover:bg-[#c0c2c5] transition-colors shrink-0">
              <X size={10} strokeWidth={2.5} />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="email"
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); setIsValid(true); }}
          onKeyDown={handleKeyDown}
          onBlur={() => addRecipient(inputValue)}
          placeholder={recipients.length === 0 ? placeholder : ""}
          className={`flex-1 min-w-[120px] text-[13px] bg-transparent outline-none
                     text-[#202124] placeholder:text-[#80868b] py-1
                     ${!isValid ? "text-red-500" : ""}`}
        />
      </div>
    </div>
  );
}