# Stitch UI Generation Prompt: Sendease Web-Based Dashboard

This document contains the master prompt instructions and design specifications for generating the **Sendease Web Dashboard**. Sendease is an autonomous, scheduled remittance agent on the Celo network.

> [!IMPORTANT]
> **Layout Constraint:** Unlike the mobile-first MiniPay default, this UI is a **web-based, desktop-first responsive dashboard**. It must use a multi-column desktop layout with a persistent navigation sidebar, wide content grids, and data tables.
> **Visual Style Constraint:** Use **flat design** with solid colors and clear outlines. **Strictly NO gradients and NO shadows.**

---

## 1. Core Brand & Styling Rules

Apply these strict design tokens to all generated UI components:

| Token / Element | Color Value | Description |
| :--- | :--- | :--- |
| **Primary Theme** | `#09955F` | Emerald green, used for main CTAs, active states, and links. |
| **Hover Primary** | `#07824F` | Darker emerald green for button hover states. |
| **Page Background** | `#F4F4F5` | Off-white / light gray base page color. |
| **Surface (Cards/Sidebar)** | `#FFFFFF` | Solid white for all cards, containers, headers, and sidebars. |
| **Borders & Dividers** | `#E4E4E7` | Light gray solid outline. All cards and inputs must use a `1px` solid border of this color. |
| **Text Primary** | `#27272A` | Dark charcoal for headings, body text, and icons. |
| **Text Secondary** | `#71717A` | Medium gray for captions, helper text, and secondary details. |
| **Status: Active** | Bg: `#DCFCE7` / Text: `#166534` | Pill badge for active schedules. |
| **Status: Paused** | Bg: `#FEF9C3` / Text: `#92400E` | Pill badge for paused schedules. |
| **Status: Cancelled**| Bg: `#FEE2E2` / Text: `#B91C1C` | Pill badge for deleted/cancelled schedules. |

### Visual Rules
- **No Gradients:** Use flat colors. No linear, radial, or background gradients.
- **No Shadows:** Use solid borders (`1px solid #E4E4E7`) instead of shadow/box-shadow effects to separate elements.
- **Rounded Corners:** Use uniform border-radius of `8px` for inputs/buttons and `12px` for cards/panels.
- **Typography:** Use a clean sans-serif typeface (e.g., `Inter`, `Outfit`, or system default `system-ui`). Headings should be semibold, text sizes should strictly map to standard scales (`text-xs` up to `text-2xl`).

---

## 2. Global Layout Shell (Desktop Grid)

Generate a responsive master shell that frames all pages. It consists of:

### 2.1 Persistent Sidebar (Left - Width: `260px`)
- **Header:** Sendease logo (a flat, modern green icon) and name "Sendease" in bold `text-lg`.
- **Navigation Links:** List item links with thin outlines, using simple stroke icons (dashboard, calendar-plus, users, history, settings).
- **Active State:** Highlighted link with background `#F4F4F5` and a solid left-border of `#09955F` (no glow, no gradients).
- **Footer:** Connected agent info: "Remittance Agent Active" status light (pulse green dot) and self-agent identity status.

### 2.2 Global Top Header (Header Height: `64px`)
- **Breadcrumbs:** Shows current location (e.g., `Dashboard / Active Schedules`).
- **Right Action Area:**
  - Network Indicator: Solid gray pill indicating "Celo Mainnet" or "Sepolia Testnet".
  - Wallet Status Widget: A flat pill button displaying the wallet connection state. Shows `0x7a2...f3b` (shortened address), a small user avatar placeholder, and a green active indicator. If disconnected, shows a prominent green button "Connect Wallet".
  - Notifications: Bell icon showing a red indicator badge if schedules have warnings (e.g. limit exceeded or insufficient funds).

---

## 3. Screen Specifications

Generate four key screen layouts that users can toggle.

### 3.1 Screen 1: Dashboard Overview (Main Home)
A multi-column summary interface showing schedule statistics and live activity.

