import Principal "mo:core/Principal";

module {

  public type DuelState = {
    #open;               // Posted, waiting for opponent
    #matched;            // Opponent accepted, neither has played yet
    #challenger_played;  // Challenger submitted score, waiting for opponent
    #opponent_played;    // Opponent submitted score, waiting for challenger
    #resolved;           // Both played, winner determined and paid out
    #expired;            // Timed out before both parties completed
  };

  /// Internal storage record for a duel challenge
  public type DuelChallenge = {
    id          : Text;
    challenger  : Principal;
    challengerNickname : Text;
    opponent    : ?Principal;
    opponentNickname   : ?Text;
    amount      : Nat;               // $BITTYICP in base units (e8s)
    state       : DuelState;
    challengerScore : ?Nat;
    opponentScore   : ?Nat;
    winnerId    : ?Principal;
    createdAt   : Int;
    matchedAt   : ?Int;
    expiresAt   : Int;               // nanoseconds timestamp
  };

  /// Public query response — hides opponent score until both have played
  public type DuelResult = {
    id          : Text;
    challenger  : Principal;
    challengerNickname : Text;
    opponent    : ?Principal;
    opponentNickname   : ?Text;
    amount      : Nat;
    state       : DuelState;
    /// Challenger score: always visible to challenger; hidden to others until resolved/expired
    challengerScore : ?Nat;
    /// Opponent score: always visible to opponent; hidden to others until resolved/expired
    opponentScore   : ?Nat;
    winnerId    : ?Principal;
    createdAt   : Int;
    matchedAt   : ?Int;
    expiresAt   : Int;
  };

};
