'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { registerAccount, type UserRolePreference } from '@/lib/storage/auth-store';
import { StudioShell } from '@/components/layout/StudioShell';
import { PrdinLogoWordmark } from '@/components/ui/PrdinLogo';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRolePreference>('user-awam');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const res = registerAccount({ name, email, password, role });
    if (!res.ok) {
      setErrorMessage(res.error);
      return;
    }

    router.push('/ask');
  };

  return (
    <StudioShell breadcrumbs={['Home', 'Daftar']} statusLabel="Auth Lokal" statusCount="1">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 pt-4 pb-14">
        <div className="iris-composer-shell rounded-2xl p-6 sm:p-7">
          <div className="mb-4">
            <PrdinLogoWordmark className="h-7 w-auto" decorative />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#C4B5FD]">
            <UserPlus className="h-4 w-4 text-[#5A4CF5]" />
            Buat Akun PRDin
          </div>
          <h1 className="mt-2 text-xl font-semibold text-white">
            Daftar untuk mulai merancang PRD
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-[#8C8C8C]">
            Personalisasi alur pertanyaan &amp; workspace sesuai peranmu.
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
              <label htmlFor="register-name" className="block text-xs font-semibold text-[#D4D4D8]">
                Nama lengkap
              </label>
              <input
                id="register-name"
                name="fullname"
                type="text"
                autoComplete="name"
                enterKeyHint="next"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Sari Wijaya"
                className="mt-1.5 w-full rounded-xl border border-white/[0.1] bg-[#1B1B20] px-3.5 py-2.5 text-sm text-white placeholder:text-[#6E6E6E] focus:border-[#2F6BFF] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/25"
              />
            </div>

            <div>
              <label htmlFor="register-email" className="block text-xs font-semibold text-[#D4D4D8]">
                Email
              </label>
              <input
                id="register-email"
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
              <label
                htmlFor="register-password"
                className="block text-xs font-semibold text-[#D4D4D8]"
              >
                Kata sandi
              </label>
              <div className="relative mt-1.5">
                <input
                  id="register-password"
                  name="new-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={8}
                  enterKeyHint="done"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
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

            <div>
              <span className="block text-xs font-semibold text-[#D4D4D8]">Peran utama</span>
              <div
                role="radiogroup"
                aria-label="Pilih peran utama"
                className="mt-1.5 grid grid-cols-2 gap-2"
              >
                {[
                  { id: 'user-awam' as const, label: 'User Awam / Founder' },
                  { id: 'ui-ux-designer' as const, label: 'UI / UX Designer' },
                ].map((opt) => {
                  const active = role === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setRole(opt.id)}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                        active
                          ? 'border-[#2F6BFF]/70 bg-[#2F6BFF]/20 text-white'
                          : 'border-white/[0.1] bg-[#1B1B20] text-[#8C8C8C] hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="iris-btn-gradient w-full rounded-xl px-4 py-2.5 text-sm font-semibold"
            >
              Buat Akun
            </button>
          </form>

          <p className="mt-5 border-t border-white/[0.08] pt-4 text-center text-xs text-[#8C8C8C]">
            Sudah punya akun?{' '}
            <Link href="/login" className="font-semibold text-[#93C5FD] hover:underline">
              Masuk di sini
            </Link>
          </p>
        </div>
      </main>
    </StudioShell>
  );
}
