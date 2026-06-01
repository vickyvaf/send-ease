# Sendease – Test Cases

Dokumen ini berisi test case utama untuk memastikan flow MVP Sendease
(remittance agent MiniApp untuk MiniPay) berfungsi dengan benar.

Legenda prioritas:
- P0: kritikal, wajib lulus untuk demo
- P1: penting, sebaiknya lulus untuk submission
- P2: nice to have

---

## 1. Wallet Connection & Landing

### TC-001 – Connect MiniPay wallet
- **Prioritas:** P0  
- **Precondition:** User membuka Sendease dari MiniPay (Celo Mainnet/Sepolia).  
- **Langkah:**
  1. Buka MiniApp Sendease dari MiniPay.
  2. Jika belum connect, klik tombol `Connect Wallet`.
  3. Approve koneksi jika ada prompt.
- **Expected Result:**
  - Alamat wallet user ditampilkan (disingkat, misal `0x12...34`).
  - Dashboard tampil dengan state kosong jika belum ada schedule.

### TC-002 – Landing tanpa schedule
- **Prioritas:** P0  
- **Precondition:** User belum memiliki schedule di kontrak.  
- **Langkah:**
  1. Connect wallet.
  2. Buka Dashboard.
- **Expected Result:**
  - Muncul empty state: pesan bahwa belum ada remitansi terjadwal.
  - Tombol `Create Remittance` terlihat jelas.

---

## 2. Create Remittance (Form-first)

### TC-010 – Create one-time remittance (basic)
- **Prioritas:** P0  
- **Precondition:** User punya saldo USDm cukup.  
- **Langkah:**
  1. Dari Dashboard, klik `Create Remittance`.
  2. Isi:
     - Recipient name: `Ana`
     - Recipient address: alamat Celo valid
     - Amount: `10`
     - Currency: `USDm`
     - Frequency: `One-time`
     - Start date: hari ini
     - End condition: `No end` (diabaikan untuk one-time)
  3. Klik `Review & Approve`.
  4. Di halaman ringkasan, klik `Confirm & Sign`.
  5. Di MiniPay, sign transaksi approve/transfer sesuai desain kontrak.
- **Expected Result:**
  - Transaksi onchain sukses.
  - Schedule baru tercatat di kontrak.
  - Dashboard menampilkan schedule baru dengan status `Active` dan `Next payment` sesuai start date.

### TC-011 – Create monthly remittance dengan limit bulanan
- **Prioritas:** P0  
- **Precondition:** User punya saldo USDm cukup.  
- **Langkah:**
  1. Klik `Create Remittance`.
  2. Isi:
     - Recipient name: `Orang Tua`
     - Recipient address: valid
     - Amount: `100`
     - Currency: `USDm`
     - Frequency: `Monthly`
     - Start date: tanggal 1 bulan berikutnya
     - End condition: `No end`
  3. Aktifkan `Enable monthly limit`.
  4. Isi `Max monthly amount = 300`.
  5. Klik `Review & Approve` → `Confirm & Sign`.
- **Expected Result:**
  - Schedule tercipta dengan data limit bulanan tersimpan di kontrak.
  - Di Dashboard, schedule tampil dengan info frequency: `Monthly`, limit: `300 USDm`.

### TC-012 – Validasi address tidak valid
- **Prioritas:** P0  
- **Langkah:**
  1. Isi form create remittance dengan recipient address yang tidak valid (misal: string pendek).
  2. Klik `Review & Approve`.
- **Expected Result:**
  - Form menolak submit.
  - Pesan error jelas: `Invalid wallet address`.

### TC-013 – Validasi amount nol atau negatif
- **Prioritas:** P0  
- **Langkah:**
  1. Isi amount `0` atau `-10`.
  2. Klik `Review & Approve`.
- **Expected Result:**
  - Form menolak submit.
  - Pesan error: `Amount must be greater than 0`.

---

## 3. Create Remittance (Intent / AI)

### TC-020 – Parse intent sederhana
- **Prioritas:** P1  
- **Precondition:** Backend agent untuk parsing prompt sudah terhubung.  
- **Langkah:**
  1. Di halaman New Remittance, isi prompt:
     - `Kirim 50 USDm ke Ana tiap tanggal 5`
  2. Klik `Generate from prompt`.
- **Expected Result:**
  - Form otomatis terisi:
    - Recipient name ~ `Ana`
    - Amount = `50`
    - Currency = `USDm`
    - Frequency = `Monthly` (jika desainnya demikian)
    - Start date atau next date = tanggal 5 berikutnya.
  - User dapat mengedit nilai sebelum submit.

