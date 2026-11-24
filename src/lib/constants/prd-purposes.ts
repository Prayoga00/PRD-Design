import type { PrdPurpose } from '@/lib/types/prdin';

export interface PrdPurposeConfig {
  id: PrdPurpose;
  label: string;
  shortDesc: string;
  q1Welcome: string;
  q1Placeholder: string;
  starterStories: Array<{ label: string; text: string }>;
}

export const PRD_PURPOSE_OPTIONS: PrdPurposeConfig[] = [
  {
    id: 'ui-ux-process',
    label: 'UI / UX Proses',
    shortDesc: 'Riset UX, user flow, wireframe & handoff',
    q1Welcome:
      'Halo! Mode **UI / UX Proses** aktif. Ceritakan satu target pengguna yang sedang kamu desain pengalamannya, dan kendala apa yang ingin diselesaikan lewat proses UI/UX ini? Pilihan tag di Pertanyaan 2–5 akan langsung menyesuaikan.',
    q1Placeholder:
      'Contoh: Tim desain yang ingin merapikan alur checkout agar langkah bayar lebih ringkas...',
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
  },
  {
    id: 'application',
    label: 'Aplikasi',
    shortDesc: 'Fitur app, onboarding, state & integrasi',
    q1Welcome:
      'Halo! Mode **Aplikasi** aktif. Ceritakan satu orang yang butuh aplikasi ini dan aktivitas inti apa yang ingin dipermudah? Pilihan fitur serta alur aplikasi di Pertanyaan 2–5 akan langsung ter-update.',
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
  },
  {
    id: 'website',
    label: 'Website',
    shortDesc: 'Halaman web, alur konten & konversi',
    q1Welcome:
      'Halo! Mode **Website** aktif. Ceritakan satu orang yang butuh website ini dan tujuannya membuat web untuk apa? Pilihan struktur & fitur website di Pertanyaan 2–5 akan langsung menyesuaikan ceritamu.',
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
  },
];

export const PRD_PURPOSE_MAP: Record<PrdPurpose, PrdPurposeConfig> = {
  'ui-ux-process': PRD_PURPOSE_OPTIONS[0],
  application: PRD_PURPOSE_OPTIONS[1],
  website: PRD_PURPOSE_OPTIONS[2],
};
