# Prompt Desain UI/UX Komprehensif — Nyantrik Digital Dark Mode Budaya

> **Cara pakai.** Tempel semua isi dari bagian “PROMPT UNTUK AGENT DESIGN” ke Agent Design-mu. Kalau agent punya batas panjang atau cenderung berhenti di tengah, kirim bertahap: (1) Bagian 1–3 sebagai konteks tetap, (2) satu bagian halaman per kiriman (Bagian 4, 5, 6, 7), (3) terakhir Bagian 8. Ganti isi dalam \[kurung siku\] dengan keputusan timmu. “Nyantrik Digital” hanyalah nama kerja; cek ketersediaan nama dan mereknya sebelum dipakai resmi.

## PROMPT UNTUK AGENT DESIGN

### BAGIAN 1 — PERAN, KONTEKS, TUJUAN

**Perananmu.** Kamu adalah Lead Product Designer (UI/UX) senior yang juga paham UX writing dan sistem desain. Tugasmu: membuat mockup high-fidelity untuk SEMUA halaman dan alur platform yang dirinci di bawah, lengkap dengan state-nya, versi mobile dan desktop, serta catatan serah-terima untuk developer. Mockup ini dipakai untuk pitch ke mitra dan juri, serta sebagai acuan pengembangan.

**Produk dalam satu kalimat.** \[NAMA PRODUK\] adalah platform tempat orang belajar keterampilan budaya Nusantara (tahap awal: batik canting dan pranatacara), dinilai langsung oleh maestro, memperoleh sertifikat yang bisa diverifikasi, lalu dapat menjual karya atau menawarkan jasa lewat platform yang sama.

**Tesis produk (wajib terasa di setiap layar):** Belajar → Dinilai maestro → Tersertifikasi → Berpenghasilan. Ini satu alur yang nyambung, BUKAN tiga produk terpisah (kursus, toko, direktori). Antarhalaman harus ada jembatan: dari kursus ke kit, dari lulus ke jual karya atau terima booking, dari produk ke jalur belajarnya.

**Empat pilar yang harus tampak di desain:**

1. Maestro di tengah: nilai utamanya koreksi dan penilaian manusia, bukan sekadar video.
2. Karya dan pembuatnya terlihat: setiap produk punya Paspor Karya (asal, teknik, pembuat, jejak pembuatan).
3. Budaya dihormati: atribusi, izin komunitas, tingkat akses, dan bagi hasil ditampilkan transparan di UI.
4. Terjangkau dan inklusif: mobile-first, hemat kuota, bahasa sederhana, aksesibel.

**Peran pengguna.** Pengunjung publik; Pelajar; Maestro/Mentor; Penjual/Perajin; Praktisi Jasa (mis. pranatacara); Institusi (sekolah, EO/WO, desa wisata, korporat); Kurator dan Admin. Satu akun bisa memegang banyak peran (pelajar yang lulus bisa menjadi penjual atau praktisi), jadi sediakan role switcher yang jelas.

**Persona acuan (pakai saat memilih copy, contoh data, dan prioritas):**

- Sari, 24, karyawan kreatif di kota, ingin belajar batik sebagai hobi dan mungkin sampingan. HP kelas menengah, kuota terbatas.
- Pak Wiryo, 52, maestro batik \[contoh\], tidak akrab teknologi; butuh antarmuka review yang sederhana, huruf besar, sedikit langkah.
- Rani, 28, ingin jadi pranatacara profesional; butuh sertifikat dan jalan mendapatkan klien.
- Bu Dwi, 41, guru SD; mencari muatan lokal untuk kelas; butuh laporan progres.
- Mas Bayu, 33, pemilik wedding organizer; mencari pranatacara tepercaya.
- Mbak Tika, 30, kurator budaya; teliti, butuh alat tinjau yang rapi dan jejak audit.

**Prinsip UX.**

- Mobile-first untuk publik dan pelajar; desktop-first untuk studio mentor dan admin (tetap sediakan versi mobile yang layak).
- Satu CTA utama per layar; progressive disclosure; tidak ada layar buntu (setiap layar punya langkah berikutnya).
- Kepercayaan adalah fitur: lencana verifikasi, rincian bagi hasil, riwayat versi, kebijakan yang mudah dibaca.
- Tanpa dark pattern: tidak ada countdown palsu, kelangkaan palsu, atau tombol yang menyesatkan.

