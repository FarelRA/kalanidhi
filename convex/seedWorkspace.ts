import { ConvexError } from "convex/values"

import type { Doc, Id } from "./_generated/dataModel"
import { internalMutation, type MutationCtx } from "./_generated/server"

import { rubricForPath } from "./assessments"
import { teachersSeed as SEED_TEACHERS, worksSeed as WORKS } from "./seedData"
import {
  DAY,
  HOUR,
  SEED_ADMIN_PROFILE,
  SEED_NOW as NOW,
  SEED_START,
  SEED_USERS,
  seedAdmin,
  seedAgo as ago,
  seedAhead as ahead,
  seedEmail,
} from "./seedIdentities"

/** Realistic browser strings keep session and auth panels from reading like fixtures. */
const USER_AGENTS = [
  "Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
  "Mozilla/5.0 (Linux; Android 13; Redmi Note 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
]

type SeedLesson = {
  title: string
  kind: "text" | "video" | "audio" | "file" | "practice"
  body: string
  estimatedMinutes: number
  accessLevel: "public" | "enrolled" | "certified"
  /** Bare filename resolved from `mediaAssets`; omit when no asset exists. */
  mediaFile?: string
}

type SeedModule = {
  title: string
  summary: string
  estimatedMinutes: number
  lessons: SeedLesson[]
}

/**
 * Curriculum copy is written from two real sources: the Paguyuban Batik Tulis
 * Giriloyo deck and the aksara Jawa worksheet. Steps the sources do not name
 * are not invented, and anything the platform authored says so in the lesson.
 */
