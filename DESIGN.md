# Sendease – Design Guidelines

## 1. Brand & Visual Identity

### 1.1 Brand Name
- **Product name:** Sendease
- **Tagline (opsional):** “Set your remittance, let your agent handle the rest.”

### 1.2 Color Palette (No Gradients)

Gunakan warna flat, tanpa gradient, dan tanpa shadow.

- **Primary**
  - `#09955F` – hijau utama
    - Dipakai untuk: primary button, primary link/action, highlight elemen penting.

- **Neutrals**
  - `#FFFFFF` – putih
    - Background card, surface utama.
  - `#F4F4F5` – abu muda
    - Background halaman, section separator.
  - `#E4E4E7` – abu medium
    - Border card, divider.
  - `#27272A` – abu gelap
    - Teks utama (headline, body).

- **Status / Accent**
  - Success: `#16A34A`
  - Warning: `#F97316`
  - Error: `#DC2626`
  - Info/pill secondary: `#0F172A` dengan opacity teks lebih ringan.

> Aturan:  
> - **Tidak** menggunakan gradient (linear/radial) atau shadow.  
> - Semua background dan elemen memakai warna flat dan outline/border saja untuk menjaga tampilan tetap bersih.

### 1.3 Typography

Gunakan font sans-serif yang bersih dan mudah dibaca. Jangan hardcode ukuran font kustom (hindari `text-[10px]`), gunakan utility variables bawaan.

- **Font family (web-safe):**
  - `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

- **Hierarchy:**
  - H1 (page title): `text-xl` to `text-2xl` (approx. 20–24px), semibold, warna `#27272A`
  - H2 (section title): `text-base` to `text-lg` (approx. 16–18px), semibold, warna `#27272A`
  - Body: `text-sm` to `text-base` (approx. 14–16px), regular, warna `#27272A`
  - Caption / helper text: `text-xs` (approx. 12px), regular, warna abu lebih muda (`#4B5563` opsional)

Tidak ada efek text gradient atau text shadow, gunakan warna solid saja.

---

## 2. Layout Principles

### 2.1 Mobile-first

- Desain utama untuk viewport:
  - Width ~360–390px (typical smartphone).
- Struktur:
  - Single column layout.
  - Spacing:
    - 16px padding kiri-kanan.
    - 12–16px vertical spacing antar section.

### 2.2 Desktop Behavior

- Desktop target width ~1280px, tapi konten di-center.
- Aturan:
  - Main container:
    - `max-width: 480px`
    - `margin: 0 auto`
  - Background halaman: `#F4F4F5`
  - Card di dalam: background `#FFFFFF`, border `#E4E4E7`, no shadow (keep it flat and clean).

Tujuannya: di desktop tetap terasa seperti app mobile di tengah layar, tanpa gradient dan tanpa shadow.

---

## 3. Components

### 3.1 App Bar / Header

- Tinggi: 56–64px.
- Background: `#FFFFFF`.
- Border bottom: 1px `#E4E4E7`.
- Isi:
  - Kiri: back arrow (untuk inner screens) atau logo kecil Sendease.
  - Tengah: title halaman (contoh: “Sendease”, “New Remittance”).
  - Kanan: wallet status singkat (contoh: `0x12...34`).

Tidak ada gradient di header, hanya warna putih flat.

### 3.2 Buttons

- **Primary button**
  - Background: `#09955F`
  - Teks: `#FFFFFF`
  - Radius: 8px
  - Padding: 12–14px tinggi, full width di mobile.
  - Hover (desktop): sedikit lebih gelap, misal `#07824F`.
  - Disabled: background `#A7F3D0` (atau `#E4E4E7`), teks lebih pucat.

- **Secondary button / text button**
  - Background: `#FFFFFF` (atau transparent).
  - Border: 1px `#E4E4E7` (jika perlu).
  - Teks: `#09955F` (untuk actions) atau `#27272A`.

Tidak menggunakan gradient di tombol, warna solid saja.

### 3.3 Cards

- Background: `#FFFFFF`
- Border radius: 12px
- Border: 1px `#E4E4E7`, no shadow (flat, clean outline only).
- Padding dalam: 12–16px.

Dipakai untuk:
- Hero card di dashboard.
- Card schedule remittance.
- Card detail & history.

### 3.4 Inputs & Form Fields

- Background: `#FFFFFF`
- Border: 1px `#E4E4E7`, radius 8px.
- Fokus (focus state):
  - Border color berubah ke `#09955F`.
- Placeholder:
  - Warna abu `#9CA3AF`, teks kecil.

Komponen:
- Text input (name, phone, amount).
- Textarea (intent prompt).
- Dropdown (frequency, currency).
- Date picker (boleh simple input dengan icon kalender).

---

## 4. Screen Design

### 4.1 Home / Dashboard

**Struktur:**
- App bar:
  - Title: Sendease
