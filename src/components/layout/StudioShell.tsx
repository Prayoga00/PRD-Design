'use client';

import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Download,
  FileText,
  FolderClock,
  Home,
  Kanban,
  LogIn,
  LogOut,
  Network,
  Search,
  Settings,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react';
import {
  getAuthSnapshot,
  getServerAuthSnapshot,
  logoutAccount,
  subscribeAuth,
} from '@/lib/storage/auth-store';
import {
  deleteProjectFromHistory,
  getServerStudioSnapshot,
  getStudioSnapshot,
  loadProjectFromHistory,
  startNewDiscoverySession,
  subscribeStudio,
  updateStudioStore,
} from '@/lib/storage/studio-store';
import { PRD_PURPOSE_MAP, PRD_PURPOSE_OPTIONS } from '@/lib/constants/prd-purposes';
import type { AiSettings } from '@/lib/types/prdin';
import { ApiSettingsModal } from '@/components/workspace/ApiSettingsModal';
import { PrdDownloadModal } from '@/components/workspace/PrdDownloadModal';

export interface SegmentedTabItem {
  id: string;
  label: string;
}

interface StudioShellProps {
  breadcrumbs: string[];
  activeTab?: string;
  tabs?: SegmentedTabItem[];
  onSelectTab?: (tabId: string) => void;
  subBarLeftExtra?: React.ReactNode;
  subBarRightExtra?: React.ReactNode;
  statusLabel?: string;
  statusCount?: number | string;
  onStatusClick?: () => void;
  showTopGlow?: boolean;
  railRef?: React.RefObject<HTMLElement | null>;
  topBarRef?: React.RefObject<HTMLElement | null>;
  onOpenHistoryModal?: () => void;
  children: React.ReactNode;
}

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} mnt lalu`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hari ini, ${new Date(timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
  return new Date(timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export function StudioShell({
  breadcrumbs,
  activeTab,
  tabs,
  onSelectTab,
  subBarLeftExtra,
  subBarRightExtra,
  statusLabel,
  statusCount,
  onStatusClick,
  showTopGlow = true,
  railRef,
  topBarRef,
  onOpenHistoryModal,
  children,
}: StudioShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useSyncExternalStore(subscribeAuth, getAuthSnapshot, getServerAuthSnapshot);
  const studio = useSyncExternalStore(
    subscribeStudio,
    getStudioSnapshot,
    getServerStudioSnapshot
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const bellRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
        setBellOpen(false);
        setUserMenuOpen(false);
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setSearchOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(target)) {
        setBellOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, []);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const projectMatches = studio.recentProjects
      .filter(
        (p) =>
          !q ||
          p.title.toLowerCase().includes(q) ||
          p.storyPreview.toLowerCase().includes(q) ||
          PRD_PURPOSE_MAP[p.prdPurpose].label.toLowerCase().includes(q)
      )
      .slice(0, 4);

    const nodeMatches = (studio.workspace?.nodes ?? [])
      .filter(
        (n) =>
          !q ||
          n.data.title.toLowerCase().includes(q) ||
          n.data.subtitle.toLowerCase().includes(q)
      )
      .slice(0, 4);

    const taskMatches = (studio.workspace?.roadmapTasks ?? [])
      .filter(
        (t) =>
          !q ||
          t.title.toLowerCase().includes(q) ||
          (t.description?.toLowerCase().includes(q) ?? false)
      )
      .slice(0, 3);

    const purposeMatches = PRD_PURPOSE_OPTIONS.filter(
      (opt) =>
        !q ||
        opt.label.toLowerCase().includes(q) ||
        opt.shortDesc.toLowerCase().includes(q)
    );

    return { projectMatches, nodeMatches, taskMatches, purposeMatches };
  }, [searchQuery, studio.recentProjects, studio.workspace]);

  const activeAiModeLabel =
    statusLabel ??
    (studio.workspace?.aiMode === 'live-llm' || Boolean(studio.aiSettings.apiKey.trim())
      ? 'Live LLM Active'
      : 'AI Agents Running');

  const computedStatusCount =
    statusCount ??
    (studio.workspace
      ? studio.workspace.nodes.length + (studio.workspace.roadmapTasks?.length ?? 0)
      : Math.max(studio.recentProjects.length, 5));

  const handleSaveSettings = (next: AiSettings) => {
    updateStudioStore((prev) => ({
      ...prev,
      aiSettings: next,
    }));
  };

  const openHistory = () => {
    if (onOpenHistoryModal) {
      onOpenHistoryModal();
    } else {
      setHistoryModalOpen(true);
    }
  };

  const userInitial = auth.user?.name
    ? auth.user.name
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? '')
        .join('')
    : 'PR';

  const navGroupTop = [
    { href: '/', label: 'Beranda', Icon: Home, active: pathname === '/' },
    { href: '/ask', label: 'Ask PRD (5 Pertanyaan)', Icon: Sparkles, active: pathname === '/ask' },
    {
      href: '/workspace',
      label: 'Workspace 3-Kolom',
      Icon: Network,
      active: pathname === '/workspace',
    },
    {
      href: '/workspace?tab=roadmap',
      label: 'Roadmap Detail',
      Icon: Kanban,
      active: false,
    },
  ];

  return (
    <div className="relative flex min-h-dvh w-full bg-[#0E0E0E] text-white">
      {/* Left Rail (48u on desktop) */}
      <aside
        ref={railRef}
        aria-label="Navigasi samping PRDin"
        className="hidden lg:flex lg:sticky lg:top-0 lg:h-dvh lg:w-[max(48px,calc(48*var(--u)))] lg:shrink-0 lg:flex-col lg:items-center lg:justify-between lg:border-r lg:border-white/[0.07] lg:bg-[#0E0E0E]/95 lg:py-3.5"
      >
        <div className="flex flex-col items-center gap-4">
          {/* White Logo Tile */}
          <Link
            href="/"
            title="PRDin — Studio PRD Visual"
            aria-label="PRDin Beranda"
            className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-white text-[#0E0E0E] shadow-sm transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-[#2F6BFF] focus-visible:outline-offset-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 4h7.5a5.5 5.5 0 0 1 0 11H10v5H6V4Zm4 3.5v4h3.5a2 2 0 1 0 0-4H10Z"
                fill="currentColor"
              />
              <circle cx="17.5" cy="17.5" r="2.5" fill="#2F6BFF" />
            </svg>
          </Link>

          {/* Group 1: Core Studio Pages */}
          <nav aria-label="Menu utama" className="flex flex-col items-center gap-1.5">
            {navGroupTop.map(({ href, label, Icon, active }) => (
              <Link
                key={href}
                href={href}
                title={label}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                  active
                    ? 'border-[#2F6BFF]/50 bg-[#1B2236] text-white shadow-[0_0_16px_-6px_rgba(47,107,255,0.9)]'
                    : 'border-white/[0.06] bg-[#151517] text-[#8C8C8C] hover:border-white/15 hover:bg-[#1D1D21] hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
              </Link>
            ))}
          </nav>

          <span className="h-px w-5 bg-white/[0.08]" aria-hidden="true" />

          {/* Group 2: History & Export */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={openHistory}
              title="Riwayat PRD Tersimpan"
              aria-label="Riwayat PRD Tersimpan"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-[#151517] text-[#8C8C8C] transition-colors hover:border-white/15 hover:bg-[#1D1D21] hover:text-white"
            >
              <FolderClock className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (studio.workspace) {
                  setDownloadOpen(true);
                } else {
                  router.push('/workspace');
                }
              }}
              title="Download PRD (.md)"
              aria-label="Download PRD (.md)"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-[#151517] text-[#8C8C8C] transition-colors hover:border-white/15 hover:bg-[#1D1D21] hover:text-white"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Bottom: User Tile + Settings Tile */}
        <div className="flex flex-col items-center gap-1.5">
          <Link
            href={auth.user ? '/ask' : '/login'}
            title={auth.user ? `${auth.user.name} (${auth.user.email})` : 'Masuk / Daftar'}
            aria-label={auth.user ? 'Akun aktif' : 'Masuk ke akun'}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-[#151517] text-[#8C8C8C] transition-colors hover:border-white/15 hover:bg-[#1D1D21] hover:text-white"
          >
            <User className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            title="Pengaturan AI Engine"
            aria-label="Pengaturan AI Engine"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-[#151517] text-[#8C8C8C] transition-colors hover:border-white/15 hover:bg-[#1D1D21] hover:text-white"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Main Column Stretching Full Spare Space */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-x-clip pb-16 lg:pb-0">
        {showTopGlow && (
          <div
            aria-hidden="true"
            className="iris-ambient-glow pointer-events-none absolute inset-x-0 top-0 z-0 h-[540px]"
          />
        )}

        {/* Top Bar (Wraps cleanly into 2 rows on phone) */}
        <header
          ref={topBarRef}
          className="relative z-20 flex flex-wrap items-center justify-between gap-2.5 px-4 pt-3.5 pb-2 sm:px-6"
        >
          {/* Left: Back Tile + Forward Arrow + Breadcrumbs */}
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/"
              aria-label="PRDin Beranda"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#0E0E0E] lg:hidden"
            >
              <span className="text-xs font-semibold">P</span>
            </Link>

            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Halaman sebelumnya"
              title="Kembali"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.09] bg-[#161618]/90 text-white transition-colors hover:bg-[#1F1F24]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => router.forward()}
              aria-label="Halaman berikutnya"
              title="Maju"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#6E6E6E] transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>

            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-xs">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={`${crumb}-${idx}`}>
                    {idx > 0 && <span className="text-[#6E6E6E]">›</span>}
                    {idx === 0 && !isLast ? (
                      <Link
                        href="/"
                        className="truncate text-[#8C8C8C] transition-colors hover:text-white"
                      >
                        {crumb}
                      </Link>
                    ) : (
                      <span
                        className={`truncate ${
                          isLast ? 'font-medium text-white' : 'text-[#8C8C8C]'
                        }`}
                      >
                        {crumb}
                      </span>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>
          </div>

          {/* Right: Search Field + Bell + Avatar (Bell/Avatar stay row 1 on phone, Search wraps smoothly) */}
          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
            {/* Search Anything */}
            <div ref={searchContainerRef} className="relative flex-1 sm:w-[220px] sm:flex-initial">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#7C93C4]" />
              <label htmlFor="studio-global-search" className="sr-only">
                Search Anything
              </label>
              <input
                ref={searchInputRef}
                id="studio-global-search"
                type="search"
                value={searchQuery}
                onFocus={() => setSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                placeholder="Search Anything..."
                className="iris-glass h-8 w-full rounded-lg pr-3 pl-8 text-xs text-[#C7D7F7] placeholder:text-[#7C93C4] focus:border-[#2F6BFF]/65 focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/25"
              />

              {searchOpen && (
                <div
                  role="region"
                  aria-label="Hasil pencarian cepat"
                  className="absolute right-0 left-0 top-10 z-50 w-full min-w-[270px] rounded-xl border border-white/[0.1] bg-[#151518]/98 p-2 shadow-2xl backdrop-blur-xl sm:left-auto sm:w-[320px]"
                >
                  {searchResults.projectMatches.length > 0 && (
                    <div className="mb-1.5">
                      <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#6E6E6E]">
                        Riwayat PRD
                      </p>
                      {searchResults.projectMatches.map((proj) => (
                        <button
                          key={proj.id}
                          type="button"
                          onClick={() => {
                            const loaded = loadProjectFromHistory(proj.id);
                            setSearchOpen(false);
                            setSearchQuery('');
                            if (loaded?.workspace) {
                              router.push('/workspace');
                            } else {
                              router.push('/ask');
                            }
                          }}
                          className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-white transition-colors hover:bg-white/[0.07]"
                        >
                          <span className="truncate font-medium">{proj.title}</span>
                          <span className="shrink-0 rounded bg-[#2F6BFF]/20 px-1.5 py-0.5 text-[10px] text-[#93C5FD]">
                            {PRD_PURPOSE_MAP[proj.prdPurpose].label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.nodeMatches.length > 0 && (
                    <div className="mb-1.5">
                      <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#6E6E6E]">
                        Node Canvas Aktif
                      </p>
                      {searchResults.nodeMatches.map((node) => (
                        <button
                          key={node.id}
                          type="button"
                          onClick={() => {
                            updateStudioStore((prev) =>
                              prev.workspace
                                ? {
                                    ...prev,
                                    workspace: { ...prev.workspace, selectedNodeId: node.id },
                                  }
                                : prev
                            );
                            setSearchOpen(false);
                            setSearchQuery('');
                            router.push('/workspace');
                          }}
                          className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-[#D4D4D8] hover:bg-white/[0.07]"
                        >
                          <span className="truncate">{node.data.title}</span>
                          <span className="shrink-0 text-[10px] text-[#8C8C8C]">Canvas</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.taskMatches.length > 0 && (
                    <div className="mb-1.5">
                      <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#6E6E6E]">
                        Task Roadmap
                      </p>
                      {searchResults.taskMatches.map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchQuery('');
                            router.push('/workspace?tab=roadmap');
                          }}
                          className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-[#D4D4D8] hover:bg-white/[0.07]"
                        >
                          <span className="truncate">{task.title}</span>
                          <span className="shrink-0 text-[10px] text-[#A78BFA]">Roadmap</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div>
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#6E6E6E]">
                      Mulai PRD Baru
                    </p>
                    {searchResults.purposeMatches.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          startNewDiscoverySession(opt.id);
                          setSearchOpen(false);
                          setSearchQuery('');
                          router.push(`/ask?purpose=${opt.id}`);
                        }}
                        className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-[#D4D4D8] hover:bg-white/[0.07]"
                      >
                        <span>Mode {opt.label}</span>
                        <ArrowRight className="h-3 w-3 text-[#2F6BFF]" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bell */}
            <div ref={bellRef} className="relative">
              <button
                type="button"
                onClick={() => setBellOpen((prev) => !prev)}
                aria-label="Notifikasi aktivitas PRDin"
                aria-expanded={bellOpen}
                className="iris-glass relative flex h-8 w-8 items-center justify-center rounded-lg text-[#D4D4D8] transition-colors hover:bg-white/[0.08] hover:text-white"
              >
                <Bell className="h-3.5 w-3.5" />
                {studio.workspace && (
                  <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#2F6BFF]" />
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 top-10 z-50 w-72 rounded-xl border border-white/[0.1] bg-[#151518]/98 p-3 shadow-2xl backdrop-blur-xl">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                    <span className="text-xs font-semibold text-white">Status Studio</span>
                    <span className="text-[10px] text-[#8C8C8C]">
                      {studio.recentProjects.length} riwayat
                    </span>
                  </div>
                  <div className="mt-2.5 space-y-2 text-xs">
                    <div className="rounded-lg bg-white/[0.04] p-2.5">
                      <p className="font-medium text-white">
                        {studio.workspace
                          ? `Workspace "${studio.workspace.projectTitle}" siap`
                          : 'Belum ada workspace aktif'}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#8C8C8C]">
                        {studio.workspace
                          ? `${studio.workspace.nodes.length} node & ${studio.workspace.roadmapTasks.length} task tersinkron.`
                          : 'Mulai dari 1 cerita di composer atau buka Ask PRD.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setBellOpen(false);
                        setSettingsOpen(true);
                      }}
                      className="flex w-full items-center justify-between rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-[11px] text-[#93C5FD] hover:bg-white/[0.05]"
                    >
                      <span>Atur AI Provider / BYOK</span>
                      <Settings className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Avatar */}
            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                aria-label="Menu akun pengguna"
                aria-expanded={userMenuOpen}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-gradient-to-br from-[#2F6BFF]/80 to-[#5A4CF5]/85 text-[11px] font-semibold text-white shadow-sm transition-transform hover:scale-105"
              >
                {userInitial}
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-10 z-50 w-56 rounded-xl border border-white/[0.1] bg-[#151518]/98 p-2 shadow-2xl backdrop-blur-xl">
                  {auth.user ? (
                    <>
                      <div className="border-b border-white/[0.08] px-2.5 py-2">
                        <p className="truncate text-xs font-semibold text-white">{auth.user.name}</p>
                        <p className="truncate text-[11px] text-[#8C8C8C]">{auth.user.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          setSettingsOpen(true);
                        }}
                        className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-[#D4D4D8] hover:bg-white/[0.07]"
                      >
                        <Settings className="h-3.5 w-3.5" />
                        AI Engine Settings
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          logoutAccount();
                          setUserMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-[#C4B5FD] hover:bg-white/[0.07]"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Keluar
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-white hover:bg-white/[0.07]"
                      >
                        <LogIn className="h-3.5 w-3.5 text-[#2F6BFF]" />
                        Masuk Akun
                      </Link>
                      <Link
                        href="/register"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[#D4D4D8] hover:bg-white/[0.07]"
                      >
                        <User className="h-3.5 w-3.5 text-[#5A4CF5]" />
                        Daftar Gratis
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Sub-bar under Top Bar: Segmented Toggle (left) + Glass Status Pill (right) */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2.5 px-4 pb-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            {tabs && tabs.length > 0 && (
              <div
                role="tablist"
                aria-label="Mode tampilan"
                className="inline-flex items-center rounded-xl border border-white/[0.08] bg-[#141416]/90 p-1 backdrop-blur-md"
              >
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => onSelectTab?.(tab.id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-white text-[#0E0E0E] shadow-xs'
                          : 'text-[#8C8C8C] hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            )}
            {subBarLeftExtra}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {subBarRightExtra}

            <button
              type="button"
              onClick={() => (onStatusClick ? onStatusClick() : setSettingsOpen(true))}
              className="iris-glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-[#D4D4D8] transition-colors hover:border-[#2F6BFF]/45 hover:text-white"
              title="Klik untuk konfigurasi AI Engine"
            >
              <span className="iris-beacon h-2 w-2 rounded-full bg-[#2F6BFF] shadow-[0_0_8px_#2F6BFF]" />
              <span className="font-medium">{activeAiModeLabel}</span>
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/90 px-1.5 text-[11px] font-semibold text-[#0E0E0E]">
                {computedStatusCount}
              </span>
            </button>
          </div>
        </div>

        {/* Main Content Slot */}
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
      </div>

      {/* Mobile Bottom Dock (< lg) */}
      <nav
        aria-label="Navigasi mobile"
        className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-white/[0.08] bg-[#0E0E0E]/95 px-2 py-2 backdrop-blur-xl lg:hidden"
      >
        {[
          { href: '/', label: 'Beranda', Icon: Home, active: pathname === '/' },
          { href: '/ask', label: 'Ask PRD', Icon: Sparkles, active: pathname === '/ask' },
          {
            href: '/workspace',
            label: 'Workspace',
            Icon: Network,
            active: pathname === '/workspace',
          },
        ].map(({ href, label, Icon, active }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 text-[11px] font-medium ${
              active ? 'text-white' : 'text-[#8C8C8C]'
            }`}
          >
            <Icon className={`h-4 w-4 ${active ? 'text-[#2F6BFF]' : ''}`} />
            <span>{label}</span>
          </Link>
        ))}
        <button
          type="button"
          onClick={openHistory}
          className="flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 text-[11px] font-medium text-[#8C8C8C]"
        >
          <FolderClock className="h-4 w-4" />
          <span>Riwayat</span>
        </button>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 text-[11px] font-medium text-[#8C8C8C]"
        >
          <Settings className="h-4 w-4" />
          <span>AI</span>
        </button>
      </nav>

      {/* Project History Modal */}
      {historyModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="history-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
          onClick={(e) => {
            if (e.target === e.currentTarget) setHistoryModalOpen(false);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#151518] p-5 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h2 id="history-modal-title" className="text-base font-semibold text-white">
                  Riwayat Proyek &amp; Percakapan PRD
                </h2>
                <p className="mt-0.5 text-xs text-[#8C8C8C]">
                  Buka kembali sesi Ask PRD atau Workspace yang tersimpan di perangkat ini.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                aria-label="Tutup riwayat proyek"
                className="rounded-lg p-1.5 text-[#8C8C8C] hover:bg-white/[0.08] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="prdin-scroll mt-4 max-h-[55dvh] space-y-2 overflow-y-auto">
              {studio.recentProjects.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/[0.1] p-6 text-center text-xs text-[#8C8C8C]">
                  Belum ada riwayat proyek PRD. Ketik cerita ide pertamamu di Ask PRD atau composer beranda!
                </p>
              ) : (
                studio.recentProjects.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#1A1A1E] p-3 hover:border-[#2F6BFF]/45"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        const loaded = loadProjectFromHistory(entry.id);
                        setHistoryModalOpen(false);
                        if (loaded?.workspace) {
                          router.push('/workspace');
                        } else {
                          router.push('/ask');
                        }
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-[#2F6BFF]" />
                        <span className="truncate text-xs font-semibold text-white">
                          {entry.title}
                        </span>
                        <span className="rounded bg-white/[0.08] px-1.5 py-0.5 text-[10px] text-[#93C5FD]">
                          {PRD_PURPOSE_MAP[entry.prdPurpose].label}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[11px] text-[#8C8C8C]">
                        {entry.storyPreview}
                      </p>
                      <p className="mt-1 text-[10px] text-[#6E6E6E]">
                        {formatRelativeTime(entry.updatedAt)}
                        {entry.nodeCount > 0 ? ` · ${entry.nodeCount} node · ${entry.taskCount} task` : ' · Draft Q1–Q5'}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteProjectFromHistory(entry.id)}
                      aria-label={`Hapus riwayat ${entry.title}`}
                      className="rounded-lg p-1.5 text-[#6E6E6E] hover:bg-white/[0.08] hover:text-white"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global AI Settings Modal */}
      <ApiSettingsModal
        open={settingsOpen}
        settings={studio.aiSettings}
        onSave={handleSaveSettings}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Global PRD Export Modal when workspace exists */}
      {studio.workspace && (
        <PrdDownloadModal
          open={downloadOpen}
          workspace={studio.workspace}
          onClose={() => setDownloadOpen(false)}
        />
      )}
    </div>
  );
}
