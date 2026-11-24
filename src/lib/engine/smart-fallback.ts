import type {
  AdaptiveQuestionConfig,
  AdaptiveQuestionId,
  DiscoveryState,
  PlanSection,
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

export function detectArchetype(story: string): ProductArchetype {
  const s = story.toLowerCase();
  if (/(jual|beli|toko|produk|kue|baju|merch|checkout|keranjang|pre-order|preorder|po\b|umkm|dagang|warung|olshop|marketplace|katalog)/.test(s)) {
    return 'ecommerce';
  }
  if (/(booking|reservasi|jadwal|antrean|antrian|klinik|dokter|salon|barber|fotografer|studio|bengkel|jasa|janji temu|konsultasi)/.test(s)) {
    return 'booking';
  }
  if (/(belajar|kursus|kelas|edukasi|siswa|murid|mahasiswa|materi|kuis|bimbel|mentoring|komunitas belajar|sekolah)/.test(s)) {
    return 'education';
  }
  if (/(portofolio|portfolio|karya|showcase|desainer|arsitek|ilustrator|agensi|cv|freelance web)/.test(s)) {
    return 'portfolio';
  }
  if (/(internal|admin|karyawan|hr\b|cuti|gudang|stok|kasir|pos\b|rekap|operasional|absensi|inventaris)/.test(s)) {
    return 'internal-tool';
  }
  if (/(saas|aplikasi|tracker|manajemen|proyek|project|keuangan|catat|produktif|kolaborasi|tim|ai\b|dashboard|otomatis|fintech|kyc)/.test(s)) {
    return 'saas';
  }
  return 'custom';
}

function adaptQuestionsByPurpose(
  prdPurpose: PrdPurpose,
  blueprint: ArchetypeBlueprint,
  valueContext: string
): Omit<ArchetypeBlueprint, 'label' | 'defaultProductName' | 'defaultPersona' | 'defaultPain' | 'defaultValueContext'> {
  if (prdPurpose === 'ui-ux-process') {
    return UI_UX_PROCESS_BLUEPRINT;
  }

  if (prdPurpose === 'application') {
    return {
      q2Prompt: 'Waktu pengguna pertama kali membuka aplikasi ini, satu aksi onboarding apa yang wajib berhasil?',
      q2Tags: [
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
      ],
      q3Prompt: 'Dari modul aplikasi berikut, mana 3 fitur yang paling wajib ada di rilis v1 aplikasi ini?',
      q3Tags: blueprint.q3Tags,
      q4Prompt: `Menurutmu, apa yang bikin pengguna betah memakai aplikasimu untuk ${valueContext}?`,
      q4Tags: [
        ...blueprint.q4Tags.slice(0, 3),
        {
          id: 'app-q4-mobile',
          label: 'Cepat, Ringan & Nyaman Dipakai Satu Tangan',
          description: 'Navigasi aplikasi responsif dan tetap ramah saat koneksi lambat',
        },
      ],
      q5Prompt: 'Apa yang bikin pengguna rutin membuka aplikasimu lagi setiap hari/minggu, bukan cuma sekali install?',
      q5Tags: [
        ...blueprint.q5Tags.slice(0, 3),
        {
          id: 'app-q5-sync',
          label: 'Notifikasi Cerdas & Data Tersinkron',
          description: 'Pengingat relevan dan riwayat pribadi selalu siap dibuka kembali',
        },
      ],
    };
  }

  // Website mode
  return {
    q2Prompt: 'Waktu pengunjung pertama kali mendarat di website ini, satu hal apa yang harus langsung dilakukan?',
    q2Tags: blueprint.q2Tags,
    q3Prompt: 'Dari halaman & fitur website berikut, mana 3 elemen yang paling wajib ada di versi pertama?',
    q3Tags: blueprint.q3Tags,
    q4Prompt: `Menurutmu, apa yang bikin pengunjung website mau melakukan ${valueContext}?`,
    q4Tags: blueprint.q4Tags,
    q5Prompt: 'Apakah yang bikin pengunjung bakal balik lagi membuka websitemu di lain waktu?',
    q5Tags: blueprint.q5Tags,
  };
}

function buildAdaptiveQuestions(
  prdPurpose: PrdPurpose,
  blueprint: ArchetypeBlueprint,
  previous?: DiscoveryState['questions'],
  valueContextOverride?: string
): Record<AdaptiveQuestionId, AdaptiveQuestionConfig> {
  const preserveUserCustomTags = (
    qId: AdaptiveQuestionId,
    aiTags: { id: string; label: string; description?: string }[],
    maxSelect: number
  ) => {
    const prev = previous?.[qId];
    const customTags = prev?.tags.filter((t) => t.source === 'user') ?? [];
    const mergedTags = [
      ...aiTags.map((t) => ({ ...t, source: 'ai' as const })),
      ...customTags,
    ];
    const validIds = new Set(mergedTags.map((t) => t.id));
    const keptSelected = (prev?.selectedTagIds ?? [])
      .filter((id) => validIds.has(id))
      .slice(0, maxSelect);
    return { mergedTags, keptSelected };
  };

  const adapted = adaptQuestionsByPurpose(
    prdPurpose,
    blueprint,
    valueContextOverride ?? blueprint.defaultValueContext
  );

  const now = Date.now();
  const q2State = preserveUserCustomTags('q2', adapted.q2Tags, 1);
  const q3State = preserveUserCustomTags('q3', adapted.q3Tags, 3);
  const q4State = preserveUserCustomTags('q4', adapted.q4Tags, 2);
  const q5State = preserveUserCustomTags('q5', adapted.q5Tags, 2);

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
      helperHint: 'Pilih 1 fokus paling awal, atau pilih Other untuk menulis pilihan sendiri.',
      selectionMode: 'single',
      minSelect: 1,
      maxSelect: 1,
      tags: q2State.mergedTags,
      selectedTagIds: q2State.keptSelected,
      updatedAt: now,
    },
    q3: {
      id: 'q3',
      stepNumber: 3,
      title:
        prdPurpose === 'ui-ux-process'
          ? '3 Artefak UI/UX Wajib'
          : prdPurpose === 'application'
          ? '3 Fitur Wajib Aplikasi'
          : '3 Fitur / Halaman Wajib Website',
      prompt: adapted.q3Prompt,
      helperHint: 'Pilih maksimal 3 prioritas utama untuk MVP agar scope tetap fokus.',
      selectionMode: 'multi',
      minSelect: 1,
      maxSelect: 3,
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
      helperHint: 'Pilih 1–2 alasan paling kuat yang membuat target user mau memakai/percaya.',
      selectionMode: 'multi',
      minSelect: 1,
      maxSelect: 2,
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
      helperHint: 'Pilih 1–2 mekanisme yang membuat pengguna atau tim terus kembali.',
      selectionMode: 'multi',
      minSelect: 1,
      maxSelect: 2,
      tags: q5State.mergedTags,
      selectedTagIds: q5State.keptSelected,
      updatedAt: now,
    },
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
  };
}

