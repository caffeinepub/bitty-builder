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

  // Score storage
  let scoreEntries = Map.empty<Nat, ScoreEntry>();
  var nextScoreId = 0;

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

  public query ({ caller }) func getMyNickname() : async ?Text {
    // No authorization check - anyone including guests can check their own nickname
    nicknameMap.get(caller);
  };

  public query ({ caller }) func isNicknameAvailable(nickname : Text) : async Bool {
    // No authorization check - public function for anyone to check availability
    not reverseNicknameMap.containsKey(nickname);
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

    // Only store top 2 scores per user
    var userScoreCount = 0;
    for (entry in scoreEntries.values()) {
      if (entry.principal == caller) {
        userScoreCount += 1;
      };
    };

    if (userScoreCount >= 2) {
      // Find the lowest score and replace if new score is higher
      var lowestScoreIndex = -1;
      var lowestScore = score;

      var index = 0;
      for (entry in scoreEntries.values()) {
        if (entry.principal == caller and entry.score < lowestScore) {
          lowestScore := entry.score;
          lowestScoreIndex := index;
        };
        index += 1;
      };

      if (lowestScoreIndex < 0) {
        Runtime.trap("Already have top 2 scores");
      };
    };

    let entry : ScoreEntry = {
      principal = caller;
      nickname;
      score;
      timestamp = Time.now();
    };

    scoreEntries.add(nextScoreId, entry);
    nextScoreId += 1;
  };

  public query ({ caller }) func getWeeklyLeaderboard() : async [LeaderboardEntry] {
    // No authorization check - public leaderboard accessible to all including guests
    let currentTime = Time.now();
    let weekStart = getCurrentWeekStart(currentTime);

    // Filter scores from the current week
    let filteredScores = scoreEntries.values().filter(
      func(entry) {
        entry.timestamp >= weekStart;
      }
    );

    let sortedScores = filteredScores.sort();

    buildLeaderboard(sortedScores);
  };

  public query ({ caller }) func getAllTimeLeaderboard() : async [LeaderboardEntry] {
    // No authorization check - public leaderboard accessible to all including guests
    let allScores = scoreEntries.values();

    let sortedScores = allScores.sort();

    buildLeaderboard(sortedScores);
  };

  // Helper Functions
  func getCurrentWeekStart(timestamp : Int) : Int {
    let secondsPerWeek = 604800; // 7 days
    let nanosecondsPerSecond = 1_000_000_000;

    let secondsPerWeekNs = secondsPerWeek * nanosecondsPerSecond;

    let weeksElapsed = timestamp / secondsPerWeekNs;
    weeksElapsed * secondsPerWeekNs;
  };

  func buildLeaderboard(scores : Iter.Iter<ScoreEntry>) : [LeaderboardEntry] {
    let sortedScores = scores.sort();

    let arrayOfScores = sortedScores.toArray();

    let topEntries = arrayOfScores.sliceToArray(0, Int.abs(Nat.min(10, arrayOfScores.size())));

    let leaderboard = Array.tabulate(
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

    leaderboard;
  };

  // Admin-only debug functions
  public query ({ caller }) func getAllScores() : async [ScoreEntry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all scores");
    };
    scoreEntries.values().toArray();
  };

  public query ({ caller }) func getTopScores() : async [ScoreEntry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view top scores");
    };
    let allScores = scoreEntries.values().toArray();
    allScores.sliceToArray(0, 10);
  };

  public query ({ caller }) func getTopScoresForUser(user : Principal) : async [ScoreEntry] {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own scores");
    };

    let userScores = scoreEntries.values().filter(
      func(entry) {
        entry.principal == user;
      }
    );

    let sortedScores = userScores.sort();
    let arrayOfScores = sortedScores.toArray();
    arrayOfScores.sliceToArray(0, 2);
  };
};
