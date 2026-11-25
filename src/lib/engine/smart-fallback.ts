import type {
  AdaptiveQuestionConfig,
  AdaptiveQuestionId,
  DiscoveryState,
  FlowchartDirection,
  PlanSection,
  PrdBusinessContext,
  PrdPurpose,
  ProductArchetype,
  Q1ExtractedSummary,
  WorkspacePatch,
  WorkspaceState,
} from '@/lib/types/prdin';
import type { GenerateWorkspaceOutput, RawBlueprintNode } from '@/lib/schemas/ai-contracts';
import { PRD_PURPOSE_MAP } from '@/lib/constants/prd-purposes';
import { layoutBlueprintNodes } from './layout-graph';
import { buildInitialRoadmapTasks } from './roadmap-defaults';

interface ArchetypeBlueprint {
  label: string;
  defaultProductName: string;
  defaultPersona: string;
  defaultPain: string;
  defaultValueContext: string;
  q2Prompt: string;
  q2Tags: { id: string; label: string; description: string }[];
  q3Prompt: string;
  q3Tags: { id: string; label: string; description: string }[];
  q4Prompt: string;
  q4Tags: { id: string; label: string; description: string }[];
  q5Prompt: string;
  q5Tags: { id: string; label: string; description: string }[];
}

const ARCHETYPE_BLUEPRINTS: Record<ProductArchetype, ArchetypeBlueprint> = {
  ecommerce: {
    label: 'Toko Online & Jual-Beli',
    defaultProductName: 'Katalog & Order Toko Online',
    defaultPersona: 'Pembeli & pemilik usaha kecil yang lelah mengurus pesanan manual lewat chat',
    defaultPain: 'Pembeli bingung cek stok/harga dan penjual sering salah catat pesanan manual',
    defaultValueContext: 'jualan dan beli barang dengan praktis',
    q2Prompt: 'Waktu pertama kali pengguna membuka platform jual-beli ini, satu hal apa yang harus dilakukan?',
    q2Tags: [
      { id: 'ec-q2-1', label: 'Lihat Katalog Produk Unggulan', description: 'Langsung tampilkan produk utama + harga jelas tanpa wajib login' },
      { id: 'ec-q2-2', label: 'Pilih Kategori atau Cari Barang', description: 'Bantu pembeli cepat menemukan produk sesuai kebutuhan' },
      { id: 'ec-q2-3', label: 'Daftar / Atur Profil Toko', description: 'Untuk penjual yang baru pertama setup katalog toko' },
      { id: 'ec-q2-4', label: 'Pilih Tanggal Pre-Order / Slot', description: 'Cocok untuk usaha makanan/custom yang berbasis jadwal PO' },
      { id: 'ec-q2-5', label: 'Lihat Promo & Paket Bundling', description: 'Menarik minat pembeli pertama lewat penawaran spesial' },
    ],
    q3Prompt: 'Dari fitur-fitur berikut, mana 3 fitur yang paling wajib harus ada di versi awal?',
    q3Tags: [
      { id: 'ec-q3-1', label: 'Katalog Produk + Varian & Harga', description: 'Foto, deskripsi singkat, pilihan ukuran/rasa, dan status stok' },
      { id: 'ec-q3-2', label: 'Keranjang & Checkout Cepat', description: 'Ringkasan belanja, alamat kirim, dan total otomatis' },
      { id: 'ec-q3-3', label: 'Pembayaran Otomatis / QRIS', description: 'Konfirmasi bayar instan tanpa kirim bukti transfer manual' },
      { id: 'ec-q3-4', label: 'Kirim Ringkasan Order ke WhatsApp', description: 'Alternatif ringan agar penjual UMKM tetap nyaman follow-up' },
      { id: 'ec-q3-5', label: 'Tracking Status Pesanan', description: 'Pembeli bisa cek status diproses, dikirim, atau siap diambil' },
      { id: 'ec-q3-6', label: 'Dashboard Rekap Order Penjual', description: 'Daftar pesanan masuk rapi agar tidak ada yang terlewat' },
      { id: 'ec-q3-7', label: 'Ulasan & Bukti Foto Pembeli', description: 'Meningkatkan rasa percaya bagi calon pembeli baru' },
    ],
    q4Prompt: 'Menurutmu, apa yang bikin orang mau pakai produkmu untuk jualan/beli barang?',
    q4Tags: [
      { id: 'ec-q4-1', label: 'Checkout Cepat Tanpa Wajib Bikin Akun', description: 'Mengurangi hambatan pembeli baru saat mau transaksi' },
      { id: 'ec-q4-2', label: 'Harga, Ongkir & Stok Transparan', description: 'Tidak perlu tanya admin dulu baru tahu total biaya' },
      { id: 'ec-q4-3', label: 'Tampilan Foto & Info Produk Terpercaya', description: 'Visual bersih dengan ulasan nyata dan garansi jelas' },
      { id: 'ec-q4-4', label: 'Bisa Bayar Pakai QRIS / E-Wallet', description: 'Metode pembayaran familiar dan langsung terverifikasi' },
      { id: 'ec-q4-5', label: 'Rekap Otomatis Hemat Waktu Penjual', description: 'Penjual tidak perlu salin alamat & pesanan secara manual' },
    ],
    q5Prompt: 'Apakah yang bikin orang bakal balik lagi membukanya, bukan cuma sekali doang?',
    q5Tags: [
      { id: 'ec-q5-1', label: 'Poin Loyalitas & Voucher Repeat Order', description: 'Diskon otomatis untuk pembelian ke-2 dan seterusnya' },
      { id: 'ec-q5-2', label: 'Notifikasi Produk Baru / Restock', description: 'Kabar cepat saat produk favorit atau batch PO dibuka lagi' },
      { id: 'ec-q5-3', label: 'Fitur Beli Lagi (1-Click Reorder)', description: 'Riwayat order tersimpan sehingga belanja ulang cukup sekali klik' },
      { id: 'ec-q5-4', label: 'Tracking Pengiriman Real-Time', description: 'User sering kembali membuka halaman untuk pantau paketnya' },
      { id: 'ec-q5-5', label: 'Paket Langganan / Bundling Mingguan', description: 'Mendorong pembelian rutin dengan harga lebih hemat' },
    ],
  },
  booking: {
    label: 'Booking & Layanan Jasa',
    defaultProductName: 'Sistem Reservasi & Booking Jasa',
    defaultPersona: 'Calon pelanggan yang ingin memesan jadwal layanan tanpa bolak-balik chat admin',
    defaultPain: 'Jadwal sering bentrok dan pelanggan ragu slot mana yang masih tersedia',
    defaultValueContext: 'memesan jadwal atau layanan dengan pasti',
    q2Prompt: 'Waktu pertama kali pengguna membuka platform booking ini, satu hal apa yang harus dilakukan?',
    q2Tags: [
      { id: 'bk-q2-1', label: 'Pilih Jenis Layanan / Paket', description: 'Pengguna melihat daftar layanan, durasi, dan estimasi biaya' },
      { id: 'bk-q2-2', label: 'Cek Kalender Slot Tersedia', description: 'Langsung melihat tanggal dan jam yang masih kosong' },
      { id: 'bk-q2-3', label: 'Lihat Portofolio & Profil Penyedia Jasa', description: 'Membangun kepercayaan sebelum memilih jadwal' },
      { id: 'bk-q2-4', label: 'Pilih Lokasi / Cabang Layanan', description: 'Menyesuaikan jadwal dengan area terdekat pengguna' },
    ],
    q3Prompt: 'Dari fitur-fitur berikut, mana 3 fitur yang paling wajib harus ada di sistem booking ini?',
    q3Tags: [
      { id: 'bk-q3-1', label: 'Kalender Slot Real-Time', description: 'Pilihan tanggal & jam yang otomatis terkunci saat sudah dibooking' },
      { id: 'bk-q3-2', label: 'Form Data Singkat & Konfirmasi Booking', description: 'Nama, kontak WhatsApp, dan catatan kebutuhan khusus' },
      { id: 'bk-q3-3', label: 'Pembayaran DP / Booking Fee', description: 'Mengurangi risiko pelanggan batal mendadak tanpa kabar' },
      { id: 'bk-q3-4', label: 'Pengingat Otomatis (WA/Email Reminder)', description: 'Notifikasi H-1 dan H-2 jam sebelum jadwal dimulai' },
      { id: 'bk-q3-5', label: 'Reschedule & Pembatalan Mandiri', description: 'Pelanggan bisa ubah jadwal tanpa harus hubungi admin' },
      { id: 'bk-q3-6', label: 'Dashboard Jadwal Harian Penyedia Jasa', description: 'Tampilan agenda harian tim agar tidak terjadi double booking' },
    ],
    q4Prompt: 'Menurutmu, apa yang bikin orang mau pakai sistemmu untuk memesan layanan/jadwal ini?',
    q4Tags: [
      { id: 'bk-q4-1', label: 'Kepastian Slot Tanpa Tunggu Balas Chat', description: 'Langsung dapat konfirmasi jadwal dalam hitungan detik' },
      { id: 'bk-q4-2', label: 'Daftar Harga & Durasi Transparan', description: 'Pelanggan tahu persis biaya sebelum datang' },
      { id: 'bk-q4-3', label: 'Ulasan & Hasil Karya Sebelumnya', description: 'Membuktikan kualitas layanan sebelum bayar DP' },
      { id: 'bk-q4-4', label: 'Bisa Pilih Petugas / Spesialis Favorit', description: 'Personalisasi pengalaman sesuai preferensi pelanggan' },
    ],
    q5Prompt: 'Apakah yang bikin pelanggan bakal balik lagi memesan lewat platformmu?',
    q5Tags: [
      { id: 'bk-q5-1', label: 'Pengingat Jadwal Berkala', description: 'Notifikasi saat waktunya servis/perawatan/konsultasi ulang' },
      { id: 'bk-q5-2', label: 'Riwayat Layanan & Catatan Personal', description: 'Data preferensi tersimpan untuk kunjungan berikutnya' },
      { id: 'bk-q5-3', label: 'Kartu Member / Kunjungan ke-5 Gratis', description: 'Program loyalitas sederhana yang mendorong repeat visit' },
      { id: 'bk-q5-4', label: 'Re-book Cepat dari Riwayat', description: 'Pesan ulang layanan yang sama hanya dengan 2 klik' },
    ],
  },
  saas: {
    label: 'SaaS / Produktivitas',
    defaultProductName: 'Workspace Produktivitas',
    defaultPersona: 'Profesional atau tim kecil yang kewalahan mengelola pekerjaan di banyak tools terpisah',
    defaultPain: 'Proses kerja lambat karena data tersebar di chat, spreadsheet, dan catatan manual',
    defaultValueContext: 'menyelesaikan pekerjaannya lebih terstruktur',
    q2Prompt: 'Waktu pertama kali pengguna masuk ke produk ini, satu hal apa yang harus langsung dilakukan?',
    q2Tags: [
      { id: 'sa-q2-1', label: 'Buat Proyek / Workspace Pertama', description: 'Onboarding interaktif langsung menghasilkan ruang kerja nyata' },
      { id: 'sa-q2-2', label: 'Pilih Template Siap Pakai', description: 'Pengguna tidak mulai dari layar kosong' },
      { id: 'sa-q2-3', label: 'Import Data / Catatan yang Sudah Ada', description: 'Memindahkan data lama dari CSV atau spreadsheet dalam sekali klik' },
      { id: 'sa-q2-4', label: 'Coba Demo Interaktif Tanpa Daftar', description: 'Rasakan manfaat utama dulu sebelum diminta buat akun' },
    ],
    q3Prompt: 'Dari fitur-fitur berikut, mana 3 fitur yang paling wajib harus ada di versi pertama?',
    q3Tags: [
      { id: 'sa-q3-1', label: 'Autentikasi & Pengaturan Workspace', description: 'Login simpel (Google/Email) + profil ruang kerja pribadi/tim' },
      { id: 'sa-q3-2', label: 'Core Workflow Board / Tracker', description: 'Tampilan utama untuk membuat, memantau, dan mengubah status pekerjaan' },
      { id: 'sa-q3-3', label: 'Asisten Otomatisasi / Smart Suggestion', description: 'Membantu meringkas, mengisi, atau menyarankan langkah berikutnya' },
      { id: 'sa-q3-4', label: 'Filter, Pencarian & Ringkasan Progres', description: 'Memudahkan menemukan item penting dan melihat capaian' },
      { id: 'sa-q3-5', label: 'Export Laporan / Share Link', description: 'Membagikan hasil kerja ke klien atau rekan tim' },
      { id: 'sa-q3-6', label: 'Notifikasi Deadline & Aktivitas', description: 'Pengingat tugas penting agar tidak terlewat' },
    ],
    q4Prompt: 'Menurutmu, apa yang bikin orang mau pakai produkmu untuk menyelesaikan pekerjaannya?',
    q4Tags: [
      { id: 'sa-q4-1', label: 'Langsung Terasa Manfaatnya di 3 Menit Pertama', description: 'Zero setup rumit, langsung dapat hasil yang bisa dipakai' },
      { id: 'sa-q4-2', label: 'Menggantikan 3 Tools Manual Sekaligus', description: 'Hemat waktu daripada bolak-balik chat dan spreadsheet' },
      { id: 'sa-q4-3', label: 'Antarmuka Bersih & Ramah Pemula', description: 'Tidak menakutkan seperti software enterprise yang penuh tombol' },
      { id: 'sa-q4-4', label: 'Output Bisa Langsung Dibagikan / Diexport', description: 'Hasil kerja langsung berguna untuk presentasi atau kolaborasi' },
    ],
    q5Prompt: 'Apakah yang bikin pengguna bakal balik lagi membukanya setiap minggu?',
    q5Tags: [
      { id: 'sa-q5-1', label: 'Data & Riwayat Kerja Tersimpan Aman', description: 'Semakin sering dipakai, semakin bernilai arsip kerjanya' },
      { id: 'sa-q5-2', label: 'Ringkasan Progres Mingguan Otomatis', description: 'Mengingatkan target yang sudah tercapai dan langkah selanjutnya' },
      { id: 'sa-q5-3', label: 'Kolaborasi & Komentar Tim', description: 'Mengundang rekan atau klien menciptakan alasan kembali bersama' },
      { id: 'sa-q5-4', label: 'Template & Workflow Berulang', description: 'Kebiasaan kerja harian bertumpu pada checklist di dalam produk' },
    ],
  },
  portfolio: {
    label: 'Portofolio & Creative Showcase',
    defaultProductName: 'Portofolio & Lead Capture',
    defaultPersona: 'Kreator, desainer, atau studio yang ingin karyanya tampil meyakinkan dan mendatangkan klien',
    defaultPain: 'Karya hanya tersebar di media sosial sehingga calon klien sulit melihat kapabilitas lengkap dan cara menghubungi',
    defaultValueContext: 'menilai kualitas karya dan menghubungi kreator',
    q2Prompt: 'Waktu pertama kali pengunjung melihat portofolio ini, satu hal apa yang harus mereka lakukan?',
    q2Tags: [
      { id: 'pf-q2-1', label: 'Lihat Karya Terbaik (Featured Case Study)', description: 'Langsung menyuguhkan 2–3 proyek paling kuat di layar pertama' },
      { id: 'pf-q2-2', label: 'Pahami Keahlian & Layanan Utama', description: 'Pernyataan nilai jelas: siapa kamu dan masalah apa yang kamu bantu' },
      { id: 'pf-q2-3', label: 'Filter Karya Berdasarkan Kategori', description: 'Memudahkan klien menemukan proyek yang mirip kebutuhannya' },
      { id: 'pf-q2-4', label: 'Klik Tombol Diskusi / Konsultasi', description: 'Ajakan langsung bagi pengunjung yang sudah siap bekerja sama' },
    ],
    q3Prompt: 'Dari fitur-fitur berikut, mana 3 fitur yang paling wajib harus ada?',
    q3Tags: [
      { id: 'pf-q3-1', label: 'Galeri Proyek + Studi Kasus Ringkas', description: 'Menampilkan masalah, proses, dan hasil nyata dari tiap karya' },
      { id: 'pf-q3-2', label: 'Daftar Layanan & Estimasi Paket', description: 'Menjelaskan apa saja yang bisa dikerjakan beserta alur kerja' },
      { id: 'pf-q3-3', label: 'Form Inquiry / Request Quotation', description: 'Menjaring brief awal klien beserta budget dan timeline' },
      { id: 'pf-q3-4', label: 'Testimoni & Daftar Klien', description: 'Bukti sosial yang meningkatkan kredibilitas di mata klien baru' },
      { id: 'pf-q3-5', label: 'Tentang Kreator & Download CV', description: 'Ringkasan latar belakang untuk rekruter maupun agensi' },
    ],
    q4Prompt: 'Menurutmu, apa yang bikin calon klien tertarik menghubungi kamu?',
    q4Tags: [
      { id: 'pf-q4-1', label: 'Studi Kasus Menunjukkan Dampak Nyata', description: 'Bukan cuma gambar cantik, tapi terlihat solusi bisnisnya' },
      { id: 'pf-q4-2', label: 'Cara Kontak & Proses Kerja Sangat Jelas', description: 'Klien tahu apa yang terjadi setelah mengirim pesan' },
      { id: 'pf-q4-3', label: 'Identitas Visual Khas & Profesional', description: 'Kesan pertama langsung mencerminkan kualitas kerja' },
      { id: 'pf-q4-4', label: 'Transparansi Layanan & Ketersediaan', description: 'Klien tahu apakah kamu sedang tersedia untuk proyek baru' },
    ],
    q5Prompt: 'Apakah yang bikin orang bakal balik lagi mengikuti karyamu?',
    q5Tags: [
      { id: 'pf-q5-1', label: 'Artikel / Catatan Proses Desain (Blog)', description: 'Insight edukatif yang membuat pembaca kembali mencari referensi' },
      { id: 'pf-q5-2', label: 'Update Proyek & Eksperimen Terbaru', description: 'Showcase rutin karya baru menjaga relevansi' },
      { id: 'pf-q5-3', label: 'Resource / Freebies yang Bisa Diunduh', description: 'Template atau aset gratis yang mendorong kunjungan berulang' },
      { id: 'pf-q5-4', label: 'Newsletter / Update Ketersediaan', description: 'Mengabari jaringan saat slot kerja baru dibuka' },
    ],
  },
  education: {
    label: 'Edukasi & Komunitas Belajar',
    defaultProductName: 'Platform Belajar & Komunitas',
    defaultPersona: 'Pelajar atau pembelajar mandiri yang ingin menguasai keterampilan baru secara terarah',
    defaultPain: 'Materi belajar terlalu acak di internet sehingga mudah kehilangan motivasi di tengah jalan',
    defaultValueContext: 'belajar dan berlatih secara terstruktur',
    q2Prompt: 'Waktu pertama kali peserta membuka platform belajar ini, satu hal apa yang harus dilakukan?',
    q2Tags: [
      { id: 'ed-q2-1', label: 'Pilih Jalur Belajar / Level Kemampuan', description: 'Menempatkan peserta di materi yang pas, tidak terlalu sulit' },
      { id: 'ed-q2-2', label: 'Coba Materi Pertama Gratis (1-Click Lesson)', description: 'Langsung merasakan cara mengajar tanpa terhalang paywall panjang' },
      { id: 'ed-q2-3', label: 'Lihat Silabus & Target Hasil Belajar', description: 'Memahami skill konkret yang akan dikuasai setelah selesai' },
      { id: 'ed-q2-4', label: 'Atur Target Belajar Mingguan', description: 'Membangun komitmen waktu sejak awal bergabung' },
    ],
    q3Prompt: 'Dari fitur-fitur berikut, mana 3 fitur yang paling wajib harus ada di platform belajar ini?',
    q3Tags: [
      { id: 'ed-q3-1', label: 'Kurikulum Terstruktur per Modul', description: 'Materi video/teks singkat dengan urutan langkah yang jelas' },
      { id: 'ed-q3-2', label: 'Latihan Interaktif / Kuis Singkat', description: 'Uji pemahaman langsung setelah setiap pelajaran' },
      { id: 'ed-q3-3', label: 'Tracker Progres & Sertifikat', description: 'Menampilkan persentase selesai dan pencapaian peserta' },
      { id: 'ed-q3-4', label: 'Forum Diskusi & Tanya Mentor', description: 'Tempat bertanya saat peserta menemui kebingungan' },
      { id: 'ed-q3-5', label: 'Pembayaran Kelas / Akses Membership', description: 'Alur pendaftaran berbayar yang simpel dan aman' },
    ],
    q4Prompt: 'Menurutmu, apa yang bikin orang mau daftar dan belajar lewat platformmu?',
    q4Tags: [
      { id: 'ed-q4-1', label: 'Materi Ringkas, Praktis & Bahasa Mudah', description: 'Langsung praktik contoh nyata, bukan teori bertele-tele' },
      { id: 'ed-q4-2', label: 'Ada Jalur Jelas dari Nol Sampai Bisa', description: 'Peserta tidak bingung harus mulai dari mana' },
      { id: 'ed-q4-3', label: 'Bisa Tanya Langsung Jika Mentok', description: 'Rasa aman karena ada pendampingan atau komunitas' },
      { id: 'ed-q4-4', label: 'Pratinjau Gratis Sebelum Membayar', description: 'Membuktikan kualitas pengajaran terlebih dahulu' },
    ],
    q5Prompt: 'Apakah yang bikin peserta bakal balik lagi membuka platform belajarmu hingga tamat?',
    q5Tags: [
      { id: 'ed-q5-1', label: 'Streak Belajar & Target Harian', description: 'Menjaga konsistensi belajar 10–15 menit per hari' },
      { id: 'ed-q5-2', label: 'Proyek Praktik & Umpan Balik', description: 'Tantangan nyata yang mendapat review dari mentor/komunitas' },
      { id: 'ed-q5-3', label: 'Sesi Live Mingguan / Diskusi Komunitas', description: 'Jadwal berkumpul rutin bersama sesama pembelajar' },
      { id: 'ed-q5-4', label: 'Sertifikat & Portofolio Lulusan', description: 'Motivasi menyelesaikan seluruh modul sampai akhir' },
    ],
  },
  'internal-tool': {
    label: 'Internal Tool & Operasional',
    defaultProductName: 'Sistem Operasional Internal',
    defaultPersona: 'Tim operasional atau admin yang selama ini merekap data harian lewat banyak file terpisah',
    defaultPain: 'Input data berulang rawan salah ketik dan pimpinan sulit melihat laporan real-time',
    defaultValueContext: 'mengelola data operasional dan persetujuan tim',
    q2Prompt: 'Waktu pertama kali staf membuka sistem internal ini, satu hal apa yang harus dilakukan?',
    q2Tags: [
      { id: 'in-q2-1', label: 'Login Sesuai Role (Admin / Staf)', description: 'Membatasi akses menu dan data sesuai tanggung jawab jabatan' },
      { id: 'in-q2-2', label: 'Lihat Ringkasan Tugas Hari Ini', description: 'Langsung melihat item yang perlu diproses atau disetujui' },
      { id: 'in-q2-3', label: 'Input Data Transaksi / Pengajuan Baru', description: 'Form cepat untuk pencatatan harian di lapangan' },
      { id: 'in-q2-4', label: 'Cari Data atau Filter Status', description: 'Menemukan catatan spesifik dalam hitungan detik' },
    ],
    q3Prompt: 'Dari fitur-fitur berikut, mana 3 fitur yang paling wajib harus ada di sistem operasional ini?',
    q3Tags: [
      { id: 'in-q3-1', label: 'Tabel Data + Filter & Pencarian Cepat', description: 'Menampilkan daftar catatan lengkap dengan status yang jelas' },
      { id: 'in-q3-2', label: 'Form Input / Edit dengan Validasi', description: 'Mencegah salah ketik angka, tanggal, atau field wajib' },
      { id: 'in-q3-3', label: 'Alur Persetujuan (Approval Workflow)', description: 'Pengajuan dari staf diteruskan otomatis untuk disetujui manajer' },
      { id: 'in-q3-4', label: 'Manajemen Hak Akses (Role & Audit Log)', description: 'Mencatat siapa mengubah data apa dan kapan' },
      { id: 'in-q3-5', label: 'Export Rekap CSV / Laporan Bulanan', description: 'Siap diunduh untuk rapat manajemen atau akuntansi' },
    ],
    q4Prompt: 'Menurutmu, apa yang bikin tim operasional mau meninggalkan cara lama dan pakai sistem ini?',
    q4Tags: [
      { id: 'in-q4-1', label: 'Input Jauh Lebih Cepat dari Spreadsheet', description: 'Field otomatis terisi dan minim klik berulang' },
      { id: 'in-q4-2', label: 'Data Satu Pintu Tanpa Duplikasi File', description: 'Semua orang melihat angka yang sama secara real-time' },
      { id: 'in-q4-3', label: 'Status Pengajuan Jelas Tanpa Tanya Berulang', description: 'Tidak perlu follow-up manual untuk cek apakah sudah disetujui' },
      { id: 'in-q4-4', label: 'Laporan Otomatis Siap Rapat', description: 'Menghemat jam kerja admin saat rekap akhir bulan' },
    ],
    q5Prompt: 'Apakah yang bikin tim terus aktif mengandalkan sistem ini setiap hari?',
    q5Tags: [
      { id: 'in-q5-1', label: 'Menjadi Sumber Data Resmi Harian', description: 'Semua tugas operasional & approval hanya sah lewat sistem ini' },
      { id: 'in-q5-2', label: 'Notifikasi Item Mendesak / Pending', description: 'Pengingat otomatis jika ada persetujuan tertunda' },
      { id: 'in-q5-3', label: 'Rekap KPI & Performa Harian', description: 'Tim bisa memantau target kerja hariannya langsung' },
      { id: 'in-q5-4', label: 'Riwayat Pencarian & Log Lengkap', description: 'Memudahkan melacak riwayat transaksi lama saat dibutuhkan' },
    ],
  },
  custom: {
    label: 'Produk Digital Custom',
    defaultProductName: 'Produk Digital Custom',
    defaultPersona: 'Pengguna target yang membutuhkan solusi digital lebih cepat dan terarah dari alur manual',
    defaultPain: 'Alur kerja saat ini masih terpecah dan membingungkan bagi pengguna awam',
    defaultValueContext: 'mencapai tujuan utamanya dengan jelas',
    q2Prompt: 'Waktu pertama kali pengguna memulai, satu hal apa yang harus dilakukan?',
    q2Tags: [
      { id: 'cu-q2-1', label: 'Pahami Nilai Utama & Mulai Aksi Pertama', description: 'Panduan singkat di layar awal yang langsung mengarahkan ke fungsi inti' },
      { id: 'cu-q2-2', label: 'Isi Profil atau Kebutuhan Singkat', description: 'Personalisasi pengalaman sesuai kondisi pengguna' },
      { id: 'cu-q2-3', label: 'Jelajahi Konten / Fitur Utama Tanpa Login', description: 'Mengurangi gesekan bagi pengunjung baru' },
      { id: 'cu-q2-4', label: 'Daftar / Masuk Akun untuk Menyimpan Data', description: 'Diperlukan jika pengguna langsung menyimpan proyek pribadi' },
    ],
    q3Prompt: 'Dari fitur-fitur berikut, mana 3 fitur yang paling wajib harus ada?',
    q3Tags: [
      { id: 'cu-q3-1', label: 'Halaman Utama & Alur Onboarding Terarah', description: 'Menjelaskan manfaat dan memandu langkah pertama' },
      { id: 'cu-q3-2', label: 'Fitur Eksekusi Tugas Inti (Core Action)', description: 'Fungsi utama yang menyelesaikan masalah pengguna' },
      { id: 'cu-q3-3', label: 'Pencarian, Filter & Pengorganisasian Data', description: 'Membantu pengguna menemukan atau mengelompokkan item' },
      { id: 'cu-q3-4', label: 'Simpan Progres / Akun Pengguna', description: 'Agar pekerjaan atau transaksi pengguna tidak hilang' },
      { id: 'cu-q3-5', label: 'Notifikasi / Ringkasan Hasil', description: 'Memberi umpan balik jelas setelah aksi selesai' },
      { id: 'cu-q3-6', label: 'Export / Bagikan Hasil ke Orang Lain', description: 'Memperluas kegunaan produk di luar sistem' },
    ],
    q4Prompt: 'Menurutmu, apa yang bikin orang mau memakainya sesuai tujuannya?',
    q4Tags: [
      { id: 'cu-q4-1', label: 'Alur Sederhana & Mudah Dipahami Awam', description: 'Tidak perlu tutorial panjang untuk mulai menggunakan' },
      { id: 'cu-q4-2', label: 'Menyelesaikan Masalah Lebih Cepat dari Cara Manual', description: 'Manfaat langsung terasa dalam sekali pakai' },
      { id: 'cu-q4-3', label: 'Informasi Jelas & Bisa Dipercaya', description: 'Transparan dari awal hingga hasil akhir' },
      { id: 'cu-q4-4', label: 'Tampilan Visual Nyaman di HP & Desktop', description: 'Responsif di mana pun pengguna membukanya' },
    ],
    q5Prompt: 'Apakah yang bikin orang bakal balik lagi, bukan cuma sekali doang?',
    q5Tags: [
      { id: 'cu-q5-1', label: 'Riwayat & Data Tersimpan Rapi', description: 'Pengguna kembali untuk melihat atau melanjutkan datanya' },
      { id: 'cu-q5-2', label: 'Update Konten / Fitur Berkala', description: 'Selalu ada hal baru yang relevan untuk dicek' },
      { id: 'cu-q5-3', label: 'Pengingat Otomatis yang Bermanfaat', description: 'Mengajak pengguna kembali tepat saat dibutuhkan' },
      { id: 'cu-q5-4', label: 'Program Loyalitas / Kemudahan Ulangi Aksi', description: 'Pemakaian kedua terasa jauh lebih cepat dari yang pertama' },
    ],
  },
};

