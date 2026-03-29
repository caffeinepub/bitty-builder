import { Principal } from "@icp-sdk/core/principal";
import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  BITTYICP_CANISTER_ID,
  ICP_LEDGER_CANISTER_ID,
  createIcrc1Actor,
  formatTokenAmount,
  parseTokenAmount,
  principalToAccountId,
} from "../utils/icrc1";

interface Props {
  onClose: () => void;
}

type SendToken = "ICP" | "BITTYICP";

export default function WalletModal({ onClose }: Props) {
  const { identity } = useInternetIdentity();
  const principal = identity?.getPrincipal();
  const principalText = principal?.toText() ?? "";
  const accountId = principal ? principalToAccountId(principal) : "";

  const [icpBalance, setIcpBalance] = useState<bigint | null>(null);
  const [bittyBalance, setBittyBalance] = useState<bigint | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const [sendToken, setSendToken] = useState<SendToken>("ICP");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const [copiedPrincipal, setCopiedPrincipal] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedReceivePrincipal, setCopiedReceivePrincipal] = useState(false);
  const [copiedReceiveAccount, setCopiedReceiveAccount] = useState(false);

  const fetchBalances = useCallback(async () => {
    if (!principal) return;
    setBalanceLoading(true);
    try {
      const [icpActor, bittyActor] = [
        createIcrc1Actor(ICP_LEDGER_CANISTER_ID),
        createIcrc1Actor(BITTYICP_CANISTER_ID),
      ];
      const [icp, bitty] = await Promise.all([
        icpActor.icrc1_balance_of({ owner: principal, subaccount: [] }),
        bittyActor.icrc1_balance_of({ owner: principal, subaccount: [] }),
      ]);
      setIcpBalance(icp);
      setBittyBalance(bitty);
    } catch (_e) {
      toast.error("Failed to load balances");
    } finally {
      setBalanceLoading(false);
    }
  }, [principal]);

  useEffect(() => {
    if (principal) fetchBalances();
  }, [principal, fetchBalances]);

  const handleCopy = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text).then(() => {
      setter(true);
      setTimeout(() => setter(false), 2000);
    });
  };

  const handleSend = async () => {
    setSendError("");
    if (!identity) return;
    let recipientPrincipal: Principal;
    try {
      recipientPrincipal = Principal.fromText(recipient.trim());
    } catch {
      setSendError("Invalid principal address");
      return;
    }
    const rawAmount = parseTokenAmount(amount, 8);
    if (rawAmount === null || rawAmount <= 0n) {
      setSendError("Invalid amount");
      return;
    }
    setSending(true);
    try {
      const canisterId =
        sendToken === "ICP" ? ICP_LEDGER_CANISTER_ID : BITTYICP_CANISTER_ID;
      const actor = createIcrc1Actor(canisterId, identity);
      const result = await actor.icrc1_transfer({
        to: { owner: recipientPrincipal, subaccount: [] },
        amount: rawAmount,
        fee: [],
        memo: [],
        from_subaccount: [],
        created_at_time: [],
      });
      if ("Ok" in result) {
        toast.success(`Sent ${amount} $${sendToken} successfully!`);
        setRecipient("");
        setAmount("");
        fetchBalances();
      } else {
        const errKey = Object.keys(result.Err)[0] ?? "Unknown error";
        setSendError(`Transfer failed: ${errKey}`);
      }
    } catch (e) {
      setSendError(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <dialog
      open
      className="fixed inset-0 z-50 flex items-center justify-center w-full h-full max-w-none max-h-none p-0 m-0 border-0 block"
      style={{ background: "rgba(6,6,15,0.92)" }}
      aria-label="Wallet"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      onClose={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative w-full max-w-md mx-4 rounded-sm overflow-y-auto"
        style={{
          background: "#0a0a1a",
          border: "2px solid #AAFF00",
          boxShadow:
            "0 0 40px rgba(170,255,0,0.25), 0 0 80px rgba(0,221,255,0.1)",
          maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "rgba(170,255,0,0.3)" }}
        >
          <h2
            className="font-black text-xl tracking-widest uppercase"
            style={{
              background: "linear-gradient(135deg, #AAFF00, #00DDFF, #FF00AA)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 8px rgba(170,255,0,0.5))",
            }}
          >
            💰 YOUR WALLET
          </h2>
          <button
            type="button"
            onClick={onClose}
            data-ocid="wallet.close_button"
            className="text-2xl font-bold leading-none"
            style={{
              color: "#FF00AA",
              background: "transparent",
              border: "none",
            }}
            aria-label="Close wallet"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-6">
          {/* Identity section */}
          <section>
            <p
              className="text-xs tracking-widest uppercase font-bold mb-2"
              style={{ color: "#00DDFF" }}
            >
              Identity
            </p>
            <div className="space-y-2">
              <InfoBox
                label="PRINCIPAL ID"
                value={principalText}
                copied={copiedPrincipal}
                onCopy={() => handleCopy(principalText, setCopiedPrincipal)}
                ocid="wallet.principal.button"
                color="#00DDFF"
              />
              <InfoBox
                label="ACCOUNT ID (LEGACY)"
                value={accountId}
                copied={copiedAccount}
                onCopy={() => handleCopy(accountId, setCopiedAccount)}
                ocid="wallet.account.button"
                color="#AAFF00"
              />
            </div>
          </section>

          {/* Balances */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <p
                className="text-xs tracking-widest uppercase font-bold"
                style={{ color: "#FF00AA" }}
              >
                Balances
              </p>
              <button
                type="button"
                onClick={fetchBalances}
                data-ocid="wallet.balance.button"
                className="text-base"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
                aria-label="Refresh balances"
              >
                🔄
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <BalanceCard
                symbol="$ICP"
                value={balanceLoading ? null : icpBalance}
                color="#00DDFF"
              />
              <BalanceCard
                symbol="$BITTYICP"
                value={balanceLoading ? null : bittyBalance}
                color="#AAFF00"
              />
            </div>
          </section>

          {/* Send */}
          <section>
            <p
              className="text-xs tracking-widest uppercase font-bold mb-3"
              style={{ color: "#FF00AA" }}
            >
              Send Tokens
            </p>
            <div className="flex gap-2 mb-3">
              {(["ICP", "BITTYICP"] as SendToken[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setSendToken(t);
                    setSendError("");
                  }}
                  data-ocid={`wallet.send_${t.toLowerCase()}.toggle`}
                  className="flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-sm transition-all"
                  style={{
                    background:
                      sendToken === t
                        ? t === "ICP"
                          ? "#00DDFF"
                          : "#AAFF00"
                        : "transparent",
                    border: `2px solid ${t === "ICP" ? "#00DDFF" : "#AAFF00"}`,
                    color:
                      sendToken === t
                        ? "#06060f"
                        : t === "ICP"
                          ? "#00DDFF"
                          : "#AAFF00",
                  }}
                >
                  Send ${t}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Recipient principal (xxxxx-xxxxx-...)"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                data-ocid="wallet.recipient.input"
                className="w-full px-3 py-2 text-xs font-mono rounded-sm"
                style={{
                  background: "rgba(0,0,0,0.5)",
                  border: "1px solid rgba(170,255,0,0.4)",
                  color: "#e0e0e0",
                  outline: "none",
                }}
              />
              <input
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                data-ocid="wallet.amount.input"
                className="w-full px-3 py-2 text-sm font-mono rounded-sm"
                style={{
                  background: "rgba(0,0,0,0.5)",
                  border: "1px solid rgba(170,255,0,0.4)",
                  color: "#e0e0e0",
                  outline: "none",
                }}
              />
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                Network fee: ~0.0001 ${sendToken}
              </p>
              {sendError && (
                <p
                  className="text-xs font-mono"
                  data-ocid="wallet.send.error_state"
                  style={{ color: "#FF4444" }}
                >
                  {sendError}
                </p>
              )}
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || !recipient || !amount}
                data-ocid="wallet.send.submit_button"
                className="w-full py-2 text-sm font-black uppercase tracking-wider rounded-sm transition-all disabled:opacity-50"
                style={{
                  background: sending
                    ? "rgba(170,255,0,0.2)"
                    : "rgba(170,255,0,0.15)",
                  border: "2px solid #AAFF00",
                  color: "#AAFF00",
                  boxShadow: "0 0 15px rgba(170,255,0,0.2)",
                }}
              >
                {sending ? "Sending..." : `Send $${sendToken}`}
              </button>
            </div>
          </section>

          {/* Receive */}
          <section>
            <p
              className="text-xs tracking-widest uppercase font-bold mb-2"
              style={{ color: "#FF00AA" }}
            >
              Receive
            </p>
            <p
              className="text-xs mb-2"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Share your address to receive tokens
            </p>
            <div className="space-y-2">
              <InfoBox
                label="PRINCIPAL ID"
                value={principalText}
                copied={copiedReceivePrincipal}
                onCopy={() =>
                  handleCopy(principalText, setCopiedReceivePrincipal)
                }
                ocid="wallet.receive_principal.button"
                color="#00DDFF"
              />
              <InfoBox
                label="ACCOUNT ID (LEGACY)"
                value={accountId}
                copied={copiedReceiveAccount}
                onCopy={() => handleCopy(accountId, setCopiedReceiveAccount)}
                ocid="wallet.receive_account.button"
                color="#AAFF00"
              />
            </div>
          </section>
        </div>
      </motion.div>
    </dialog>
  );
}

function InfoBox({
  label,
  value,
  copied,
  onCopy,
  ocid,
  color,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  ocid: string;
  color: string;
}) {
  return (
    <div
      className="rounded-sm p-3"
      style={{
        background: "rgba(0,0,0,0.4)",
        border: `1px solid ${color}40`,
        boxShadow: `0 0 10px ${color}15`,
      }}
    >
      <p
        className="text-xs tracking-wider mb-1"
        style={{ color: `${color}aa` }}
      >
        {label}
      </p>
      <div className="flex items-start gap-2">
        <p
          className="font-mono text-xs break-all flex-1"
          style={{ color: "rgba(255,255,255,0.7)", wordBreak: "break-all" }}
        >
          {value}
        </p>
        <button
          type="button"
          onClick={onCopy}
          data-ocid={ocid}
          className="shrink-0 px-2 py-0.5 text-xs font-bold rounded-sm transition-all"
          style={{
            background: copied ? color : "transparent",
            border: `1px solid ${color}`,
            color: copied ? "#06060f" : color,
            whiteSpace: "nowrap",
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function BalanceCard({
  symbol,
  value,
  color,
}: {
  symbol: string;
  value: bigint | null;
  color: string;
}) {
  return (
    <div
      className="rounded-sm p-3 text-center"
      style={{
        background: "rgba(0,0,0,0.4)",
        border: `1px solid ${color}50`,
        boxShadow: `0 0 15px ${color}15`,
      }}
    >
      <p
        className="text-xs tracking-wider mb-1"
        style={{ color: `${color}aa` }}
      >
        {symbol}
      </p>
      {value === null ? (
        <div
          className="h-6 rounded-sm mx-auto"
          style={{
            background: "rgba(255,255,255,0.08)",
            width: "80%",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      ) : (
        <p
          className="font-mono text-base font-black"
          style={{ color, textShadow: `0 0 10px ${color}` }}
        >
          {formatTokenAmount(value, 8)}
        </p>
      )}
    </div>
  );
}
