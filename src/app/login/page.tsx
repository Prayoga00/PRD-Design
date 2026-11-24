'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, KeyRound, LogIn } from 'lucide-react';
import {
  loginAccount,
  loginDemoAccount,
  resetAccountPassword,
} from '@/lib/storage/auth-store';
import { getStudioSnapshot } from '@/lib/storage/studio-store';
import { StudioShell } from '@/components/layout/StudioShell';
import { PrdinLogoWordmark } from '@/components/ui/PrdinLogo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showResetPanel, setShowResetPanel] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetFeedback, setResetFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const navigateAfterAuth = () => {
    const hasWorkspace = Boolean(getStudioSnapshot().workspace);
    router.push(hasWorkspace ? '/workspace' : '/ask');
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    const res = loginAccount({ email, password });
    if (!res.ok) {
      setErrorMessage(res.error);
      return;
    }
    navigateAfterAuth();
  };

  const handleResetPassword = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResetFeedback(null);
    const res = resetAccountPassword({
      email: resetEmail || email,
      newPassword: resetNewPassword,
    });
    if (!res.ok) {
      setResetFeedback({ ok: false, text: res.error });
      return;
    }
    setResetFeedback({
      ok: true,
      text: 'Kata sandi diperbarui. Silakan masuk dengan kata sandi barumu.',
    });
    setPassword(resetNewPassword);
    setResetNewPassword('');
  };

  const handleDemoLogin = () => {
    loginDemoAccount();
    navigateAfterAuth();
  };

  return (
    <StudioShell breadcrumbs={['Home', 'Masuk']} statusLabel="Auth Lokal" statusCount="1">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 pt-4 pb-14">
        <div className="iris-composer-shell rounded-2xl p-6 sm:p-7">
          <div className="mb-4">
            <PrdinLogoWordmark className="h-7 w-auto" decorative />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#93C5FD]">
            <LogIn className="h-4 w-4 text-[#2F6BFF]" />
            Masuk ke PRDin
          </div>
          <h1 className="mt-2 text-xl font-semibold text-white">Masuk ke akunmu</h1>
          <p className="mt-1 text-xs leading-relaxed text-[#8C8C8C]">
            Lanjutkan penyusunan PRD, canvas alur kerja, dan dokumen proyekmu.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {errorMessage && (
              <p
                role="alert"
                className="rounded-xl border border-[#5A4CF5]/45 bg-[#5A4CF5]/15 px-3.5 py-2.5 text-xs font-medium text-[#DDD6FE]"
              >
                {errorMessage}
              </p>
            )}

            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-[#D4D4D8]">
                Email
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="username"
                spellCheck={false}
                enterKeyHint="next"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="mt-1.5 w-full rounded-xl border border-white/[0.1] bg-[#1B1B20] px-3.5 py-2.5 text-sm text-white placeholder:text-[#6E6E6E] focus:border-[#2F6BFF] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/25"
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-[#D4D4D8]"
                >
                  Kata sandi
                </label>
                <button
                  type="button"
                  onClick={() => setShowResetPanel((prev) => !prev)}
                  className="text-xs font-medium text-[#93C5FD] hover:underline"
                >
                  Lupa kata sandi?
                </button>
              </div>
              <div className="relative mt-1.5">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  enterKeyHint="done"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full rounded-xl border border-white/[0.1] bg-[#1B1B20] py-2.5 pr-10 pl-3.5 text-sm text-white placeholder:text-[#6E6E6E] focus:border-[#2F6BFF] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/25"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-[#8C8C8C] hover:bg-white/[0.08] hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="iris-btn-gradient w-full rounded-xl px-4 py-2.5 text-sm font-semibold"
            >
              Masuk
            </button>
          </form>

          {showResetPanel && (
            <form
              onSubmit={handleResetPassword}
              className="mt-4 space-y-2.5 rounded-xl border border-[#2F6BFF]/30 bg-[#121623] p-3.5"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <KeyRound className="h-3.5 w-3.5 text-[#2F6BFF]" />
                Atur Ulang Kata Sandi Lokal
              </div>
              <p className="text-[11px] leading-relaxed text-[#8C8C8C]">
                Untuk coba cepat gunakan akun demo <strong className="text-white">demo@prdin.app</strong> (sandi:{' '}
                <code className="font-mono text-[#93C5FD]">prdin1234</code>), atau reset sandi akun lokal yang terdaftar di bawah ini:
              </p>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Email akun terdaftar"
                aria-label="Email untuk reset kata sandi"
                className="w-full rounded-lg border border-white/[0.1] bg-[#18181D] px-3 py-1.5 text-xs text-white placeholder:text-[#6E6E6E] focus:border-[#2F6BFF] focus:outline-none"
              />
              <input
                type="password"
                minLength={8}
                value={resetNewPassword}
                onChange={(e) => setResetNewPassword(e.target.value)}
                placeholder="Kata sandi baru (min. 8 karakter)"
                aria-label="Kata sandi baru"
                className="w-full rounded-lg border border-white/[0.1] bg-[#18181D] px-3 py-1.5 text-xs text-white placeholder:text-[#6E6E6E] focus:border-[#2F6BFF] focus:outline-none"
              />
              {resetFeedback && (
                <p
                  className={`text-[11px] ${resetFeedback.ok ? 'text-[#7DD3FC]' : 'text-[#C4B5FD]'
                    }`}
                >
                  {resetFeedback.text}
                </p>
              )}
              <button
                type="submit"
                className="w-full rounded-lg border border-[#2F6BFF]/45 bg-[#2F6BFF]/20 py-1.5 text-xs font-semibold text-white hover:bg-[#2F6BFF]/30"
              >
                Simpan Kata Sandi Baru
              </button>
            </form>
          )}

          <div className="mt-5 space-y-3 border-t border-white/[0.08] pt-4">
            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full rounded-xl border border-white/[0.1] bg-[#1C1C22] px-4 py-2 text-xs font-semibold text-[#D4D4D8] transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              Masuk Cepat dengan Akun Demo
            </button>

            <p className="text-center text-xs text-[#8C8C8C]">
              Belum punya akun?{' '}
              <Link href="/register" className="font-semibold text-[#93C5FD] hover:underline">
                Daftar gratis
              </Link>
            </p>
          </div>
        </div>
      </main>
    </StudioShell>
  );
}
