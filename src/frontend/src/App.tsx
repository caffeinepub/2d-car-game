import GameCanvas from "@/components/GameCanvas";
import { Toaster } from "@/components/ui/sonner";
import { useLeaderboard } from "@/hooks/useQueries";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Car, Gauge, Star, Trophy, Zap } from "lucide-react";
import React, { useRef } from "react";
import type { Entry } from "./backend.d";

const queryClient = new QueryClient();

const NAV_LINKS = [
  { label: "Play", href: "#play" },
  { label: "Features", href: "#features" },
  { label: "Leaderboard", href: "#leaderboard" },
];

const FEATURES = [
  {
    id: "speed",
    icon: <Zap className="w-8 h-8 text-nitro-orange" />,
    title: "TURBO SPEED",
    desc: "Accelerate from 0 to full throttle as your car speeds up over time. Push your reflexes to the limit.",
  },
  {
    id: "dodge",
    icon: <Car className="w-8 h-8 text-nitro-orange" />,
    title: "DODGE TRAFFIC",
    desc: "Weave through oncoming vehicles with precision. One touch and it's game over — no second chances.",
  },
  {
    id: "scores",
    icon: <Trophy className="w-8 h-8 text-nitro-orange" />,
    title: "TOP SCORES",
    desc: "Compete globally on the live leaderboard. Claim your spot at the top and show who's the fastest driver.",
  },
];

function rankClass(i: number): string {
  if (i === 0) return "font-display font-bold text-base text-yellow-400";
  if (i === 1) return "font-display font-bold text-base text-gray-300";
  if (i === 2) return "font-display font-bold text-base text-amber-600";
  return "font-display font-bold text-base text-nitro-muted";
}

