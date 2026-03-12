import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "motion/react";
import { useState } from "react";
import type { LeaderboardEntry } from "../backend";
import {
  useAllTimeLeaderboard,
  useWeeklyLeaderboard,
} from "../hooks/useQueries";

interface Props {
  onPlay: () => void;
  onHome: () => void;
}

const SKELETON_KEYS = ["sk-a", "sk-b", "sk-c", "sk-d", "sk-e", "sk-f"];

function formatDate(ts: bigint) {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatScore(score: bigint) {
  return Number(score).toLocaleString();
}

function RankBadge({ rank }: { rank: number }) {
  const medals: Record<number, string> = {
    1: "🥇",
    2: "🥈",
    3: "🥉",
  };
  if (medals[rank]) {
    return <span className="text-lg">{medals[rank]}</span>;
  }
  return (
    <span className="font-mono text-sm text-muted-foreground">#{rank}</span>
  );
}

function LeaderboardTable({
  entries,
  isLoading,
  emptyMessage,
}: {
  entries: LeaderboardEntry[];
  isLoading: boolean;
  emptyMessage: string;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2 mt-2" data-ocid="leaderboard.loading_state">
        {SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className="h-10 w-full rounded-sm" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div
        className="text-center py-12 font-mono text-sm text-muted-foreground"
        data-ocid="leaderboard.empty_state"
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <Table data-ocid="leaderboard.table">
      <TableHeader>
        <TableRow className="border-border/30 hover:bg-transparent">
          <TableHead className="font-mono text-xs text-muted-foreground w-12">
            Rank
          </TableHead>
          <TableHead className="font-mono text-xs text-muted-foreground">
            Player
          </TableHead>
          <TableHead className="font-mono text-xs text-muted-foreground text-right">
            Score
          </TableHead>
          <TableHead className="font-mono text-xs text-muted-foreground text-right hidden sm:table-cell">
            Date
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.slice(0, 10).map((entry, i) => (
          <motion.tr
            key={`${entry.nickname}-${i}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            data-ocid={`leaderboard.item.${i + 1}`}
            className="border-border/20 hover:bg-muted/20"
          >
            <TableCell className="py-2">
              <RankBadge rank={Number(entry.rank)} />
            </TableCell>
            <TableCell className="py-2">
              <span
                className="font-mono text-sm font-semibold"
                style={{
                  color:
                    i === 0
                      ? "#FFE500"
                      : i === 1
                        ? "#C0C0C0"
                        : i === 2
                          ? "#CD7F32"
                          : "inherit",
                }}
              >
                {entry.nickname}
              </span>
            </TableCell>
            <TableCell className="py-2 text-right">
              <span className="font-mono text-sm" style={{ color: "#AAFF00" }}>
                {formatScore(entry.score)}
              </span>
            </TableCell>
            <TableCell className="py-2 text-right hidden sm:table-cell">
              <span className="font-mono text-xs text-muted-foreground">
                {formatDate(entry.timestamp)}
              </span>
            </TableCell>
          </motion.tr>
        ))}
      </TableBody>
    </Table>
  );
}

export default function LeaderboardScreen({ onPlay, onHome }: Props) {
  const [activeTab, setActiveTab] = useState("weekly");
  const weekly = useWeeklyLeaderboard();
  const allTime = useAllTimeLeaderboard();

  return (
    <div
      className="min-h-screen flex flex-col items-center px-4 py-6"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,0,170,0.07) 0%, transparent 60%), #06060f",
      }}
    >
      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={onHome}
          className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back
        </button>
        <h1
          className="font-display font-black text-2xl"
          style={{
            background: "linear-gradient(135deg, #FF00AA, #AAFF00)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          🏆 LEADERBOARD
        </h1>
        <button
          type="button"
          onClick={onPlay}
          data-ocid="game.play_button"
          className="btn-arcade px-3 py-1.5 text-xs font-display font-black rounded-sm"
          style={{
            background: "linear-gradient(135deg, #AAFF00, #00DDFF)",
            color: "#06060f",
          }}
        >
          PLAY
        </button>
      </div>

      {/* Tabs */}
      <div className="w-full max-w-md">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList
            className="w-full rounded-sm bg-muted/20"
            data-ocid="leaderboard.tab"
          >
            <TabsTrigger
              value="weekly"
              className="flex-1 font-mono text-xs data-[state=active]:bg-transparent data-[state=active]:text-[#FF00AA]"
            >
              This Week
            </TabsTrigger>
            <TabsTrigger
              value="alltime"
              className="flex-1 font-mono text-xs data-[state=active]:bg-transparent data-[state=active]:text-[#AAFF00]"
            >
              All Time
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="mt-2">
            <p className="text-center text-[10px] font-mono text-muted-foreground mb-2">
              Resets every Monday
            </p>
            <LeaderboardTable
              entries={weekly.data ?? []}
              isLoading={weekly.isLoading}
              emptyMessage="No scores this week yet. Be the first!"
            />
          </TabsContent>

          <TabsContent value="alltime" className="mt-2">
            <LeaderboardTable
              entries={allTime.data ?? []}
              isLoading={allTime.isLoading}
              emptyMessage="No scores yet. Be the first champion!"
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="mt-auto pt-8 text-center text-xs text-muted-foreground font-mono">
        © {new Date().getFullYear()}.{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          Built with ♥ using caffeine.ai
        </a>
      </footer>
    </div>
  );
}
