export const REMITTANCE_ADDRESSES = {
  42220: (process.env.NEXT_PUBLIC_REMITTANCE_ADDRESS_MAINNET || "0xb5215bc86f27263f2db971f5c6d31bf4d1416b97") as `0x${string}`, // Celo Mainnet placeholder
  11142220: (process.env.NEXT_PUBLIC_REMITTANCE_ADDRESS_SEPOLIA || "0xfaC7D120ecc8b19f7a1468dA355386c99b8565F6") as `0x${string}`, // Celo Sepolia placeholder
} as const;

export const REMITTANCE_ABI = [
  {
    inputs: [
      { name: "_token", type: "address" },
      { name: "_agent", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "scheduleId", type: "uint256" },
      { indexed: true, name: "owner", type: "address" },
      { indexed: true, name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "frequency", type: "uint256" },
      { name: "startDate", type: "uint256" },
    ],
    name: "ScheduleCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "scheduleId", type: "uint256" },
      { indexed: true, name: "owner", type: "address" },
      { indexed: true, name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "nextExecutionTimestamp", type: "uint256" },
    ],
    name: "PaymentExecuted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "scheduleId", type: "uint256" },
      { indexed: true, name: "status", type: "uint256" },
    ],
    name: "ScheduleStatusChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "scheduleId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "hasMonthlyLimit", type: "bool" },
      { name: "maxMonthlyAmount", type: "uint256" },
    ],
    name: "ScheduleEdited",
    type: "event",
  },
  {
    inputs: [
      { name: "_recipient", type: "address" },
      { name: "_recipientName", type: "string" },
      { name: "_recipientPhone", type: "string" },
      { name: "_amount", type: "uint256" },
      { name: "_frequency", type: "uint256" },
      { name: "_startDate", type: "uint256" },
      { name: "_hasMonthlyLimit", type: "bool" },
      { name: "_maxMonthlyAmount", type: "uint256" },
    ],
    name: "createSchedule",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "_scheduleId", type: "uint256" },
      { name: "_newAmount", type: "uint256" },
      { name: "_newHasMonthlyLimit", type: "bool" },
      { name: "_newMaxMonthlyAmount", type: "uint256" },
    ],
    name: "editSchedule",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_scheduleId", type: "uint256" }],
    name: "pauseSchedule",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_scheduleId", type: "uint256" }],
    name: "resumeSchedule",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_scheduleId", type: "uint256" }],
    name: "cancelSchedule",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_scheduleId", type: "uint256" }],
    name: "executeScheduledPayment",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_scheduleId", type: "uint256" }],
    name: "getSchedule",
    outputs: [
      {
        components: [
          { name: "id", type: "uint256" },
          { name: "owner", type: "address" },
          { name: "recipient", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "frequency", type: "uint256" },
          { name: "startDate", type: "uint256" },
          { name: "nextExecutionTimestamp", type: "uint256" },
          { name: "hasMonthlyLimit", type: "bool" },
          { name: "maxMonthlyAmount", type: "uint256" },
          { name: "currentMonthPaid", type: "uint256" },
          { name: "lastPaidMonthTimestamp", type: "uint256" },
          { name: "status", type: "uint256" },
          { name: "recipientName", type: "string" },
          { name: "recipientPhone", type: "string" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "scheduleCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "token",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
