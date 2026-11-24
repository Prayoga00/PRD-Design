'use client';

import React, { useState } from 'react';
import { KeyRound, ShieldCheck, X } from 'lucide-react';
import type { AiProviderChoice, AiSettings } from '@/lib/types/prdin';
import { NativeModal } from '@/components/ui/NativeModal';

interface ApiSettingsModalProps {
  open: boolean;
  settings: AiSettings;
  onSave: (next: AiSettings) => void;
  onClose: () => void;
}

function ApiSettingsForm({
  initialSettings,
  onSave,
  onClose,
}: {
  initialSettings: AiSettings;
  onSave: (next: AiSettings) => void;
  onClose: () => void;
}) {
  const [provider, setProvider] = useState<AiProviderChoice>(initialSettings.provider);
  const [apiKey, setApiKey] = useState(initialSettings.apiKey);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ provider, apiKey: apiKey.trim() });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6">
      <div className="rounded-xl border border-[#2F6BFF]/30 bg-[#2F6BFF]/10 p-3 text-xs leading-relaxed text-[#BFDBFE]">
        <div className="flex items-center gap-1.5 font-semibold text-white">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[#60A5FA]" />
          Hybrid Mode Aktif
        </div>
        <p className="mt-1 text-[#A5B4FC]">
          Tanpa API Key pun PRDin tetap berjalan penuh menggunakan <strong className="text-white">Smart Engine Lokal</strong>. Jika kamu mengisi Gemini atau OpenAI API Key, PRDin otomatis beralih ke AI generatif secara real-time.
        </p>
      </div>

      <div>
        <label htmlFor="ai-provider-select" className="block text-xs font-semibold text-[#D4D4D8]">
          Provider LLM
        </label>
        <select
          id="ai-provider-select"
          name="ai-provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value as AiProviderChoice)}
          className="iris-select mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-sm"
        >
          <option value="auto">Otomatis (deteksi dari key / .env)</option>
          <option value="gemini">Google Gemini (gemini-2.5-flash)</option>
          <option value="openai">OpenAI (gpt-4o-mini)</option>
        </select>
      </div>

      <div>
        <label htmlFor="ai-api-key-input" className="block text-xs font-semibold text-[#D4D4D8]">
          API Key Pribadi (BYOK — Opsional)
        </label>
        <input
          id="ai-api-key-input"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Kosongkan untuk pakai .env server atau Smart Engine lokal"
          className="mt-1.5 w-full rounded-xl border border-white/[0.1] bg-[#1D1D22] px-3 py-2 text-sm text-white placeholder:text-[#6E6E6E] focus:border-[#2F6BFF] focus:outline-none"
        />
        <p className="mt-1 text-[11px] text-[#8C8C8C]">
          Disimpan hanya di browser sesi lokal kamu dan tidak ikut masuk ke file export PRD.
        </p>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-white/[0.1] bg-[#1D1D22] px-4 py-2 text-xs font-semibold text-[#D4D4D8] hover:bg-white/[0.08]"
        >
          Batal
        </button>
        <button
          type="submit"
          className="iris-btn-gradient rounded-xl px-4 py-2 text-xs font-semibold"
        >
          Simpan Pengaturan
        </button>
      </div>
    </form>
  );
}

export function ApiSettingsModal({
  open,
  settings,
  onSave,
  onClose,
}: ApiSettingsModalProps) {
  return (
    <NativeModal
      open={open}
      onClose={onClose}
      titleId="ai-settings-title"
      className="w-[min(92vw,520px)]"
    >
      <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-[#2F6BFF]" />
          <h2 id="ai-settings-title" className="text-base font-semibold text-white">
            Pengaturan AI Engine (Opsional)
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup pengaturan AI"
          className="rounded-lg p-1.5 text-[#8C8C8C] hover:bg-white/[0.08] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <ApiSettingsForm
          key={`${settings.provider}-${settings.apiKey}`}
          initialSettings={settings}
          onSave={onSave}
          onClose={onClose}
        />
      )}
    </NativeModal>
  );
}