**Aturan konten (WAJIB).**

- Tidak ada lorem ipsum. Gunakan teks Indonesia yang realistis, nada hangat.
- Semua data contoh (nama, harga, angka, testimoni) diberi penanda halus “Contoh”. Jangan gunakan nama orang nyata, logo merek nyata (bank, kurir, e-wallet), atau foto orang nyata. Gunakan ilustrasi atau placeholder foto duotone.
- Fakta budaya (makna motif, periode mangsa, tata cara adat, istilah) HARUS berupa placeholder berlabel \[DUMMY — verifikasi kurator\]. Jangan mengarang klaim budaya yang terdengar meyakinkan.
- Sertifikat adalah sertifikat platform, BUKAN sertifikasi pemerintah atau BNSP. Jangan menyiratkan akreditasi resmi di copy maupun desain.
- Harga, persentase bagi hasil, SLA, dan kuota semuanya angka contoh; tandai.

**Sensitivitas budaya di UI.**

- Motif dipakai sebagai elemen struktural halus (pembatas, border, ilustrasi empty state, pola latar kontras rendah dengan opasitas di bawah 8%), bukan wallpaper ramai di belakang teks. Teks tidak boleh diletakkan di atas pola ramai.
- Jangan pakai motif larangan atau sakral sebagai dekorasi (mis. motif larangan keraton seperti Parang Rusak). Buat motif generik/geometris sendiri yang terinspirasi anyaman dan batik.
- Aksara Jawa hanya dekoratif pada ornamen atau judul dengan teks yang tervalidasi; jangan jadikan konten fungsional tanpa sumber.
- Hindari eksotisme dan stereotip. Pelaku budaya ditampilkan sebagai ahli dan pengajar, bukan objek foto.

### BAGIAN 2 — BRAND & DESIGN SYSTEM

**Karakter brand.** Hangat, berakar, tepercaya, kontemporer. Bayangkan “padepokan modern”: lapang, rapi, ada rasa tangan dan proses; bukan museum berdebu, bukan startup generik.

**Warna (token; boleh disesuaikan, tapi pertahankan kontras).**

| Token | Hex | Dipakai untuk |
| --- | --- | --- |
| indigo-900 | #1B2540 | Teks utama, header gelap |
| indigo-600 | #2F4A8A | Aksi primer, tautan |
| soga-700 | #7A4A21 | Aksen hangat, heading sekunder |
| soga-300 | #D9B38C | Garis dan ilustrasi hangat |
| malam-50 | #FAF6EE | Latar utama (krem) |
| malam-100 | #F1E9DA | Panel, kartu |
| kunyit-500 | #E0A526 | Sorotan, badge, CTA sekunder |
| daun-600 | #3E6B48 | Sukses, lulus, mangsa |
| bata-600 | #B0432E | Error, bahaya |
| netral | #1F1F1F, #5C5C5C, #9A9A9A, #E6E1D8, #FFFFFF | Teks, border, latar |

Wajib: kontras teks minimal 4,5:1 (3:1 untuk teks besar dan komponen UI). Cek semua pasangan warna. Sediakan mode gelap untuk pemutar pelajaran dan dashboard (opsional untuk halaman publik).

**Tipografi.** Heading: serif ekspresif \[mis. Fraunces atau Playfair Display\]. Body dan UI: sans humanis \[mis. Plus Jakarta Sans atau Inter\]. Aksara Jawa dekoratif: Noto Sans Javanese. Skala: 12/14/16/18/20/24/30/38/48/60 px. Body minimal 16 px, line-height 1,5–1,6, panjang baris maksimal ±70 karakter.

**Layout dan bentuk.** Grid 8 pt. Container maksimal 1200 px. Kolom: 12 (desktop), 8 (tablet), 4 (mobile). Radius: 12 (kartu), 8 (input), pil penuh (chip). Elevasi 3 tingkat yang lembut. Border 1 px warna netral hangat.

**Ikon, ilustrasi, foto.** Ikon outline konsisten 24 px (stroke 1,75) \[mis. Lucide\], ditambah ikon khas (canting, kain, mikrofon/pranatacara, roda mangsa) yang digambar dengan gaya sama. Foto menonjolkan tangan dan proses; placeholder duotone indigo/soga. Ilustrasi garis dengan pola anyaman/batik geometris.