### TC-021 – Prompt ambigu
- **Prioritas:** P2  
- **Langkah:**
  1. Isi prompt: `Kirim uang ke Ana tiap bulan`.
  2. Klik `Generate from prompt`.
- **Expected Result:**
  - Sistem meminta klarifikasi (amount tidak jelas).
  - Atau form terisi sebagian: name & frequency, amount kosong dengan error.

---

## 4. Automatic Execution (Agent + Contract)

### TC-030 – Eksekusi one-time remittance sukses
- **Prioritas:** P0  
- **Precondition:**
  - Schedule one-time dengan amount `10 USDm` dibuat dan aktif.
  - Start date sudah tercapai.
  - Kontrak memiliki saldo cukup untuk schedule tersebut.
- **Langkah:**
  1. Jalankan scheduler agent (cron/worker).
  2. Agent memanggil `executeScheduledPayment(scheduleId)`.
- **Expected Result:**
  - Kontrak mengirim `10 USDm` ke recipient.
  - Event `PaymentExecuted` (atau sejenis) teremit.
  - Schedule ditandai selesai (status updated, tidak ada next payment berikutnya).
  - Di Dashboard, history bertambah 1 entry `Success`.

### TC-031 – Eksekusi recurring remittance dengan limit bulanan
- **Prioritas:** P0  
- **Precondition:**
  - Schedule monthly amount `100`, limit bulanan `300`.
  - Kontrak punya saldo cukup.
- **Langkah:**
  1. Simulasikan eksekusi 3 kali dalam 1 bulan:
     - Pemanggilan `executeScheduledPayment` pertama → sukses.
     - Kedua → sukses (total 200).
     - Ketiga → sukses (total 300).
  2. Coba eksekusi ke-4 pada bulan yang sama.
- **Expected Result:**
  - Eksekusi 1–3: semua sukses (selama jadwal sesuai).
  - Eksekusi ke-4: ditolak karena melampaui limit bulanan.
  - Event atau error jelas, agent dapat mendeteksi bahwa limit tercapai.

### TC-032 – Eksekusi gagal karena saldo kontrak tidak cukup
- **Prioritas:** P0  
- **Precondition:**
  - Schedule aktif.
  - Saldo USDm di kontrak kurang dari amount yang diperlukan.
- **Langkah:**
  1. Jalankan scheduler dan panggil `executeScheduledPayment`.
- **Expected Result:**
  - Transaksi revert atau gagal dengan reason yang dapat didiagnosis (misal: `INSUFFICIENT_FUNDS`).
  - Agent mencatat kegagalan dan menampilkan status `Failed` di history.
  - UI menampilkan pesan bahwa remitansi gagal karena saldo tidak cukup.

---

## 5. Manage Schedule (Pause, Edit, Cancel)

### TC-040 – Pause schedule
- **Prioritas:** P0  
- **Precondition:** Schedule aktif.  
- **Langkah:**
  1. Dari Dashboard, buka Remittance Detail.
  2. Toggle `Pause schedule`.
  3. Sign transaksi jika diperlukan.
  4. Jalankan scheduler hingga tanggal yang seharusnya eksekusi.
- **Expected Result:**
  - Status schedule berubah menjadi `Paused`.
  - Agent meng-skip schedule ini saat cek jadwal (tidak memanggil eksekusi).
  - Tidak ada transfer yang terjadi selama paused.

### TC-041 – Resume schedule
- **Prioritas:** P1  
- **Precondition:** Schedule sudah dipause.  
- **Langkah:**
  1. Dari Remittance Detail, toggle kembali ke `Active`.
  2. Scheduler berjalan lagi setelahnya.
- **Expected Result:**
  - Status berubah jadi `Active`.
  - Eksekusi lanjutan terjadi pada tanggal due berikutnya sesuai logika kontrak.

### TC-042 – Edit schedule
- **Prioritas:** P1  
- **Precondition:** Schedule aktif.  
- **Langkah:**
  1. Buka Remittance Detail → klik `Edit schedule`.
  2. Ubah amount dari `100` jadi `150`.
  3. Sign transaksi update.
  4. Jalankan scheduler pada tanggal eksekusi berikutnya.
- **Expected Result:**
  - Data schedule di kontrak ter-update.
  - Eksekusi berikutnya menggunakan amount baru `150`.

### TC-043 – Cancel schedule
- **Prioritas:** P0  
- **Precondition:** Schedule aktif dengan beberapa eksekusi tersisa.  
- **Langkah:**
  1. Dari Remittance Detail, klik `Cancel schedule`.
  2. Sign transaksi.
  3. Jalankan scheduler lagi setelah tanggal seharusnya eksekusi.
