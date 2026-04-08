import Text "mo:core/Text";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import List "mo:core/List";

actor {
  type Entry = {
    playerName : Text;
    score : Nat;
  };

  module Entry {
    public func compare(score1 : Entry, score2 : Entry) : Order.Order {
      Nat.compare(score2.score, score1.score);
    };
  };

  let entries = List.empty<Entry>();

  public shared ({ caller }) func submitScore(playerName : Text, score : Nat) : async () {
    if (playerName.size() == 0) { Runtime.trap("Player name cannot be empty.") };
    let newEntry = { playerName; score };
    entries.add(newEntry);
    let sortedEntries = entries.values().toArray().sort();
    entries.clear();
    let length = sortedEntries.size();
    let size = if (length > 10) { 10 } else { length };
    let sliced = sortedEntries.sliceToArray(0, size);
    entries.addAll(sliced.values());
  };

  public query ({ caller }) func getLeaderboard() : async [Entry] {
    entries.toArray();
  };
};