const MODULES: Record<string, SeedModule[]> = {
  "batik-tulis-soga": [
    {
      title: "Batik tulis dan Kampung Giriloyo",
      summary:
        "Apa itu batik tulis, dari mana Giriloyo mendapat ilmunya, dan siapa yang mengajar.",
      estimatedMinutes: 55,
      lessons: [
        {
          title: "Apa itu batik tulis",
          kind: "text",
          body: "Batik tulis adalah metode tradisional membuat kain bercorak dengan memanfaatkan lilin panas sebagai perintang warna. Bagian kain yang dilapisi lilin tetap putih karena tidak kemasukan pewarna, sedangkan warna muncul di bagian yang tidak dilapisi. Batik cap dan batik printing juga menghasilkan kain bercorak, hanya saja coraknya dipindahkan dengan alat lain; kelas ini fokus pada canting dan tangan. Tugas: kuis 5 soal. Kriteria: 5 dari 5 jawaban benar.",
          estimatedMinutes: 12,
          accessLevel: "public",
        },
        {
          title: "Giriloyo: 1634 sampai sekarang",
          kind: "text",
          body: "Menurut Paguyuban Batik Tulis Giriloyo, ilmunya sampai ke kampung ini sejak 1634, saat Kerajaan Mataram membangun makam raja di Imogiri dan mengajarkan batik kepada warga Giriloyo. Gempa Bantul 2006 memicu pendataan ulang: lebih dari 1.200 perajin tercatat ketika kampung menyusun kembali usahanya. Setahun kemudian Giriloyo memecahkan Rekor Muri untuk selendang batik tulis terpanjang, lalu antara 2008 dan 2019 kampung itu tumbuh sebagai pusat edu-wisata. Tugas: kuis 6 soal urutan tahun. Kriteria: 5 dari 6 benar.",
          estimatedMinutes: 18,
          accessLevel: "public",
        },
        {
          title: "Paguyuban, koperasi, dan cara kelas berjalan",
          kind: "text",
          body: "Menurut materi Paguyuban Batik Tulis Giriloyo, kampung ini bekerja bersama Desa Wukirsari, Paguyuban Batik Tulis Giriloyo, dan Koperasi Jasa Kampung Batik Giriloyo yang menaungi 15 kelompok perajin. Kelompok kerja Belajar Batik memandu kunjungan dengan rasio empat peserta untuk satu perajin, dan pola itulah yang dipakai sebagai acuan jalur ini. Rasio itu penting karena setiap orang perlu diperiksa satu per satu saat memegang canting, bukan hanya dinilai di akhir. Ini short course dengan tugas yang dinilai, bukan magang penuh sampai menjadi perajin mandiri. Tugas: tulis satu paragraf tentang siapa yang menilai karyamu dan mengapa rasio 4:1 dipakai. Kriteria: menyebut perajin penilai dan alasannya.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
        },
        {
          title: "Mengenali hasil batik tulis",
          kind: "text",
          body: "Periksa kain di bawah cahaya terang dan lihat dari dua sisi. Batik tulis yang rapi memperlihatkan garis lilin yang menembus ke belakang, warna yang tidak menembus bagian ber-lilin, retak lilin halus yang wajar, dan tidak menyisakan lilin yang gagal hilang. Sebutkan enam contoh kain yang pernah kamu lihat, lalu tulis alasan untuk setiap tanda. Foto dan contoh pada materi ini berasal dari dokumen Materi Batik Giriloyo milik Paguyuban Batik Tulis Giriloyo yang dipegang pengelola platform; izin publikasi tercatat untuk pengelola platform. Tugas: sebutkan 6 contoh dan alasannya. Kriteria: 5 dari 6 tanda tepat.",
          estimatedMinutes: 10,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Bahan, alat, dan keselamatan kerja",
      summary:
        "Kain mori, lilin, pewarna, wajan-kompor, canting, gawangan, dan cara tidak terbakar.",
      estimatedMinutes: 80,
      lessons: [
        {
          title: "Kain mori: katun dan sutera",
          kind: "text",
          body: "Mori adalah kain putih yang belum diproses, dan jenisnya menentukan hasil akhir. Katun lebih mudah menyerap lilin dan pewarna, sementara sutera lebih halus, lebih mahal, dan lebih sulit diulang. Untuk latihan pertama, pakai sapu tangan katun supaya biaya kesalahan tetap rendah. Catat jenis, ukuran, dan gramasi kain sebelum mulai. Tugas: catat jenis, ukuran, dan gramasi. Kriteria: catatan lengkap.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
        },
        {
          title: "Lilin batik dan pewarna",
          kind: "text",
          body: "Lilin batik menempel saat panas dan mengeras saat dingin, lalu dilepas di nglorod. Pewarna sintetis memberi warna seragam dan cepat, sedangkan pewarna alami butuh waktu lebih lama dan hasilnya tidak selalu sama antar-pencelupan. Catat jenis lilin dan pewarna yang kamu pakai supaya hasil bisa dibandingkan. Tugas: kuis 6 soal. Kriteria: 5 dari 6 benar.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
        },
        {
          title: "Wajan, kompor, dan suhu lilin",
          kind: "text",
          body: "Uji suhu lilin dengan meneteskan sedikit ke kain perca, bukan menebak dari asap wajan. Kalau tetesan menembus dan bagian belakang terasa basah, lilin terlalu panas; kalau menggumpal di permukaan, terlalu dingin. Angka suhu yang nyaman berbeda antar-wajan dan antar-ruang, dan materi sumber tidak memberi angka, jadi catat angka versimu sendiri. Tugas: uji tiga tingkat suhu dan foto hasilnya. Kriteria: tiga tingkat terbaca.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
        },
        {
          title: "Canting dan gawangan",
          kind: "text",
          body: "Canting punya tiga bagian yang perlu kamu kenal: nyamplung sebagai wadah lilin, cucuk sebagai corong, dan pegangan. Istilah itu dipakai di banyak sentra, tetapi sebutan tiap perajin bisa berbeda, jadi konfirmasikan ke pengajarmu. Gawangan membuat kain tegang dan menjaga kain tetap di atas lantai supaya lilin tidak tertarik. Tugas: rekam 30 detik saat menyebut tiga bagian canting. Kriteria: tiga bagian benar beserta alasannya.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
        },
        {
          title: "Menata tempat kerja dan keselamatan",
          kind: "text",
          body: "Jangan tinggalkan wajan berisi lilin panas tanpa pengawasan, dan jauhkan kain perca dari kompor. Jangan meniup atau menyentuh ujung canting yang panas; pakai ventilasi yang cukup karena uap lilin bisa mengiritasi. Untuk luka bakar ringan, alirkan air dingin dan hentikan latihan bila luka terasa perih atau melepuh. Bagian keselamatan ini disusun tim platform, bukan diambil dari materi Paguyuban. Tugas: foto tempat kerja dan checklist 10 butir. Kriteria: 10 dari 10 butir terpenuhi.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Mola: merancang motif di atas kain",
      summary:
        "Desain pensil, motif larangan Keraton, dan cara mengulang motif.",
      estimatedMinutes: 80,
      lessons: [
        {
          title: "Mola: desain dengan pensil",
          kind: "text",
          body: "Mola adalah membuat desain dengan pensil langsung di atas kain sebelum lilin diteteskan. Garis pensil akan tertutup lilin dan tidak ikut terwarnai, jadi garis tipis lebih aman daripada garis tebal yang menekan serat. Mulai dari satu ulangan motif yang utuh, bukan dari seluruh bidang kain. Foto pada pelajaran ini berasal dari dokumen Materi Batik Giriloyo milik Paguyuban Batik Tulis Giriloyo yang dipegang pengelola platform; izin publikasi tercatat untuk pengelola platform. Tugas: salin satu ulangan motif. Kriteria: proporsi mirip dan garis tipis.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
          mediaFile: "lesson-mola.jpg",
        },
        {
          title: "Motif larangan Keraton Yogyakarta",
          kind: "text",
          body: "Motif larangan adalah delapan motif Keraton Yogyakarta yang disebut materi sumber: Huk, Kawung Alit Gurdha, Parang Klithik, Parang Barong, Parang Gendreh, Parang Rusak Barong, Semen Ageng Sawat Gurdha, dan Rujak Senthe. Sumber hanya menyebut nama dan statusnya; aturan pemakaiannya tidak dijelaskan di sana, jadi kelas ini juga tidak mengajarkannya. Kamu cukup mengenali nama dan bentuknya sebagai kosakata. Sumber gambar: Materi Batik Giriloyo, Paguyuban Batik Tulis Giriloyo; dokumen dipegang pengelola platform dan izin publikasi tercatat untuk pengelola platform. Tugas: cocokkan 8 nama dengan gambarnya. Kriteria: 7 dari 8 benar.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
          mediaFile: "motif-larangan-yogyakarta-1.jpg",
        },
        {
          title: "Bidang, raport, dan pengulangan",
          kind: "text",
          body: "Tentukan bidang kerja dan ukuran satu ulangan sebelum menggambar, karena titik ulang harus jatuh di tempat yang sama setiap kali motif diulang. Buat garis bantu pensil dengan tekanan ringan, lalu hapus sebelum nglowongi supaya tidak ada bekas kotor di bawah lilin. Tiga kotak raport berukuran sama membuat motif lebih mudah disambung. Tugas: buat tiga kotak raport 10 x 10 cm. Kriteria: ukuran sama dan garis jelas.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Latihan mola",
          kind: "practice",
          body: "Pilih satu motif utuh, parang sederhana atau kawung, pada kain 25 x 25 cm. Gambar satu ulangan yang bersambung ke tepi kain, lalu periksa proporsinya dari jarak satu langkah. Tugas: unggah foto keseluruhan dan satu foto detail. Kriteria: motif terbaca, ulangan bersambung, dan tidak ada bekas hapus yang kotor.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Nglowongi dan nerusi: dua tahap lilin",
      summary:
        "Melilin tahap pertama dan kedua, inti keterampilan batik tulis.",
      estimatedMinutes: 105,
      lessons: [
        {
          title: "Nglowongi: pelilitan lilin tahap pertama",
          kind: "text",
          body: "Nglowongi adalah pelilitan lilin tahap pertama: ikuti garis pensil dengan canting dan pastikan lilin menembus sisi belakang kain. Kalau sisi belakang belum basah, pewarna akan menembus dan bagian putihmu hilang. Kerjakan garis lurus lebih dulu, lalu satu lengkung, sebelum masuk ke motif penuh. Tugas: melilin garis lurus 20 cm dan satu lengkung, foto dua sisi. Kriteria: garis tidak putus dan lilin tembus.",
          estimatedMinutes: 25,
          accessLevel: "enrolled",
        },
        {
          title: "Nerusi: pelilitan lilin tahap kedua",
          kind: "text",
          body: "Nerusi adalah pelilitan lilin tahap kedua: menebalkan atau menutup bagian yang sudah dililin agar benar-benar rapat. Istilah ini bisa berbeda antar-perajin, jadi tanyakan sebutan yang dipakai di kelasmu. Tumpuk lilin tipis berulang, jangan sekali tebal, supaya garis tidak melebar. Tugas: tebalkan 5 cm garis yang sudah dililin. Kriteria: tidak ada bagian tipis dan garis tidak melebar.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Memegang canting dan berhenti dengan bersih",
          kind: "practice",
          body: "Pegang canting seperti pensil dengan sudut sekitar 45 derajat, lalu atur aliran lilin dengan meniup cucuk saat mulai dan berhenti. Akhiri setiap garis dengan mengangkat canting perlahan supaya tidak ada ekor lilin. Latihan pendek yang diulang lebih berguna daripada satu garis panjang yang tergesa. Tugas: unggah enam baris latihan di kain perca. Kriteria: enam bentuk bersih tanpa cabang tak sengaja.",
          estimatedMinutes: 25,
          accessLevel: "enrolled",
        },
        {
          title: "Latihan nglowongi + nerusi pada satu motif",
          kind: "practice",
          body: "Kerjakan satu motif utuh dari mola sampai dua tahap lilin. Periksa dari sisi belakang: semua garis mola harus terliput lilin dan tembus dua sisi. Tugas: unggah kain setelah nglowongi dan nerusi. Kriteria: semua garis terliput dan lilin tembus dua sisi.",
          estimatedMinutes: 35,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Ngisen-isen: mengisi dan memperkaya motif",
      summary: "Mengisi bidang kosong dengan titik dan garis rapat.",
      estimatedMinutes: 70,
      lessons: [
        {
          title: "Ngisen-isen: melengkapi motif",
          kind: "text",
          body: "Ngisen-isen adalah mengisi bidang kosong supaya motif lebih kaya, bukan menambah motif baru di atasnya. Isian biasanya berupa titik dan garis rapat yang menentukan kepadatan kain saat dilihat dari jauh. Tahan diri untuk tidak memenuhi seluruh bidang. Tugas: sebutkan tiga jenis isian yang kamu pakai. Kriteria: titik atau deret titik dan garis rapat, dengan contoh bidangnya.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Isian: titik, cecek, dan garis rapat",
          kind: "practice",
          body: "Jarak titik harus tetap: buat deret 5 cm dengan jarak yang sama, lalu bandingkan dengan deret berikutnya. Garis pendek rapat dipakai untuk mengisi bidang sempit, dan gabungan keduanya membuat isian terasa hidup. Nama isian berbeda antar-daerah, jadi catat istilah yang dipakai pengajarmu. Tugas: unggah lembar latihan tiga baris. Kriteria: jarak konsisten lebih kurang 1 mm.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Latihan ngisen-isen pada kain kerja",
          kind: "practice",
          body: "Isi bidang kosong pada kain kerja tanpa menimpa garis utama. Kerjakan per bidang, bukan per titik, supaya kepadatan merata. Tugas: unggah foto kain. Kriteria: sedikitnya 80 persen bidang terisi dengan kepadatan merata.",
          estimatedMinutes: 30,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Mbabar, nglorod, mepe: dari warna ke kain jadi",
      summary: "Mewarnai, melepas lilin, mencuci, menjemur, memeriksa.",
      estimatedMinutes: 100,
      lessons: [
        {
          title: "Mbabar: mencelup kain pada bahan pewarna",
          kind: "text",
          body: "Mbabar adalah mencelup kain pada bahan pewarna setelah lilin selesai. Bagian yang ber-lilin tetap putih, jadi rendam kain penuh supaya warna rata sampai ke serat. Aduk perlahan dan jangan menggosok kain saat basah. Sumber foto: Materi Batik Giriloyo, Paguyuban Batik Tulis Giriloyo; dokumen dipegang pengelola platform dan izin publikasi tercatat untuk pengelola platform. Tugas: celup kain latihan satu warna, foto sebelum dan sesudah. Kriteria: warna rata dan lilin tidak rusak.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
          mediaFile: "lesson-mbabar.jpg",
        },
        {
          title: "Colet atau celup",
          kind: "text",
          body: "Colet memakai kuas atau spons: warnanya bisa terperinci, tetapi sulit merata. Celup merendam seluruh kain: hasilnya merata, cepat, dan cocok untuk banyak kain sekaligus. Pilih satu teknik untuk kain latihanmu dan tulis alasannya dalam dua kalimat. Tugas: pilih teknik dan tulis alasan. Kriteria: pilihan masuk akal untuk motif yang dipakai.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Nglorod: menghilangkan lilin dengan air panas",
          kind: "text",
          body: "Nglorod adalah menghilangkan lilin dengan air panas: didihkan air, masukkan kain, aduk terus, lalu angkat lilin yang mengapung. Pakai sarung tangan, wadah yang stabil, dan ventilasi yang baik. Di sentra, proses ini memakai drum besar, bukan dapur rumah. Tugas: foto proses dan catat suhu serta waktu. Kriteria: lilin lepas sedikitnya 90 persen dan prosedur keselamatan terlihat.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Mepe: mencuci sisa lilin dan menjemur",
          kind: "text",
          body: "Mepe adalah mencuci sisa lilin lalu menjemur kain sampai kering. Bilas sampai air bilasan jernih, lalu jemur di tempat teduh supaya warna tidak berubah karena matahari langsung. Sumber foto: Materi Batik Giriloyo, Paguyuban Batik Tulis Giriloyo; dokumen dipegang pengelola platform dan izin publikasi tercatat untuk pengelola platform. Tugas: foto kain basah dan kering. Kriteria: tanpa bercak dan kering rata.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
          mediaFile: "lesson-mepe.jpg",
        },
        {
          title: "Memeriksa hasil",
          kind: "practice",
          body: "Periksa enam butir: garis tidak putus, warna tidak menembus bagian putih, retak lilin wajar, sisa lilin hilang, motif bersambung, dan tepi rapi. Nilai kainmu sendiri sebelum pengajar menilai, lalu bandingkan selisihnya. Tugas: unggah kain jadi dan penilaian diri. Kriteria: 5 dari 6 butir dan selisih nilai diri tidak lebih dari satu tingkat.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
      ],
    },
  ],
  "pranatacara-jawa": [
    {
      title: "Napas dan tata wicara",
      summary: "Mengatur napas, volume, dan kejelasan kalimat.",
      estimatedMinutes: 90,
      lessons: [
        {
          title: "Latihan napas dan jeda",
          kind: "practice",
          body: "Tarik napas dari diafragma, bukan dari dada, lalu hitung empat ketukan sebelum mulai berbicara. Jeda setelah kalimat pembuka membuat suaramu tidak terburu-buru di acara panjang. Rekam dua menit latihan dan tandai bagian yang napasnya terpotong. Tugas: rekam latihan napas dua menit. Kriteria: jeda terdengar dan kalimat tidak terpotong.",
          estimatedMinutes: 30,
          accessLevel: "public",
        },
        {
          title: "Volume dan artikulasi",
          kind: "text",
          body: "Rekam suaramu di ruang terbuka, lalu dengarkan ulang dari jarak tiga meter. Kejelasan konsonan akhir biasanya hilang lebih dulu daripada volume. Latih kalimat pembuka dengan tempo lambat sebelum menambah kecepatan. Tugas: unggah rekaman satu menit. Kriteria: konsonan akhir terdengar jelas.",
          estimatedMinutes: 30,
          accessLevel: "enrolled",
        },
        {
          title: "Bahasa Jawa halus untuk acara",
          kind: "text",
          body: "Tingkat bahasa menentukan sapaan kepada tamu, keluarga, dan sesepuh. Pakai krama inggil untuk menyebut orang yang dihormati, dan jangan mencampur tingkat bahasa dalam satu paragraf. Tanyakan kebiasaan keluarga, karena tiap keluarga punya batas sopan sendiri. Tugas: tulis tiga sapaan untuk tiga tamu berbeda. Kriteria: tingkat bahasa tepat.",
          estimatedMinutes: 25,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Struktur acara Jawa",
      summary: "Urutan siraman, midodareni, dan resepsi.",
      estimatedMinutes: 100,
      lessons: [
        {
          title: "Urutan siraman",
          kind: "text",
          body: "Susun urutan prosesi, pembaca doa, dan pembagian tugas keluarga dalam satu lembar. Tandai siapa yang menyerahkan air dan siapa yang menerima, supaya tidak ada bagian yang diulang. Konfirmasi urutan ke keluarga sebelum gladi resik. Tugas: tulis urutan siraman. Kriteria: urutan lengkap dan tidak tumpang tindih.",
          estimatedMinutes: 30,
          accessLevel: "enrolled",
        },
        {
          title: "Midodareni dan resepsi",
          kind: "text",
          body: "Midodareni berlangsung malam dengan suasana tenang, sedangkan resepsi berjalan siang dengan tamu lebih banyak. Bedakan tempo bicara dan jumlah informasi yang perlu disampaikan di keduanya. Tugas: bandingkan dua susunan acara. Kriteria: perbedaan suasana dan urutan dijelaskan.",
          estimatedMinutes: 30,
          accessLevel: "enrolled",
        },
        {
          title: "Menyusun rundown",
          kind: "practice",
          body: "Buat rundown 60 menit dengan penanda waktu dan ruang untuk keterlambatan. Beri jeda lima menit di antara bagian yang melibatkan banyak pihak. Tugas: unggah rundown. Kriteria: penanda waktu jelas dan antisipasi keterlambatan ada.",
          estimatedMinutes: 30,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Etiket panggung",
      summary: "Penampilan, kontak mata, dan kerja sama dengan tim.",
      estimatedMinutes: 70,
      lessons: [
        {
          title: "Penampilan dan busana",
          kind: "text",
          body: "Pilih busana yang sopan, nyaman, dan sesuai konteks acara, lalu uji bergerak dan duduk di dalamnya. Warna busana sebaiknya tidak bertabrakan dengan pakaian keluarga inti. Tugas: foto busana dan tulis alasannya. Kriteria: sesuai konteks acara.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Koordinasi dengan tim acara",
          kind: "practice",
          body: "Sepakati isyarat dengan pengarah acara, penata suara, dan keluarga sebelum acara dimulai. Isyarat tangan lebih aman daripada memanggil nama di tengah prosesi. Tugas: rekam simulasi isyarat. Kriteria: tiga isyarat disepakati dan dipakai.",
          estimatedMinutes: 30,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Siraman dan midodareni",
      summary: "Praktik langsung dengan skenario acara.",
      estimatedMinutes: 120,
      lessons: [
        {
          title: "Skenario siraman",
          kind: "practice",
          body: "Jalankan skenario lengkap dari pembukaan sampai penutup tanpa berhenti. Catat bagian yang membuatmu mencari kata, lalu ulangi bagian itu saja. Tugas: unggah rekaman skenario siraman. Kriteria: urutan lengkap dan penutup jelas.",
          estimatedMinutes: 45,
          accessLevel: "enrolled",
        },
        {
          title: "Skenario midodareni",
          kind: "practice",
          body: "Latih transisi dari suasana tenang ke sapaan kepada keluarga kedua pihak. Perhatikan jeda saat menyebut nama dan gelar. Tugas: unggah rekaman 10 menit. Kriteria: transisi mulus dan sapaan tepat.",
          estimatedMinutes: 45,
          accessLevel: "enrolled",
        },
        {
          title: "Membaca catatan koreksi",
          kind: "text",
          body: "Baca catatan koreksi pengajar dan catat tiga perbaikan yang bisa dikerjakan minggu ini. Pilih satu perbaikan untuk dilatih ulang sebelum sesi berikutnya. Tugas: tulis tiga catatan perbaikan. Kriteria: tiga catatan spesifik.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Latihan dengan pengajar",
      summary: "Sesi live dan rekaman praktik.",
      estimatedMinutes: 90,
      lessons: [
        {
          title: "Persiapan sesi live pertama",
          kind: "text",
          body: "Sebelum sesi live, siapkan air dan naskah ringkas di luar jangkauan kamera. Saat sesi, tampil lima menit dan terima catatan pengajar secara langsung. Tugas: hadir dan tampil. Kriteria: tampil lima menit penuh.",
          estimatedMinutes: 45,
          accessLevel: "enrolled",
        },
        {
          title: "Rekaman praktik mandiri",
          kind: "practice",
          body: "Rekam praktik sepuluh menit, lalu tandai bagian yang ingin diperbaiki sebelum mengunggah. Jangan mengedit rekaman; pengajar perlu melihat kesalahan aslinya. Tugas: unggah rekaman dan tiga tanda waktu. Kriteria: rekaman utuh dan tanda waktu jelas.",
          estimatedMinutes: 30,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Menyusun portofolio jasa",
      summary: "Menampilkan pengalaman dan paket layanan.",
      estimatedMinutes: 60,
      lessons: [
        {
          title: "Menulis profil praktisi",
          kind: "text",
          body: "Tulis pengalaman, wilayah layanan, dan jenis acara yang kamu tangani. Sebut yang sudah pernah dikerjakan, bukan yang belum. Tugas: unggah profil 150 kata. Kriteria: wilayah dan pengalaman jelas.",
          estimatedMinutes: 25,
          accessLevel: "enrolled",
        },
        {
          title: "Menyiapkan paket layanan",
          kind: "text",
          body: "Susun paket, harga, dan cakupan layanan yang jelas, termasuk apa yang tidak termasuk di dalamnya. Harga tanpa cakupan membuat tamu menebak. Tugas: unggah satu paket layanan. Kriteria: cakupan dan batasan tertulis.",
          estimatedMinutes: 25,
          accessLevel: "certified",
        },
      ],
    },
  ],
  "kriya-gerabah-bantul": [
    {
      title: "Tanah liat Kasongan",
      summary: "Asal tanah, campuran, dan cara menyiapkan tanah kerja.",
      estimatedMinutes: 60,
      lessons: [
        {
          title: "Tanah liat dan campurannya",
          kind: "text",
          body: "Tanah liat Kasongan dicampur pasir halus supaya tidak mudah retak saat dibakar. Kadar air menentukan apakah tanah bisa dibentuk tanpa lengket di tangan. Uji dengan menggulung tanah menjadi pilin kecil: kalau mudah patah, campuran terlalu kering. Tugas: catat asal tanah dan perbandingan campuran. Kriteria: catatan lengkap.",
          estimatedMinutes: 20,
          accessLevel: "public",
        },
        {
          title: "Menguli tanah sampai homogen",
          kind: "text",
          body: "Menguli membuang gelembung udara yang bisa membuat gerabah pecah di tungku. Kerjakan di permukaan yang lembap, lipat, tekan, dan ulangi sampai tanah terasa rata. Tugas: foto sebelum dan sesudah pengulian. Kriteria: permukaan tanah rata.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Menyimpan tanah kerja",
          kind: "text",
          body: "Bungkus tanah sisa dengan kain lembap dan simpan di wadah tertutup. Tanah yang mengering di udara perlu dibasahi ulang perlahan, bukan disiram. Tugas: catat cara penyimpanan. Kriteria: tanah tetap siap pakai.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Membentuk gerabah",
      summary: "Pilin, lempeng, dan memusatkan tanah di roda putar.",
      estimatedMinutes: 90,
      lessons: [
        {
          title: "Membentuk pilin dan lempeng",
          kind: "text",
          body: "Pilin dan lempeng adalah dua bentuk dasar sebelum masuk ke roda putar. Sambungan pilin ditekan miring supaya tidak berongga, dan lempeng dibentuk di atas alas kain. Tugas: buat satu lempeng dan satu pilin. Kriteria: sambungan rapat.",
          estimatedMinutes: 30,
          accessLevel: "public",
        },
        {
          title: "Roda putar: memusatkan tanah",
          kind: "text",
          body: "Memusatkan tanah adalah bagian tersulit: tanah harus tepat di tengah roda sebelum dibuka. Tekan dengan kedua tangan dan jaga siku menempel di lutut supaya gerakmu stabil. Tugas: rekam dua menit memusatkan tanah. Kriteria: tanah tidak goyang.",
          estimatedMinutes: 30,
          accessLevel: "enrolled",
        },
        {
          title: "Menaikkan dinding dan menyelesaikan bibir",
          kind: "practice",
          body: "Naikkan dinding dua kali, bukan sekali tebal, lalu rapikan bibir dengan jari basah. Tugas: unggah satu mangkuk setengah jadi. Kriteria: dinding rata dan bibir tidak sobek.",
          estimatedMinutes: 30,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Mengeringkan dan membakar",
      summary: "Pengeringan bertahap, penyusunan tungku, dan pemeriksaan hasil.",
      estimatedMinutes: 60,
      lessons: [
        {
          title: "Pengeringan bertahap",
          kind: "text",
          body: "Gerabah dikeringkan di tempat teduh dengan kelembapan yang stabil, bukan di bawah matahari langsung. Bagian bawah biasanya masih dingin saat permukaan terlihat kering, jadi tunggu satu hari lagi. Tugas: catat lama pengeringan. Kriteria: catatan harian.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Menyusun tungku dan membakar",
          kind: "text",
          body: "Susun gerabah di tungku dengan jarak yang cukup agar panas merata. Pembakaran bertahap mengurangi risiko pecah mendadak. Tugas: tulis urutan pembakaran. Kriteria: urutan jelas.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Memeriksa hasil bakar",
          kind: "text",
          body: "Periksa bunyi, retak, dan warna setelah tungku dingin. Retak rambut sering baru terlihat setelah gerabah dibersihkan. Tugas: foto tiga hasil. Kriteria: tiga hasil terbaca.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
      ],
    },
  ],
  "aksara-jawa": [
    {
      title: "Hanacaraka: dua puluh aksara dasar",
      summary:
        "Mengenal 20 aksara dasar, urutannya, dan vokal /a/ yang menempel pada setiap aksara.",
      estimatedMinutes: 70,
      lessons: [
        {
          title: "Apa itu aksara Jawa",
          kind: "text",
          body: "Aksara Jawa bukan abjad, melainkan aksara suku kata: setiap aksara mewakili satu suku kata terbuka. Dua puluh aksara dasar disusun dalam empat baris, ha-na-ca-ra-ka, da-ta-sa-wa-la, pa-dha-ja-ya-nya, ma-ga-ba-tha-nga. Urutan itu dihafal sebagai hanacaraka, dan kelas ini memakai urutan yang sama. Tugas: kuis mandiri 8 soal tentang aksara dan bunyinya. Kriteria: 8 dari 8 benar.",
          estimatedMinutes: 15,
          accessLevel: "public",
        },
        {
          title: "Membaca baris pertama: ha na ca ra ka",
          kind: "text",
          body: "Lima aksara pertama adalah ꦲ ꦤ ꦕ ꦫ ꦏ, dibaca ha, na, ca, ra, ka. Latih dengan kata yang sudah dikenal: ꦏꦿꦠꦺꦴꦤ꧀ dibaca kraton dan ꦫꦩ dibaca rama. Perhatikan aksara yang mirip, yaitu na dan nya, da dan dha, ta dan tha; bedanya ada pada bentuk, bukan pada bunyi vokal. Tugas: rekam baca lima aksara selama 30 detik. Kriteria: 5 dari 5 bunyi benar.",
          estimatedMinutes: 15,
          accessLevel: "public",
        },
        {
          title: "Membaca baris kedua sampai keempat",
          kind: "text",
          body: "Lima belas aksara sisanya dilatih dengan kata utuh: ꦱꦥꦶ sapi, ꦧꦸꦏꦸ buku, ꦭꦺꦭꦺ lélé, ꦏꦼꦫꦶꦱ꧀ keris, ꦭꦺꦴꦩ꧀ꦧ lomba, ꦱꦧꦂ sabar, ꦧꦸꦔꦃ bungah, ꦭꦪꦁ layang. Baca keras sambil menunjuk aksara satu per satu, lalu ulangi tanpa menunjuk. Tugas: kuis 20 soal dua arah, aksara ke bunyi dan bunyi ke aksara. Kriteria: sedikitnya 16 dari 20 benar.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
        },
        {
          title: "Vokal /a/ yang menempel",
          kind: "text",
          body: "Setiap aksara dasar berbunyi dengan vokal /a/, jadi ꦱ dibaca sa, bukan s. Konsekuensinya, kata sapi ditulis ꦱꦥꦶ tanpa tambahan apa pun. Menulis lima kata berakhiran /a/ menguji apakah kamu sudah membuang kebiasaan menambah huruf Latin. Tugas: tulis lima kata berakhiran /a/ tanpa sandhangan. Kriteria: 5 dari 5 benar.",
          estimatedMinutes: 10,
          accessLevel: "enrolled",
        },
        {
          title: "Latihan hanacaraka",
          kind: "practice",
          body: "Salin dua puluh aksara di kotak bergaris, lalu baca ulang dari kiri ke kanan tanpa melihat contoh. Periksa bentuk yang paling sering tertukar, biasanya na dan nya serta da dan dha. Tugas: unggah foto salinan dan rekaman bacaan. Kriteria: 20 aksara terbaca dengan paling banyak 2 bentuk keliru.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Sandhangan: mengubah vokal, menutup suku kata",
      summary:
        "Lima sandhangan vokal, tiga panyigeg, pangkon, dan aksara khusus.",
      estimatedMinutes: 100,
      lessons: [
        {
          title: "Lima sandhangan vokal",
          kind: "text",
          body: "Lima sandhangan vokal mengubah bunyi /a/ pada aksara: wulu ꦶ untuk i, suku ꦸ untuk u, taling ꦺ untuk é, pepet ꦼ untuk ê, dan taling tarung ꦺꦴ untuk o. Taling ditulis sebelum aksara, sedangkan tarung ditulis sesudahnya, jadi taling tarung mengapit aksara. Tugas: kuis 10 soal. Kriteria: sedikitnya 8 dari 10 benar.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Panyigeg: layar, wignyan, cecak",
          kind: "text",
          body: "Tiga panyigeg menutup suku kata dengan konsonan: layar ꦂ untuk /r/ seperti ꦱꦧꦂ sabar, wignyan ꦃ untuk /h/ seperti ꦧꦸꦔꦃ bungah, dan cecak ꦁ untuk /ng/ seperti ꦭꦪꦁ layang. Ketiganya ditulis setelah aksara yang ditutup, bukan sebelumnya. Tugas: tulis sembilan kata berakhiran -r, -h, dan -ng. Kriteria: 9 dari 9 benar.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
        },
        {
          title: "Pangkon: mematikan vokal",
          kind: "text",
          body: "Pangkon ꧀ menghapus vokal /a/ pada aksara, seperti pada ꦱꦪꦸꦏ꧀ sayuk. Jangan memakai pangkon untuk bunyi /ng/, karena bunyi itu selalu ditulis dengan cecak. Tugas: perbaiki lima kata yang salah memakai pangkon. Kriteria: 5 dari 5 benar.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
        },
        {
          title: "Cakra, keret, dan panjing",
          kind: "text",
          body: "Selain sandhangan vokal, ada aksara khusus yang mengubah bunyi dasar. Pengkal ꦾ dipakai untuk /ya/ seperti ꦧꦒꦾ bagya, cakra ꦿ untuk /ra/ seperti ꦏꦿꦠꦺꦴꦤ꧀ kraton, dan keret ꦽ untuk /re/ seperti ꦏꦽꦠꦼꦒ꧀ kreteg. Panjing la dan panjing wa menempel pada aksara sebelumnya, seperti ꦏ꧀ꦭꦥ klapa dan ꦏ꧀ꦮꦕꦶ kwaci. Pa cerek ꦉ dipakai untuk /re/ seperti ꦉꦒꦼꦠ꧀ reget, dan nga lelet ꦊ untuk /le/ seperti ꦊꦔ lenga. Tugas: baca tujuh contoh dan tulis ulang. Kriteria: 7 dari 7 benar.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
        },
        {
          title: "Latihan sandhangan",
          kind: "practice",
          body: "Dua belas kata latihan: sapi, buku, lélé, keris, lomba, sabar, bungah, layang, klapa, kwaci, reget, lenga. Tulis semuanya tanpa melihat tabel, lalu periksa satu per satu. Tugas: unggah foto dua belas kata dan satu rekaman bacaan. Kriteria: sedikitnya 10 dari 12 benar dan taling tidak tertukar dengan tarung.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Membaca ulang taling dan pepet",
          kind: "text",
          body: "Dua sandhangan yang paling sering tertukar adalah taling é dan pepet ê. Baca ulang kata yang sudah dipelajari, tandai mana yang memakai taling dan mana yang memakai pepet, lalu cocokkan dengan tabel sandhangan. Tugas: rekam enam kata. Kriteria: 6 dari 6 benar.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Pasangan: konsonan mati di tengah kata",
      summary:
        "Dua puluh pasangan, tiga pengecualian, dan contoh bertahap sayuk rukun.",
      estimatedMinutes: 85,
      lessons: [
        {
          title: "Kenapa pasangan ada",
          kind: "text",
          body: "Konsonan mati di tengah kata ditulis dengan pasangan yang menempel di bawah aksara sebelumnya. Pasangan ha, sa, dan pa menjadi pengecualian karena bentuknya ditulis sejajar, tidak di bawah. Tugas: kuis 6 soal tentang pangkon dan pasangan. Kriteria: 6 dari 6 benar.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
        },
        {
          title: "Dua puluh pasangan",
          kind: "text",
          body: "Tabel 4 x 5 berisi pasangan untuk setiap aksara dasar: ꦲ꧀ꦲ ha, ꦤ꧀ꦤ na, ꦕ꧀ꦕ ca, ꦫ꧀ꦫ ra, ꦏ꧀ꦏ ka, ꦢ꧀ꦢ da, ꦠ꧀ꦠ ta, ꦱ꧀ꦱ sa, ꦮ꧀ꦮ wa, ꦭ꧀ꦭ la, ꦥ꧀ꦥ pa, ꦣ꧀ꦝ dha, ꦗ꧀ꦗ ja, ꦪ꧀ꦪ ya, ꦚ꧀ꦚ nya, ꦩ꧀ꦩ ma, ꦒ꧀ꦒ ga, ꦧ꧀ꦧ ba, ꦛ꧀ꦛ tha, dan ꦔ꧀ꦔ nga. Materi sumber menulis pasangan ra dengan bentuk berbasis ha; tabel ini memakai ꦫ꧀ꦫ. Tugas: salin dua puluh pasangan. Kriteria: 18 dari 20 benar dan posisi pasangan di bawah aksara.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Sayuk rukun langkah demi langkah",
          kind: "text",
          body: "Mulai dari ꦱꦪꦸꦏ, lalu tambahkan pasangan untuk konsonan mati: ꦱꦪꦸꦏ꧀ꦫꦸꦏꦸꦤ. Langkah terakhir menutup kata kedua dengan pangkon sehingga menjadi ꦱꦪꦸꦏ꧀ꦫꦸꦏꦸꦤ꧀. Kerjakan tiga tahap itu berurutan, jangan langsung ke bentuk akhir. Tugas: tulis tiga tahap sayuk rukun. Kriteria: tiga tahap benar dan urut.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Latihan pasangan",
          kind: "practice",
          body: "Tulis sepuluh kata dua suku kata yang punya konsonan mati di tengah, seperti tumbas, godhong, rantas, sambung, tandur, dan kembang. Pasangan harus menempel di bawah aksara sebelumnya, bukan sejajar di sampingnya. Tugas: unggah foto sepuluh kata. Kriteria: sedikitnya 8 dari 10 benar dan pasangan berada di bawah aksara.",
          estimatedMinutes: 30,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Tanda baca, angka, dan aksara khusus",
      summary:
        "Pada lungsi, pada lingsa, adeg-adeg, angka Jawa, swara, murda, rekan.",
      estimatedMinutes: 90,
      lessons: [
        {
          title: "Pada lungsi, pada lingsa, adeg-adeg",
          kind: "text",
          body: "Pada lungsi ꧉ menutup kalimat, pada lingsa ꧈ memisahkan rincian dalam satu kalimat, dan adeg-adeg ꧋ membuka paragraf. Ketiganya ditulis tanpa spasi, sama seperti aksara lain di sekitarnya. Tugas: beri tanda baca pada tiga kalimat. Kriteria: 3 dari 3 benar.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
        },
        {
          title: "Angka Jawa dan pada pangkat",
          kind: "text",
          body: "Angka Jawa berjalan ꧑ sampai ꧐, dan angka yang dipakai sebagai bilangan diapit pada pangkat ꧇. Contohnya ꧇꧑꧙꧙꧐꧇ dibaca 1990 dan ꧇꧒꧐꧒꧖꧇ dibaca 2026, sedangkan ꦱꦱꦶꦏꦥꦶꦁ꧇꧙꧇ dibaca sasi kaping 9. Tugas: tulis lima angka. Kriteria: 5 dari 5 benar dan semua diapit ꧇.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Aksara swara",
          kind: "text",
          body: "Aksara swara ꦄ ꦆ ꦈ ꦌ ꦎ dipakai untuk vokal di awal kata, yaitu A, I, U, E, dan O. Tanpa swara, kata berawalan vokal akan terbaca seolah dimulai dengan konsonan. Tugas: tulis lima kata berawalan vokal. Kriteria: 5 dari 5 memakai aksara swara.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
        },
        {
          title: "Aksara murda dan aksara rekan",
          kind: "text",
          body: "Aksara murda adalah ꦟ ꦑ ꦡ ꦯ ꦦ ꦘ ꦓ ꦨ, sedangkan aksara rekan dipakai untuk bunyi serapan: ꦥ꦳ fa/va, ꦗ꦳ za, ꦒ꦳ gha, ꦏ꦳ kha, dan ꦢ꦳ dza, seperti pada Fatah, Zaki, Ghani, Khalila, dan Dzalim. Materi sumber tidak memberi aturan pemakaian murda; kebiasaan memakainya untuk nama dan gelar adalah konvensi umum, bukan kutipan sumber. Tugas: tulis lima nama. Kriteria: 5 dari 5 memakai rekan yang tepat.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Latihan campuran",
          kind: "practice",
          body: "Tulis kalimat Tanggal 17 Agustus 2025, Khalila dan Zaki datang. Kalimat ini menguji angka bertanggal, dua aksara rekan, pada lungsi, dan aturan tanpa spasi sekaligus. Tugas: unggah foto kalimat lengkap. Kriteria: angka diapit ꧇, dua rekan tepat, pada lungsi ada, dan tidak memakai spasi.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Menulis kalimat utuh",
      summary:
        "Aturan tanpa spasi, membaca paragraf, dan menulis kalimat sendiri.",
      estimatedMinutes: 80,
      lessons: [
        {
          title: "Aturan tanpa spasi",
          kind: "text",
          body: "Satu-satunya aturan eksplisit dalam materi sumber: penulisan aksara Jawa tidak mengenal spasi, walaupun terdiri dari lebih dari satu kata. Bentuk benar adalah ꦤꦠꦧꦠ, sedangkan ꦤꦠ ꦧꦠ salah karena memakai spasi. Tugas: perbaiki empat tulisan yang memakai spasi. Kriteria: 4 dari 4 benar.",
          estimatedMinutes: 15,
          accessLevel: "public",
        },
        {
          title: "Membaca paragraf",
          kind: "text",
          body: "Paragraf penutup materi sumber dibaca utuh, dari adeg-adeg sampai pada lungsi. Teks aksaranya: ꧋ꦏꦧꦸꦢꦪꦤ꧀ꦗꦮꦩꦶꦤꦺꦴꦁꦏꦮꦫꦶꦱ꧀ꦱꦤ꧀ꦥꦫꦊꦭꦸꦲꦸꦂꦏꦁꦏꦸꦢꦸꦢꦶꦗꦒꦭꦤ꧀ꦢꦶꦊꦱ꧀ꦠꦫꦺꦏ꧀ꦲꦏꦺ꧉ꦥꦫꦱꦶꦱ꧀ꦮꦩꦶꦤꦺꦴꦁꦏꦒꦺꦤꦼꦫꦱꦶꦩꦸꦣꦲꦤ꧀ꦢꦸꦮꦺꦤ꧀ꦤꦶꦠꦁꦒꦸꦁꦗꦮꦧ꧀ꦏꦁꦒꦺꦴꦔꦸꦫꦶꦪꦸꦫꦶꦏꦧꦸꦢꦪꦤ꧀ꦗꦮ꧉ꦱꦭꦃꦱꦮꦶꦗꦶꦤꦶꦁꦕꦫꦪꦲꦶꦏꦸꦱꦶꦤꦲꦸꦧꦱꦗꦮ꧈ꦲꦏ꧀ꦱꦫꦗꦮ꧈ꦲꦸꦁꦒꦃꦲꦸꦁꦒꦸꦃ꧈ꦭꦤ꧀ꦩꦤꦺꦏꦮꦂꦤꦏꦼꦱꦼꦤꦶꦪꦤ꧀ꦠꦿꦣꦶꦱꦶꦪꦺꦴꦤꦭ꧀꧈ꦲꦗꦧꦔꦼꦠ꧀ꦏꦥꦶꦭꦸꦠ꧀ꦩꦫꦁꦏꦧꦸꦢꦪꦤ꧀ꦩꦺꦴꦚꦕ꧉ Latinnya: Kabudayan Jawa minangka warisan para leluhur kang kudu dijaga lan dilestarekake. Para siswa minangka generasi mudha nduweni tanggung jawab kanggo nguri-uri kabudayan Jawa. Salah sawijining cara yaiku sinau basa Jawa, aksara Jawa, unggah-ungguh, lan maneka warna kesenian tradisional. Aja banget kapilut marang kabudayan manca. Paragraf ini ditulis untuk siswa sekolah. Kalimat terakhirnya adalah pesan penulis materi, bukan ajaran kursus ini; di kelas ini paragraf dipakai sebagai latihan membaca. Tugas: rekam bacaan dua kalimat. Kriteria: lancar dan tidak berhenti di tengah kata.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Menyalin kalimat sumber",
          kind: "practice",
          body: "Salin dua kalimat dari materi sumber: tumbas jamu godhong tela dan rawe-rawe rantas malang-malang putung. Keduanya panjang, jadi kerjakan per kata lalu sambungkan tanpa spasi. Tugas: unggah foto dua kalimat. Kriteria: sedikitnya 90 persen aksara benar, tanpa spasi, dan pasangan di bawah aksara.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Menulis kalimat sendiri",
          kind: "practice",
          body: "Tulis lima kalimat bahasa Indonesia sederhana tentang identitas, asal, dan pekerjaan. Susun kalimatnya pendek supaya setiap pasangan bisa diperiksa dengan tenang. Tugas: unggah foto dan rekaman bacaan. Kriteria: lima kalimat terbaca sesuai maksud dengan paling banyak 2 kesalahan.",
          estimatedMinutes: 25,
          accessLevel: "enrolled",
        },
      ],
    },
  ],
}

/** Lesson media filenames the seed expects to find in `mediaAssets`. */
export const CURRICULUM_MEDIA_FILES: string[] = Array.from(
  new Set(
    Object.values(MODULES)
      .flat()
      .flatMap((module) => module.lessons)
      .map((lesson) => lesson.mediaFile)
      .filter((filename): filename is string => Boolean(filename)),
  ),
)

/** The subset that must already exist in `seed/images` as an upload source. */
export const CURRICULUM_IMAGE_FILES: string[] = CURRICULUM_MEDIA_FILES.filter(
  (filename) => !filename.endsWith(".mp3"),
)

const COHORTS = [
  {
    key: "bts-2026-01",
    code: "BTS-2026-01",
    pathSlug: "batik-tulis-soga",
    teacherKey: "bambang",
    title: "Batik Tulis Giriloyo, Angkatan 1",
    start: ago(45),
    end: ahead(15),
    capacity: 12,
    status: "active" as const,
  },
  {
    key: "bts-2025-02",
    code: "BTS-2026-00",
    pathSlug: "batik-tulis-soga",
    teacherKey: "bambang",
    title: "Batik Tulis Giriloyo, Angkatan Perintis",
    start: ago(392),
    end: ago(330),
    capacity: 12,
    status: "completed" as const,
  },
  {
    key: "pra-2026-01",
    code: "PRA-2026-01",
    pathSlug: "pranatacara-jawa",
    teacherKey: "widagdo",
    title: "Pranatacara Jawa, Angkatan 1",
    start: ago(30),
    end: ahead(30),
    capacity: 10,
    status: "active" as const,
  },
  {
    key: "pra-2026-02",
    code: "PRA-2026-02",
    pathSlug: "pranatacara-jawa",
    teacherKey: "widagdo",
    title: "Pranatacara Jawa, Angkatan 2",
    start: ahead(20),
    end: ahead(80),
    capacity: 10,
    status: "enrolling" as const,
  },
  {
    key: "bts-2026-03",
    code: "BTS-2026-03",
    pathSlug: "batik-tulis-soga",
    teacherKey: "sri",
    title: "Pewarnaan Alami, Kelas Pendamping",
    start: ago(24),
    end: ahead(46),
    capacity: 8,
    status: "active" as const,
  },
  {
    key: "pra-2025-01",
    code: "PRA-2026-00",
    pathSlug: "pranatacara-jawa",
    teacherKey: "widagdo",
    title: "Pranatacara Jawa, Angkatan Perintis",
    start: ago(380),
    end: ago(320),
    capacity: 10,
    status: "completed" as const,
  },
  {
    key: "aks-2026-01",
    code: "AKS-2026-01",
    pathSlug: "aksara-jawa",
    teacherKey: "suwardi",
    title: "Aksara Jawa, Angkatan 1",
    start: ago(150),
    end: ago(115),
    capacity: 12,
    status: "completed" as const,
  },
]

const ENROLLMENTS: {
  studentKey: string
  cohortKey: string
  status: "pending_payment" | "active" | "completed" | "withdrawn"
}[] = [
  ...["sari", "dwi", "bayu", "nanda", "ratih", "yusuf", "melati", "arif"].map(
    (studentKey) => ({
      studentKey,
      cohortKey: "bts-2026-01",
      status: "active" as const,
    }),
  ),
  ...["anisa", "dimas", "purnomo"].map((studentKey) => ({
    studentKey,
    cohortKey: "bts-2025-02",
    status: "completed" as const,
  })),
  ...["sari", "dwi", "bayu", "nanda", "dewi", "fajar"].map((studentKey) => ({
    studentKey,
    cohortKey: "pra-2026-01",
    status: "active" as const,
  })),
  ...["ratih", "yusuf"].map((studentKey) => ({
    studentKey,
    cohortKey: "pra-2026-02",
    status: "pending_payment" as const,
  })),
  {
    studentKey: "melati",
    cohortKey: "pra-2026-02",
    status: "withdrawn" as const,
  },
  ...["arif", "dewi"].map((studentKey) => ({
    studentKey,
    cohortKey: "bts-2026-03",
    status: "active" as const,
  })),
  { studentKey: "rani", cohortKey: "pra-2025-01", status: "completed" },
  ...["galuh", "arif"].map((studentKey) => ({
    studentKey,
    cohortKey: "aks-2026-01",
    status: "completed" as const,
  })),
  // Melati left the aksara cohort before the final assessment, so her
  // enrollment is not completed and she holds no certificate.
  { studentKey: "melati", cohortKey: "aks-2026-01", status: "withdrawn" },
]

type SeedSubmission = {
  key: string
  studentKey: string
  cohortKey: string
  taskTitle: string
  status:
    | "draft"
    | "submitted"
    | "under_review"
    | "revision_requested"
    | "approved"
    | "rejected"
  score?: number
  feedback?: string
  submittedDaysAgo?: number
  assessedDaysAgo?: number
  revisionCount: number
  evidenceText: string
}

const SUBMISSIONS: SeedSubmission[] = [
  {
    key: "sari-bts-1",
    studentKey: "sari",
    cohortKey: "bts-2026-01",
    taskTitle: "Memegang canting dan berhenti dengan bersih",
    status: "approved",
    score: 88,
    feedback:
      "Tekanan canting sudah stabil. Perbaiki jarak antar titik pada bagian lengkung kanan.",
    submittedDaysAgo: 20,
    assessedDaysAgo: 18,
    revisionCount: 0,
    evidenceText:
      "Enam lembar latihan garis di kain perca, dengan catatan suhu malam 68 derajat.",
  },
  {
    key: "sari-bts-2",
    studentKey: "sari",
    cohortKey: "bts-2026-01",
    taskTitle: "Latihan mola",
    status: "submitted",
    submittedDaysAgo: 3,
    revisionCount: 0,
    evidenceText:
      "Grid 4 x 4 dengan pengulangan motif geometris, foto jarak dekat dan foto keseluruhan.",
  },
  {
    key: "dwi-bts-1",
    studentKey: "dwi",
    cohortKey: "bts-2026-01",
    taskTitle: "Memegang canting dan berhenti dengan bersih",
    status: "approved",
    score: 92,
    feedback:
      "Garis lengkung rapi. Pertahankan kecepatan tangan saat berpindah arah.",
    submittedDaysAgo: 22,
    assessedDaysAgo: 20,
    revisionCount: 0,
    evidenceText: "Delapan lembar latihan dengan variasi tekanan.",
  },
  {
    key: "dwi-bts-2",
    studentKey: "dwi",
    cohortKey: "bts-2026-01",
    taskTitle: "Mbabar: mencelup kain pada bahan pewarna",
    status: "revision_requested",
    score: 70,
    feedback:
      "Warna belum merata di bagian tepi. Ulangi pencelupan dengan waktu yang sama dan catat suhu larutan.",
    submittedDaysAgo: 8,
    assessedDaysAgo: 6,
    revisionCount: 1,
    evidenceText: "Dua potong kain dengan takaran soga berbeda.",
  },
  {
    key: "bayu-bts-1",
    studentKey: "bayu",
    cohortKey: "bts-2026-01",
    taskTitle: "Memegang canting dan berhenti dengan bersih",
    status: "submitted",
    submittedDaysAgo: 2,
    revisionCount: 0,
    evidenceText: "Foto latihan garis dan catatan alat yang dipakai.",
  },
  {
    key: "nanda-bts-1",
    studentKey: "nanda",
    cohortKey: "bts-2026-01",
    taskTitle: "Latihan mola",
    status: "under_review",
    submittedDaysAgo: 5,
    revisionCount: 0,
    evidenceText: "Foto sebelum dan sesudah pencucian kain primis.",
  },
  {
    key: "ratih-bts-1",
    studentKey: "ratih",
    cohortKey: "bts-2026-01",
    taskTitle: "Memegang canting dan berhenti dengan bersih",
    status: "approved",
    score: 85,
    feedback: "Garis sudah lurus. Kurangi malam yang menumpuk di titik awal.",
    submittedDaysAgo: 19,
    assessedDaysAgo: 17,
    revisionCount: 0,
    evidenceText: "Lima lembar latihan garis dengan catatan proses.",
  },
  {
    key: "yusuf-bts-1",
    studentKey: "yusuf",
    cohortKey: "bts-2026-01",
    taskTitle: "Latihan mola",
    status: "submitted",
    submittedDaysAgo: 4,
    revisionCount: 0,
    evidenceText: "Foto kain yang sudah dicuci dan disetrika.",
  },
  {
    key: "melati-bts-1",
    studentKey: "melati",
    cohortKey: "bts-2026-01",
    taskTitle: "Memegang canting dan berhenti dengan bersih",
    status: "draft",
    revisionCount: 0,
    evidenceText: "Draf catatan latihan, belum diunggah.",
  },
  {
    key: "arif-bts-1",
    studentKey: "arif",
    cohortKey: "bts-2026-01",
    taskTitle: "Memegang canting dan berhenti dengan bersih",
    status: "approved",
    score: 90,
    feedback: "Kontrol tekanan baik. Lanjutkan ke latihan lengkung ganda.",
    submittedDaysAgo: 21,
    assessedDaysAgo: 19,
    revisionCount: 0,
    evidenceText: "Tujuh lembar latihan dengan variasi ketebalan garis.",
  },
  {
    key: "anisa-bts-final",
    studentKey: "anisa",
    cohortKey: "bts-2025-02",
    taskTitle: "Kain uji dari mola sampai mepe",
    status: "approved",
    score: 92,
    feedback:
      "Kain selesai dengan warna rata dan dokumentasi proses lengkap. Layak diajukan untuk Kartu Karya.",
    submittedDaysAgo: 350,
    assessedDaysAgo: 345,
    revisionCount: 1,
    evidenceText:
      "Dua belas foto bertanggal dari primis sampai pelorodan, plus catatan bahan.",
  },
  {
    key: "dimas-bts-final",
    studentKey: "dimas",
    cohortKey: "bts-2025-02",
    taskTitle: "Kain uji dari mola sampai mepe",
    status: "approved",
    score: 89,
    feedback:
      "Titik canting rapat dan konsisten. Perbaiki finishing tepi kain pada karya berikutnya.",
    submittedDaysAgo: 348,
    assessedDaysAgo: 343,
    revisionCount: 0,
    evidenceText: "Foto detail titik dan foto keseluruhan selendang.",
  },
  {
    key: "purnomo-bts-final",
    studentKey: "purnomo",
    cohortKey: "bts-2025-02",
    taskTitle: "Kain uji dari mola sampai mepe",
    status: "approved",
    score: 95,
    feedback:
      "Empat belas tahap pewarnaan tercatat rapi. Motif lereng disusun ulang tanpa motif sakral.",
    submittedDaysAgo: 346,
    assessedDaysAgo: 341,
    revisionCount: 2,
    evidenceText: "Jurnal proses 14 tahap dan foto hasil akhir.",
  },
  {
    key: "dwi-bts-final",
    studentKey: "dwi",
    cohortKey: "bts-2026-01",
    taskTitle: "Kain uji dari mola sampai mepe",
    status: "approved",
    score: 86,
    feedback:
      "Urutan langkah tercatat lengkap. Perbaiki kebersihan tepi sebelum kain diajukan.",
    submittedDaysAgo: 20,
    assessedDaysAgo: 18,
    revisionCount: 0,
    evidenceText:
      "Kain uji 30 x 30 cm dengan catatan tanggal tiap langkah dan foto tiga detail.",
  },
  {
    key: "rani-pra-final",
    studentKey: "rani",
    cohortKey: "pra-2025-01",
    taskTitle: "Praktik akhir: siraman dan midodareni",
    status: "approved",
    score: 90,
    feedback:
      "Urutan acara jelas dan artikulasi baik. Pertahankan kontak mata dengan keluarga.",
    submittedDaysAgo: 330,
    assessedDaysAgo: 325,
    revisionCount: 1,
    evidenceText: "Rekaman praktik 18 menit dan rundown acara.",
  },
  {
    key: "sari-pra-1",
    studentKey: "sari",
    cohortKey: "pra-2026-01",
    taskTitle: "Latihan napas dan jeda",
    status: "approved",
    score: 86,
    feedback: "Jeda kalimat sudah baik. Perjelas konsonan akhir.",
    submittedDaysAgo: 12,
    assessedDaysAgo: 10,
    revisionCount: 0,
    evidenceText: "Rekaman suara 5 menit.",
  },
  {
    key: "dwi-pra-1",
    studentKey: "dwi",
    cohortKey: "pra-2026-01",
    taskTitle: "Menyusun rundown",
    status: "submitted",
    submittedDaysAgo: 2,
    revisionCount: 0,
    evidenceText: "Rundown 60 menit dengan penanda waktu.",
  },
  {
    key: "bayu-pra-1",
    studentKey: "bayu",
    cohortKey: "pra-2026-01",
    taskTitle: "Latihan napas dan jeda",
    status: "under_review",
    submittedDaysAgo: 4,
    revisionCount: 0,
    evidenceText: "Rekaman suara 6 menit.",
  },
  {
    key: "nanda-pra-1",
    studentKey: "nanda",
    cohortKey: "pra-2026-01",
    taskTitle: "Koordinasi dengan tim acara",
    status: "submitted",
    submittedDaysAgo: 1,
    revisionCount: 0,
    evidenceText: "Catatan koordinasi dengan tim acara.",
  },
  {
    key: "dewi-pra-1",
    studentKey: "dewi",
    cohortKey: "pra-2026-01",
    taskTitle: "Latihan napas dan jeda",
    status: "approved",
    score: 84,
    feedback: "Volume cukup. Latih pernapasan sebelum kalimat panjang.",
    submittedDaysAgo: 11,
    assessedDaysAgo: 9,
    revisionCount: 0,
    evidenceText: "Rekaman suara 4 menit.",
  },
  {
    key: "fajar-pra-1",
    studentKey: "fajar",
    cohortKey: "pra-2026-01",
    taskTitle: "Menyusun rundown",
    status: "submitted",
    submittedDaysAgo: 3,
    revisionCount: 0,
    evidenceText: "Rundown dan daftar tugas keluarga.",
  },
  {
    key: "arif-bts-3",
    studentKey: "arif",
    cohortKey: "bts-2026-03",
    taskTitle: "Ekstraksi warna alami",
    status: "submitted",
    submittedDaysAgo: 1,
    revisionCount: 0,
    evidenceText: "Foto bahan dan catatan takaran.",
  },
  {
    key: "dewi-bts-3",
    studentKey: "dewi",
    cohortKey: "bts-2026-03",
    taskTitle: "Ekstraksi warna alami",
    status: "draft",
    revisionCount: 0,
    evidenceText: "Draf catatan bahan.",
  },
  {
    key: "galuh-aks-1",
    studentKey: "galuh",
    cohortKey: "aks-2026-01",
    taskTitle: "Latihan pasangan",
    status: "approved",
    score: 84,
    feedback:
      "Pasangan ra dan nya sudah benar. Perbaiki dua pasangan yang masih sejajar, bukan di bawah aksara.",
    submittedDaysAgo: 136,
    assessedDaysAgo: 133,
    revisionCount: 0,
    evidenceText:
      "Foto sepuluh kata dua suku kata dengan konsonan mati di tengah.",
  },
  {
    key: "galuh-aks-final",
    studentKey: "galuh",
    cohortKey: "aks-2026-01",
    taskTitle: "Lembar uji aksara",
    status: "approved",
    score: 88,
    feedback:
      "Transkripsi rapi dan tanpa spasi. Lafal perlu satu putaran lagi pada taling dan pepet.",
    submittedDaysAgo: 120,
    assessedDaysAgo: 118,
    revisionCount: 1,
    evidenceText:
      "Transkripsi 28 kata, rekaman baca satu paragraf, dan lima kalimat yang ditandai lalu dibetulkan.",
  },
  {
    key: "arif-aks-1",
    studentKey: "arif",
    cohortKey: "aks-2026-01",
    taskTitle: "Latihan hanacaraka",
    status: "approved",
    score: 82,
    feedback:
      "Dua puluh aksara terbaca. Bentuk da dan dha masih tertukar di baris kedua.",
    submittedDaysAgo: 140,
    assessedDaysAgo: 138,
    revisionCount: 0,
    evidenceText: "Foto salinan dua puluh aksara dan rekaman bacaan.",
  },
  {
    key: "arif-aks-final",
    studentKey: "arif",
    cohortKey: "aks-2026-01",
    taskTitle: "Lembar uji aksara",
    status: "approved",
    score: 81,
    feedback:
      "Transkripsi terbaca dan pasangan berada di bawah aksara. Perbaiki dua tanda baca pada kalimat penutup.",
    submittedDaysAgo: 122,
    assessedDaysAgo: 120,
    revisionCount: 0,
    evidenceText:
      "Transkripsi 26 kata, rekaman baca satu paragraf, dan lima kalimat yang dibetulkan.",
  },
]

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

async function userByEmail(
  ctx: MutationCtx,
  email: string,
): Promise<Doc<"users">> {
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique()
  if (!user) throw new Error(`Seed user missing: ${email}`)
  return user
}

async function pathBySlug(
  ctx: MutationCtx,
  slug: string,
): Promise<Doc<"paths">> {
  const path = await ctx.db
    .query("paths")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique()
  if (!path) throw new Error(`Seed path missing: ${slug}`)
  return path
}


async function workBySlug(
  ctx: MutationCtx,
  slug: string,
): Promise<Doc<"works">> {
  const work = await ctx.db
    .query("works")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique()
  if (!work) throw new Error(`Seed work missing: ${slug}`)
  return work
}



async function evidenceStorageId(
  ctx: MutationCtx,
): Promise<Id<"_storage">> {
  const assets = await ctx.db.query("mediaAssets").collect()
  const image = assets.find(
    (asset) => asset.kind === "image" && asset.storageId,
  )
  if (image?.storageId) return image.storageId
  return await ctx.storage.store(
    new Blob(["KalaNidhi seed evidence"], { type: "image/jpeg" }),
  )
}

/** Stable four-digit tail so seeded payout accounts look like real ones. */
function accountSuffix(name: string): string {
  let hash = 7
  for (const char of name) hash = (hash * 33 + char.charCodeAt(0)) % 8999
  return String(1000 + hash)
}

export const seedPeople = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("users").collect()
    let admin = existing.find(
      (user) => user.roles.includes("admin") && user.status === "active",
    )
    if (!admin) {
      const adminId = await ctx.db.insert("users", {
        authUserId: "seed-admin",
        name: SEED_ADMIN_PROFILE.name,
        email: SEED_ADMIN_PROFILE.email,
        emailVerified: true,
        phone: SEED_ADMIN_PROFILE.phone,
        province: SEED_ADMIN_PROFILE.province,
        whatsappVerified: true,
        whatsappVerifiedAt: ago(SEED_ADMIN_PROFILE.joinedDaysAgo - 1),
        initials: SEED_ADMIN_PROFILE.initials,
        region: SEED_ADMIN_PROFILE.region,
        roles: ["admin"],
        status: "active",
        createdAt: ago(SEED_ADMIN_PROFILE.joinedDaysAgo),
        updatedAt: NOW,
      })
      admin = (await ctx.db.get(adminId)) as Doc<"users">
    } else if (
      admin.province !== SEED_ADMIN_PROFILE.province ||
      admin.region !== SEED_ADMIN_PROFILE.region
    ) {
      // The operator mailbox belongs to Better Auth and stays untouched; only
      // the public profile location is normalized for the demo workspace.
      await ctx.db.patch(admin._id, {
        province: SEED_ADMIN_PROFILE.province,
        region: SEED_ADMIN_PROFILE.region,
        updatedAt: NOW,
      })
    }

    const byKey = new Map<string, Doc<"users">>()
    byKey.set("admin", admin)

    // The admin account is preserved across reseeds, but its projections are
    // rebuilt so the workspace never shows an empty role/consent/session panel.
    await ctx.db.insert("roleAssignments", {
      userId: admin._id,
      role: "admin",
      action: "grant",
      actorId: "system",
      reason: "Admin bootstrap preserved across seed",
      createdAt: ago(SEED_ADMIN_PROFILE.joinedDaysAgo),
    })
    await ctx.db.insert("consents", {
      userId: admin._id,
      kind: "privacy",
      granted: true,
      version: "2026-11",
      source: "bootstrap",
      grantedAt: ago(SEED_ADMIN_PROFILE.joinedDaysAgo),
      createdAt: ago(SEED_ADMIN_PROFILE.joinedDaysAgo),
    })
    await ctx.db.insert("consents", {
      userId: admin._id,
      kind: "recording",
      granted: true,
      version: "2026-11",
      source: "bootstrap",
      grantedAt: ago(SEED_ADMIN_PROFILE.joinedDaysAgo),
      createdAt: ago(SEED_ADMIN_PROFILE.joinedDaysAgo),
    })
    await ctx.db.insert("whatsappVerifications", {
      userId: admin._id,
      phone: admin.phone,
      tokenHash: await sha256("seed-verification-admin"),
      status: "verified",
      expiresAt: ago(SEED_ADMIN_PROFILE.joinedDaysAgo - 1),
      createdAt: ago(SEED_ADMIN_PROFILE.joinedDaysAgo),
      verifiedAt: ago(SEED_ADMIN_PROFILE.joinedDaysAgo - 1) + 2 * HOUR,
      messageId: "seed-wa-admin",
    })
    await ctx.db.insert("authLogs", {
      userId: admin._id,
      authUserId: admin.authUserId,
      kind: "sign_in",
      ipHash: "seed-ip-admin",
      userAgent: USER_AGENTS[1],
      createdAt: ago(1),
    })
    const adminSessions = await ctx.db
      .query("sessions")
      .withIndex("by_userId", (q) => q.eq("userId", admin._id))
      .collect()
    if (adminSessions.length === 0) {
      await ctx.db.insert("sessions", {
        userId: admin._id,
        authSessionId: "seed-session-admin",
        deviceName: "Peramban",
        userAgent: USER_AGENTS[1],
        createdAt: ago(1),
        lastSeenAt: ago(0),
        expiresAt: ahead(30),
      })
    }

    for (const [index, seed] of SEED_USERS.entries()) {
      const userId = await ctx.db.insert("users", {
        authUserId: `seed-${seed.key}`,
        name: seed.name,
        email: seed.email,
        emailVerified: true,
        phone: seed.phone,
        province: seed.province,
        whatsappVerified: true,
        whatsappVerifiedAt: ago(seed.joinedDaysAgo - 1),
        initials: seed.initials,
        region: seed.region,
        roles: seed.roles,
        status: "active",
        lastActiveAt: ago(seed.lastActiveDaysAgo),
        createdAt: ago(seed.joinedDaysAgo),
        updatedAt: NOW,
      })
      const user = (await ctx.db.get(userId)) as Doc<"users">
      byKey.set(seed.key, user)

      for (const role of seed.roles) {
        await ctx.db.insert("roleAssignments", {
          userId,
          role,
          action: "grant",
          actorId: admin._id,
          reason: "Penyiapan akun melalui undangan pengelola.",
          createdAt: ago(seed.joinedDaysAgo),
        })
      }

      await ctx.db.insert("sessions", {
        userId,
        authSessionId: `seed-session-${seed.key}`,
        deviceName:
          index % 3 === 0 ? "Android" : index % 3 === 1 ? "Windows" : "iPhone",
        userAgent: USER_AGENTS[index % USER_AGENTS.length],
        createdAt: ago(Math.max(1, seed.lastActiveDaysAgo + 1)),
        lastSeenAt: ago(seed.lastActiveDaysAgo),
        expiresAt: ahead(30),
      })

      await ctx.db.insert("consents", {
        userId,
        kind: "privacy",
        granted: true,
        version: "2026-11",
        source: "signup",
        grantedAt: ago(seed.joinedDaysAgo),
        createdAt: ago(seed.joinedDaysAgo),
      })
      await ctx.db.insert("consents", {
        userId,
        kind: "marketing",
        granted: index % 3 !== 0,
        version: "2026-11",
        source: "signup",
        grantedAt: index % 3 !== 0 ? ago(seed.joinedDaysAgo) : undefined,
        revokedAt:
          index % 3 === 0 ? ago(Math.max(1, seed.joinedDaysAgo - 45)) : undefined,
        createdAt: ago(seed.joinedDaysAgo),
      })
      await ctx.db.insert("consents", {
        userId,
        kind: "recording",
        granted: true,
        version: "2026-11",
        source: "workspace",
        grantedAt: ago(60),
        createdAt: ago(60),
      })

      await ctx.db.insert("whatsappVerifications", {
        userId,
        phone: seed.phone,
        tokenHash: await sha256(`seed-verification-${seed.key}`),
        status: "verified",
        expiresAt: ago(seed.joinedDaysAgo) + HOUR,
        createdAt: ago(seed.joinedDaysAgo),
        verifiedAt: ago(seed.joinedDaysAgo) + 3 * 60_000,
        messageId: `seed-wa-${seed.key}`,
      })

      await ctx.db.insert("authLogs", {
        userId,
        authUserId: `seed-${seed.key}`,
        kind: "sign_in",
        ipHash: `seed-ip-${index}`,
        userAgent: USER_AGENTS[index % USER_AGENTS.length],
        createdAt: ago(Math.max(1, seed.lastActiveDaysAgo + 1)),
      })
    }

    for (const [teacherIndex, seed] of SEED_TEACHERS.entries()) {
      const user = byKey.get(seed.key)
      if (!user) continue
      await ctx.db.insert("sellerProfiles", {
        userId: user._id,
        displayName: seed.name,
        status: seed.status === "active" ? "active" : "pending",
        onboardingChecklist: {
          payoutAccount: seed.status === "active",
          consent: true,
          firstWorkCard: seed.status === "active",
          taxDetails: seed.status === "active",
        },
        activatedAt:
          seed.status === "active" ? ago(120 - teacherIndex * 9) : undefined,
        createdAt: ago(126 - teacherIndex * 9),
        updatedAt: NOW,
      })
      if (seed.status === "active") {
        await ctx.db.insert("payoutAccounts", {
          userId: user._id,
          provider: "bank",
          bankCode: seed.key === "sri" ? "BRI" : "BCA",
          accountName: seed.name,
          accountNumberMasked: `****${accountSuffix(seed.name)}`,
          accountRef: `vault:seed:${seed.key}`,
          status: "verified",
          verifiedBy: admin._id,
          verifiedAt: ago(122 - teacherIndex * 9),
          createdAt: ago(124 - teacherIndex * 9),
          updatedAt: NOW,
        })
      }
    }

    for (const key of ["anisa", "dimas", "purnomo", "rani"]) {
      const user = byKey.get(key)
      if (!user) continue
      await ctx.db.insert("sellerProfiles", {
        userId: user._id,
        displayName: user.name,
        status: "active",
        onboardingChecklist: {
          payoutAccount: true,
          consent: true,
          firstWorkCard: true,
          taxDetails: true,
        },
        activatedAt: ago(300 + (key === "rani" ? 18 : 0)),
        createdAt: ago(320 + (key === "rani" ? 18 : 0)),
        updatedAt: NOW,
      })
      await ctx.db.insert("payoutAccounts", {
        userId: user._id,
        provider: "bank",
        bankCode: key === "rani" ? "BRI" : "BCA",
        accountName: user.name,
        accountNumberMasked: `****${accountSuffix(user.name)}`,
        accountRef: `vault:seed:${key}`,
        status: "verified",
        verifiedBy: admin._id,
        verifiedAt: ago(310 + (key === "rani" ? 18 : 0)),
        createdAt: ago(315 + (key === "rani" ? 18 : 0)),
        updatedAt: NOW,
      })
    }

    // The aksara seller earned her listing after the angkatan 1 certificate,
    // so her seller rows start later than the batik and pranatacara sellers.
    const galuh = byKey.get("galuh")
    if (galuh) {
      await ctx.db.insert("sellerProfiles", {
        userId: galuh._id,
        displayName: galuh.name,
        status: "active",
        onboardingChecklist: {
          payoutAccount: true,
          consent: true,
          firstWorkCard: true,
          taxDetails: true,
        },
        activatedAt: ago(107),
        createdAt: ago(109),
        updatedAt: NOW,
      })
      await ctx.db.insert("payoutAccounts", {
        userId: galuh._id,
        provider: "bank",
        bankCode: "BNI",
        accountName: galuh.name,
        accountNumberMasked: `****${accountSuffix(galuh.name)}`,
        accountRef: "vault:seed:galuh",
        status: "verified",
        verifiedBy: admin._id,
        verifiedAt: ago(107),
        createdAt: ago(108),
        updatedAt: NOW,
      })
    }

    await ctx.db.insert("invites", {
      email: "rahayu.puspita86@gmail.com",
      name: "Rahayu Puspita",
      roles: ["teacher"],
      tokenHash: await sha256("seed-invite-rahayu"),
      status: "pending",
      invitedBy: admin._id,
      reason: "Pengajar batik bambu Bantul",
      expiresAt: ahead(7),
      createdAt: ago(2),
    })
    await ctx.db.insert("invites", {
      email: seedEmail("bambang"),
      name: "Bambang Hardjono",
      roles: ["teacher"],
      tokenHash: await sha256("seed-invite-bambang"),
      status: "accepted",
      invitedBy: admin._id,
      acceptedBy: byKey.get("bambang")?._id,
      reason: "Pengajar batik Giriloyo",
      expiresAt: ago(SEED_ADMIN_PROFILE.joinedDaysAgo - 8),
      createdAt: ago(SEED_ADMIN_PROFILE.joinedDaysAgo),
      acceptedAt: ago(SEED_ADMIN_PROFILE.joinedDaysAgo) + DAY,
    })
    await ctx.db.insert("invites", {
      email: "sigit.pramono70@gmail.com",
      name: "Sigit Pramono",
      roles: ["teacher"],
      tokenHash: await sha256("seed-invite-revoked"),
      status: "revoked",
      invitedBy: admin._id,
      reason: "Jadwal mengajar bentrok; undangan dibatalkan atas permintaan calon pengajar.",
      expiresAt: ago(20),
      createdAt: ago(30),
    })

    return { users: byKey.size }
  },
})

/** Turns a task title into the kind of filename a participant would upload. */
function evidenceFilename(seed: SeedSubmission, index: number): string {
  const slug = seed.taskTitle
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return `${slug}-${seed.studentKey}-${String(index + 1).padStart(2, "0")}.jpg`
}

export const seedCurriculum = internalMutation({
  args: {},
  handler: async (ctx) => {
    const assets = await ctx.db.query("mediaAssets").collect()
    const byFilename = new Map(
      assets.map((asset) => [asset.filename, asset] as const),
    )
    let moduleCount = 0
    let lessonCount = 0

    const pathOrder = Object.keys(MODULES)
    for (const [pathSlug, modules] of Object.entries(MODULES)) {
      const path = await pathBySlug(ctx, pathSlug)
      // Draft curriculum follows the path row, not a hardcoded slug.
      const isDraft = path.comingSoon === true
      const curriculumOrder = pathOrder.indexOf(pathSlug)
      let publishedModules = 0
      for (const [moduleIndex, module] of modules.entries()) {
        const moduleCreatedAt = ago(
          372 - curriculumOrder * 68 - moduleIndex * 9,
        )
        const moduleId = await ctx.db.insert("pathModules", {
          order: moduleIndex + 1,
          pathId: path.slug,
          title: module.title,
          summary: module.summary,
          estimatedMinutes: module.estimatedMinutes,
          status: isDraft ? "draft" : "published",
          createdAt: moduleCreatedAt,
        })
        moduleCount += 1
        if (!isDraft) publishedModules += 1
        for (const [lessonIndex, lesson] of module.lessons.entries()) {
          const mediaAssetIds: Id<"mediaAssets">[] = []
          // A lesson names its own image file; a non-text lesson must attach one.
          if (lesson.mediaFile) {
            const asset = byFilename.get(lesson.mediaFile)
            if (!asset) {
              throw new ConvexError({
                code: "SEED_MEDIA_MISSING",
                message: `Media pelajaran "${lesson.mediaFile}" untuk ${lesson.title} belum ada di mediaAssets.`,
              })
            }
            mediaAssetIds.push(asset._id)
          }
          await ctx.db.insert("lessons", {
            order: lessonIndex + 1,
            moduleId,
            pathId: path.slug,
            title: lesson.title,
            kind: lesson.kind,
            body: lesson.body,
            mediaAssetIds,
            estimatedMinutes: lesson.estimatedMinutes,
            accessLevel: lesson.accessLevel,
            status: isDraft ? "draft" : "published",
            createdAt: moduleCreatedAt - (lessonIndex + 1) * 2 * DAY,
          })
          lessonCount += 1
        }
      }
      // `paths.modules` mirrors published curriculum, never seed copy.
      await ctx.db.patch(path._id, { modules: publishedModules })
    }

    return { modules: moduleCount, lessons: lessonCount }
  },
})

export const seedLearning = internalMutation({
  args: {},
  handler: async (ctx) => {
    const admin = await seedAdmin(ctx)
    const cohortIds = new Map<string, Id<"cohorts">>()
    for (const seed of COHORTS) {
      const path = await pathBySlug(ctx, seed.pathSlug)
      const teacher = await userByEmail(ctx, seedEmail(seed.teacherKey))
      const cohortId = await ctx.db.insert("cohorts", {
        code: seed.code,
        pathId: path.slug,
        teacherId: teacher._id,
        title: seed.title,
        startDate: seed.start,
        endDate: seed.end,
        capacity: seed.capacity,
        timezone: "Asia/Jakarta",
        status: seed.status,
        createdAt: Math.min(
          NOW - DAY,
          Math.max(SEED_START, seed.start - 45 * DAY),
        ),
        updatedAt: NOW,
      })
      cohortIds.set(seed.key, cohortId)

      const sessionCount = seed.status === "completed" ? 4 : 3
      for (let index = 0; index < sessionCount; index += 1) {
        const startsAt =
          seed.status === "completed"
            ? seed.start + index * 7 * DAY
            : index === 0
              ? ago(14)
              : index === 1
                ? ago(2)
                : ahead(5 + index)
        await ctx.db.insert("cohortSessions", {
          cohortId,
          title:
            index === sessionCount - 1
              ? "Penilaian akhir dan umpan balik"
              : `Sesi ${index + 1}: praktik terbimbing`,
          kind: index === sessionCount - 1 ? "assessment" : "session",
          startsAt,
          endsAt: startsAt + 2 * HOUR,
          timezone: "Asia/Jakarta",
          roomId: `kalanidhi-${seed.code.toLowerCase()}-${index + 1}`,
          status:
            startsAt < NOW
              ? "ended"
              : startsAt - NOW < 2 * HOUR
                ? "live"
                : "scheduled",
          createdAt: Math.min(
            NOW - HOUR,
            Math.max(SEED_START, startsAt - 14 * DAY),
          ),
        })
      }
    }

    const enrollmentIds = new Map<string, Id<"enrollments">>()
    for (const seed of ENROLLMENTS) {
      const student = await userByEmail(ctx, seedEmail(seed.studentKey))
      const cohortId = cohortIds.get(seed.cohortKey)
      if (!cohortId) {
        throw new Error(`Seed cohort missing: ${seed.cohortKey}`)
      }
      const cohort = await ctx.db.get(cohortId)
      if (!cohort) {
        throw new Error(`Seed cohort missing: ${seed.cohortKey}`)
      }
      const enrolledAt = Math.min(
        NOW - HOUR,
        seed.status === "pending_payment"
          ? ago(3)
          : Math.max(
              SEED_START,
              student.createdAt + 2 * HOUR,
              cohort.startDate - 10 * DAY,
            ),
      )
      const enrollmentId = await ctx.db.insert("enrollments", {
        studentId: student._id,
        pathId: cohort.pathId,
        cohortId,
        status: seed.status,
        enrolledAt,
        completedAt:
          seed.status === "completed" ? cohort.endDate : undefined,
        withdrawnAt:
          seed.status === "withdrawn"
            ? Math.min(NOW, cohort.startDate + 21 * DAY)
            : undefined,
        withdrawReason:
          seed.status === "withdrawn"
            ? "Jadwal kerja berubah; peserta menunda ke angkatan berikutnya."
            : undefined,
        lastActivityAt:
          seed.status === "completed"
            ? cohort.endDate
            : seed.status === "withdrawn"
              ? Math.min(NOW, cohort.startDate + 21 * DAY)
              : NOW - HOUR,
        deadlineAt: cohort.endDate,
        createdAt: enrolledAt,
        updatedAt: NOW,
      })
      enrollmentIds.set(`${seed.studentKey}:${seed.cohortKey}`, enrollmentId)

      if (seed.status === "pending_payment") continue

      const modules = await ctx.db
        .query("pathModules")
        .withIndex("by_path_order", (q) => q.eq("pathId", cohort.pathId))
        .collect()
      const publishedModules = modules.filter(
        (module) => module.status === "published",
      )
      const lessons = (
        await Promise.all(
          publishedModules.map((module) =>
            ctx.db
              .query("lessons")
              .withIndex("by_module_order", (q) =>
                q.eq("moduleId", module._id),
              )
              .collect(),
          ),
        )
      ).flat()
      const ordered = lessons.sort((a, b) => a.order - b.order)
      const completedCount =
        seed.status === "completed"
          ? ordered.length
          : Math.max(1, Math.floor(ordered.length * 0.45))
      // Distribute lesson completion across the real cohort window instead of
      // stacking every lesson on the same afternoon.
      const windowStart = Math.max(SEED_START, cohort.startDate)
      const windowSpan = Math.max(DAY, NOW - windowStart)
      for (const [index, lesson] of ordered.entries()) {
        const completedAt =
          index < completedCount
            ? Math.min(
                NOW - HOUR,
                windowStart +
                  Math.round((windowSpan * (index + 1)) / (completedCount + 2)),
              )
            : undefined
        await ctx.db.insert("lessonProgress", {
          userId: student._id,
          enrollmentId,
          lessonId: lesson._id,
          state:
            index < completedCount
              ? "completed"
              : index === completedCount
                ? "in_progress"
                : "not_started",
          attendance:
            index <= completedCount ? "present" : undefined,
          completedAt,
          updatedAt: completedAt ?? ago(1),
        })
      }
    }

    const storageId = await evidenceStorageId(ctx)
    const assessmentIds = new Map<string, Id<"assessments">>()
    const submissionIds = new Map<string, Id<"submissions">>()

    for (const [submissionIndex, seed] of SUBMISSIONS.entries()) {
      const student = await userByEmail(ctx, seedEmail(seed.studentKey))
      const cohortId = cohortIds.get(seed.cohortKey)
      if (!cohortId) {
        throw new Error(`Seed cohort missing: ${seed.cohortKey}`)
      }
      const cohort = await ctx.db.get(cohortId)
      if (!cohort) {
        throw new Error(`Seed cohort missing: ${seed.cohortKey}`)
      }
      const enrollmentId = enrollmentIds.get(
        `${seed.studentKey}:${seed.cohortKey}`,
      )
      if (!enrollmentId) {
        throw new Error(
          `Seed enrollment missing: ${seed.studentKey}:${seed.cohortKey}`,
        )
      }
      const submittedAt =
        seed.submittedDaysAgo !== undefined
          ? ago(seed.submittedDaysAgo)
          : undefined
      const submissionId = await ctx.db.insert("submissions", {
        code: `TUG-${seed.key.toUpperCase()}`,
        studentId: student._id,
        enrollmentId,
        cohortId,
        pathId: cohort.pathId,
        taskTitle: seed.taskTitle,
        status: seed.status,
        submittedAt,
        dueAt: submittedAt ? submittedAt + DAY : ahead(6),
        evidenceText: seed.evidenceText,
        assetIds: [],
        revisionCount: seed.revisionCount,
        createdAt: submittedAt ?? ago(6),
        updatedAt: NOW,
      })
      submissionIds.set(seed.key, submissionId)

      if (seed.status !== "draft") {
        const assetId = await ctx.db.insert("submissionAssets", {
          submissionId,
          storageId,
          kind: "image",
          filename: evidenceFilename(seed, submissionIndex),
          mimeType: "image/jpeg",
          size: 48_000,
          createdAt: submittedAt ?? ago(6),
        })
        await ctx.db.patch(submissionId, { assetIds: [assetId] })
      }

      if (seed.key === "bayu-bts-1") {
        await ctx.db.patch(submissionId, {
          escalatedAt: ago(1),
          escalatedBy: admin._id,
          escalationReason:
            "Melewati SLA penilaian 3 hari kerja; dinaikkan ke pengajar senior.",
        })
      }

      if (seed.status === "draft") continue

      const pondokTeacher = await ctx.db.get(cohort.teacherId)
      if (!pondokTeacher) {
        throw new Error(`Seed cohort teacher missing: ${seed.cohortKey}`)
      }
      const assessor = pondokTeacher
      const assessedAt =
        seed.assessedDaysAgo !== undefined
          ? ago(seed.assessedDaysAgo)
          : undefined
      const assessmentStatus =
        seed.status === "approved" || seed.status === "revision_requested"
          ? "completed"
          : seed.status === "under_review"
            ? "in_review"
            : "queued"
      const assessmentId = await ctx.db.insert("assessments", {
        submissionId,
        assessorId: assessor._id,
        status: assessmentStatus,
        rubric: rubricForPath(cohort.pathId).map((criterion) => {
          const label = criterion.criterion.toLowerCase()
          const revisionNote =
            criterion.criterion === "Kualitas garis lilin" ||
            criterion.criterion === "Warna dan kebersihan"
              ? "Hasil belum konsisten di bagian tepi; ulangi dengan takaran yang sama."
              : `Bagian ${label} perlu diulang sebelum dinilai lagi.`
          const doneNote =
            criterion.criterion === "Dokumentasi" ||
            criterion.criterion === "Catatan proses" ||
            criterion.criterion === "Keselamatan dan catatan"
              ? "Dokumentasi proses lengkap, foto bertanggal dan takaran tercatat."
              : `Catatan pengajar pada ${label} sudah lengkap.`
          return {
            criterion: criterion.criterion,
            weight: criterion.weight,
            score: seed.score,
            comment:
              seed.status === "revision_requested"
                ? revisionNote
                : (seed.feedback ??
                  (seed.status === "approved"
                    ? doneNote
                    : `Menunggu penilaian pengajar pada aspek ${label}.`)),
          }
        }),
        score: seed.score,
        feedback: seed.feedback,
        assessedAt,
        createdAt: assessedAt ?? submittedAt ?? ago(6),
        updatedAt: NOW,
      })
      assessmentIds.set(seed.key, assessmentId)
      if (seed.key === "dwi-bts-1") {
        await ctx.db.patch(assessmentId, {
          overrideReason:
            "Skor disesuaikan setelah peninjauan kedua atas dokumentasi proses.",
          secondReviewerId: admin._id,
        })
      }

      await ctx.db.insert("assessmentEvents", {
        assessmentId,
        submissionId,
        kind: "assign",
        actorId: assessor._id,
        reason: "Penugasan penilaian",
        createdAt: submittedAt ?? ago(6),
      })
      if (assessmentStatus === "completed") {
        await ctx.db.insert("assessmentEvents", {
          assessmentId,
          submissionId,
          kind: seed.status === "revision_requested" ? "revision" : "grade",
          actorId: assessor._id,
          reason: seed.feedback,
          previousState: "submitted",
          nextState: seed.status,
          scoreBefore: 0,
          scoreAfter: seed.score,
          createdAt: assessedAt ?? NOW,
        })
      }
    }

    const disputeAssessment = assessmentIds.get("dwi-bts-2")
    if (disputeAssessment) {
      const dwi = await userByEmail(ctx, seedEmail("dwi"))
      const admin = await seedAdmin(ctx)
      await ctx.db.insert("disputes", {
        subjectType: "assessment",
        subjectId: disputeAssessment,
        openedBy: dwi._id,
        status: "reviewing",
        reason:
          "Saya sudah mengulang pencelupan dengan waktu yang sama. Mohon tinjau ulang catatan pada bagian tepi.",
        assignedTo: admin._id,
        createdAt: ago(4),
        updatedAt: NOW,
      })
    }

    return {
      cohorts: cohortIds.size,
      enrollments: enrollmentIds.size,
      submissions: submissionIds.size,
      assessments: assessmentIds.size,
    }
  },
})

export const seedCredentials = internalMutation({
  args: {},
  handler: async (ctx) => {
    const admin = await seedAdmin(ctx)
    const certificateIds = new Map<string, Id<"certificates">>()

    // Serials follow issue order; the newest certificate is the revoked demo.
    const finals = [
      {
        key: "anisa",
        submissionKey: "anisa-bts-final",
        pathSlug: "batik-tulis-soga",
        teacherEmail: seedEmail("bambang"),
        score: 92,
        issuedDaysAgo: 327,
        serial: "KN-2026-0001",
      },
      {
        key: "dimas",
        submissionKey: "dimas-bts-final",
        pathSlug: "batik-tulis-soga",
        teacherEmail: seedEmail("sri"),
        score: 89,
        issuedDaysAgo: 326,
        serial: "KN-2026-0002",
      },
      {
        key: "purnomo",
        submissionKey: "purnomo-bts-final",
        pathSlug: "batik-tulis-soga",
        teacherEmail: seedEmail("bambang"),
        score: 95,
        issuedDaysAgo: 325,
        serial: "KN-2026-0003",
      },
      {
        key: "rani",
        submissionKey: "rani-pra-final",
        pathSlug: "pranatacara-jawa",
        teacherEmail: seedEmail("widagdo"),
        score: 90,
        issuedDaysAgo: 318,
        serial: "KN-2026-0004",
      },
      {
        key: "galuh",
        submissionKey: "galuh-aks-final",
        pathSlug: "aksara-jawa",
        teacherEmail: seedEmail("suwardi"),
        score: 88,
        issuedDaysAgo: 110,
        serial: "KN-2026-0005",
      },
    ]

    for (const final of finals) {
      const student = await userByEmail(ctx, seedEmail(final.key))
      const path = await pathBySlug(ctx, final.pathSlug)
      const submission = await ctx.db
        .query("submissions")
        .withIndex("by_code", (q) =>
          q.eq("code", `TUG-${final.submissionKey.toUpperCase()}`),
        )
        .unique()
      if (!submission) {
        throw new Error(`Seed submission missing: ${final.submissionKey}`)
      }
      const assessment = await ctx.db
        .query("assessments")
        .withIndex("by_submissionId", (q) =>
          q.eq("submissionId", submission._id),
        )
        .unique()
      if (!assessment) {
        throw new Error(`Seed assessment missing: ${final.submissionKey}`)
      }

      const enrollment = await ctx.db
        .query("enrollments")
        .withIndex("by_studentId", (q) => q.eq("studentId", student._id))
        .collect()
      const completed = enrollment.find(
        (item) => item.pathId === path.slug && item.status === "completed",
      )
      const cohort = completed?.cohortId
        ? await ctx.db.get(completed.cohortId)
        : null
      const teacher =
        (cohort ? await ctx.db.get(cohort.teacherId) : null) ??
        (await userByEmail(ctx, final.teacherEmail))

      const issuedAt = ago(final.issuedDaysAgo)
      const certificateId = await ctx.db.insert("certificates", {
        serial: final.serial,
        publicCode: `KN-${final.key.toUpperCase()}-2026`,
        studentId: student._id,
        pathId: path.slug,
        teacherId: teacher._id,
        assessmentId: assessment._id,
        status: "issued",
        issuedAt,
        snapshot: {
          studentName: student.name,
          pathTitle: path.title,
          teacherName: teacher.name,
          assessmentScore: final.score,
          issuedAt,
        },
        createdAt: issuedAt,
        updatedAt: issuedAt,
      })
      certificateIds.set(final.key, certificateId)

      await ctx.db.insert("certificateEvents", {
        certificateId,
        kind: "issue",
        actorId: teacher._id,
        reason: "Penilaian akhir disetujui",
        createdAt: issuedAt,
      })

      if (completed) {
        await ctx.db.patch(completed._id, { certificateId })
      }
    }

    // A revoked certificate exercises the revocation history in the
    // certificate drawer without leaving a dangling work card.
    const dwi = await userByEmail(ctx, seedEmail("dwi"))
    const dwiSubmission = await ctx.db
      .query("submissions")
      .withIndex("by_code", (q) => q.eq("code", "TUG-DWI-BTS-FINAL"))
      .unique()
    if (dwiSubmission) {
      const dwiAssessment = await ctx.db
        .query("assessments")
        .withIndex("by_submissionId", (q) =>
          q.eq("submissionId", dwiSubmission._id),
        )
        .unique()
      if (dwiAssessment) {
        const path = await pathBySlug(ctx, "batik-tulis-soga")
        const teacher = await userByEmail(
          ctx,
          seedEmail("bambang"),
        )
        const issuedAt = ago(15)
        const revokedAt = ago(5)
        const certificateId = await ctx.db.insert("certificates", {
          serial: "KN-2026-0006",
          publicCode: "KN-DWI-2026",
          studentId: dwi._id,
          pathId: path.slug,
          teacherId: teacher._id,
          assessmentId: dwiAssessment._id,
          status: "revoked",
          issuedAt,
          revokedAt,
          revokeReason:
            "Sertifikat uji alur verifikasi dicabut setelah koreksi ejaan nama.",
          revokedBy: admin._id,
          snapshot: {
            studentName: dwi.name,
            pathTitle: path.title,
            teacherName: teacher.name,
            assessmentScore: dwiAssessment.score ?? 88,
            issuedAt,
          },
          createdAt: issuedAt,
          updatedAt: revokedAt,
        })
        await ctx.db.insert("certificateEvents", {
          certificateId,
          kind: "issue",
          actorId: teacher._id,
          reason: "Penerbitan sertifikat angkatan 1.",
          createdAt: issuedAt,
        })
        await ctx.db.insert("certificateEvents", {
          certificateId,
          kind: "revoke",
          actorId: admin._id,
          reason: "Koreksi nama dan penilaian ulang.",
          createdAt: revokedAt,
        })
      }
    }

    for (const [index, work] of WORKS.entries()) {
      const workDoc = await workBySlug(ctx, work.slug)
      const maker = await userByEmail(ctx, seedEmail(work.makerKey))
      const certificateId = certificateIds.get(work.certificateKey)
      if (!certificateId) {
        throw new Error(`Seed certificate missing: ${work.certificateKey}`)
      }
      await ctx.db.patch(workDoc._id, {
        certificateId,
        makerId: maker._id,
        pathId: work.pathSlug,
        status: "published",
        permission: work.permission,
        createdAt: ago(323 - index * 55),
      })
      await ctx.db.insert("workCards", {
        workId: workDoc._id,
        certificateId,
        makerId: maker._id,
        serial: work.workCard,
        title: work.title,
        technique: work.technique,
        materials:
          work.pathSlug === "batik-tulis-soga"
            ? "Kain primis, malam, pewarna soga alami"
            : work.pathSlug === "aksara-jawa"
              ? "Kertas, tinta, pena, dan penggaris"
              : "Busana adat, perlengkapan acara",
        provenance: work.region,
        permission: work.permission,
        accessLevel: "public",
        status: "published",
        createdAt: ago(323 - index * 55),
        updatedAt: NOW,
      })
    }

    await ctx.db.insert("auditLogs", {
      actorId: admin._id,
      actorRole: "Pengelola",
      action: "certificates.issue",
      entityType: "certificates",
      entityId: certificateIds.get("anisa"),
      reason: "Penerbitan sertifikat angkatan perintis",
      severity: "info",
      createdAt: ago(330),
    })

    return { certificates: certificateIds.size }
  },
})

export const seedCommerce = internalMutation({
  args: {},
  handler: async (ctx) => {
    const admin = await seedAdmin(ctx)
    const orders = [
      {
        key: "order-1",
        code: "KN-2026-000108",
        buyerKey: "sari",
        sellerKey: "anisa",
        workSlug: "batik-soga-anyaman",
        baseAmount: 1_450_000,
        uniqueAmount: 1_450_037,
        status: "completed" as const,
        paidDaysAgo: 24,
        completedDaysAgo: 18,
        paymentStatus: "paid" as const,
        payoutStatus: "approved" as const,
        gatewayFee: 14_500,
      },
      {
        key: "order-2",
        code: "KN-2026-000109",
        buyerKey: "dwi",
        sellerKey: "dimas",
        workSlug: "selendang-canting-nitik",
        baseAmount: 850_000,
        uniqueAmount: 850_014,
        status: "delivered" as const,
        paidDaysAgo: 16,
        completedDaysAgo: undefined,
        paymentStatus: "paid" as const,
        payoutStatus: "paid" as const,
        gatewayFee: 8_500,
      },
      {
        key: "order-3",
        code: "KN-2026-000111",
        buyerKey: "bayu",
        sellerKey: "purnomo",
        workSlug: "batik-soga-lereng",
        baseAmount: 2_900_000,
        uniqueAmount: 2_900_021,
        status: "paid" as const,
        paidDaysAgo: 6,
        completedDaysAgo: undefined,
        paymentStatus: "paid" as const,
        payoutStatus: "held" as const,
        gatewayFee: 29_000,
      },
      {
        key: "order-4",
        code: "KN-2026-000113",
        buyerKey: "nanda",
        sellerKey: "rani",
        workSlug: "pranatacara-siraman",
        baseAmount: 2_500_000,
        uniqueAmount: 2_500_009,
        status: "awaiting_payment" as const,
        paidDaysAgo: undefined,
        createdDaysAgo: 0.005,
        completedDaysAgo: undefined,
        paymentStatus: "pending" as const,
        payoutStatus: undefined,
        gatewayFee: undefined,
      },
      {
        key: "order-5",
        code: "KN-2026-000107",
        buyerKey: "ratih",
        sellerKey: "anisa",
        workSlug: "batik-soga-anyaman",
        baseAmount: 1_450_000,
        uniqueAmount: 1_450_042,
        status: "refunded" as const,
        paidDaysAgo: 40,
        completedDaysAgo: undefined,
        paymentStatus: "refunded" as const,
        payoutStatus: "paid" as const,
        gatewayFee: 14_500,
      },
      {
        key: "order-6",
        code: "KN-2026-000110",
        buyerKey: "yusuf",
        sellerKey: "dimas",
        workSlug: "selendang-canting-nitik",
        baseAmount: 850_000,
        uniqueAmount: 850_033,
        status: "disputed" as const,
        paidDaysAgo: 9,
        completedDaysAgo: undefined,
        paymentStatus: "paid" as const,
        payoutStatus: "held" as const,
        gatewayFee: 8_500,
      },
      {
        key: "order-7",
        code: "KN-2026-000101",
        buyerKey: "dewi",
        sellerKey: "anisa",
        workSlug: "batik-soga-anyaman",
        baseAmount: 1_450_000,
        uniqueAmount: 1_450_058,
        status: "completed" as const,
        paidDaysAgo: 320,
        completedDaysAgo: 310,
        paymentStatus: "paid" as const,
        payoutStatus: "paid" as const,
        gatewayFee: 14_500,
      },
      {
        key: "order-8",
        code: "KN-2026-000102",
        buyerKey: "arif",
        sellerKey: "purnomo",
        workSlug: "batik-soga-lereng",
        baseAmount: 2_900_000,
        uniqueAmount: 2_900_046,
        status: "completed" as const,
        paidDaysAgo: 210,
        completedDaysAgo: 200,
        paymentStatus: "paid" as const,
        payoutStatus: "paid" as const,
        gatewayFee: 29_000,
      },
      {
        key: "order-9",
        code: "KN-2026-000103",
        buyerKey: "melati",
        sellerKey: "rani",
        workSlug: "pranatacara-siraman",
        baseAmount: 2_500_000,
        uniqueAmount: 2_500_072,
        status: "completed" as const,
        paidDaysAgo: 155,
        completedDaysAgo: 148,
        paymentStatus: "paid" as const,
        payoutStatus: "approved" as const,
        gatewayFee: 25_000,
      },
      {
        key: "order-10",
        code: "KN-2026-000104",
        buyerKey: "fajar",
        sellerKey: "dimas",
        workSlug: "selendang-canting-nitik",
        baseAmount: 850_000,
        uniqueAmount: 850_061,
        status: "completed" as const,
        paidDaysAgo: 148,
        completedDaysAgo: 140,
        paymentStatus: "paid" as const,
        payoutStatus: "paid" as const,
        gatewayFee: 8_500,
      },
      {
        key: "order-11",
        code: "KN-2026-000105",
        buyerKey: "ratih",
        sellerKey: "anisa",
        workSlug: "batik-soga-anyaman",
        baseAmount: 1_450_000,
        uniqueAmount: 1_450_083,
        status: "completed" as const,
        paidDaysAgo: 112,
        completedDaysAgo: 104,
        paymentStatus: "paid" as const,
        payoutStatus: "approved" as const,
        gatewayFee: 14_500,
      },
      {
        key: "order-12",
        code: "KN-2026-000106",
        buyerKey: "nanda",
        sellerKey: "dimas",
        workSlug: "selendang-canting-nitik",
        baseAmount: 850_000,
        uniqueAmount: 850_094,
        status: "completed" as const,
        paidDaysAgo: 58,
        completedDaysAgo: 50,
        paymentStatus: "paid" as const,
        payoutStatus: "approved" as const,
        gatewayFee: 8_500,
      },
      {
        key: "order-13",
        code: "KN-2026-000112",
        buyerKey: "melati",
        sellerKey: "galuh",
        workSlug: "jasa-tulis-aksara",
        baseAmount: 275_000,
        uniqueAmount: 275_037,
        status: "completed" as const,
        paidDaysAgo: 2,
        completedDaysAgo: 0.5,
        paymentStatus: "paid" as const,
        payoutStatus: "approved" as const,
        gatewayFee: 2_750,
      },
    ]

    const orderNotes: Record<string, string> = {
      "order-1":
        "Mohon dibungkus kertas bebas asam, kirim ke Mergangsan, Kota Yogyakarta.",
      "order-2":
        "Untuk hadiah pernikahan, mohon sertakan kartu perawatan kain.",
      "order-3":
        "Kirim ke alamat kantor di Mlati, terima Senin–Jumat pukul 09.00–16.00.",
      "order-4":
        "Booking untuk akad 12 Desember 2026, prosesi pagi di Banguntapan.",
      "order-7": "Pesanan pertama, mohon dipotret proses pewarnaan terakhir.",
      "order-8": "Kain untuk dipajang di galeri, mohon sertakan Kartu Karya.",
      "order-9": "Acara keluarga di Kotagede, butuh gladi resik sehari sebelumnya.",
      "order-10": "Hadiah untuk ibu, mohon dibungkus rapi.",
      "order-11": "Pesanan ulang setelah kain pertama dipakai untuk pameran.",
      "order-12": "Warna diminta sedikit lebih terang dari contoh foto.",
      "order-13":
        "Empat puluh undangan, ejaan nama keluarga mohon dicek sebelum ditulis.",
    }

    const orderIds = new Map<string, Id<"orders">>()
    const paymentIds = new Map<string, Id<"payments">>()
    const payoutIds = new Map<string, Id<"payouts">>()
    const saleLedgerIds = new Map<string, Id<"ledgerEntries">>()

    for (const seed of orders) {
      const buyer = await userByEmail(ctx, seedEmail(seed.buyerKey))
      const seller = await userByEmail(ctx, seedEmail(seed.sellerKey))
      const work = await workBySlug(ctx, seed.workSlug)
      const createdAt = ago(
        "createdDaysAgo" in seed && seed.createdDaysAgo !== undefined
          ? seed.createdDaysAgo
          : (seed.paidDaysAgo ?? 2),
      )
      const paidAt =
        seed.paidDaysAgo !== undefined ? ago(seed.paidDaysAgo) : undefined
      // Delivery falls between payment and completion, and never in the future.
      const paidDaysAgo = seed.paidDaysAgo ?? 0
      const deliveredDaysAgo =
        seed.completedDaysAgo !== undefined
          ? Math.min(
              paidDaysAgo,
              Math.max(paidDaysAgo - 3, seed.completedDaysAgo),
            )
          : Math.max(0, paidDaysAgo - 3)
      const orderId = await ctx.db.insert("orders", {
        code: seed.code,
        buyerUserId: buyer._id,
        buyerName: buyer.name,
        buyerEmail: buyer.email,
        buyerWhatsapp: buyer.phone,
        sellerId: seller._id,
        workId: work._id,
        pathId: work.pathId,
        baseAmount: seed.baseAmount,
        uniqueAmount: seed.uniqueAmount,
        status: seed.status,
        channel: "web",
        note:
          orderNotes[seed.key] ??
          (seed.status === "disputed"
            ? "Pembeli meminta peninjauan kondisi kain."
            : undefined),
        tokenHash: await sha256(`seed-order-token-${seed.key}`),
        idempotencyKey: `seed-idem-${seed.key}`,
        consentVersion: "2026-11-transactional",
        consentAt: createdAt,
        claimedAt: createdAt,
        paidAt,
        deliveredAt:
          seed.status === "delivered" || seed.status === "completed"
            ? ago(deliveredDaysAgo)
            : undefined,
        completedAt:
          seed.completedDaysAgo !== undefined
            ? ago(seed.completedDaysAgo)
            : undefined,
        cancelledAt: seed.status === "refunded" ? ago(35) : undefined,
        cancelReason:
          seed.status === "refunded"
            ? "Pembeli membatalkan setelah kain tidak sesuai ukuran."
            : undefined,
        createdAt,
        updatedAt: NOW,
      })
      orderIds.set(seed.key, orderId)

      await ctx.db.insert("orderItems", {
        orderId,
        kind: work.kind === "service" ? "service" : "work",
        refId: work._id,
        pathId: work.pathId,
        title: work.title,
        quantity: 1,
        unitAmount: seed.baseAmount,
        totalAmount: seed.baseAmount,
      })

      const paymentId = await ctx.db.insert("payments", {
        orderId,
        provider: "gopay_qris",
        providerChargeId: `ch_${seed.key.replace("order-", "26")}`,
        providerReference: `QRIS-${seed.code}`,
        providerTransactionId:
          seed.paymentStatus === "paid" || seed.paymentStatus === "refunded"
            ? `trx_${seed.key.replace("order-", "26")}`
            : undefined,
        baseAmount: seed.baseAmount,
        uniqueAmount: seed.uniqueAmount,
        status: seed.paymentStatus,
        expiresAt: createdAt + 15 * 60_000,
        paidAt,
        lastReconciledAt: paidAt,
        gatewayFee: seed.gatewayFee,
        qrString: `00020101021226${seed.code}5802ID`,
        qrImageUrl: undefined,
        reconciliationState: "none",
        settledEventId: paidAt
          ? `evt_settled_${seed.key.replace("order-", "26")}`
          : undefined,
        idempotencyKey: `idem_${seed.key.replace("order-", "26")}`,
        createdAt,
        updatedAt: NOW,
      })
      paymentIds.set(seed.key, paymentId)

      await ctx.db.insert("paymentEvents", {
        eventId: `evt_created_${seed.key.replace("order-", "26")}`,
        paymentId,
        orderId,
        kind: "created",
        amount: seed.uniqueAmount,
        providerReference: `QRIS-${seed.code}`,
        payload: { provider: "gopay_qris", stage: "created" },
        createdAt,
      })
      if (paidAt) {
        await ctx.db.insert("paymentEvents", {
          eventId: `evt_settled_${seed.key.replace("order-", "26")}`,
          paymentId,
          orderId,
          kind: "settled",
          amount: seed.uniqueAmount,
          providerReference: `QRIS-${seed.code}`,
          payload: { provider: "gopay_qris", stage: "settled" },
          createdAt: paidAt,
        })
      }
      if (seed.status === "refunded") {
        await ctx.db.insert("paymentEvents", {
          eventId: `evt_refunded_${seed.key.replace("order-", "26")}`,
          paymentId,
          orderId,
          kind: "refunded",
          amount: seed.uniqueAmount,
          providerReference: `QRIS-${seed.code}`,
          payload: { provider: "gopay_qris", stage: "refunded" },
          createdAt: ago(35),
        })
      }

      if (seed.payoutStatus) {
        const payoutPaidAt =
          seed.payoutStatus === "paid"
            ? seed.key === "order-5"
              ? // The original sale was paid out before the refund reversed it.
                ago(37)
              : seed.completedDaysAgo !== undefined
                ? ago(Math.max(0, seed.completedDaysAgo - 3))
                : paidAt
                  ? paidAt + 7 * DAY
                  : undefined
            : undefined
        const teacherShare = Math.round(seed.baseAmount * 0.7)
        const platformShare = Math.round(seed.baseAmount * 0.15)
        const communityShare =
          seed.baseAmount - teacherShare - platformShare
        const payoutId = await ctx.db.insert("payouts", {
          teacherId: seller._id,
          periodStart: createdAt,
          periodEnd: createdAt + 7 * DAY,
          gross: seed.baseAmount,
          teacherShare,
          platformShare,
          communityShare,
          status: seed.payoutStatus,
          approvedBy:
            seed.payoutStatus === "approved" || seed.payoutStatus === "paid"
              ? admin._id
              : undefined,
          paidAt: payoutPaidAt,
          reason:
            seed.payoutStatus === "held"
              ? "Ditahan sampai pesanan selesai atau sengketa ditutup."
              : undefined,
          orderId,
          paymentId,
          dueAt: createdAt + 7 * DAY,
          kind: "sale",
          holdReason:
            seed.payoutStatus === "held"
              ? "Menunggu penyelesaian pesanan."
              : undefined,
          paidAmount:
            seed.payoutStatus === "paid" ? teacherShare : undefined,
          reference: `PAYOUT-${seed.code}`,
          createdAt: Math.min(NOW - HOUR, createdAt + DAY),
          updatedAt: NOW,
        })
        payoutIds.set(seed.key, payoutId)

        const teacherEntryId = await ctx.db.insert("ledgerEntries", {
          orderId,
          paymentId,
          payoutId,
          teacherId: seller._id,
          account: "teacher",
          direction: "credit",
          amount: teacherShare,
          currency: "IDR",
          entryType: "sale",
          reason: "Bagi hasil pengajar dan pembuat karya 70%",
          createdAt: paidAt ?? createdAt,
        })
        saleLedgerIds.set(seed.key, teacherEntryId)
        await ctx.db.insert("ledgerEntries", {
          orderId,
          paymentId,
          payoutId,
          account: "platform",
          direction: "credit",
          amount: platformShare,
          currency: "IDR",
          entryType: "sale",
          reason: "Operasional platform 15%",
          createdAt: paidAt ?? createdAt,
        })
        await ctx.db.insert("ledgerEntries", {
          orderId,
          paymentId,
          payoutId,
          account: "community",
          direction: "credit",
          amount: communityShare,
          currency: "IDR",
          entryType: "sale",
          reason: "Dana komunitas dan sanggar 15%",
          createdAt: paidAt ?? createdAt,
        })
        if (seed.gatewayFee) {
          await ctx.db.insert("ledgerEntries", {
            orderId,
            paymentId,
            payoutId,
            account: "gateway_fee",
            direction: "debit",
            amount: seed.gatewayFee,
            currency: "IDR",
            entryType: "sale",
            reason: "Biaya gerbang pembayaran",
            createdAt: paidAt ?? createdAt,
          })
        }
        if (seed.payoutStatus === "paid") {
          await ctx.db.insert("ledgerEntries", {
            orderId,
            paymentId,
            payoutId,
            teacherId: seller._id,
            account: "teacher",
            direction: "debit",
            amount: teacherShare,
            currency: "IDR",
            entryType: "payout",
            reason: "Payout dibayarkan ke rekening pengajar",
            createdAt: payoutPaidAt ?? ago(10),
          })
        }
      }
    }

    const refundOrder = orderIds.get("order-5")
    const refundPayment = paymentIds.get("order-5")
    if (refundOrder && refundPayment) {
      const ratih = await userByEmail(ctx, seedEmail("ratih"))
      const refundId = await ctx.db.insert("refunds", {
        orderId: refundOrder,
        paymentId: refundPayment,
        requestedBy: ratih._id,
        amount: 1_450_042,
        reason: "Ukuran kain tidak sesuai deskripsi.",
        status: "paid",
        decidedBy: admin._id,
        decisionReason: "Bukti foto mendukung permintaan pembeli.",
        evidence: "Foto ukuran kain dan percakapan dengan penjual.",
        reviewedAt: ago(36),
        paidAt: ago(35),
        createdAt: ago(38),
        updatedAt: NOW,
      })
      const originalPayout = payoutIds.get("order-5")
      if (originalPayout) {
        const reversalId = await ctx.db.insert("payouts", {
          teacherId: (await userByEmail(ctx, seedEmail("anisa")))._id,
          periodStart: ago(40),
          periodEnd: ago(33),
          gross: -1_450_000,
          teacherShare: -1_015_000,
          platformShare: -217_500,
          communityShare: -217_500,
          status: "paid",
          paidAt: ago(34),
          paidAmount: -1_015_000,
          orderId: refundOrder,
          paymentId: refundPayment,
          kind: "reversal",
          reversalOf: originalPayout,
          reason: "Pembalikan payout setelah refund.",
          createdAt: ago(35),
          updatedAt: NOW,
        })
        await ctx.db.insert("ledgerEntries", {
          orderId: refundOrder,
          paymentId: refundPayment,
          payoutId: reversalId,
          refundId,
          account: "teacher",
          direction: "debit",
          amount: 1_015_000,
          currency: "IDR",
          entryType: "reversal",
          reversalOf: saleLedgerIds.get("order-5"),
          reason: "Pembalikan bagi hasil setelah refund",
          createdAt: ago(35),
        })
        await ctx.db.insert("ledgerEntries", {
          orderId: refundOrder,
          paymentId: refundPayment,
          payoutId: reversalId,
          refundId,
          account: "platform",
          direction: "debit",
          amount: 217_500,
          currency: "IDR",
          entryType: "reversal",
          reason: "Pembalikan bagian platform setelah refund",
          createdAt: ago(35),
        })
        await ctx.db.insert("ledgerEntries", {
          orderId: refundOrder,
          paymentId: refundPayment,
          payoutId: reversalId,
          refundId,
          account: "community",
          direction: "debit",
          amount: 217_500,
          currency: "IDR",
          entryType: "reversal",
          reason: "Pembalikan dana komunitas setelah refund",
          createdAt: ago(35),
        })
      }
    }

    const disputeOrder = orderIds.get("order-6")
    if (disputeOrder) {
      const yusuf = await userByEmail(ctx, seedEmail("yusuf"))
      await ctx.db.insert("disputes", {
        subjectType: "order",
        subjectId: disputeOrder,
        openedBy: yusuf._id,
        status: "open",
        reason:
          "Warna kain lebih gelap dari foto. Saya minta peninjauan sebelum pesanan diselesaikan.",
        createdAt: ago(2),
        updatedAt: NOW,
      })
    }

    return {
      orders: orderIds.size,
      payments: paymentIds.size,
      payouts: payoutIds.size,
    }
  },
})