- **Expected Result:**
  - Status schedule menjadi `Cancelled`.
  - Agent tidak lagi mencoba mengeksekusi schedule tersebut.
  - Jika desain kontrak mengizinkan, user dapat menarik sisa dana (uji dengan TC terpisah).

---

## 6. History & UI

### TC-050 – History tampil setelah eksekusi
- **Prioritas:** P0  
- **Precondition:** Minimal satu pembayaran sukses.  
- **Langkah:**
  1. Buka Remittance Detail untuk schedule terkait.
- **Expected Result:**
  - History menampilkan entry dengan:
    - Tanggal & waktu.
    - Amount.
    - Status `Success`.
    - Link ke explorer Celo.

### TC-051 – Dashboard menampilkan ringkasan yang benar
- **Prioritas:** P1  
- **Precondition:** Ada beberapa schedule (Active, Paused, Cancelled).  
- **Langkah:**
  1. Buka Dashboard.
- **Expected Result:**
  - Hanya schedule Active dan Paused yang tampil di list utama (atau sesuai desain).
  - Status dan next payment date sesuai data kontrak.

---

## 7. Phone Number & Invite (MVP-friendly)

> Catatan: banyak bagian di sini bisa jadi P2 jika belum diimplementasikan di MVP.

### TC-060 – Simpan phone number sebagai metadata
- **Prioritas:** P2  
- **Langkah:**
  1. Di form Create Remittance, isi:
     - Recipient phone: `+628123456789`
  2. Submit schedule.
- **Expected Result:**
  - Phone number tersimpan (entah di kontrak sebagai string atau offchain di local/DB) sesuai desain.
  - Di Remittance Detail, informasi phone tersebut muncul sebagai metadata.

### TC-061 – Phone lookup gagal (nomor belum terdaftar)
- **Prioritas:** P2  
- **Langkah:**
  1. Isi recipient phone dengan nomor yang belum terdaftar di MiniPay.
  2. Trigger function lookup (jika sudah diintegrasikan).
- **Expected Result:**
  - Aplikasi menampilkan pesan bahwa nomor belum terhubung ke MiniPay.
  - Tersedia opsi “Kirim Invite link”.

---

## 8. Navigation & UX

### TC-070 – Back navigation dari New Remittance
- **Prioritas:** P0  
- **Langkah:**
  1. Dari Dashboard, klik `Create Remittance`.
  2. Di halaman New Remittance, klik back arrow.
- **Expected Result:**
  - User kembali ke Dashboard tanpa error.
  - Data form boleh hilang atau tetap, sesuai spek, tapi tidak crash.

### TC-071 – Back navigation dari Remittance Detail
- **Prioritas:** P0  
- **Langkah:**
  1. Buka salah satu schedule (Remittance Detail).
  2. Klik back arrow.
- **Expected Result:**
  - User kembali ke Dashboard dan list schedule tampil normal.

---

## 9. Error Handling & Edge Cases

### TC-080 – Menangani network error saat create schedule
- **Prioritas:** P1  
- **Precondition:** Simulasikan RPC error / jaringan tidak stabil.  
- **Langkah:**
  1. Isi form create remittance.
  2. Klik `Confirm & Sign`, kemudian buat transaksi gagal (misalnya RPC unreachable).
- **Expected Result:**
  - UI menampilkan error yang jelas.
  - Tidak menandai schedule sebagai berhasil.
  - User bisa mencoba lagi setelah connection pulih.

### TC-081 – Agent retry setelah kegagalan
- **Prioritas:** P2  
- **Precondition:** Eksekusi sebelumnya gagal karena error non-permanen (misal RPC timeout).  
- **Langkah:**
  1. Jalankan scheduler lagi setelah beberapa menit.
- **Expected Result:**
  - Agent mencoba lagi eksekusi schedule yang belum sukses.
  - Jika constraint kontrak terpenuhi, pembayaran akhirnya sukses.

---

## 10. Regression untuk Token & Network

### TC-090 – Kirim USDm di Celo ke address MiniPay
- **Prioritas:** P0  
- **Precondition:** Schedule dengan token USDm sudah dibuat, penerima menggunakan MiniPay di Celo.  
- **Langkah:**
  1. Jalankan eksekusi remitansi.
  2. Penerima membuka MiniPay.
- **Expected Result:**
  - Saldo USDm penerima di MiniPay bertambah sesuai amount remitansi.
  - Transaksi terlihat di explorer Celo.

### TC-091 – Pastikan tidak ada kirim di jaringan lain
- **Prioritas:** P1  
- **Langkah:**
  1. Review konfigurasi chain di dApp.
- **Expected Result:**
  - Tidak ada opsi chain selain Celo untuk eksekusi remitansi di MVP.
  - Semua transaksi terjadi di Celo.

---