function LeaderboardTable() {
  const { data: entries, isLoading } = useLeaderboard();
  const display: (Entry | null)[] = isLoading
    ? Array(5).fill(null)
    : (entries ?? []).slice(0, 10);

  if (!isLoading && display.length === 0) {
    return (
      <div
        data-ocid="leaderboard.empty_state"
        className="text-center py-12 text-nitro-muted"
      >
        <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No scores yet. Be the first to race!</p>
      </div>
    );
  }

  return (
    <div data-ocid="leaderboard.table" className="w-full">
      <div className="grid grid-cols-[48px_1fr_auto] gap-0 text-xs text-nitro-muted font-semibold tracking-widest uppercase px-4 pb-3">
        <span>#</span>
        <span>PLAYER</span>
        <span>SCORE</span>
      </div>
      <div className="space-y-1.5">
        {display.map((entry, i) => (
          <div
            key={entry ? `${entry.playerName}-${i}` : `skeleton-${i}`}
            data-ocid={`leaderboard.item.${i + 1}`}
            className="grid grid-cols-[48px_1fr_auto] gap-0 items-center px-4 py-3 rounded-lg bg-background/50 border border-border/50 hover:border-nitro-orange/30 transition-colors"
          >
            {isLoading || !entry ? (
              <>
                <div className="h-5 w-6 bg-muted rounded animate-pulse" />
                <div className="h-5 w-24 bg-muted rounded animate-pulse" />
                <div className="h-5 w-16 bg-muted rounded animate-pulse" />
              </>
            ) : (
              <>
                <span className={rankClass(i)}>{i + 1}</span>
                <span className="text-nitro-text font-semibold truncate pr-4">
                  {entry.playerName}
                </span>
                <span className="font-display font-bold text-nitro-orange">
                  {Number(entry.score).toLocaleString()}
                </span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AppContent() {
  const gameRef = useRef<HTMLDivElement>(null);

  const scrollToGame = () => {
    gameRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const footerHref = `https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`;

  return (
    <div className="min-h-screen" style={{ background: "#0F1318" }}>
      {/* Header */}
      <header
        data-ocid="nav.section"
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12"
        style={{
          height: 80,
          background: "linear-gradient(135deg, #151A20 0%, #1A2030 100%)",
          borderBottom: "1px solid rgba(244,162,29,0.12)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #F4A21D, #E8820D)",
              boxShadow: "0 0 16px rgba(244,162,29,0.4)",
            }}
          >
            <Gauge
              className="w-5 h-5"
              strokeWidth={2.5}
              style={{ color: "#0F1318" }}
            />
          </div>
          <span
            className="font-display font-extrabold text-xl"
            style={{ color: "#F4A21D", letterSpacing: "0.15em" }}
          >
            NITRO RUSH
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              data-ocid="nav.link"
              className="text-nitro-muted hover:text-nitro-orange text-sm font-semibold tracking-widest uppercase transition-colors"
            >
              {link.label}
            </a>
          ))}
          <button
            type="button"
            data-ocid="nav.primary_button"
            onClick={scrollToGame}
            className="bg-nitro-orange hover:bg-amber-500 font-display font-bold text-xs px-5 py-2.5 rounded-lg uppercase tracking-wider transition-colors"
            style={{
              color: "#0F1318",
              boxShadow: "0 0 12px rgba(244,162,29,0.35)",
            }}
          >
            RACE NOW
          </button>
        </nav>
      </header>

      {/* Hero / Game Section */}
      <section
        id="play"
        ref={gameRef}
        className="flex flex-col items-center justify-center px-4"
        style={{ paddingTop: 100, paddingBottom: 60 }}
      >
        <div className="text-center mb-8">
          <p className="text-nitro-muted text-xs font-bold tracking-[0.3em] uppercase mb-2">
            Top-Down Racing
          </p>
          <h1 className="font-display font-extrabold text-4xl md:text-5xl text-nitro-text tracking-tight">
            RACE. <span style={{ color: "#F4A21D" }}>DODGE.</span> SURVIVE.
          </h1>
        </div>
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            boxShadow:
              "0 0 60px rgba(244,162,29,0.15), 0 20px 60px rgba(0,0,0,0.6)",
            border: "1px solid rgba(244,162,29,0.2)",
          }}
        >
          <GameCanvas />
        </div>
        <p className="mt-4 text-nitro-muted text-xs tracking-wider">
          Use &#8592; &#8594; Arrow Keys or A/D to steer &#x2022; P to pause
        </p>
      </section>

      {/* Features Strip */}
      <section
        id="features"
        className="px-6 md:px-12 py-16"
        style={{
          background:
            "linear-gradient(180deg, #0F1318 0%, #151A20 50%, #0F1318 100%)",
        }}
      >
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-nitro-muted text-xs font-bold tracking-[0.3em] uppercase mb-2">
            Why Play
          </p>
          <h2 className="text-center font-display font-extrabold text-2xl md:text-3xl text-nitro-text mb-12 tracking-wide">
            BUILT FOR <span style={{ color: "#F4A21D" }}>SPEED</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.id}
                data-ocid="features.card"
                className="flex flex-col items-center text-center gap-4 p-8 rounded-2xl"
                style={{
                  background: "#2A3038",
                  border: "1px solid rgba(244,162,29,0.1)",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
                }}
              >
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center"
                  style={{
                    background: "rgba(244,162,29,0.1)",
                    border: "1px solid rgba(244,162,29,0.2)",
                  }}
                >
                  {f.icon}
                </div>
                <h3 className="font-display font-extrabold text-base tracking-widest text-nitro-text">
                  {f.title}
                </h3>
                <p className="text-nitro-muted text-sm leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leaderboard */}
      <section
        id="leaderboard"
        className="px-6 md:px-12 py-16"
        style={{ background: "#0F1318" }}
      >
        <div className="max-w-2xl mx-auto">
          <div
            className="rounded-2xl p-8"
            style={{
              background: "#2A3038",
              border: "1px solid rgba(244,162,29,0.15)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
            }}
          >
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Trophy className="w-6 h-6 text-nitro-orange" />
                <h2 className="font-display font-extrabold text-2xl tracking-widest text-nitro-text">
                  GLOBAL LEADERBOARD
                </h2>
                <Trophy className="w-6 h-6 text-nitro-orange" />
              </div>
              <p className="text-nitro-muted text-sm">Top drivers worldwide</p>
            </div>
            <LeaderboardTable />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        className="px-6 md:px-12 py-16"
        style={{
          background: "linear-gradient(180deg, #0F1318 0%, #151A20 100%)",
        }}
      >
        <div className="max-w-3xl mx-auto">
          <div
            className="rounded-2xl p-12 text-center"
            style={{
              background: "linear-gradient(135deg, #2A3038 0%, #1E2530 100%)",
              border: "1px solid rgba(244,162,29,0.2)",
              boxShadow:
                "0 0 40px rgba(244,162,29,0.1), 0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className="w-5 h-5 fill-nitro-orange text-nitro-orange"
                />
              ))}
            </div>
            <h2 className="font-display font-extrabold text-3xl md:text-4xl text-nitro-text mb-3 tracking-tight">
              PLAY <span style={{ color: "#F4A21D" }}>NITRO RUSH</span> NOW!
            </h2>
            <p className="text-nitro-muted text-sm mb-8 max-w-md mx-auto">
              Jump into the driver&apos;s seat and see how long you can survive.
              Your high score is waiting.
            </p>
            <button
              type="button"
              data-ocid="cta.primary_button"
              onClick={scrollToGame}
              className="font-display font-extrabold text-lg px-12 py-5 rounded-xl uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #F4A21D, #E8820D)",
                color: "#0F1318",
                boxShadow: "0 0 30px rgba(244,162,29,0.5)",
              }}
            >
              START RACE
            </button>
            <p className="text-nitro-muted text-xs mt-4">
              Free to play &#x2022; No login required &#x2022; Instant fun
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="px-6 md:px-12"
        style={{
          background: "#0F1318",
          borderTop: "1px solid rgba(244,162,29,0.1)",
        }}
      >
        <div className="max-w-6xl mx-auto py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            {["About", "Terms", "Privacy"].map((link) => (
              <a
                key={link}
                href="#play"
                data-ocid="footer.link"
                className="text-nitro-muted hover:text-nitro-orange text-xs font-semibold uppercase tracking-wider transition-colors"
              >
                {link}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2 text-nitro-muted text-xs">
            <span>&#169; {new Date().getFullYear()}. Built with</span>
            <span className="text-red-400">&#9829;</span>
            <span>using</span>
            <a
              href={footerHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-nitro-orange hover:underline font-semibold"
            >
              caffeine.ai
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <Toaster />
    </QueryClientProvider>
  );
}
