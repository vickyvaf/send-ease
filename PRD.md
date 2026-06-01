# Sendease – Remittance Agent MiniApp for MiniPay
Product Requirements Document (PRD)

## 1. Overview

Sendease adalah MiniApp di atas Celo MiniPay yang membantu pengguna
mengatur remitansi stablecoin secara terjadwal (recurring) ke keluarga
dan teman. Pengguna cukup mendeskripsikan intent (misalnya:
“Kirim 100 USDm ke Ana tiap tanggal 1”) atau mengisi form, lalu
agent akan otomatis mengeksekusi pembayaran onchain sesuai jadwal
dalam batas limit yang sudah disetujui.

Project ini menyasar Onchain Agents Hackathon (Celo), dengan fokus:
- Real‑world payments & remittance
- AI/automation agent yang punya real economic agency (bukan sekadar analitik)
- Integrasi MiniPay (mobile‑first, stablecoin Celo, possibly phone-number mapping)

Nama produk: **Sendease**

---

## 2. Goals & Non-goals

### 2.1 Goals

- Memungkinkan pengguna membuat remitansi terjadwal menggunakan stablecoin USDm di Celo.
- Agent secara otomatis mengeksekusi pengiriman sesuai jadwal tanpa butuh approval ulang setiap transaksi (dalam batas yang telah di-approve).
- Menyediakan UX yang ramah pengguna MiniPay:
  - Mobile-first layout
  - Navigasi jelas (back arrow)
  - Dukungan label penerima dan nomor HP sebagai metadata untuk future phone-number lookup.
- Menunjukkan aktivitas onchain yang konsisten (banyak transaksi) dan dapat dipantau di explorer / 8004scan (jika menggunakan ERC‑8004).

### 2.2 Non-goals (v1 / hackathon scope)

- Tidak menyelesaikan full KYC / compliance remitansi fiat (ini tetap remitansi crypto stablecoin).
- Tidak melakukan bridging lintas chain (hanya Celo network).
- Tidak mengelola mapping lengkap phone → wallet di sisi sendiri (mengandalkan MiniPay phone-number lookup jika diintegrasikan).
- Tidak membangun contact book kompleks multi-device dengan backend (boleh ditambah kemudian).

---

## 3. Target Users & Use Cases

### 3.1 Target Users

- Pekerja global / freelancer yang ingin mengirimkan stablecoin ke keluarga secara rutin.
- Pengguna MiniPay di negara berkembang yang menerima kiriman dari saudara di luar negeri.
- Crypto-native user yang ingin meng-otomasi pembayaran rutin (support keluarga, donasi, dll.) di Celo.

### 3.2 Primary Use Cases

1. **Monthly family remittance**
   - User: “Kirim 200 USDm ke orang tua di Indonesia setiap tanggal 1.”
   - Agent: menyimpan jadwal dan otomatis kirim 200 USDm tiap tanggal 1 selama dana dan limit mencukupi.

2. **One-time scheduled remittance**
   - User: “Tanggal 25, kirim 100 USDm ke Ana.”
   - Agent: mengeksekusi pembayaran sekali pada tanggal tersebut.

3. **Multi-recipient remittance (fase lanjut / nice to have)**
   - User: kirim remitansi ke beberapa anggota keluarga (misalnya orang tua + adik) dengan nominal berbeda.

---

## 4. Product Scope

### 4.1 Supported network & assets (MVP)

- Network: **Celo Mainnet** (production) / Celo Sepolia (test).
- Token utama: **USDm** (Mento Dollar, pengganti cUSD) untuk remitansi.
- Token lain (USDT/USDC di Celo) boleh disebut sebagai future extension / nice to have.

### 4.2 Core Flows (MVP)

1. **Create remittance schedule**
2. **Automatic execution by agent**
3. **View & manage schedule (detail, pause, cancel)**
4. **View history & status**
5. **(Optional v1) Intent-based creation via natural language**

---

## 5. User Flows (High-level)

### 5.1 Create Remittance (Form-first)

1. User membuka Sendease di MiniPay (Celo MiniApp).
2. Dashboard menampilkan:
   - Ringkasan schedule aktif
   - Riwayat transaksi terakhir
   - Tombol “Create Remittance”.
