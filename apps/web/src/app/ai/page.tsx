"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAccount, usePublicClient } from "wagmi";
import { formatUnits } from "viem";
import { Send, User, Bot, Mic, MicOff, RefreshCw, Pencil, Plus, MessageSquare, Clock, X, Calendar, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChat, Message, ChatSession } from "@/context/chat-context";
import { stripMarkdown } from "@/lib/utils";
import { REMITTANCE_ABI, REMITTANCE_ADDRESSES } from "@/lib/contracts";
import { formatAmount } from "@/lib/app-utils";
import { useToast } from "@/context/toast-context";

export default function AIAgent() {
  const router = useRouter();
  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient();
  const { showToast } = useToast();

  const { messages, setMessages, currentSessionId, setCurrentSessionId, sessions, deleteSession } = useChat();
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userSchedules, setUserSchedules] = useState<any[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chainId = chain?.id || 42220;
  const contractAddress = REMITTANCE_ADDRESSES[chainId as keyof typeof REMITTANCE_ADDRESSES] || REMITTANCE_ADDRESSES[42220];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load user schedules on-chain to provide history context for the AI
  const fetchSchedulesContext = useCallback(async () => {
    if (!isConnected || !address || !publicClient) return;
    try {
      const count = (await publicClient.readContract({
        address: contractAddress,
        abi: REMITTANCE_ABI,
        functionName: "scheduleCount",
      })) as bigint;

      const list = [];
      for (let i = 1; i <= Number(count); i++) {
        try {
          const s = (await publicClient.readContract({
            address: contractAddress,
            abi: REMITTANCE_ABI,
            functionName: "getSchedule",
            args: [BigInt(i)],
          })) as any;

          if (s.owner.toLowerCase() === address.toLowerCase()) {
            list.push({
              id: Number(s.id),
              recipient: s.recipient,
              recipientName: s.recipientName,
              recipientPhone: s.recipientPhone,
              amount: parseFloat(formatUnits(s.amount, 18)),
              frequency: Number(s.frequency),
              status: Number(s.status),
              nextPayment: s.nextExecutionTimestamp > 0
                ? new Date(Number(s.nextExecutionTimestamp) * 1000).toLocaleDateString()
                : "None",
            });
          }
        } catch (err) { }
      }
      setUserSchedules(list);
    } catch (e: any) {
      const isContractNotDeployed = e instanceof Error && (
        e.message.includes("returned no data") ||
        e.message.includes("0x") ||
        e.message.includes("not a contract")
      );
      if (isContractNotDeployed) {
        console.warn(`RemittanceContract is not deployed at ${contractAddress} on chain ${chainId}.`);
        setUserSchedules([]);
      } else {
        console.error("Failed to load schedules context", e);
      }
    }
  }, [isConnected, address, publicClient, contractAddress]);

  useEffect(() => {
    if (isConnected && address && publicClient) {
      fetchSchedulesContext();
    }
  }, [isConnected, address, publicClient, fetchSchedulesContext]);

  const loadSession = (session: ChatSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([
      {
        role: "bot",
        content: "Hi! I'm your Sendease Assistant. I can help you schedule a stablecoin remittance on Celo. Try saying: \"Kirim 100 USDm ke Ana tiap tanggal 1\". How can I help you today?"
      }
    ]);
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Voice recognition is not supported in this browser.", "error");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID'; // Default to Indonesian matching user settings, or en-US
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error(event.error);
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev ? `${prev} ${transcript}` : transcript);
    };

    recognition.start();
  };

  const sendMessage = async (overrideContent?: string) => {
    const messageContent = overrideContent || input;
    if (!messageContent.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: messageContent };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = messageContent;
    if (!overrideContent) setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: currentInput,
          history: userSchedules
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to parse intent");
      }

      const result = await response.json();

      if (result.success) {
        if (result.data && result.data.message) {
          // General conversation response
          setMessages(prev => [...prev, {
            role: "bot",
            content: result.data.message
          }]);
        } else if (result.data && result.data.capability === "create_schedule") {
          // AI scheduled parameters parsed successfully!
          setMessages(prev => [...prev, {
            role: "bot",
            content: `I've prepared a remittance schedule plan based on your request. Please review the details below:`,
            actionData: {
              type: "create_schedule",
              ...result.data.params
            }
          }]);
        }
      } else {
        if (result.clarification) {
          setMessages(prev => [...prev, {
            role: "bot",
            content: result.clarification
          }]);
        } else {
          setMessages(prev => [...prev, {
            role: "bot",
            content: result.error || "An error occurred while processing your request."
          }]);
        }
      }
    } catch (error: any) {
      console.error("Agent Chat Error:", error);
      setMessages(prev => {
        const newMessages = [...prev];
        for (let i = newMessages.length - 1; i >= 0; i--) {
          if (newMessages[i].role === "user") {
            newMessages[i] = { ...newMessages[i], isError: true };
            break;
          }
        }
        return newMessages;
      });
      showToast(error.message || "Failed to process chat", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = (content: string) => {
    setMessages(prev => prev.filter(m => !m.isError));
    sendMessage(content);
  };

  const handleEdit = (content: string) => {
    setMessages(prev => prev.filter(m => !m.isError));
    setInput(content);
  };

  const handleConfirmPlan = (params: any) => {
    const amountVal = params.amount;
    // Amounts are already in USD
    const displayAmount = amountVal;
    const displayLimit = params.hasMonthlyLimit ? params.maxMonthlyAmount : 0;

    const pendingData = {
      recipientName: params.recipientName,
      recipientAddress: params.recipientAddress === "0x1234567890123456789012345678901234567890" ? "" : params.recipientAddress,
      recipientPhone: params.recipientPhone || "",
      amount: amountVal,
      displayAmount,
      displayMaxMonthly: displayLimit,
      frequency: params.frequency,
      startDate: params.startDate,
      hasMonthlyLimit: params.hasMonthlyLimit,
      maxMonthlyAmount: params.maxMonthlyAmount,
      currency: "USDm",
    };

    localStorage.setItem("sendease_pending_remittance", JSON.stringify(pendingData));

    if (!pendingData.recipientAddress) {
      // If address was placeholder, redirect to New Remittance form page to enter address
      showToast("Please verify the details and fill the Celo address", "success");
      router.push("/create");
    } else {
      router.push("/create/review");
    }
  };

  const suggestions = [
    "Kirim 10 USDm ke Ana tiap tanggal 5",
    "Jadwalkan 50 USDm ke Bob tiap bulan",
    "Berapa remitansi aktif saya?",
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-12rem)] relative">
      {/* Chat Messages */}
      <div className="flex-grow space-y-4 pb-36 px-1">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center border border-border ${msg.role === "user" ? "bg-primary text-white" : "bg-primary/5 text-[#09955F]"}`}>
                {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} gap-2`}>
                <div className={`p-3 rounded-xl text-sm ${msg.role === "user"
                  ? "bg-primary text-white rounded-tr-none"
                  : "bg-white border border-border rounded-tl-none text-foreground w-full max-w-sm"
                  }`}>
                  {msg.role === "bot" ? (
                    <div className="space-y-3">
                      <div>{stripMarkdown(msg.content)}</div>
                      {msg.actionData && msg.actionData.type === "create_schedule" && (
                        <div className="mt-2 p-4 bg-primary/[0.02] border border-primary/10 rounded-xl space-y-3 text-xs">
                          <p className="font-bold text-slate-800 flex items-center gap-1">📋 Planned Schedule Remittance</p>
                          <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-700">
                            <span className="text-slate-500">Recipient Name:</span>
                            <span className="font-semibold">{msg.actionData.recipientName}</span>

                            <span className="text-slate-500">Amount:</span>
                            <span className="font-semibold text-primary">
                              ${formatAmount(msg.actionData.amount)}
                            </span>

                            <span className="text-slate-500">Frequency:</span>
                            <span className="font-semibold flex items-center gap-0.5">
                              <Calendar size={11} className="text-slate-400" />
                              {msg.actionData.frequency}
                            </span>

                            <span className="text-slate-500">Start Date:</span>
                            <span className="font-semibold">{msg.actionData.startDate}</span>

                            {msg.actionData.hasMonthlyLimit && (
                              <>
                                <span className="text-slate-500">Monthly Limit:</span>
                                <span className="font-semibold text-slate-800 flex items-center gap-0.5">
                                  <Settings size={11} className="text-slate-400" />
                                  ${formatAmount(msg.actionData.maxMonthlyAmount)}
                                </span>
                              </>
                            )}
                          </div>
                          <button
                            onClick={() => handleConfirmPlan(msg.actionData)}
                            className="w-full bg-[#09955F] text-white hover:bg-[#07824F] font-bold py-2 rounded-xl text-xs active:scale-[0.98] transition-transform"
                          >
                            Configure & Review Schedule
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.role === "user" && msg.isError && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRetry(msg.content)}
                      className="bg-white border border-[#E4E4E7] text-[#09955F] hover:bg-primary/5 hover:border-primary/30 font-bold px-2 py-1 rounded-lg text-xs active:scale-95 transition-transform flex items-center gap-1"
                    >
                      <RefreshCw className="h-2.5 w-2.5" />
                      Retry
                    </button>
                    <button
                      onClick={() => handleEdit(msg.content)}
                      className="bg-white border border-[#E4E4E7] text-slate-500 hover:bg-primary/5 hover:border-primary/30 font-bold px-2 py-1 rounded-lg text-xs active:scale-95 transition-transform flex items-center gap-1"
                    >
                      <Pencil className="h-2.5 w-2.5" />
                      Edit
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] flex gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/5 text-[#09955F] flex-shrink-0 flex items-center justify-center border border-border shadow-none">
                <Bot className="h-4 w-4 animate-pulse" />
              </div>
              <div className="p-3 rounded-xl text-sm bg-white border border-border shadow-none rounded-tl-none text-foreground flex items-center gap-1 min-h-10">
                <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"></span>
              </div>
            </div>
          </div>
        )}
        {/* Suggestions */}
        {messages.length === 1 && (
          <div className="mt-8">
            <p className="text-xs font-bold text-muted-foreground tracking-wider mb-2 px-1">Try asking:</p>
            <div className="flex flex-col gap-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s)}
                  className="w-fit text-xs bg-white border border-border px-4 py-3 rounded-xl hover:border-primary hover:bg-primary/5 hover:text-[#09955F] transition-all text-left font-medium text-slate-700"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed above BottomNav */}
      <div className="fixed bottom-20 left-0 right-0 z-20 bg-white/95 backdrop-blur-md pt-3 pb-4 px-4 border-t border-x border-slate-200 max-w-md mx-auto">
        {/* Bordered container wrapping New + input */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
          {/* Chat History Badges row */}
          <div className="flex items-center gap-2 px-3 pt-3 pb-2 overflow-x-auto no-scrollbar border-b border-slate-100">
            <div className="flex-shrink-0">
              <button
                onClick={startNewChat}
                className={`h-8 px-3 text-xs font-bold tracking-wider rounded-lg border border-primary/20 text-primary bg-primary/5 flex items-center gap-1 active:scale-95 transition-transform ${!currentSessionId ? 'ring-1 ring-primary/30' : ''}`}
              >
                <Plus className="h-3 w-3" />
                New
              </button>
            </div>

            <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className={`flex-shrink-0 flex items-center rounded-lg border transition-all overflow-hidden ${currentSessionId === s.id
                    ? "bg-primary border-primary text-white"
                    : "bg-white border-border text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <button
                    onClick={() => loadSession(s)}
                    className="px-3 py-1.5 text-xs font-medium whitespace-nowrap flex items-center gap-1.5"
                  >
                    <MessageSquare className="h-3 w-3" />
                    {s.title}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(s.id);
                    }}
                    className={`px-2 py-1.5 flex items-center justify-center border-l transition-all ${currentSessionId === s.id
                      ? "text-white/70 border-white/20 hover:text-white hover:bg-red-700"
                      : "text-muted-foreground border-border hover:text-red-600 hover:bg-red-50"
                      }`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {sessions.length === 0 && (
                <div className="text-xs text-muted-foreground italic px-2 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  No previous chats
                </div>
              )}
            </div>
          </div>

          {/* Input field row */}
          <div className="relative px-2 pt-2">
            <textarea
              placeholder="Type your prompt..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              className="w-full pr-24 pl-3 pt-3 rounded-xl bg-white shadow-none text-sm border-transparent focus:outline-none focus:ring-0 focus:border-transparent resize-none no-scrollbar"
            />
            <div className="absolute right-3 top-3 flex gap-1">
              <Button
                size="icon"
                variant={isListening ? "destructive" : "ghost"}
                className={`h-10 w-10 rounded-lg transition-all ${isListening
                  ? 'animate-pulse bg-red-100 text-red-600 hover:bg-red-200 border border-red-200 shadow-none'
                  : 'text-muted-foreground hover:bg-primary/5 hover:text-primary shadow-none'
                  }`}
                onClick={startListening}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                className="h-10 w-10 rounded-lg shadow-none bg-primary text-primary-foreground hover:bg-primary/95"
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