const UI_UX_PROCESS_BLUEPRINT: Omit<ArchetypeBlueprint, 'label' | 'defaultProductName' | 'defaultPersona' | 'defaultPain' | 'defaultValueContext'> = {
  q2Prompt: 'Saat memulai proses UI/UX proyek ini, satu fondasi riset atau pemetaan apa yang harus dilakukan pertama kali?',
  q2Tags: [
    { id: 'ux-q2-1', label: 'Audit Alur Lama & Titik Friction', description: 'Mencari di langkah mana pengguna paling sering bingung atau berhenti' },
    { id: 'ux-q2-2', label: 'User Interview & Validasi Masalah', description: 'Menggali kebutuhan langsung dari 3–5 target pengguna nyata' },
    { id: 'ux-q2-3', label: 'Pemetaan User Journey & Empathy Map', description: 'Menyusun emosi, tujuan, dan hambatan user dari awal hingga akhir' },
    { id: 'ux-q2-4', label: 'Susun Information Architecture (IA)', description: 'Merancang struktur navigasi, menu, dan pengelompokan konten' },
    { id: 'ux-q2-5', label: 'Benchmark Pola UI & Aksesibilitas', description: 'Membandingkan pola desain familiar agar user awam cepat paham' },
  ],
  q3Prompt: 'Dari tahapan & artefak UI/UX berikut, mana 3 hal yang paling wajib dihasilkan di proyek ini?',
  q3Tags: [
    { id: 'ux-q3-1', label: 'Persona & Problem Framing Board', description: 'Profil pengguna, pain point utama, dan metrik keberhasilan pengalaman' },
    { id: 'ux-q3-2', label: 'End-to-End User Flow Diagram', description: 'Diagram alur layar, cabang keputusan, dan kondisi gagal' },
    { id: 'ux-q3-3', label: 'Wireframe Layar Inti + 4 State', description: 'Sketsa layar utama mencakup kondisi Normal, Loading, Empty, dan Error' },
    { id: 'ux-q3-4', label: 'Prototype Interaktif Siap Usability Test', description: 'Alur klik di Figma untuk diuji ke pengguna sebelum coding' },
    { id: 'ux-q3-5', label: 'Design System & Token Komponen', description: 'Standar tipografi, warna, spasi, dan komponen reusable' },
    { id: 'ux-q3-6', label: 'Usability Test Plan & Checklist Revisi', description: 'Skenario tugas uji coba dan kriteria lolos desain' },
    { id: 'ux-q3-7', label: 'Spec Handoff Developer & Microcopy', description: 'Catatan perilaku interaksi, validasi form, dan copy tombol' },
  ],
  q4Prompt: 'Menurutmu, apa yang bikin hasil proses UI/UX ini benar-benar membantu pengguna dan siap dieksekusi tim?',
  q4Tags: [
    { id: 'ux-q4-1', label: 'Langkah Tugas Terpangkas & Mudah Dipahami', description: 'Pengguna awam menyelesaikan tujuan dengan klik seminimal mungkin' },
    { id: 'ux-q4-2', label: 'Semua Edge Case & Error State Terjaga', description: 'Tidak ada jalan buntu saat input salah atau data kosong' },
    { id: 'ux-q4-3', label: 'Tervalidasi Langsung Lewat Usability Testing', description: 'Keputusan desain berbasis bukti perilaku user, bukan asumsi' },
    { id: 'ux-q4-4', label: 'Handoff Figma Jelas Tanpa Tanya Berulang', description: 'Developer langsung paham ukuran, state, dan alur antar layar' },
  ],
  q5Prompt: 'Apa yang bikin dokumentasi & proses UI/UX ini terus dipakai kembali oleh tim desain maupun developer?',
  q5Tags: [
    { id: 'ux-q5-1', label: 'Library Komponen Figma Terdokumentasi', description: 'Komponen bisa langsung dipakai ulang di fitur berikutnya' },
    { id: 'ux-q5-2', label: 'Arsip Temuan Riset & Feedback Terstruktur', description: 'Menjadi referensi saat melakukan iterasi desain versi selanjutnya' },
    { id: 'ux-q5-3', label: 'Checklist QA Desain Sebelum Rilis', description: 'Dipakai rutin untuk memverifikasi kesesuaian hasil coding vs desain' },
    { id: 'ux-q5-4', label: 'Design System Changelog & Token Sync', description: 'Menjaga konsistensi visual lintas halaman dan rilis produk' },
  ],
};