**Gerak.** 150–250 ms, ease-out. Mikro-interaksi: cincin progres, centang lulus, “stempel” sertifikat. Hormati prefers-reduced-motion.

**Komponen dasar (semua dengan state default, hover, fokus, aktif, nonaktif, loading, error):** tombol (primer, sekunder, tersier, bahaya, ikon), input teks, textarea, select, multi-select, chip filter, checkbox, radio, toggle, slider, date/time picker, OTP input, search dengan saran, tabs, akordeon, breadcrumb, paginasi, tabel (padat dan nyaman), kartu, modal, bottom sheet, drawer filter, toast, banner peringatan, tooltip, dropdown menu, avatar, badge, progress bar dan cincin, stepper, skeleton, empty state, rating bintang, stepper kuantitas, upload dropzone, kalender, chat bubble.

**Komponen khas platform (jadikan identitas; desain dengan serius):**

1. **Kartu Atribusi Budaya**: komunitas/sumber pengetahuan, nama pemberi izin, tanggal persetujuan, tautan rujukan, tombol “Pelajari kebijakan hak budaya”.
2. **Lencana Akses**: Publik / Berbayar / Terbatas Komunitas (dengan ikon dan tooltip penjelasan).
3. **Lencana Teknik** untuk kain/karya: Tulis / Cap / Printing / Campuran, dengan penjelasan singkat dan status “Terverifikasi bukti proses”.
4. **Lencana Verifikasi**: Maestro Terverifikasi, Penjual Terverifikasi, Sertifikat Valid.
5. **Rincian Bagi Hasil**: bar bertumpuk (pembuat / maestro / komunitas / platform) dengan tooltip rumus.
6. **Peta Jalur**: stepper level → modul → pelajaran dengan status (terkunci, terbuka, selesai, menunggu penilaian, perlu revisi).
7. **Pemutar Pelajaran**: caption, kecepatan 0,75–2×, kualitas (Hemat Kuota/Standar/HD), catatan bertimestamp, unduh offline, picture-in-picture.
8. **Pengunggah Tugas**: foto/video/audio, overlay panduan sudut foto, kompresi otomatis, progres, antrean offline.
9. **Panel Rubrik & Anotasi**: skor 4 tingkat per kriteria, pin di foto, timestamp di video, voice note.
10. **Kartu Sertifikat** dengan QR dan nomor seri.
11. **Pemilih Ketersediaan** (kalender dengan status tersedia/sibuk).
12. **Sakelar Mode Hemat Kuota** (global, terlihat di header dan pengaturan).

**Panduan penulisan UI (UX writing).** Sapaan “kamu”; kalimat pendek dan aktif; hindari jargon; istilah Jawa diberi tooltip glosarium \[DUMMY — verifikasi kurator\]. Pesan error menyebut masalah dan solusinya (“Foto terlalu besar. Coba kecilkan atau pilih Hemat Kuota.”). Empty state memberi ajakan, bukan sekadar “Tidak ada data”. Konfirmasi aksi berisiko menjelaskan dampaknya. Nada: hormat, hangat, tidak menggurui, tidak lebay.

**Aksesibilitas dan inklusi.** Target WCAG 2.1 AA: target sentuh minimal 44 px, fokus terlihat, label formulir eksplisit, teks alternatif, caption dan transkrip untuk video, tidak mengandalkan warna saja, mendukung zoom 200%, urutan fokus logis, pengaturan ukuran teks dan kontras tinggi. Bahasa: Indonesia sebagai default; sakelar ID/EN.

**Kinerja dan konektivitas.** Asumsikan jaringan lambat dan HP kelas menengah: skeleton, gambar lazy-load, Mode Hemat Kuota, status offline yang jelas, antrean unggahan yang bisa dilanjutkan.

**Breakpoint.** Mobile 390 (wajib untuk semua halaman, uji juga 360), Tablet 768 (halaman kunci), Desktop 1440.

