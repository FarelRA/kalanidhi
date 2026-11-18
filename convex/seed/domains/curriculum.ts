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
      title: "Bambu: permukaan keras, garis rapat",
      summary:
        "Modul pembuka, tanpa prasyarat. Mengapa batik bambu berbeda dari batik kain, bambu seperti apa yang layak, dan bagaimana menyiapkan permukaannya sebelum canting dipakai.",
      estimatedMinutes: 105,
      lessons: [
        {
          title: "Apa itu batik bambu",
          kind: "text",
          body: "Batik bambu adalah cara menghias permukaan bambu dengan malam panas sebagai perintang warna. Malam, atau lilin batik, menutup bagian yang ingin tetap terang; bagian yang tidak tertutup menerima pewarna. Setelah warna cukup, malam dilepas dengan air panas, proses yang disebut nglorod. Canting adalah alat pena berisi malam; mbabar berarti mewarnai di atas motif, nembok berarti menutup motif dengan malam, dan mepe berarti mengeringkan. Pada kain, malam meresap ke serat. Pada bambu, permukaan luar lebih keras dan menahan malam di permukaan, sedangkan ujung potong dan serat terbuka menyerap lebih banyak. Karena itu garis di bambu harus rapat dan diperiksa dari arah cahaya miring, bukan dari tembusnya malam ke sisi belakang; tutup dua kali dan uji pada potongan sisa. Jalur ini memakai materi Paguyuban Batik Tulis Giriloyo (2022) yang kami pegang untuk kain, lalu menyesuaikannya untuk bambu dengan rujukan Fitinline (2013), profil Desa Wisata Krebet di Jadesta Kementerian Pariwisata, dan artikel karakteristik batang bambu di Jurnal Hutan Tropis Universitas Mulawarman. Krebet dikenal sebagai desa batik kayu; sebagian pengrajin di sana juga membatik bambu. Urutan kerja jalur ini: pilih bambu, rebus, keringkan, amplas, pola, nglowongi (garis), ngisen-isen (isian), mbabar (warna motif), nembok (tutup motif), warna dasar, nglorod, mepe, finishing, dan periksa. Alat: tidak ada, cukup catatan dan alat tulis. Langkah: 1) baca pelajaran ini; 2) tulis tiga perbedaan kain dan bambu; 3) tulis urutan empat belas langkah di atas dari ingatan. Keselamatan: malam panas dan kompor dibahas di modul alat; jangan mencoba sendiri sebelum alat dan ventilasi siap. Kesalahan umum: mengira malam meresap seperti di kain, lalu membuat garis tipis yang bocor saat diwarnai. Perbaiki dengan menutup garis dua kali dan menguji pada potongan sisa. Tugas: tulis tiga perbedaan, satu alasan mengapa uji potongan bambu wajib, dan urutan empat belas langkah. Kriteria: tiga perbedaan tepat, alasan menyebut ujung potong dan serat terbuka, dan urutan lengkap.",
          estimatedMinutes: 15,
          accessLevel: "public",
        },
        {
          title: "Memilih bambu yang layak dibatik",
          kind: "text",
          body: "Bambu yang terlalu muda banyak mengandung air dan pati, mudah berjamur, dan berubah bentuk; bambu yang terlalu tua mudah pecah. Artikel karakteristik batang bambu di Jurnal Hutan Tropis Universitas Mulawarman, yang mengutip Troya dan Xu (2014), menyebut batang siap pakai pada umur 3 sampai 5 tahun. Pilih batang yang lurus, kulit bersih, tidak berlubang kumbang, tidak berjamur, dan tidak retak di ruas. Untuk nampan atau panel, siapkan bilah dengan lebar dan panjang sesuai benda kerja; untuk box tisu, anyaman bambu lebih mudah dibatik rata. Alat: gergaji atau pisau raut, meteran, kapur penanda, sarung tangan, dan masker. Langkah: 1) periksa rumpun dan pilih batang umur 3 sampai 5 tahun; 2) potong dengan alat tajam, arahkan mata pisau menjauh dari tangan; 3) buang ruas yang retak atau berlubang; 4) potong menjadi bilah sesuai ukuran, lalu beri label tanggal dan asal; 5) catat tebal bilah karena tebal menentukan lama perebusan dan pengeringan. Keselamatan: sarung tangan untuk serpihan, masker saat memotong, dan alas kaki tertutup. Jangan memotong bambu yang ditopang lutut. Kesalahan umum: memilih bambu hijau karena mudah dipotong; gejalanya bercak hijau dan bau asam setelah beberapa hari. Perbaiki dengan mengganti bilah, bukan menutupinya dengan cat. Tugas: pilih tiga batang, tolak satu dengan alasan tertulis, foto dan catat umur serta ukuran. Kriteria: tiga catatan lengkap dan satu penolakan beralasan.",
          estimatedMinutes: 20,
          accessLevel: "public",
        },
        {
          title: "Merebus dan mengeringkan bambu",
          kind: "text",
          body: "Perebusan bertujuan membuang pati dan getah yang membuat bambu mudah diserang serangga dan gagal saat dilapisi (Fitinline, 2013). Setelah direbus, bambu dijemur benar-benar kering agar mudah diamplas dan tidak berjamur. Alat: panci atau drum yang cukup besar, sumber api, penahan panas, sarung tangan tahan panas, penjepit, tempat penirisan, dan rak berventilasi. Langkah: 1) potong bambu sesuai ukuran kerja; 2) isi wadah sampai bilah terendam seluruhnya, lalu didihkan; 3) rebus 30 sampai 60 menit sebagai titik awal untuk bilah tipis, lebih lama untuk bilah tebal; sumber tidak memberi durasi tetap, jadi catat waktu mulai dan selesai versimu. Air harus mendidih dan seluruh bilah terendam, balik bila perlu. Untuk bambu tanpa pelapis, sebagian perajin menambahkan boraks atau asam borat sesuai petunjuk kemasan untuk membantu membuang pati dan mencegah jamur; ini pilihan, bukan keharusan; 4) angkat dengan penjepit, tiriskan, lalu jemur di tempat teduh dan berangin, bukan di bawah matahari langsung; 5) balik secara berkala dan hentikan penjemuran ketika permukaan tidak lembap, warna merata, dan tidak ada bercak. Timbang bilah sebelum dan sesudah untuk memastikan beratnya stabil. Keselamatan: air mendidih, uap, dan api; kerjakan di luar ruangan atau dengan ventilasi paksa, pakai sarung tangan, jangan menambah air ke wadah berminyak, dan jauhkan anak-anak. Kesalahan umum: menumpuk bilah basah sehingga berjamur, atau menjemur terlalu panas sampai retak. Perbaiki dengan membuka tumpukan dan memindahkan ke tempat teduh. Tugas: rebus dan keringkan tiga bilah, catat waktu serta kondisi awal dan akhir. Kriteria: tiga bilah kering, tidak berjamur, dan tidak retak.",
          estimatedMinutes: 25,
          accessLevel: "enrolled",
        },
        {
          title: "Mengamplas dan memeriksa permukaan",
          kind: "text",
          body: "Permukaan bambu yang kasar membuat malam tidak menempel rata; serat yang terangkat juga membuat garis canting melebar. Mengamplas searah serat, lalu membersihkan debu, adalah pekerjaan yang menentukan hasil semua modul berikutnya. Alat: amplas kasar dan halus, balok pengganjal, kain kering, masker debu, kacamata pelindung, dan sarung tangan. Langkah: 1) mulai dari amplas kasar pada bagian yang kasar atau bekas pisau; 2) lanjutkan ke amplas halus searah serat, jangan memutar; 3) usap debu dengan kain kering, jangan meniup dengan mulut; 4) periksa di bawah cahaya miring; 5) tandai bagian yang masih kasar dengan pensil ringan, lalu ulangi. Keselamatan: debu bambu dapat mengiritasi saluran napas, jadi pakai masker dan kerjakan di ruang berangin; jangan mengamplas di dekat makanan atau anak-anak. Kesalahan umum: mengamplas melawan serat sehingga muncul goresan dalam, atau membiarkan debu di pori sehingga malam menggelembung. Perbaiki goresan dengan amplas halus, dan bersihkan debu sebelum membatik. Tugas: amplas satu bilah 30 cm, unggah foto sebelum dan sesudah serta foto permukaan setelah diusap. Kriteria: permukaan rata, tidak ada goresan melawan serat, dan tidak ada debu yang menempel di kain uji.",
          estimatedMinutes: 25,
          accessLevel: "enrolled",
        },
        {
          title: "Alat, bahan, dan meja kerja",
          kind: "text",
          body: "Alat dan bahan menentukan apakah malam bisa mengalir stabil. Canting punya tiga bagian: nyamplung sebagai wadah malam, cucuk sebagai corong, dan pegangan. Wajan kecil menampung malam di atas kompor; gawangan atau rak penopang menjaga bambu tetap datar dan tidak menyentuh meja. Alat: satu canting halus, satu canting sedang, wajan kecil, kompor, gawangan atau rak penopang, pensil, penghapus, kuas untuk colet, kain perca untuk uji, dan penjepit. Bahan: malam, pewarna, sarung tangan, masker, dan celemek. Jangan memakai canting yang cucuknya bengkok. Langkah: 1) letakkan kompor di permukaan stabil dan jauh dari kain; 2) isi wajan dengan malam secukupnya, jangan sampai meluap; 3) panaskan dengan api kecil; 4) uji aliran pada kain perca atau potongan bambu sisa; 5) susun alat dalam jangkauan tangan, dan letakkan wadah air dingin untuk pertolongan pertama luka bakar. Keselamatan: ruang berangin, jangan tinggalkan malam panas tanpa pengawasan, jangan meniup cucuk yang panas, dan jangan menyiram api malam dengan air; tutup wajan untuk memadamkan. Kesalahan umum: api terlalu besar sampai malam berasap dan menghitam, atau canting tersumbat karena malam dingin. Perbaiki dengan menurunkan api dan membersihkan cucuk dengan peniti secara hati-hati. Tugas: foto meja kerja dan isi daftar periksa 10 butir. Kriteria: 10 dari 10 butir terpenuhi.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Pola: memindahkan motif Giriloyo ke bambu",
      summary:
        "Prasyarat: modul 1. Mengenal motif, menggambar dengan pensil, membagi bidang, dan menyesuaikan pola pada permukaan datar, lengkung, atau anyaman.",
      estimatedMinutes: 95,
      lessons: [
        {
          title: "Motif Giriloyo yang bisa dipindahkan",
          kind: "text",
          body: "Motif adalah bahasa bentuk. Materi Giriloyo yang kami pegang menyebut delapan motif larangan Keraton Yogyakarta: Huk, Kawung Alit Gurdha, Parang Klithik, Parang Barong, Parang Gendreh, Parang Rusak Barong, Semen Ageng Sawat Gurdha, dan Rujak Senthe, beserta status larangannya. Sumber tidak menjelaskan aturan pemakaian; karena itu kelas ini tidak mengajarkannya sebagai pola siap pakai. Nama bentuk lain yang dipakai di kelas, seperti parang dan kawung, adalah contoh bentuk umum, bukan kutipan daftar sumber. Cecek adalah titik kecil rapat; isen-isen adalah isian yang membuat bidang lebih hidup. Pilih motif geometris sederhana untuk latihan bambu, dan jangan memakai motif sakral sebagai hiasan sembarangan. Alat: pensil, kertas, dan penggaris. Foto pada pelajaran ini adalah lembar motif larangan dari materi Giriloyo untuk kain; gambar dipakai sebagai rujukan nama dan bentuk, bukan contoh permukaan bambu. Langkah: 1) pilih dua motif geometris; 2) jiplak bentuknya di kertas; 3) tulis nama dan asal motif; 4) tandai bagian yang akan diulang. Keselamatan: tidak ada alat panas; gunakan pensil yang tidak tajam. Kesalahan umum: menyalin motif terlalu rapat sehingga garis canting menyatu, atau menganggap semua motif boleh dipakai. Perbaiki dengan menyederhanakan ulangan. Tugas: cocokkan delapan nama motif larangan dengan gambarnya. Kriteria: 7 dari 8 benar dan dua motif latihan diberi nama.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
          mediaFile: "motif-larangan-yogyakarta-1.jpg",
        },
        {
          title: "Mola: menggambar pola di bambu",
          kind: "text",
          body: "Mola berarti membuat desain dengan pensil sebelum malam diteteskan. Di bambu, garis pensil hanya menjadi pemandu; karena permukaannya tidak menyerap, garis harus tipis dan tidak menekan. Arah serat bambu juga menentukan: garis yang mengikuti serat lebih mudah rapi daripada garis yang memotong serat. Alat: pensil 2B atau lebih keras, penghapus lunak, penggaris, kertas pola, dan bilah bambu yang sudah diamplas. Langkah: 1) bersihkan permukaan dari debu; 2) tentukan titik tengah benda kerja; 3) gambar satu ulangan motif utuh dengan tekanan ringan; 4) periksa proporsi dari jarak satu langkah; 5) hapus garis bantu sebelum membatik. Foto pada pelajaran ini berasal dari materi Giriloyo yang menunjukkan latihan pola di atas kain; alat dan cara memindahkan garis sama, tetapi urutan kain tidak dipakai sebagai urutan bambu. Keselamatan: pensil dan penggaris tidak panas, tetapi jagalah ujung penggaris agar tidak melukai tangan. Kesalahan umum: garis terlalu tebal sehingga tidak bisa dihapus dan mengganggu warna, atau motif keluar dari bidang. Perbaiki dengan mengulang pola di kertas sebelum menyentuh bambu. Tugas: salin satu ulangan motif pada bilah 20 x 30 cm. Kriteria: proporsi mirip, garis tipis, dan tidak ada garis bantu yang tertinggal.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
          mediaFile: "lesson-mola.jpg",
        },
        {
          title: "Bidang kerja, ulangan, dan raport",
          kind: "text",
          body: "Bidang kerja adalah area yang benar-benar dibatik; ulangan adalah satu unit motif yang diulang; raport adalah kotak bantu berukuran sama untuk menjaga ulangan tetap sejajar. Menentukan ketiganya sebelum menggambar mencegah motif terpotong di tepi nampan. Alat: penggaris, kertas, pensil, dan benda kerja. Langkah: 1) ukur bidang kerja dan sisakan tepi sekitar satu sentimeter agar motif tidak jatuh di lengkung; 2) buat kotak raport di kertas; 3) gambar satu ulangan di dalam kotak; 4) jiplak ke titik ulang berikutnya; 5) periksa sambungan dengan melipat kertas. Untuk nampan bulat, bagi bidang menjadi empat atau delapan bagian yang sama. Keselamatan: tidak ada bahan panas. Kesalahan umum: titik ulang bergeser sedikit demi sedikit sehingga motif miring di ujung, atau ulangan terlalu besar sampai terpotong. Perbaiki dengan membuat raport baru dan mengukur ulang dari titik tengah. Tugas: buat tiga kotak raport 10 x 10 cm dan satu denah bidang nampan. Kriteria: tiga kotak sama ukuran, denah menunjukkan tepi aman, dan ulangan tidak terpotong.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Pola pada bidang lengkung dan anyaman",
          kind: "text",
          body: "Bidang bambu tidak selalu datar. Nampan punya bibir melengkung, anyaman punya celah, dan panel punya rusuk. Pola yang sama bisa berubah bentuk saat dipindahkan ke bidang lengkung, jadi ukur keliling dan gambar pola di kertas yang mengikuti bidang. Alat: kertas lunak, pensil, selotip kertas, dan gunting. Langkah: 1) tentukan jenis bidang: datar, lengkung, atau anyaman; 2) untuk bidang lengkung, tempelkan kertas lalu jiplak bentuknya; 3) gambar ulangan di kertas itu, bukan di kertas datar; 4) potong dan coba pasang tanpa lem; 5) pindahkan garis ke bambu dengan tekanan ringan. Pada anyaman, hindari garis panjang yang melintasi celah karena malam akan jatuh ke bawah. Keselamatan: gunting tajam, arahkan menjauh dari tangan. Kesalahan umum: pola terlihat miring setelah dipasang, atau garis patah di celah anyaman. Perbaiki dengan membagi pola menjadi bagian kecil yang mengikuti rusuk. Tugas: bungkus satu nampan dengan kertas pola dan unggah foto pola terpasang. Kriteria: pola mengikuti lengkung, tidak terpotong, dan garis tidak melintasi celah anyaman tanpa penopang.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
        },
        {
          title: "Latihan pola",
          kind: "practice",
          body: "Latihan ini menyatukan pilihan motif, mola, dan pembagian bidang pada benda kerja sungguhan. Pilih satu motif geometris sederhana, misalnya parang sederhana atau kawung, lalu gambar satu ulangan yang bersambung ke tepi bidang. Alat: bilah atau nampan yang sudah kering dan diamplas, pensil, penghapus, penggaris, dan kertas pola. Langkah: 1) siapkan benda kerja dan bersihkan debu; 2) tempelkan pola kertas bila bidang lengkung; 3) gambar satu ulangan utuh; 4) ulangi ke dua titik berikutnya; 5) periksa dari jarak satu langkah dan dari arah cahaya miring. Keselamatan: tidak ada bahan panas pada tahap ini; jauhkan benda kerja dari lantai basah. Kesalahan umum: langsung menggambar seluruh bidang tanpa satu ulangan yang benar, atau menghapus garis dengan keras sampai serat rusak. Perbaiki dengan berhenti setelah satu ulangan dan memeriksanya bersama pengajar. Tugas: unggah foto keseluruhan dan satu foto detail pola. Kriteria: motif terbaca, ulangan bersambung, proporsi wajar, dan permukaan tidak rusak karena penghapus.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Canting di permukaan bambu",
      summary:
        "Prasyarat: modul 1 dan 2. Nglowongi, ngisen-isen, dan menutup celah pada bambu: garis rapat tanpa mengharapkan malam meresap seperti di kain.",
      estimatedMinutes: 120,
      lessons: [
        {
          title: "Nglowongi: garis malam pertama",
          kind: "text",
          body: "Nglowongi adalah pelilitan malam tahap pertama: mengikuti garis pensil dengan canting. Di kain, malam harus menembus sisi belakang; di bambu, malam menempel di permukaan dan ujung potong menyerap lebih banyak, sehingga pemeriksaan dilakukan dari kilap dan kerapatan garis, bukan dari tembusnya malam. Garis yang tipis atau terputus akan bocor saat diwarnai. Alat: canting, malam, wajan dan kompor, potongan bambu untuk uji, serta lampu yang bisa dimiringkan. Langkah: 1) panaskan malam dengan api kecil; 2) uji aliran pada potongan bambu sisa; 3) pegang canting seperti pensil dan mulai dari garis lurus pendek; 4) lanjutkan ke lengkung dengan kecepatan tetap; 5) periksa dari arah cahaya miring, tandai bagian yang tipis. Foto pada pelajaran ini adalah ilustrasi proses canting di atas kain; alat dan geraknya sama, tetapi permukaan bambu menerima malam dengan cara yang berbeda. Keselamatan: malam panas, api, dan uap; pakai sarung tangan dan kerjakan di ruang berangin. Kesalahan umum: malam terlalu panas sampai melebar, atau terlalu dingin sampai menggumpal dan putus. Perbaiki dengan menurunkan atau menaikkan api sedikit, lalu uji lagi di potongan sisa. Tugas: melilin garis lurus 20 cm dan satu lengkung, unggah foto dua arah cahaya. Kriteria: garis tidak putus, tidak melebar, dan tidak ada bagian mengkilap yang tipis.",
          estimatedMinutes: 25,
          accessLevel: "enrolled",
          mediaFile: "hero-canting.jpg",
        },
        {
          title: "Menutup celah garis",
          kind: "text",
          body: "Nerusi adalah istilah kain: melilin sisi belakang kain pada bagian yang belum tertembus canting, sehingga malam menembus sampai dua sisi. Istilah itu tidak dipakai sebagai langkah bambu karena bambu tidak punya sisi belakang kain yang perlu ditembus. Pada bambu, pekerjaan yang setara disebut menutup celah: merapikan tepi garis dan pori yang belum tertutup agar warna tidak bocor. Alat: canting, malam, wajan, kompor, dan kain bersih untuk menyerap malam berlebih. Langkah: 1) tunggu garis pertama dingin; 2) periksa celah di bawah cahaya miring; 3) tambahkan malam tipis pada celah, jangan sekali tebal; 4) ulangi pemeriksaan setelah dingin; 5) buang serpihan malam dengan hati-hati. Keselamatan: ujung canting tetap panas walau malam di wadah tidak mendidih; jangan menyentuhnya. Kesalahan umum: menumpuk malam terlalu tebal sehingga garis melebar dan retak saat kering. Perbaiki dengan mengerok tipis memakai alat tumpul, lalu menutup ulang. Tugas: tutup lima sentimeter garis yang sudah dililin dan periksa dari dua arah cahaya. Kriteria: tidak ada celah, garis tidak melebar, dan permukaan tidak retak.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Ngisen-isen: isian pada bambu",
          kind: "text",
          body: "Ngisen-isen adalah mengisi bidang kosong supaya motif lebih kaya, bukan menambah motif baru di atasnya. Isian dapat berupa titik cecek atau garis pendek rapat. Pada bambu, jarak titik harus tetap karena permukaan yang keras membuat malam mudah menggumpal di satu titik. Alat: canting halus, malam, penggaris, dan potongan bambu latihan. Langkah: 1) pilih satu bidang kosong; 2) tentukan arah isian mengikuti serat; 3) buat deret titik lima sentimeter dengan jarak tetap; 4) bandingkan dengan deret berikutnya; 5) berhenti sebelum bidang terlihat penuh. Keselamatan: sama seperti membatik; jangan mengisi sambil berdiri di lantai licin. Kesalahan umum: titik saling menempel sehingga menjadi garis tebal, atau isian memenuhi seluruh bidang sampai motif utama tenggelam. Perbaiki dengan mengurangi jumlah titik dan menjaga jarak. Tugas: unggah lembar latihan tiga baris isian pada potongan bambu. Kriteria: jarak titik konsisten, garis pendek rapi, dan motif utama tetap terbaca.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Memegang canting dan berhenti dengan bersih",
          kind: "practice",
          body: "Keterampilan memegang canting lebih menentukan daripada kerumitan motif. Pegang seperti pensil, dengan siku ditopang meja agar gerak stabil. Mulai dan berhenti dengan mengangkat canting perlahan supaya tidak ada ekor malam. Alat: canting, malam, wajan, kompor, potongan bambu, dan kain perca. Langkah: 1) panaskan malam dan uji aliran; 2) buat enam baris lurus pendek; 3) buat enam lengkung; 4) akhiri setiap garis dengan mengangkat canting perlahan; 5) periksa ujung garis, lalu ulangi yang paling buruk. Keselamatan: jangan meniup cucuk untuk mempercepat aliran; uap malam bisa mengiritasi. Jangan meninggalkan kompor menyala. Kesalahan umum: menekan canting terlalu kuat sampai malam meluap, atau berhenti mendadak sehingga ada tetesan. Perbaiki dengan mengurangi tekanan dan mengangkat perlahan. Tugas: unggah enam baris latihan di potongan bambu. Kriteria: enam bentuk bersih, tidak ada cabang tak sengaja, dan ujung garis tidak menetes.",
          estimatedMinutes: 25,
          accessLevel: "enrolled",
        },
        {
          title: "Latihan nglowongi dan menutup celah",
          kind: "practice",
          body: "Latihan ini menggabungkan nglowongi dan menutup celah pada satu pola utuh. Tujuannya bukan kecepatan, tetapi memastikan setiap garis tertutup sebelum warna masuk. Alat: benda kerja berpola, canting, malam, wajan, kompor, dan lampu miring. Langkah: 1) mulai dari garis utama, lalu isian; 2) periksa seluruh garis dari arah cahaya miring; 3) tutup celah dengan malam tipis; 4) uji satu sudut kecil dengan pewarna pada potongan sisa; 5) perbaiki bagian yang bocor sebelum melanjutkan. Keselamatan: jangan menumpuk benda kerja yang masih panas; letakkan di rak tahan panas. Kesalahan umum: langsung memberi warna sebelum malam dingin, atau melewatkan garis di tepi lengkung. Perbaiki dengan menunggu dingin dan memeriksa per bagian. Tugas: unggah benda kerja setelah nglowongi dan menutup celah. Kriteria: semua garis tertutup, tidak ada malam yang melebar, dan uji warna tidak menembus bagian bermalam.",
          estimatedMinutes: 30,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Warna pertama dan tutup motif",
      summary:
        "Prasyarat: modul 3. Mbabar, menutup motif dengan malam, memberi warna dasar, dan memilih colet atau celup untuk permukaan bambu.",
      estimatedMinutes: 100,
      lessons: [
        {
          title: "Mbabar: warna pertama pada bambu",
          kind: "text",
          body: "Mbabar berarti mewarnai setelah malam selesai. Materi Giriloyo memakai istilah ini untuk mencelup kain; pada bambu, sumber tidak menentukan apakah warna disemprot, dicolet, atau dicelup, jadi jalur ini memakai colet dengan kuas agar warna terkendali di permukaan yang kecil. Warna pertama adalah warna motif yang nanti ditutup malam. Soga adalah sebutan warna cokelat dari kulit tingi dan jambal yang dipakai di Giriloyo; di jalur ini kamu boleh memakai pewarna sintetis atau alami, dan istilah soga hanya menunjukkan arah warna, bukan keharusan bahan. Alat: pewarna, kuas atau spons, wadah, sarung tangan, masker, dan potongan uji. Langkah: 1) uji warna pada potongan sisa; 2) beri warna tipis merata, jangan menggenang; 3) keringkan di tempat teduh; 4) periksa apakah warna masuk ke bagian bermalam; 5) catat takaran dan waktu. Keselamatan: sarung tangan dan ventilasi; jangan mencampur pewarna di wadah makanan. Kesalahan umum: warna menumpuk di serat atau merembes di bawah malam yang tipis. Perbaiki dengan mengurangi larutan dan menutup ulang malam. Tugas: warnai satu bilah latihan satu warna, unggah foto sebelum dan sesudah. Kriteria: warna rata, malam tidak rusak, dan tidak ada rembesan di garis.",
          estimatedMinutes: 25,
          accessLevel: "enrolled",
        },
        {
          title: "Nembok: menutup motif dengan malam",
          kind: "text",
          body: "Setelah warna motif kering, motif itu harus ditutup malam agar warna dasar tidak mengubahnya (Fitinline, 2013). Langkah ini disebut nembok: menutup bagian yang sudah berwarna, bukan nglowongi ulang seluruh bidang. Alat: canting sedang, malam, wajan, kompor, dan kuas bersih. Langkah: 1) pastikan warna benar-benar kering; 2) tutup seluruh bidang berwarna dengan malam, mulai dari tepi; 3) periksa celah di bawah cahaya miring; 4) tambahkan malam pada celah; 5) biarkan dingin sebelum warna dasar. Keselamatan: jangan memanaskan benda kerja yang masih basah; uap pelarut bisa mengiritasi. Kesalahan umum: menutup terlalu cepat saat warna masih basah sehingga malam tidak menempel, atau meninggalkan celah di tepi motif. Perbaiki dengan mengeringkan lebih lama dan menutup ulang. Tugas: tutup satu motif berwarna dan unggah foto. Kriteria: seluruh bidang berwarna tertutup, tidak ada celah, dan warna di bawahnya tidak berubah.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Warna dasar",
          kind: "text",
          body: "Warna dasar adalah warna yang mengisi bagian yang tidak ditutup malam. Setelah warna dasar, kontras antara motif dan latar terlihat. Pilih warna dasar yang lebih gelap atau lebih terang dari warna motif, lalu uji pada potongan sisa. Alat: pewarna, kuas, sarung tangan, masker, dan wadah. Langkah: 1) bersihkan permukaan dari sisa malam; 2) uji warna pada potongan; 3) beri warna dasar tipis merata; 4) ulangi setelah kering bila perlu; 5) periksa tepi malam, pastikan tidak ada rembesan. Keselamatan: ventilasi dan sarung tangan; jauhkan pewarna dari mata. Kesalahan umum: warna dasar terlalu pekat sampai menutupi tekstur bambu, atau terlalu encer sampai belang. Perbaiki dengan mengulang tipis, bukan sekali tebal. Tugas: beri warna dasar pada benda kerja dan unggah foto. Kriteria: warna rata, kontras motif terbaca, dan tidak ada rembesan di bawah malam.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Colet atau celup untuk bambu",
          kind: "text",
          body: "Colet memakai kuas atau spons dan cocok untuk bidang kecil, anyaman, serta motif yang perlu dua warna berdampingan. Celup merendam seluruh benda dan memberi warna merata, tetapi bambu mengapung dan air bisa masuk ke celah anyaman. Sumber hanya menyebut bahwa bambu diwarnai sesuai kehendak, tanpa memilih teknik; pemilihan colet sebagai teknik utama adalah keputusan platform untuk latihan ini. Alat: kuas, spons, wadah, dan pemberat bersih bila mencoba celup. Langkah: 1) pilih teknik berdasarkan bentuk benda; 2) tulis alasan dalam dua kalimat; 3) uji pada potongan sisa; 4) kerjakan pada benda kerja; 5) catat hasilnya. Keselamatan: sarung tangan dan ventilasi. Kesalahan umum: mencelup anyaman tanpa pemberat sehingga warna tidak rata, atau mencolet terlalu basah sampai menetes. Perbaiki dengan mengeringkan dan mengulang tipis. Tugas: pilih satu teknik dan tulis alasannya. Kriteria: pilihan masuk akal untuk bentuk benda dan hasil uji terlihat.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
        },
        {
          title: "Latihan dua warna",
          kind: "practice",
          body: "Latihan dua warna menguji apakah malam benar-benar menahan warna pertama saat warna kedua masuk. Pilih dua warna yang kontras, misalnya cokelat dan biru, lalu kerjakan pada satu bidang kecil. Alat: dua pewarna, kuas, malam, canting, dan potongan uji. Langkah: 1) warnai motif dengan warna pertama; 2) keringkan; 3) tutup motif dengan malam; 4) beri warna dasar; 5) nglorod pada modul berikutnya, lalu periksa hasilnya. Keselamatan: jangan mencampur wadah warna; beri label. Kesalahan umum: warna kedua merembes karena malam tipis, atau warna pertama pudar karena terlalu banyak air. Perbaiki dengan menutup malam lebih rapat dan mengurangi air. Tugas: unggah benda kerja dua warna sebelum nglorod. Kriteria: dua warna terpisah jelas, tidak ada rembesan, dan malam tetap utuh.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Nglorod, finishing, dan mutu",
      summary:
        "Prasyarat: modul 4. Melepas malam dengan air panas, mengeringkan, melapisi permukaan, dan memeriksa produk sebelum difoto untuk Kartu Karya.",
      estimatedMinutes: 100,
      lessons: [
        {
          title: "Nglorod: melepas malam",
          kind: "text",
          body: "Nglorod adalah melepas malam dengan air panas (Fitinline, 2013). Malam yang mencair akan mengapung, lalu permukaan diangkat dan diperiksa. Alat: wadah besar, air, sumber api, penjepit, sarung tangan tahan panas, dan tempat penirisan. Langkah: 1) didihkan air yang cukup untuk merendam benda; 2) masukkan benda dengan penjepit, jangan dengan tangan; 3) aduk perlahan sampai malam lepas; 4) angkat dan tiriskan; 5) periksa sisa malam, ulangi bila perlu. Mulai dari 5 sampai 10 menit; ulangi bila malam masih melekat. Sumber tidak memberi durasi tetap, jadi catat versimu. Keselamatan: air mendidih dan malam panas; kerjakan di luar ruangan atau dengan ventilasi paksa, pakai sarung tangan, jangan menambah air ke wadah berminyak. Jangan membuang malam panas ke saluran air. Kesalahan umum: air tidak cukup panas sehingga malam hanya berpindah, atau benda terlalu lama sehingga permukaan berubah. Perbaiki dengan mengganti air panas dan mengulang sebentar. Tugas: unggah foto proses dan catat suhu serta waktu versimu. Kriteria: malam lepas dari seluruh bidang dan prosedur keselamatan terlihat.",
          estimatedMinutes: 25,
          accessLevel: "enrolled",
        },
        {
          title: "Mepe dan memeriksa sisa malam",
          kind: "text",
          body: "Mepe berarti mengeringkan setelah sisa malam dibersihkan. Pada bambu, jangan merendam lama; cukup bilas atau usap dengan kain lembap sampai sisa malam hilang, lalu keringkan di tempat teduh. Sisa malam terlihat sebagai bercak putih atau permukaan yang terasa lengket. Alat: kain lembut, air bersih, sikat halus, dan rak berangin. Langkah: 1) bilas atau usap sisa malam; 2) sikat pelan searah serat; 3) keringkan di tempat teduh; 4) balik agar kedua sisi kering; 5) periksa bercak di bawah cahaya miring. Keselamatan: lantai sekitar wadah bisa licin karena malam; seka segera. Kesalahan umum: menjemur di bawah matahari langsung sampai bambu retak, atau meninggalkan sisa malam di celah anyaman. Perbaiki dengan mengeringkan di tempat teduh dan menyikat halus. Tugas: unggah foto benda basah dan kering. Kriteria: tidak ada bercak malam, permukaan kering rata, dan tidak retak.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Finishing dan pelapisan",
          kind: "text",
          body: "Finishing melindungi warna dan memudahkan perawatan. Fitinline menyebut pelapisan sistem NC untuk produk batik bambu agar mudah dibersihkan tanpa air tanpa merusak warna. Ikuti petunjuk pada kemasan bahan yang kamu pakai; jangan mencampur merek atau menambah pelarut tanpa petunjuk. Alat: pelapis NC, kuas bersih, wadah, respirator organik tipe A, sarung tangan, kacamata, dan potongan uji. Langkah: 1) pastikan permukaan benar-benar kering; 2) uji pada potongan sisa; 3) aplikasikan lapisan tipis merata; 4) keringkan sesuai petunjuk kemasan; 5) ulangi tipis bila perlu. Keselamatan: pelapis dan pelarut mudah terbakar serta beruap; kerjakan di luar ruangan atau dengan ventilasi paksa, jauh dari api dan percikan listrik, pakai respirator organik tipe A dan sarung tangan. Pelapis NC untuk dekorasi; jangan dipakai pada wadah makanan kecuali produsen menyatakan aman kontak pangan. Kesalahan umum: lapisan terlalu tebal sehingga menetes dan menutupi motif, atau dikerjakan saat lembap sehingga keruh. Perbaiki dengan mengeringkan dan mengamplas tipis bagian yang menetes sebelum melapisi ulang. Tugas: buat papan uji tiga lapisan tipis dan unggah fotonya. Kriteria: lapisan rata, tidak menetes, dan warna tidak berubah.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Memeriksa mutu produk",
          kind: "text",
          body: "Pemeriksaan mutu dilakukan sebelum produk difoto untuk Kartu Karya. Periksa bentuk, permukaan, warna, motif, sisa malam, dan pelapisan. Alat: lampu, kain bersih, penggaris, dan daftar periksa. Langkah: 1) periksa bentuk: tidak melengkung atau retak; 2) periksa permukaan: tidak ada serat terangkat; 3) periksa warna: rata dan tidak belang; 4) periksa motif: garis tertutup dan ulangan sejajar; 5) periksa sisa malam dan lapisan. Nilai sendiri sebelum pengajar menilai, lalu bandingkan selisihnya. Keselamatan: tidak ada bahan panas pada tahap ini. Kesalahan umum: hanya melihat dari satu arah cahaya, atau menilai dari foto kecil. Perbaiki dengan memeriksa di bawah cahaya miring dan dari dua sisi. Tugas: unggah produk jadi dan penilaian diri enam butir. Kriteria: 5 dari 6 butir terpenuhi dan selisih nilai diri tidak lebih dari satu tingkat.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
        },
        {
          title: "Keselamatan kerja dan limbah",
          kind: "text",
          body: "Keselamatan kerja berlaku dari merebus sampai melapisi. Keselamatan: risiko utamanya air mendidih, malam panas, api kompor, alat tajam, debu amplas, dan uap pelarut. Alat: sarung tangan tahan panas, masker debu, masker organik untuk pelapis, kacamata, celemek, dan alas kaki tertutup. Langkah: 1) tata meja jauh dari jangkauan anak; 2) nyalakan api kecil dan jangan tinggalkan; 3) sediakan penutup wajan untuk memadamkan api malam; 4) bersihkan debu dengan kain lembap, bukan ditiup; 5) simpan malam sisa setelah dingin, jangan ke saluran air. Untuk luka bakar ringan, alirkan air dingin dan hentikan latihan bila melepuh. Kesalahan umum: memakai air untuk memadamkan api malam, atau mengamplas tanpa masker. Perbaiki dengan menutup wajan dan bekerja di ruang berangin. Tugas: isi daftar periksa keselamatan 12 butir dan foto tempat kerja. Kriteria: 12 dari 12 butir terpenuhi.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
      ],
    },
    {
      title: "Dari latihan ke karya",
      summary:
        "Prasyarat: modul 1 sampai 5. Memilih benda kerja, mencatat proses, menghitung bahan, merawat produk, dan mengerjakan ujian akhir dari bambu mentah sampai finishing.",
      estimatedMinutes: 95,
      lessons: [
        {
          title: "Memilih benda kerja",
          kind: "text",
          body: "Benda kerja menentukan ukuran, ketebalan, dan tingkat kesulitan. Fitinline menyebut nampan, box tisu, dan hiasan dinding sebagai produk batik bambu; profil Desa Wisata Krebet juga menampilkan nampan bambu batik. Untuk latihan pertama, pilih satu benda yang bidangnya mudah dijangkau canting. Alat: benda kerja kering dan diamplas, penggaris, pensil, dan kertas. Langkah: 1) pilih nampan, box tisu, atau panel; 2) ukur bidang kerja; 3) gambar denah di kertas; 4) tentukan motif yang muat; 5) catat bahan dan alat yang dibutuhkan. Keselamatan: tidak ada bahan panas pada tahap memilih. Kesalahan umum: memilih bidang anyaman untuk latihan pertama karena terlihat mudah, padahal celah membuat malam jatuh. Perbaiki dengan memulai dari bilah atau panel datar. Tugas: unggah sketsa benda kerja dan daftar bahan. Kriteria: ukuran jelas, motif muat, dan bahan tercatat.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Menyusun catatan proses",
          kind: "text",
          body: "Kartu Karya membutuhkan jejak proses, bukan hanya foto hasil. Catat tanggal, bahan, ukuran, dan perubahan yang kamu lakukan di setiap tahap. Alat: kamera ponsel, buku catatan, dan label tanggal. Langkah: 1) foto bahan sebelum diolah; 2) foto setiap tahap utama; 3) catat waktu dan kondisi yang bisa memengaruhi hasil; 4) simpan file dengan nama yang mudah dicari; 5) susun urutan foto sebelum diunggah. Platform memakai catatan ini untuk menilai proses, jadi jangan mengedit foto sampai hilang detail. Keselamatan: jangan memotret di dekat kompor menyala. Kesalahan umum: hanya memotret hasil akhir, atau mencatat angka tanpa satuan. Perbaiki dengan mengulang dokumentasi pada latihan berikutnya. Tugas: unggah enam foto bertanggal dan satu lembar catatan bahan. Kriteria: enam tahap terlihat dan catatan memuat bahan, ukuran, serta tanggal.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Menghitung bahan dan biaya",
          kind: "text",
          body: "Menghitung bahan membuat harga karya masuk akal. Pisahkan bahan habis pakai, alat yang dipakai berulang, dan waktu kerja. Alat: catatan belanja, timbangan kecil, dan kalkulator. Langkah: 1) daftar bahan untuk satu benda; 2) catat harga satuan dan jumlah yang dipakai; 3) hitung sisa bahan yang terbuang; 4) tambahkan biaya alat secara wajar; 5) tentukan harga setelah membandingkan dengan karya sejenis. Jangan mengarang angka; gunakan nota atau harga pasar yang kamu catat. Keselamatan: tidak ada. Kesalahan umum: lupa menghitung malam, pelapis, dan kemasan, atau mencampur biaya satu kali percobaan dengan biaya produksi. Perbaiki dengan menghitung per benda. Tugas: unggah tabel biaya satu benda. Kriteria: semua bahan tercatat, ada harga satuan, dan ada perkiraan sisa.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Merawat produk batik bambu",
          kind: "text",
          body: "Perawatan menentukan umur produk. Karena permukaan dilapisi, produk batik bambu cukup diusap dengan kain lembap; jangan direndam atau digosok dengan bahan abrasif (Fitinline, 2013). Alat: kain lembut, air, dan tempat kering. Langkah: 1) usap debu dengan kain kering; 2) untuk noda ringan, gunakan kain lembap lalu segera keringkan; 3) hindari sinar matahari langsung dan tempat lembap; 4) jangan memakai pemutih atau sikat kasar; 5) simpan dengan pembungkus yang kering. Keselamatan: tidak ada. Kesalahan umum: merendam anyaman sehingga air masuk celah, atau menjemur di bawah matahari sampai retak. Perbaiki dengan mengeringkan di tempat teduh. Tugas: tulis kartu perawatan lima butir untuk produkmu. Kriteria: lima butir spesifik dan mudah diikuti pembeli.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
        },
        {
          title: "Ujian akhir: satu produk dari bambu mentah",
          kind: "practice",
          body: "Ujian akhir adalah satu produk bambu dari bahan mentah sampai pelapisan. Kerjakan seluruh urutan yang dipelajari: pilih bambu, rebus, keringkan, amplas, pola, nglowongi, ngisen-isen, mbabar, nembok, warna dasar, nglorod, mepe, finishing, dan periksa. Alat: seluruh peralatan modul 1 sampai 5 dan alat pelindung. Langkah: 1) siapkan benda kerja dan catatan; 2) kerjakan pola dan malam; 3) warnai dan tutup motif; 4) nglorod dan keringkan; 5) lapisi lalu periksa mutu. Hentikan pekerjaan bila merasa pusing, terbakar, atau ruangan berasap. Keselamatan: protokol modul 5 berlaku penuh. Kesalahan umum: terburu-buru di nglorod lalu melapisi permukaan yang masih lembap, atau melupakan foto proses. Perbaiki dengan mengeringkan ulang dan melengkapi dokumentasi. Tugas: unggah produk jadi, foto setiap tahap proses, dan penilaian diri. Kriteria: produk lulus enam butir mutu, dokumentasi lengkap, dan prosedur keselamatan terlihat.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
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
          body: "Siraman lazim dibuka dengan sungkeman calon pengantin kepada kedua orang tua, lalu keluarga dan pinisepuh mendampingi. Air kembang setaman disiapkan dalam kendi dan gayung batok; jumlah pinisepuh yang menuangkan air biasanya tujuh atau sembilan, mengikuti kebiasaan keluarga. Setelah air kendi habis, kendi dipecah sambil mengucapkan “Wis pecah pamore”, lalu rambut calon pengantin dipotong sedikit (potong rikma) dan potongannya disatukan. Rujukan publik: Wikipedia bahasa Indonesia, “Siraman (adat Jawa)”, dan Marverial (2020) di Jurnal Desain Komunikasi Visual Universitas Bhayangkara Jakarta Raya. Urutan ini lazim di Yogyakarta, tetapi tiap keluarga dapat menambah atau mengubah bagian; konfirmasi selalu dilakukan sebelum gladi resik. Alat: lembar rundown, daftar pinisepuh, dan catatan keluarga. Langkah: 1) catat jumlah pinisepuh dan urutan menuang; 2) tandai bagian sungkeman, wudu, dan doa; 3) tulis momen pecah kendi dan potong rikma; 4) bagi tugas keluarga; 5) konfirmasi ke keluarga. Keselamatan: tidak ada bahan berbahaya; hati-hati dengan pecahan kendi. Kesalahan umum: menyebut jumlah pinisepuh tanpa bertanya, atau melewatkan wudu. Perbaiki dengan menanyakan kebiasaan keluarga. Tugas: tulis urutan siraman lengkap dengan tujuh atau sembilan pinisepuh dan tiga istilah wajib. Kriteria: urutan lengkap, istilah tepat, dan ada catatan konfirmasi keluarga.",
          estimatedMinutes: 30,
          accessLevel: "enrolled",
        },
        {
          title: "Midodareni dan resepsi",
          kind: "text",
          body: "Midodareni berlangsung malam dengan suasana tenang: keluarga kedua pihak berkumpul, calon pengantin tetap di dalam kamar, dan pembawa acara membawakan sapaan serta doa. Resepsi berjalan siang dengan tamu lebih banyak. Istilah yang perlu dikenal: sungkeman, pinisepuh, kembang setaman, kendi, gayung batok, pecah kendi, dan potong rikma. Rujukan publik: Wikipedia bahasa Indonesia, “Siraman (adat Jawa)”; Marverial (2020). Kebiasaan keluarga Yogyakarta berbeda-beda; konfirmasi urutan dan sapaan sebelum acara. Tugas: bandingkan dua susunan acara. Kriteria: perbedaan suasana dan urutan dijelaskan.",
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
  [pathSlug("kriyaGerabahBantul")]: [
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
          body: "Tiga cara dasar membentuk gerabah Kasongan adalah lelet (pilin), tempel (menyambung kepingan), dan cetak (menekan tanah ke cetakan). Pilin dan lempeng juga menjadi bentuk dasar sebelum masuk ke roda putar. Sambungan pilin ditekan miring supaya tidak berongga, lempeng dibentuk di atas alas kain, dan cetakan diisi tanah secara merata lalu dilepas saat setengah kering. Tugas: buat satu lempeng, satu pilin, dan satu bentuk cetak sederhana. Kriteria: sambungan rapat dan bentuk cetak tidak cacat.",
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
          body: "Susun gerabah di tungku dengan jarak yang cukup agar panas merata. Pembakaran biskuit berlangsung sekitar 800 °C; naikkan panas bertahap dan jangan membuka tungku sebelum dingin. Pembakaran bertahap mengurangi risiko pecah mendadak. Alat: sarung tangan tahan panas, kacamata, sepatu tertutup, dan penjepit panjang. Keselamatan: jauhkan bahan mudah terbakar, jangan membuka tungku saat panas, dan kerjakan di ruang berventilasi. Tugas: tulis urutan pembakaran dan tiga aturan keselamatan. Kriteria: urutan jelas dan aturan keselamatan lengkap.",
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
  [pathSlug("aksaraJawa")]: [
    {
      title: "Hanacaraka: dua puluh aksara dasar",
      summary:
        "Mengenal 20 aksara dasar, urutannya, dan vokal /a/ yang menempel pada setiap aksara.",
      estimatedMinutes: 70,
      lessons: [
        {
          title: "Apa itu aksara Jawa",
          kind: "text",
          body: "Aksara Jawa bukan abjad, melainkan aksara suku kata: setiap aksara mewakili satu suku kata terbuka. Dua puluh aksara dasar disusun dalam empat baris, ha-na-ca-ra-ka, da-ta-sa-wa-la, pa-dha-ja-ya-nya, ma-ga-ba-tha-nga. Urutan itu dihafal sebagai hanacaraka, dan kelas ini memakai urutan yang sama. Tugas: tulis dua puluh aksara berurutan dari ingatan, lalu cocokkan dengan tabel. Kunci urutan: ha-na-ca-ra-ka, da-ta-sa-wa-la, pa-dha-ja-ya-nya, ma-ga-ba-tha-nga. Kriteria: 18 dari 20 aksara benar dan urut.",
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
          body: "Lima belas aksara sisanya dilatih dengan kata utuh: ꦱꦥꦶ sapi, ꦧꦸꦏꦸ buku, ꦭꦺꦭꦺ lélé, ꦏꦼꦫꦶꦱ꧀ keris, ꦭꦺꦴꦩ꧀ꦧ lomba, ꦱꦧꦂ sabar, ꦧꦸꦔꦃ bungah, ꦭꦪꦁ layang. Baca keras sambil menunjuk aksara satu per satu, lalu ulangi tanpa menunjuk. Tugas: tulis lima kata dari bunyi ke aksara dan lima aksara ke bunyi. Kunci: sapi ꦱꦥꦶ, buku ꦧꦸꦏꦸ, lélé ꦭꦺꦭꦺ, keris ꦏꦼꦫꦶꦱ꧀, lomba ꦭꦺꦴꦩ꧀ꦧ; ꦱꦧꦂ sabar, ꦧꦸꦔꦃ bungah, ꦭꦪꦁ layang, ꦏꦿꦠꦺꦴꦤ꧀ kraton, ꦫꦩ rama. Kriteria: sedikitnya 8 dari 10 benar.",
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
          body: "Lima sandhangan vokal mengubah bunyi /a/ pada aksara: wulu ꦶ untuk i, suku ꦸ untuk u, taling ꦺ untuk é, pepet ꦼ untuk ê, dan taling tarung ꦺꦴ untuk o. Taling ditulis sebelum aksara, sedangkan tarung ditulis sesudahnya, jadi taling tarung mengapit aksara. Tugas: tulis lima aksara dengan wulu, suku, taling, pepet, dan taling tarung, lalu beri nama sandhangannya. Kunci: ꦶ wulu, ꦸ suku, ꦺ taling, ꦼ pepet, ꦺꦴ taling tarung. Kriteria: sedikitnya 8 dari 10 bentuk dan nama benar.",
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
          body: "Konsonan mati di tengah kata ditulis dengan pasangan yang menempel di bawah aksara sebelumnya. Pasangan ha, sa, dan pa menjadi pengecualian karena bentuknya ditulis sejajar, tidak di bawah. Tugas: tulis tiga kata yang memakai pangkon dan tiga kata yang memakai pasangan, lalu jelaskan bedanya dalam satu kalimat. Kunci: pangkon mematikan vokal di akhir suku kata, pasangan menempel di bawah aksara untuk konsonan mati di tengah kata. Kriteria: enam contoh benar dan penjelasan tepat.",
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
          body: "Aksara swara ꦄ ꦆ ꦈ ꦌ ꦎ adalah huruf vokal mandiri untuk awal kata: a, i, u, é, dan o. Kata berawalan vokal memakai swara karena aksara dasar selalu membawa bunyi /a/ dan dibaca sebagai konsonan + /a/; ꦲ, misalnya, dibaca ha, bukan a. Untuk bunyi ê di awal kata, materi sumber tidak memberi contoh; kelas ini memakai ꦲ dengan pepet dan mencatatnya sebagai kebiasaan yang perlu diperiksa pada teks lain. Tugas: tulis lima kata berawalan vokal. Kriteria: 5 dari 5 memakai aksara swara yang tepat.",
          estimatedMinutes: 15,
          accessLevel: "enrolled",
        },
        {
          title: "Aksara murda dan aksara rekan",
          kind: "text",
          body: "Aksara murda adalah ꦟ ꦑ ꦡ ꦯ ꦦ ꦘ ꦓ ꦨ, sedangkan aksara rekan dipakai untuk bunyi serapan: ꦥ꦳ fa/va, ꦗ꦳ za, ꦒ꦳ gha, ꦏ꦳ kha, dan ꦢ꦳ dza, seperti pada Fatah, Zaki, Ghani, Khalila, dan Dzalim. Materi sumber tidak memberi aturan pemakaian murda; kebiasaan memakainya untuk nama dan gelar adalah konvensi umum, bukan kutipan sumber. Tugas A: tulis lima nama diri yang lazim memakai murda, lalu tandai aksara murdanya. Tugas B: tulis lima kata serapan yang memakai rekan, yaitu fa/va, za, gha, kha, dan dza. Kriteria A: lima nama memakai murda pada posisi yang lazim; kriteria B: lima rekan tepat.",
          estimatedMinutes: 20,
          accessLevel: "enrolled",
        },
        {
          title: "Latihan campuran",
          kind: "practice",
          body: "Tulis kalimat Tanggal 17 Agustus 2025, Khalila lan Zaki teka. Kalimat ini menguji angka bertanggal, dua aksara rekan, pada lungsi, dan gaya tanpa spasi sekaligus. Tugas: unggah foto kalimat lengkap. Kriteria: angka diapit ꧇, dua rekan tepat, pada lungsi ada, dan tidak memakai spasi.",
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
          body: "Materi sumber menulis aksara Jawa tanpa spasi; kata disambung dan dipisahkan dengan tanda baca seperti pada lingsa. Gaya ini dipakai di kelas. Dalam praktik modern, sebagian penulis memakai spasi atau pada lingsa untuk memudahkan pembaca, jadi tanpa spasi adalah gaya sumber, bukan satu-satunya ejaan yang sah. Bentuk yang dipakai kelas ini: ꦤꦠꦧꦠ, bukan ꦤꦠ ꦧꦠ. Tugas: perbaiki empat tulisan yang memakai spasi. Kriteria: 4 dari 4 benar dan alasan menyebut gaya sumber.",
          estimatedMinutes: 15,
          accessLevel: "public",
        },
        {
          title: "Membaca paragraf",
          kind: "text",
          body: "Paragraf penutup materi sumber dibaca utuh, dari adeg-adeg sampai pada lungsi. Teks aksaranya: ꧋ꦏꦧꦸꦢꦪꦤ꧀ꦗꦮꦩꦶꦤꦁꦏꦮꦫꦶꦱ꧀ꦱꦤ꧀ꦥꦫꦊꦭꦸꦲꦸꦂꦏꦁꦏꦸꦢꦸꦢꦶꦗꦒꦭꦤ꧀ꦢꦶꦊꦱ꧀ꦠꦫꦺꦏ꧀ꦲꦏꦺ꧉ꦥꦫꦱꦶꦱ꧀ꦮꦩꦶꦤꦁꦏꦒꦺꦤꦼꦫꦱꦶꦩꦸꦣꦤ꧀ꦢꦸꦮꦺꦤꦶꦠꦁꦒꦸꦁꦗꦮꦧ꧀ꦏꦁꦒꦺꦴꦔꦸꦫꦶꦪꦸꦫꦶꦏꦧꦸꦢꦪꦤ꧀ꦗꦮ꧉ꦱꦭꦃꦱꦮꦶꦗꦶꦤꦶꦁꦕꦫꦪꦲꦶꦏꦸꦱꦶꦤꦲꦸꦧꦱꦗꦮ꧈ꦲꦏ꧀ꦱꦫꦗꦮ꧈ꦲꦸꦁꦒꦃꦲꦸꦁꦒꦸꦃ꧈ꦭꦤ꧀ꦩꦤꦺꦏꦮꦂꦤꦏꦼꦱꦺꦤꦶꦪꦤ꧀ꦠꦿꦣꦶꦱꦶꦪꦺꦴꦤꦭ꧀꧈ꦲꦗꦧꦔꦼꦠ꧀ꦏꦥꦶꦭꦸꦠ꧀ꦩꦫꦁꦏꦧꦸꦢꦪꦤ꧀ꦩꦚ꧀ꦕ꧉ Erratum: materi sumber menulis ꦩꦶꦤꦺꦴꦁꦏ, ꦩꦸꦣꦲꦤ꧀ꦢꦸꦮꦺꦤ꧀ꦤꦶ, ꦩꦺꦴꦚꦕ, dan ꦏꦼꦱꦼꦤꦶꦪꦤ꧀; bentuk kelas yang dipakai adalah ꦩꦶꦤꦁꦏ (minangka), ꦩꦸꦣꦤ꧀ꦢꦸꦮꦺꦤꦶ (mudha nduweni), ꦩꦚ꧀ꦕ (manca), dan ꦏꦼꦱꦺꦤꦶꦪꦤ꧀ (keséniyan). Latinnya: Kabudayan Jawa minangka warisan para leluhur kang kudu dijaga lan dilestarekake. Para siswa minangka generasi mudha nduweni tanggung jawab kanggo nguri-uri kabudayan Jawa. Salah sawijining cara yaiku sinau basa Jawa, aksara Jawa, unggah-ungguh, lan maneka warna kesenian tradisional. Aja banget kapilut marang kabudayan manca. Paragraf ini ditulis untuk siswa sekolah. Kalimat terakhirnya adalah pesan penulis materi, bukan ajaran kursus ini; di kelas ini paragraf dipakai sebagai latihan membaca. Tugas: rekam bacaan dua kalimat. Kriteria: lancar dan tidak berhenti di tengah kata.",
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
          body: "Tulis lima kalimat bahasa Jawa sederhana dengan bank kata: aku, kowe, dheweke, manggon, sinau, nulis, dagang, ing, saka, lan. Contoh: Aku manggon ing Bantul. Susun kalimat pendek supaya setiap pasangan bisa diperiksa dengan tenang. Tugas: unggah foto dan rekaman bacaan. Kriteria: lima kalimat terbaca sesuai maksud dengan paling banyak 2 kesalahan.",
          estimatedMinutes: 25,
          accessLevel: "enrolled",
        },
        {
          title: "Lembar uji aksara",
          kind: "practice",
          body: "Lembar uji ini menyatukan seluruh bahan: dua puluh aksara, sandhangan, pasangan, tanda baca, angka, swara, murda, dan rekan. Kerjakan tanpa melihat tabel, lalu periksa dengan kunci yang diberikan pengajar. Alat: kertas bergaris, pensil, dan penghapus. Langkah: 1) tulis hanacaraka; 2) tulis lima kata bersandhangan; 3) tulis tiga kata berpasangan; 4) tulis satu kalimat dengan angka dan tanda baca; 5) tulis dua nama dengan murda dan rekan. Keselamatan: tidak ada. Kesalahan umum: mencampur taling dan pepet, atau menaruh pasangan di samping. Perbaiki dengan menandai kesalahan dan menulis ulang hanya bagian itu. Tugas: unggah lembar uji dan rekaman bacaan satu kalimat. Kriteria: 80 persen bentuk benar, pasangan di bawah aksara, dan bacaan lancar.",
          estimatedMinutes: 30,
          accessLevel: "enrolled",
        },
      ],
    },
  ],
}

/** Lesson media filenames the seed expects to find in `mediaAssets`. */
const CURRICULUM_MEDIA_FILES: string[] = Array.from(
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
            mediaAssetIds.push(
              await resolveMediaAsset(ctx, lesson.mediaFile, "image"),
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
      // `paths.modules` mirrors published curriculum, never seed copy.
      await ctx.db.patch(path._id, { modules: publishedModules })
    }

    return { modules: moduleCount, lessons: lessonCount }
  },
})
