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
* [apps/hardhat](file:///Users/vickyadifirmansyah/Documents/Projects/send-ease/apps/hardhat) - Smart contracts codebase (Hardhat, Solidity, tests).

---

## 📖 Developer Documentation

For deeper details regarding specifications and implementation plans:
* 📋 **[PRD.md](file:///Users/vickyadifirmansyah/Documents/Projects/send-ease/PRD.md)** - Product Requirements Document containing goals, target audience, functional specifications, and milestones.
* 🎨 **[DESIGN.md](file:///Users/vickyadifirmansyah/Documents/Projects/send-ease/DESIGN.md)** - Visual brand identity, flat color palette, typography guidelines, mobile constraints, and component designs.
* 🤖 **[AGENTS.md](file:///Users/vickyadifirmansyah/Documents/Projects/send-ease/AGENTS.md)** - AI Agent architecture, roles (intent vs automation), safety checks, and execution flows.
* 📊 **[8004.mermaid](file:///Users/vickyadifirmansyah/Documents/Projects/send-ease/8004.mermaid)** - Flowcharts representing creation, verification, and automated scheduler workflows.
* 🧪 **[TEST_CASE.md](file:///Users/vickyadifirmansyah/Documents/Projects/send-ease/TEST_CASE.md)** - High-level and detailed test cases for QA verification.

---

## 🛠️ Getting Started

### Prerequisites

* [PNPM](https://pnpm.io/) (v9+ recommended)
* Node.js v18+

### Setup

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Start the development servers**:
   ```bash
   pnpm dev
   ```
   This fires up the Next.js dev server (typically on `http://localhost:3000`) and watch tasks.

3. **Check/Compile Smart Contracts**:
   ```bash
   pnpm contracts:compile
   pnpm contracts:test
   ```

### Deployment Scripts

* Deploy local node: `pnpm contracts:deploy`
* Deploy to Celo Sepolia Testnet: `pnpm contracts:deploy:celo-sepolia`
* Deploy to Celo Mainnet: `pnpm contracts:deploy:celo`

---

## 🛡️ License

MIT License.
