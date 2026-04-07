import { Actor, HttpAgent } from "@icp-sdk/core/agent";
import type { Identity } from "@icp-sdk/core/agent";
import type { IDL } from "@icp-sdk/core/candid";
import type { Principal } from "@icp-sdk/core/principal";

const IC_HOST = "https://icp-api.io";

export const ICP_LEDGER_CANISTER_ID = "ryjl3-tyaaa-aaaaa-aaaba-cai";
export const BITTYICP_CANISTER_ID = "qroj6-lyaaa-aaaam-qeqta-cai";

// ICRC-1 IDL factory
function icrc1IdlFactory({ IDL: _IDL }: { IDL: typeof IDL }) {
  const Account = _IDL.Record({
    owner: _IDL.Principal,
    subaccount: _IDL.Opt(_IDL.Vec(_IDL.Nat8)),
  });
  const TransferArg = _IDL.Record({
    to: Account,
    fee: _IDL.Opt(_IDL.Nat),
    memo: _IDL.Opt(_IDL.Vec(_IDL.Nat8)),
    from_subaccount: _IDL.Opt(_IDL.Vec(_IDL.Nat8)),
    created_at_time: _IDL.Opt(_IDL.Nat64),
    amount: _IDL.Nat,
  });
  const TransferError = _IDL.Variant({
    BadFee: _IDL.Record({ expected_fee: _IDL.Nat }),
    BadBurn: _IDL.Record({ min_burn_amount: _IDL.Nat }),
    InsufficientFunds: _IDL.Record({ balance: _IDL.Nat }),
    TooOld: _IDL.Null,
    CreatedInFuture: _IDL.Record({ ledger_time: _IDL.Nat64 }),
    TemporarilyUnavailable: _IDL.Null,
    Duplicate: _IDL.Record({ duplicate_of: _IDL.Nat }),
    GenericError: _IDL.Record({ error_code: _IDL.Nat, message: _IDL.Text }),
  });
  const TransferResult = _IDL.Variant({
    Ok: _IDL.Nat,
    Err: TransferError,
  });
  const ApproveArg = _IDL.Record({
    from_subaccount: _IDL.Opt(_IDL.Vec(_IDL.Nat8)),
    spender: Account,
    amount: _IDL.Nat,
    expected_allowance: _IDL.Opt(_IDL.Nat),
    expires_at: _IDL.Opt(_IDL.Nat64),
    fee: _IDL.Opt(_IDL.Nat),
    memo: _IDL.Opt(_IDL.Vec(_IDL.Nat8)),
    created_at_time: _IDL.Opt(_IDL.Nat64),
  });
  const ApproveError = _IDL.Variant({
    BadFee: _IDL.Record({ expected_fee: _IDL.Nat }),
    InsufficientFunds: _IDL.Record({ balance: _IDL.Nat }),
    AllowanceChanged: _IDL.Record({ current_allowance: _IDL.Nat }),
    Expired: _IDL.Record({ ledger_time: _IDL.Nat64 }),
    TooOld: _IDL.Null,
    CreatedInFuture: _IDL.Record({ ledger_time: _IDL.Nat64 }),
    Duplicate: _IDL.Record({ duplicate_of: _IDL.Nat }),
    TemporarilyUnavailable: _IDL.Null,
    GenericError: _IDL.Record({ error_code: _IDL.Nat, message: _IDL.Text }),
  });
  const ApproveResult = _IDL.Variant({
    Ok: _IDL.Nat,
    Err: ApproveError,
  });
  return _IDL.Service({
    icrc1_balance_of: _IDL.Func([Account], [_IDL.Nat], ["query"]),
    icrc1_transfer: _IDL.Func([TransferArg], [TransferResult], []),
    icrc1_decimals: _IDL.Func([], [_IDL.Nat8], ["query"]),
    icrc1_fee: _IDL.Func([], [_IDL.Nat], ["query"]),
    icrc1_symbol: _IDL.Func([], [_IDL.Text], ["query"]),
    icrc2_approve: _IDL.Func([ApproveArg], [ApproveResult], []),
  });
}