- Body:
  - Hero card:
    - Title: “Automate your remittances”
    - Subtitle singkat 1–2 baris.
    - Primary button: “Create Remittance”
  - Section “Active Schedules”:
    - List card per schedule:
      - Baris 1: Recipient name + badge status (Active/Paused).
      - Baris 2: Amount + currency, frequency.
      - Baris 3: Next payment (tanggal).
  - Section “Recent Activity”:
    - List transaksi singkat: tanggal, recipient, amount, status.

**Empty state (tidak ada schedule):**
- Card sederhana dengan ikon placeholder (flat), teks:
  - “You don’t have any remittances yet.”
  - Tombol: “Create your first remittance”.

Semua background flat: halaman `#F4F4F5`, cards `#FFFFFF`.

### 4.2 New Remittance

**App bar:**
- Left: back arrow.
- Title: “New Remittance”.

**Body (scrollable):**
- Section “Describe your remittance” (optional AI):
  - Textarea prompt.
  - Secondary button: “Generate from prompt”.

- Section “Details”:
  - Input: Recipient name.
  - Input: Recipient address.
  - Optional: Recipient phone.
  - Input: Amount.
  - Dropdown: Currency (USDm).
  - Dropdown: Frequency.
  - Date: Start date.
  - End condition (radio/selector).
  - “Safety & limits”:
    - Toggle “Enable monthly limit”.
    - Input limit amount (tampil jika toggle aktif).

- Bottom:
  - Primary button: “Review & Approve”.

### 4.3 Review & Approve

- Card ringkasan:
  - Recipient, address (disingkat).
  - Amount & frequency.
  - Start & end.
  - Limit (jika ada).
- Teks kecil:
  - “You will sign a transaction to approve your agent to send these payments.”
- Button:
  - Primary: “Confirm & Sign in MiniPay”.
  - Secondary: “Back”.

### 4.4 Remittance Detail

**App bar:**
- Back arrow + title “Remittance Detail”.

**Body:**
- Header card:
  - Recipient name + avatar initial.
  - Amount & currency.
  - Frequency.
  - Status pill (Active/Paused/Cancelled).
  - Toggle / button “Pause schedule”.

- “Next payment” section:
  - Next date.
  - (Opsional) teks kecil estimasi local currency.

- “History” section:
  - List item: tanggal, amount, status, link “View on explorer”.

- “Settings” section:
  - Current monthly limit.
  - Buttons:
    - “Edit schedule”.
    - “Cancel schedule” (button dengan border merah atau teks merah, background putih flat).

---

## 5. Status & Feedback

### 5.1 Status Badges

- Active:
  - Background: `#DCFCE7`
  - Text: `#166534`
- Paused:
  - Background: `#FEF9C3`
  - Text: `#92400E`
- Cancelled:
  - Background: `#FEE2E2`
  - Text: `#B91C1C`

Badge bentuk pill dengan radius besar, warna flat.

### 5.2 Toast / Alert

Gunakan snackbar/alert sederhana di bawah/atas:

- Success:
  - Background: `#16A34A`
  - Teks: `#FFFFFF`
- Error:
  - Background: `#DC2626`
  - Teks: `#FFFFFF`
- Info:
  - Background: `#0F172A`
  - Teks: `#FFFFFF`

Tanpa gradient, hanya blok warna.

---

## 6. Iconography

- Gaya icon: outline sederhana, flat (single color).
- Warna default icon:
  - `#09955F` untuk actions utama (e.g. add, send).
  - `#6B7280` untuk icon secondary (e.g. history, calendar).

Tidak menggunakan icon berwarna gradient atau ilustrasi kompleks. Bila perlu ilustrasi, gunakan bentuk sederhana dengan flat colors.

---

## 7. Accessibility

- Kontras:
  - Pastikan teks pada background hijau `#09955F` memiliki kontras tinggi (teks putih).
  - Hindari teks abu muda di atas putih yang terlalu pucat.
- Target touch:
  - Tombol minimal tinggi 40–44px.
  - Jarak antar tombol minimal 8px.

---

## 8. Design Constraints

- **No gradients**:
  - Tidak ada background gradient, tombol gradient, atau teks gradient.
  - Semua elemen memakai kombinasi warna flat dari palette.
- **No shadows**:
  - Tidak ada efek bayangan (box shadow atau text shadow) pada komponen. Gunakan outline/border tipis `#E4E4E7` untuk kontras/pemisah elemen.
- **No hardcoded sizes / arbitrary classes**:
  - Jangan melakukan hardcoding kelas CSS/Tailwind kustom/arbitrer untuk styling teks, padding, atau margin (seperti `text-[10px]` atau `p-[13px]`).
  - Selalu gunakan variabel / token utility yang sudah disediakan secara default (misalnya `text-xs`, `text-sm`, `text-base`, `text-lg`, `p-3`, `p-4`, dsb.).
- **Mobile-first**:
  - Semua komponen harus nyaman digunakan di layar kecil.
- **MiniPay-friendly**:
  - Hindari komponen sangat berat (animasi kompleks, gambar besar).
  - Fokus ke kejelasan informasi dan kesederhanaan interaksi.