3. User klik “Create Remittance”:
   - Halaman New Remittance:
     - Input: Recipient name (label)
     - Input: Recipient wallet address
     - Optional: Recipient phone number (metadata future phone-number lookup)
     - Input: Amount
     - Dropdown: Currency (fixed USDm untuk MVP)
     - Dropdown: Frequency (One-time, Weekly, Monthly)
     - Date picker: Start date
     - Optional: End condition (No end, after N payments, end on date)
     - Section: Safety & limits
       - Toggle: Enable monthly limit
       - Input: Max monthly amount
4. User klik “Review & Approve”:
   - Halaman Ringkasan:
     - Menampilkan semua detail remit
     - Menyatakan bahwa user akan menandatangani approval/transfer ke kontrak.
5. User klik “Confirm & Sign”:
   - MiniPay membuka prompt transaksi:
     - Approve atau transfer USDm ke RemittanceContract.
6. Setelah transaksi sukses:
   - Kontrak menyimpan jadwal.
   - UI kembali ke Dashboard dan menampilkan schedule baru di daftar “Active Schedules”.

### 5.2 Create Remittance (Intent / AI)

1. Di halaman New Remittance, user bisa menulis prompt:
   - “Kirim 100 USDm ke Ana di Filipina tiap tanggal 5.”
2. Backend/agent mem-parse prompt menjadi:
   - recipientName, amount, currency=USDm, frequency=Monthly, startDate, dsb.
3. Form di-pre-fill berdasar hasil parsing.
4. Flow lanjut sama seperti form-first: review → approve → sign.

### 5.3 Automatic Execution

1. Backend agent memiliki scheduler (cron / job):
   - Setiap X menit/jam, cek jadwal di Kontrak.
2. Untuk setiap schedule aktif:
   - Jika tanggal & kondisi terpenuhi dan limit belum terlampaui:
     - Agent memanggil fungsi `executeScheduledPayment(scheduleId)` di kontrak (dengan private key agent atau method khusus).
3. Kontrak:
   - Mengirim USDm ke penerima.
   - Mengupdate status schedule (next execution time, total paid, dsb.).
4. Event transaksi disimpan dan dapat ditampilkan di history UI.

### 5.4 Manage Schedule

1. Dari Dashboard, user klik salah satu schedule:
   - Halaman Remittance Detail:
     - Menampilkan header (recipient, amount, frequency, status).
     - Next payment info (tanggal berikutnya, estimasi nilai lokal – bisa di-MVP-kan atau tambahkan nanti).
     - History list (tanggal, amount, status, link explorer).
2. User bisa:
   - Pause / resume schedule
   - Edit schedule (buka ulang form dengan pre-fill)
   - Cancel schedule (mengubah status dan opsional menarik sisa dana jika desain kontrak memungkinkan)
3. Perubahan dikirim sebagai transaksi ke kontrak.

---

## 6. Functional Requirements

### 6.1 Dashboard

- Menampilkan semua schedule remitansi milik user:
  - Recipient label
  - Amount & currency
  - Frequency
  - Status (Active / Paused / Cancelled)
  - Next payment date
- Menampilkan 5–10 transaksi remitansi terakhir (history).
- Tombol “Create Remittance”.

### 6.2 Create / Edit Remittance

- Input form untuk:
  - Recipient label (string)
  - Recipient address (Celo address)
  - Optional recipient phone (string, E.164 format)
  - Amount (number)
  - Currency (USDm fixed)
  - Frequency (One-time / Weekly / Monthly)
  - Start date
  - End condition (none / after N / on date)
  - Safety limit (toggle + max monthly amount)
- Validasi:
  - Amount > 0
  - Address valid
  - Start date ≥ current date
  - Limit >= amount per period jika diaktifkan
- “Review & Approve” menampilkan ringkasan sebelum sign.
- Integrasi MiniPay wallet:
  - Pemanggilan transaksi approve/transfer USDm ke kontrak.

### 6.3 Automatic Execution

- Backend agent:
  - Menarik list schedule yang perlu dicek dari kontrak.
  - Cek apakah:
    - Schedule aktif
    - Sekarang >= next scheduled date
    - Total paid bulan ini < monthly limit (jika diset)
    - Saldo di kontrak cukup (atau mekanisme lain sesuai desain).
  - Jika semua ok:
    - Memanggil `executeScheduledPayment(scheduleId)`.
- Kontrak:
  - Mengirim USDm ke recipient address.
  - Emit event untuk pemantauan.
  - Update state schedule.

### 6.4 History & Detail