const ARCHETYPE_SIGNALS: Array<{ archetype: ProductArchetype; patterns: RegExp[]; weight: number }> = [
  {
    archetype: 'ecommerce',
    weight: 3,
    patterns: [
      /(jual|beli|toko|produk|kue|baju|merch|checkout|keranjang|cart|pre-order|preorder|\bpo\b|umkm|dagang|warung|olshop|marketplace|katalog|ongkir|belanja)/g,
    ],
  },
  {
    archetype: 'booking',
    weight: 3,
    patterns: [
      /(booking|reservasi|jadwal|antrean|antrian|klinik|dokter|salon|barber|fotografer|studio|bengkel|jasa|janji temu|konsultasi|appointment|slot|hotel|tiket)/g,
    ],
  },
  {
    archetype: 'education',
    weight: 3,
    patterns: [
      /(belajar|kursus|kelas|edukasi|siswa|murid|mahasiswa|materi|kuis|bimbel|mentoring|komunitas belajar|sekolah|pelatihan|kurikulum|ujian)/g,
    ],
  },
  {
    archetype: 'portfolio',
    weight: 3,
    patterns: [
      /(portofolio|portfolio|karya|showcase|ilustrator|agensi|\bcv\b|freelance|studi kasus|case study|profil usaha|company profile)/g,
    ],
  },
  {
    archetype: 'internal-tool',
    weight: 3,
    patterns: [
      /(internal|admin|\bhr\b|\bhrd\b|karyawan|cuti|gudang|stok|kasir|\bpos\b|rekap|operasional|absensi|inventaris|approval|pengajuan|gaji|payroll)/g,
    ],
  },
  {
    archetype: 'saas',
    weight: 2,
    patterns: [
      /(saas|aplikasi|tracker|manajemen|proyek|project|keuangan|budget|pengeluaran|pemasukan|tabungan|catat|produktif|kolaborasi|tim|dashboard|otomatis|fintech|\bkyc\b|revisi|\bai\b|\bcrm\b|habit)/g,
    ],
  },
];

export function detectArchetype(story: string): ProductArchetype {
  const s = story.toLowerCase();
  let bestArchetype: ProductArchetype = 'custom';
  let bestScore = 0;

  for (const entry of ARCHETYPE_SIGNALS) {
    let matches = 0;
    for (const pattern of entry.patterns) {
      const found = s.match(pattern);
      if (found) matches += found.length;
    }
    const score = matches * entry.weight;
    if (score > bestScore) {
      bestScore = score;
      bestArchetype = entry.archetype;
    }
  }

  return bestArchetype;
}

interface Q1ExtractedSignals {
  payment: boolean;
  scheduling: boolean;
  trackingData: boolean;
  whatsappNotif: boolean;
  onboardingAuth: boolean;
  designUx: boolean;
}

