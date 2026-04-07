import Map "mo:core/Map";
import List "mo:core/List";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Types "../types/duels";

module {

  // ── Constants ──────────────────────────────────────────────────────────────
  public let EXPIRY_NS          : Int = 86_400_000_000_000; // 24 hours in nanoseconds
  public let BANK_PRINCIPAL_TXT : Text = "ns32b-r2krl-rtozy-ymo6u-7pujx-gr7ff-uhyup-fsm3v-t5ul7-5lj3b-mqe";
  public let BITTYICP_CANISTER  : Text = "qroj6-lyaaa-aaaam-qeqta-cai";
  public let TRANSFER_FEE       : Nat  = 1; // 1 base-unit fee per transfer

  /// Valid wager amounts in $BITTYICP token units (not e8s).
  /// Actual transfer amounts are multiplied by 100_000_000 in the mixin.
  public let VALID_AMOUNTS : [Nat] = [100, 500, 1_000, 5_000, 10_000, 50_000];

  // ── State helpers ──────────────────────────────────────────────────────────

  /// Return true iff the given amount is one of the allowed wager levels
  public func isValidAmount(amount : Nat) : Bool {
    for (a in VALID_AMOUNTS.vals()) {
      if (a == amount) { return true };
    };
    false;
  };

  /// Generate a deterministic duel ID from challenger principal, amount, and timestamp
  public func makeDuelId(challenger : Principal, amount : Nat, now : Int) : Text {
    challenger.toText() # "#" # amount.toText() # "#" # now.toText();
  };

  /// Build the activeDuelAmounts map key for a given principal + amount.
  public func activeKey(p : Principal, amount : Nat) : Text {
    p.toText() # "#" # amount.toText();
  };

  // ── Challenge lifecycle ────────────────────────────────────────────────────

  /// Create a new open duel challenge (funds already escrowed by caller before this).
  /// Returns the new duel ID.
  public func createChallenge(
    duels             : Map.Map<Text, Types.DuelChallenge>,
    activeDuelAmounts : Map.Map<Text, Bool>,
    caller            : Principal,
    callerNickname    : Text,
    amount            : Nat,
    now               : Int,
  ) : Text {
    let id = makeDuelId(caller, amount, now);
    let challenge : Types.DuelChallenge = {
      id;
      challenger       = caller;
      challengerNickname = callerNickname;
      opponent         = null;
      opponentNickname = null;
      amount;
      state            = #open;
      challengerScore  = null;
      opponentScore    = null;
      winnerId         = null;
      createdAt        = now;
      matchedAt        = null;
      expiresAt        = now + EXPIRY_NS;
    };
    duels.add(id, challenge);
    activeDuelAmounts.add(activeKey(caller, amount), true);
    id;
  };

  /// Accept an open challenge (funds already escrowed by opponent before this).
  public func acceptChallenge(
    duels             : Map.Map<Text, Types.DuelChallenge>,
    activeDuelAmounts : Map.Map<Text, Bool>,
    caller            : Principal,
    callerNickname    : Text,
    duelId            : Text,
    now               : Int,
  ) : () {
    let challenge = switch (duels.get(duelId)) {
      case (null) { Runtime.trap("Duel not found") };
      case (?d)   { d };
    };
    switch (challenge.state) {
      case (#open) {};
      case (_)     { Runtime.trap("Duel is not open for acceptance") };
    };
    if (Principal.equal(challenge.challenger, caller)) {
      Runtime.trap("Cannot accept your own duel");
    };
    let updated : Types.DuelChallenge = {
      challenge with
      opponent         = ?caller;
      opponentNickname = ?callerNickname;
      state            = #matched;
      matchedAt        = ?now;
      expiresAt        = now + EXPIRY_NS;
    };
    duels.add(duelId, updated);
    activeDuelAmounts.add(activeKey(caller, challenge.amount), true);
  };

  /// Record a score for a duel participant.
  /// Returns the resolved DuelChallenge if both players have now played.
  public func recordPlay(
    duels             : Map.Map<Text, Types.DuelChallenge>,
    duelHistory       : Map.Map<Text, Types.DuelChallenge>,
    activeDuelAmounts : Map.Map<Text, Bool>,
    caller            : Principal,
    duelId            : Text,
    score             : Nat,
    _now              : Int,
  ) : ?Types.DuelChallenge {
    let challenge = switch (duels.get(duelId)) {
      case (null) { Runtime.trap("Duel not found") };
      case (?d)   { d };
    };
    // Determine role
    let isChallenger = Principal.equal(challenge.challenger, caller);
    let isOpponent   = switch (challenge.opponent) {
      case (?op) { Principal.equal(op, caller) };
      case (null) { false };
    };
    if (not isChallenger and not isOpponent) {
      Runtime.trap("You are not a participant in this duel");
    };
    // Validate state
    switch (challenge.state) {
      case (#matched) {};
      case (#challenger_played) {
        // Only opponent can play now
        if (isChallenger) { Runtime.trap("You have already played") };
      };
      case (#opponent_played) {
        // Only challenger can play now
        if (isOpponent) { Runtime.trap("You have already played") };
      };
      case (_) { Runtime.trap("Duel is not in a playable state") };
    };

    // Record the score and transition state
    let updatedChallenge : Types.DuelChallenge = if (isChallenger) {
      { challenge with challengerScore = ?score; state = #challenger_played };
    } else {
      { challenge with opponentScore = ?score; state = #opponent_played };
    };

    // Check if both have played (after this update)
    let challengerScoreFinal = if (isChallenger) { ?score } else { challenge.challengerScore };
    let opponentScoreFinal   = if (isOpponent)   { ?score } else { challenge.opponentScore };

    switch (challengerScoreFinal, opponentScoreFinal) {
      case (?cScore, ?oScore) {
        // Both played — resolve
        let opponent = switch (challenge.opponent) {
          case (?op) { op };
          case (null) { Runtime.trap("Opponent missing in matched duel") };
        };
        // Challenger wins ties
        let winnerId = if (cScore >= oScore) { challenge.challenger } else { opponent };
        let resolved : Types.DuelChallenge = {
          updatedChallenge with
          challengerScore = ?cScore;
          opponentScore   = ?oScore;
          state           = #resolved;
          winnerId        = ?winnerId;
        };
        duels.remove(duelId);
        duelHistory.add(duelId, resolved);
        // Remove from active amounts for both participants
        activeDuelAmounts.remove(activeKey(challenge.challenger, challenge.amount));
        activeDuelAmounts.remove(activeKey(opponent, challenge.amount));
        ?resolved;
      };
      case (_, _) {
        // Only one has played — update the duel in place
        duels.add(duelId, updatedChallenge);
        null;
      };
    };
  };

  // ── Expiry ────────────────────────────────────────────────────────────────

  /// Collect all duels that have passed their expiresAt and are still active.
  /// Marks them as #expired and moves them to history.
  /// Returns the list of expired challenges (so the mixin can refund tokens).
  public func expireStale(
    duels             : Map.Map<Text, Types.DuelChallenge>,
    duelHistory       : Map.Map<Text, Types.DuelChallenge>,
    activeDuelAmounts : Map.Map<Text, Bool>,
    now               : Int,
  ) : [Types.DuelChallenge] {
    // Collect all entries first to avoid mutation-during-iteration issues
    let allEntries = duels.entries().toArray();
    let expired = List.empty<Types.DuelChallenge>();

    for ((id, d) in allEntries.vals()) {
      if (now > d.expiresAt) {
        switch (d.state) {
          case (#resolved) {}; // already done, should not be in active duels map
          case (#expired)  {}; // already done
          case (_) {
            let expiredChallenge : Types.DuelChallenge = { d with state = #expired };
            expired.add(expiredChallenge);
            duels.remove(id);
            duelHistory.add(id, expiredChallenge);
            // Release active amount slots
            activeDuelAmounts.remove(activeKey(d.challenger, d.amount));
            switch (d.opponent) {
              case (?op) { activeDuelAmounts.remove(activeKey(op, d.amount)) };
              case (null) {};
            };
          };
        };
      };
    };
    expired.toArray();
  };

  // ── Queries ───────────────────────────────────────────────────────────────

  /// Return all open (#open state) duels, excluding the caller's own challenges.
  public func getOpenDuels(
    duels  : Map.Map<Text, Types.DuelChallenge>,
    caller : Principal,
  ) : [Types.DuelResult] {
    duels.values()
      .filter(func(d) {
        switch (d.state) {
          case (#open) { not Principal.equal(d.challenger, caller) };
          case (_)     { false };
        };
      })
      .map<Types.DuelChallenge, Types.DuelResult>(func(d) { toResult(d, caller) })
      .toArray();
  };

  /// Return active duels the caller is a participant in.
  public func getMyDuels(
    duels       : Map.Map<Text, Types.DuelChallenge>,
    duelHistory : Map.Map<Text, Types.DuelChallenge>,
    caller      : Principal,
  ) : [Types.DuelResult] {
    let active = duels.values()
      .filter(func(d) { isParticipant(d, caller) })
      .map(func(d) { toResult(d, caller) })
      .toArray();
    let history = duelHistory.values()
      .filter(func(d) { isParticipant(d, caller) })
      .map(func(d) { toResult(d, caller) })
      .toArray();
    active.concat(history);
  };

  /// Return all resolved/expired duels visible to anyone (caller used for score masking).
  public func getDuelHistory(
    duelHistory : Map.Map<Text, Types.DuelChallenge>,
    caller      : Principal,
  ) : [Types.DuelResult] {
    duelHistory.values()
      .map<Types.DuelChallenge, Types.DuelResult>(func(d) { toResult(d, caller) })
      .toArray();
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  /// True if the caller is the challenger or opponent in a duel.
  func isParticipant(d : Types.DuelChallenge, caller : Principal) : Bool {
    if (Principal.equal(d.challenger, caller)) { return true };
    switch (d.opponent) {
      case (?op) { Principal.equal(op, caller) };
      case (null) { false };
    };
  };

  /// Convert a DuelChallenge to a DuelResult, applying score-visibility rules.
  /// Scores are hidden until both have played (i.e. state is not #resolved or #expired).
  public func toResult(challenge : Types.DuelChallenge, caller : Principal) : Types.DuelResult {
    let bothPlayed = switch (challenge.state) {
      case (#resolved) { true };
      case (#expired)  { true };
      case (_)         { false };
    };
    let callerIsChallenger = Principal.equal(challenge.challenger, caller);
    let callerIsOpponent   = switch (challenge.opponent) {
      case (?op) { Principal.equal(op, caller) };
      case (null) { false };
    };
    // Score visibility: own score always visible; opponent's score visible only when both played
    let visibleChallengerScore = if (bothPlayed or callerIsChallenger) {
      challenge.challengerScore;
    } else { null };
    let visibleOpponentScore = if (bothPlayed or callerIsOpponent) {
      challenge.opponentScore;
    } else { null };
    {
      id                 = challenge.id;
      challenger         = challenge.challenger;
      challengerNickname = challenge.challengerNickname;
      opponent           = challenge.opponent;
      opponentNickname   = challenge.opponentNickname;
      amount             = challenge.amount;
      state              = challenge.state;
      challengerScore    = visibleChallengerScore;
      opponentScore      = visibleOpponentScore;
      winnerId           = challenge.winnerId;
      createdAt          = challenge.createdAt;
      matchedAt          = challenge.matchedAt;
      expiresAt          = challenge.expiresAt;
    };
  };

};