- Kontrak/agent menyimpan event history:
  - scheduleId, txHash, timestamp, amount, status (Success/Failed).
- Frontend menampilkan history dengan pagination sederhana.
- Link ke explorer Celo untuk tiap transaksi.

### 6.5 Identity & Phone Number (MVP-friendly)

- Form menerima phone number sebagai metadata optional.
- (Opsional jika sempat) MiniPay phone-number lookup:
  - Menggunakan API MiniPay untuk resolve phone → address.
  - Jika tidak ditemukan: berikan UI “recipient belum menggunakan MiniPay, kirim invite link”.

---

## 7. Non-Functional Requirements

- **Mobile-first UI**:
  - Layout dioptimalkan untuk layar kecil (MiniPay in Opera Mini).
  - Desktop view tetap responsive, dengan max-width ~480px bertengger di tengah.
- **Reliability**:
  - Agent scheduler sebaiknya idempotent dan tahan terhadap kegagalan jaringan (retry).
- **Security (MVP)**:
  - Kontrak harus mencegah agent mencuri dana di luar schedule/limit yang diset user.
  - Pastikan tidak ada unlimited allowance tanpa batas logis.
- **Performance**:
  - Query state schedule dari kontrak dan history tidak boleh terlalu berat di frontend.
  - Pertimbangkan paginasi atau batasi jumlah history yang ditampilkan.

---

## 8. Technical Architecture (High-level)

### 8.1 Components

- **Frontend (MiniApp / dApp)**:
  - React/Next (atau framework pilihan) dengan layout mobile-first.
  - Integrasi MiniPay provider (wallet connection).
  - Menangani form, dashboard, detail, dan interaksi dengan kontrak.

- **Smart Contract (RemittanceContract)**:
  - Menyimpan data schedule:
    - scheduleId
    - owner (sender)
    - recipient
    - amount
    - frequency
    - start date
    - next execution timestamp
    - end condition
    - monthly limit & tracking
    - status (Active/Paused/Cancelled)
  - Menyimpan dana (kalau desainnya custodial di kontrak).
  - Fungsi utama:
    - createSchedule / updateSchedule / cancelSchedule
    - executeScheduledPayment
    - withdrawUnusedFunds (opsional)
  - Emit event untuk setiap eksekusi remitansi & perubahan schedule.

- **Backend Agent Service**:
  - Service cron/scheduler:
    - Periodik memeriksa jadwal dan memanggil fungsi eksekusi di kontrak.
  - Menggunakan private key agent khusus atau integrasi agent wallet.
  - Optional: integrasi Self Agent ID / ERC‑8004 untuk onchain identity agent.

### 8.2 Data Storage di Frontend

- Local state (React) untuk:
  - Schedule list (fetched dari kontrak)
  - History (dari kontrak/event atau backend indexer)
- LocalStorage:
  - Menyimpan daftar “Saved contacts” (recipient label + address + optional phone) per wallet untuk UX lebih baik (MVP).

---

## 9. Milestones (MVP)

1. **M1 – Contract & basic UI skeleton**
   - Kontrak Remittance dengan create schedule + execute payment dasar (tanpa limit kompleks).
   - UI: Dashboard + Create Remittance + Detail (dummy data).
2. **M2 – Full MVP flows**
   - Connect ke Celo (MiniPay).
   - Create schedule + sign transaksi approve/transfer USDm.
   - Agent backend yang memanggil `executeScheduledPayment`.
   - History di UI dari event kontrak.
3. **M3 – UX & AI Enhancements**
   - Intent-based prompt untuk pre-fill form.
   - Back navigation yang rapi.
   - Optional phone metadata dan basic invite link UX.
4. **M4 – Polish & Submission**
   - Bugfix, dokumentasi di README.
   - Demo video, link kontrak, link explorer, dan (jika sempat) Self Agent ID / ERC‑8004 registration.

---

## 10. Open Questions / Future Work

- Apakah agent akan memakai dedicated agent wallet + funding, atau kontrak yang memegang dana user (custodial by contract)?
- Sejauh apa dukungan multi-currency (USDm saja vs tambahan USDT/USDC di Celo)?
- Integrasi lengkap dengan Self Agent ID dan ERC‑8004 untuk identitas & reputasi agent di ekosistem Celo.
- Integrasi MiniPay phone-number lookup penuh dengan fallback dan invite flow yang polished.