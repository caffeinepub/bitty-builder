import Map "mo:core/Map";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";

import DuelTypes "types/duels";
import DuelsApiMixin "mixins/duels-api";


actor self {

  // Data Structures
  type ScoreEntry = {
    principal : Principal;
    nickname : Text;
    score : Nat;
    timestamp : Int;
  };

  type LeaderboardEntry = {
    rank : Nat;
    nickname : Text;
    score : Nat;
    timestamp : Int;
    principal : Principal;
    shareCount : Nat;
  };

  // Chat
  public type ChatMessage = {
    id : Nat;
    author : Principal;
    nickname : Text;
    text : Text;
    timestamp : Int;
  };

  let chatMessages = Map.empty<Nat, ChatMessage>();
  var nextMessageId = 0;
  let MAX_CHAT_MESSAGES = 25;
  let ADMIN_CHAT_PASSWORD = "bittybittywhatwhat";

  // Nickname registration
  let nicknameMap = Map.empty<Principal, Text>();
  let reverseNicknameMap = Map.empty<Text, Principal>();

  let scoreEntries = Map.empty<Nat, ScoreEntry>();
  var nextScoreId = 0;

  let playerScores = Map.empty<Principal, ScoreEntry>();
  let weeklyPlayerScores = Map.empty<Principal, ScoreEntry>();

  // Share counts
  let weeklyShareCounts = Map.empty<Principal, Nat>();
  let allTimeShareCounts = Map.empty<Principal, Nat>();

  // Admin-forced weekly scores keyed by nickname
  let adminForcedWeeklyScores = Map.empty<Text, ScoreEntry>();

  // ── Duels state ──────────────────────────────────────────────────────────
  let duels             = Map.empty<Text, DuelTypes.DuelChallenge>();
  let duelHistory       = Map.empty<Text, DuelTypes.DuelChallenge>();
  let activeDuelAmounts = Map.empty<Text, Bool>();

  include DuelsApiMixin(duels, duelHistory, activeDuelAmounts, nicknameMap, Principal.fromActor(self));

  // ── Stable backing storage ──────────────────────────────────────────────────
  stable var stableNicknameEntries       : [(Principal, Text)]                          = [];
  stable var stableReverseNicknameEntries: [(Text, Principal)]                          = [];
  stable var stablePlayerScoreEntries    : [(Principal, ScoreEntry)]                    = [];
  stable var stableWeeklyScoreEntries    : [(Principal, ScoreEntry)]                    = [];
  stable var stableForcedScoreEntries    : [(Text, ScoreEntry)]                         = [];
  stable var stableChatEntries           : [(Nat, ChatMessage)]                         = [];
  stable var stableNextMessageId         : Nat                                          = 0;
  stable var stableNextScoreId           : Nat                                          = 0;
  stable var stableWeeklyShareEntries    : [(Principal, Nat)]                           = [];
  stable var stableAllTimeShareEntries   : [(Principal, Nat)]                           = [];
  stable var stableDuelEntries           : [(Text, DuelTypes.DuelChallenge)]            = [];
  stable var stableDuelHistoryEntries    : [(Text, DuelTypes.DuelChallenge)]            = [];
  stable var stableUserActiveDuelAmounts : [(Text, Bool)]                               = [];

  system func preupgrade() {
    stableNicknameEntries        := nicknameMap.entries().toArray();
    stableReverseNicknameEntries := reverseNicknameMap.entries().toArray();
    stablePlayerScoreEntries     := playerScores.entries().toArray();
    stableWeeklyScoreEntries     := weeklyPlayerScores.entries().toArray();
    stableForcedScoreEntries     := adminForcedWeeklyScores.entries().toArray();
    stableChatEntries            := chatMessages.entries().toArray();
    stableNextMessageId          := nextMessageId;
    stableNextScoreId            := nextScoreId;
    stableWeeklyShareEntries     := weeklyShareCounts.entries().toArray();
    stableAllTimeShareEntries    := allTimeShareCounts.entries().toArray();
    stableDuelEntries            := duels.entries().toArray();
    stableDuelHistoryEntries     := duelHistory.entries().toArray();
    stableUserActiveDuelAmounts  := activeDuelAmounts.entries().toArray();
  };

  system func postupgrade() {
    for ((k, v) in stableNicknameEntries.vals())        { nicknameMap.add(k, v) };
    for ((k, v) in stableReverseNicknameEntries.vals()) { reverseNicknameMap.add(k, v) };
    for ((k, v) in stablePlayerScoreEntries.vals())     { playerScores.add(k, v) };
    for ((k, v) in stableWeeklyScoreEntries.vals())     { weeklyPlayerScores.add(k, v) };
    for ((k, v) in stableForcedScoreEntries.vals())     { adminForcedWeeklyScores.add(k, v) };
    for ((k, v) in stableChatEntries.vals())            { chatMessages.add(k, v) };
    nextMessageId := stableNextMessageId;
    nextScoreId   := stableNextScoreId;
    for ((k, v) in stableWeeklyShareEntries.vals())     { weeklyShareCounts.add(k, v) };
    for ((k, v) in stableAllTimeShareEntries.vals())    { allTimeShareCounts.add(k, v) };
    for ((k, v) in stableDuelEntries.vals())            { duels.add(k, v) };
    for ((k, v) in stableDuelHistoryEntries.vals())     { duelHistory.add(k, v) };
    for ((k, v) in stableUserActiveDuelAmounts.vals())  { activeDuelAmounts.add(k, v) };
  };
  // ───────────────────────────────────────────────────────────────────────────

  module ScoreEntry {
    public func compare(entry1 : ScoreEntry, entry2 : ScoreEntry) : Order.Order {
      Nat.compare(entry2.score, entry1.score);
    };
  };

  module LeaderboardEntry {
    public func compare(entry1 : LeaderboardEntry, entry2 : LeaderboardEntry) : Order.Order {
      Nat.compare(entry2.score, entry1.score);
    };
  };

  stable var DEPLOY_WEEKLY_RESET : Int = 1_774_821_976_000_000_000;
  stable var tournamentStart     : Int = 1_774_821_976_000_000_000; // 2026-03-28T22:06:16Z
  stable var tournamentNextReset : Int = 1_775_336_400_000_000_000; // Apr 4 2026 21:00 UTC

  func getCurrentWeeklyPeriodStart(currentTime : Int) : Int {
    if (currentTime >= tournamentNextReset) {
      getCurrentWeekStart(currentTime);
    } else if (currentTime >= tournamentStart) {
      tournamentStart;
    } else {
      getCurrentWeekStart(currentTime);
    };
  };

  public shared ({ caller }) func sendChatMessage(text : Text) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Must be signed in to chat");
    };
    let nickname = switch (nicknameMap.get(caller)) {
      case (null) { "Player" };
      case (?name) { name };
    };
    let id = nextMessageId;
    nextMessageId += 1;
    chatMessages.add(id, {
      id;
      author = caller;
      nickname;
      text;
      timestamp = Time.now();
    });
    let allIds = chatMessages.keys().toArray();
    if (allIds.size() > MAX_CHAT_MESSAGES) {
      let sorted = allIds.sort();
      let toDelete : Int = allIds.size() - MAX_CHAT_MESSAGES;
      var i = 0;
      label pruneLoop while (i < toDelete) {
        chatMessages.remove(sorted[i]);
        i += 1;
      };
    };
  };

  public query func getChatMessages() : async [ChatMessage] {
    let all = chatMessages.values().toArray();
    let sorted = all.sort(func(a : ChatMessage, b : ChatMessage) : Order.Order {
      Int.compare(a.timestamp, b.timestamp);
    });
    sorted;
  };

  public shared ({ caller }) func deleteOwnChatMessage(id : Nat) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Must be signed in");
    };
    switch (chatMessages.get(id)) {
      case (null) { Runtime.trap("Message not found") };
      case (?msg) {
        if (msg.author != caller) {
          Runtime.trap("Not your message");
        };
        chatMessages.remove(id);
      };
    };
  };

  public shared ({ caller }) func adminDeleteChatMessage(id : Nat, password : Text) : async () {
    if (password != ADMIN_CHAT_PASSWORD) {
      Runtime.trap("Wrong password");
    };
    chatMessages.remove(id);
  };

  // Record a share to X (increments weekly and all-time counts)
  public shared ({ caller }) func recordShare() : async () {
    if (caller.isAnonymous()) {
      return; // silently ignore anonymous shares
    };
    let currentWeekly = switch (weeklyShareCounts.get(caller)) {
      case (null) { 0 };
      case (?n) { n };
    };
    weeklyShareCounts.add(caller, currentWeekly + 1);
    let currentAllTime = switch (allTimeShareCounts.get(caller)) {
      case (null) { 0 };
      case (?n) { n };
    };
    allTimeShareCounts.add(caller, currentAllTime + 1);
  };

  // Admin: manually reset the weekly leaderboard
  public shared func adminResetWeeklyLeaderboard(password : Text) : async () {
    if (password != ADMIN_CHAT_PASSWORD) {
      Runtime.trap("Wrong password");
    };
    let keys = weeklyPlayerScores.keys().toArray();
    for (k in keys.vals()) {
      weeklyPlayerScores.remove(k);
    };
    let forcedKeys = adminForcedWeeklyScores.keys().toArray();
    for (k in forcedKeys.vals()) {
      adminForcedWeeklyScores.remove(k);
    };
    // Clear weekly share counts
    let shareKeys = weeklyShareCounts.keys().toArray();
    for (k in shareKeys.vals()) {
      weeklyShareCounts.remove(k);
    };
    tournamentStart := Time.now();
  };

  // Admin: update the next weekly reset timestamp (nanoseconds)
  public shared func adminSetWeeklyResetTime(password : Text, newTimestampNs : Int) : async () {
    if (password != ADMIN_CHAT_PASSWORD) {
      Runtime.trap("Wrong password");
    };
    tournamentNextReset := newTimestampNs;
  };

  // Admin: explicitly set the tournament start boundary (nanoseconds)
  public shared func adminSetTournamentStart(password : Text, newTimestampNs : Int) : async () {
    if (password != ADMIN_CHAT_PASSWORD) {
      Runtime.trap("Wrong password");
    };
    tournamentStart := newTimestampNs;
  };

  // Admin: insert a score by nickname.
  public shared func adminInsertScore(password : Text, nickname : Text, score : Nat) : async () {
    if (password != ADMIN_CHAT_PASSWORD) {
      Runtime.trap("Wrong password");
    };
    let currentTime = Time.now();
    let entryTimestamp = tournamentStart + 1_000_000_000;
    switch (reverseNicknameMap.get(nickname)) {
      case (?principal) {
        let entry : ScoreEntry = {
          principal;
          nickname;
          score;
          timestamp = currentTime;
        };
        weeklyPlayerScores.add(principal, entry);
        switch (playerScores.get(principal)) {
          case (?existing) {
            if (score > existing.score) {
              playerScores.add(principal, entry);
            };
          };
          case (null) {
            playerScores.add(principal, entry);
          };
        };
      };
      case (null) {
        let entry : ScoreEntry = {
          principal = Principal.fromText("2vxsx-fae");
          nickname;
          score;
          timestamp = entryTimestamp;
        };
        adminForcedWeeklyScores.add(nickname, entry);
      };
    };
  };

  public shared ({ caller }) func registerNickname(nickname : Text) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Must be signed in to register a nickname");
    };
    // Check if caller already has a different nickname registered
    switch (nicknameMap.get(caller)) {
      case (?existing) {
        if (existing != nickname) {
          Runtime.trap("Nickname already registered for caller");
        };
        // Same nickname already registered -- idempotent, just return
        return;
      };
      case (null) {};
    };
    // Check if the nickname is taken by someone else
    switch (reverseNicknameMap.get(nickname)) {
      case (null) {};
      case (?owner) {
        if (owner != caller) {
          Runtime.trap("Nickname already taken");
        };
        // Owner is caller but nicknameMap was missing the entry -- self-heal
        nicknameMap.add(caller, nickname);
        return;
      };
    };
    nicknameMap.add(caller, nickname);
    reverseNicknameMap.add(nickname, caller);
  };

  public shared ({ caller }) func changeNickname(newNickname : Text) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Must be signed in to change nickname");
    };
    switch (reverseNicknameMap.get(newNickname)) {
      case (null) {};
      case (?owner) {
        if (owner != caller) {
          Runtime.trap("Nickname already taken");
        };
        return;
      };
    };
    switch (nicknameMap.get(caller)) {
      case (null) {};
      case (?oldNickname) {
        reverseNicknameMap.remove(oldNickname);
      };
    };
    nicknameMap.add(caller, newNickname);
    reverseNicknameMap.add(newNickname, caller);
    switch (playerScores.get(caller)) {
      case (null) {};
      case (?existing) {
        playerScores.add(caller, {
          principal = existing.principal;
          nickname = newNickname;
          score = existing.score;
          timestamp = existing.timestamp;
        });
      };
    };
    switch (weeklyPlayerScores.get(caller)) {
      case (null) {};
      case (?existing) {
        weeklyPlayerScores.add(caller, {
          principal = existing.principal;
          nickname = newNickname;
          score = existing.score;
          timestamp = existing.timestamp;
        });
      };
    };
  };

  public query ({ caller }) func getMyNickname() : async ?Text {
    nicknameMap.get(caller);
  };

  public query ({ caller }) func isNicknameAvailable(nickname : Text) : async Bool {
    switch (reverseNicknameMap.get(nickname)) {
      case (null) { true };
      case (?owner) { owner == caller };
    };
  };

  public shared ({ caller }) func submitScore(score : Nat) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Must be signed in to submit scores");
    };
    let nickname = switch (nicknameMap.get(caller)) {
      case (null) { Runtime.trap("Nickname not registered") };
      case (?name) { name };
    };
    let currentTime = Time.now();
    let currentPeriodStart = getCurrentWeeklyPeriodStart(currentTime);
    switch (playerScores.get(caller)) {
      case (?existing) {
        if (score > existing.score) {
          playerScores.add(caller, {
            principal = caller;
            nickname;
            score;
            timestamp = currentTime;
          });
        };
      };
      case (null) {
        playerScores.add(caller, {
          principal = caller;
          nickname;
          score;
          timestamp = currentTime;
        });
      };
    };
    switch (weeklyPlayerScores.get(caller)) {
      case (?existing) {
        let existingPeriodStart = getCurrentWeeklyPeriodStart(existing.timestamp);
        if (existingPeriodStart < currentPeriodStart or score > existing.score) {
          weeklyPlayerScores.add(caller, {
            principal = caller;
            nickname;
            score;
            timestamp = currentTime;
          });
        };
      };
      case (null) {
        weeklyPlayerScores.add(caller, {
          principal = caller;
          nickname;
          score;
          timestamp = currentTime;
        });
      };
    };
    adminForcedWeeklyScores.remove(nickname);
  };

  public query ({ caller }) func getWeeklyLeaderboard() : async [LeaderboardEntry] {
    let currentTime = Time.now();
    let currentPeriodStart = getCurrentWeeklyPeriodStart(currentTime);

    let regularArr = weeklyPlayerScores.values().filter(
      func(entry) {
        getCurrentWeeklyPeriodStart(entry.timestamp) == currentPeriodStart;
      }
    ).toArray();

    let coveredNicknames = Map.empty<Text, Bool>();
    for (entry in regularArr.vals()) {
      coveredNicknames.add(entry.nickname, true);
    };

    let forcedArr = adminForcedWeeklyScores.values().filter(
      func(entry) {
        not coveredNicknames.containsKey(entry.nickname);
      }
    ).toArray();

    let n1 = regularArr.size();
    let n2 = forcedArr.size();
    let combined = Array.tabulate(n1 + n2, func(i) {
      if (i < n1) { regularArr[i] } else { forcedArr[i - n1] };
    });

    buildLeaderboardWithShares(combined.vals(), weeklyShareCounts);
  };

  public query ({ caller }) func getAllTimeLeaderboard() : async [LeaderboardEntry] {
    let allScores = playerScores.values();
    buildLeaderboardWithShares(allScores, allTimeShareCounts);
  };

  func getCurrentWeekStart(timestamp : Int) : Int {
    let secondsPerWeek = 604800;
    let nanosecondsPerSecond = 1_000_000_000;
    let secondsPerWeekNs = secondsPerWeek * nanosecondsPerSecond;
    let weeksElapsed = timestamp / secondsPerWeekNs;
    weeksElapsed * secondsPerWeekNs;
  };

  func buildLeaderboard(scores : Iter.Iter<ScoreEntry>) : [LeaderboardEntry] {
    buildLeaderboardWithShares(scores, Map.empty<Principal, Nat>());
  };

  func buildLeaderboardWithShares(scores : Iter.Iter<ScoreEntry>, shareCounts : Map.Map<Principal, Nat>) : [LeaderboardEntry] {
    let sortedScores = scores.sort();
    let arrayOfScores = sortedScores.toArray();
    let topEntries = arrayOfScores.sliceToArray(0, Int.abs(Nat.min(200, arrayOfScores.size())));
    Array.tabulate(
      topEntries.size(),
      func(i) {
        let entry = topEntries[i];
        let sc = switch (shareCounts.get(entry.principal)) {
          case (null) { 0 };
          case (?n) { n };
        };
        {
          rank = i + 1;
          nickname = entry.nickname;
          score = entry.score;
          timestamp = entry.timestamp;
          principal = entry.principal;
          shareCount = sc;
        };
      },
    );
  };

  public query ({ caller }) func getAllScores() : async [ScoreEntry] {
    playerScores.values().toArray();
  };

  public query ({ caller }) func getTopScores() : async [ScoreEntry] {
    let allScores = playerScores.values().toArray();
    allScores.sliceToArray(0, 10);
  };

  public query ({ caller }) func getTopScoresForUser(user : Principal) : async [ScoreEntry] {
    switch (playerScores.get(user)) {
      case (null) { [] };
      case (?entry) { [entry] };
    };
  };

  // ICRC-1 inter-canister calls for wallet balances
  type ICRC1WalletAccount = { owner : Principal; subaccount : ?Blob };
  type ICRC1Token = actor {
    icrc1_balance_of : (ICRC1Account) -> async Nat;
  };

  public func getIcpBalance(owner : Principal) : async Nat {
    let token : ICRC1Token = actor("ryjl3-tyaaa-aaaaa-aaaba-cai");
    await token.icrc1_balance_of(({ owner; subaccount = null } : ICRC1WalletAccount));
  };

  public func getBittyBalance(owner : Principal) : async Nat {
    let token : ICRC1Token = actor("qroj6-lyaaa-aaaam-qeqta-cai");
    await token.icrc1_balance_of(({ owner; subaccount = null } : ICRC1WalletAccount));
  };
};