**State wajib untuk SETIAP halaman atau komponen data** (tidak diulang di spesifikasi per halaman; hanya state khusus yang disebut): loading (skeleton), kosong (ilustrasi + CTA), error (pesan manusiawi + coba lagi), offline, perlu login atau tidak punya izin (403), sukses (toast atau layar konfirmasi), validasi formulir inline, tersimpan otomatis/draf, dan modal konfirmasi untuk aksi berisiko.

### BAGIAN 3 — ARSITEKTUR INFORMASI, NAVIGASI, ALUR

**Peta situs ringkas.**

- Publik: Beranda; Tentang & Etika; Jalur (katalog, detail); Maestro (profil); Toko (katalog, detail); Paspor Karya; Verifikasi Sertifikat; Praktisi (direktori, profil, booking); Kalender Mangsa; Pustaka (beranda, entri); Asisten Tanya Budaya; Untuk Institusi; Jurnal; Bantuan; Legal; Auth; Onboarding; Keranjang; Checkout; Pembayaran; Halaman sistem.
- Pelajar: Dashboard; Jalurku; Ruang Belajar; Kuis; Tugas Praktik; Umpan Balik; Kelas Live; Ruang Kohort; Sertifikat; Portofolio; Pesanan; Booking; Notifikasi; Profil & Pengaturan; Pengajuan jadi Penjual/Praktisi.
- Maestro: Dashboard; Antrean Review; Halaman Review; Studio Jalur; Kelas Live; Pendapatan; Profil & Izin.
- Penjual: Dashboard; Produk; Tambah/Edit Produk; Pesanan; Saldo; Profil Toko.
- Praktisi: Dashboard; Layanan & Paket; Ketersediaan; Booking; Portofolio & Ulasan.
- Institusi: Dashboard; Kelas & Kursi; Laporan; Penagihan.
- Kurator/Admin: Dashboard; Kurasi; Pustaka CMS; Korpus & Log AI; Verifikasi Mitra; Moderasi Produk; Sengketa; Keuangan; Pengguna; Sertifikat & Rubrik; Analitik Dampak; Pengaturan.

**Navigasi.**

- Publik desktop: navbar sticky — logo | Belajar | Toko | Praktisi | Pustaka & Mangsa | Untuk Institusi | cari | keranjang | Masuk/Daftar. Mobile: menu hamburger.
- Setelah login: pelajar di mobile memakai bottom tab (Beranda, Belajar, Toko, Pesanan, Akun); desktop memakai sidebar. Mitra dan admin memakai sidebar sesuai peran, dengan role switcher di menu avatar.
- Footer di semua halaman publik: tautan, bahasa, kontak, dan tautan “Etika & Hak Budaya”.

**Alur prototipe yang harus bisa diklik berurutan (F1–F9).**

- F1 Temukan → beli: Beranda → Katalog Jalur → Detail Jalur → pilih paket → Daftar/Masuk → Checkout → Pembayaran → Konfirmasi → Ruang Belajar.
- F2 Belajar → sertifikat: Ruang Belajar → Kuis → Tugas Praktik → (mentor menilai) → Umpan Balik → Revisi → Lulus → Sertifikat → Verifikasi QR.
- F3 Beli kit/produk: Toko → Detail Produk → Keranjang → Checkout (alamat + pengiriman) → Pembayaran → Pesanan → pelacakan → ulasan.
- F4 Jadi penjual: Portofolio → “Jadikan produk dijual” → Pengajuan Penjual → Tambah Produk (Paspor Karya) → verifikasi → produk aktif → QR dicetak.
- F5 Booking praktisi: Direktori → Profil → ajukan booking → praktisi menerima → DP → hari-H → selesai → ulasan.
- F6 Maestro: Studio Jalur membuat jalur → ajukan ke kurator → terbit; Antrean Review → Halaman Review → keputusan.
- F7 Kurasi: pengajuan konten → tinjau kurator → persetujuan komunitas → terbit di Pustaka.
- F8 Institusi: Untuk Institusi → Minta Penawaran → dashboard institusi → alokasi kursi → laporan.
- F9 Verifikasi publik: pindai QR produk → Paspor Karya; pindai atau ketik kode sertifikat → Verifikasi.

### BAGIAN 4 — HALAMAN PUBLIK, AUTENTIKASI, DAN TRANSAKSI

Format tiap halaman: Tujuan · Struktur (berurutan dari atas) · Interaksi dan state khusus · Catatan mobile. State umum (loading, kosong, error, dst.) tetap dibuat sesuai Bagian 2; di sini hanya state khusus yang disebut.

