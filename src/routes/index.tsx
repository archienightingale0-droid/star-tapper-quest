import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { playBuy, playEvolve, playTap } from "@/lib/sounds";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Star Tapper — Idle Clicker Game" },
      { name: "description", content: "Tap the star, collect stardust, and build a galactic empire in this idle clicker." },
      { property: "og:title", content: "Star Tapper — Idle Clicker Game" },
      { property: "og:description", content: "Tap the star, collect stardust, and build a galactic empire." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});

type Upgrade = { id: string; name: string; icon: string; base: number; cps: number; click: number };
const UPGRADES: Upgrade[] = [
  { id: "glove", name: "Cosmic Glove", icon: "🧤", base: 15, cps: 0, click: 1 },
  { id: "drone", name: "Dust Drone", icon: "🛸", base: 50, cps: 1, click: 0 },
  { id: "moon", name: "Moon Mine", icon: "🌙", base: 400, cps: 8, click: 0 },
  { id: "rocket", name: "Rocket Fleet", icon: "🚀", base: 3000, cps: 50, click: 0 },
  { id: "planet", name: "Planet Factory", icon: "🪐", base: 25000, cps: 300, click: 0 },
  { id: "galaxy", name: "Galaxy Engine", icon: "🌌", base: 250000, cps: 2000, click: 0 },
];
const cost = (u: Upgrade, n: number) => Math.ceil(u.base * Math.pow(1.15, n));
const fmt = (n: number) =>
  n < 1000 ? Math.floor(n).toString()
    : n < 1e6 ? (n / 1e3).toFixed(1) + "K"
    : n < 1e9 ? (n / 1e6).toFixed(2) + "M" : (n / 1e9).toFixed(2) + "B";

const STARS = [
  { emoji: "⭐", name: "Star" },
  { emoji: "🌟", name: "Glowing Star" },
  { emoji: "✨", name: "Sparkle Star" },
  { emoji: "💫", name: "Dizzy Star" },
  { emoji: "🌠", name: "Shooting Star" },
  { emoji: "☄️", name: "Comet" },
  { emoji: "☀️", name: "Sun" },
  { emoji: "🪐", name: "Ringed Planet" },
  { emoji: "🌌", name: "Galaxy" },
  { emoji: "🕳️", name: "Black Hole" },
];
const starTier = (taps: number) => Math.min(Math.floor(taps / 100), STARS.length - 1);

type Save = { dust: number; owned: Record<string, number>; taps: number };
const KEY = "star-tapper-save";

