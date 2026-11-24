import type { PrdBusinessContext, PrdPurpose } from '@/lib/types/prdin';

export interface PrdPurposeBusinessPresets {
  successMetricsExamples: string[];
  userRolesExamples: string[];
  nonGoalsExamples: string[];
  technicalConstraintsExamples: string[];
  defaultPreset: PrdBusinessContext;
}

export interface PrdPurposeConfig {
  id: PrdPurpose;
  label: string;
  shortDesc: string;
  q1Welcome: string;
  q1Placeholder: string;
  starterStories: Array<{ label: string; text: string }>;
  businessPresets: PrdPurposeBusinessPresets;
}

export const PRD_PURPOSE_OPTIONS: PrdPurposeConfig[] = [
  {
    id: 'ui-ux-process',
    label: 'UI / UX Proses',
    shortDesc: 'Riset UX, user flow, wireframe & handoff',
    q1Welcome:
      'Mode **UI / UX Proses** aktif. Ceritakan siapa target penggunamu, kendala apa yang mereka alami, dan hasil desain apa yang ingin dicapai. Pilihan tag di Pertanyaan 2–5 akan langsung menyesuaikan — dan kamu bebas memilih sebanyak apa pun tag yang sesuai.',
    q1Placeholder:
      'Contoh: Desainer UI/UX yang merapikan alur checkout aplikasi belanja agar langkah bayar lebih ringkas...',
    starterStories: [
      {
        label: 'Redesign Alur Checkout',
        text: 'Desainer UI/UX yang merancang ulang alur checkout aplikasi belanja lokal agar tingkat batal beli turun dan langkah bayar lebih ringkas.',
      },
      {
        label: 'UX Research Onboarding Fintech',
        text: 'Tim produk yang perlu memetakan user journey dan pain point pengguna pemula saat verifikasi identitas pertama kali di aplikasi keuangan.',
      },
      {
        label: 'Design System & Handoff',
        text: 'UI/UX Lead yang ingin menyusun struktur komponen, state layar, dan panduan handoff Figma agar developer konsisten membangun tampilan.',
      },
    ],
    businessPresets: {
      successMetricsExamples: [
        'Task completion rate usability test >= 85%',
        'Waktu pengguna menyelesaikan alur utama turun >= 40%',
        'Revisi UI pasca-handoff ke developer <= 2 iterasi',
      ],
      userRolesExamples: [
        'UI/UX Designer, UX Researcher, Frontend Engineer & QA',
        'Pengguna baru (awam) vs pengguna berulang dengan shortcut cepat',
        'Setiap layar inti wajib mencakup 4 state (Normal, Loading, Empty, Error)',
      ],
      nonGoalsExamples: [
        'Belum masuk tahap coding produksi dan integrasi API backend live pada fase desain ini',
        'Belum membuat variasi tema visual tambahan di luar token dasar MVP',
      ],
      technicalConstraintsExamples: [
        'Komponen Figma Auto-Layout + Design Token 8pt grid & dokumentasi Dev Mode',
        'Aksesibilitas WCAG AA (kontras teks >= 4.5:1) & tap target mobile >= 44x44px (viewport 375px)',
      ],
      defaultPreset: {
        successMetrics:
          'Task completion usability test >= 85%; waktu penyelesaian alur utama turun >= 40%; revisi dev pasca-handoff <= 2 iterasi.',
        userRolesAndRules:
          'Aktor: Pengguna Utama, UI/UX Designer, Frontend Engineer & QA. Aturan desain: setiap layar inti wajib mendokumentasikan 4 state (Normal, Loading, Empty, Error) beserta microcopy aktif.',
        nonGoals:
          'Belum mencakup penulisan kode produksi, setup server/database, dan integrasi payment gateway live pada tahap proses UI/UX ini.',
        technicalConstraints:
          'Deliverable di Figma Auto-Layout dengan 8pt grid, semantic color tokens, standar kontras WCAG AA >= 4.5:1, dan responsif mobile 375px hingga desktop 1440px.',
      },
    },
  },
  {
    id: 'application',
    label: 'Aplikasi',
    shortDesc: 'Fitur app, onboarding, state & integrasi',
    q1Welcome:
      'Mode **Aplikasi** aktif. Ceritakan siapa pengguna utamamu dan aktivitas apa yang ingin mereka selesaikan lewat aplikasi ini. Pertanyaan 2–5 akan otomatis menyesuaikan konteks ceritamu dan bebas kamu pilih tanpa batas.',
    q1Placeholder:
      'Contoh: Pemilik kedai kopi butuh aplikasi kasir & stok agar penjualan otomatis sinkron...',
    starterStories: [
      {
        label: 'App Kasir & Stok UMKM',
        text: 'Pemilik kedai kopi yang butuh aplikasi kasir dan pencatatan stok harian agar transaksi dan bahan baku otomatis sinkron tanpa rekap manual.',
      },
      {
        label: 'App Belajar & Habit Harian',
        text: 'Mahasiswa yang ingin aplikasi mobile untuk mengatur jadwal belajar, pengingat harian, dan melacak progres latihan mingguan.',
      },
      {
        label: 'App Tracker Revisi Proyek',
        text: 'Freelancer dan klien yang butuh aplikasi pelacakan revisi desain, persetujuan tahapan, dan riwayat file dalam satu workspace.',
      },
    ],
    businessPresets: {
      successMetricsExamples: [
        'Aktivasi onboarding pengguna baru >= 75% dalam <= 3 menit',
        'Retensi pengguna aktif mingguan (WAU) >= 40% dalam 30 hari',
        'Tingkat keberhasilan transaksi/aksi inti >= 98% tanpa crash',
      ],
      userRolesExamples: [
        'Pengguna Utama (Member/Staf) vs Admin/Owner dengan hak persetujuan',
        'Staf hanya dapat melihat & input transaksi harian, Owner akses penuh laporan & edit harga',
        'Perubahan data penting tercatat di riwayat aktivitas (audit log)',
      ],
      nonGoalsExamples: [
        'Belum mendukung integrasi ERP/akuntansi eksternal dan mode multi-cabang enterprise di v1',
        'Belum menyediakan aplikasi desktop offline penuh di luar mobile/web app MVP',
      ],
      technicalConstraintsExamples: [
        'Response time API <= 300ms (P95) dengan offline queue & tombol retry saat koneksi putus',
        'Autentikasi token aman, validasi input server-side, dan enkripsi data sensitif pengguna',
      ],
      defaultPreset: {
        successMetrics:
          'Aktivasi onboarding pengguna baru >= 75% dalam <= 3 menit; retensi aktif mingguan >= 40%; crash-free session >= 99.5%.',
        userRolesAndRules:
          'Role: Pengguna Utama (akses fitur inti & riwayat pribadi) dan Admin/Owner (akses pengelolaan master data, approval & rekap). Aturan: validasi wajib sebelum simpan dan riwayat perubahan tercatat.',
        nonGoals:
          'Belum mencakup fitur multi-cabang enterprise, integrasi ERP pihak ketiga, dan kustomisasi laporan lanjutan pada rilis v1.0.',
        technicalConstraints:
          'Response time API <= 300ms, dukungan Loading Skeleton & Offline/Retry recovery saat koneksi terputus, autentikasi sesi aman, serta perlindungan privasi data pengguna.',
      },
    },
  },
  {
    id: 'website',
    label: 'Website',
    shortDesc: 'Halaman web, alur konten & konversi',
    q1Welcome:
      'Mode **Website** aktif. Ceritakan siapa pengunjung websitemu, masalah yang ingin diatasi, dan tujuan utamanya. Pilihan struktur & fitur di Pertanyaan 2–5 akan langsung menyesuaikan ceritamu dan bebas dipilih tanpa batas.',
    q1Placeholder:
      'Contoh: Studio foto butuh website booking agar klien bisa cek tanggal kosong & bayar DP...',
    starterStories: [
      {
        label: 'Website Toko Kue Pre-Order',
        text: 'Ibu rumah tangga yang jualan kue kering pre-order. Tujuannya bikin website supaya pembeli bisa lihat katalog varian, pilih jadwal kirim, dan checkout tanpa ribet chat WhatsApp.',
      },
      {
        label: 'Website Booking Studio Foto',
        text: 'Fotografer wedding dan studio yang jadwalnya sering bentrok. Tujuannya bikin website booking agar calon klien bisa cek tanggal kosong, pilih paket foto, dan bayar DP.',
      },
      {
        label: 'Website Portofolio & Klien',
        text: 'Desainer UI/UX freelance yang ingin website portofolio profesional agar calon klien mudah menilai studi kasus karya dan mengirim brief proyek.',
      },
    ],
    businessPresets: {
      successMetricsExamples: [
        'Konversi pengunjung ke aksi utama (order/booking/inquiry) >= 8%',
        'Pengunjung menyelesaikan alur konversi dalam <= 3 menit',
        'Skor Lighthouse Performance & SEO >= 90 dengan LCP <= 2.5 detik',
      ],
      userRolesExamples: [
        'Pengunjung Publik (akses tanpa login) vs Pelanggan/Klien vs Admin Pengelola',
        'Batas perubahan/pembatalan jadwal atau pesanan maksimal H-1 sebelum eksekusi',
        'Konfirmasi otomatis dikirim segera setelah form/pembayaran valid',
      ],
      nonGoalsExamples: [
        'Belum membangun aplikasi mobile native (iOS/Android) maupun sistem afiliasi di v1',
        'Belum menyediakan live chat 24 jam penuh di luar form terstruktur & notifikasi otomatis',
      ],
      technicalConstraintsExamples: [
        'Responsif viewport 375px (mobile) hingga 1440px (desktop), LCP <= 2.5 detik, CLS < 0.1',
        'SEO On-Page lengkap (<title> unik, meta description, Open Graph, alt gambar) & HTTPS',
      ],
      defaultPreset: {
        successMetrics:
          'Tingkat konversi pengunjung ke aksi utama >= 8%; penyelesaian alur <= 3 menit; target Core Web Vitals LCP <= 2.5 detik.',
        userRolesAndRules:
          'Role: Pengunjung Publik (eksplorasi & submit tanpa wajib buat akun) dan Admin Pemilik (kelola konten, jadwal/katalog, dan status transaksi). Aturan: validasi form inline dan konfirmasi status instan.',
        nonGoals:
          'Belum membuat aplikasi mobile native iOS/Android, portal multi-vendor, maupun sistem membership kompleks pada rilis website v1.0.',
        technicalConstraints:
          'Desain responsif mobile-first (375px–1440px), standar SEO (<title>, meta description, Open Graph, struktur H1–H3), performa LCP <= 2.5 detik, serta proteksi spam/keamanan form.',
      },
    },
  },
];

export const PRD_PURPOSE_MAP: Record<PrdPurpose, PrdPurposeConfig> = {
  'ui-ux-process': PRD_PURPOSE_OPTIONS[0],
  application: PRD_PURPOSE_OPTIONS[1],
  website: PRD_PURPOSE_OPTIONS[2],
};
