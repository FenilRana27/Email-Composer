"use client";

import { useState } from "react";
import EmailComposer from "./components/editor/EmailComposer";

export default function Home() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <main className="min-h-screen bg-[#f6f8fc]">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6
                     bg-[#1a73e8] hover:bg-[#1557b0] text-white font-medium
                     px-5 py-2.5 rounded-2xl shadow-lg flex items-center gap-2
                     transition-all duration-200 hover:shadow-xl text-[13px] sm:text-sm"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Compose
        </button>
      )}

      {isOpen && (
      
        <div className="fixed bottom-0 left-0 right-0 sm:left-auto sm:right-4 md:right-6
                        flex justify-center sm:justify-end">
          <div className="w-full sm:w-auto">
            <EmailComposer onClose={() => setIsOpen(false)} />
          </div>
        </div>
      )}
    </main>
  );
}