function Game() {
  const [s, setS] = useState<Save>({ dust: 0, owned: {}, taps: 0 });
  const [floaters, setFloaters] = useState<{ id: number; x: number; y: number; v: number }[]>([]);
  const [newStar, setNewStar] = useState<string | null>(null);
  const loaded = useRef(false);
  const tapPitch = useRef(0);
  const pitchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const perClick = 1 + UPGRADES.reduce((a, u) => a + u.click * (s.owned[u.id] ?? 0), 0);
  const cps = UPGRADES.reduce((a, u) => a + u.cps * (s.owned[u.id] ?? 0), 0);
  const taps = s.taps ?? 0;
  const tier = starTier(taps);

  useEffect(() => {
    try { const r = localStorage.getItem(KEY); if (r) setS({ dust: 0, owned: {}, taps: 0, ...JSON.parse(r) }); } catch {}
    loaded.current = true;
  }, []);
  useEffect(() => { if (loaded.current) localStorage.setItem(KEY, JSON.stringify(s)); }, [s]);
  useEffect(() => {
    const t = setInterval(() => setS((p) => ({ ...p, dust: p.dust + cps / 10 })), 100);
    return () => clearInterval(t);
  }, [cps]);
  const prevTier = useRef(0);
  useEffect(() => {
    const t = starTier(taps);
    if (t > prevTier.current) {
      const name = STARS[t]?.name;
      if (name) {
        setNewStar(name);
        playEvolve();
        setTimeout(() => setNewStar(null), 4000);
      }
    }
    prevTier.current = t;
  }, [taps]);

  const tap = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const id = Date.now() + Math.random();
    setFloaters((f) => [...f.slice(-20), { id, x: e.clientX - r.left, y: e.clientY - r.top, v: perClick }]);
    setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 900);
    setS((p) => ({ ...p, dust: p.dust + perClick, taps: (p.taps ?? 0) + 1 }));
    playTap(tapPitch.current);
    if (pitchTimer.current) clearTimeout(pitchTimer.current);
    tapPitch.current = Math.min(tapPitch.current + 1, 8);
    pitchTimer.current = setTimeout(() => (tapPitch.current = 0), 1200);
  };
  const buy = (u: Upgrade) => {
    const n = s.owned[u.id] ?? 0, c = cost(u, n);
    if (s.dust < c) return;
    setS((p) => ({ dust: p.dust - c, taps: p.taps ?? 0, owned: { ...p.owned, [u.id]: n + 1 } }));
    playBuy(UPGRADES.findIndex((x) => x.id === u.id));
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-4 md:flex-row md:items-center">
      <section className="flex flex-1 flex-col items-center gap-4">
        <h1 className="text-4xl font-bold text-primary">Star Tapper</h1>
        <div className="text-center">
          <div className="text-5xl font-bold">{fmt(s.dust)}</div>
          <div className="text-muted-foreground">stardust · {fmt(cps)}/sec · +{fmt(perClick)}/tap</div>
        </div>
        <div className="upgrade-play-area relative grid w-full max-w-96 place-items-center">
          <div className="upgrade-travel-layer absolute inset-0" aria-label="Purchased upgrades">
            {UPGRADES.map((u, index) => {
              const owned = s.owned[u.id] ?? 0;
              if (owned <= 0) return null;
              return (
                <div key={u.id} className={`upgrade-orbit upgrade-orbit-${index}`}>
                  <span className="upgrade-traveler" role="img" aria-label={`${u.name}: ${owned} owned`}>
                    <span className="upgrade-character">{u.icon}</span>
                    <span className="upgrade-count">{owned}</span>
                  </span>
                </div>
              );
            })}
          </div>
        <Button variant="ghost" onClick={tap} aria-label="Tap the star" className="orb relative z-10 grid h-64 w-64 shrink-0 place-items-center p-0 text-[11rem] leading-none hover:bg-transparent">
          <span className="spin-slow">{STARS[tier]?.emoji ?? "⭐"}</span>
          {floaters.map((f) => (
            <span key={f.id} className="floater absolute text-2xl font-bold text-primary" style={{ left: f.x, top: f.y }}>
              +{fmt(f.v)}
            </span>
          ))}
        </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {STARS[tier]?.name ?? "Star"}
          {tier < STARS.length - 1 && <> · {taps % 100}/100 to next star</>}
        </div>
        {newStar && <div className="text-lg font-bold text-accent">✨ Evolved into a {newStar}!</div>}
        <button onClick={() => confirm("Reset all progress?") && setS({ dust: 0, owned: {}, taps: 0 })} className="text-sm text-muted-foreground underline">
          Reset
        </button>
      </section>
      <aside className="flex w-full flex-col gap-2 md:w-80">
        <h2 className="text-xl font-semibold">Upgrades</h2>
        {UPGRADES.map((u) => {
          const n = s.owned[u.id] ?? 0, c = cost(u, n), ok = s.dust >= c;
          return (
            <button key={u.id} onClick={() => buy(u)} disabled={!ok}
              className="flex items-center gap-3 rounded-lg border bg-card p-3 text-left transition enabled:hover:border-primary disabled:opacity-50">
              <span className="text-3xl">{u.icon}</span>
              <span className="flex-1">
                <span className="block font-semibold">{u.name}</span>
                <span className="block text-sm text-muted-foreground">
                  {u.click ? `+${u.click}/tap` : `+${u.cps}/sec`} · 💫 {fmt(c)}
                </span>
              </span>
              <span className="text-2xl font-bold text-accent">{n}</span>
            </button>
          );
        })}
      </aside>
    </main>
  );
}