export interface Icrc1Account {
  owner: Principal;
  subaccount: [] | [Uint8Array];
}

export interface Icrc1TransferArg {
  to: Icrc1Account;
  fee: [] | [bigint];
  memo: [] | [Uint8Array];
  from_subaccount: [] | [Uint8Array];
  created_at_time: [] | [bigint];
  amount: bigint;
}

export interface Icrc2ApproveArg {
  from_subaccount: [] | [Uint8Array];
  spender: Icrc1Account;
  amount: bigint;
  expected_allowance: [] | [bigint];
  expires_at: [] | [bigint];
  fee: [] | [bigint];
  memo: [] | [Uint8Array];
  created_at_time: [] | [bigint];
}

export interface Icrc1Actor {
  icrc1_balance_of(account: Icrc1Account): Promise<bigint>;
  icrc1_transfer(
    args: Icrc1TransferArg,
  ): Promise<{ Ok: bigint } | { Err: Record<string, unknown> }>;
  icrc1_decimals(): Promise<number>;
  icrc1_fee(): Promise<bigint>;
  icrc1_symbol(): Promise<string>;
  icrc2_approve(
    args: Icrc2ApproveArg,
  ): Promise<{ Ok: bigint } | { Err: Record<string, unknown> }>;
}

export function createIcrc1Actor(
  canisterId: string,
  identity?: Identity,
): Icrc1Actor {
  const agent = new HttpAgent({ host: IC_HOST, identity });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Actor.createActor(icrc1IdlFactory as any, {
    agent,
    canisterId,
  }) as unknown as Icrc1Actor;
}

/**
 * Approve the backend canister as a spender for BITTYICP tokens.
 * This must be called before postDuelChallenge or acceptDuelChallenge.
 * @param backendCanisterId - The backend canister principal (spender)
 * @param amount - Amount of BITTYICP tokens to approve (in raw bigint with 8 decimals)
 * @param identity - The signed-in user's identity
 */
export async function approveIcrc2ForDuel(
  backendCanisterId: string,
  amount: bigint,
  identity: Identity,
): Promise<{ ok: true } | { err: string }> {
  try {
    const actor = createIcrc1Actor(BITTYICP_CANISTER_ID, identity);
    // Get the fee first
    const fee = await actor.icrc1_fee();
    // Approve amount + fee buffer
    const approveAmount = amount + fee;

    const { Principal } = await import("@icp-sdk/core/principal");
    const spenderPrincipal = Principal.fromText(backendCanisterId);

    const result = await actor.icrc2_approve({
      from_subaccount: [],
      spender: { owner: spenderPrincipal, subaccount: [] },
      amount: approveAmount,
      expected_allowance: [],
      expires_at: [],
      fee: [],
      memo: [],
      created_at_time: [],
    });

    if ("Ok" in result) return { ok: true };
    const errVariant = result.Err as Record<string, unknown>;
    const errKey = Object.keys(errVariant)[0] ?? "Unknown";
    return { err: `Approve failed: ${errKey}` };
  } catch (e) {
    return { err: e instanceof Error ? e.message : "Approve failed" };
  }
}