**P01 — Beranda (/)**

- Tujuan: dalam 5 detik pengunjung paham “belajar dari maestro → bersertifikat → bisa berpenghasilan”, lalu menuju Jalur atau Toko.
- Struktur: (1) navbar sticky; (2) hero: headline kuat \[mis. “Belajar dari maestro. Berkarya. Berpenghasilan.”\], subjudul, CTA utama “Mulai Belajar”, CTA sekunder “Lihat Karya”, visual tangan memegang canting dengan kartu mengambang Paspor Karya mini; (3) strip bukti (jumlah maestro, lulusan, karya; angka contoh); (4) “Bagaimana cara kerjanya”: 4 langkah horizontal dengan ilustrasi; (5) Jalur unggulan: 3 kartu (Batik Canting, Pranatacara, satu kartu “Segera hadir”); (6) Temui maestro: carousel 3–4 profil; (7) Karya dari lulusan: grid 4 produk dengan Lencana Teknik dan ikon Paspor; (8) teaser Kalender Mangsa (widget “Hari ini: mangsa \[DUMMY\]” + CTA); (9) blok “Budaya dibagikan dengan izin”: tiga poin (atribusi, izin, bagi hasil) + tautan kebijakan; (10) band Untuk Institusi; (11) testimoni (contoh, bertanda); (12) FAQ ringkas; (13) CTA penutup + footer.
- Interaksi: reveal saat scroll yang halus; carousel bisa dipakai dengan keyboard dan swipe.
- Mobile: hero vertikal; CTA “Mulai Belajar” sticky di bawah.

**P02 — Tentang dan Etika Budaya (/tentang)**

- Tujuan: membangun kepercayaan, menjelaskan siapa di balik platform dan bagaimana budaya diperlakukan.
- Struktur: cerita misi singkat; Dewan Kurator (kartu anggota: foto placeholder, bidang, afiliasi; contoh); prinsip etika (atribusi, izin, bagi hasil, tingkat akses) sebagai diagram “Siapa mendapat apa” dari satu transaksi; mitra komunitas (logo placeholder); ringkasan transparansi (angka dampak contoh); kontak.
- Mobile: diagram menjadi tumpukan vertikal.

**P03 — Katalog Jalur Belajar (/jalur)**

- Tujuan: menemukan jalur yang cocok dengan cepat.
- Struktur: judul + search; bar filter (Budaya: Batik/Pranatacara/…; Level: Pemula/Menengah/Mahir; Format: Mandiri/Kohort live/Hibrid; Harga; Dengan kit; Bahasa pengantar); sortir (Terpopuler, Terbaru, Harga); chip filter aktif yang bisa dihapus; grid kartu jalur (cover, judul, nama maestro, level, total durasi, jumlah modul, harga, rating, lencana “Dengan Kit” dan “Bersertifikat”); paginasi atau muat lebih banyak; banner “Bingung mulai dari mana?” yang membuka kuis penentu jalur (modal 3 pertanyaan → rekomendasi 2 jalur).
- State khusus: hasil nol dengan saran melonggarkan filter.
- Mobile: filter jadi bottom sheet dengan tombol “Terapkan (n)”.

**P04 — Detail Jalur (/jalur/\[slug\])**

- Tujuan: halaman informasi sekaligus halaman penjualan; calon pelajar yakin dan memilih paket.
- Struktur: breadcrumb; hero (judul, subjudul, maestro, level, durasi, bahasa, rating) dengan kartu pembelian sticky di kanan (harga dan opsi paket: “Jalur saja”, “Jalur + Kit”, “Kohort live”; ringkasan harga berubah saat paket dipilih; CTA “Daftar Sekarang”; tautan “Coba pelajaran gratis”); “Yang akan kamu capai” (karya akhir + sertifikat); Peta Jalur (level → modul → pelajaran dengan ikon tipe: video, bacaan, kuis, tugas praktik, live; pelajaran cuplikan gratis ditandai); “Cara penilaian” (contoh rubrik, janji waktu umpan balik \[contoh 3 hari kerja\], contoh sebelum dan sesudah koreksi maestro); isi Kit (daftar isi, foto, spesifikasi, opsi “bawa alat sendiri” + daftar belanja); Kartu Atribusi Budaya; pengajar (kartu maestro → profil); jadwal kohort (tanggal, sisa kuota yang jujur); karya lulusan; ulasan; kebijakan pengembalian dana; FAQ; jalur terkait.
- Interaksi dan state khusus: kohort penuh → daftar tunggu; belum login → diarahkan masuk lalu kembali ke halaman ini; paket Jalur + Kit menampilkan estimasi ongkir.
- Mobile: kartu pembelian menjadi bar bawah (harga + CTA) yang membuka bottom sheet pilihan paket.

