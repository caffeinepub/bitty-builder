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
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User Profile Type
  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Must be signed in to save profile");
    };
    userProfiles.add(caller, profile);
  };

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

  // Admin-forced weekly scores keyed by nickname
  // These are ALWAYS shown in the weekly leaderboard regardless of timestamp.
  // They are cleared on adminResetWeeklyLeaderboard and removed when the player submits their own score.
  let adminForcedWeeklyScores = Map.empty<Text, ScoreEntry>();

  // ── Stable backing storage ──────────────────────────────────────────────────
  stable var stableNicknameEntries       : [(Principal, Text)]        = [];
  stable var stableReverseNicknameEntries: [(Text, Principal)]        = [];
  stable var stablePlayerScoreEntries    : [(Principal, ScoreEntry)]  = [];
  stable var stableWeeklyScoreEntries    : [(Principal, ScoreEntry)]  = [];
  stable var stableForcedScoreEntries    : [(Text, ScoreEntry)]       = [];
  stable var stableChatEntries           : [(Nat, ChatMessage)]       = [];
  stable var stableNextMessageId         : Nat                        = 0;
  stable var stableNextScoreId           : Nat                        = 0;

  system func preupgrade() {
    stableNicknameEntries        := nicknameMap.entries().toArray();
    stableReverseNicknameEntries := reverseNicknameMap.entries().toArray();
    stablePlayerScoreEntries     := playerScores.entries().toArray();
    stableWeeklyScoreEntries     := weeklyPlayerScores.entries().toArray();
    stableForcedScoreEntries     := adminForcedWeeklyScores.entries().toArray();
    stableChatEntries            := chatMessages.entries().toArray();
    stableNextMessageId          := nextMessageId;
    stableNextScoreId            := nextScoreId;
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
  // If the nickname is registered, the score goes into the regular weekly and all-time maps.
  // If not registered, it goes into adminForcedWeeklyScores which is ALWAYS shown in the weekly leaderboard.
  public shared func adminInsertScore(password : Text, nickname : Text, score : Nat) : async () {
    if (password != ADMIN_CHAT_PASSWORD) {
      Runtime.trap("Wrong password");
    };
    let currentTime = Time.now();
    // Use tournamentStart + 1s as timestamp so the entry is definitely within the tournament window
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
        // Nickname not registered -- force into the always-visible forced scores map
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
    if (nicknameMap.containsKey(caller)) {
      Runtime.trap("Nickname already registered for caller");
    };
    switch (reverseNicknameMap.get(nickname)) {
      case (null) {};
      case (?_) { Runtime.trap("Nickname already taken") };
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
    // If this player had an admin-forced entry, remove it now that they have a real score
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

    // Build a set of nicknames already covered by regular scores
    let coveredNicknames = Map.empty<Text, Bool>();
    for (entry in regularArr.vals()) {
      coveredNicknames.add(entry.nickname, true);
    };

    // Admin-forced entries are ALWAYS included regardless of timestamp.
    // They represent manually inserted scores that should always be visible
    // until the next admin reset.
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

    buildLeaderboard(combined.vals());
  };

  public query ({ caller }) func getAllTimeLeaderboard() : async [LeaderboardEntry] {
    let allScores = playerScores.values();
    buildLeaderboard(allScores);
  };

  func getCurrentWeekStart(timestamp : Int) : Int {
    let secondsPerWeek = 604800;
    let nanosecondsPerSecond = 1_000_000_000;
    let secondsPerWeekNs = secondsPerWeek * nanosecondsPerSecond;
    let weeksElapsed = timestamp / secondsPerWeekNs;
    weeksElapsed * secondsPerWeekNs;
  };

  func buildLeaderboard(scores : Iter.Iter<ScoreEntry>) : [LeaderboardEntry] {
    let sortedScores = scores.sort();
    let arrayOfScores = sortedScores.toArray();
    let topEntries = arrayOfScores.sliceToArray(0, Int.abs(Nat.min(50, arrayOfScores.size())));
    Array.tabulate(
      topEntries.size(),
      func(i) {
        let entry = topEntries[i];
        {
          rank = i + 1;
          nickname = entry.nickname;
          score = entry.score;
          timestamp = entry.timestamp;
          principal = entry.principal;
        };
      },
    );
  };

  public query ({ caller }) func getAllScores() : async [ScoreEntry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all scores");
    };
    playerScores.values().toArray();
  };

  public query ({ caller }) func getTopScores() : async [ScoreEntry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view top scores");
    };
    let allScores = playerScores.values().toArray();
    allScores.sliceToArray(0, 10);
  };

  public query ({ caller }) func getTopScoresForUser(user : Principal) : async [ScoreEntry] {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own scores");
    };
    switch (playerScores.get(user)) {
      case (null) { [] };
      case (?entry) { [entry] };
    };
  };
};
