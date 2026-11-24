'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Bot, Loader2, Send, Sparkles, Undo2, User } from 'lucide-react';
import type { WorkspaceChatMessage } from '@/lib/types/prdin';
import { handleImeSafeEnterSubmit } from '@/lib/utils/keyboard';
import { FormattedText } from '@/components/ui/FormattedText';

interface WorkspaceAiChatProps {
  messages: WorkspaceChatMessage[];
  isSending: boolean;
  canUndo: boolean;
  errorMessage: string | null;
  onSendMessage: (message: string) => Promise<void>;
  onUndoLastMutation: () => void;
}

const QUICK_PROMPTS = [
  'Tambah alur penanganan kendala / edge case',
  'Perdalam UX Research & komponen UI Figma',
  'Tambahkan ringkasan bahasa simpel untuk awam',
  'Tambah tahap notifikasi setelah proses selesai',
];

export function WorkspaceAiChat({
  messages,
  isSending,
  canUndo,
  errorMessage,
  onSendMessage,
  onUndoLastMutation,
}: WorkspaceAiChatProps) {
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, isSending]);

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed || isSending) return;
    setDraft('');
    await onSendMessage(trimmed);
  };

  return (
    <aside
      aria-label="Chat AI Co-Pilot"
      className="flex h-full flex-col border-l border-white/[0.08] bg-[#121215]"
    >
      {/* Header */}
      <div className="border-b border-white/[0.08] px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#2F6BFF]" />
            <h2 className="text-sm font-semibold text-white">Chat AI</h2>
          </div>

          {canUndo && (
            <button
              type="button"
              onClick={onUndoLastMutation}
              className="inline-flex items-center gap-1 rounded-lg border border-white/[0.1] bg-[#1B1B20] px-2.5 py-1 text-[11px] font-medium text-[#D4D4D8] hover:bg-white/[0.08]"
            >
              <Undo2 className="h-3 w-3" />
              Undo
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-[#6E6E6E]">
          Minta revisi flow kerja, detail UX research, atau ubah Plan Text secara langsung.
        </p>
      </div>

      {/* Messages */}
      <div className="prdin-scroll flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${isUser
                  ? 'border-[#2F6BFF]/45 bg-[#2F6BFF]/20 text-[#93C5FD]'
                  : 'border-white/[0.1] bg-[#1B1B20] text-[#D4D4D8]'
                  }`}
              >
                {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </div>

              <div className="max-w-[85%] space-y-1.5">
                <div
                  className={`rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${isUser
                    ? 'iris-btn-gradient text-white'
                    : 'border border-white/[0.08] bg-[#18181D] text-[#E4E4E7]'
                    }`}
                >
                  <FormattedText text={msg.content} />
                </div>

                {msg.mutationSummary && msg.mutationSummary.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {msg.mutationSummary.map((item) => (
                      <span
                        key={item}
                        className="rounded-md border border-[#38BDF8]/30 bg-[#38BDF8]/15 px-2 py-0.5 text-[10px] font-semibold text-[#7DD3FC]"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isSending && (
          <div className="flex items-center gap-2 text-xs text-[#8C8C8C]">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2F6BFF]" />
            Menyinkronkan Canvas &amp; Plan Text...
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick Prompts */}
      <div className="border-t border-white/[0.08] bg-[#101014] px-4 pt-2.5 pb-2">
        <p className="mb-1.5 text-[11px] font-medium text-[#6E6E6E]">Perintah cepat:</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={isSending}
              onClick={() => void onSendMessage(prompt)}
              className="rounded-lg border border-white/[0.08] bg-[#18181D] px-2.5 py-1 text-left text-[11px] font-medium text-[#D4D4D8] transition-colors hover:border-[#2F6BFF]/50 hover:bg-[#2F6BFF]/15 hover:text-white disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
        className="border-t border-white/[0.08] p-3.5"
      >
        {errorMessage && (
          <p className="mb-2 rounded-lg border border-[#5A4CF5]/40 bg-[#5A4CF5]/15 px-2.5 py-1.5 text-xs text-[#C4B5FD]">
            {errorMessage}
          </p>
        )}
        <label htmlFor="workspace-ai-input" className="sr-only">
          Pesan untuk Chat AI workspace
        </label>
        <div className="iris-composer-shell flex items-end gap-2 rounded-xl px-3 py-2">
          <textarea
            id="workspace-ai-input"
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) =>
              handleImeSafeEnterSubmit(e, {
                multiline: true,
                onSubmit: () => {
                  void handleSend();
                },
              })
            }
            placeholder="Tulis instruksi ubah canvas atau plan..."
            className="w-full resize-none bg-transparent text-xs text-white placeholder:text-[#6E6E6E] focus:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim() || isSending}
            aria-label="Kirim pesan ke Chat AI"
            className="iris-btn-gradient inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isSending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </form>
    </aside>
  );
}