**P05 — Profil Maestro (/maestro/\[slug\])**

- Struktur: header (foto, nama, daerah, spesialisasi, Lencana Maestro Terverifikasi, lama berkarya); bio dan filosofi mengajar; tradisi dan keahlian; jalur yang diajar; kelas live mendatang; portofolio karya; video wawancara; asal komunitas dan pernyataan izin berbagi pengetahuan (Kartu Atribusi); ulasan; tombol “Ikuti”.

**P06 — Toko, Katalog (/toko)**

- Struktur: tab kategori (Kit Belajar, Karya Maestro, Karya Lulusan, Bahan & Alat); filter (budaya, teknik: Tulis/Cap/Printing/Campuran, bahan, rentang harga, daerah asal, pembuat: maestro/lulusan, “Punya Paspor Karya”); sortir; grid kartu produk (foto, nama, pembuat, Lencana Teknik, harga, kota asal, ikon hati wishlist); banner “Dibuat oleh lulusan platform”.
- State khusus: stok habis ditandai tanpa menghilangkan kartu.
- Mobile: filter bottom sheet; grid 2 kolom.

**P07 — Detail Produk (/toko/\[slug\])**

- Struktur: galeri (foto, video proses, zoom); info (judul, harga, stok, variasi, pembuat, Lencana Teknik dan Verifikasi); tombol “Tambah ke Keranjang” dan “Beli Sekarang”; kartu ringkas Paspor Karya + “Lihat Paspor Lengkap”; deskripsi; spesifikasi (bahan, ukuran, perawatan); pengiriman (asal kota, estimasi ongkir dan waktu); Rincian Bagi Hasil; Kartu Atribusi Budaya; ulasan pembeli; produk lain dari pembuat; kebijakan retur. Untuk kit: tampilkan “Dipakai di Jalur \[nama jalur\]” dengan CTA ke jalur.
- State khusus: stok habis → “Beritahu saya saat tersedia”; produk dibuat sesuai pesanan → tampilkan waktu pengerjaan.

**P08 — Paspor Karya (/paspor/\[kode\])** (tujuan pindai QR pada produk)

- Tujuan: bukti keaslian dan cerita karya; publik, tanpa login, ringan, mobile-first.
- Struktur: status verifikasi besar (Valid ✓ / Tidak ditemukan); foto karya; judul; pembuat (nama, foto, tautan profil) dan maestro pembimbing; Teknik (Lencana + penjelasan + status bukti proses); bahan; Motif dan Filosofi (Kartu Atribusi + status persetujuan komunitas; isi \[DUMMY — verifikasi kurator\]); Jejak Pembuatan (linimasa foto proses bertanggal); waktu pengerjaan; Rincian Bagi Hasil; nomor seri; tombol “Beli karya serupa”, “Pelajari teknik ini” (→ jalur), “Laporkan ketidaksesuaian”.
- State khusus: kode tidak valid; kode sedang ditinjau atau dicabut (peringatan jelas).

**P09 — Verifikasi Sertifikat (/verifikasi/\[kode\])**

- Struktur: hasil besar (Valid / Dicabut / Tidak ditemukan); data pemegang (nama dapat disamarkan sesuai pengaturan privasi), kompetensi, level, tanggal terbit, maestro penilai, jalur, nomor seri; catatan “Sertifikat platform, bukan sertifikasi pemerintah”; form input kode manual; tombol cetak.

**P10 — Direktori Praktisi (/praktisi)**

