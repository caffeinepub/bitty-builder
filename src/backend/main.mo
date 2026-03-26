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

  // User Profile Functions
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
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
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
  };

  // Nickname registration
  let nicknameMap = Map.empty<Principal, Text>();
  let reverseNicknameMap = Map.empty<Text, Principal>();

  // Legacy stable variables retained for upgrade compatibility (not used for new logic)
  let scoreEntries = Map.empty<Nat, ScoreEntry>();
  var nextScoreId = 0;

  // All-time score storage - one entry per player (keyed by Principal)
  let playerScores = Map.empty<Principal, ScoreEntry>();

  // Weekly score storage - one entry per player, resets each week
  let weeklyPlayerScores = Map.empty<Principal, ScoreEntry>();

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

  // Nickname Registration
  public shared ({ caller }) func registerNickname(nickname : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can register nicknames");
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

  // Change Nickname - carries over existing score
  public shared ({ caller }) func changeNickname(newNickname : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can change nicknames");
    };

    // New nickname must not be taken by someone else
    switch (reverseNicknameMap.get(newNickname)) {
      case (null) {};
      case (?owner) {
        if (owner != caller) {
          Runtime.trap("Nickname already taken");
        };
        // Already using this nickname, no-op
        return;
      };
    };

    // Remove old nickname from reverse map
    switch (nicknameMap.get(caller)) {
      case (null) {};
      case (?oldNickname) {
        reverseNicknameMap.remove(oldNickname);
      };
    };

    // Register new nickname
    nicknameMap.add(caller, newNickname);
    reverseNicknameMap.add(newNickname, caller);

    // Update nickname on all-time score entry
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

    // Update nickname on weekly score entry
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

  // Score Submission
  public shared ({ caller }) func submitScore(score : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can submit scores");
    };

    let nickname = switch (nicknameMap.get(caller)) {
      case (null) { Runtime.trap("Nickname not registered") };
      case (?name) { name };
    };

    let currentTime = Time.now();
    let weekStart = getCurrentWeekStart(currentTime);

    // Update all-time: only if new score is higher
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

    // Update weekly: always update if it's a new week or score is higher this week
    switch (weeklyPlayerScores.get(caller)) {
      case (?existing) {
        let existingWeekStart = getCurrentWeekStart(existing.timestamp);
        if (existingWeekStart < weekStart or score > existing.score) {
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
  };

  public query ({ caller }) func getWeeklyLeaderboard() : async [LeaderboardEntry] {
    let currentTime = Time.now();
    let weekStart = getCurrentWeekStart(currentTime);

    let filteredScores = weeklyPlayerScores.values().filter(
      func(entry) {
        getCurrentWeekStart(entry.timestamp) == weekStart;
      }
    );

    buildLeaderboard(filteredScores);
  };

  public query ({ caller }) func getAllTimeLeaderboard() : async [LeaderboardEntry] {
    let allScores = playerScores.values();
    buildLeaderboard(allScores);
  };

  // Helper Functions
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
    let topEntries = arrayOfScores.sliceToArray(0, Int.abs(Nat.min(10, arrayOfScores.size())));

    Array.tabulate(
      topEntries.size(),
      func(i) {
        let entry = topEntries[i];
        {
          rank = i + 1;
          nickname = entry.nickname;
          score = entry.score;
          timestamp = entry.timestamp;
        };
      },
    );
  };

  // Admin-only debug functions
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
