# Sendease

Sendease is a mobile-first, decentralized scheduled remittance MiniApp built on top of **Celo MiniPay**. It empowers users to automate recurring stablecoin transfers (using **USDm**) to family and friends. By integrating a natural language intent-parsing agent and an autonomous on-chain automation agent, Sendease makes periodic remittances as simple as sending a chat message.

---

## 🚀 Key Features

* **Natural Language Intent Parsing**: Describe your transfer in plain text (e.g., *"Kirim 100 USDm ke Ana tiap tanggal 1"*), and our agent will automatically extract parameters to pre-fill the creation form.
* **Autonomous Execution Engine**: A background cron service with real economic agency executes payments on behalf of users once schedules are due.
* **Safety & Limit Controls**: User-defined monthly safety limits (`maxMonthlyAmount`) to prevent unintended transfers.
* **ERC-8004 Identity Integration**: Registered agent identity on-chain for transparency and trust tracking via standard explorers.
* **Mobile-First Design**: Custom flat-color layout tailormade for Opera MiniPay viewport heights and connection speeds.

---

## 📂 Project Structure

This project is organized as a monorepo powered by **Turborepo**:

* [apps/web](file:///Users/vickyadifirmansyah/Documents/Projects/send-ease/apps/web) - The Next.js 16 frontend app loaded inside MiniPay.
* [apps/contracts](file:///Users/vickyadifirmansyah/Documents/Projects/send-ease/apps/contracts) - Smart contracts codebase (Foundry, Solidity, tests).

---

## 🔄 Workflow Diagram

```mermaid
flowchart TD
    %% ====== LEGEND ======
    subgraph LEGEND[Legend]
      direction LR
      U[User] --- A[AI Agent / Backend] --- C[(Remittance Contract)]
      M[MiniPay Wallet]
    end

    %% ====== START ======
    START([Buka MiniApp di MiniPay])

    %% ====== HOME / DASHBOARD ======
    START --> H1[Home / Dashboard\nTampilkan daftar schedule dan activity]
    H1 --> H1_CREATE[User tap tombol Create Remittance]
    H1_CREATE --> CR1[Screen: New Remittance]

    %% ====== CREATE / EDIT REMITTANCE ======
    subgraph CREATE[Create / Edit Remittance Flow]
      direction TB

      CR1 --> IN1[User isi Natural Language Prompt\ncth: Kirim 100 USDm ke Ana tiap tanggal 1]
      CR1 --> IN2[Atau isi Form terstruktur\nRecipient, Amount, Frequency, Start date, Limit]

      IN1 --> AG1[AI Agent parse intent\nmenjadi amount, currency, recipient, frequency, start date]
      AG1 --> F1[Form terisi otomatis dari hasil parsing]
      IN2 --> F1

      F1 --> R1[User review konfigurasi remittance\nperiksa recipient, amount, jadwal, limit]

      R1 --> CONFIRM[Screen: Review dan Approve]
      CONFIRM --> M1[MiniPay Wallet prompt\napprove kontrak atau transfer dana awal]
      M1 --> C1[(Remittance Contract\nmenyimpan config dan dana)]

      C1 --> D1[Kembali ke Dashboard\ntampilkan schedule baru di Active Schedules]
    end

    %% ====== PERIODIC EXECUTION (AGENT) ======
    subgraph EXEC[Periodic Execution oleh Agent]
      direction TB

      T0[Waktu berjalan\ncron atau scheduler backend] --> CK1[Agent cek semua schedule aktif]
      CK1 --> CK2[Untuk tiap schedule:\ncek tanggal, status, saldo, dan limit]

      CK2 --> WAIT[Jika belum saatnya atau status nonaktif\nskip dan tunggu tick berikutnya]
      CK2 --> AGTX["Jika saatnya kirim dan masih dalam limit\nagent panggil kontrak executeScheduledPayment(id)"]

      AGTX --> C2[(Remittance Contract\nkirim stablecoin ke penerima)]
      C2 --> TXOK[Transaksi sukses\nsimpan log dan event]
      C2 --> TXFAIL[Transaksi gagal\nmisalnya saldo kurang atau error lain]
    end

    %% ====== USER VIEW HISTORY / DETAIL ======
    subgraph DETAIL[Schedule Detail dan History]
      direction TB

      H1 --> SD1[User pilih salah satu schedule\nbuka Remittance Detail]
      SD1 --> SD2[Tampilkan header\nrecipient, amount, frequency, status]
      SD2 --> SD3[Bagian Next payment\nnext date dan estimasi nilai lokal]
      SD3 --> SD4[Bagian History\nriwayat transaksi: tanggal, status, link explorer]

      SD4 --> SD_PAUSE[User toggle Pause atau Resume]
      SD4 --> SD_EDIT[User pilih Edit schedule]
      SD4 --> SD_CANCEL[User pilih Cancel schedule]

      SD_PAUSE --> A_PAUSE[Agent update status schedule di contract]
      SD_EDIT --> A_EDIT[Agent jalankan flow edit\nupdate config di contract]
      SD_CANCEL --> A_CANCEL[Agent set schedule nonaktif\ndan opsional tarik sisa dana ke user]

      A_PAUSE --> SD1
      A_EDIT --> SD1
      A_CANCEL --> SD1
    end

    %% ====== NOTIFICATIONS ======
    subgraph NOTIF[Notifications dan Safety]
      direction TB

      TXFAIL --> N1[Agent kirim notifikasi ke user\npembayaran gagal: saldo kurang atau error]
      CK2 --> N2[Jika limit bulanan tercapai\nagent kirim notifikasi dan mem-pause schedule]
    end
```

---

## 📖 Developer Documentation

For deeper details regarding specifications and implementation plans:
* 📋 **[PRD.md](file:///Users/vickyadifirmansyah/Documents/Projects/send-ease/PRD.md)** - Product Requirements Document containing goals, target audience, functional specifications, and milestones.
* 🎨 **[DESIGN.md](file:///Users/vickyadifirmansyah/Documents/Projects/send-ease/DESIGN.md)** - Visual brand identity, flat color palette, typography guidelines, mobile constraints, and component designs.
* 🤖 **[AGENTS.md](file:///Users/vickyadifirmansyah/Documents/Projects/send-ease/AGENTS.md)** - AI Agent architecture, roles (intent vs automation), safety checks, and execution flows.
* 📊 **[DIAGRAM.mermaid](file:///Users/vickyadifirmansyah/Documents/Projects/send-ease/DIAGRAM.mermaid)** - Flowcharts representing creation, verification, and automated scheduler workflows.
* 🧪 **[TEST_CASE.md](file:///Users/vickyadifirmansyah/Documents/Projects/send-ease/TEST_CASE.md)** - High-level and detailed test cases for QA verification.

---

## 🛠️ Getting Started

### Prerequisites

* [PNPM](https://pnpm.io/) (v8+ or v9+ recommended)
* Node.js v18+
* [Foundry](https://book.getfoundry.sh/) (for smart contracts compilation & testing)

### Setup

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Start the development servers**:
   ```bash
   pnpm dev
   ```
   This fires up the Next.js dev server (typically on `http://localhost:3000`) and watches for changes.

3. **Check/Compile Smart Contracts**:
   To compile and test smart contracts using Foundry:
   ```bash
   cd apps/contracts
   forge build
   forge test
   ```

### Deployment & Verification (Foundry)

Contracts are deployed using Foundry forge scripts:
* Deploy to Celo Mainnet / Sepolia:
  ```bash
  cd apps/contracts
  # Copy env and set your private key
  cp .env.example .env
  # Run the deploy script
  ./deploy-mainnet.sh
  ```

### ERC-8004 Agent Registration

To register the Sendease AI agent on-chain on the ERC-8004 registry:
1. Make sure your environment variables in `apps/web/.env.local` are set (`AGENT_PRIVATE_KEY` or `RELAYER_PRIVATE_KEY`).
2. Run the registration script:
   ```bash
   pnpm --filter web register-agent
   ```
3. To update the metadata URI:
   ```bash
   pnpm --filter web register-agent # or custom update script
   # or run directly:
   npx tsx apps/web/scripts/update-agent-uri.ts
   ```

---

## 🛡️ License

MIT License.
