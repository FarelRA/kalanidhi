import { v } from "convex/values"

import type { Id } from "../../_generated/dataModel"
import { internalMutation } from "../../_generated/server"
import { pathSlug } from "../lib/codes"
import { createSeedClock, DAY } from "../lib/clock"
import { pathBySlug } from "../lib/lookup"
import { resolveMediaAsset } from "../lib/media"

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
 * Curriculum copy is adapted from two real sources: the Paguyuban Batik Tulis
 * Giriloyo deck (written for cloth) and the aksara Jawa worksheet. Bamboo
 * steps follow Fitinline's batik bambu article and the Krebet village profile;
 * steps the sources do not name are not invented, and anything the platform
 * authored says so in the lesson.
 */
const MODULES: Record<string, SeedModule[]> = {
  [pathSlug("batikBambu")]: [
    {
      title: "Bambu, permukaan keras, garis rapat",
      summary:
        "Modul pembuka, tanpa prasyarat. Mengapa batik bambu berbeda dari batik kain, bambu seperti apa yang layak, dan bagaimana menyiapkan permukaannya sebelum canting dipakai.",
      estimatedMinutes: 105,
      lessons: [
        {
          title: "Apa itu batik bambu",
          kind: "text",
          body: "Batik bambu adalah cara menghias permukaan bambu dengan malam panas sebagai perintang warna. Malam, atau lilin batik, menutup bagian yang ingin tetap terang, bagian yang tidak tertutup menerima pewarna. Setelah warna cukup, malam dilepas dengan air panas, proses yang disebut nglorod. Canting adalah alat pena berisi malam, mbabar berarti mewarnai di atas motif, nembok berarti menutup motif dengan malam, dan mepe berarti mengeringkan. Pada kain, malam meresap ke serat. Pada bambu, permukaan luar lebih keras dan menahan malam di permukaan, sedangkan ujung potong dan serat terbuka menyerap lebih banyak. Karena itu garis di bambu harus rapat dan diperiksa dari arah cahaya miring, bukan dari tembusnya malam ke sisi belakang, tutup dua kali dan uji pada potongan sisa. Kelas ini memakai materi Paguyuban Batik Tulis Giriloyo (2022) yang kami pegang untuk kain, lalu menyesuaikannya untuk bambu dengan rujukan Fitinline (2013), profil Desa Wisata Krebet di Jadesta Kementerian Pariwisata, dan artikel karakteristik batang bambu di Jurnal Hutan Tropis Universitas Mulawarman. Krebet dikenal sebagai desa batik kayu, sebagian pengrajin di sana juga membatik bambu. Urutan kerja kelas ini, pilih bambu, rebus, keringkan, amplas, pola, nglowongi (garis), ngisen-isen (isian), mbabar (warna motif), nembok (tutup motif), warna dasar, nglorod, mepe, finishing, dan periksa. Alat yang dipakai, tidak ada, cukup catatan dan alat tulis. Langkah kerja, 1) baca pelajaran ini, 2) tulis tiga perbedaan kain dan bambu, 3) tulis urutan empat belas langkah di atas dari ingatan. Keselamatan kerja, malam panas dan kompor dibahas di modul alat, jangan mencoba sendiri sebelum alat dan ventilasi siap. Kesalahan umum, mengira malam meresap seperti di kain, lalu membuat garis tipis yang bocor saat diwarnai. Perbaiki dengan menutup garis dua kali dan menguji pada potongan sisa. Tugas, tulis tiga perbedaan, satu alasan mengapa uji potongan bambu wajib, dan urutan empat belas langkah. Kriteria, tiga perbedaan tepat, alasan menyebut ujung potong dan serat terbuka, dan urutan lengkap.",
          estimatedMinutes: 15,
          accessLevel: "public",
          mediaFile: "lesson-bambu-pengertian.webp",
        },
        {
          title: "Memilih bambu yang layak dibatik",
          kind: "text",
          body: "Bambu yang terlalu muda banyak mengandung air dan pati, mudah berjamur, dan berubah bentuk, bambu yang terlalu tua mudah pecah. Artikel karakteristik batang bambu di Jurnal Hutan Tropis Universitas Mulawarman, yang mengutip Troya dan Xu (2014), menyebut batang siap pakai pada umur 3 sampai 5 tahun. Pilih batang yang lurus, kulit bersih, tidak berlubang kumbang, tidak berjamur, dan tidak retak di ruas. Untuk nampan atau panel, siapkan bilah dengan lebar dan panjang sesuai benda kerja, untuk kotak bundar, anyaman bambu lebih mudah dibatik rata. Alat yang dipakai, gergaji atau pisau raut, meteran, kapur penanda, sarung tangan, dan masker. Langkah kerja, 1) periksa rumpun dan pilih batang umur 3 sampai 5 tahun, 2) potong dengan alat tajam, arahkan mata pisau menjauh dari tangan, 3) buang ruas yang retak atau berlubang, 4) potong menjadi bilah sesuai ukuran, lalu beri label tanggal dan asal, 5) catat tebal bilah karena tebal menentukan lama perebusan dan pengeringan. Keselamatan kerja, sarung tangan untuk serpihan, masker saat memotong, dan alas kaki tertutup. Jangan memotong bambu yang ditopang lutut. Kesalahan umum, memilih bambu hijau karena mudah dipotong, gejalanya bercak hijau dan bau asam setelah beberapa hari. Perbaiki dengan mengganti bilah, bukan menutupinya dengan cat. Tugas, pilih tiga batang, tolak satu dengan alasan tertulis, foto dan catat umur serta ukuran. Kriteria, tiga catatan lengkap dan satu penolakan beralasan.",
          estimatedMinutes: 20,
          accessLevel: "public",
        },
        {
          title: "Merebus dan mengeringkan bambu",
          kind: "text",
          body: "Perebusan bertujuan membuang pati dan getah yang membuat bambu mudah diserang serangga dan gagal saat dilapisi (Fitinline, 2013). Setelah direbus, bambu dijemur benar-benar kering agar mudah diamplas dan tidak berjamur. Alat yang dipakai, panci atau drum yang cukup besar, sumber api, penahan panas, sarung tangan tahan panas, penjepit, tempat penirisan, dan rak berventilasi. Langkah kerja, 1) potong bambu sesuai ukuran kerja, 2) isi wadah sampai bilah terendam seluruhnya, lalu didihkan, 3) rebus 30 sampai 60 menit sebagai titik awal untuk bilah tipis, lebih lama untuk bilah tebal, sumber tidak memberi durasi tetap, jadi catat waktu mulai dan selesai versimu. Air harus mendidih dan seluruh bilah terendam, balik bila perlu. Untuk bambu tanpa pelapis, sebagian perajin menambahkan boraks atau asam borat sesuai petunjuk kemasan untuk membantu membuang pati dan mencegah jamur, ini pilihan, bukan keharusan, 4) angkat dengan penjepit, tiriskan, lalu jemur di tempat teduh dan berangin, bukan di bawah matahari langsung, 5) balik secara berkala dan hentikan penjemuran ketika permukaan tidak lembap, warna merata, dan tidak ada bercak. Timbang bilah sebelum dan sesudah untuk memastikan beratnya stabil. Keselamatan kerja, air mendidih, uap, dan api, kerjakan di luar ruangan atau dengan ventilasi paksa, pakai sarung tangan, jangan menambah air ke wadah berminyak, dan jauhkan anak-anak. Kesalahan umum, menumpuk bilah basah sehingga berjamur, atau menjemur terlalu panas sampai retak. Perbaiki dengan membuka tumpukan dan memindahkan ke tempat teduh. Tugas, rebus dan keringkan tiga bilah, catat waktu serta kondisi awal dan akhir. Kriteria, tiga bilah kering, tidak berjamur, dan tidak retak.",
          estimatedMinutes: 25,
          accessLevel: "enrolled",
        },
        {
          title: "Mengamplas dan memeriksa permukaan",
          kind: "text",
          body: "Permukaan bambu yang kasar membuat malam tidak menempel rata, serat yang terangkat juga membuat garis canting melebar. Mengamplas searah serat, lalu membersihkan debu, adalah pekerjaan yang menentukan hasil semua modul berikutnya. Alat yang dipakai, amplas kasar dan halus, balok pengganjal, kain kering, masker debu, kacamata pelindung, dan sarung tangan. Langkah kerja, 1) mulai dari amplas kasar pada bagian yang kasar atau bekas pisau, 2) lanjutkan ke amplas halus searah serat, jangan memutar, 3) usap debu dengan kain kering, jangan meniup dengan mulut, 4) periksa di bawah cahaya miring, 5) tandai bagian yang masih kasar dengan pensil ringan, lalu ulangi. Keselamatan kerja, debu bambu dapat mengiritasi saluran napas, jadi pakai masker dan kerjakan di ruang berangin, jangan mengamplas di dekat makanan atau anak-anak. Kesalahan umum, mengamplas melawan serat sehingga muncul goresan dalam, atau membiarkan debu di pori sehingga malam menggelembung. Perbaiki goresan dengan amplas halus, dan bersihkan debu sebelum membatik. Tugas, amplas satu bilah 30 cm, unggah foto sebelum dan sesudah serta foto permukaan setelah diusap. Kriteria, permukaan rata, tidak ada goresan melawan serat, dan tidak ada debu yang menempel di kain uji.",
          estimatedMinutes: 25,
          accessLevel: "enrolled",
        },
        {
          title: "Alat, bahan, dan meja kerja",
          kind: "text",
          body: "Alat dan bahan menentukan apakah malam bisa mengalir stabil. Canting punya tiga bagian, nyamplung sebagai wadah malam, cucuk sebagai corong, dan pegangan. Wajan kecil menampung malam di atas kompor, gawangan atau rak penopang menjaga bambu tetap datar dan tidak menyentuh meja. Alat yang dipakai, satu canting halus, satu canting sedang, wajan kecil, kompor, gawangan atau rak penopang, pensil, penghapus, kuas untuk colet, kain perca untuk uji, dan penjepit. Bahan yang dipakai, malam, pewarna, sarung tangan, masker, dan celemek. Jangan memakai canting yang cucuknya bengkok. Langkah kerja, 1) letakkan kompor di permukaan stabil dan jauh dari kain, 2) isi wajan dengan malam secukupnya, jangan sampai meluap, 3) panaskan dengan api kecil, 4) uji aliran pada kain perca atau potongan bambu sisa, 5) susun alat dalam jangkauan tangan, dan letakkan wadah air dingin untuk pertolongan pertama luka bakar. Keselamatan kerja, ruang berangin, jangan tinggalkan malam panas tanpa pengawasan, jangan meniup cucuk yang panas, dan jangan menyiram api malam dengan air, tutup wajan untuk memadamkan. Kesalahan umum, api terlalu besar sampai malam berasap dan menghitam, atau canting tersumbat karena malam dingin. Perbaiki dengan menurunkan api dan membersihkan cucuk dengan peniti secara hati-hati. Tugas, foto meja kerja dan isi daftar periksa 10 butir. Kriteria, 10 dari 10 butir terpenuhi.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
          mediaFile: "lesson-bambu-alat.webp",
        },
      ],
    },
    {
      title: "Pola, memindahkan motif Giriloyo ke bambu",
      summary:
        "Prasyarat, modul 1. Mengenal motif, menggambar dengan pensil, membagi bidang, dan menyesuaikan pola pada permukaan datar, lengkung, atau anyaman.",
      estimatedMinutes: 95,
      lessons: [
        {
          title: "Motif Giriloyo yang bisa dipindahkan",
          kind: "text",
          body: "Motif adalah bahasa bentuk. Materi Giriloyo yang kami pegang menyebut delapan motif larangan Keraton Yogyakarta, Huk, Kawung Alit Gurdha, Parang Klithik, Parang Barong, Parang Gendreh, Parang Rusak Barong, Semen Ageng Sawat Gurdha, dan Rujak Senthe, beserta status larangannya. Sumber tidak menjelaskan aturan pemakaian, karena itu kelas ini tidak mengajarkannya sebagai pola siap pakai. Nama bentuk lain yang dipakai di kelas, seperti parang dan kawung, adalah contoh bentuk umum, bukan kutipan daftar sumber. Cecek adalah titik kecil rapat, isen-isen adalah isian yang membuat bidang lebih hidup. Pilih motif geometris sederhana untuk latihan bambu, dan jangan memakai motif sakral sebagai hiasan sembarangan. Alat yang dipakai, pensil, kertas, dan penggaris. Langkah kerja, 1) pilih dua motif geometris, 2) jiplak bentuknya di kertas, 3) tulis nama dan asal motif, 4) tandai bagian yang akan diulang. Keselamatan kerja, tidak ada alat panas, gunakan pensil yang tidak tajam. Kesalahan umum, menyalin motif terlalu rapat sehingga garis canting menyatu, atau menganggap semua motif boleh dipakai. Perbaiki dengan menyederhanakan ulangan. Tugas, tulis delapan nama motif larangan dan dua contoh bentuk umum yang dipakai di kelas. Kriteria, 7 dari 8 benar dan dua motif latihan diberi nama.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Mola, menggambar pola di bambu",
          kind: "text",
          body: "Mola berarti membuat desain dengan pensil sebelum malam diteteskan. Di bambu, garis pensil hanya menjadi pemandu, karena permukaannya tidak menyerap, garis harus tipis dan tidak menekan. Arah serat bambu juga menentukan, garis yang mengikuti serat lebih mudah rapi daripada garis yang memotong serat. Alat yang dipakai, pensil 2B atau lebih keras, penghapus lunak, penggaris, kertas pola, dan bilah bambu yang sudah diamplas. Langkah kerja, 1) bersihkan permukaan dari debu, 2) tentukan titik tengah benda kerja, 3) gambar satu ulangan motif utuh dengan tekanan ringan, 4) periksa proporsi dari jarak satu langkah, 5) hapus garis bantu sebelum membatik. Foto pada pelajaran ini menunjukkan tangan menggambar pola di atas silinder bambu yang sudah dibalut kertas. Keselamatan kerja, pensil dan penggaris tidak panas, tetapi jagalah ujung penggaris agar tidak melukai tangan. Kesalahan umum, garis terlalu tebal sehingga tidak bisa dihapus dan mengganggu warna, atau motif keluar dari bidang. Perbaiki dengan mengulang pola di kertas sebelum menyentuh bambu. Tugas, salin satu ulangan motif pada bilah 20 x 30 cm. Kriteria, proporsi mirip, garis tipis, dan tidak ada garis bantu yang tertinggal.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
          mediaFile: "lesson-mola.webp",
        },
        {
          title: "Bidang kerja, ulangan, dan raport",
          kind: "text",
          body: "Bidang kerja adalah area yang benar-benar dibatik, ulangan adalah satu unit motif yang diulang, raport adalah kotak bantu berukuran sama untuk menjaga ulangan tetap sejajar. Menentukan ketiganya sebelum menggambar mencegah motif terpotong di tepi nampan. Alat yang dipakai, penggaris, kertas, pensil, dan benda kerja. Langkah kerja, 1) ukur bidang kerja dan sisakan tepi sekitar satu sentimeter agar motif tidak jatuh di lengkung, 2) buat kotak raport di kertas, 3) gambar satu ulangan di dalam kotak, 4) jiplak ke titik ulang berikutnya, 5) periksa sambungan dengan melipat kertas. Untuk nampan bulat, bagi bidang menjadi empat atau delapan bagian yang sama. Keselamatan kerja, tidak ada bahan panas. Kesalahan umum, titik ulang bergeser sedikit demi sedikit sehingga motif miring di ujung, atau ulangan terlalu besar sampai terpotong. Perbaiki dengan membuat raport baru dan mengukur ulang dari titik tengah. Tugas, buat tiga kotak raport 10 x 10 cm dan satu denah bidang nampan. Kriteria, tiga kotak sama ukuran, denah menunjukkan tepi aman, dan ulangan tidak terpotong.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
          mediaFile: "lesson-bambu-bidang.webp",
        },
        {
          title: "Pola pada bidang lengkung dan anyaman",
          kind: "text",
          body: "Bidang bambu tidak selalu datar. Nampan punya bibir melengkung, anyaman punya celah, dan panel punya rusuk. Pola yang sama bisa berubah bentuk saat dipindahkan ke bidang lengkung, jadi ukur keliling dan gambar pola di kertas yang mengikuti bidang. Alat yang dipakai, kertas lunak, pensil, selotip kertas, dan gunting. Langkah kerja, 1) tentukan jenis bidang, datar, lengkung, atau anyaman, 2) untuk bidang lengkung, tempelkan kertas lalu jiplak bentuknya, 3) gambar ulangan di kertas itu, bukan di kertas datar, 4) potong dan coba pasang tanpa lem, 5) pindahkan garis ke bambu dengan tekanan ringan. Pada anyaman, hindari garis panjang yang melintasi celah karena malam akan jatuh ke bawah. Keselamatan kerja, gunting tajam, arahkan menjauh dari tangan. Kesalahan umum, pola terlihat miring setelah dipasang, atau garis patah di celah anyaman. Perbaiki dengan membagi pola menjadi bagian kecil yang mengikuti rusuk. Tugas, bungkus satu nampan dengan kertas pola dan unggah foto pola terpasang. Kriteria, pola mengikuti lengkung, tidak terpotong, dan garis tidak melintasi celah anyaman tanpa penopang.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
          mediaFile: "lesson-bambu-lengkung.webp",
        },
        {
          title: "Latihan pola",
          kind: "practice",
          body: "Latihan ini menyatukan pilihan motif, mola, dan pembagian bidang pada benda kerja sungguhan. Pilih satu motif geometris sederhana, misalnya parang sederhana atau kawung, lalu gambar satu ulangan yang bersambung ke tepi bidang. Alat yang dipakai, bilah atau nampan yang sudah kering dan diamplas, pensil, penghapus, penggaris, dan kertas pola. Langkah kerja, 1) siapkan benda kerja dan bersihkan debu, 2) tempelkan pola kertas bila bidang lengkung, 3) gambar satu ulangan utuh, 4) ulangi ke dua titik berikutnya, 5) periksa dari jarak satu langkah dan dari arah cahaya miring. Keselamatan kerja, tidak ada bahan panas pada tahap ini, jauhkan benda kerja dari lantai basah. Kesalahan umum, langsung menggambar seluruh bidang tanpa satu ulangan yang benar, atau menghapus garis dengan keras sampai serat rusak. Perbaiki dengan berhenti setelah satu ulangan dan memeriksanya bersama pengajar. Tugas, unggah foto keseluruhan dan satu foto detail pola. Kriteria, motif terbaca, ulangan bersambung, proporsi wajar, dan permukaan tidak rusak karena penghapus.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
          mediaFile: "lesson-bambu-latihan-pola.webp",
        },
      ],
    },
    {
      title: "Canting di permukaan bambu",
      summary:
        "Prasyarat, modul 1 dan 2. Nglowongi, ngisen-isen, dan menutup celah pada bambu, garis rapat tanpa mengharapkan malam meresap seperti di kain.",
      estimatedMinutes: 120,
      lessons: [
        {
          title: "Nglowongi, garis malam pertama",
          kind: "text",
          body: "Nglowongi adalah pelilitan malam tahap pertama, mengikuti garis pensil dengan canting. Di kain, malam harus menembus sisi belakang, di bambu, malam menempel di permukaan dan ujung potong menyerap lebih banyak, sehingga pemeriksaan dilakukan dari kilap dan kerapatan garis, bukan dari tembusnya malam. Garis yang tipis atau terputus akan bocor saat diwarnai. Alat yang dipakai, canting, malam, wajan dan kompor, potongan bambu untuk uji, serta lampu yang bisa dimiringkan. Langkah kerja, 1) panaskan malam dengan api kecil, 2) uji aliran pada potongan bambu sisa, 3) pegang canting seperti pensil dan mulai dari garis lurus pendek, 4) lanjutkan ke lengkung dengan kecepatan tetap, 5) periksa dari arah cahaya miring, tandai bagian yang tipis. Foto pada pelajaran ini menunjukkan ujung canting meneteskan malam pada garis di atas anyaman bambu. Keselamatan kerja, malam panas, api, dan uap, pakai sarung tangan dan kerjakan di ruang berangin. Kesalahan umum, malam terlalu panas sampai melebar, atau terlalu dingin sampai menggumpal dan putus. Perbaiki dengan menurunkan atau menaikkan api sedikit, lalu uji lagi di potongan sisa. Tugas, melilin garis lurus 20 cm dan satu lengkung, unggah foto dua arah cahaya. Kriteria, garis tidak putus, tidak melebar, dan tidak ada bagian mengkilap yang tipis.",
          estimatedMinutes: 25,
          accessLevel: "enrolled",
          mediaFile: "lesson-canting.webp",
        },
        {
          title: "Menutup celah garis",
          kind: "text",
          body: "Nerusi adalah istilah kain, melilin sisi belakang kain pada bagian yang belum tertembus canting, sehingga malam menembus sampai dua sisi. Istilah itu tidak dipakai sebagai langkah bambu karena bambu tidak punya sisi belakang kain yang perlu ditembus. Pada bambu, pekerjaan yang setara disebut menutup celah, merapikan tepi garis dan pori yang belum tertutup agar warna tidak bocor. Alat yang dipakai, canting, malam, wajan, kompor, dan kain bersih untuk menyerap malam berlebih. Langkah kerja, 1) tunggu garis pertama dingin, 2) periksa celah di bawah cahaya miring, 3) tambahkan malam tipis pada celah, jangan sekali tebal, 4) ulangi pemeriksaan setelah dingin, 5) buang serpihan malam dengan hati-hati. Keselamatan kerja, ujung canting tetap panas walau malam di wadah tidak mendidih, jangan menyentuhnya. Kesalahan umum, menumpuk malam terlalu tebal sehingga garis melebar dan retak saat kering. Perbaiki dengan mengerok tipis memakai alat tumpul, lalu menutup ulang. Tugas, tutup lima sentimeter garis yang sudah dililin dan periksa dari dua arah cahaya. Kriteria, tidak ada celah, garis tidak melebar, dan permukaan tidak retak.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
          mediaFile: "lesson-bambu-celah.webp",
        },
        {
          title: "Ngisen-isen, isian pada bambu",
          kind: "text",
          body: "Ngisen-isen adalah mengisi bidang kosong supaya motif lebih kaya, bukan menambah motif baru di atasnya. Isian dapat berupa titik cecek atau garis pendek rapat. Pada bambu, jarak titik harus tetap karena permukaan yang keras membuat malam mudah menggumpal di satu titik. Alat yang dipakai, canting halus, malam, penggaris, dan potongan bambu latihan. Langkah kerja, 1) pilih satu bidang kosong, 2) tentukan arah isian mengikuti serat, 3) buat deret titik lima sentimeter dengan jarak tetap, 4) bandingkan dengan deret berikutnya, 5) berhenti sebelum bidang terlihat penuh. Keselamatan kerja, sama seperti membatik, jangan mengisi sambil berdiri di lantai licin. Kesalahan umum, titik saling menempel sehingga menjadi garis tebal, atau isian memenuhi seluruh bidang sampai motif utama tenggelam. Perbaiki dengan mengurangi jumlah titik dan menjaga jarak. Tugas, unggah lembar latihan tiga baris isian pada potongan bambu. Kriteria, jarak titik konsisten, garis pendek rapi, dan motif utama tetap terbaca.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
          mediaFile: "lesson-bambu-isen.webp",
        },
        {
          title: "Memegang canting dan berhenti dengan bersih",
          kind: "practice",
          body: "Keterampilan memegang canting lebih menentukan daripada kerumitan motif. Pegang seperti pensil, dengan siku ditopang meja agar gerak stabil. Mulai dan berhenti dengan mengangkat canting perlahan supaya tidak ada ekor malam. Alat yang dipakai, canting, malam, wajan, kompor, potongan bambu, dan kain perca. Langkah kerja, 1) panaskan malam dan uji aliran, 2) buat enam baris lurus pendek, 3) buat enam lengkung, 4) akhiri setiap garis dengan mengangkat canting perlahan, 5) periksa ujung garis, lalu ulangi yang paling buruk. Keselamatan kerja, jangan meniup cucuk untuk mempercepat aliran, uap malam bisa mengiritasi. Jangan meninggalkan kompor menyala. Kesalahan umum, menekan canting terlalu kuat sampai malam meluap, atau berhenti mendadak sehingga ada tetesan. Perbaiki dengan mengurangi tekanan dan mengangkat perlahan. Tugas, unggah enam baris latihan di potongan bambu. Kriteria, enam bentuk bersih, tidak ada cabang tak sengaja, dan ujung garis tidak menetes.",
          estimatedMinutes: 25,
          accessLevel: "enrolled",
          mediaFile: "lesson-bambu-canting-pegangan.webp",
        },
        {
          title: "Latihan nglowongi dan menutup celah",
          kind: "practice",
          body: "Latihan ini menggabungkan nglowongi dan menutup celah pada satu pola utuh. Tujuannya bukan kecepatan, tetapi memastikan setiap garis tertutup sebelum warna masuk. Alat yang dipakai, benda kerja berpola, canting, malam, wajan, kompor, dan lampu miring. Langkah kerja, 1) mulai dari garis utama, lalu isian, 2) periksa seluruh garis dari arah cahaya miring, 3) tutup celah dengan malam tipis, 4) uji satu sudut kecil dengan pewarna pada potongan sisa, 5) perbaiki bagian yang bocor sebelum melanjutkan. Keselamatan kerja, jangan menumpuk benda kerja yang masih panas, letakkan di rak tahan panas. Kesalahan umum, langsung memberi warna sebelum malam dingin, atau melewatkan garis di tepi lengkung. Perbaiki dengan menunggu dingin dan memeriksa per bagian. Tugas, unggah benda kerja setelah nglowongi dan menutup celah. Kriteria, semua garis tertutup, tidak ada malam yang melebar, dan uji warna tidak menembus bagian bermalam.",
          estimatedMinutes: 30,
          accessLevel: "enrolled",
          mediaFile: "lesson-bambu-latihan-garis.webp",
        },
      ],
    },
    {
      title: "Warna pertama dan tutup motif",
      summary:
        "Prasyarat, modul 3. Mbabar, menutup motif dengan malam, memberi warna dasar, dan memilih colet atau celup untuk permukaan bambu.",
      estimatedMinutes: 100,
      lessons: [
        {
          title: "Mbabar, warna pertama pada bambu",
          kind: "text",
          body: "Mbabar berarti mewarnai setelah malam selesai. Materi Giriloyo memakai istilah ini untuk mencelup kain, pada bambu, sumber tidak menentukan apakah warna disemprot, dicolet, atau dicelup, jadi kelas ini membuka kedua cara, colet untuk bidang sempit dan celup untuk benda kerja kecil, lalu kamu memilih satu cara yang paling terkendali. Warna pertama adalah warna motif yang nanti ditutup malam. Soga adalah sebutan warna cokelat dari kulit tingi dan jambal yang dipakai di Giriloyo, di kelas ini kamu boleh memakai pewarna sintetis atau alami, dan istilah soga hanya menunjukkan arah warna, bukan keharusan bahan. Alat yang dipakai, pewarna, kuas atau spons, wadah, sarung tangan, masker, dan potongan uji. Langkah kerja, 1) uji warna pada potongan sisa, 2) beri warna tipis merata, jangan menggenang, 3) keringkan di tempat teduh, 4) periksa apakah warna masuk ke bagian bermalam, 5) catat takaran dan waktu. Keselamatan kerja, sarung tangan dan ventilasi, jangan mencampur pewarna di wadah makanan. Kesalahan umum, warna menumpuk di serat atau merembes di bawah malam yang tipis. Perbaiki dengan mengurangi larutan dan menutup ulang malam. Tugas, warnai satu bilah latihan satu warna, unggah foto sebelum dan sesudah. Kriteria, warna rata, malam tidak rusak, dan tidak ada rembesan di garis.",
          estimatedMinutes: 25,
          accessLevel: "enrolled",
          mediaFile: "lesson-bambu-mbabar.webp",
        },
        {
          title: "Nembok, menutup motif dengan malam",
          kind: "text",
          body: "Setelah warna motif kering, motif itu harus ditutup malam agar warna dasar tidak mengubahnya (Fitinline, 2013). Langkah ini disebut nembok, menutup bagian yang sudah berwarna, bukan nglowongi ulang seluruh bidang. Alat yang dipakai, canting sedang, malam, wajan, kompor, dan kuas bersih. Langkah kerja, 1) pastikan warna benar-benar kering, 2) tutup seluruh bidang berwarna dengan malam, mulai dari tepi, 3) periksa celah di bawah cahaya miring, 4) tambahkan malam pada celah, 5) biarkan dingin sebelum warna dasar. Keselamatan kerja, jangan memanaskan benda kerja yang masih basah, uap pelarut bisa mengiritasi. Kesalahan umum, menutup terlalu cepat saat warna masih basah sehingga malam tidak menempel, atau meninggalkan celah di tepi motif. Perbaiki dengan mengeringkan lebih lama dan menutup ulang. Tugas, tutup satu motif berwarna dan unggah foto. Kriteria, seluruh bidang berwarna tertutup, tidak ada celah, dan warna di bawahnya tidak berubah.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
          mediaFile: "lesson-bambu-nembok.webp",
        },
        {
          title: "Warna dasar",
          kind: "text",
          body: "Warna dasar adalah warna yang mengisi bagian yang tidak ditutup malam. Setelah warna dasar, kontras antara motif dan latar terlihat. Pilih warna dasar yang lebih gelap atau lebih terang dari warna motif, lalu uji pada potongan sisa. Alat yang dipakai, pewarna, kuas, sarung tangan, masker, dan wadah. Langkah kerja, 1) bersihkan permukaan dari sisa malam, 2) uji warna pada potongan, 3) beri warna dasar tipis merata, 4) ulangi setelah kering bila perlu, 5) periksa tepi malam, pastikan tidak ada rembesan. Keselamatan kerja, ventilasi dan sarung tangan, jauhkan pewarna dari mata. Kesalahan umum, warna dasar terlalu pekat sampai menutupi tekstur bambu, atau terlalu encer sampai belang. Perbaiki dengan mengulang tipis, bukan sekali tebal. Tugas, beri warna dasar pada benda kerja dan unggah foto. Kriteria, warna rata, kontras motif terbaca, dan tidak ada rembesan di bawah malam.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
          mediaFile: "lesson-bambu-warna-dasar.webp",
        },
        {
          title: "Colet atau celup untuk bambu",
          kind: "text",
          body: "Colet memakai kuas atau spons dan cocok untuk bidang kecil, anyaman, serta motif yang perlu dua warna berdampingan. Celup merendam seluruh benda dan memberi warna merata, tetapi bambu mengapung dan air bisa masuk ke celah anyaman. Sumber hanya menyebut bahwa bambu diwarnai sesuai kehendak, tanpa memilih teknik, pemilihan colet sebagai teknik utama adalah keputusan platform untuk latihan ini. Alat yang dipakai, kuas, spons, wadah, dan pemberat bersih bila mencoba celup. Langkah kerja, 1) pilih teknik berdasarkan bentuk benda, 2) tulis alasan dalam dua kalimat, 3) uji pada potongan sisa, 4) kerjakan pada benda kerja, 5) catat hasilnya. Keselamatan kerja, sarung tangan dan ventilasi. Kesalahan umum, mencelup anyaman tanpa pemberat sehingga warna tidak rata, atau mencolet terlalu basah sampai menetes. Perbaiki dengan mengeringkan dan mengulang tipis. Tugas, pilih satu teknik dan tulis alasannya. Kriteria, pilihan masuk akal untuk bentuk benda dan hasil uji terlihat.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
        },
        {
          title: "Latihan dua warna",
          kind: "practice",
          body: "Latihan dua warna menguji apakah malam benar-benar menahan warna pertama saat warna kedua masuk. Pilih dua warna yang kontras, misalnya cokelat dan biru, lalu kerjakan pada satu bidang kecil. Alat yang dipakai, dua pewarna, kuas, malam, canting, dan potongan uji. Langkah kerja, 1) warnai motif dengan warna pertama, 2) keringkan, 3) tutup motif dengan malam, 4) beri warna dasar, 5) nglorod pada modul berikutnya, lalu periksa hasilnya. Keselamatan kerja, jangan mencampur wadah warna, beri label. Kesalahan umum, warna kedua merembes karena malam tipis, atau warna pertama pudar karena terlalu banyak air. Perbaiki dengan menutup malam lebih rapat dan mengurangi air. Tugas, unggah benda kerja dua warna sebelum nglorod. Kriteria, dua warna terpisah jelas, tidak ada rembesan, dan malam tetap utuh.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
          mediaFile: "lesson-bambu-dua-warna.webp",
        },
      ],
    },
    {
      title: "Nglorod, finishing, dan mutu",
      summary:
        "Prasyarat, modul 4. Melepas malam dengan air panas, mengeringkan, melapisi permukaan, dan memeriksa produk sebelum difoto untuk Kartu Karya.",
      estimatedMinutes: 100,
      lessons: [
        {
          title: "Nglorod, melepas malam",
          kind: "text",
          body: "Nglorod adalah melepas malam dengan air panas (Fitinline, 2013). Malam yang mencair akan mengapung, lalu permukaan diangkat dan diperiksa. Alat yang dipakai, wadah besar, air, sumber api, penjepit, sarung tangan tahan panas, dan tempat penirisan. Langkah kerja, 1) didihkan air yang cukup untuk merendam benda, 2) masukkan benda dengan penjepit, jangan dengan tangan, 3) aduk perlahan sampai malam lepas, 4) angkat dan tiriskan, 5) periksa sisa malam, ulangi bila perlu. Mulai dari 5 sampai 10 menit, ulangi bila malam masih melekat. Sumber tidak memberi durasi tetap, jadi catat versimu. Keselamatan kerja, air mendidih dan malam panas, kerjakan di luar ruangan atau dengan ventilasi paksa, pakai sarung tangan, jangan menambah air ke wadah berminyak. Jangan membuang malam panas ke saluran air. Kesalahan umum, air tidak cukup panas sehingga malam hanya berpindah, atau benda terlalu lama sehingga permukaan berubah. Perbaiki dengan mengganti air panas dan mengulang sebentar. Tugas, unggah foto proses dan catat suhu serta waktu versimu. Kriteria, malam lepas dari seluruh bidang dan prosedur keselamatan terlihat.",
          estimatedMinutes: 25,
          accessLevel: "enrolled",
          mediaFile: "lesson-bambu-nglorod.webp",
        },
        {
          title: "Mepe dan memeriksa sisa malam",
          kind: "text",
          body: "Mepe berarti mengeringkan setelah sisa malam dibersihkan. Pada bambu, jangan merendam lama, cukup bilas atau usap dengan kain lembap sampai sisa malam hilang, lalu keringkan di tempat teduh. Sisa malam terlihat sebagai bercak putih atau permukaan yang terasa lengket. Alat yang dipakai, kain lembut, air bersih, sikat halus, dan rak berangin. Langkah kerja, 1) bilas atau usap sisa malam, 2) sikat pelan searah serat, 3) keringkan di tempat teduh, 4) balik agar kedua sisi kering, 5) periksa bercak di bawah cahaya miring. Keselamatan kerja, lantai sekitar wadah bisa licin karena malam, seka segera. Kesalahan umum, menjemur di bawah matahari langsung sampai bambu retak, atau meninggalkan sisa malam di celah anyaman. Perbaiki dengan mengeringkan di tempat teduh dan menyikat halus. Tugas, unggah foto benda basah dan kering. Kriteria, tidak ada bercak malam, permukaan kering rata, dan tidak retak.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
          mediaFile: "lesson-bambu-mepe.webp",
        },
        {
          title: "Finishing dan pelapisan",
          kind: "text",
          body: "Finishing melindungi warna dan memudahkan perawatan. Fitinline menyebut pelapisan sistem NC untuk produk batik bambu agar mudah dibersihkan tanpa air tanpa merusak warna. Ikuti petunjuk pada kemasan bahan yang kamu pakai, jangan mencampur merek atau menambah pelarut tanpa petunjuk. Alat yang dipakai, pelapis NC, kuas bersih, wadah, respirator organik tipe A, sarung tangan, kacamata, dan potongan uji. Langkah kerja, 1) pastikan permukaan benar-benar kering, 2) uji pada potongan sisa, 3) aplikasikan lapisan tipis merata, 4) keringkan sesuai petunjuk kemasan, 5) ulangi tipis bila perlu. Keselamatan kerja, pelapis dan pelarut mudah terbakar serta beruap, kerjakan di luar ruangan atau dengan ventilasi paksa, jauh dari api dan percikan listrik, pakai respirator organik tipe A dan sarung tangan. Pelapis NC untuk dekorasi, jangan dipakai pada wadah makanan kecuali produsen menyatakan aman kontak pangan. Kesalahan umum, lapisan terlalu tebal sehingga menetes dan menutupi motif, atau dikerjakan saat lembap sehingga keruh. Perbaiki dengan mengeringkan dan mengamplas tipis bagian yang menetes sebelum melapisi ulang. Tugas, buat papan uji tiga lapisan tipis dan unggah fotonya. Kriteria, lapisan rata, tidak menetes, dan warna tidak berubah.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
          mediaFile: "lesson-bambu-finishing.webp",
        },
        {
          title: "Memeriksa mutu produk",
          kind: "text",
          body: "Pemeriksaan mutu dilakukan sebelum produk difoto untuk Kartu Karya. Periksa bentuk, permukaan, warna, motif, sisa malam, dan pelapisan. Alat yang dipakai, lampu, kain bersih, penggaris, dan daftar periksa. Langkah kerja, 1) periksa bentuk, tidak melengkung atau retak, 2) periksa permukaan, tidak ada serat terangkat, 3) periksa warna, rata dan tidak belang, 4) periksa motif, garis tertutup dan ulangan sejajar, 5) periksa sisa malam dan lapisan. Nilai sendiri sebelum pengajar menilai, lalu bandingkan selisihnya. Keselamatan kerja, tidak ada bahan panas pada tahap ini. Kesalahan umum, hanya melihat dari satu arah cahaya, atau menilai dari foto kecil. Perbaiki dengan memeriksa di bawah cahaya miring dan dari dua sisi. Tugas, unggah produk jadi dan penilaian diri enam butir. Kriteria, 5 dari 6 butir terpenuhi dan selisih nilai diri tidak lebih dari satu tingkat.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
          mediaFile: "lesson-bambu-mutu.webp",
        },
        {
          title: "Keselamatan kerja dan limbah",
          kind: "text",
          body: "Keselamatan kerja berlaku dari merebus sampai melapisi. Keselamatan kerja, risiko utamanya air mendidih, malam panas, api kompor, alat tajam, debu amplas, dan uap pelarut. Alat yang dipakai, sarung tangan tahan panas, masker debu, masker organik untuk pelapis, kacamata, celemek, dan alas kaki tertutup. Langkah kerja, 1) tata meja jauh dari jangkauan anak, 2) nyalakan api kecil dan jangan tinggalkan, 3) sediakan penutup wajan untuk memadamkan api malam, 4) bersihkan debu dengan kain lembap, bukan ditiup, 5) simpan malam sisa setelah dingin, jangan ke saluran air. Untuk luka bakar ringan, alirkan air dingin dan hentikan latihan bila melepuh. Kesalahan umum, memakai air untuk memadamkan api malam, atau mengamplas tanpa masker. Perbaiki dengan menutup wajan dan bekerja di ruang berangin. Tugas, isi daftar periksa keselamatan 12 butir dan foto tempat kerja. Kriteria, 12 dari 12 butir terpenuhi.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
          mediaFile: "lesson-bambu-keselamatan.webp",
        },
      ],
    },
    {
      title: "Dari latihan ke karya",
      summary:
        "Prasyarat, modul 1 sampai 5. Memilih benda kerja, mencatat proses, menghitung bahan, merawat produk, dan mengerjakan ujian akhir dari bambu mentah sampai finishing.",
      estimatedMinutes: 95,
      lessons: [
        {
          title: "Memilih benda kerja",
          kind: "text",
          body: "Benda kerja menentukan ukuran, ketebalan, dan tingkat kesulitan. Fitinline menyebut nampan, kotak bundar, dan hiasan dinding sebagai produk batik bambu, profil Desa Wisata Krebet juga menampilkan nampan bambu batik. Untuk latihan pertama, pilih satu benda yang bidangnya mudah dijangkau canting. Alat yang dipakai, benda kerja kering dan diamplas, penggaris, pensil, dan kertas. Langkah kerja, 1) pilih nampan, kotak bundar, atau panel, 2) ukur bidang kerja, 3) gambar denah di kertas, 4) tentukan motif yang muat, 5) catat bahan dan alat yang dibutuhkan. Keselamatan kerja, tidak ada bahan panas pada tahap memilih. Kesalahan umum, memilih bidang anyaman untuk latihan pertama karena terlihat mudah, padahal celah membuat malam jatuh. Perbaiki dengan memulai dari bilah atau panel datar. Tugas, unggah sketsa benda kerja dan daftar bahan. Kriteria, ukuran jelas, motif muat, dan bahan tercatat.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
          mediaFile: "lesson-bambu-benda.webp",
        },
        {
          title: "Menyusun catatan proses",
          kind: "text",
          body: "Kartu Karya membutuhkan riwayat proses, bukan hanya foto hasil. Catat tanggal, bahan, ukuran, dan perubahan yang kamu lakukan di setiap tahap. Alat yang dipakai, kamera ponsel, buku catatan, dan label tanggal. Langkah kerja, 1) foto bahan sebelum diolah, 2) foto setiap tahap utama, 3) catat waktu dan kondisi yang bisa memengaruhi hasil, 4) simpan file dengan nama yang mudah dicari, 5) susun urutan foto sebelum diunggah. Platform memakai catatan ini untuk menilai proses, jadi jangan mengedit foto sampai hilang detail. Keselamatan kerja, jangan memotret di dekat kompor menyala. Kesalahan umum, hanya memotret hasil akhir, atau mencatat angka tanpa satuan. Perbaiki dengan mengulang dokumentasi pada latihan berikutnya. Tugas, unggah enam foto bertanggal dan satu lembar catatan bahan. Kriteria, enam tahap terlihat dan catatan memuat bahan, ukuran, serta tanggal.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
          mediaFile: "lesson-bambu-catatan.webp",
        },
        {
          title: "Menghitung bahan dan biaya",
          kind: "text",
          body: "Menghitung bahan membuat harga karya masuk akal. Pisahkan bahan habis pakai, alat yang dipakai berulang, dan waktu kerja. Alat yang dipakai, catatan belanja, timbangan kecil, dan kalkulator. Langkah kerja, 1) daftar bahan untuk satu benda, 2) catat harga satuan dan jumlah yang dipakai, 3) hitung sisa bahan yang terbuang, 4) tambahkan biaya alat secara wajar, 5) tentukan harga setelah membandingkan dengan karya sejenis. Jangan mengarang angka, gunakan nota atau harga pasar yang kamu catat. Keselamatan kerja, tidak ada. Kesalahan umum, lupa menghitung malam, pelapis, dan kemasan, atau mencampur biaya satu kali percobaan dengan biaya produksi. Perbaiki dengan menghitung per benda. Tugas, unggah tabel biaya satu benda. Kriteria, semua bahan tercatat, ada harga satuan, dan ada perkiraan sisa.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
          mediaFile: "lesson-bambu-biaya.webp",
        },
        {
          title: "Merawat produk batik bambu",
          kind: "text",
          body: "Perawatan menentukan umur produk. Karena permukaan dilapisi, produk batik bambu cukup diusap dengan kain lembap, jangan direndam atau digosok dengan bahan abrasif (Fitinline, 2013). Alat yang dipakai, kain lembut, air, dan tempat kering. Langkah kerja, 1) usap debu dengan kain kering, 2) untuk noda ringan, gunakan kain lembap lalu segera keringkan, 3) hindari sinar matahari langsung dan tempat lembap, 4) jangan memakai pemutih atau sikat kasar, 5) simpan dengan pembungkus yang kering. Keselamatan kerja, tidak ada. Kesalahan umum, merendam anyaman sehingga air masuk celah, atau menjemur di bawah matahari sampai retak. Perbaiki dengan mengeringkan di tempat teduh. Tugas, tulis kartu perawatan lima butir untuk produkmu. Kriteria, lima butir spesifik dan mudah diikuti pembeli.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
        },
        {
          title: "Ujian akhir, satu produk dari bambu mentah",
          kind: "practice",
          body: "Ujian akhir adalah satu produk bambu dari bahan mentah sampai pelapisan. Kerjakan seluruh urutan yang dipelajari, pilih bambu, rebus, keringkan, amplas, pola, nglowongi, ngisen-isen, mbabar, nembok, warna dasar, nglorod, mepe, finishing, dan periksa. Alat yang dipakai, seluruh peralatan modul 1 sampai 5 dan alat pelindung. Langkah kerja, 1) siapkan benda kerja dan catatan, 2) kerjakan pola dan malam, 3) warnai dan tutup motif, 4) nglorod dan keringkan, 5) lapisi lalu periksa mutu. Hentikan pekerjaan bila merasa pusing, terbakar, atau ruangan berasap. Keselamatan kerja, protokol modul 5 berlaku penuh. Kesalahan umum, terburu-buru di nglorod lalu melapisi permukaan yang masih lembap, atau melupakan foto proses. Perbaiki dengan mengeringkan ulang dan melengkapi dokumentasi. Tugas, unggah produk jadi, foto setiap tahap proses, dan penilaian diri. Kriteria, produk lulus enam butir mutu, dokumentasi lengkap, dan prosedur keselamatan terlihat.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
          mediaFile: "lesson-bambu-ujian.webp",
        },
      ],
    },
  ],
  [pathSlug("pranatacaraJawa")]: [
    {
      title: "Napas dan tata wicara",
      summary: "Mengatur napas, volume, dan kejelasan kalimat.",
      estimatedMinutes: 90,
      lessons: [
        {
          title: "Latihan napas dan jeda",
          kind: "practice",
          body: "Tarik napas dari diafragma, bukan dari dada, lalu hitung empat ketukan sebelum mulai berbicara. Jeda setelah kalimat pembuka membuat suaramu tidak terburu-buru di acara panjang. Rekam dua menit latihan dan tandai bagian yang napasnya terpotong. Tugas, rekam latihan napas dua menit. Kriteria, jeda terdengar dan kalimat tidak terpotong.",
          estimatedMinutes: 30,
          accessLevel: "public",
        },
        {
          title: "Volume dan artikulasi",
          kind: "text",
          body: "Rekam suaramu di ruang terbuka, lalu dengarkan ulang dari jarak tiga meter. Kejelasan konsonan akhir biasanya hilang lebih dulu daripada volume. Latih kalimat pembuka dengan tempo lambat sebelum menambah kecepatan. Tugas, unggah rekaman satu menit. Kriteria, konsonan akhir terdengar jelas.",
          estimatedMinutes: 30,
          accessLevel: "enrolled",
        },
        {
          title: "Bahasa Jawa halus untuk acara",
          kind: "text",
          body: "Tingkat bahasa menentukan sapaan kepada tamu, keluarga, dan sesepuh. Pakai krama inggil untuk menyebut orang yang dihormati, dan jangan mencampur tingkat bahasa dalam satu paragraf. Tanyakan kebiasaan keluarga, karena tiap keluarga punya batas sopan sendiri. Tugas, tulis tiga sapaan untuk tiga tamu berbeda. Kriteria, tingkat bahasa tepat.",
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
          body: "Siraman lazim dibuka dengan sungkeman calon pengantin kepada kedua orang tua, lalu keluarga dan pinisepuh mendampingi. Air kembang setaman disiapkan dalam kendi dan gayung batok, jumlah pinisepuh yang menuangkan air biasanya tujuh atau sembilan, mengikuti kebiasaan keluarga. Setelah air kendi habis, kendi dipecah sambil mengucapkan “Wis pecah pamore”, lalu rambut calon pengantin dipotong sedikit (potong rikma) dan potongannya disatukan. Rujukan publik, Wikipedia bahasa Indonesia, “Siraman (adat Jawa)”, dan Marverial (2020) di Jurnal Desain Komunikasi Visual Universitas Bhayangkara Jakarta Raya. Urutan ini lazim di Yogyakarta, tetapi tiap keluarga dapat menambah atau mengubah bagian, konfirmasi selalu dilakukan sebelum gladi resik. Alat yang dipakai, lembar rundown, daftar pinisepuh, dan catatan keluarga. Langkah kerja, 1) catat jumlah pinisepuh dan urutan menuang, 2) tandai bagian sungkeman, wudu, dan doa, 3) tulis momen pecah kendi dan potong rikma, 4) bagi tugas keluarga, 5) konfirmasi ke keluarga. Keselamatan kerja, tidak ada bahan berbahaya, hati-hati dengan pecahan kendi. Kesalahan umum, menyebut jumlah pinisepuh tanpa bertanya, atau melewatkan wudu. Perbaiki dengan menanyakan kebiasaan keluarga. Tugas, tulis urutan siraman lengkap dengan tujuh atau sembilan pinisepuh dan tiga istilah wajib. Kriteria, urutan lengkap, istilah tepat, dan ada catatan konfirmasi keluarga.",
          estimatedMinutes: 30,
          accessLevel: "enrolled",
        },
        {
          title: "Midodareni dan resepsi",
          kind: "text",
          body: "Midodareni berlangsung malam dengan suasana tenang, keluarga kedua pihak berkumpul, calon pengantin tetap di dalam kamar, dan pembawa acara membawakan sapaan serta doa. Resepsi berjalan siang dengan tamu lebih banyak. Istilah yang perlu dikenal, sungkeman, pinisepuh, kembang setaman, kendi, gayung batok, pecah kendi, dan potong rikma. Rujukan publik, Wikipedia bahasa Indonesia, “Siraman (adat Jawa)”, Marverial (2020). Kebiasaan keluarga Yogyakarta berbeda-beda, konfirmasi urutan dan sapaan sebelum acara. Tugas, bandingkan dua susunan acara. Kriteria, perbedaan suasana dan urutan dijelaskan.",
          estimatedMinutes: 30,
          accessLevel: "enrolled",
        },
        {
          title: "Menyusun rundown",
          kind: "practice",
          body: "Buat rundown 60 menit dengan penanda waktu dan ruang untuk keterlambatan. Beri jeda lima menit di antara bagian yang melibatkan banyak pihak. Tugas, unggah rundown. Kriteria, penanda waktu jelas dan antisipasi keterlambatan ada.",
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
          body: "Pilih busana yang sopan, nyaman, dan sesuai konteks acara, lalu uji bergerak dan duduk di dalamnya. Warna busana sebaiknya tidak bertabrakan dengan pakaian keluarga inti. Tugas, foto busana dan tulis alasannya. Kriteria, sesuai konteks acara.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Koordinasi dengan tim acara",
          kind: "practice",
          body: "Sepakati isyarat dengan pengarah acara, penata suara, dan keluarga sebelum acara dimulai. Isyarat tangan lebih aman daripada memanggil nama di tengah prosesi. Tugas, rekam simulasi isyarat. Kriteria, tiga isyarat disepakati dan dipakai.",
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
          body: "Jalankan skenario lengkap dari pembukaan sampai penutup tanpa berhenti. Catat bagian yang membuatmu mencari kata, lalu ulangi bagian itu saja. Tugas, unggah rekaman skenario siraman. Kriteria, urutan lengkap dan penutup jelas.",
          estimatedMinutes: 45,
          accessLevel: "enrolled",
        },
        {
          title: "Skenario midodareni",
          kind: "practice",
          body: "Latih transisi dari suasana tenang ke sapaan kepada keluarga kedua pihak. Perhatikan jeda saat menyebut nama dan gelar. Tugas, unggah rekaman 10 menit. Kriteria, transisi mulus dan sapaan tepat.",
          estimatedMinutes: 45,
          accessLevel: "enrolled",
        },
        {
          title: "Membaca catatan koreksi",
          kind: "text",
          body: "Baca catatan koreksi pengajar dan catat tiga perbaikan yang bisa dikerjakan minggu ini. Pilih satu perbaikan untuk dilatih ulang sebelum sesi berikutnya. Tugas, tulis tiga catatan perbaikan. Kriteria, tiga catatan spesifik.",
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
          body: "Sebelum sesi live, siapkan air dan naskah ringkas di luar jangkauan kamera. Saat sesi, tampil lima menit dan terima catatan pengajar secara langsung. Tugas, hadir dan tampil. Kriteria, tampil lima menit penuh.",
          estimatedMinutes: 45,
          accessLevel: "enrolled",
        },
        {
          title: "Rekaman praktik mandiri",
          kind: "practice",
          body: "Rekam praktik sepuluh menit, lalu tandai bagian yang ingin diperbaiki sebelum mengunggah. Jangan mengedit rekaman, pengajar perlu melihat kesalahan aslinya. Tugas, unggah rekaman dan tiga tanda waktu. Kriteria, rekaman utuh dan tanda waktu jelas.",
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
          body: "Tulis pengalaman, wilayah layanan, dan jenis acara yang kamu tangani. Sebut yang sudah pernah dikerjakan, bukan yang belum. Tugas, unggah profil 150 kata. Kriteria, wilayah dan pengalaman jelas.",
          estimatedMinutes: 25,
          accessLevel: "enrolled",
        },
        {
          title: "Menyiapkan paket layanan",
          kind: "text",
          body: "Susun paket, harga, dan cakupan layanan yang jelas, termasuk apa yang tidak termasuk di dalamnya. Harga tanpa cakupan membuat tamu menebak. Tugas, unggah satu paket layanan. Kriteria, cakupan dan batasan tertulis.",
          estimatedMinutes: 25,
          accessLevel: "certified",
        },
      ],
    },
  ],
  [pathSlug("kriyaGerabahBantul")]: [
    {
      title: "Tanah liat Kasongan",
      summary: "Asal tanah, campuran, dan cara menyiapkan tanah kerja.",
      estimatedMinutes: 60,
      lessons: [
        {
          title: "Tanah liat dan campurannya",
          kind: "text",
          body: "Tanah liat Kasongan dicampur pasir halus supaya tidak mudah retak saat dibakar. Kadar air menentukan apakah tanah bisa dibentuk tanpa lengket di tangan. Uji dengan menggulung tanah menjadi pilin kecil, kalau mudah patah, campuran terlalu kering. Tugas, catat asal tanah dan perbandingan campuran. Kriteria, catatan lengkap.",
          estimatedMinutes: 20,
          accessLevel: "public",
        },
        {
          title: "Menguli tanah sampai homogen",
          kind: "text",
          body: "Menguli membuang gelembung udara yang bisa membuat gerabah pecah di tungku. Kerjakan di permukaan yang lembap, lipat, tekan, dan ulangi sampai tanah terasa rata. Tugas, foto sebelum dan sesudah pengulian. Kriteria, permukaan tanah rata.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Menyimpan tanah kerja",
          kind: "text",
          body: "Bungkus tanah sisa dengan kain lembap dan simpan di wadah tertutup. Tanah yang mengering di udara perlu dibasahi ulang perlahan, bukan disiram. Tugas, catat cara penyimpanan. Kriteria, tanah tetap siap pakai.",
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
          body: "Tiga cara dasar membentuk gerabah Kasongan adalah lelet (pilin), tempel (menyambung kepingan), dan cetak (menekan tanah ke cetakan). Pilin dan lempeng juga menjadi bentuk dasar sebelum masuk ke roda putar. Sambungan pilin ditekan miring supaya tidak berongga, lempeng dibentuk di atas alas kain, dan cetakan diisi tanah secara merata lalu dilepas saat setengah kering. Tugas, buat satu lempeng, satu pilin, dan satu bentuk cetak sederhana. Kriteria, sambungan rapat dan bentuk cetak tidak cacat.",
          estimatedMinutes: 30,
          accessLevel: "public",
        },
        {
          title: "Roda putar, memusatkan tanah",
          kind: "text",
          body: "Memusatkan tanah adalah bagian tersulit, tanah harus tepat di tengah roda sebelum dibuka. Tekan dengan kedua tangan dan jaga siku menempel di lutut supaya gerakmu stabil. Tugas, rekam dua menit memusatkan tanah. Kriteria, tanah tidak goyang.",
          estimatedMinutes: 30,
          accessLevel: "enrolled",
        },
        {
          title: "Menaikkan dinding dan menyelesaikan bibir",
          kind: "practice",
          body: "Naikkan dinding dua kali, bukan sekali tebal, lalu rapikan bibir dengan jari basah. Tugas, unggah satu mangkuk setengah jadi. Kriteria, dinding rata dan bibir tidak sobek.",
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
          body: "Gerabah dikeringkan di tempat teduh dengan kelembapan yang stabil, bukan di bawah matahari langsung. Bagian bawah biasanya masih dingin saat permukaan terlihat kering, jadi tunggu satu hari lagi. Tugas, catat lama pengeringan. Kriteria, catatan harian.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Menyusun tungku dan membakar",
          kind: "text",
          body: "Susun gerabah di tungku dengan jarak yang cukup agar panas merata. Pembakaran biskuit berlangsung sekitar 800 °C, naikkan panas bertahap dan jangan membuka tungku sebelum dingin. Pembakaran bertahap mengurangi risiko pecah mendadak. Alat yang dipakai, sarung tangan tahan panas, kacamata, sepatu tertutup, dan penjepit panjang. Keselamatan kerja, jauhkan bahan mudah terbakar, jangan membuka tungku saat panas, dan kerjakan di ruang berventilasi. Tugas, tulis urutan pembakaran dan tiga aturan keselamatan. Kriteria, urutan jelas dan aturan keselamatan lengkap.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Memeriksa hasil bakar",
          kind: "text",
          body: "Periksa bunyi, retak, dan warna setelah tungku dingin. Retak rambut sering baru terlihat setelah gerabah dibersihkan. Tugas, foto tiga hasil. Kriteria, tiga hasil terbaca.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
      ],
    },
  ],
  [pathSlug("aksaraJawa")]: [
    {
      title: "Hanacaraka, dua puluh aksara dasar",
      summary:
        "Mengenal 20 aksara dasar, urutannya, dan vokal /a/ yang menempel pada setiap aksara.",
      estimatedMinutes: 70,
      lessons: [
        {
          title: "Apa itu aksara Jawa",
          kind: "text",
          body: "Aksara Jawa bukan abjad, melainkan aksara suku kata, setiap aksara mewakili satu suku kata terbuka. Dua puluh aksara dasar disusun dalam empat baris, ha-na-ca-ra-ka, da-ta-sa-wa-la, pa-dha-ja-ya-nya, ma-ga-ba-tha-nga. Urutan itu dihafal sebagai hanacaraka, dan kelas ini memakai urutan yang sama. Tugas, tulis dua puluh aksara berurutan dari ingatan, lalu cocokkan dengan tabel. Kunci urutan, ha-na-ca-ra-ka, da-ta-sa-wa-la, pa-dha-ja-ya-nya, ma-ga-ba-tha-nga. Kriteria, 18 dari 20 aksara benar dan urut.",
          estimatedMinutes: 15,
          accessLevel: "public",
        },
        {
          title: "Membaca baris pertama, ha na ca ra ka",
          kind: "text",
          body: "Lima aksara pertama adalah ꦲ ꦤ ꦕ ꦫ ꦏ, dibaca ha, na, ca, ra, ka. Latih dengan kata yang sudah dikenal, ꦏꦿꦠꦺꦴꦤ꧀ dibaca kraton dan ꦫꦩ dibaca rama. Perhatikan aksara yang mirip, yaitu na dan nya, da dan dha, ta dan tha, bedanya ada pada bentuk, bukan pada bunyi vokal. Tugas, rekam baca lima aksara selama 30 detik. Kriteria, 5 dari 5 bunyi benar.",
          estimatedMinutes: 15,
          accessLevel: "public",
        },
        {
          title: "Membaca baris kedua sampai keempat",
          kind: "text",
          body: "Lima belas aksara sisanya dilatih dengan kata utuh, ꦱꦥꦶ sapi, ꦧꦸꦏꦸ buku, ꦭꦺꦭꦺ lélé, ꦏꦼꦫꦶꦱ꧀ keris, ꦭꦺꦴꦩ꧀ꦧ lomba, ꦱꦧꦂ sabar, ꦧꦸꦔꦃ bungah, ꦭꦪꦁ layang. Baca keras sambil menunjuk aksara satu per satu, lalu ulangi tanpa menunjuk. Tugas, tulis lima kata dari bunyi ke aksara dan lima aksara ke bunyi. Kunci, sapi ꦱꦥꦶ, buku ꦧꦸꦏꦸ, lélé ꦭꦺꦭꦺ, keris ꦏꦼꦫꦶꦱ꧀, lomba ꦭꦺꦴꦩ꧀ꦧ, ꦱꦧꦂ sabar, ꦧꦸꦔꦃ bungah, ꦭꦪꦁ layang, ꦏꦿꦠꦺꦴꦤ꧀ kraton, ꦫꦩ rama. Kriteria, sedikitnya 8 dari 10 benar.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
        },
        {
          title: "Vokal /a/ yang menempel",
          kind: "text",
          body: "Setiap aksara dasar berbunyi dengan vokal /a/, jadi ꦱ dibaca sa, bukan s. Konsekuensinya, kata sapi ditulis ꦱꦥꦶ tanpa tambahan apa pun. Menulis lima kata berakhiran /a/ menguji apakah kamu sudah membuang kebiasaan menambah huruf Latin. Tugas, tulis lima kata berakhiran /a/ tanpa sandhangan. Kriteria, 5 dari 5 benar.",
          estimatedMinutes: 10,
          accessLevel: "enrolled",
        },
        {
          title: "Latihan hanacaraka",
          kind: "practice",
          body: "Salin dua puluh aksara di kotak bergaris, lalu baca ulang dari kiri ke kanan tanpa melihat contoh. Periksa bentuk yang paling sering tertukar, biasanya na dan nya serta da dan dha. Tugas, unggah foto salinan dan rekaman bacaan. Kriteria, 20 aksara terbaca dengan paling banyak 2 bentuk keliru.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Sandhangan, mengubah vokal, menutup suku kata",
      summary:
        "Lima sandhangan vokal, tiga panyigeg, pangkon, dan aksara khusus.",
      estimatedMinutes: 100,
      lessons: [
        {
          title: "Lima sandhangan vokal",
          kind: "text",
          body: "Lima sandhangan vokal mengubah bunyi /a/ pada aksara, wulu ꦶ untuk i, suku ꦸ untuk u, taling ꦺ untuk é, pepet ꦼ untuk ê, dan taling tarung ꦺꦴ untuk o. Taling ditulis sebelum aksara, sedangkan tarung ditulis sesudahnya, jadi taling tarung mengapit aksara. Tugas, tulis lima aksara dengan wulu, suku, taling, pepet, dan taling tarung, lalu beri nama sandhangannya. Kunci, ꦶ wulu, ꦸ suku, ꦺ taling, ꦼ pepet, ꦺꦴ taling tarung. Kriteria, sedikitnya 8 dari 10 bentuk dan nama benar.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Panyigeg, layar, wignyan, cecak",
          kind: "text",
          body: "Tiga panyigeg menutup suku kata dengan konsonan, layar ꦂ untuk /r/ seperti ꦱꦧꦂ sabar, wignyan ꦃ untuk /h/ seperti ꦧꦸꦔꦃ bungah, dan cecak ꦁ untuk /ng/ seperti ꦭꦪꦁ layang. Ketiganya ditulis setelah aksara yang ditutup, bukan sebelumnya. Tugas, tulis sembilan kata berakhiran -r, -h, dan -ng. Kriteria, 9 dari 9 benar.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
        },
        {
          title: "Pangkon, mematikan vokal",
          kind: "text",
          body: "Pangkon ꧀ menghapus vokal /a/ pada aksara, seperti pada ꦱꦪꦸꦏ꧀ sayuk. Jangan memakai pangkon untuk bunyi /ng/, karena bunyi itu selalu ditulis dengan cecak. Tugas, perbaiki lima kata yang salah memakai pangkon. Kriteria, 5 dari 5 benar.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
        },
        {
          title: "Cakra, keret, dan panjing",
          kind: "text",
          body: "Selain sandhangan vokal, ada aksara khusus yang mengubah bunyi dasar. Pengkal ꦾ dipakai untuk /ya/ seperti ꦧꦒꦾ bagya, cakra ꦿ untuk /ra/ seperti ꦏꦿꦠꦺꦴꦤ꧀ kraton, dan keret ꦽ untuk /re/ seperti ꦏꦽꦠꦼꦒ꧀ kreteg. Panjing la dan panjing wa menempel pada aksara sebelumnya, seperti ꦏ꧀ꦭꦥ klapa dan ꦏ꧀ꦮꦕꦶ kwaci. Pa cerek ꦉ dipakai untuk /re/ seperti ꦉꦒꦼꦠ꧀ reget, dan nga lelet ꦊ untuk /le/ seperti ꦊꦔ lenga. Tugas, baca tujuh contoh dan tulis ulang. Kriteria, 7 dari 7 benar.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
        },
        {
          title: "Latihan sandhangan",
          kind: "practice",
          body: "Dua belas kata latihan, sapi, buku, lélé, keris, lomba, sabar, bungah, layang, klapa, kwaci, reget, lenga. Tulis semuanya tanpa melihat tabel, lalu periksa satu per satu. Tugas, unggah foto dua belas kata dan satu rekaman bacaan. Kriteria, sedikitnya 10 dari 12 benar dan taling tidak tertukar dengan tarung.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Membaca ulang taling dan pepet",
          kind: "text",
          body: "Dua sandhangan yang paling sering tertukar adalah taling é dan pepet ê. Baca ulang kata yang sudah dipelajari, tandai mana yang memakai taling dan mana yang memakai pepet, lalu cocokkan dengan tabel sandhangan. Tugas, rekam enam kata. Kriteria, 6 dari 6 benar.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Pasangan, konsonan mati di tengah kata",
      summary:
        "Dua puluh pasangan, tiga pengecualian, dan contoh bertahap sayuk rukun.",
      estimatedMinutes: 85,
      lessons: [
        {
          title: "Kenapa pasangan ada",
          kind: "text",
          body: "Konsonan mati di tengah kata ditulis dengan pasangan yang menempel di bawah aksara sebelumnya. Pasangan ha, sa, dan pa menjadi pengecualian karena bentuknya ditulis sejajar, tidak di bawah. Tugas, tulis tiga kata yang memakai pangkon dan tiga kata yang memakai pasangan, lalu jelaskan bedanya dalam satu kalimat. Kunci, pangkon mematikan vokal di akhir suku kata, pasangan menempel di bawah aksara untuk konsonan mati di tengah kata. Kriteria, enam contoh benar dan penjelasan tepat.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
        },
        {
          title: "Dua puluh pasangan",
          kind: "text",
          body: "Tabel 4 x 5 berisi pasangan untuk setiap aksara dasar, ꦲ꧀ꦲ ha, ꦤ꧀ꦤ na, ꦕ꧀ꦕ ca, ꦫ꧀ꦫ ra, ꦏ꧀ꦏ ka, ꦢ꧀ꦢ da, ꦠ꧀ꦠ ta, ꦱ꧀ꦱ sa, ꦮ꧀ꦮ wa, ꦭ꧀ꦭ la, ꦥ꧀ꦥ pa, ꦣ꧀ꦝ dha, ꦗ꧀ꦗ ja, ꦪ꧀ꦪ ya, ꦚ꧀ꦚ nya, ꦩ꧀ꦩ ma, ꦒ꧀ꦒ ga, ꦧ꧀ꦧ ba, ꦛ꧀ꦛ tha, dan ꦔ꧀ꦔ nga. Materi sumber menulis pasangan ra dengan bentuk berbasis ha, tabel ini memakai ꦫ꧀ꦫ. Tugas, salin dua puluh pasangan. Kriteria, 18 dari 20 benar dan posisi pasangan di bawah aksara.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Sayuk rukun langkah demi langkah",
          kind: "text",
          body: "Mulai dari ꦱꦪꦸꦏ, lalu tambahkan pasangan untuk konsonan mati, ꦱꦪꦸꦏ꧀ꦫꦸꦏꦸꦤ. Langkah terakhir menutup kata kedua dengan pangkon sehingga menjadi ꦱꦪꦸꦏ꧀ꦫꦸꦏꦸꦤ꧀. Kerjakan tiga tahap itu berurutan, jangan langsung ke bentuk akhir. Tugas, tulis tiga tahap sayuk rukun. Kriteria, tiga tahap benar dan urut.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Latihan pasangan",
          kind: "practice",
          body: "Tulis sepuluh kata dua suku kata yang punya konsonan mati di tengah, seperti tumbas, godhong, rantas, sambung, tandur, dan kembang. Pasangan harus menempel di bawah aksara sebelumnya, bukan sejajar di sampingnya. Tugas, unggah foto sepuluh kata. Kriteria, sedikitnya 8 dari 10 benar dan pasangan berada di bawah aksara.",
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
          body: "Pada lungsi ꧉ menutup kalimat, pada lingsa ꧈ memisahkan rincian dalam satu kalimat, dan adeg-adeg ꧋ membuka paragraf. Ketiganya ditulis tanpa spasi, sama seperti aksara lain di sekitarnya. Tugas, beri tanda baca pada tiga kalimat. Kriteria, 3 dari 3 benar.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
        },
        {
          title: "Angka Jawa dan pada pangkat",
          kind: "text",
          body: "Angka Jawa berjalan ꧑ sampai ꧐, dan angka yang dipakai sebagai bilangan diapit pada pangkat ꧇. Contohnya ꧇꧑꧙꧙꧐꧇ dibaca 1990 dan ꧇꧒꧐꧒꧖꧇ dibaca 2026, sedangkan ꦱꦱꦶꦏꦥꦶꦁ꧇꧙꧇ dibaca sasi kaping 9. Tugas, tulis lima angka. Kriteria, 5 dari 5 benar dan semua diapit ꧇.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Aksara swara",
          kind: "text",
          body: "Aksara swara ꦄ ꦆ ꦈ ꦌ ꦎ adalah huruf vokal mandiri untuk awal kata, a, i, u, é, dan o. Kata berawalan vokal memakai swara karena aksara dasar selalu membawa bunyi /a/ dan dibaca sebagai konsonan + /a/, ꦲ, misalnya, dibaca ha, bukan a. Untuk bunyi ê di awal kata, materi sumber tidak memberi contoh, kelas ini memakai ꦲ dengan pepet dan mencatatnya sebagai kebiasaan yang perlu diperiksa pada teks lain. Tugas, tulis lima kata berawalan vokal. Kriteria, 5 dari 5 memakai aksara swara yang tepat.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
        },
        {
          title: "Aksara murda dan aksara rekan",
          kind: "text",
          body: "Aksara murda adalah ꦟ ꦑ ꦡ ꦯ ꦦ ꦘ ꦓ ꦨ, sedangkan aksara rekan dipakai untuk bunyi serapan, ꦥ꦳ fa/va, ꦗ꦳ za, ꦒ꦳ gha, ꦏ꦳ kha, dan ꦢ꦳ dza, seperti pada Fatah, Zaki, Ghani, Khalila, dan Dzalim. Materi sumber tidak memberi aturan pemakaian murda, kebiasaan memakainya untuk nama dan gelar adalah konvensi umum, bukan kutipan sumber. Tugas A, tulis lima nama diri yang lazim memakai murda, lalu tandai aksara murdanya. Tugas B, tulis lima kata serapan yang memakai rekan, yaitu fa/va, za, gha, kha, dan dza. Kriteria A, lima nama memakai murda pada posisi yang lazim, kriteria B, lima rekan tepat.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Latihan campuran",
          kind: "practice",
          body: "Tulis kalimat Tanggal 17 Agustus 2025, Khalila lan Zaki teka. Kalimat ini menguji angka bertanggal, dua aksara rekan, pada lungsi, dan gaya tanpa spasi sekaligus. Tugas, unggah foto kalimat lengkap. Kriteria, angka diapit ꧇, dua rekan tepat, pada lungsi ada, dan tidak memakai spasi.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Menulis kalimat utuh",
      summary:
        "Aturan tanpa spasi, membaca paragraf, menulis kalimat sendiri, dan lembar uji.",
      estimatedMinutes: 80,
      lessons: [
        {
          title: "Aturan tanpa spasi",
          kind: "text",
          body: "Materi sumber menulis aksara Jawa tanpa spasi, kata disambung dan dipisahkan dengan tanda baca seperti pada lingsa. Gaya ini dipakai di kelas. Dalam praktik modern, sebagian penulis memakai spasi atau pada lingsa untuk memudahkan pembaca, jadi tanpa spasi adalah gaya sumber, bukan satu-satunya ejaan yang sah. Bentuk yang dipakai kelas ini, ꦤꦠꦧꦠ, bukan ꦤꦠ ꦧꦠ. Tugas, perbaiki empat tulisan yang memakai spasi. Kriteria, 4 dari 4 benar dan alasan menyebut gaya sumber.",
          estimatedMinutes: 15,
          accessLevel: "public",
        },
        {
          title: "Membaca paragraf",
          kind: "text",
          body: "Paragraf penutup materi sumber dibaca utuh, dari adeg-adeg sampai pada lungsi. Teks aksaranya, ꧋ꦏꦧꦸꦢꦪꦤ꧀ꦗꦮꦩꦶꦤꦁꦏꦮꦫꦶꦱ꧀ꦱꦤ꧀ꦥꦫꦊꦭꦸꦲꦸꦂꦏꦁꦏꦸꦢꦸꦢꦶꦗꦒꦭꦤ꧀ꦢꦶꦊꦱ꧀ꦠꦫꦺꦏ꧀ꦲꦏꦺ꧉ꦥꦫꦱꦶꦱ꧀ꦮꦩꦶꦤꦁꦏꦒꦺꦤꦼꦫꦱꦶꦩꦸꦣꦤ꧀ꦢꦸꦮꦺꦤꦶꦠꦁꦒꦸꦁꦗꦮꦧ꧀ꦏꦁꦒꦺꦴꦔꦸꦫꦶꦪꦸꦫꦶꦏꦧꦸꦢꦪꦤ꧀ꦗꦮ꧉ꦱꦭꦃꦱꦮꦶꦗꦶꦤꦶꦁꦕꦫꦪꦲꦶꦏꦸꦱꦶꦤꦲꦸꦧꦱꦗꦮ꧈ꦲꦏ꧀ꦱꦫꦗꦮ꧈ꦲꦸꦁꦒꦃꦲꦸꦁꦒꦸꦃ꧈ꦭꦤ꧀ꦩꦤꦺꦏꦮꦂꦤꦏꦼꦱꦺꦤꦶꦪꦤ꧀ꦠꦿꦣꦶꦱꦶꦪꦺꦴꦤꦭ꧀꧈ꦲꦗꦧꦔꦼꦠ꧀ꦏꦥꦶꦭꦸꦠ꧀ꦩꦫꦁꦏꦧꦸꦢꦪꦤ꧀ꦩꦚ꧀ꦕ꧉ Erratum, materi sumber menulis ꦩꦶꦤꦺꦴꦁꦏ, ꦩꦸꦣꦲꦤ꧀ꦢꦸꦮꦺꦤ꧀ꦤꦶ, ꦩꦺꦴꦚꦕ, dan ꦏꦼꦱꦼꦤꦶꦪꦤ꧀, bentuk kelas yang dipakai adalah ꦩꦶꦤꦁꦏ (minangka), ꦩꦸꦣꦤ꧀ꦢꦸꦮꦺꦤꦶ (mudha nduweni), ꦩꦚ꧀ꦕ (manca), dan ꦏꦼꦱꦺꦤꦶꦪꦤ꧀ (keséniyan). Latinnya, Kabudayan Jawa minangka warisan para leluhur kang kudu dijaga lan dilestarekake. Para siswa minangka generasi mudha nduweni tanggung jawab kanggo nguri-uri kabudayan Jawa. Salah sawijining cara yaiku sinau basa Jawa, aksara Jawa, unggah-ungguh, lan maneka warna kesenian tradisional. Aja banget kapilut marang kabudayan manca. Paragraf ini ditulis untuk siswa sekolah. Kalimat terakhirnya adalah pesan penulis materi, bukan ajaran kursus ini, di kelas ini paragraf dipakai sebagai latihan membaca. Tugas, rekam bacaan dua kalimat. Kriteria, lancar dan tidak berhenti di tengah kata.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Menyalin kalimat sumber",
          kind: "practice",
          body: "Salin dua kalimat dari materi sumber, tumbas jamu godhong tela dan rawe-rawe rantas malang-malang putung. Keduanya panjang, jadi kerjakan per kata lalu sambungkan tanpa spasi. Tugas, unggah foto dua kalimat. Kriteria, sedikitnya 90 persen aksara benar, tanpa spasi, dan pasangan di bawah aksara.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Menulis kalimat sendiri",
          kind: "practice",
          body: "Tulis lima kalimat bahasa Jawa sederhana dengan bank kata, aku, kowe, dheweke, manggon, sinau, nulis, dagang, ing, saka, lan. Contoh, Aku manggon ing Bantul. Susun kalimat pendek supaya setiap pasangan bisa diperiksa dengan tenang. Tugas, unggah foto dan rekaman bacaan. Kriteria, lima kalimat terbaca sesuai maksud dengan paling banyak 2 kesalahan.",
          estimatedMinutes: 25,
          accessLevel: "enrolled",
        },
        {
          title: "Lembar uji aksara",
          kind: "practice",
          body: "Lembar uji ini menyatukan seluruh bahan, dua puluh aksara, sandhangan, pasangan, tanda baca, angka, swara, murda, dan rekan. Kerjakan tanpa melihat tabel, lalu periksa dengan kunci yang diberikan pengajar. Alat yang dipakai, kertas bergaris, pensil, dan penghapus. Langkah kerja, 1) tulis hanacaraka, 2) tulis lima kata bersandhangan, 3) tulis tiga kata berpasangan, 4) tulis satu kalimat dengan angka dan tanda baca, 5) tulis dua nama dengan murda dan rekan. Keselamatan kerja, tidak ada. Kesalahan umum, mencampur taling dan pepet, atau menaruh pasangan di samping. Perbaiki dengan menandai kesalahan dan menulis ulang hanya bagian itu. Tugas, unggah lembar uji dan rekaman bacaan satu kalimat. Kriteria, 80 persen bentuk benar, pasangan di bawah aksara, dan bacaan lancar.",
          estimatedMinutes: 30,
          accessLevel: "enrolled",
        },
      ],
    },
  ],
  [pathSlug("tariKreasi")]: [
    {
      title: "Tari sebagai ekspresi",
      summary:
        "Modul pembuka tanpa prasyarat. Definisi tari, gerak murni dan maknawi, contoh dari laporan, dan latihan menirukan alam dengan ruang 2 x 2 meter.",
      estimatedMinutes: 100,
      lessons: [
        {
          title: "Apa yang disebut tari",
          kind: "text",
          body: "Tari adalah ekspresi jiwa manusia yang disampaikan lewat gerak tubuh yang indah dan ritmis, gerak itu juga membawa kekuatan komunikatif dari penciptanya (Hadi, 1990, dikutip laporan Apresiasi Karya Seni Tari). Materi kelas ini disusun dari laporan siswa tersebut, bukan dari buku Hadi secara langsung, jadi pakailah sebagai pengantar, bukan kutipan verbatim. Alat yang dipakai, buku catatan dan alat tulis. Langkah kerja, 1) tulis definisi itu dengan kalimat sendiri, 2) sebut tiga hal yang membuat gerak menjadi tari, yaitu bentuk, ritme, dan maksud, 3) catat satu pertunjukan tari yang pernah kamu lihat, 4) tandai bagian yang menurutmu paling komunikatif. Keselamatan kerja, belum ada gerak fisik di pelajaran ini. Kesalahan umum, menyamakan tari dengan gerak sehari-hari tanpa memperhatikan bentuk dan ritme. Tugas, tulis 100 kata tentang satu pengalaman menonton tari. Kriteria, definisi tepat, ada contoh nyata, dan alasan komunikatifnya jelas.",
          estimatedMinutes: 20,
          accessLevel: "public",
        },
        {
          title: "Gerak murni dan gerak maknawi",
          kind: "text",
          body: "Laporan membagi gerak tari menjadi dua. Gerak murni, atau gerak wantah, dilakukan tanpa tujuan tertentu dan hanya untuk keindahan, contohnya memutar lengan, mengayun, melenggang, mengibas rambut, berputar, mengibas selendang, jalan di tempat, dan menggeleng kepala. Gerak maknawi membawa pesan tertentu dan sering dipakai dalam tari naratif. Alat yang dipakai, catatan dan ruang kosong 2 x 2 meter. Langkah kerja, 1) tulis lima contoh gerak murni dari daftar, 2) pilih tiga gerak dan lakukan masing-masing delapan hitungan, 3) tulis satu gerak maknawi sederhana, misalnya menirukan pohon tertiup angin, 4) bedakan keduanya dalam dua kalimat. Keselamatan kerja, pemanasan 10 menit dulu, bertelanjang kaki atau memakai kaus kaki anti-selip. Kesalahan umum, menganggap gerak murni tidak punya maksud sama sekali, yang tidak ada adalah cerita, bukan keindahannya. Tugas, rekam 30 detik berisi satu gerak murni dan satu gerak maknawi. Kriteria, perbedaan keduanya terbaca dari gerak, bukan hanya dari penjelasan lisan.",
          estimatedMinutes: 20,
          accessLevel: "public",
        },
        {
          title: "Legong, Saman, dan Bedhaya menurut laporan",
          kind: "text",
          body: "Laporan menyebut tiga contoh gerak maknawi. Tari Legong dari Bali memakai gerakan tangan, jari, dan mata yang mencerminkan cerita mitologi dan kisah raja-raja Bali. Tari Saman dari Aceh menonjolkan gerak sinkron yang melambangkan kebersamaan, gotong royong, dan kekuatan komunitas. Tari Bedhaya dari Jawa mengandung makna spiritual yang dikaitkan dengan kosmologi Jawa. Laporan tidak merinci setiap ragam gerak, jadi jangan mengarang detail di luar tiga catatan itu. Alat yang dipakai, catatan. Langkah kerja, 1) tulis satu kalimat untuk masing-masing tari, 2) tandai kata kunci laporan, bukan tafsiranmu, 3) tulis satu hal yang ingin kamu lihat langsung, 4) simpan catatan untuk tugas apresiasi. Keselamatan kerja, tidak ada. Kesalahan umum, menambahkan nama raja atau aturan ritual yang tidak disebut laporan. Tugas, isi tabel tiga tari dengan asal, kata kunci makna, dan satu pertanyaan. Kriteria, semua isi bisa dilacak ke kalimat laporan.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Menirukan hewan dan pohon",
          kind: "practice",
          body: "Laporan menyebut gerak menirukan hewan dan pohon sebagai contoh gerak maknawi sederhana. Latihan ini mengubah pengamatan menjadi gerak, bukan meniru secara literal. Alat yang dipakai, ponsel untuk merekam, ruang 2 x 2 meter, kaus kaki anti-selip atau kaki telanjang. Langkah kerja, 1) pemanasan 10 menit, putar leher, bahu, pinggang, dan pergelangan, 2) pilih satu hewan dan satu pohon, 3) ambil tiga ciri geraknya, misalnya lambat, berayun, atau tersentak, 4) ulangi tiap ciri delapan hitungan, 5) rekam satu menit tanpa berhenti. Keselamatan kerja, hentikan bila pusing, jangan melompat di lantai licin. Kesalahan umum, meniru bentuk secara berlebihan sampai gerak kehilangan ritme. Tugas, unggah rekaman satu menit dan tiga catatan ciri gerak. Kriteria, tiga ciri terlihat, hitungan teratur, dan tidak ada gerak yang menyakitkan.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Latihan gerak murni delapan hitungan",
          kind: "practice",
          body: "Gerak murni butuh kejelasan bentuk. Latihan ini memakai delapan hitungan sebagai satuan supaya kamu bisa mengulang dan menilai sendiri. Alat yang dipakai, ponsel, penghitung waktu, ruang 2 x 2 meter. Langkah kerja, 1) pilih empat gerak dari daftar gerak murni, 2) beri masing-masing dua hitungan, 3) ulangi rangkaian empat kali, 4) rekam dari depan dan dari samping, 5) tonton ulang dan tandai hitungan yang paling tidak rapi. Keselamatan kerja, pemanasan 10 menit, pendinginan 5 menit, dan berhenti bila sendi terasa nyeri. Kesalahan umum, menambah gerakan baru di tengah hitungan sehingga rangkaian tidak bisa diulang. Tugas, unggah satu rangkaian delapan hitungan yang stabil. Kriteria, bentuk terbaca dari dua sudut, hitungan konsisten, dan rangkaian bisa diulang tanpa melihat contoh.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Tubuh sebagai alat",
      summary:
        "Prasyarat, modul 1. Wiraga, wirama, wisara, ruang pribadi dan publik, serta waktu dan tenaga.",
      estimatedMinutes: 100,
      lessons: [
        {
          title: "Wiraga, badan yang siap",
          kind: "text",
          body: "Wiraga adalah unsur fisik dalam penyajian tari. Laporan menyebutnya sebagai unsur utama bersama wirama dan wisara. Wiraga bukan hanya bentuk tubuh, tetapi kesiapan menahan, memindahkan, dan menghentikan gerak. Alat yang dipakai, ruang 2 x 2 meter dan ponsel. Langkah kerja, 1) berdiri dengan berat badan terbagi, 2) lakukan delapan hitungan jalan di tempat, 3) ulangi dengan lutut sedikit ditekuk, 4) bandingkan mana yang lebih stabil, 5) catat tiga bagian tubuh yang perlu dikuatkan. Keselamatan kerja, hentikan bila lutut atau punggung nyeri, jangan memaksa rentang sendi. Kesalahan umum, mengunci lutut sehingga tubuh kaku dan mudah kehilangan keseimbangan. Tugas, rekam 30 detik jalan di tempat dan tulis tiga catatan tubuh. Kriteria, berat badan stabil, lutut tidak terkunci, dan catatan spesifik.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Wirama, tempo dan ritme",
          kind: "text",
          body: "Wirama berhubungan dengan tempo dan ritme. Dalam laporan, wirama termasuk unsur utama penyajian tari. Latihan paling sederhana adalah bertepuk pada hitungan tetap lalu mengubah tempo tanpa mengubah urutan gerak. Alat yang dipakai, ponsel atau metronom sederhana, ruang kosong. Langkah kerja, 1) pilih satu rangkaian delapan hitungan dari modul 1, 2) lakukan dengan hitungan lambat, 3) ulangi dengan tempo sedang, 4) ulangi cepat tanpa menambah gerakan, 5) rekam ketiganya. Keselamatan kerja, pemanasan pergelangan dan bahu sebelum bertepuk cepat. Kesalahan umum, mempercepat gerakan dengan memotong bentuk, bukan dengan menjaga bentuk dalam tempo lebih cepat. Tugas, unggah tiga tempo dari rangkaian yang sama. Kriteria, urutan gerak tetap, tempo berubah jelas, dan tidak ada gerakan yang terlewat.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Wisara, perasaan dan penghayatan",
          kind: "text",
          body: "Wisara berhubungan dengan perasaan dan penghayatan. Laporan memasukkannya sebagai unsur utama, tetapi tidak memberi rumus tentang cara menghayati. Latihan ini memakai arah pandang dan napas sebagai titik awal, bukan meniru emosi orang lain. Alat yang dipakai, ponsel dan catatan. Langkah kerja, 1) pilih satu gerak murni, 2) lakukan dengan pandangan ke bawah, 3) ulangi dengan pandangan ke depan, 4) ulangi dengan napas panjang di awal gerak, 5) tulis perbedaan yang kamu rasakan. Keselamatan kerja, jangan menahan napas sampai pusing. Kesalahan umum, membuat ekspresi wajah berlebihan tanpa mengubah kualitas gerak. Tugas, unggah dua versi gerak yang sama dan tulis dua kalimat pembanding. Kriteria, perbedaan penghayatan terlihat dari tubuh dan napas, bukan hanya dari wajah.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Ruang pribadi dan ruang publik",
          kind: "text",
          body: "Laporan membedakan ruang pribadi dan ruang publik. Ruang pribadi adalah jarak paling jauh yang dapat dijangkau seluruh anggota tubuh, ruang publik adalah ruang yang terbentuk dari lintasan gerak penari. Di rumah, kamu bisa berlatih keduanya tanpa panggung. Alat yang dipakai, lakban kertas atau tali untuk menandai batas, ruang 2 x 2 meter. Langkah kerja, 1) tandai batas 2 x 2 meter, 2) rentangkan tangan dan kaki untuk mengukur ruang pribadi, 3) buat lintasan lurus, diagonal, dan lingkaran untuk ruang publik, 4) ulangi satu motif sambil mengisi lintasan berbeda, 5) catat lintasan mana yang paling pas. Keselamatan kerja, pastikan tidak ada meja atau kabel di area latihan. Kesalahan umum, selalu menari di titik yang sama sehingga lantai tidak terpakai. Tugas, unggah foto denah tiga lintasan dan rekaman 30 detik. Kriteria, tiga lintasan berbeda terlihat dan ruang pribadi tidak melewati batas dengan aman.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Waktu dan tenaga",
          kind: "practice",
          body: "Waktu berhubungan dengan kecepatan, durasi, dan tempo, tenaga berhubungan dengan kekuatan tubuh saat melakukan gerak. Dua penari bisa memakai gerak yang sama tetapi terasa berbeda karena waktu dan tenaganya. Alat yang dipakai, ponsel, ruang 2 x 2 meter. Langkah kerja, 1) pilih satu gerak mengayun, 2) lakukan lambat dengan tenaga ringan, 3) ulangi cepat dengan tenaga kuat, 4) ulangi lambat dengan tenaga kuat, 5) rekam tiga versi dan beri nama. Keselamatan kerja, pemanasan 10 menit, terutama bahu dan pinggang. Kesalahan umum, menganggap tenaga kuat selalu berarti gerak besar. Tugas, unggah tiga versi dan satu tabel waktu-tenaga. Kriteria, tiga kombinasi berbeda terbaca dan tidak ada gerakan yang berhenti mendadak tanpa alasan.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Bentuk penyajian",
      summary:
        "Prasyarat, modul 1 dan 2. Tunggal, duet, kelompok, masal, dan kolosal, serta cara memilih bentuk yang masuk akal untuk ruang dan jumlah penari.",
      estimatedMinutes: 100,
      lessons: [
        {
          title: "Tunggal dan duet",
          kind: "text",
          body: "Menurut laporan, tari tunggal atau solo dipentaskan oleh satu penari, sedangkan tari berpasangan atau duet dipentaskan oleh dua orang. Bentuk tunggal menuntut penari mengisi ruang sendiri, duet menuntut pembagian arah dan waktu yang jelas. Alat yang dipakai, catatan dan ruang 2 x 2 meter. Langkah kerja, 1) tulis dua kelebihan bentuk tunggal, 2) tulis dua tantangan duet, 3) pilih satu motif delapan hitungan, 4) bayangkan pembagian gerak untuk dua penari, 5) catat siapa bergerak lebih dulu. Keselamatan kerja, tidak ada gerak cepat di pelajaran ini. Kesalahan umum, membuat duet yang sebenarnya hanya dua orang melakukan gerakan tunggal secara bersamaan. Tugas, tulis pembagian gerak duet dalam empat baris. Kriteria, ada perbedaan peran dan urutan yang jelas.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Kelompok, masal, dan kolosal",
          kind: "text",
          body: "Laporan membedakan tiga bentuk lain. Kelompok berarti lebih dari dua penari. Masal berarti banyak penari dengan gerakan yang sama secara bersamaan. Kolosal dilakukan secara masal oleh banyak kelompok dengan gerakan berbeda tiap kelompok, biasanya dalam adegan cerita besar, laporan menyebut Kisah Ramayana dan Mahabarata sebagai contoh. Alat yang dipakai, catatan. Langkah kerja, 1) tulis definisi ketiganya dengan kalimat sendiri, 2) beri satu contoh untuk tiap bentuk, 3) tandai bentuk yang paling mungkin kamu kerjakan di rumah, 4) tulis alasannya. Keselamatan kerja, tidak ada. Kesalahan umum, menyebut kolosal hanya karena jumlah penarinya banyak, padahal pembeda utamanya adalah beberapa kelompok dengan gerak berbeda. Tugas, isi tabel bentuk, definisi, dan contoh. Kriteria, ketiga definisi tepat dan contoh tidak tertukar.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Memilih bentuk sesuai acara",
          kind: "text",
          body: "Bentuk penyajian bukan soal mana yang paling megah, tetapi mana yang cocok dengan ruang, jumlah penari, dan durasi. Laporan tidak memberi aturan pemilihan, jadi bagian ini adalah pertimbangan platform, bukan kutipan sumber. Alat yang dipakai, catatan. Langkah kerja, 1) tulis tiga situasi acara, ruang tamu, halaman, dan panggung sekolah, 2) tentukan bentuk yang masuk akal untuk masing-masing, 3) tulis jumlah penari dan durasi, 4) periksa apakah bentuk itu masih bisa diulang. Keselamatan kerja, tidak ada. Kesalahan umum, memilih kolosal untuk ruang kecil sehingga penari bertabrakan. Tugas, unggah tabel tiga situasi dan pilihan bentuk. Kriteria, pilihan masuk akal dengan ruang dan jumlah penari, serta alasannya ditulis.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Latihan duet tanpa partner",
          kind: "practice",
          body: "Duet bisa dilatih sendiri dengan merekam dua peran terpisah, lalu menontonnya berdampingan. Cara ini melatih kesadaran arah dan waktu tanpa harus selalu ada partner. Alat yang dipakai, ponsel, penyangga, ruang 2 x 2 meter. Langkah kerja, 1) tentukan dua peran, A dan B, 2) rekam peran A delapan hitungan, 3) putar rekaman A dan lakukan peran B di sampingnya, 4) rekam hasilnya, 5) tandai bagian yang bertabrakan. Keselamatan kerja, beri jarak setidaknya satu rentang lengan dari benda keras. Kesalahan umum, peran B menyalin semua gerak A sehingga tidak ada dialog gerak. Tugas, unggah rekaman gabungan 30 detik dan dua catatan perbaikan. Kriteria, dua peran berbeda, tidak bertabrakan, dan waktu tetap delapan hitungan.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Latihan kelompok kecil",
          kind: "practice",
          body: "Kelompok berarti lebih dari dua penari. Di rumah, kamu bisa melatih pola kelompok dengan tiga penanda lantai, misalnya tiga botol air, lalu memindahkan diri dari satu titik ke titik lain mengikuti pola. Alat yang dipakai, tiga penanda, ponsel, ruang 2 x 3 meter. Langkah kerja, 1) letakkan tiga penanda membentuk segitiga, 2) tentukan urutan perpindahan, 3) lakukan delapan hitungan per posisi, 4) rekam dari atas bila memungkinkan, 5) periksa jarak antarposisi. Keselamatan kerja, penanda tidak licin dan tidak mudah jatuh. Kesalahan umum, hanya menghafal urutan tanpa menjaga jarak sehingga pola berantakan. Tugas, unggah rekaman dan sketsa pola. Kriteria, urutan posisi benar, jarak terjaga, dan hitungan tidak terpotong.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Fungsi tari",
      summary:
        "Prasyarat, modul 1 sampai 3. Upacara, pertunjukan, pendidikan, dan hiburan, lalu membedakan apresiasi dari konsumsi.",
      estimatedMinutes: 95,
      lessons: [
        {
          title: "Upacara dan pertunjukan",
          kind: "text",
          body: "Laporan menyebut empat fungsi tari. Sebagai sarana upacara, tari menjadi koneksi dengan dunia spiritual. Sebagai sarana pertunjukan, tari menjadi media pengembangan kreativitas dan komunikasi. Dua fungsi ini bisa bertumpang tindih, tetapi tidak selalu sama. Alat yang dipakai, catatan. Langkah kerja, 1) tulis dua fungsi itu dengan kalimat sendiri, 2) beri satu contoh untuk masing-masing, 3) tandai perbedaan suasana dan tujuan, 4) tulis satu pertanyaan yang masih tersisa. Keselamatan kerja, tidak ada. Kesalahan umum, menganggap semua tari upacara juga harus menghibur. Tugas, tulis dua paragraf pendek tentang perbedaan fungsi. Kriteria, dua fungsi tepat dan contohnya tidak tertukar.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Pendidikan dan hiburan",
          kind: "text",
          body: "Laporan juga menyebut tari sebagai sarana pendidikan dan sarana hiburan. Sebagai pendidikan, tari mengembangkan pengetahuan, nilai, keterampilan fisik, dan emosi. Sebagai hiburan, tari menjadi penghilang penat dan ungkapan ekspresi jiwa. Alat yang dipakai, catatan. Langkah kerja, 1) tulis tiga hal yang bisa dipelajari lewat tari, 2) tulis satu pengalaman menonton tari sebagai hiburan, 3) bandingkan keduanya, 4) catat mana yang lebih dekat dengan tujuanmu belajar. Keselamatan kerja, tidak ada. Kesalahan umum, menganggap fungsi hiburan lebih rendah daripada fungsi pendidikan. Tugas, tulis 120 kata tentang dua fungsi itu dalam pengalamanmu. Kriteria, dua fungsi dijelaskan dan ada contoh pribadi.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Apresiasi bukan konsumsi",
          kind: "text",
          body: "Apresiasi berarti berusaha memahami bentuk, konteks, dan maksud sebuah karya. Konsumsi berarti menonton untuk dipakai sesaat lalu dilupakan. Laporan tidak memakai istilah ini, jadi pembedaan berikut adalah catatan platform. Alat yang dipakai, catatan. Langkah kerja, 1) tulis satu pertunjukan yang kamu tonton, 2) tulis apa yang kamu pahami tentang bentuknya, 3) tulis apa yang kamu pahami tentang konteksnya, 4) tandai mana yang hanya kesan sesaat. Keselamatan kerja, tidak ada. Kesalahan umum, menilai karya hanya dari suka atau tidak suka tanpa menyebut alasan bentuk. Tugas, tulis catatan apresiasi 150 kata. Kriteria, ada deskripsi bentuk, konteks, dan alasan penilaian.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Membaca pertunjukan",
          kind: "practice",
          body: "Latihan ini melatih mata sebelum kamu menilai. Pilih satu rekaman tari pendek, lalu tonton tiga kali dengan fokus berbeda. Alat yang dipakai, ponsel atau laptop, catatan. Langkah kerja, 1) tonton sekali untuk kesan umum, 2) tonton ulang hanya untuk ruang dan lantai, 3) tonton ulang hanya untuk waktu dan tenaga, 4) tulis tiga pengamatan, 5) bandingkan dengan kesan pertama. Keselamatan kerja, jeda mata setiap 20 menit. Kesalahan umum, menonton sambil mengerjakan hal lain sehingga tidak ada yang benar-benar diamati. Tugas, unggah tiga catatan pengamatan. Kriteria, tiga aspek berbeda dan setiap catatan menyebut bagian pertunjukan.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Menulis catatan apresiasi",
          kind: "text",
          body: "Catatan apresiasi yang berguna menyebut apa yang terlihat, apa yang mungkin dimaksud, dan apa yang masih tidak diketahui. Pisahkan pengamatan dari tafsiran. Alat yang dipakai, catatan dan pena. Langkah kerja, 1) tulis tiga kalimat pengamatan, 2) tulis dua kalimat tafsiran, 3) beri tanda pada tafsiran, 4) tulis satu pertanyaan untuk pengajar, 5) rapikan menjadi satu paragraf. Keselamatan kerja, tidak ada. Kesalahan umum, mencampur tafsiran ke dalam pengamatan tanpa penanda. Tugas, unggah catatan 200 kata. Kriteria, pengamatan dan tafsiran terpisah, dan pertanyaan jelas.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Menyusun kreasi",
      summary:
        "Prasyarat, modul 1 sampai 4. Motif delapan hitungan, transisi, pola lantai, musik, properti, dan keselamatan tubuh.",
      estimatedMinutes: 120,
      lessons: [
        {
          title: "Motif gerak delapan hitungan",
          kind: "text",
          body: "Motif adalah satuan gerak yang bisa diulang. Untuk kreasi pendek, mulailah dari satu motif delapan hitungan yang bisa kamu ulang tanpa ragu. Alat yang dipakai, catatan, ponsel, ruang 2 x 2 meter. Langkah kerja, 1) pilih tiga gerak yang sudah dikuasai, 2) susun urutannya dalam delapan hitungan, 3) ulangi empat kali, 4) rekam dan tandai hitungan yang goyah, 5) sederhanakan bila terlalu padat. Keselamatan kerja, pemanasan 10 menit sebelum menyusun gerak cepat. Kesalahan umum, memasukkan terlalu banyak gerak sampai motif tidak bisa diulang. Tugas, unggah rekaman motif dan skor delapan hitungan. Kriteria, motif bisa diulang empat kali tanpa berhenti dan skor cocok dengan rekaman.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Transisi antar motif",
          kind: "text",
          body: "Transisi adalah jembatan antara satu motif dan motif berikutnya. Transisi yang baik tidak harus rumit, yang penting arah dan waktunya jelas. Alat yang dipakai, ponsel dan catatan. Langkah kerja, 1) siapkan dua motif delapan hitungan, 2) tentukan satu gerak transisi, misalnya melangkah atau memutar badan, 3) beri transisi empat hitungan, 4) ulangi rangkaian tiga kali, 5) rekam dan periksa apakah ada jeda canggung. Keselamatan kerja, pastikan arah putaran tidak membuat pusing, berhenti bila perlu. Kesalahan umum, mengisi transisi dengan gerakan baru yang lebih sulit daripada motifnya. Tugas, unggah rangkaian dua motif dengan transisi. Kriteria, perpindahan terbaca, tidak ada jeda mati, dan hitungan transisi tetap.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Pola lantai",
          kind: "text",
          body: "Pola lantai adalah lintasan yang membentuk ruang publik penari. Laporan membedakan ruang pribadi dan ruang publik, pola lantai memakai keduanya. Alat yang dipakai, lakban kertas, ruang 2 x 2 meter, ponsel. Langkah kerja, 1) gambar denah ruang di kertas, 2) tandai tiga titik utama, 3) buat lintasan lurus, diagonal, dan lengkung, 4) lakukan motif sambil mengikuti satu lintasan, 5) ulangi dengan lintasan lain dan bandingkan. Keselamatan kerja, pastikan lintasan tidak melewati kabel atau sudut meja. Kesalahan umum, membuat lintasan yang tidak muat di ruang latihan. Tugas, unggah denah dan rekaman satu lintasan. Kriteria, denah berskala wajar, lintasan muat, dan gerak tetap terbaca saat berpindah.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Musik dan iringan",
          kind: "text",
          body: "Laporan menyebut musik atau iringan sebagai unsur pendukung tari. Iringan membantu menjaga tempo, tetapi tidak boleh menutupi hitungan penari. Alat yang dipakai, ponsel atau pemutar musik, pengeras suara kecil. Langkah kerja, 1) pilih satu iringan dengan tempo stabil, 2) hitung delapan ketukan berulang, 3) lakukan motif mengikuti hitungan, bukan mengikuti lirik, 4) rekam, 5) ulangi dengan volume lebih kecil untuk memeriksa kejelasan gerak. Keselamatan kerja, atur volume agar telinga tidak sakit. Kesalahan umum, memilih lagu cepat lalu memotong gerakan agar cocok. Tugas, unggah rekaman 30 detik dengan iringan dan tulis sumber iringan. Kriteria, gerak mengikuti hitungan, iringan tidak menutupi aksen, dan sumber tercatat.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Properti dan busana sederhana",
          kind: "text",
          body: "Properti, busana, dan rias adalah unsur pendukung menurut laporan. Untuk kreasi di rumah, properti harus ringan dan tidak membahayakan. Alat yang dipakai, satu properti sederhana, misalnya selendang ringan atau kipas kertas, dan pakaian yang tidak menghambat gerak. Langkah kerja, 1) pilih properti yang bisa dikendalikan satu tangan, 2) uji gerak memutar dan mengayun, 3) pastikan properti tidak melintasi wajah tanpa arah, 4) rekam 30 detik, 5) catat satu alasan memakai properti itu. Keselamatan kerja, hindari properti berat, tajam, atau mudah tersangkut. Kesalahan umum, menambah properti untuk menutupi gerak yang belum jelas. Tugas, unggah rekaman dengan properti dan catatan alasan. Kriteria, properti terkendali, gerak tetap terbaca, dan alasan masuk akal.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Pemanasan, pendinginan, dan keselamatan tubuh",
          kind: "practice",
          body: "Tari memakai sendi, otot, dan napas. Pemanasan 10 menit dan pendinginan 5 menit bukan formalitas. Alat yang dipakai, matras tipis bila lantai keras, air minum, ruang 2 x 2 meter. Langkah kerja, 1) putar leher, bahu, pinggang, pinggul, lutut, dan pergelangan, 2) lakukan jalan di tempat tiga menit, 3) ulangi gerak utama dengan tempo lambat, 4) setelah latihan, lakukan peregangan ringan dan napas panjang, 5) catat bagian tubuh yang paling lelah. Keselamatan kerja, hentikan bila nyeri tajam, pusing, atau sesak, jangan memaksa split atau lompatan di lantai keras. Kesalahan umum, langsung melakukan gerak cepat tanpa pemanasan, atau melewatkan pendinginan karena sudah lelah. Tugas, unggah daftar pemanasan dan pendinginan yang kamu lakukan. Kriteria, daftar lengkap, urutan masuk akal, dan ada catatan tubuh.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Panggung dan penilaian",
      summary:
        "Prasyarat, modul 1 sampai 5. Rehearsal, menghadap penonton, merekam, menulis skor, dan ujian akhir kreasi dua menit.",
      estimatedMinutes: 95,
      lessons: [
        {
          title: "Rehearsal di ruang 2 x 2 meter",
          kind: "practice",
          body: "Rehearsal adalah latihan utuh, bukan latihan bagian. Di ruang kecil, rehearsal melatih pengendalian arah dan jarak. Alat yang dipakai, ponsel, penanda lantai, air minum. Langkah kerja, 1) tandai batas ruang, 2) pemanasan 10 menit, 3) jalankan seluruh kreasi tanpa berhenti, 4) tandai dua bagian yang paling sering goyah, 5) ulangi bagian itu saja, lalu jalankan utuh sekali lagi. Keselamatan kerja, sisakan ruang aman dari dinding dan benda keras. Kesalahan umum, berhenti setiap kali salah sehingga tidak pernah merasakan alur utuh. Tugas, unggah rekaman rehearsal utuh dan dua catatan perbaikan. Kriteria, kreasi berjalan tanpa berhenti dan catatan perbaikan spesifik.",
          estimatedMinutes: 25,
          accessLevel: "enrolled",
        },
        {
          title: "Menghadap penonton",
          kind: "text",
          body: "Menghadap penonton bukan berarti selalu melihat mata penonton. Yang penting adalah arah tubuh dan pandangan yang disengaja. Alat yang dipakai, kursi sebagai penanda penonton, ponsel. Langkah kerja, 1) letakkan kursi di satu sisi ruang, 2) lakukan motif dengan dada menghadap kursi, 3) ulangi dengan pandangan sesekali ke kursi, 4) ulangi dengan punggung menghadap kursi pada bagian tertentu, 5) catat bagian mana yang terasa paling jelas. Keselamatan kerja, jangan memutar leher mendadak. Kesalahan umum, menatap lantai sepanjang penampilan. Tugas, unggah rekaman 45 detik dan catatan arah pandang. Kriteria, arah tubuh jelas, pandangan disengaja, dan tidak ada gerak yang hanya menghadap cermin.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Merekam dengan ponsel",
          kind: "practice",
          body: "Rekaman yang baik cukup dengan ponsel, stabil, terang, dan seluruh tubuh masuk frame. Alat yang dipakai, ponsel, penyangga atau tumpukan buku, ruang 2 x 2 meter. Langkah kerja, 1) letakkan ponsel setinggi pinggang, 2) pastikan seluruh tubuh terlihat dari depan, 3) rekam dari dua sudut, depan dan samping, 4) jangan memakai filter atau musik tambahan, 5) periksa suara dan gambar sebelum mengunggah. Keselamatan kerja, penyangga ponsel harus stabil agar tidak jatuh. Kesalahan umum, merekam terlalu dekat sehingga kaki terpotong, atau memakai zoom digital sampai gambar pecah. Tugas, unggah dua sudut rekaman 30 detik. Kriteria, seluruh tubuh terlihat, gambar stabil, dan tidak ada potongan yang menyembunyikan gerak.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Ujian akhir, kreasi dua menit, skor gerak, evaluasi diri",
          kind: "practice",
          body: "Ujian akhir adalah satu kreasi dua menit untuk solo atau duet, rekaman pertunjukan, dan skor gerak tertulis. Skor memuat urutan motif, hitungan, arah lantai, dan iringan. Alat yang dipakai, ponsel, penyangga, ruang 2 x 2 meter, lembar skor, pakaian nyaman. Langkah kerja, 1) pemanasan 10 menit, 2) rekam kreasi dua menit dari depan, 3) rekam ulang dari samping bila memungkinkan, 4) tulis skor gerak per delapan hitungan, 5) tulis evaluasi diri, dua hal yang sudah baik dan dua yang perlu diperbaiki. Keselamatan kerja, hentikan bila nyeri atau pusing, pendinginan 5 menit setelah rekaman. Kesalahan umum, mengejar gerak sulit sampai kreasi tidak utuh, atau menulis skor setelah lupa urutan. Tugas, unggah rekaman dua menit, skor gerak, dan evaluasi diri. Kriteria, durasi dua menit, skor cocok dengan rekaman, gerak terbaca, dan evaluasi jujur.",
          estimatedMinutes: 30,
          accessLevel: "certified",
        },
      ],
    },
  ],
  [pathSlug("kulinerNusantara")]: [
    {
      title: "Gastronomi dan identitas",
      summary:
        "Modul pembuka tanpa prasyarat. Definisi makanan tradisional dan gastronomi, mengapa makanan disebut warisan, dan cara membaca laporan sumber.",
      estimatedMinutes: 100,
      lessons: [
        {
          title: "Makanan tradisional dan gastronomi",
          kind: "text",
          body: "Laporan Gastronomi Nusantara mendefinisikan makanan tradisional sebagai makanan atau minuman yang berkembang dalam suatu masyarakat dan diwariskan lewat kebiasaan, pengetahuan, serta praktik pengolahan dari generasi ke generasi. Gastronomi adalah kajian tentang makanan dan hubungannya dengan manusia serta kebudayaannya, meliputi bahan, teknik, rasa, sejarah, kebiasaan makan, dan makna sosial. Laporan itu adalah laporan siswa, bukan rujukan primer, jadi istilah di sini dipakai sebagai pengantar. Alat yang dipakai, catatan dan alat tulis. Langkah kerja, 1) tulis kedua definisi dengan kalimat sendiri, 2) sebut tiga hal yang termasuk kajian gastronomi, 3) tulis satu makanan tradisional dari daerahmu, 4) catat bahan dan cara pengolahannya. Keselamatan kerja, tidak ada. Kesalahan umum, menyempitkan gastronomi menjadi sekadar selera atau review makanan. Tugas, tulis 120 kata tentang satu makanan tradisional dan konteksnya. Kriteria, definisi tepat, ada contoh, dan konteksnya disebut.",
          estimatedMinutes: 20,
          accessLevel: "public",
        },
        {
          title: "Mengapa makanan disebut warisan",
          kind: "text",
          body: "Laporan menyebut makanan tradisional tidak hanya memenuhi kebutuhan pangan, tetapi juga menjadi penanda identitas kelompok, sarana pewarisan pengetahuan, serta bagian dari praktik adat dan keagamaan. Di balik hidangan tersimpan cerita asal-usul, nilai kebersamaan, cara masyarakat beradaptasi dengan lingkungan, dan pandangan hidup. Alat yang dipakai, catatan. Langkah kerja, 1) tulis tiga fungsi makanan menurut laporan, 2) beri satu contoh untuk masing-masing, 3) tandai mana yang pernah kamu alami, 4) tulis satu pertanyaan tentang asal sebuah hidangan. Keselamatan kerja, tidak ada. Kesalahan umum, menganggap semua cerita asal hidangan sudah pasti fakta sejarah. Tugas, tulis tiga fungsi dan satu contoh pribadi. Kriteria, tiga fungsi tepat dan contohnya nyata.",
          estimatedMinutes: 20,
          accessLevel: "public",
        },
        {
          title: "Membaca laporan gastronomi",
          kind: "text",
          body: "Laporan ini menyusun pembahasan dari beberapa rujukan awal, Badan Pusat Statistik, Basis Data Warisan Budaya Takbenda Kemendikbudristek, Kemenparekraf, UNESCO, dan Pemerintah Kabupaten Kulon Progo. Daftar pustakanya sendiri mencantumkan catatan bahwa judul, tahun, dan tanggal akses perlu dilengkapi. Artinya, laporan ini berguna sebagai gambaran awal, bukan sebagai sumber akhir. Alat yang dipakai, catatan. Langkah kerja, 1) tulis lima rujukan yang disebut, 2) tandai mana yang berupa data dan mana yang berupa lembaga, 3) tulis satu klaim yang perlu diverifikasi, 4) cari satu istilah yang belum jelas. Keselamatan kerja, tidak ada. Kesalahan umum, mengutip laporan siswa sebagai bukti sejarah tanpa memeriksa sumbernya. Tugas, tulis catatan sumber 150 kata. Kriteria, lima rujukan tercatat dan satu klaim ditandai untuk verifikasi.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Identitas dari bahan lokal",
          kind: "text",
          body: "Laporan menghubungkan keragaman kuliner dengan kondisi geografis, ketersediaan sumber daya alam, sejarah, dan kehidupan sosial masyarakat setempat. Bahan lokal karena itu bukan hanya soal murah, tetapi juga soal apa yang tumbuh dan tersedia di suatu tempat. Alat yang dipakai, catatan. Langkah kerja, 1) daftar lima bahan yang mudah ditemukan di pasar terdekat, 2) catat asal daerah bahan itu bila diketahui, 3) pilih satu bahan dan tulis satu hidangan yang memakainya, 4) bandingkan dengan bahan yang harus didatangkan dari luar. Keselamatan kerja, tidak ada. Kesalahan umum, menyamakan bahan lokal dengan bahan murah tanpa melihat konteks lingkungan. Tugas, unggah daftar lima bahan dan satu catatan asal. Kriteria, lima bahan nyata, asal dicatat, dan satu hidangan disebut.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Menulis catatan rasa",
          kind: "practice",
          body: "Catatan rasa yang berguna menyebut bahan, tekstur, suhu, dan kesan, bukan hanya enak atau tidak enak. Latihan ini memakai satu makanan yang ada di rumah. Alat yang dipakai, satu makanan, air minum, catatan. Langkah kerja, 1) amati warna dan bentuk, 2) cium aromanya, 3) rasakan teksturnya, 4) tulis tiga kata rasa dan satu kata tekstur, 5) tulis satu dugaan bahan. Keselamatan kerja, tanyakan bahan dan alergen sebelum mencicipi. Kesalahan umum, menulis kesimpulan suka atau tidak suka tanpa deskripsi. Tugas, unggah catatan rasa 120 kata. Kriteria, ada warna, aroma, tekstur, rasa, dan dugaan bahan.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Bahan dan lingkungan",
      summary:
        "Prasyarat, modul 1. Bahan lokal, belanja pasar, substitusi, keamanan pangan, halal dan non-halal sebagai konteks, serta alergi.",
      estimatedMinutes: 105,
      lessons: [
        {
          title: "Bahan lokal Yogyakarta",
          kind: "text",
          body: "Laporan menekankan bahan yang tersedia di lingkungan setempat. Di Yogyakarta, itu berarti pasar dan produsen lokal, bukan daftar bahan yang diseragamkan dari buku resep. Alat yang dipakai, catatan dan kantong belanja. Langkah kerja, 1) pilih tiga bahan pokok, misalnya tapioka, bawang putih, dan kelapa, 2) catat tempat membeli dan harga per satuan, 3) tulis bentuk dan kondisi yang layak, 4) catat satu bahan pengganti bila barang tidak ada. Keselamatan kerja, cuci tangan sebelum menangani bahan. Kesalahan umum, membeli bahan tanpa memeriksa tanggal dan kondisi kemasan. Tugas, unggah tabel tiga bahan dengan asal dan harga. Kriteria, tiga bahan nyata, harga satuan, dan kondisi dicatat.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Belanja di pasar",
          kind: "practice",
          body: "Pasar adalah tempat membaca ketersediaan dan musim. Belanja dengan daftar membuat kamu bisa membandingkan harga dan kualitas tanpa tergoda membeli berlebihan. Alat yang dipakai, daftar belanja, uang tunai secukupnya, kantong sendiri. Langkah kerja, 1) tulis daftar bahan dan jumlah, 2) bandingkan dua pedagang untuk satu bahan, 3) tanya asal bahan bila pedagang mengetahuinya, 4) catat harga dan berat, 5) periksa kembali daftar sebelum pulang. Keselamatan kerja, bawa uang secukupnya, jaga barang bawaan, dan cuci tangan setelah dari pasar. Kesalahan umum, membeli tanpa menimbang sehingga biaya per porsi tidak diketahui. Tugas, unggah foto daftar belanja dan catatan harga. Kriteria, daftar lengkap, harga dan berat tercatat, dan tidak ada pembelian di luar daftar tanpa alasan.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Substitusi bahan",
          kind: "text",
          body: "Substitusi berarti mengganti bahan karena tidak tersedia, lebih murah, atau kebutuhan diet. Penggantian mengubah tekstur dan rasa, jadi catat hasilnya. Alat yang dipakai, catatan. Langkah kerja, 1) pilih satu bahan dari resep, 2) tentukan satu pengganti yang masuk akal, 3) tulis perkiraan perubahan tekstur, 4) uji dalam porsi kecil, 5) catat hasilnya. Keselamatan kerja, periksa alergen pada bahan pengganti. Kesalahan umum, mengganti bahan utama tanpa menyesuaikan jumlah cairan atau waktu masak. Tugas, unggah catatan uji substitusi satu bahan. Kriteria, alasan penggantian jelas, hasil dicatat, dan tidak ada klaim yang berlebihan.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Keamanan pangan dan alergi",
          kind: "text",
          body: "Keamanan pangan dimulai dari tangan, alat, dan suhu. Alergi perlu ditanyakan sebelum menyajikan makanan kepada orang lain. Alat yang dipakai, sabun, air bersih, talenan terpisah untuk bahan mentah, dan catatan. Langkah kerja, 1) cuci tangan sebelum dan sesudah memegang bahan mentah, 2) pisahkan talenan daging dan sayur, 3) masak bahan sampai matang, 4) simpan makanan dingin pada suhu yang tepat, 5) tulis daftar alergen yang mungkin ada. Keselamatan kerja, jangan mencicipi adonan yang mengandung telur mentah, hentikan bila muncul gatal atau bengkak. Kesalahan umum, mencampur alat mentah dan matang tanpa dicuci. Tugas, unggah daftar periksa kebersihan dan alergen. Kriteria, lima butir kebersihan dan tiga alergen umum tercatat.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Halal dan non-halal sebagai konteks",
          kind: "text",
          body: "Laporan menyebut lawar dan babi guling sebagai hidangan Bali yang dapat hadir dalam konteks sosial maupun upacara tertentu, dengan ketentuan yang mengikuti adat setempat. Babi guling tentu non-halal bagi muslim, dan itu adalah konteks budaya, bukan penilaian. Alat yang dipakai, catatan. Langkah kerja, 1) tulis dua hidangan yang bahan utamanya babi, 2) catat daerah dan konteks yang disebut laporan, 3) tulis satu hidangan halal sebagai pembanding, 4) tulis satu kalimat yang menghormati perbedaan. Keselamatan kerja, tidak ada. Kesalahan umum, menyamakan non-halal dengan tidak layak dimakan bagi semua orang. Tugas, tulis 120 kata tentang konteks halal dan non-halal. Kriteria, dua contoh tepat, konteks disebut, dan tidak ada klaim normatif.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Teknik memasak",
      summary:
        "Prasyarat, modul 2. Rebus, bakar, asap, kukus, goreng, serta suhu, api, dan keselamatan dapur.",
      estimatedMinutes: 110,
      lessons: [
        {
          title: "Merebus, rawon dan soto",
          kind: "text",
          body: "Laporan menyebut merebus dipakai dalam hidangan seperti rawon dan soto. Perebusan memindahkan panas lewat air dan membuat bahan matang merata. Alat yang dipakai, panci, air, sumber api, sendok, dan penutup. Langkah kerja, 1) didihkan air secukupnya, 2) masukkan bahan yang lebih keras lebih dulu, 3) kecilkan api setelah mendidih, 4) buang kotoran yang mengapung, 5) masak sampai bahan empuk dan catat waktunya. Keselamatan kerja, uap panas, jangan membuka tutup dengan wajah tepat di atas panci. Kesalahan umum, api terlalu besar sampai air habis sebelum bahan matang. Tugas, unggah catatan satu kali merebus dengan waktu dan suhu api. Kriteria, waktu, jumlah air, dan kondisi bahan tercatat.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Membakar, sate dan iga",
          kind: "text",
          body: "Laporan menyebut membakar diterapkan pada sate dan iga bakar. Membakar memberi aroma dan warna permukaan, tetapi mudah gosong bila api terlalu dekat. Alat yang dipakai, panggangan, penjepit, kuas, dan alas tahan panas. Langkah kerja, 1) siapkan bahan dengan ukuran seragam, 2) panaskan panggangan, 3) letakkan bahan dengan jarak, 4) balik berkala dan olesi, 5) angkat saat matang dan catat waktu. Keselamatan kerja, jauhkan dari bahan mudah terbakar, pakai penjepit panjang, dan siapkan penutup untuk memadamkan api kecil. Kesalahan umum, mengolesi saus manis terlalu awal sehingga cepat gosong. Tugas, unggah catatan membakar dan foto hasil. Kriteria, tidak gosong, matang merata, dan waktu dicatat.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Mengasap, se'i",
          kind: "text",
          body: "Laporan menyebut pengasapan dikenal dalam pengolahan se'i sapi dari Nusa Tenggara Timur. Asap memberi aroma dan membantu pengawetan, tetapi perlu ruang berventilasi. Alat yang dipakai, wadah pengasap sederhana, bahan bakar asap, penutup, dan ventilasi. Langkah kerja, 1) siapkan bahan yang sudah dibumbui, 2) panaskan alat pengasap, 3) letakkan bahan di rak, 4) tutup dan jaga asap tetap keluar, 5) catat waktu dan kondisi bahan. Keselamatan kerja, kerjakan di luar ruangan atau dengan ventilasi paksa, jauhkan dari anak-anak. Kesalahan umum, ruangan tertutup penuh asap sehingga tidak terlihat dan berbahaya. Tugas, unggah catatan pengasapan dan satu foto. Kriteria, ventilasi jelas, waktu dicatat, dan bahan tidak gosong.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Mengukus dan menggoreng",
          kind: "text",
          body: "Mengukus memakai uap, menggoreng memakai minyak panas. Keduanya memerlukan kendali suhu. Geblek di modul berikut memakai menggoreng, sedangkan tumpeng memakai mengukus nasi. Alat yang dipakai, kukusan, wajan, minyak, termometer dapur bila ada, dan penjepit. Langkah kerja, 1) panaskan air kukusan sebelum bahan masuk, 2) jaga air tidak menyentuh bahan, 3) untuk menggoreng, panaskan minyak dengan api sedang, 4) uji dengan sepotong kecil, 5) goreng sedikit-sedikit agar suhu tidak turun. Keselamatan kerja, minyak panas, jangan memasukkan bahan basah ke minyak, jauhkan wajah dan tangan. Kesalahan umum, menggoreng terlalu banyak sekaligus sehingga bahan menyerap minyak. Tugas, unggah catatan satu kali mengukus atau menggoreng. Kriteria, suhu api, waktu, dan jumlah bahan tercatat.",
          estimatedMinutes: 25,
          accessLevel: "enrolled",
        },
        {
          title: "Suhu, api, dan keselamatan dapur",
          kind: "text",
          body: "Keselamatan dapur mencakup minyak panas, uap, api, talenan, dan kebersihan. Minyak panas memercik bila ada air, uap bisa membakar wajah, api bisa menjalar ke kain, talenan mentah harus dipisah, tangan harus dicuci. Alat yang dipakai, penutup wajan, penjepit panjang, talenan terpisah, kain kering, dan pemadam api dapur. Langkah kerja, 1) keringkan bahan sebelum menggoreng, 2) letakkan gagang wajan menjauh dari tepi, 3) jangan tinggalkan minyak panas tanpa pengawasan, 4) tutup wajan bila minyak terbakar, jangan disiram air, 5) bersihkan permukaan setelah selesai. Keselamatan kerja, untuk luka bakar ringan, alirkan air dingin, hentikan memasak bila ruangan berasap. Kesalahan umum, menuang air ke minyak panas atau memakai satu talenan untuk daging mentah dan sayur. Tugas, unggah daftar periksa keselamatan dapur 12 butir. Kriteria, 12 dari 12 butir terpenuhi dan foto dapur ditambahkan.",
          estimatedMinutes: 25,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Geblek Kulon Progo",
      summary:
        "Prasyarat, modul 3. Bahan yang dipakai, adonan, bentuk angka delapan, menggoreng, serta makna dan motif Geblek Renteng.",
      estimatedMinutes: 110,
      lessons: [
        {
          title: "Geblek, bahan dan bentuk",
          kind: "text",
          body: "Laporan menyebut geblek sebagai makanan tradisional Kulon Progo yang umumnya dibuat dari pati singkong atau tapioka dengan bumbu seperti bawang putih, dan berbentuk seperti angka delapan atau dua lingkaran yang saling terhubung. Alat yang dipakai, catatan dan bahan. Langkah kerja, 1) tulis tiga bahan yang disebut laporan, 2) catat satu bahan yang tidak disebut tetapi lazim, lalu tandai sebagai tambahan, 3) gambar bentuk angka delapan, 4) tulis perkiraan tekstur. Keselamatan kerja, tidak ada bahan panas. Kesalahan umum, menambahkan bahan yang tidak ada di sumber lalu menganggapnya bagian resep asli. Tugas, unggah catatan bahan dan sketsa bentuk. Kriteria, bahan sumber dan tambahan dibedakan dengan jelas.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Membuat adonan geblek",
          kind: "practice",
          body: "Adonan geblek memakai tapioka dan bawang putih. Perbandingan tidak disebut laporan, jadi catat versimu sendiri dan ulangi sebelum menilai. Alat yang dipakai, mangkuk, timbangan, bawang putih, tapioka, air, dan sendok. Langkah kerja, 1) timbang tapioka, 2) haluskan bawang putih dan campurkan, 3) tambahkan air sedikit-sedikit sampai adonan bisa dipulung, 4) uleni sampai rata, 5) catat berat dan jumlah air. Keselamatan kerja, cuci tangan dan alat sebelum dan sesudah. Kesalahan umum, menuang air sekaligus sehingga adonan terlalu lembap dan lengket. Tugas, unggah catatan takaran dan foto adonan. Kriteria, takaran tercatat, adonan bisa dipulung, dan tidak ada bahan yang tidak dicatat.",
          estimatedMinutes: 25,
          accessLevel: "enrolled",
        },
        {
          title: "Membentuk angka delapan",
          kind: "practice",
          body: "Bentuk khas geblek adalah angka delapan atau dua lingkaran yang saling terhubung. Membentuk dengan tangan melatih kendali ukuran. Alat yang dipakai, adonan, talenan, dan sedikit tepung untuk taburan. Langkah kerja, 1) ambil adonan sebesar ibu jari, 2) gulung memanjang, 3) lengkungkan menjadi dua lingkaran, 4) pertemukan ujungnya, 5) letakkan di talenan dan ulangi sepuluh kali. Keselamatan kerja, jangan memakai talenan bekas daging mentah tanpa dicuci. Kesalahan umum, membuat lingkaran terlalu tipis sehingga putus saat digoreng. Tugas, unggah foto sepuluh geblek mentah dengan ukuran seragam. Kriteria, bentuk terbaca sebagai angka delapan dan ketebalan cukup.",
          estimatedMinutes: 25,
          accessLevel: "enrolled",
        },
        {
          title: "Menggoreng dan menilai tekstur",
          kind: "practice",
          body: "Geblek digoreng sampai bagian luar renyah dan bagian dalam kenyal. Laporan menyebut tekstur kenyal sebagai ciri, jadi jangan menilai hanya dari warna. Alat yang dipakai, wajan, minyak, penjepit, piring beralas kertas. Langkah kerja, 1) panaskan minyak dengan api sedang, 2) uji satu geblek, 3) goreng beberapa sekaligus tanpa menumpuk, 4) balik bila sisi bawah sudah kekuningan, 5) tiriskan dan catat waktu. Keselamatan kerja, minyak panas, keringkan permukaan geblek sebelum masuk wajan, dan jangan tinggalkan wajan. Kesalahan umum, api terlalu besar sehingga luar gosong tetapi dalam masih mentah. Tugas, unggah foto hasil goreng dan catatan waktu. Kriteria, tidak gosong, tekstur kenyal, dan waktu dicatat.",
          estimatedMinutes: 25,
          accessLevel: "enrolled",
        },
        {
          title: "Makna dan motif Geblek Renteng",
          kind: "text",
          body: "Laporan menyebut penafsiran budaya yang berkembang, warna putih dimaknai ketulusan dan kesucian, tekstur kenyal sebagai keluwesan menghadapi perubahan, rasa gurih sebagai pengingat keharmonisan, dan bentuk terhubung sebagai persatuan dan gotong royong. Laporan sendiri menegaskan bahwa itu narasi atau interpretasi budaya, bukan makna baku. Kulon Progo juga dikenal dengan motif batik Geblek Renteng yang mengangkat bentuk geblek sebagai identitas daerah. Alat yang dipakai, catatan. Langkah kerja, 1) tulis empat unsur dan tafsirannya, 2) tandai kata interpretasi, 3) tulis satu kalimat yang menyebut sumber, 4) tulis satu contoh motif batik lain yang terinspirasi makanan. Keselamatan kerja, tidak ada. Kesalahan umum, menulis tafsiran sebagai fakta sejarah. Tugas, tulis 150 kata dengan kata interpretasi dan sumber. Kriteria, empat tafsiran tepat dan status interpretasi jelas.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Hidangan dan upacara",
      summary:
        "Prasyarat, modul 1 sampai 4. Tumpeng, ketupat, lawar dan babi guling, rewang, makan bajamba, rendang, serta biaya dan porsi.",
      estimatedMinutes: 120,
      lessons: [
        {
          title: "Tumpeng",
          kind: "text",
          body: "Laporan menyebut tumpeng sebagai sajian nasi berbentuk kerucut dengan aneka lauk, sering hadir dalam selamatan dan peristiwa penting. Bentuk kerucut kerap dikaitkan dengan gunung dalam kosmologi Jawa, dalam tradisi tertentu tumpeng menjadi simbol syukur, harapan keselamatan, dan hubungan manusia dengan Tuhan, sesama, dan alam. Kata kerap dan tradisi tertentu menandakan tafsiran, bukan aturan baku. Alat yang dipakai, catatan. Langkah kerja, 1) tulis bentuk dan bahan utama, 2) tulis dua makna yang disebut, 3) tandai kata yang menunjukkan tafsiran, 4) tulis satu pertanyaan tentang tradisi keluargamu. Keselamatan kerja, tidak ada. Kesalahan umum, menganggap semua tumpeng wajib memakai lauk yang sama. Tugas, tulis 120 kata tentang tumpeng dan status tafsirannya. Kriteria, bentuk, makna, dan status interpretasi tepat.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Ketupat dan Idulfitri",
          kind: "text",
          body: "Laporan menyebut ketupat lekat dengan perayaan Idulfitri di berbagai wilayah Indonesia dan sering dihubungkan dengan silaturahmi serta saling memaafkan. Laporan tidak merinci asal-usul sejarahnya, jadi jangan menambah klaim yang tidak ada. Alat yang dipakai, catatan. Langkah kerja, 1) tulis bahan dan bentuk ketupat, 2) tulis dua nilai yang dihubungkan dengannya, 3) catat satu hidangan pendamping, 4) tulis satu pengalaman Idulfitri. Keselamatan kerja, tidak ada. Kesalahan umum, mengarang tahun atau tokoh asal ketupat. Tugas, tulis 100 kata tentang ketupat dan konteksnya. Kriteria, dua nilai disebut dan tidak ada klaim sejarah tambahan.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Lawar dan babi guling Bali",
          kind: "text",
          body: "Laporan menyebut lawar dan babi guling dikenal dalam tradisi kuliner Bali dan dapat hadir dalam konteks sosial maupun upacara tertentu, dengan ketentuan yang mengikuti adat setempat. Keduanya berbahan babi, sehingga non-halal bagi muslim. Alat yang dipakai, catatan. Langkah kerja, 1) tulis dua hidangan dan daerahnya, 2) tulis dua konteks yang disebut, 3) catat satu ketentuan yang mengikuti adat, 4) tulis satu kalimat pembanding dengan hidangan di daerahmu. Keselamatan kerja, tidak ada. Kesalahan umum, menyebut semua lawar berbahan babi, laporan tidak merinci variasi. Tugas, tulis 120 kata. Kriteria, dua hidangan tepat, konteks disebut, dan tidak ada generalisasi.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Rewang dan makan bajamba",
          kind: "text",
          body: "Laporan menyebut rewang di Jawa sebagai tradisi membantu tuan rumah menyiapkan keperluan hajatan, dan makan bajamba di Minangkabau sebagai tradisi makan bersama. Keduanya menumbuhkan kerja sama, rasa saling membantu, dan ikatan kekeluargaan. Alat yang dipakai, catatan. Langkah kerja, 1) tulis dua tradisi dan daerahnya, 2) tulis tiga nilai yang disebut, 3) catat satu pengalaman kerja bersama, 4) tulis satu perbedaan suasana keduanya. Keselamatan kerja, tidak ada. Kesalahan umum, menyamakan rewang dengan katering berbayar. Tugas, tulis 120 kata tentang satu tradisi memasak bersama. Kriteria, dua tradisi tepat dan tiga nilai disebut.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Rendang dan narasi kesabaran",
          kind: "text",
          body: "Laporan menyebut rendang dari Sumatra Barat sebagai hidangan yang proses pengolahannya memerlukan waktu dan perhatian. Dalam narasi budaya Minangkabau, rendang kerap dihubungkan dengan nilai kesabaran, ketekunan, musyawarah, dan kebersamaan. Laporan mengingatkan bahwa pemaknaan filosofis perlu dilihat berdasarkan sumber dan konteks budaya yang menjelaskannya. Alat yang dipakai, catatan. Langkah kerja, 1) tulis asal rendang, 2) tulis empat nilai yang dihubungkan, 3) tandai kata kerap, 4) tulis satu kalimat yang menyebut status narasi. Keselamatan kerja, tidak ada. Kesalahan umum, menulis rendang sebagai simbol resmi tunggal Minangkabau. Tugas, tulis 150 kata dengan sumber dan status narasi. Kriteria, empat nilai tepat dan status narasi jelas.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Biaya dan porsi",
          kind: "text",
          body: "Hidangan yang enak tetapi tidak terukur sulit diulang. Hitung biaya per porsi dari bahan, energi, dan kemasan bila ada. Alat yang dipakai, nota belanja, timbangan, kalkulator, dan catatan. Langkah kerja, 1) daftar bahan untuk satu kali masak, 2) catat harga satuan dan jumlah yang dipakai, 3) timbang hasil jadi, 4) bagi hasil menjadi porsi, 5) hitung biaya per porsi dan bandingkan dengan harga jual bila kamu menjual. Keselamatan kerja, tidak ada. Kesalahan umum, lupa menghitung minyak, gas, dan kemasan. Tugas, unggah tabel biaya dan jumlah porsi. Kriteria, semua bahan tercatat, ada harga satuan, dan biaya per porsi dihitung.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Eksistensi dan pelestarian",
      summary:
        "Prasyarat, modul 1 sampai 5. Kategori eksistensi, dokumentasi resep, inovasi, wisata, storynomics, dan ujian akhir.",
      estimatedMinutes: 100,
      lessons: [
        {
          title: "Tiga kategori eksistensi",
          kind: "text",
          body: "Laporan mengelompokkan makanan tradisional untuk kepentingan pembelajaran, bukan sebagai klasifikasi resmi. Kategori pertama adalah makanan yang mulai jarang ditemukan, dengan contoh karangan, cethot, dan entog-entog, laporan meminta status kelangkaan tiap contoh diverifikasi menurut daerahnya. Kategori kedua kurang populer, dengan contoh kethak, adrem, wedang tahu, dan lemet. Kategori ketiga tetap populer, dengan contoh gudeg, sate klathak, emping melinjo, dan tiwul. Alat yang dipakai, catatan. Langkah kerja, 1) tulis tiga kategori, 2) tulis contohnya, 3) tandai satu contoh yang perlu diverifikasi, 4) tulis satu makanan di daerahmu untuk tiap kategori bila ada. Keselamatan kerja, tidak ada. Kesalahan umum, menganggap kategori ini berlaku sama di semua daerah. Tugas, unggah tabel tiga kategori dan contoh. Kriteria, kategori dan contoh tepat, serta status nonresmi disebut.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Dokumentasi resep",
          kind: "practice",
          body: "Dokumentasi membuat pengetahuan tidak hilang bersama pembuatnya. Catat bahan, takaran, teknik, waktu, dan cerita singkat dari pembuat resep. Alat yang dipakai, catatan, timbangan, ponsel. Langkah kerja, 1) tulis nama hidangan dan daerah, 2) catat bahan dan takaran, 3) tulis langkah berurutan, 4) catat sumber resep, misalnya keluarga atau tetangga, 5) foto bahan dan hasil. Keselamatan kerja, minta izin sebelum memotret orang dan menuliskan namanya. Kesalahan umum, menulis resep tanpa sumber sehingga sulit ditelusuri. Tugas, unggah satu kartu resep lengkap. Kriteria, bahan, takaran, langkah, sumber, dan foto ada.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Inovasi, wisata, dan storynomics",
          kind: "text",
          body: "Laporan menyebut beberapa upaya pelestarian, edukasi gastronomi, dokumentasi dan digitalisasi, inovasi produk dan kemasan, pengembangan wisata gastronomi, dan pemberdayaan masyarakat. Pendekatan storynomics dipakai untuk menyampaikan cerita dan konteks budaya, dengan catatan agar cerita disampaikan secara bertanggung jawab, menghormati pemilik tradisi, serta membedakan fakta sejarah dari interpretasi atau legenda. Alat yang dipakai, catatan. Langkah kerja, 1) tulis lima upaya pelestarian, 2) pilih satu yang bisa kamu lakukan, 3) tulis satu ide inovasi kemasan, 4) tulis satu kalimat cerita yang tidak mengarang fakta. Keselamatan kerja, tidak ada. Kesalahan umum, memakai cerita rakyat sebagai klaim sejarah. Tugas, tulis 150 kata tentang satu upaya pelestarian. Kriteria, lima upaya disebut dan satu ide nyata dijelaskan.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Ujian akhir, masak, dokumentasi, cerita, pelestarian",
          kind: "practice",
          body: "Ujian akhir menggabungkan seluruh modul. Pilih geblek atau tumpeng mini, masak di dapur rumah, dokumentasikan bahan dan teknik, lalu tulis cerita 300-500 kata dan satu langkah pelestarian. Alat yang dipakai, bahan, alat dapur, timbangan, ponsel, dan catatan. Langkah kerja, 1) tulis rencana menu dan daftar bahan, 2) masak dengan mencatat takaran, suhu api, dan waktu, 3) foto bahan, proses, dan hasil, 4) hitung biaya dan porsi, 5) tulis cerita 300-500 kata yang membedakan fakta dan interpretasi, 6) tulis satu langkah pelestarian yang bisa dilakukan. Keselamatan kerja, protokol keselamatan dapur modul 3 berlaku penuh, hentikan bila minyak terbakar atau ruangan berasap. Kesalahan umum, hanya memotret hasil akhir, atau menulis cerita tanpa sumber. Tugas, unggah foto proses, kartu resep, tabel biaya, cerita, dan catatan pelestarian. Kriteria, hidangan jadi, dokumentasi lengkap, cerita sesuai panjang, dan langkah pelestarian nyata.",
          estimatedMinutes: 30,
          accessLevel: "certified",
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
export const seedCurriculum = internalMutation({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const clock = createSeedClock(args.now)
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
        const moduleCreatedAt = clock.ago(
          372 - curriculumOrder * 30 - moduleIndex * 9,
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
            // A lesson may attach audio or video, so resolve against its own
            // kind instead of assuming every attachment is an image.
            const mediaKind =
              lesson.kind === "audio" || lesson.kind === "video"
                ? lesson.kind
                : lesson.kind === "file"
                  ? "document"
                  : "image"
            mediaAssetIds.push(
              await resolveMediaAsset(ctx, lesson.mediaFile, mediaKind),
            )
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
      // `paths.modules` mirrors the curriculum that exists. A planned path has
      // draft modules, so counting only published rows would report 0 and hide
      // the work in progress. The path copy labels that curriculum as planned.
      await ctx.db.patch(path._id, {
        modules: isDraft ? modules.length : publishedModules,
      })
    }

    return { modules: moduleCount, lessons: lessonCount }
  },
})