```
+-------------------------------------------------------------------------+
| [Overview Cards Grid: 4 Columns]                                        |
| Active Schedules | Total Transferred | Next Due Payment | Limit Health  |
|      (3)         |    (450 USDm)     |    (Jun 5, 2026) | (80% Remaining|
+-----------------------------------+-------------------------------------+
| [Active Schedules Panel - 65%]    | [Agent Quick Stats / Feed - 35%]    |
| List of cards:                    | - Agent Wallet balance: 12.5 CELO   |
| - Recipient Name, Avatar, Wallet  | - Executions count: 18 success      |
| - Amount (e.g. 100 USDm)          | - Safety constraints active check   |
| - Frequency, Next Date, Badge     |-------------------------------------|
| - Pause / Resume quick controls   | [Low Balance / Alerts Warning]      |
+-----------------------------------+-------------------------------------+
| [Recent Remittance Activity Table - 100% Width]                         |
| Date | Recipient | Amount | Status (Success/Fail) | Transaction Hash    |
+-------------------------------------------------------------------------+
```

#### Detailed Specs for Screen 1:
- **Metric Cards:** Four grid cards at the top. Clean numbers, light border, `#FFFFFF` bg, no shadow.
- **Active Schedules List:** Main content column. Each schedule is a white card containing:
  - Left: Rounded recipient avatar with initials (e.g., "A" for Ana), recipient name, and wallet address.
  - Middle: Big amount label `100.00 USDm` and frequency pill (`Monthly`).
  - Right: "Next Transfer: 05 June 2026", Status Pill (e.g. `Active`), and action icons (Pause icon, edit pencil icon).
- **Recent Activity Table:** Flat tabular grid with columns for `Timestamp`, `Recipient`, `Amount`, `Status` (with success/error color badges), and a link icon to `Celo Explorer`.

---

### 3.2 Screen 2: New Remittance / Schedule Builder
A split-pane layout combining natural language AI parsing with standard structured configurations.

```
+-----------------------------------+-------------------------------------+
| [Left Panel: AI Intent Assistant] | [Right Panel: Structured Form]     |
| "Tell the agent what to do:"      | - Recipient Name                    |
| [Text Area for Natural Language]  | - Recipient Address (0x...)         |
| e.g. "Kirim 100 USDm ke Ana tiap  | - Recipient Phone (Optional)        |
| tanggal 1 mulai bulan depan"      | - Transfer Amount                   |
|                                   | - Frequency (Weekly / Monthly)      |
| [Button: Parse & Pre-fill Form]   | - Start Date & End Conditions       |
|                                   | - Safety Limits toggle & Max limit  |
|                                   | [Button: Review & Schedule]         |
+-----------------------------------+-------------------------------------+
```

#### Detailed Specs for Screen 2:
- **Left Panel (AI Assistant):**
  - Dark-tinted banner header: "Natural Language Scheduler".
  - Text area with a clear placeholder: *"Kirim 50 USDm ke Budi setiap hari Jumat..."* or *"Send 120 USDm to Sarah every 1st of the month starting tomorrow."*
  - Prominent CTA: "Parse Intent" (outlined with emerald green, on-hover turns solid emerald).
- **Right Panel (Form Input):**
  - Text fields for `Recipient Name`, `Recipient Wallet Address` (with validation checkmark), and `Phone Number` (with metadata lookup helper).
  - Number fields for `Amount` with currency fixed to `USDm` (Mento Dollar).
  - Date and frequency selectors.
  - Safety constraints section: Toggle switch labeled "Enable Monthly Safety Limit". When checked, reveals an input for "Max Cumulative Amount Per Month" to prevent overrun.
  - Action footer: "Reset Form" (secondary flat button) and "Review Remittance" (primary solid green button `#09955F`).

---

### 3.3 Screen 3: Review & Authorization Modal
A pop-up modal overlay that appears when the user clicks "Review Remittance".

```
+-----------------------------------------------------------------+
|                      Review Scheduled Payment                   |
+-----------------------------------------------------------------+
| Recipient:     Ana (0x4b72...89a1)                              |
| Schedule:      100.00 USDm every Month                          |
| Start Date:    June 5, 2026                                     |
| Monthly Limit: Enabled (Max 300 USDm/month)                     |
+-----------------------------------------------------------------+
| [!] Warning Note:                                               |
| You are authorizing the Sendease Automation Agent to execute   |
| transfers on your behalf. Funds will be drawn from your         |
| approved allowance.                                             |
+-----------------------------------------------------------------+
| [ Cancel ]                                [ Approve & Sign ]    |
+-----------------------------------------------------------------+
```

