import Map "mo:core/Map";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";

import Types "../types/duels";
import DuelsLib "../lib/duels";

/// Mixin that exposes the public Duels API.
/// Injected state:
///   duels                — active duel challenges keyed by duel ID
///   duelHistory          — resolved/expired challenges keyed by duel ID
///   activeDuelAmounts    — set of "principal#amount" keys to enforce one-per-amount constraint
///   nicknameMap          — read-only reference for nickname lookup
///   selfPrincipal        — this canister's own principal (for ICRC-2 escrow target)
mixin (
  duels             : Map.Map<Text, Types.DuelChallenge>,
  duelHistory       : Map.Map<Text, Types.DuelChallenge>,
  activeDuelAmounts : Map.Map<Text, Bool>,
  nicknameMap       : Map.Map<Principal, Text>,
  selfPrincipal     : Principal,
) {

  // ── ICRC-2 / ICRC-1 actor types ───────────────────────────────────────────
  type ICRC1Account  = { owner : Principal; subaccount : ?Blob };
  type ICRC2Args     = {
    spender_subaccount : ?Blob;
    from               : ICRC1Account;
    to                 : ICRC1Account;
    amount             : Nat;
    fee                : ?Nat;
    memo               : ?Blob;
    created_at_time    : ?Nat64;
  };
  type TransferArgs  = {
    from_subaccount : ?Blob;
    to              : ICRC1Account;
    amount          : Nat;
    fee             : ?Nat;
    memo            : ?Blob;
    created_at_time : ?Nat64;
  };
  type TransferResult = { #Ok : Nat; #Err : Text };
  type BittyToken = actor {
    icrc2_transfer_from : (ICRC2Args)    -> async TransferResult;
    icrc1_transfer      : (TransferArgs) -> async TransferResult;
  };

  let bittyToken : BittyToken = actor(DuelsLib.BITTYICP_CANISTER);
  let bankPrincipal : Principal = Principal.fromText(DuelsLib.BANK_PRINCIPAL_TXT);

  // ── Internal helpers ───────────────────────────────────────────────────────

  /// e8s units for a given token amount (multiply by 1e8)
  func toE8s(amount : Nat) : Nat { amount * 100_000_000 };

  /// Escrow `amount` token-units from `from` into this canister via ICRC-2.
  /// The frontend must have called icrc2_approve(spender=selfPrincipal, amount>=amountE8s) first.
  func escrowFrom(from : Principal, amount : Nat) : async { #ok; #err : Text } {
    let amountE8s = toE8s(amount);
    let result = await bittyToken.icrc2_transfer_from({
      spender_subaccount = null;
      from               = { owner = from; subaccount = null };
      to                 = { owner = selfPrincipal; subaccount = null };
      amount             = amountE8s;
      fee                = null;
      memo               = null;
      created_at_time    = null;
    });
    switch (result) {
      case (#Ok(_))  { #ok };
      case (#Err(e)) { #err("Escrow failed: " # e) };
    };
  };

  /// Send `amount` token-units from canister to `to` via ICRC-1.
  func sendTo(to : Principal, amount : Nat) : async { #ok; #err : Text } {
    let amountE8s = toE8s(amount);
    if (amountE8s <= DuelsLib.TRANSFER_FEE) {
      return #err("Amount too small after fee");
    };
    let result = await bittyToken.icrc1_transfer({
      from_subaccount = null;
      to              = { owner = to; subaccount = null };
      amount          = amountE8s - DuelsLib.TRANSFER_FEE;
      fee             = ?DuelsLib.TRANSFER_FEE;
      memo            = null;
      created_at_time = null;
    });
    switch (result) {
      case (#Ok(_))  { #ok };
      case (#Err(e)) { #err("Transfer failed: " # e) };
    };
  };

  // ── Post a new duel challenge ───────────────────────────────────────────────
  /// Caller must have pre-approved the backend canister as an ICRC-2 spender
  /// for at least `amount * 100_000_000` tokens before calling this.
  public shared ({ caller }) func postDuelChallenge(amount : Nat) : async { #ok : Text; #err : Text } {
    if (caller.isAnonymous()) {
      return #err("Must be signed in to post a duel");
    };
    if (not DuelsLib.isValidAmount(amount)) {
      return #err("Invalid duel amount. Must be one of: 100, 500, 1000, 5000, 10000, 50000");
    };
    let amountKey = DuelsLib.activeKey(caller, amount);
    if (activeDuelAmounts.containsKey(amountKey)) {
      return #err("You already have an active duel at this amount");
    };
    let callerNickname = switch (nicknameMap.get(caller)) {
      case (null)  { return #err("You must register a nickname before dueling") };
      case (?name) { name };
    };
    let escrowResult = await escrowFrom(caller, amount);
    switch (escrowResult) {
      case (#err(e)) { return #err(e) };
      case (#ok) {};
    };
    let now = Time.now();
    let id = DuelsLib.createChallenge(duels, activeDuelAmounts, caller, callerNickname, amount, now);
    #ok(id);
  };

  // ── Accept an open duel challenge ──────────────────────────────────────────
  /// Caller must have pre-approved the backend canister as an ICRC-2 spender
  /// for at least `amount * 100_000_000` tokens before calling this.
  public shared ({ caller }) func acceptDuelChallenge(duelId : Text) : async { #ok : Text; #err : Text } {
    if (caller.isAnonymous()) {
      return #err("Must be signed in to accept a duel");
    };
    let challenge = switch (duels.get(duelId)) {
      case (null) { return #err("Duel not found") };
      case (?d)   { d };
    };
    switch (challenge.state) {
      case (#open) {};
      case (_)     { return #err("Duel is not open for acceptance") };
    };
    if (Principal.equal(challenge.challenger, caller)) {
      return #err("Cannot accept your own duel");
    };
    let amountKey = DuelsLib.activeKey(caller, challenge.amount);
    if (activeDuelAmounts.containsKey(amountKey)) {
      return #err("You already have an active duel at this amount");
    };
    let callerNickname = switch (nicknameMap.get(caller)) {
      case (null)  { return #err("You must register a nickname before dueling") };
      case (?name) { name };
    };
    let escrowResult = await escrowFrom(caller, challenge.amount);
    switch (escrowResult) {
      case (#err(e)) { return #err(e) };
      case (#ok) {};
    };
    let now = Time.now();
    DuelsLib.acceptChallenge(duels, activeDuelAmounts, caller, callerNickname, duelId, now);
    #ok("Duel accepted — play when ready!");
  };

  // ── Submit score for a duel ────────────────────────────────────────────────
  /// Once both players submit, the winner is paid 90% and 10% goes to the bank.
  public shared ({ caller }) func playDuel(duelId : Text, score : Nat) : async { #ok : Text; #err : Text } {
    if (caller.isAnonymous()) {
      return #err("Must be signed in to play a duel");
    };
    let now = Time.now();
    let maybeResolved = DuelsLib.recordPlay(duels, duelHistory, activeDuelAmounts, caller, duelId, score, now);
    switch (maybeResolved) {
      case (null) {
        #ok("Score recorded. Waiting for opponent.");
      };
      case (?resolved) {
        let pot = resolved.amount * 2;
        let winnerShare = pot * 90 / 100;
        let bankShare   = pot - winnerShare;
        let winner = switch (resolved.winnerId) {
          case (?w)   { w };
          case (null) { Runtime.trap("Resolved duel has no winner") };
        };
        let _w = await sendTo(winner, winnerShare);
        let _b = await sendTo(bankPrincipal, bankShare);
        let winnerNick = if (Principal.equal(winner, resolved.challenger)) {
          resolved.challengerNickname;
        } else {
          switch (resolved.opponentNickname) {
            case (?n)   { n };
            case (null) { "opponent" };
          };
        };
        #ok("Duel resolved! Winner: " # winnerNick # " wins " # winnerShare.toText() # " $BITTYICP");
      };
    };
  };

  // ── Queries ────────────────────────────────────────────────────────────────

  /// Return all open (#open) duel challenges visible to anyone (excludes caller's own).
  public query ({ caller }) func getOpenDuels() : async [Types.DuelResult] {
    DuelsLib.getOpenDuels(duels, caller);
  };

  /// Return duels the caller is involved in (challenger or opponent), active and history.
  public query ({ caller }) func getMyDuels() : async [Types.DuelResult] {
    DuelsLib.getMyDuels(duels, duelHistory, caller);
  };

  /// Return the resolved/expired duel history visible to all.
  public query ({ caller }) func getDuelHistory() : async [Types.DuelResult] {
    DuelsLib.getDuelHistory(duelHistory, caller);
  };

  // ── Admin / maintenance ────────────────────────────────────────────────────

  /// Expire stale duels and refund escrowed tokens to participants.
  /// Can be called by anyone as a maintenance trigger.
  public shared func expireOldDuels() : async () {
    let now = Time.now();
    let expired = DuelsLib.expireStale(duels, duelHistory, activeDuelAmounts, now);
    for (d in expired.vals()) {
      // Always refund challenger
      let _c = await sendTo(d.challenger, d.amount);
      // Refund opponent if they joined (opponent field is set means they escrowed)
      switch (d.opponent) {
        case (?op) {
          let _o = await sendTo(op, d.amount);
        };
        case (null) {};
      };
    };
  };

};