- Struktur: filter (jenis layanan, kota atau area layanan, bahasa/gaya, jenis acara: pernikahan, adat, instansi, sekolah; rentang harga; tanggal tersedia — memilih tanggal hanya menampilkan yang tersedia; “Tersertifikasi platform”); toggle Daftar/Peta; kartu praktisi (foto, nama, Lencana Sertifikat, area, bahasa, harga mulai, rating).
- State khusus: tidak ada yang tersedia di tanggal tersebut → tawarkan tanggal terdekat atau tinggalkan permintaan.

**P11 — Profil Praktisi dan Booking (/praktisi/\[slug\])**

- Struktur: header; tentang; sertifikasi (tautan verifikasi); paket layanan (nama, durasi, termasuk apa, harga); portofolio (cuplikan video, foto acara); ulasan; kalender ketersediaan; panel booking sticky: pilih paket → tanggal dan jam → lokasi → bahasa/gaya → catatan → ringkasan harga + DP → “Ajukan Booking”.
- Interaksi: ini permintaan, bukan pembayaran langsung. Praktisi mengonfirmasi dalam \[contoh 24 jam\], baru DP dibayar. Layar “Permintaan terkirim” menjelaskan langkah berikutnya.
- State khusus: tanggal tidak tersedia; praktisi menolak atau mengusulkan tanggal lain.

**P12 — Kalender Mangsa (/mangsa)**

- Tujuan: pintu masuk gratis yang indah dan berguna; edukasi pengetahuan musim tradisional.
- Struktur: visual utama berupa roda 12 mangsa (Kasa hingga Saddha) yang bisa diputar, posisi “hari ini” ditandai; detail mangsa terpilih (periode, ciri alam, saran aktivitas tani, istilah, sumber — semua \[DUMMY — verifikasi kurator\]); toggle tampilan Roda/Linimasa/Daftar; lapisan data iklim publik (grafik hujan dan suhu bulan ini, placeholder, sumber disebut); tombol “Simpan pengingat” dan “Bagikan”; tautan ke entri Pustaka; Kartu Atribusi; penafian “Pengetahuan tradisional, bukan prakiraan cuaca resmi”.
- Mobile: roda menjadi carousel mangsa + linimasa vertikal.

**P13 — Pustaka Pengetahuan, Beranda dan Pencarian (/pustaka)**

- Struktur: kolom search besar dengan saran; kategori (Motif, Teknik, Istilah, Tokoh, Tradisi, Daerah); filter (daerah, objek pemajuan kebudayaan, tingkat akses); kartu entri (gambar, nama, ringkasan, Lencana Akses, tanda “Disetujui kurator”); entri unggulan. Asisten Tanya Budaya hadir sebagai tombol melayang.

**P14 — Detail Entri Pustaka (/pustaka/\[slug\])**

- Struktur: judul + nama lain; galeri; ringkasan; asal-usul dan daerah (peta kecil); makna/filosofi; teknik dan bahan terkait; penggunaan dan etiket (kapan pantas dipakai); sumber dan rujukan (wajib, bernomor); Kartu Atribusi + status persetujuan (komunitas, tanggal; contoh); kurator peninjau; entri terkait; jalur/produk terkait; “Usulkan koreksi” (form singkat).
- State khusus: konten Terbatas Komunitas → tampil ringkasan + penjelasan bahwa konten lengkap dibagikan terbatas oleh komunitas, dengan tautan ke kebijakan.

**P15 — Asisten Tanya Budaya (/tanya; juga panel di Pustaka dan Ruang Belajar)**

- Struktur: sambutan + contoh pertanyaan; percakapan; jawaban dengan kutipan bernomor yang menaut ke entri Pustaka; penanda “Dijawab dari Pustaka tervalidasi”; tombol 👍/👎 dan “Laporkan jawaban keliru”; penafian ringkas yang selalu terlihat; riwayat percakapan.
- State khusus: di luar korpus → “Belum ada datanya di Pustaka” + tombol “Usulkan topik” dan “Tanya mentor”; jangan pernah menampilkan jawaban tanpa sumber sebagai fakta mutlak.

**P16 — Untuk Institusi (/institusi)**

- Struktur: hero; tab segmen (Sekolah, EO dan Wedding Organizer, Desa Wisata dan Hotel, Korporat) dengan manfaat per segmen; kartu paket (kelas muatan lokal, pelatihan pranatacara untuk tim, workshop 1 hari, hadiah korporat); studi kasus (contoh); proses 4 langkah; form “Minta Penawaran” (nama institusi, tipe, jumlah peserta, jalur diminati, tanggal, anggaran opsional, kontak, catatan) → layar konfirmasi.