function detectQ1Signals(story: string): Q1ExtractedSignals {
  const s = story.toLowerCase();
  return {
    payment: /(bayar|pembayaran|qris|transfer|\bdp\b|checkout|ongkir|harga|invoice|tagihan|langganan|keuangan|budget|tabungan)/.test(s),
    scheduling: /(jadwal|tanggal|kalender|booking|slot|antre|jam|mingguan|harian|deadline|reschedule)/.test(s),
    trackingData: /(stok|catat|rekap|laporan|riwayat|progres|tracker|export|csv|pdf|dashboard|analitik|pengeluaran)/.test(s),
    whatsappNotif: /(whatsapp|\bwa\b|notifikasi|pengingat|reminder|email|chat|follow.?up|konfirmasi)/.test(s),
    onboardingAuth: /(login|daftar|verifikasi|\bkyc\b|onboarding|pemula|awam|role|akses|akun|tamu)/.test(s),
    designUx: /(ui|ux|wireframe|figma|prototype|desain|tampilan|flow|alur|batal|bingung|ribet|ringkas)/.test(s),
  };
}

interface Q1ContextExtraction {
  persona: string;
  coreGoal: string;
  painPoint: string;
  valueContext: string;
}

function capitalizeSentence(text: string): string {
  const t = text.trim().replace(/^[,.:;\-\s]+/, '');
  if (!t) return '';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function extractQ1Context(
  cleanedStory: string,
  blueprint: ArchetypeBlueprint,
  productNameSuggestion: string,
  prdPurpose: PrdPurpose
): Q1ContextExtraction {
  const purposeMeta = PRD_PURPOSE_MAP[prdPurpose];

  // 1. Persona extraction
  let persona = '';
  const personaPatterns = [
    /(?:saya\s+(?:seorang\s+)?|untuk\s+|bagi\s+|target(?:nya|\s+pengguna)?\s*(?:adalah|:)?\s*)([^,.!?]{3,75})/i,
    /^([^,.!?]{3,70}?)\s+(?:yang\s+(?:butuh|ingin|mau|jualan|sering|perlu)|butuh|ingin|perlu)\b/i,
  ];
  for (const re of personaPatterns) {
    const m = cleanedStory.match(re);
    if (m?.[1]) {
      const candidate = m[1]
        .replace(/^(?:seorang|para|tim|user|pengguna)\s+/i, (prefix) =>
          prefix.toLowerCase().startsWith('tim') || prefix.toLowerCase().startsWith('para')
            ? prefix
            : ''
        )
        .trim();
      if (candidate.length >= 3) {
        persona = capitalizeSentence(candidate);
        break;
      }
    }
  }
  if (!persona) {
    persona =
      cleanedStory.length > 110
        ? `${cleanedStory.slice(0, 107)}...`
        : cleanedStory || blueprint.defaultPersona;
  }

  // 2. Core Goal extraction
  let extractedGoalClause = '';
  const primaryGoalMatch = cleanedStory.match(
    /(?:agar|supaya|biar|sehingga|tujuannya(?:\s+(?:bikin|buat|untuk))?|untuk\s+membantu)\s+([^.!?]{6,160})/i
  );
  const secondaryGoalMatch = cleanedStory.match(
    /(?:yang\s+(?:ingin|mau)|ingin)\s+([^.!?]{6,160})/i
  );
  if (primaryGoalMatch?.[1]) {
    extractedGoalClause = primaryGoalMatch[1].trim().replace(/[.!?]+$/, '');
  } else if (secondaryGoalMatch?.[1]) {
    extractedGoalClause = secondaryGoalMatch[1].trim().replace(/[.!?]+$/, '');
  }

  const coreGoal = extractedGoalClause
    ? capitalizeSentence(
        prdPurpose === 'ui-ux-process'
          ? `Merancang alur UI/UX ${productNameSuggestion} agar ${extractedGoalClause}.`
          : `Menghadirkan ${productNameSuggestion} (${purposeMeta.label}) agar ${extractedGoalClause}.`
      )
    : prdPurpose === 'ui-ux-process'
    ? `Menjalankan proses UI/UX untuk ${productNameSuggestion} guna membantu ${blueprint.defaultValueContext}.`
    : `Mewujudkan ${productNameSuggestion} (${purposeMeta.label}) untuk membantu ${blueprint.defaultValueContext}.`;

  // 3. Pain Point extraction (explicit friction or pain implied via "tidak/tanpa ...")
  let painPoint = '';
  const explicitPainMatch = cleanedStory.match(
    /((?:sering|sulit|susah|ribet|bingung|lambat|manual|bentrok|kewalahan)[^.!?]{3,130})/i
  );
  const impliedPainMatch = cleanedStory.match(
    /(?:agar|supaya|biar)\s+([^.!?]{4,90}(?:tidak|tak|jangan)\s+[^.!?]{3,60})/i
  );
  const withoutPainMatch = cleanedStory.match(
    /(tanpa\s+(?:antre|ribet|chat|rekap|bingung|batal|manual)[^.!?]{0,80})/i
  );

  if (explicitPainMatch?.[1]) {
    painPoint = capitalizeSentence(explicitPainMatch[1].trim().replace(/[.!?]+$/, ''));
  } else if (impliedPainMatch?.[1]) {
    painPoint = `Mengatasi risiko: ${impliedPainMatch[1].trim().replace(/[.!?]+$/, '')}`;
  } else if (withoutPainMatch?.[1]) {
    painPoint = `Mengurangi hambatan ${withoutPainMatch[1].trim().replace(/[.!?]+$/, '')}`;
  }
  if (!painPoint) {
    painPoint = blueprint.defaultPain;
  }

  const valueContext = extractedGoalClause
    ? extractedGoalClause.slice(0, 90)
    : blueprint.defaultValueContext;

  return { persona, coreGoal, painPoint, valueContext };
}

function buildContextSignalTags(
  signals: Q1ExtractedSignals,
  prdPurpose: PrdPurpose
): Record<AdaptiveQuestionId, { id: string; label: string; description: string }[]> {
  const q2: { id: string; label: string; description: string }[] = [];
  const q3: { id: string; label: string; description: string }[] = [];
  const q4: { id: string; label: string; description: string }[] = [];
  const q5: { id: string; label: string; description: string }[] = [];

  if (signals.payment) {
    q3.push({
      id: 'sig-q3-pay',
      label: prdPurpose === 'ui-ux-process' ? 'Flow Checkout & Konfirmasi Bayar' : 'Pembayaran Instan (QRIS / E-Wallet / DP)',
      description: 'Menyederhanakan langkah bayar dengan status konfirmasi langsung dari cerita Q1',
    });
    q4.push({
      id: 'sig-q4-pay',
      label: 'Proses Bayar Ringkas & Transparan',
      description: 'Total biaya dan status transaksi langsung jelas tanpa konfirmasi manual',
    });
  }
  if (signals.scheduling) {
    q2.push({
      id: 'sig-q2-sched',
      label: 'Cek Jadwal / Slot Tersedia Secara Langsung',
      description: 'Mengurangi gesekan bentrok jadwal sesuai konteks cerita Q1',
    });
    q3.push({
      id: 'sig-q3-sched',
      label: 'Kalender Slot & Reschedule Mandiri',
      description: 'Menampilkan ketersediaan waktu real-time dan opsi ubah jadwal mudah',
    });
  }
  if (signals.trackingData) {
    q3.push({
      id: 'sig-q3-track',
      label: 'Rekap Otomatis & Ringkasan Progres',
      description: 'Menyajikan catatan data rapi tanpa perlu rekap spreadsheet manual',
    });
    q5.push({
      id: 'sig-q5-track',
      label: 'Arsip Riwayat & Laporan Berkala',
      description: 'Membuat pengguna rutin kembali melihat ringkasan catatan mereka',
    });
  }
  if (signals.whatsappNotif) {
    q3.push({
      id: 'sig-q3-wa',
      label: 'Notifikasi & Ringkasan Otomatis (WA/Email)',
      description: 'Mengirim konfirmasi dan pengingat otomatis tanpa chat manual satu per satu',
    });
    q5.push({
      id: 'sig-q5-wa',
      label: 'Pengingat Otomatis Tepat Waktu',
      description: 'Mengajak pengguna kembali pada momen penting melalui notifikasi relevan',
    });
  }
  if (signals.onboardingAuth) {
    q2.push({
      id: 'sig-q2-onb',
      label: 'Onboarding Pemula dengan Panduan Langkah Demi Langkah',
      description: 'Membantu pengguna baru atau awam langsung paham tanpa kebingungan verifikasi',
    });
    q4.push({
      id: 'sig-q4-onb',
      label: 'Aman & Ramah untuk Pengguna Pertama Kali',
      description: 'Instruksi singkat dan contoh isian mencegah salah input saat awal pakai',
    });
  }
  if (signals.designUx) {
    q2.push({
      id: 'sig-q2-ux',
      label: 'Pemetaan Titik Rawan Bingung (Friction Audit)',
      description: 'Menemukan bagian alur yang paling sering membuat pengguna berhenti',
    });
    q4.push({
      id: 'sig-q4-ux',
      label: 'Alur Ringkas dengan Penanganan Error Jelas',
      description: 'Meminimalkan langkah berulang dan memberi tombol pemulihan yang mudah',
    });
  }

  return { q2, q3, q4, q5 };
}

function dedupeTags<T extends { id: string; label: string; description?: string }>(tags: T[]): T[] {
  const seenLabels = new Set<string>();
  const result: T[] = [];
  for (const tag of tags) {
    const key = tag.label.trim().toLowerCase();
    if (!seenLabels.has(key)) {
      seenLabels.add(key);
      result.push(tag);
    }
  }
  return result;
}

function adaptQuestionsByPurpose(
  prdPurpose: PrdPurpose,
  blueprint: ArchetypeBlueprint,
  valueContext: string,
  signals?: Q1ExtractedSignals
): Omit<ArchetypeBlueprint, 'label' | 'defaultProductName' | 'defaultPersona' | 'defaultPain' | 'defaultValueContext'> {
  const signalTags = signals
    ? buildContextSignalTags(signals, prdPurpose)
    : { q2: [], q3: [], q4: [], q5: [] };

  if (prdPurpose === 'ui-ux-process') {
    return {
      q2Prompt: 'Saat memulai proses UI/UX untuk proyek ini, fokus riset atau langkah pembuka mana saja yang ingin dijalankan?',
      q2Tags: dedupeTags([...signalTags.q2, ...UI_UX_PROCESS_BLUEPRINT.q2Tags, ...blueprint.q2Tags.slice(0, 2)]),
      q3Prompt: 'Artefak, layar, atau tahapan UI/UX apa saja yang ingin disertakan? (Bebas pilih sebanyak yang dibutuhkan)',
      q3Tags: dedupeTags([...signalTags.q3, ...UI_UX_PROCESS_BLUEPRINT.q3Tags, ...blueprint.q3Tags.slice(0, 3)]),
      q4Prompt: `Menurutmu, kriteria keberhasilan desain apa saja yang membuat user terbantu untuk ${valueContext}?`,
      q4Tags: dedupeTags([...signalTags.q4, ...UI_UX_PROCESS_BLUEPRINT.q4Tags, ...blueprint.q4Tags.slice(0, 2)]),
      q5Prompt: 'Mekanisme apa saja yang membuat dokumentasi & sistem desain ini terus dipakai kembali oleh tim?',
      q5Tags: dedupeTags([...signalTags.q5, ...UI_UX_PROCESS_BLUEPRINT.q5Tags]),
    };
  }

  if (prdPurpose === 'application') {
    return {
      q2Prompt: 'Saat pengguna pertama kali membuka aplikasi, aksi atau pengalaman onboarding apa saja yang perlu langsung tersedia?',
      q2Tags: dedupeTags([
        ...signalTags.q2,
        ...blueprint.q2Tags.slice(0, 3),
        {
          id: 'app-q2-auth',
          label: 'Daftar / Masuk 1-Tap & Setup Awal',
          description: 'Menyimpan profil dan data aplikasi pengguna secara aman',
        },
        {
          id: 'app-q2-guest',
          label: 'Coba Fitur Inti Dulu (Guest Mode)',
          description: 'Mengurangi hambatan user awam sebelum diminta buat akun',
        },
      ]),
      q3Prompt: 'Modul atau fitur aplikasi apa saja yang ingin kamu masukkan? (Bebas pilih tanpa batas)',
      q3Tags: dedupeTags([...signalTags.q3, ...blueprint.q3Tags]),
      q4Prompt: `Menurutmu, hal apa saja yang bikin pengguna yakin memakai aplikasimu untuk ${valueContext}?`,
      q4Tags: dedupeTags([
        ...signalTags.q4,
        ...blueprint.q4Tags,
        {
          id: 'app-q4-mobile',
          label: 'Cepat, Ringan & Nyaman Dipakai Satu Tangan',
          description: 'Navigasi aplikasi responsif dan tetap ramah saat koneksi lambat',
        },
      ]),
      q5Prompt: 'Mekanisme apa saja yang bikin pengguna rutin membuka aplikasimu kembali setiap hari/minggu?',
      q5Tags: dedupeTags([
        ...signalTags.q5,
        ...blueprint.q5Tags,
        {
          id: 'app-q5-sync',
          label: 'Notifikasi Cerdas & Data Tersinkron',
          description: 'Pengingat relevan dan riwayat pribadi selalu siap dibuka kembali',
        },
      ]),
    };
  }

  // Website mode
  return {
    q2Prompt: 'Saat pengunjung pertama kali membuka website ini, aksi pembuka apa saja yang perlu langsung jelas?',
    q2Tags: dedupeTags([...signalTags.q2, ...blueprint.q2Tags]),
    q3Prompt: 'Halaman atau fitur website apa saja yang ingin dimasukkan? (Bebas pilih tanpa batas)',
    q3Tags: dedupeTags([...signalTags.q3, ...blueprint.q3Tags]),
    q4Prompt: `Menurutmu, hal apa saja yang bikin pengunjung website mau ${valueContext}?`,
    q4Tags: dedupeTags([...signalTags.q4, ...blueprint.q4Tags]),
    q5Prompt: 'Alasan atau fitur apa saja yang bikin pengunjung bakal kembali lagi membuka websitemu?',
    q5Tags: dedupeTags([...signalTags.q5, ...blueprint.q5Tags]),
  };
}

function buildAdaptiveQuestions(
  prdPurpose: PrdPurpose,
  blueprint: ArchetypeBlueprint,
  previous?: DiscoveryState['questions'],
  valueContextOverride?: string,
  signals?: Q1ExtractedSignals
): Record<AdaptiveQuestionId, AdaptiveQuestionConfig> {
  const preserveUserCustomTags = (
    qId: AdaptiveQuestionId,
    aiTags: { id: string; label: string; description?: string }[]
  ) => {
    const prev = previous?.[qId];
    const customTags = prev?.tags.filter((t) => t.source === 'user') ?? [];
    const mergedTags = [
      ...aiTags.map((t) => ({ ...t, source: 'ai' as const })),
      ...customTags,
    ];
    const validIds = new Set(mergedTags.map((t) => t.id));
    const keptSelected = (prev?.selectedTagIds ?? []).filter((id) => validIds.has(id));
    return { mergedTags, keptSelected };
  };

  const adapted = adaptQuestionsByPurpose(
    prdPurpose,
    blueprint,
    valueContextOverride ?? blueprint.defaultValueContext,
    signals
  );

  const now = Date.now();
  const q2State = preserveUserCustomTags('q2', adapted.q2Tags);
  const q3State = preserveUserCustomTags('q3', adapted.q3Tags);
  const q4State = preserveUserCustomTags('q4', adapted.q4Tags);
  const q5State = preserveUserCustomTags('q5', adapted.q5Tags);

  return {
    q2: {
      id: 'q2',
      stepNumber: 2,
      title:
        prdPurpose === 'ui-ux-process'
          ? 'Fondasi Awal Riset / UX'
          : prdPurpose === 'application'
          ? 'Onboarding Pertama Aplikasi'
          : 'Aksi Pertama di Website',
      prompt: adapted.q2Prompt,
      helperHint:
        'Pilih bebas satu atau beberapa fokus pembuka, atau tambah pilihan sendiri.',
      selectionMode: 'unlimited',
      minSelect: 1,
      maxSelect: null,
      tags: q2State.mergedTags,
      selectedTagIds: q2State.keptSelected,
      updatedAt: now,
    },
    q3: {
      id: 'q3',
      stepNumber: 3,
      title:
        prdPurpose === 'ui-ux-process'
          ? 'Artefak & Tahapan UI/UX'
          : prdPurpose === 'application'
          ? 'Fitur & Modul Aplikasi'
          : 'Fitur & Halaman Website',
      prompt: adapted.q3Prompt,
      helperHint:
        'Pilih bebas sebanyak apa pun fitur atau artefak yang ingin masuk ke PRD (minimal 1).',
      selectionMode: 'unlimited',
      minSelect: 1,
      maxSelect: null,
      tags: q3State.mergedTags,
      selectedTagIds: q3State.keptSelected,
      updatedAt: now,
    },
    q4: {
      id: 'q4',
      stepNumber: 4,
      title:
        prdPurpose === 'ui-ux-process'
          ? 'Indikator Keberhasilan Desain'
          : 'Daya Tarik Penggunaan (Value Hook)',
      prompt: adapted.q4Prompt,
      helperHint:
        'Pilih bebas semua alasan yang membuat pengguna yakin memakai dan percaya pada produkmu.',
      selectionMode: 'unlimited',
      minSelect: 1,
      maxSelect: null,
      tags: q4State.mergedTags,
      selectedTagIds: q4State.keptSelected,
      updatedAt: now,
    },
    q5: {
      id: 'q5',
      stepNumber: 5,
      title:
        prdPurpose === 'ui-ux-process'
          ? 'Siklus Iterasi & Pemakaian Ulang'
          : 'Alasan Kembali Lagi (Retention Loop)',
      prompt: adapted.q5Prompt,
      helperHint:
        'Pilih bebas semua mekanisme yang membuat pengguna atau tim terus kembali.',
      selectionMode: 'unlimited',
      minSelect: 1,
      maxSelect: null,
      tags: q5State.mergedTags,
      selectedTagIds: q5State.keptSelected,
      updatedAt: now,
    },
  };
}

export function createEmptyBusinessContext(): PrdBusinessContext {
  return {
    successMetrics: '',
    userRolesAndRules: '',
    nonGoals: '',
    technicalConstraints: '',
  };
}

export function createInitialDiscoveryState(prdPurpose: PrdPurpose = 'website'): DiscoveryState {
  const blueprint = ARCHETYPE_BLUEPRINTS.ecommerce;
  const purposeMeta = PRD_PURPOSE_MAP[prdPurpose];

  return {
    prdPurpose,
    q1Messages: [
      {
        id: 'q1-welcome',
        role: 'assistant',
        content: purposeMeta.q1Welcome,
      },
    ],
    q1Summary: null,
    questions: buildAdaptiveQuestions(prdPurpose, blueprint),
    businessContext: createEmptyBusinessContext(),
  };
}

function extractProductTitleFromStory(
  story: string,
  fallbackTitle: string,
  prdPurpose: PrdPurpose
): string {
  const cleaned = story.replace(/\s+/g, ' ').trim();
  const match = cleaned.match(
    /(?:bikin|buat|membuat|membangun|merancang ulang|merancang|menyusun|mengembangkan|butuh|perlu)\s+([^,.!?]+)/i
  );
  if (match && match[1]) {
    const beforeClause = match[1]
      .split(/\s+(?:agar|supaya|untuk|biar|sehingga|yang)\s+/i)[0]
      .trim();
    if (
      beforeClause.length >= 4 &&
      !/^(?:memetakan|mencari|menemukan|menyelesaikan|mengatasi)\b/i.test(beforeClause)
    ) {
      let truncated = beforeClause;
      if (truncated.length > 42) {
        const words = truncated.slice(0, 42).split(' ');
        if (words.length > 1) words.pop();
        truncated = words.join(' ');
      }
      return truncated.charAt(0).toUpperCase() + truncated.slice(1);
    }
  }
  if (prdPurpose === 'ui-ux-process') {
    return `Proses UI/UX ${fallbackTitle}`;
  }
  return fallbackTitle;
}

export function hydrateQuestionsFromStoryFallback(
  story: string,
  previousQuestions?: DiscoveryState['questions'],
  prdPurpose: PrdPurpose = 'website'
): {
  assistantReply: string;
  q1Summary: Q1ExtractedSummary;
  questions: Record<AdaptiveQuestionId, AdaptiveQuestionConfig>;
} {
  const archetype = detectArchetype(story);
  const blueprint = ARCHETYPE_BLUEPRINTS[archetype];
  const purposeMeta = PRD_PURPOSE_MAP[prdPurpose];
  const cleanedStory = story.replace(/\s+/g, ' ').trim();
  const signals = detectQ1Signals(cleanedStory);

  const productNameSuggestion = extractProductTitleFromStory(
    cleanedStory,
    blueprint.defaultProductName,
    prdPurpose
  );

  const extracted = extractQ1Context(
    cleanedStory,
    blueprint,
    productNameSuggestion,
    prdPurpose
  );

  const q1Summary: Q1ExtractedSummary = {
    prdPurpose,
    archetype,
    productNameSuggestion,
    persona: extracted.persona,
    coreGoal: extracted.coreGoal,
    painPoint: extracted.painPoint,
    valueContext: extracted.valueContext,
  };

  const questions = buildAdaptiveQuestions(
    prdPurpose,
    blueprint,
    previousQuestions,
    extracted.valueContext,
    signals
  );

  const assistantReply = `Cerita Q1 dipahami untuk mode **${purposeMeta.label}** (**${blueprint.label}**). Target persona terdeteksi: **${extracted.persona}**, dengan fokus menyelesaikan kendala: *${extracted.painPoint}*. Pertanyaan 2–5 sudah disesuaikan dan kamu bebas memilih sebanyak apa pun tag yang cocok atau menambah pilihan baru.`;

  return {
    assistantReply,
    q1Summary,
    questions,
  };
}

function getSelectedTagObjects(q: AdaptiveQuestionConfig) {
  const map = new Map(q.tags.map((t) => [t.id, t]));
  return q.selectedTagIds.map((id) => map.get(id)).filter((t): t is NonNullable<typeof t> => Boolean(t));
}

function getUiComponentsForPurpose(prdPurpose: PrdPurpose, label: string, index: number): string[] {
  if (prdPurpose === 'ui-ux-process') {
    return [
      `Artifak Figma: ${label}`,
      'Wireframe 4 State (Normal/Loading/Empty/Error)',
      'Anotasi Interaksi & Handoff Spec',
    ];
  }
  if (prdPurpose === 'application') {
    return [
      `Screen / Module: ${label}`,
      index === 0 ? 'Bottom Nav / App Shell' : 'Interactive State Card',
      'Offline / Loading & Feedback Toast',
    ];
  }
  return [
    `Section / Halaman: ${label}`,
    index === 0 ? 'Responsive Grid & Navbar' : 'Form / CTA Interaktif',
    'Status Konfirmasi & Error Banner',
  ];
}

export function buildWorkspaceFallback(
  discovery: DiscoveryState
): GenerateWorkspaceOutput {
  const prdPurpose = discovery.prdPurpose ?? discovery.q1Summary?.prdPurpose ?? 'website';
  const purposeMeta = PRD_PURPOSE_MAP[prdPurpose];

  const q1 = discovery.q1Summary ?? {
    prdPurpose,
    archetype: 'custom' as ProductArchetype,
    productNameSuggestion: 'Produk Digital Baru',
    persona: 'Pengguna target yang membutuhkan alur kerja lebih terstruktur',
    coreGoal: 'Membantu pengguna menyelesaikan tujuan utama dengan cepat dan jelas',
    painPoint: 'Proses manual saat ini membingungkan dan memakan waktu',
    valueContext: 'mencapai tujuannya secara efisien',
  };

  const q2Selected = getSelectedTagObjects(discovery.questions.q2);
  const q3Selected = getSelectedTagObjects(discovery.questions.q3);
  const q4Selected = getSelectedTagObjects(discovery.questions.q4);
  const q5Selected = getSelectedTagObjects(discovery.questions.q5);

  const firstStep = q2Selected[0] ?? {
    id: 'default-q2',
    label: 'Akses Awal & Langkah Pertama',
    description: 'Fondasi pertama pada alur yang dirancang',
  };
  const firstStepLabels =
    q2Selected.length > 0 ? q2Selected.map((t) => t.label).join(', ') : firstStep.label;
  const firstStepDescriptions =
    q2Selected.length > 1
      ? q2Selected.map((t) => `${t.label}: ${t.description || 'Langkah awal pilihan'}`).join(' • ')
      : firstStep.description || 'Langkah paling pertama dalam alur ini.';

  const mustFeatures =
    q3Selected.length > 0
      ? q3Selected
      : [{ id: 'default-q3', label: 'Alur Inti', description: 'Bagian wajib versi awal' }];

  const valueHooks =
    q4Selected.map((t) => t.label).join(' & ') || 'Alur cepat, transparan, dan mudah dipahami';
  const retentionHooks =
    q5Selected.map((t) => t.label).join(' & ') || 'Riwayat tersimpan dan iterasi lanjutan';

  const blueprintNodes: RawBlueprintNode[] = [
    // UX Research Cluster (4 cards)
    {
      id: 'ux-persona',
      title: 'Target Persona (Q1)',
      subtitle: q1.persona,
      kind: 'ux-persona',
      zone: 'ux-research',
      linkedSectionId: 'sec-ux-persona',
      details: {
        purpose: `Menjaga proses ${purposeMeta.label} tetap berpijak pada profil pengguna nyata dari Q1.`,
        actor: prdPurpose === 'ui-ux-process' ? 'UX Researcher & UI/UX Designer' : 'Product Owner & Desainer',
        uiComponents: ['Persona Snapshot Card', 'Context & Goal Summary'],
        userStory: `Sebagai ${q1.persona}, saya ingin ${q1.coreGoal.replace(/\.+$/, '')} tanpa hambatan teknis.`,
        acceptanceCriteria: [
          'Bahasa antarmuka dapat dipahami pengguna awam dalam <= 5 detik.',
          'Konteks masalah utama dari Q1 tercermin langsung pada tahap awal alur.',
        ],
        edgeCases: ['Pengguna baru datang tanpa konteks cara kerja produk sebelumnya.'],
      },
    },
    {
      id: 'ux-pain',
      title: 'Masalah & Pain Point',
      subtitle: q1.painPoint,
      kind: 'ux-pain',
      zone: 'ux-research',
      linkedSectionId: 'sec-ux-pain',
      details: {
        purpose: 'Memetakan gesekan utama yang harus dihilangkan oleh struktur alur kerja.',
        actor: 'Target User',
        uiComponents: ['Friction Callout', 'Problem-to-Solution Mapping'],
        userStory: 'Sebagai pengguna, saya ingin menghindari proses manual yang berulang dan rawan salah.',
        acceptanceCriteria: [
          'Setiap tahap inti mengurangi minimal 1 langkah manual atau kebingungan yang ada sebelumnya.',
        ],
        edgeCases: ['Pengguna berhenti di tengah alur karena instruksi atau feedback tidak jelas.'],
      },
    },
    {
      id: 'ux-value',
      title: prdPurpose === 'ui-ux-process' ? 'Kriteria Berhasil (Q4)' : 'Daya Tarik Utama (Q4)',
      subtitle: valueHooks,
      kind: 'ux-value',
      zone: 'ux-research',
      linkedSectionId: 'sec-ux-value',
      details: {
        purpose:
          prdPurpose === 'ui-ux-process'
            ? 'Menentukan tolok ukur keberhasilan desain di mata pengguna maupun developer.'
            : 'Menjelaskan alasan paling kuat yang meyakinkan pengguna memakai produk pertama kali.',
        actor: prdPurpose === 'ui-ux-process' ? 'UI/UX Designer & Tim QA' : 'Pengguna Baru',
        uiComponents:
          prdPurpose === 'ui-ux-process'
            ? ['Usability Metric Card', 'Design Sign-off Checklist']
            : ['Value Proposition Hero', 'Trust Indicators', 'Primary CTA'],
        userStory: `Sebagai pengguna, saya merasakan manfaat langsung karena ${valueHooks}.`,
        acceptanceCriteria: [
          'Nilai utama terlihat jelas sejak interaksi pertama tanpa perlu mencari tersembunyi.',
        ],
        edgeCases: ['Pengguna ragu melanjutkan jika hasil atau informasi kunci tidak transparan.'],
      },
    },
    {
      id: 'ux-retention',
      title: prdPurpose === 'ui-ux-process' ? 'Reuse & Iterasi (Q5)' : 'Alasan Kembali Lagi (Q5)',
      subtitle: retentionHooks,
      kind: 'ux-retention',
      zone: 'ux-research',
      linkedSectionId: 'sec-ux-retention',
      details: {
        purpose:
          prdPurpose === 'ui-ux-process'
            ? 'Menjaga aset desain dan temuan riset tetap reusable untuk pengembangan berikutnya.'
            : 'Merancang mekanisme agar pengguna kembali secara organik setelah kunjungan pertama.',
        actor: prdPurpose === 'ui-ux-process' ? 'Design System Lead & Developer' : 'Pengguna Aktif',
        uiComponents:
          prdPurpose === 'ui-ux-process'
            ? ['Figma Component Library', 'Design QA Matrix']
            : ['Notification / Reminder Trigger', 'Saved History View', 'Comeback CTA'],
        userStory: `Sebagai pengguna atau tim, saya terus memakai sistem ini karena ${retentionHooks}.`,
        acceptanceCriteria: [
          `Mekanisme "${retentionHooks}" terdokumentasi jelas dan terhubung ke alur akhir.`,
        ],
        edgeCases: ['Pengguna atau tim lupa kembali jika tidak ada arsip/pengingat terstruktur.'],
      },
    },
    // Flow Entry (Q2)
    {
      id: 'flow-entry',
      title: `1. ${prdPurpose === 'ui-ux-process' ? 'Fondasi' : 'Entry'}: ${firstStep.label}`,
      subtitle: firstStepDescriptions,
      kind: 'flow-start',
      zone: 'business-flow',
      linkedSectionId: 'sec-flow-entry',
      details: {
        purpose: `Memastikan tahap awal (${firstStepLabels}) langsung memberi arah yang jelas sesuai mode ${purposeMeta.label}.`,
        actor: prdPurpose === 'ui-ux-process' ? 'UX Designer & Researcher' : 'Pengguna Baru',
        uiComponents:
          prdPurpose === 'ui-ux-process'
            ? ['Research Brief Board', 'Current Flow Audit Map', 'Hypothesis Notes']
            : prdPurpose === 'application'
            ? ['App Launch / Splash', 'Quick Onboarding Sheet', 'Primary Action Button']
            : ['Above-the-Fold Hero', 'Primary CTA Button', 'Contextual Quick Guide'],
        userStory: `Sebagai ${prdPurpose === 'ui-ux-process' ? 'desainer' : 'pengguna baru'}, langkah pertama saya mencakup ${firstStepLabels} agar arah berikutnya terstruktur.`,
        acceptanceCriteria: [
          ...q2Selected.map(
            (step) => `Tahap "${step.label}" dapat dicapai atau dijalankan tanpa hambatan awal yang rumit.`
          ),
          ...(q2Selected.length === 0
            ? [`Tahap "${firstStep.label}" dapat dicapai tanpa hambatan awal yang rumit.`]
            : []),
          'Tersedia panduan singkat yang mudah dipahami pengguna awam.',
        ],
        edgeCases: [
          'Data awal masih kosong (Empty State): tampilkan contoh atau panduan mulai.',
          'Pengguna ingin melewati panduan: sediakan opsi lanjut langsung.',
        ],
      },
    },
  ];

  const edges: GenerateWorkspaceOutput['edges'] = [];
  let prevNodeId = 'flow-entry';

  mustFeatures.forEach((feat, index) => {
    const nodeId = `flow-feat-${index + 1}`;
    const secId = `sec-flow-feat-${index + 1}`;
    const prefix = prdPurpose === 'ui-ux-process' ? 'Artefak Wajib' : 'Fitur Wajib';

    blueprintNodes.push({
      id: nodeId,
      title: `${index + 2}. ${prefix}: ${feat.label}`,
      subtitle: feat.description || `Eksekusi modul ${feat.label} dalam alur ${purposeMeta.label}.`,
      kind: 'flow-feature',
      zone: 'business-flow',
      linkedSectionId: secId,
      details: {
        purpose: `Menghasilkan/menyediakan "${feat.label}" sebagai prioritas wajib mode ${purposeMeta.label}.`,
        actor: prdPurpose === 'ui-ux-process' ? 'UI/UX Designer' : 'Pengguna Utama',
        uiComponents: getUiComponentsForPurpose(prdPurpose, feat.label, index),
        userStory: `Sebagai ${prdPurpose === 'ui-ux-process' ? 'UI/UX Designer' : 'pengguna'}, saya membutuhkan "${feat.label}" agar ${q1.coreGoal.replace(/\.+$/, '')}.`,
        acceptanceCriteria: [
          `"${feat.label}" memiliki struktur visual, status konfirmasi, dan navigasi yang jelas.`,
          'Seluruh kondisi input tidak valid atau data kosong ditangani secara eksplisit.',
        ],
        edgeCases: [
          `Input tidak valid atau field wajib belum lengkap pada "${feat.label}".`,
          'Empty State / Loading State: tampilkan placeholder dan langkah pemulihan jelas.',
        ],
      },
    });

    edges.push({
      id: `e-${prevNodeId}-${nodeId}`,
      source: prevNodeId,
      target: nodeId,
      label: 'Lanjut',
      animated: true,
    });
    prevNodeId = nodeId;
  });

  const firstFeatureId = mustFeatures.length > 0 ? 'flow-feat-1' : 'flow-entry';

  // Decision / Verification gate (Diamond)
  blueprintNodes.push({
    id: 'flow-decision',
    title:
      prdPurpose === 'ui-ux-process'
        ? 'Usability Test & Design Review'
        : 'Validasi & Konfirmasi Hasil',
    subtitle: `Cek apakah ${valueHooks} terpenuhi.`,
    kind: 'flow-decision',
    zone: 'business-flow',
    linkedSectionId: 'sec-flow-decision',
    details: {
      purpose:
        prdPurpose === 'ui-ux-process'
          ? 'Menguji prototype & kelengkapan state layar sebelum diserahkan ke tim engineering.'
          : 'Mengecek kelengkapan proses bisnis serta menangani kegagalan sebelum output final.',
      actor: prdPurpose === 'ui-ux-process' ? 'Designer, User Tester & Tech Lead' : 'Sistem & Pengguna',
      uiComponents:
        prdPurpose === 'ui-ux-process'
          ? ['Usability Task Checklist', 'Design Review Comment Pin', 'Edge-State Verification']
          : ['Confirmation Summary Modal', 'Inline Validation Banner', 'Retry / Edit Action'],
      userStory:
        prdPurpose === 'ui-ux-process'
          ? 'Sebagai tim produk, saya ingin memvalidasi alur desain ke user sebelum masuk tahap development.'
          : 'Sebagai pengguna, saya ingin meninjau ringkasan hasil sebelum finalisasi agar tidak ada kesalahan.',
      acceptanceCriteria: [
        'Seluruh skenario gagal dan revisi dapat diperbaiki dalam <= 2 klik tanpa mengulang dari awal.',
        'Kriteria lolos tercatat jelas (>= 90% skenario utama sukses) sebagai acuan siap eksekusi.',
      ],
      edgeCases: [
        'Ditemukan kebingungan pengguna saat pengujian atau timeout jaringan saat konfirmasi.',
      ],
    },
  });

  edges.push({
    id: `e-${prevNodeId}-flow-decision`,
    source: prevNodeId,
    target: 'flow-decision',
    label: prdPurpose === 'ui-ux-process' ? 'Uji & review' : 'Cek validasi',
  });

  // Decision "Tidak / Revisi" Recovery Branch (loops back to core process)
  blueprintNodes.push({
    id: 'flow-recovery',
    title:
      prdPurpose === 'ui-ux-process'
        ? 'Revisi Prototype & Edge State'
        : 'Perbaikan Input & Coba Lagi',
    subtitle:
      prdPurpose === 'ui-ux-process'
        ? 'Perbaiki temuan testing & lengkapi state error sebelum handoff.'
        : `Pulihkan kendala ("${q1.painPoint}") dengan panduan perbaikan jelas.`,
    kind: 'flow-feature',
    zone: 'business-flow',
    linkedSectionId: 'sec-flow-recovery',
    details: {
      purpose:
        prdPurpose === 'ui-ux-process'
          ? 'Menyediakan jalur iterasi cepat jika pengujian prototype menemukan kebingungan pengguna.'
          : 'Memastikan pengguna tidak buntu saat validasi gagal, data kurang lengkap, atau transaksi tertunda.',
      actor: prdPurpose === 'ui-ux-process' ? 'UI/UX Designer' : 'Pengguna & Sistem Validasi',
      uiComponents:
        prdPurpose === 'ui-ux-process'
          ? ['Revision Checklist', 'Error State Frame', 'Usability Fix Log']
          : ['Inline Error Hint', 'Preserve Draft State', 'Tombol Perbaiki & Coba Lagi'],
      userStory: `Sebagai ${prdPurpose === 'ui-ux-process' ? 'desainer' : 'pengguna'}, jika validasi gagal saya ingin langsung memperbaiki bagian yang bermasalah tanpa mengisi ulang dari awal.`,
      acceptanceCriteria: [
        'Data atau input sebelumnya tetap tersimpan (0 data hilang) saat kembali ke tahap sebelumnya.',
        'Pengguna dapat memperbaiki kesalahan dan mengirim ulang dalam <= 2 klik.',
      ],
      edgeCases: [
        'Koneksi terputus saat mencoba ulang atau pengguna membatalkan revisi.',
      ],
    },
  });

  edges.push({
    id: 'e-flow-decision-recovery',
    source: 'flow-decision',
    target: 'flow-recovery',
    label: 'Tidak · Revisi',
  });

  edges.push({
    id: 'e-flow-recovery-loopback',
    source: 'flow-recovery',
    target: firstFeatureId,
    label: 'Ulangi / Perbaiki',
  });

  // Outcome & Retention Loop (End Terminator)
  blueprintNodes.push({
    id: 'flow-outcome',
    title:
      prdPurpose === 'ui-ux-process'
        ? 'Handoff Dev & Iterasi Library'
        : 'Hasil Sukses & Loop Kembali',
    subtitle: `Mengaktifkan ${retentionHooks}.`,
    kind: 'flow-outcome',
    zone: 'business-flow',
    linkedSectionId: 'sec-flow-outcome',
    details: {
      purpose:
        prdPurpose === 'ui-ux-process'
          ? 'Menutup siklus desain dengan handoff rapi ke developer sekaligus memperbarui library.'
          : 'Menutup satu siklus kerja dengan konfirmasi sukses sekaligus mengundang pengguna kembali.',
      actor: prdPurpose === 'ui-ux-process' ? 'UI/UX Designer & Frontend Engineer' : 'Pengguna & Sistem Notifikasi',
      uiComponents:
        prdPurpose === 'ui-ux-process'
          ? ['Figma Dev Mode Specs', 'Component Token Sheet', 'Design QA Sign-off']
          : ['Success Confirmation Screen', 'Saved History Entry', 'Comeback CTA / Reminder'],
      userStory: `Sebagai tim/pengguna, tahap akhir menghasilkan output siap pakai melalui ${retentionHooks}.`,
      acceptanceCriteria: [
        'Tersedia ringkasan hasil akhir dalam <= 2 detik setelah validasi lolos.',
        `Mekanisme "${retentionHooks}" aktif setelah siklus pertama selesai.`,
      ],
      edgeCases: ['Revisi pasca-handoff atau notifikasi lanjutan gagal terkirim.'],
    },
  });

  edges.push({
    id: 'e-flow-decision-flow-outcome',
    source: 'flow-decision',
    target: 'flow-outcome',
    label: 'Ya · Lanjut',
    animated: true,
  });

  // Connect all 4 Q1-Q5 UX Research anchors to their corresponding Flowchart nodes
  edges.push(
    {
      id: 'e-ux-persona-flow-entry',
      source: 'ux-persona',
      target: 'flow-entry',
      label: prdPurpose === 'ui-ux-process' ? 'Riset -> Flow' : 'Onboarding Q2',
    },
    {
      id: `e-ux-pain-${firstFeatureId}`,
      source: 'ux-pain',
      target: firstFeatureId,
      label: 'Solusi Masalah',
    },
    {
      id: 'e-ux-value-flow-decision',
      source: 'ux-value',
      target: 'flow-decision',
      label: 'Kriteria Q4',
    },
    {
      id: 'e-ux-retention-flow-outcome',
      source: 'ux-retention',
      target: 'flow-outcome',
      label: 'Retensi Q5',
    }
  );

  const biz = discovery.businessContext;
  const customKpi = biz?.successMetrics?.trim() ?? '';
  const customRoles = biz?.userRolesAndRules?.trim() ?? '';
  const customNonGoals = biz?.nonGoals?.trim() ?? '';
  const customTech = biz?.technicalConstraints?.trim() ?? '';

  const summaryParts = [
    `Tujuan Pembuatan PRD: ${purposeMeta.label}`,
    q1.coreGoal,
    `Masalah utama yang diselesaikan: ${q1.painPoint}\nKriteria / Daya tarik utama: ${valueHooks}.\nMekanisme keberlanjutan / retensi: ${retentionHooks}.`,
  ];
  if (customKpi) {
    summaryParts.push(`Target KPI & Keberhasilan Bisnis:\n${customKpi}`);
  }

  const extraSpecSections: PlanSection[] = [];
  if (customRoles || customTech) {
    const specLines: string[] = [];
    if (customRoles) {
      specLines.push(`Peran Aktor & Aturan Bisnis:\n${customRoles}`);
    }
    if (customTech) {
      specLines.push(`Batasan Proyek & Spesifikasi Teknis (NFR):\n${customTech}`);
    }
    extraSpecSections.push({
      id: 'sec-tech-specs',
      category: 'specs',
      title: `Spesifikasi Teknis & Aturan Bisnis (${purposeMeta.label})`,
      content: specLines.join('\n\n'),
    });
  }

  const planSections: PlanSection[] = [
    {
      id: 'sec-summary',
      category: 'summary',
      title: `Ringkasan (${purposeMeta.label}): ${q1.productNameSuggestion}`,
      content: summaryParts.join('\n\n'),
    },
    ...blueprintNodes.map((node): PlanSection => {
      const category = node.zone === 'ux-research' ? 'ux-research' : 'business-flow';
      const contentLines = [
        `Tujuan: ${node.details.purpose}`,
        `Aktor: ${node.details.actor}`,
        `User Story: ${node.details.userStory}`,
        `Komponen / Artefak UI: ${node.details.uiComponents.join(', ')}`,
        `Acceptance Criteria:\n- ${node.details.acceptanceCriteria.join('\n- ')}`,
        `Edge Cases:\n- ${node.details.edgeCases.join('\n- ')}`,
      ];
      return {
        id: node.linkedSectionId,
        category,
        title: node.title,
        content: contentLines.join('\n\n'),
        linkedNodeId: node.id,
      };
    }),
    ...extraSpecSections,
    {
      id: 'sec-non-goals',
      category: 'non-goals',
      title: `Batasan Scope MVP (${purposeMeta.label})`,
      content:
        customNonGoals ||
        (prdPurpose === 'ui-ux-process'
          ? `Fokus fase ini adalah merampungkan riset UX, user flow, dan ${mustFeatures.length} artefak UI/UX prioritas beserta spesifikasi handoff. Implementasi kode produksi di luar lingkup dokumen proses UI/UX ini.`
          : prdPurpose === 'application'
          ? `Fokus aplikasi v1 mencakup ${mustFeatures.length} modul pilihan utama, onboarding awal, dan penanganan state dasar agar segera siap diuji oleh pengguna nyata.`
          : `Fokus website v1 mencakup struktur halaman inti dan ${mustFeatures.length} fitur prioritas pilihanmu agar konversi dan penyampaian informasi segera berjalan efektif.`),
    },
  ];

  return {
    projectTitle: q1.productNameSuggestion,
    blueprintNodes,
    edges,
    planSections,
    initialAssistantMessage: `Workspace **${q1.productNameSuggestion}** (Mode: **${purposeMeta.label}**) siap! Di tengah ada **UX Research Board** & **Struktur Flow Kerja** yang bisa kamu zoom in/out. Klik node mana saja untuk melihat detail penjelasannya di panel **Plan Text** sebelah kiri, atau tulis instruksi di chat ini.`,
  };
}

function quantifyVagueCriterion(text: string): string {
  return text
    .replace(/mudah dipahami pengguna awam/gi, 'dapat dipahami pengguna awam dalam <= 5 detik')
    .replace(/mudah diperbaiki/gi, 'dapat diperbaiki dalam <= 2 klik')
    .replace(/jalur keluar atau perbaikan yang mudah/gi, 'jalur keluar atau perbaikan dalam <= 2 klik')
    .replace(/\bmudah\b/gi, 'dalam <= 2 klik')
    .replace(/\bcepat\b/gi, 'dalam <= 2 detik')
    .replace(/\bintuitif\b/gi, 'dengan label aksi eksplisit <= 3 langkah')
    .replace(/\bsimpel\b|\bsederhana\b/gi, 'dalam <= 3 langkah');
}

function buildPurposeTechSpecsContent(prdPurpose: PrdPurpose): {
  title: string;
  content: string;
} {
  if (prdPurpose === 'ui-ux-process') {
    return {
      title: 'Spesifikasi UI States, Design System & Handoff Developer',
      content: [
        '1. Kelengkapan 4 State Layar: setiap layar inti wajib memiliki wireframe/komponen untuk state Normal, Loading (Skeleton), Empty State (ilustrasi + CTA), dan Error State (pesan pemulihan jelas).',
        '2. Design System & Token: gunakan skala spasi 8pt grid, token warna semantik, dan komponen reusable Figma dengan auto-layout.',
        '3. Aksesibilitas (WCAG AA): rasio kontras teks minimal 4.5:1, ukuran tap target interaktif minimal 44x44px di mobile (viewport 360px–375px), serta urutan fokus keyboard yang logis.',
        '4. Developer Handoff & Design QA: sertakan anotasi interaksi, microcopy tombol aktif, dan checklist QA desain sebelum rilis.',
      ].join('\n'),
    };
  }
  if (prdPurpose === 'application') {
    return {
      title: 'Spesifikasi Teknis Aplikasi (API, Keamanan & Offline Recovery)',
      content: [
        '1. Arsitektur & Integrasi API/Data: seluruh transaksi dan perubahan data disinkronkan lewat REST/JSON API dengan skema database tervalidasi dan mekanisme retry otomatis.',
        '2. Keamanan & Hak Akses: terapkan autentikasi sesi yang aman, validasi input di server, otorisasi berbasis role, serta perlindungan data sensitif pengguna.',
        '3. Penanganan System State & Offline: setiap modul menyediakan Loading Skeleton, Empty State, serta penanganan Offline / Koneksi Terputus (antrean lokal atau tombol Coba Lagi tanpa kehilangan draft).',
        '4. Target Performa: response time API <= 300ms pada persentil P95 dan transisi layar tetap responsif tanpa blocking UI.',
      ].join('\n'),
    };
  }
  return {
    title: 'Spesifikasi Teknis Website (Responsif, SEO & Performa)',
    content: [
      '1. Responsif Lintas Perangkat: tata letak adaptif mulai viewport mobile 375px hingga desktop 1440px tanpa horizontal scroll, dengan tap target >= 44x44px.',
      '2. Standar SEO & Metadata: setiap halaman publik memiliki tag <title> unik, meta description, Open Graph, hierarki heading H1–H3 yang benar, dan atribut alt pada gambar.',
      '3. Target Performa Web: Largest Contentful Paint (LCP) <= 2.5 detik dan Cumulative Layout Shift (CLS) < 0.1.',
      '4. Validasi & Keamanan Form: validasi input inline sebelum submit dan pesan error yang jelas saat pengiriman gagal.',
    ].join('\n'),
  };
}

export function applyFallbackChatCommand(
  userMessage: string,
  workspace: WorkspaceState
): { assistantMessage: string; patch: WorkspacePatch } {
  const lower = userMessage.toLowerCase();
  const prdPurpose = workspace.discovery.prdPurpose ?? 'website';
  const flowNodes = workspace.nodes.filter((n) => n.data.zone === 'business-flow');
  const decisionNode = flowNodes.find((n) => n.data.kind === 'flow-decision');
  const lastFlowNode = flowNodes[flowNodes.length - 1];
  const selectedNode = workspace.nodes.find((n) => n.id === workspace.selectedNodeId);
  const anchorNode =
    selectedNode && selectedNode.id !== 'flow-entry'
      ? selectedNode
      : decisionNode ?? lastFlowNode ?? selectedNode;

  if (/(acceptance criteria|metrik terukur|kuantitatif)/.test(lower)) {
    const upgradedNodes = flowNodes.map((node) => {
      const nextCriteria =
        node.data.details.acceptanceCriteria.length > 0
          ? node.data.details.acceptanceCriteria.map((ac) => quantifyVagueCriterion(ac))
          : [`Tahap "${node.data.title}" selesai diverifikasi dalam <= 3 langkah dengan status feedback jelas.`];
      const nextEdges =
        node.data.details.edgeCases.length > 0
          ? node.data.details.edgeCases
          : [`Terjadi error validasi atau timeout jaringan pada "${node.data.title}": tampilkan pesan pemulihan.`];

      return {
        id: node.id,
        title: node.data.title,
        subtitle: node.data.subtitle,
        kind: node.data.kind,
        zone: node.data.zone,
        linkedSectionId: node.data.linkedSectionId,
        details: {
          ...node.data.details,
          acceptanceCriteria: nextCriteria,
          edgeCases: nextEdges,
        },
      };
    });

    const upgradedSections: PlanSection[] = upgradedNodes.map((node) => ({
      id: node.linkedSectionId,
      category: 'business-flow',
      title: node.title,
      linkedNodeId: node.id,
      content: [
        `Tujuan: ${node.details.purpose}`,
        `Aktor: ${node.details.actor}`,
        `User Story: ${node.details.userStory}`,
        `Komponen / Artefak UI: ${node.details.uiComponents.join(', ')}`,
        `Acceptance Criteria:\n- ${node.details.acceptanceCriteria.join('\n- ')}`,
        `Edge Cases:\n- ${node.details.edgeCases.join('\n- ')}`,
      ].join('\n\n'),
    }));

    return {
      assistantMessage:
        'Saya sudah memperkuat **Acceptance Criteria** di seluruh tahap flow agar memakai metrik terukur (batas detik/klik) serta memastikan seluruh **Edge Cases** terisi.',
      patch: {
        upsertNodes: upgradedNodes,
        upsertPlanSections: upgradedSections,
      },
    };
  }

  if (
    /(spesifikasi teknis|spesifikasi handoff|spesifikasi 4 state|design system|wcag|\bseo\b|open graph|\blcp\b|375px|300ms|offline\/koneksi|integrasi api|hak akses|nfr)/.test(
      lower
    )
  ) {
    const spec = buildPurposeTechSpecsContent(prdPurpose);
    return {
      assistantMessage: `Saya menambahkan bagian **${spec.title}** ke panel **Plan Text** (kategori Spesifikasi Teknis) sesuai mode **${PRD_PURPOSE_MAP[prdPurpose].label}**.`,
      patch: {
        upsertPlanSections: [
          {
            id: 'sec-tech-specs',
            category: 'specs',
            title: spec.title,
            content: spec.content,
          },
        ],
      },
    };
  }

  if (/(executive summary|problem statement|proposed solution)/.test(lower)) {
    const q1 = workspace.discovery.q1Summary;
    const summarySec = workspace.planSections.find((s) => s.category === 'summary');
    return {
      assistantMessage:
        'Saya sudah melengkapi **Executive Summary** dengan Problem Statement, Proposed Solution, dan target KPI terukur.',
      patch: {
        upsertPlanSections: [
          {
            id: summarySec?.id ?? 'sec-summary',
            category: 'summary',
            title: summarySec?.title ?? `Ringkasan (${PRD_PURPOSE_MAP[prdPurpose].label}): ${workspace.projectTitle}`,
            content: [
              `Problem Statement: ${q1?.painPoint ?? 'Pengguna mengalami hambatan pada alur kerja manual saat ini.'}`,
              `Proposed Solution: ${q1?.coreGoal ?? workspace.projectTitle} dengan alur terstruktur mode ${PRD_PURPOSE_MAP[prdPurpose].label}.`,
              'Success Criteria: >= 80% pengguna menyelesaikan alur utama dalam <= 3 menit dengan tingkat error input < 2%.',
            ].join('\n\n'),
          },
        ],
      },
    };
  }

  if (/(non-goal|batasan scope|out of scope)/.test(lower)) {
    return {
      assistantMessage:
        'Saya sudah menambahkan bagian **Batasan Scope MVP (Non-Goals)** pada panel Plan Text agar fokus rilis awal terjaga.',
      patch: {
        upsertPlanSections: [
          {
            id: 'sec-non-goals',
            category: 'non-goals',
            title: `Batasan Scope MVP (${PRD_PURPOSE_MAP[prdPurpose].label})`,
            content: `Fitur sekunder di luar alur inti ${PRD_PURPOSE_MAP[prdPurpose].label} ditunda ke iterasi v1.1 agar validasi MVP cepat dirilis.`,
          },
        ],
      },
    };
  }

  if (/(tambah|add|buatkan|sisip|edge case|kendala|retur|pembatalan|pembayaran|notifikasi|step|alur|flow)/.test(lower)) {
    const cleanTopic = userMessage
      .replace(/^(tolong|coba|bisa)?\s*(tambahkan|tambah|buatkan|buat|sisipkan)\s*/i, '')
      .trim();
    const label =
      cleanTopic.length > 4
        ? cleanTopic.charAt(0).toUpperCase() + cleanTopic.slice(1, 52)
        : 'Penanganan Kendala & Validasi Tambahan';
    const newId = `flow-custom-${Date.now().toString(36)}`;
    const newSecId = `sec-${newId}`;

    const isDecision = /(validasi|cek|gagal|kendala|edge case|konfirmasi|batal|test|review)/.test(lower);
    return {
      assistantMessage: `Saya menambahkan tahap **"${label}"** pada Struktur Flow Kerja di canvas (terhubung dari **${anchorNode?.data.title ?? 'alur sebelumnya'}**) sekaligus melengkapi penjelasannya di panel **Plan Text** sebelah kiri.`,
      patch: {
        upsertNodes: [
          {
            id: newId,
            title: label,
            subtitle: `Tahap tambahan (${PRD_PURPOSE_MAP[prdPurpose].label}) hasil iterasi Chat AI.`,
            kind: isDecision ? 'flow-decision' : 'flow-feature',
            zone: 'business-flow',
            linkedSectionId: newSecId,
            connectFromNodeId: anchorNode?.id,
            edgeLabel: isDecision ? 'Cek kondisi' : 'Lanjut',
            details: {
              purpose: `Menangani skenario "${label}" agar alur ${PRD_PURPOSE_MAP[prdPurpose].label} tetap aman dan jelas.`,
              actor: prdPurpose === 'ui-ux-process' ? 'UI/UX Designer' : 'Pengguna & Sistem',
              uiComponents: ['Modal / Banner Konfirmasi', 'Tombol Aksi Pemulihan', 'Status Badge'],
              userStory: `Sebagai pengguna, saya ingin sistem menangani "${label}" dengan jelas sehingga saya tahu langkah berikutnya.`,
              acceptanceCriteria: [
                `Tersedia umpan balik visual yang jelas saat kondisi "${label}" terjadi.`,
                'Pengguna memiliki jalur keluar atau perbaikan yang mudah.',
              ],
              edgeCases: [
                'Pengguna membatalkan proses di tengah jalan atau jaringan terputus.',
              ],
            },
          },
        ],
        upsertPlanSections: [
          {
            id: newSecId,
            category: 'business-flow',
            title: label,
            linkedNodeId: newId,
            content: `Tujuan: Menangani "${label}" secara terstruktur di dalam alur ${PRD_PURPOSE_MAP[prdPurpose].label}.\n\nKomponen UI: Modal / Banner Konfirmasi, Tombol Aksi Pemulihan, Status Badge.\n\nAcceptance Criteria:\n- Tersedia umpan balik visual yang jelas.\n- Pengguna bisa melanjutkan atau memperbaiki data tanpa mengulang dari awal.`,
          },
        ],
      },
    };
  }

  if (/(simpel|sederhana|awam|klien|mudah|ringkas)/.test(lower)) {
    const summarySec = workspace.planSections.find((s) => s.category === 'summary');
    const updatedContent = summarySec
      ? `${summarySec.content}\n\n[Versi Bahasa Sederhana untuk Awam/Klien]: Fokus pada 1 masalah utama secara langsung: mulai dari langkah awal yang jelas, jalankan 3 prioritas inti saja, lalu verifikasi hasilnya.`
      : 'Versi ringkas: Fokus pada 3 prioritas wajib dengan alur langkah yang langsung bisa dipahami pengguna awam.';

    return {
      assistantMessage:
        'Saya sudah menambahkan ringkasan **Versi Bahasa Sederhana** pada bagian atas **Plan Text** sebelah kiri agar lebih mudah dipahami oleh klien atau pengguna awam.',
      patch: {
        upsertPlanSections: [
          {
            id: summarySec?.id ?? 'sec-summary',
            category: 'summary',
            title: summarySec?.title ?? `Ringkasan: ${workspace.projectTitle}`,
            content: updatedContent,
          },
        ],
      },
    };
  }

  if (/(ux|research|persona|ui|figma|komponen|design)/.test(lower)) {
    const newId = `ux-insight-${Date.now().toString(36)}`;
    const newSecId = `sec-${newId}`;
    return {
      assistantMessage:
        'Saya menambahkan kartu **UX Research Insight & Panduan Komponen UI** baru pada zona UX Research di canvas dan menyinkronkannya ke panel Plan Text kiri.',
      patch: {
        upsertNodes: [
          {
            id: newId,
            title: 'UX Insight & Checklist UI',
            subtitle: 'Catatan hierarki visual, empty state, dan microcopy ramah pemula untuk Figma.',
            kind: 'ux-pain',
            zone: 'ux-research',
            linkedSectionId: newSecId,
            details: {
              purpose: 'Memberi panduan konkret bagi UI/UX Designer saat mulai membuat wireframe/mockup.',
              actor: 'UI/UX Designer',
              uiComponents: ['Empty State Illustration', 'Inline Helper Text', 'Primary vs Secondary CTA Hierarchy'],
              userStory: 'Sebagai UI/UX Designer, saya ingin checklist komponen & edge state agar desain tidak melewatkan skenario penting.',
              acceptanceCriteria: [
                'Setiap halaman/layar inti memiliki wireframe untuk kondisi Normal, Loading, Empty, dan Error.',
              ],
              edgeCases: ['Teks label panjang pada layar mobile 360px.'],
            },
          },
        ],
        upsertPlanSections: [
          {
            id: newSecId,
            category: 'ux-research',
            title: 'UX Insight & Checklist Komponen UI (Figma)',
            linkedNodeId: newId,
            content:
              'Panduan UI/UX Designer:\n- Siapkan 4 state layar untuk setiap prioritas wajib: Default, Loading, Empty State, dan Error State.\n- Gunakan microcopy bahasa Indonesia yang aktif dan jelas di setiap tombol CTA.\n- Pastikan alur utama tetap nyaman di layar HP (mobile-first).',
          },
        ],
      },
    };
  }

  return {
    assistantMessage: `Catatan diterima untuk **${anchorNode?.data.title ?? workspace.projectTitle}** (${PRD_PURPOSE_MAP[prdPurpose].label}). Kamu bisa meminta perintah spesifik seperti *"Tambah alur pembayaran gagal"*, *"Perdalam UX research & komponen Figma"*, atau *"Buat ringkasan bahasa awam"* agar saya langsung memperbarui Canvas dan Plan Text.`,
    patch: {},
  };
}

export function buildWorkspaceStateFromOutput(
  discovery: DiscoveryState,
  output: GenerateWorkspaceOutput,
  aiMode: WorkspaceState['aiMode'],
  flowchartDirection: FlowchartDirection = 'TB'
): WorkspaceState {
  const nodes = layoutBlueprintNodes(output.blueprintNodes, output.edges, flowchartDirection);
  const prdPurpose = discovery.prdPurpose ?? 'website';
  return {
    projectId: `proj-${Date.now().toString(36)}`,
    projectTitle: output.projectTitle,
    aiMode,
    flowchartDirection,
    discovery,
    nodes,
    edges: output.edges,
    planSections: output.planSections,
    chatMessages: [
      {
        id: `chat-init-${Date.now().toString(36)}`,
        role: 'assistant',
        content: output.initialAssistantMessage,
      },
    ],
    selectedNodeId: nodes.find((n) => n.data.zone === 'business-flow')?.id ?? nodes[0]?.id ?? null,
    roadmapTasks: buildInitialRoadmapTasks(nodes, prdPurpose),
  };
}