// SHA-224 implementation for ICP Account ID derivation
function rotr32(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

function sha224(data: Uint8Array): Uint8Array {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  // SHA-224 initial hash values
  const h = new Int32Array([
    0xc1059ed8,
    0x367cd507,
    0x3070dd17,
    0xf70e5939,
    0xffc00b31 | 0,
    0x68581511,
    0x64f98fa7,
    0xbefa4fa4 | 0,
  ]);

  const len = data.length;
  const padLen = ((len + 9 + 63) >>> 6) << 6;
  const padded = new Uint8Array(padLen);
  padded.set(data);
  padded[len] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padLen - 4, (len * 8) >>> 0, false);
  dv.setUint32(padLen - 8, Math.floor((len * 8) / 0x100000000), false);

  const w = new Int32Array(64);
  for (let i = 0; i < padLen; i += 64) {
    for (let j = 0; j < 16; j++) w[j] = dv.getInt32(i + j * 4, false);
    for (let j = 16; j < 64; j++) {
      const s0 =
        rotr32(w[j - 15], 7) ^ rotr32(w[j - 15], 18) ^ (w[j - 15] >>> 3);
      const s1 =
        rotr32(w[j - 2], 17) ^ rotr32(w[j - 2], 19) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
    }
    let a = h[0];
    let b = h[1];
    let c = h[2];
    let d = h[3];
    let e = h[4];
    let f = h[5];
    let g = h[6];
    let hh = h[7];
    for (let j = 0; j < 64; j++) {
      const S1 = rotr32(e, 6) ^ rotr32(e, 11) ^ rotr32(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[j] + w[j]) | 0;
      const S0 = rotr32(a, 2) ^ rotr32(a, 13) ^ rotr32(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    h[0] = (h[0] + a) | 0;
    h[1] = (h[1] + b) | 0;
    h[2] = (h[2] + c) | 0;
    h[3] = (h[3] + d) | 0;
    h[4] = (h[4] + e) | 0;
    h[5] = (h[5] + f) | 0;
    h[6] = (h[6] + g) | 0;
    h[7] = (h[7] + hh) | 0;
  }
  // SHA-224: first 7 words = 28 bytes
  const out = new Uint8Array(28);
  const outDv = new DataView(out.buffer);
  for (let i = 0; i < 7; i++) outDv.setInt32(i * 4, h[i], false);
  return out;
}

function crc32(data: Uint8Array): Uint8Array {
  let c = -1;
  for (const b of data) {
    c ^= b;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  c ^= -1;
  return new Uint8Array([
    (c >>> 24) & 0xff,
    (c >>> 16) & 0xff,
    (c >>> 8) & 0xff,
    c & 0xff,
  ]);
}

/**
 * Derives the ICP Account ID (legacy 32-byte hex) from a principal.
 * This is the standard account identifier used by NNS, exchanges, etc.
 */
export function principalToAccountId(principal: Principal): string {
  const sep = new TextEncoder().encode("\x0aaccount-id");
  const pBytes = principal.toUint8Array();
  const subaccount = new Uint8Array(32);
  const payload = new Uint8Array(
    sep.length + pBytes.length + subaccount.length,
  );
  payload.set(sep, 0);
  payload.set(pBytes, sep.length);
  payload.set(subaccount, sep.length + pBytes.length);
  const hash = sha224(payload);
  const checksum = crc32(hash);
  const result = new Uint8Array(32);
  result.set(checksum, 0);
  result.set(hash, 4);
  return Array.from(result)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Formats a token amount from raw bigint to a human-readable string.
 * decimals: usually 8 for ICP and BITTYICP
 */
export function formatTokenAmount(raw: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = raw / divisor;
  const fraction = raw % divisor;
  if (fraction === 0n) return whole.toString();
  const fracStr = fraction
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");
  return `${whole}.${fracStr}`;
}

/**
 * Parses a human-readable token amount string to raw bigint.
 * Returns null if invalid.
 */
export function parseTokenAmount(
  value: string,
  decimals: number,
): bigint | null {
  try {
    const trimmed = value.trim();
    if (!trimmed || !/^\d+(\.\d+)?$/.test(trimmed)) return null;
    const [wholeStr, fracStr = ""] = trimmed.split(".");
    const whole = BigInt(wholeStr);
    const fracPadded = fracStr.slice(0, decimals).padEnd(decimals, "0");
    const frac = BigInt(fracPadded);
    return whole * 10n ** BigInt(decimals) + frac;
  } catch {
    return null;
  }
}