#### Detailed Specs for Screen 3:
- **Modal Wrapper:** Centered on-screen. Background `#FFFFFF`, border `2px solid #E4E4E7`, no box-shadow, modal backdrop is a semi-transparent gray `#27272a` at `40%` opacity.
- **Summary Cards:** Flex rows showing labeled parameters of the remittance.
- **Safety / Info Banner:** Box with warning border (`1px solid #F97316`), background `#FFF7ED`, warning text in `#9A3412` reminding the user of the smart contract approval process.
- **Action Buttons:**
  - Secondary: "Back & Edit" (`#FFFFFF` bg, text `#27272A`, border `#E4E4E7`).
  - Primary: "Approve & Sign in MiniPay" (solid `#09955F` bg, text `#FFFFFF`).

---

### 3.4 Screen 4: Remittance Detail & Execution History
A rich data view showing detailed analytics for a single active schedule.

```
+-------------------------------------------------------------------------+
| [Header] <-- Back to Dashboard | Schedule ID: #SCH-0941                 |
+-----------------------------------+-------------------------------------+
| [Left Column: Config & Actions]   | [Right Column: Safety & Limits]     |
| Recipient: Budi (0x12a9...c421)   | Spent this month:                   |
| Status: [ Active ] (green badge)  | [=================------] 75%       |
| Schedule: 200 USDm Monthly        | 150 USDm spent / 200 USDm limit     |
| Next Due: Jun 14, 2026            |                                     |
|                                   | Cumulative Paid: 600 USDm           |
| [Pause Schedule]  [Cancel Schedule]                                     |
+-----------------------------------+-------------------------------------+
| [Bottom Section: Transaction & Execution History Log]                  |
| Date        | Transaction Hash | Amount Sent | Execution Fee | Status   |
| 14 May 2026 | 0x81b4...28fa    | 200 USDm    | 0.01 CELO     | Success  |
| 14 Apr 2026 | 0x3ac4...71ed    | 200 USDm    | 0.01 CELO     | Success  |
| 14 Mar 2026 | 0x0ef1...4a2b    | 200 USDm    | 0.01 CELO     | Success  |
+-------------------------------------------------------------------------+
```

#### Detailed Specs for Screen 4:
- **Actions Panel:** Simple flat buttons.
  - "Pause Schedule" (changes badge to orange `Paused` and swaps label to "Resume Schedule").
  - "Cancel Schedule" (red-bordered button `#DC2626`, background `#FFFFFF`).
- **Limit Tracker Widget:** A custom linear progress bar representing the percentage of the monthly limit spent. Background gray `#E4E4E7` filled with solid green `#09955F`.
- **Execution Log Table:** Tabular history showing all automated execution attempts by the agent. If an execution failed (e.g. due to user contract balance), the status is a red error pill with a warning tooltip.

---

## 4. UI States & Component Specifications

When generating states or components in Stitch, ensure these rules are met:

### 4.1 Input Field State
- **Default:** White background, thin gray outline (`1px solid #E4E4E7`), text color `#27272A`.
- **Hover:** Outline changes to `#A1A1AA`.
- **Focus:** Outline changes to `#09955F` with a `1px` ring (no blur/glow shadow).
- **Error:** Outline changes to `#DC2626`. Below-field error text appears in `#DC2626` (small text size).

### 4.2 Button States
- **Primary:** Background `#09955F`, text `#FFFFFF`.
  - Hover: Background `#07824F`.
  - Active/Click: Background `#04623B`.
  - Disabled: Background `#E4E4E7`, text `#A1A1AA`, cursor not-allowed.
- **Secondary:** Background `#FFFFFF`, border `1px solid #E4E4E7`, text `#27272A`.
  - Hover: Background `#F4F4F5`.

### 4.3 Notification Toasts (Simple Blocks)
- Positioned in the bottom-right corner or top-center.
- No rounded borders over 8px, flat, thin border `1px solid #E4E4E7`.
- **Success Toast:** `#16A34A` background block, white text, checkmark icon.
- **Error Toast:** `#DC2626` background block, white text, alert icon.