function extractProductTitleFromStory(
  story: string,
  fallbackTitle: string,
  prdPurpose: PrdPurpose
): string {
  const cleaned = story.replace(/\s+/g, ' ').trim();
  const match = cleaned.match(/(?:bikin|buat|membuat|membangun|merancang ulang|merancang|menyusun)\s+([^,.!?]+)/i);
  if (match && match[1]) {
    const beforeClause = match[1]
      .split(/\s+(?:agar|supaya|untuk|biar|sehingga|yang)\s+/i)[0]
      .trim();
    if (beforeClause.length >= 4) {
      let truncated = beforeClause;
      if (truncated.length > 40) {
        const words = truncated.slice(0, 40).split(' ');
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

  const productNameSuggestion = extractProductTitleFromStory(
    cleanedStory,
    blueprint.defaultProductName,
    prdPurpose
  );

  const q1Summary: Q1ExtractedSummary = {
    prdPurpose,
    archetype,
    productNameSuggestion,
    persona: cleanedStory.length > 140 ? `${cleanedStory.slice(0, 137)}...` : cleanedStory,
    coreGoal:
      prdPurpose === 'ui-ux-process'
        ? `Menjalankan proses UI/UX untuk ${productNameSuggestion} guna membantu ${blueprint.defaultValueContext}.`
        : `Mewujudkan ${productNameSuggestion} (${purposeMeta.label}) untuk membantu ${blueprint.defaultValueContext}.`,
    painPoint: blueprint.defaultPain,
    valueContext: blueprint.defaultValueContext,
  };

  const questions = buildAdaptiveQuestions(
    prdPurpose,
    blueprint,
    previousQuestions,
    blueprint.defaultValueContext
  );

  const assistantReply = `Siap! Untuk tujuan **${purposeMeta.label}** pada konteks **${blueprint.label}** (${productNameSuggestion}), seluruh pertanyaan dan tag di **Pertanyaan 2, 3, 4, dan 5** sudah langsung disesuaikan. Silakan pilih tag yang paling cocok (atau klik **Other** untuk menambah sendiri).`;

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
      subtitle: firstStep.description || 'Langkah paling pertama dalam alur ini.',
      kind: 'flow-start',
      zone: 'business-flow',
      linkedSectionId: 'sec-flow-entry',
      details: {
        purpose: `Memastikan tahap awal "${firstStep.label}" langsung memberi arah yang jelas sesuai mode ${purposeMeta.label}.`,
        actor: prdPurpose === 'ui-ux-process' ? 'UX Designer & Researcher' : 'Pengguna Baru',
        uiComponents:
          prdPurpose === 'ui-ux-process'
            ? ['Research Brief Board', 'Current Flow Audit Map', 'Hypothesis Notes']
            : prdPurpose === 'application'
            ? ['App Launch / Splash', 'Quick Onboarding Sheet', 'Primary Action Button']
            : ['Above-the-Fold Hero', 'Primary CTA Button', 'Contextual Quick Guide'],
        userStory: `Sebagai ${prdPurpose === 'ui-ux-process' ? 'desainer' : 'pengguna baru'}, langkah pertama saya adalah "${firstStep.label}" agar arah berikutnya terstruktur.`,
        acceptanceCriteria: [
          `Tahap "${firstStep.label}" dapat dicapai atau dijalankan tanpa hambatan awal yang rumit.`,
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

  // Decision / Verification gate
  blueprintNodes.push({
    id: 'flow-decision',
    title:
      prdPurpose === 'ui-ux-process'
        ? 'Usability Test & Design Review'
        : 'Validasi & Konfirmasi Hasil',
    subtitle: `Memastikan ${valueHooks} terpenuhi sebelum tahap final.`,
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
        'Seluruh skenario gagal dan revisi mudah diperbaiki tanpa mengulang dari awal.',
        'Kriteria lolos tercatat jelas sebagai acuan siap eksekusi.',
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
    label: prdPurpose === 'ui-ux-process' ? 'Uji & review' : 'Cek kelengkapan',
  });

  // Outcome & Retention Loop
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
        'Tersedia ringkasan hasil akhir yang siap dibagikan atau ditindaklanjuti.',
        `Mekanisme "${retentionHooks}" aktif setelah siklus pertama selesai.`,
      ],
      edgeCases: ['Revisi pasca-handoff atau notifikasi lanjutan gagal terkirim.'],
    },
  });

  edges.push({
    id: 'e-flow-decision-flow-outcome',
    source: 'flow-decision',
    target: 'flow-outcome',
    label: 'Valid / Sukses',
    animated: true,
  });

  edges.push({
    id: 'e-ux-persona-flow-entry',
    source: 'ux-persona',
    target: 'flow-entry',
    targetHandle: 'top',
    label: prdPurpose === 'ui-ux-process' ? 'Riset -> Flow' : 'Onboarding',
  });

  const planSections: PlanSection[] = [
    {
      id: 'sec-summary',
      category: 'summary',
      title: `Ringkasan (${purposeMeta.label}): ${q1.productNameSuggestion}`,
      content: `Tujuan Pembuatan PRD: ${purposeMeta.label}\n\n${q1.coreGoal}\n\nMasalah utama yang diselesaikan: ${q1.painPoint}\nKriteria / Daya tarik utama: ${valueHooks}.\nMekanisme keberlanjutan / retensi: ${retentionHooks}.`,
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
    {
      id: 'sec-non-goals',
      category: 'non-goals',
      title: `Batasan Scope MVP (${purposeMeta.label})`,
      content:
        prdPurpose === 'ui-ux-process'
          ? 'Fokus fase ini adalah merampungkan riset UX, user flow, wireframe semua state, dan spesifikasi handoff. Implementasi kode backend atau integrasi produksi di luar lingkup dokumen proses UI/UX ini.'
          : prdPurpose === 'application'
          ? 'Fokus aplikasi v1 dibatasi pada 3 modul wajib inti, onboarding cepat, dan penanganan state dasar agar segera bisa diuji oleh pengguna nyata.'
          : 'Fokus website v1 dibatasi pada struktur halaman inti dan 3 fitur wajib agar konversi dan penyampaian informasi segera berjalan efektif.',
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
  aiMode: WorkspaceState['aiMode']
): WorkspaceState {
  const nodes = layoutBlueprintNodes(output.blueprintNodes, output.edges);
  const prdPurpose = discovery.prdPurpose ?? 'website';
  return {
    projectId: `proj-${Date.now().toString(36)}`,
    projectTitle: output.projectTitle,
    aiMode,
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
