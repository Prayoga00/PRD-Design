'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, Plus, Sparkles, X } from 'lucide-react';
import type { AdaptiveQuestionConfig } from '@/lib/types/prdin';
import { handleImeSafeEnterSubmit } from '@/lib/utils/keyboard';

interface AdaptiveTagStepProps {
  question: AdaptiveQuestionConfig;
  isHydratedFromQ1: boolean;
  onToggleTag: (questionId: AdaptiveQuestionConfig['id'], tagId: string) => void;
  onAddCustomTag: (questionId: AdaptiveQuestionConfig['id'], label: string) => boolean;
  onRemoveCustomTag: (questionId: AdaptiveQuestionConfig['id'], tagId: string) => void;
}

export function AdaptiveTagStep({
  question,
  isHydratedFromQ1,
  onToggleTag,
  onAddCustomTag,
  onRemoveCustomTag,
}: AdaptiveTagStepProps) {
  const [isOtherOpen, setIsOtherOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [limitNotice, setLimitNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOtherOpen) {
      inputRef.current?.focus();
    }
  }, [isOtherOpen]);

  const selectedSet = new Set(question.selectedTagIds);
  const selectedCount = question.selectedTagIds.length;
  const isAtMax = selectedCount >= question.maxSelect;

  const handleTagClick = (tagId: string) => {
    const isSelected = selectedSet.has(tagId);
    if (!isSelected && question.selectionMode === 'multi' && isAtMax) {
      setLimitNotice(
        `Maksimal ${question.maxSelect} pilihan untuk pertanyaan ini. Klik salah satu tag terpilih untuk menggantinya.`
      );
      return;
    }
    setLimitNotice(null);
    onToggleTag(question.id, tagId);
  };

  const handleSubmitOther = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (question.selectionMode === 'multi' && isAtMax) {
      setLimitNotice(
        `Sudah terpilih ${question.maxSelect}/${question.maxSelect}. Lepas 1 pilihan dulu sebelum menambah tag baru.`
      );
      return;
    }
    const added = onAddCustomTag(question.id, trimmed);
    if (added) {
      setCustomInput('');
      setIsOtherOpen(false);
      setLimitNotice(null);
    }
  };

  const inputId = `${question.id}-other-input`;

  return (
    <article className="rounded-2xl border border-white/[0.08] bg-[#151518] p-5 transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#2F6BFF] to-[#5A4CF5] text-xs font-bold text-white">
            {question.stepNumber}
          </span>
          <h3 className="text-sm font-semibold text-white">{question.title}</h3>
          {isHydratedFromQ1 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#38BDF8]/30 bg-[#38BDF8]/15 px-2 py-0.5 text-[11px] font-medium text-[#7DD3FC]">
              <Sparkles className="h-3 w-3" />
              Tag disesuaikan Q1
            </span>
          )}
        </div>

        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            selectedCount >= question.minSelect
              ? 'border border-[#2F6BFF]/40 bg-[#2F6BFF]/20 text-[#93C5FD]'
              : 'border border-white/[0.08] bg-[#1D1D22] text-[#8C8C8C]'
          }`}
        >
          {selectedCount}/{question.maxSelect} dipilih
        </span>
      </div>

      <p className="mt-2 text-sm font-medium leading-snug text-[#E4E4E7]">{question.prompt}</p>
      <p className="mt-1 text-xs text-[#6E6E6E]">{question.helperHint}</p>

      {/* Selectable tags + explicit Other choice */}
      <div className="mt-3.5 flex flex-wrap gap-2">
        {question.tags.map((tag) => {
          const active = selectedSet.has(tag.id);
          return (
            <div
              key={tag.id}
              className={`inline-flex items-center rounded-xl border transition-all ${
                active
                  ? 'border-[#2F6BFF]/70 bg-[#2F6BFF]/20 text-white shadow-[0_6px_16px_-10px_rgba(47,107,255,0.85)]'
                  : 'border-white/[0.08] bg-[#1B1B20] text-[#D4D4D8] hover:border-white/20 hover:bg-[#222228]'
              }`}
            >
              <button
                type="button"
                onClick={() => handleTagClick(tag.id)}
                title={tag.description}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 py-1.5 text-left text-xs font-medium ${
                  tag.source === 'user' ? 'pl-3 pr-1.5' : 'px-3'
                }`}
              >
                {active && <Check className="h-3.5 w-3.5 shrink-0 text-[#60A5FA]" />}
                <span>{tag.label}</span>
              </button>
              {tag.source === 'user' && (
                <button
                  type="button"
                  aria-label={`Hapus tag ${tag.label}`}
                  onClick={() => onRemoveCustomTag(question.id, tag.id)}
                  className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[#8C8C8C] hover:bg-white/10 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* Explicit Other option */}
        <button
          type="button"
          onClick={() => {
            setIsOtherOpen((prev) => !prev);
            setLimitNotice(null);
          }}
          aria-expanded={isOtherOpen}
          className={`inline-flex items-center gap-1.5 rounded-xl border border-dashed px-3 py-1.5 text-xs font-semibold transition-colors ${
            isOtherOpen
              ? 'border-[#5A4CF5] bg-[#5A4CF5]/20 text-[#DDD6FE]'
              : 'border-white/20 bg-[#18181D] text-[#8C8C8C] hover:border-[#2F6BFF]/60 hover:text-white'
          }`}
        >
          <Plus className="h-3.5 w-3.5" />
          Other
        </button>
      </div>

      {/* Selected tag descriptions helper */}
      {selectedCount > 0 && (
        <div className="mt-2.5 space-y-1">
          {question.tags
            .filter((t) => selectedSet.has(t.id) && t.description)
            .map((t) => (
              <p key={t.id} className="text-[11px] text-[#8C8C8C]">
                <span className="font-semibold text-[#93C5FD]">{t.label}:</span> {t.description}
              </p>
            ))}
        </div>
      )}

      {/* Manual input revealed after clicking Other */}
      {isOtherOpen && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmitOther();
          }}
          className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[#5A4CF5]/40 bg-[#5A4CF5]/10 p-2.5"
        >
          <label htmlFor={inputId} className="sr-only">
            Tulis pilihan tag custom untuk Pertanyaan {question.stepNumber}
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            maxLength={56}
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) =>
              handleImeSafeEnterSubmit(e, {
                multiline: false,
                onSubmit: handleSubmitOther,
              })
            }
            placeholder="Tulis pilihan tag kamu sendiri..."
            className="min-w-[200px] flex-1 rounded-lg border border-white/[0.12] bg-[#141418] px-3 py-1.5 text-xs text-white placeholder:text-[#6E6E6E] focus:border-[#2F6BFF] focus:outline-none"
          />
          <button
            type="submit"
            disabled={!customInput.trim()}
            className="iris-btn-gradient rounded-lg px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
          >
            Tambah Tag
          </button>
          <button
            type="button"
            onClick={() => {
              setIsOtherOpen(false);
              setCustomInput('');
            }}
            className="rounded-lg px-2 py-1.5 text-xs font-medium text-[#8C8C8C] hover:text-white"
          >
            Batal
          </button>
        </form>
      )}

      {limitNotice && (
        <p role="status" className="mt-2.5 rounded-lg border border-[#5A4CF5]/35 bg-[#5A4CF5]/15 px-3 py-1.5 text-xs text-[#C4B5FD]">
          {limitNotice}
        </p>
      )}
    </article>
  );
}