**P17 — Jurnal dan Artikel (/jurnal, /jurnal/\[slug\])**

- Daftar: kartu artikel (cover, kategori, penulis, durasi baca), filter kategori. Artikel: cover, byline + kurator peninjau, daftar isi, isi dengan pull-quote dan galeri, Kartu Atribusi, artikel terkait, CTA ke jalur atau produk terkait.

**P18 — Bantuan dan Kontak (/bantuan)**

- Struktur: pencarian bantuan; kategori (Akun, Belajar, Pesanan, Pembayaran, Booking, Menjual); FAQ akordeon; form kontak; WhatsApp dan email; “Cek status pesanan” cepat (nomor pesanan atau resi).

**P19 — Halaman Legal (/legal/…)**

- Halaman: Syarat dan Ketentuan; Kebijakan Privasi (data apa, tujuan, hak pengguna sesuai UU PDP); Kebijakan Hak Budaya dan Bagi Hasil (ringkasan visual + versi lengkap); Kebijakan Pengembalian dan Pembatalan; Pedoman Komunitas.
- Layout: daftar isi di kiri, kotak “Intinya” di atas, tanggal pembaruan dan versi, tautan unduh PDF.

**P20 — Autentikasi (/masuk, /daftar, /lupa-sandi, /verifikasi-otp)**

- Layout: dua panel (kiri ilustrasi + kutipan maestro \[contoh\], kanan form); mobile hanya form.
- Layar: Daftar (nama, email atau WhatsApp, kata sandi dengan indikator kekuatan, persetujuan syarat); Masuk (email/WA + sandi, “Ingat saya”, masuk dengan Google); OTP 6 digit dengan timer kirim ulang; Lupa sandi (3 layar: masukkan email → cek email → sandi baru → sukses).
- State khusus: email sudah terdaftar; akun terkunci sementara setelah percobaan gagal; OTP salah atau kedaluwarsa; sandi terlalu lemah.

**P21 — Onboarding (setelah daftar)**

- 3 langkah dengan progres: (1) minat budaya (kartu pilih multi); (2) tujuan (hobi, jadi perajin, jadi pranatacara, mengajar, institusi) dan waktu belajar per minggu; (3) hasil rekomendasi (3 kartu jalur) + “Lewati untuk sekarang”.

**P22 — Keranjang (/keranjang)**

- Struktur: item dikelompokkan per jenis (Jalur; Kit/Produk per penjual); ubah jumlah dan paket; kode promo; ringkasan (subtotal, estimasi ongkir, total); CTA “Lanjut ke Pembayaran”; “Simpan untuk nanti”; rekomendasi “Lengkapi dengan kit”.
- State khusus: keranjang kosong; peringatan stok berubah; harga berubah.

**P23 — Checkout (/checkout), 3 langkah dengan progres**

- Langkah 1 Data dan alamat (tamu atau login; alamat, kode pos, patokan); Langkah 2 Pengiriman per penjual (opsi Reguler/Ekonomi/Kargo generik, estimasi tiba); Langkah 3 Pembayaran (QRIS, Virtual Account, e-wallet, kartu, transfer — gunakan ikon dan label generik, bukan logo merek). Ringkasan pesanan sticky; centang syarat; tombol “Bayar”; penanda keamanan.
- Interaksi: jika isi keranjang hanya jalur digital, langkah 1–2 dilewati.
- Mobile: ringkasan dapat dilipat di atas.

**P24 — Pembayaran dan Konfirmasi**

- Layar: instruksi bayar (QRIS besar, atau nomor VA + tombol salin; timer kedaluwarsa \[contoh 24 jam\]); menunggu (status otomatis diperbarui); berhasil (ringkasan + “Mulai Belajar” atau “Lacak Pesanan”, pratinjau email konfirmasi); gagal atau kedaluwarsa (coba lagi atau ganti metode).

**P25 — Halaman Sistem**

- 404, 500, sedang pemeliharaan, tidak ada izin (403), sesi berakhir, offline. Ilustrasi anyaman yang putus lalu tersambung; satu CTA kembali yang jelas.


---

This but dark?
