import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSubmitScore } from "@/hooks/useQueries";
import { Gauge, Pause, Play, Trophy } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

type GameStatus = "start" | "playing" | "paused" | "gameover";

interface TrafficCar {
  x: number;
  y: number;
  color: string;
  width: number;
  height: number;
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
}

interface GameStateRef {
  playerX: number;
  playerY: number;
  speed: number;
  score: number;
  coins_count: number;
  roadOffset: number;
  trafficCars: TrafficCar[];
  coins: Coin[];
  spawnTimer: number;
  spawnInterval: number;
  coinTimer: number;
  coinInterval: number;
  lastTimestamp: number;
  keys: Set<string>;
  touchStartX: number | null;
}

const CANVAS_W = 480;
const CANVAS_H = 640;
const ROAD_LEFT = 72;
const ROAD_WIDTH = 336;
const ROAD_RIGHT = ROAD_LEFT + ROAD_WIDTH;
const NUM_LANES = 4;
const LANE_W = ROAD_WIDTH / NUM_LANES;
const LANE_CENTERS = Array.from(
  { length: NUM_LANES },
  (_, i) => ROAD_LEFT + LANE_W * i + LANE_W / 2,
);
const CAR_W = 38;
const CAR_H = 66;
const COIN_R = 14;
const PLAYER_SPEED_X = 280;
const INITIAL_SCROLL_SPEED = 260;
const MAX_SCROLL_SPEED = 900;
const SPEED_INCREMENT = 18;
const TRAFFIC_COLORS = [
  "#E84040",
  "#4080E8",
  "#40C840",
  "#E8C840",
  "#E0E0E0",
  "#C040D8",
];
const DASH_LEN = 40;
const DASH_GAP = 30;
const DASH_PERIOD = DASH_LEN + DASH_GAP;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  isPlayer: boolean,
) {
  const hw = CAR_W / 2;
  const hh = CAR_H / 2;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = color;
  roundRect(ctx, x - hw, y - hh, CAR_W, CAR_H, 6);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "rgba(255,255,255,0.15)";
  roundRect(ctx, x - hw + 4, y - hh + 4, CAR_W - 8, CAR_H / 2 - 4, 4);
  ctx.fill();

  ctx.fillStyle = "rgba(140,210,255,0.75)";
  if (isPlayer) {
    roundRect(ctx, x - hw + 6, y - hh + 8, CAR_W - 12, 18, 3);
  } else {
    roundRect(ctx, x - hw + 6, y + hh - 26, CAR_W - 12, 18, 3);
  }
  ctx.fill();

  ctx.fillStyle = "#1A1A1A";
  roundRect(ctx, x - hw - 3, y - hh + 8, 9, 16, 3);
  ctx.fill();
  roundRect(ctx, x + hw - 6, y - hh + 8, 9, 16, 3);
  ctx.fill();
  roundRect(ctx, x - hw - 3, y + hh - 24, 9, 16, 3);
  ctx.fill();
  roundRect(ctx, x + hw - 6, y + hh - 24, 9, 16, 3);
  ctx.fill();

  if (isPlayer) {
    ctx.fillStyle = "rgba(255,255,220,0.95)";
    roundRect(ctx, x - hw + 5, y - hh + 2, 10, 6, 2);
    ctx.fill();
    roundRect(ctx, x + hw - 15, y - hh + 2, 10, 6, 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,60,60,0.9)";
    roundRect(ctx, x - hw + 5, y + hh - 8, 10, 6, 2);
    ctx.fill();
    roundRect(ctx, x + hw - 15, y + hh - 8, 10, 6, 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "rgba(255,255,200,0.9)";
    roundRect(ctx, x - hw + 5, y + hh - 8, 10, 6, 2);
    ctx.fill();
    roundRect(ctx, x + hw - 15, y + hh - 8, 10, 6, 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,40,40,0.85)";
    roundRect(ctx, x - hw + 5, y - hh + 2, 10, 6, 2);
    ctx.fill();
    roundRect(ctx, x + hw - 15, y - hh + 2, 10, 6, 2);
    ctx.fill();
  }
}

function drawCoin(ctx: CanvasRenderingContext2D, coin: Coin) {
  if (coin.collected) return;
  ctx.save();
  // Outer gold circle
  const grad = ctx.createRadialGradient(
    coin.x - 3,
    coin.y - 3,
    2,
    coin.x,
    coin.y,
    COIN_R,
  );
  grad.addColorStop(0, "#FFE066");
  grad.addColorStop(0.5, "#F4A21D");
  grad.addColorStop(1, "#C47A00");
  ctx.shadowColor = "rgba(244,162,29,0.7)";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(coin.x, coin.y, COIN_R, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  // Inner ring
  ctx.beginPath();
  ctx.arc(coin.x, coin.y, COIN_R - 3, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,180,0.6)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // "$" symbol
  ctx.fillStyle = "#7A4800";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("$", coin.x, coin.y + 1);
  ctx.restore();
}

function drawRoad(ctx: CanvasRenderingContext2D, roadOffset: number) {
  const grassGrad = ctx.createLinearGradient(0, 0, ROAD_LEFT, 0);
  grassGrad.addColorStop(0, "#1A2A14");
  grassGrad.addColorStop(1, "#141F10");
  ctx.fillStyle = grassGrad;
  ctx.fillRect(0, 0, ROAD_LEFT, CANVAS_H);

  const grassGrad2 = ctx.createLinearGradient(ROAD_RIGHT, 0, CANVAS_W, 0);
  grassGrad2.addColorStop(0, "#141F10");
  grassGrad2.addColorStop(1, "#1A2A14");
  ctx.fillStyle = grassGrad2;
  ctx.fillRect(ROAD_RIGHT, 0, CANVAS_W - ROAD_RIGHT, CANVAS_H);

  const roadGrad = ctx.createLinearGradient(ROAD_LEFT, 0, ROAD_RIGHT, 0);
  roadGrad.addColorStop(0, "#242424");
  roadGrad.addColorStop(0.5, "#2E2E2E");
  roadGrad.addColorStop(1, "#242424");
  ctx.fillStyle = roadGrad;
  ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, CANVAS_H);

  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ROAD_LEFT, 0);
  ctx.lineTo(ROAD_LEFT, CANVAS_H);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ROAD_RIGHT, 0);
  ctx.lineTo(ROAD_RIGHT, CANVAS_H);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 2;
  ctx.setLineDash([DASH_LEN, DASH_GAP]);
  for (let lane = 1; lane < NUM_LANES; lane++) {
    const lx = ROAD_LEFT + lane * LANE_W;
    const offset = roadOffset % DASH_PERIOD;
    ctx.beginPath();
    ctx.moveTo(lx, -DASH_PERIOD + offset);
    ctx.lineTo(lx, CANVAS_H + DASH_PERIOD);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawHUD(
  ctx: CanvasRenderingContext2D,
  score: number,
  speed: number,
  coinsCount: number,
) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  roundRect(ctx, 10, 10, 140, 44, 8);
  ctx.fill();
  ctx.fillStyle = "#F4A21D";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("SCORE", 22, 28);
  ctx.fillStyle = "#EDEFF2";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(String(score), 22, 47);

  // Coins HUD
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  roundRect(ctx, 10, 62, 140, 36, 8);
  ctx.fill();
  // Coin icon
  ctx.beginPath();
  ctx.arc(28, 80, 8, 0, Math.PI * 2);
  ctx.fillStyle = "#F4A21D";
  ctx.fill();
  ctx.fillStyle = "#7A4800";
  ctx.font = "bold 9px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("$", 28, 81);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#EDEFF2";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText(`x${coinsCount}`, 42, 87);

  const kmh = Math.round((speed / INITIAL_SCROLL_SPEED) * 80 + 40);
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  roundRect(ctx, CANVAS_W - 150, CANVAS_H - 54, 140, 44, 8);
  ctx.fill();
  ctx.fillStyle = "#F4A21D";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("SPEED", CANVAS_W - 138, CANVAS_H - 36);
  ctx.fillStyle = "#EDEFF2";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(`${kmh} KM/H`, CANVAS_W - 138, CANVAS_H - 17);
  ctx.restore();
}

function drawIdleScene(ctx: CanvasRenderingContext2D, gs: GameStateRef) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  drawRoad(ctx, gs.roadOffset);
  for (const c of gs.trafficCars) drawCar(ctx, c.x, c.y, c.color, false);
  for (const coin of gs.coins) drawCoin(ctx, coin);
  drawCar(ctx, gs.playerX, gs.playerY, "#F4A21D", true);
}

interface GameCanvasProps {
  onScoreUpdate?: (score: number) => void;
}

export default function GameCanvas({ onScoreUpdate }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gsRef = useRef<GameStateRef>({
    playerX: CANVAS_W / 2,
    playerY: CANVAS_H - 100,
    speed: INITIAL_SCROLL_SPEED,
    score: 0,
    coins_count: 0,
    roadOffset: 0,
    trafficCars: [],
    coins: [],
    spawnTimer: 0,
    spawnInterval: 2.0,
    coinTimer: 0,
    coinInterval: 1.5,
    lastTimestamp: 0,
    keys: new Set(),
    touchStartX: null,
  });
  const rafRef = useRef<number>(0);
  const statusRef = useRef<GameStatus>("start");

  // Audio refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const engineOscRef = useRef<OscillatorNode | null>(null);
  const engineGainRef = useRef<GainNode | null>(null);
  const audioInitRef = useRef(false);

  const [gameStatus, setGameStatus] = useState<GameStatus>("start");
  const [displayScore, setDisplayScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [highScore, setHighScore] = useState(0);
  const submitScore = useSubmitScore();

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const startEngineSound = useCallback(() => {
    const ctx = getAudioCtx();
    // Stop existing engine
    if (engineOscRef.current) {
      try {
        engineOscRef.current.stop();
      } catch {
        /* ignore */
      }
      engineOscRef.current = null;
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    engineOscRef.current = osc;
    engineGainRef.current = gain;
  }, [getAudioCtx]);

  const stopEngineSound = useCallback(() => {
    if (engineOscRef.current) {
      try {
        engineOscRef.current.stop();
      } catch {
        /* ignore */
      }
      engineOscRef.current = null;
    }
    engineGainRef.current = null;
  }, []);

  const updateEngineGain = useCallback((speed: number) => {
    if (!engineGainRef.current || !audioCtxRef.current) return;
    const t = audioCtxRef.current.currentTime;
    const ratio =
      (speed - INITIAL_SCROLL_SPEED) /
      (MAX_SCROLL_SPEED - INITIAL_SCROLL_SPEED);
    const gainVal = 0.06 + ratio * 0.14;
    const freq = 70 + ratio * 60;
    engineGainRef.current.gain.setTargetAtTime(gainVal, t, 0.1);
    if (engineOscRef.current) {
      engineOscRef.current.frequency.setTargetAtTime(freq, t, 0.1);
    }
  }, []);

  const playCoinSound = useCallback(() => {
    const ctx = getAudioCtx();
    const t = ctx.currentTime;
    const playTone = (freq: number, start: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t + start);
      gain.gain.setValueAtTime(0, t + start);
      gain.gain.linearRampToValueAtTime(0.3, t + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + start + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + start);
      osc.stop(t + start + 0.1);
    };
    playTone(880, 0);
    playTone(1100, 0.09);
  }, [getAudioCtx]);

  const playCrashSound = useCallback(() => {
    const ctx = getAudioCtx();
    const t = ctx.currentTime;
    // White noise burst
    const bufferSize = Math.floor(ctx.sampleRate * 0.3);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(t);
    noise.stop(t + 0.3);
    // Low thump
    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thump.type = "sine";
    thump.frequency.setValueAtTime(120, t);
    thump.frequency.exponentialRampToValueAtTime(30, t + 0.2);
    thumpGain.gain.setValueAtTime(0.6, t);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    thump.connect(thumpGain);
    thumpGain.connect(ctx.destination);
    thump.start(t);
    thump.stop(t + 0.3);
  }, [getAudioCtx]);

  const resetGame = useCallback(() => {
    const gs = gsRef.current;
    gs.playerX = CANVAS_W / 2;
    gs.playerY = CANVAS_H - 100;
    gs.speed = INITIAL_SCROLL_SPEED;
    gs.score = 0;
    gs.coins_count = 0;
    gs.roadOffset = 0;
    gs.trafficCars = [];
    gs.coins = [];
    gs.spawnTimer = 0;
    gs.spawnInterval = 2.0;
    gs.coinTimer = 0;
    gs.coinInterval = 1.5;
    gs.lastTimestamp = 0;
    gs.keys = new Set();
    setDisplayScore(0);
  }, []);

  const startGame = useCallback(() => {
    resetGame();
    statusRef.current = "playing";
    setGameStatus("playing");
    startEngineSound();
  }, [resetGame, startEngineSound]);

  const pauseGame = useCallback(() => {
    if (statusRef.current === "playing") {
      statusRef.current = "paused";
      setGameStatus("paused");
      // Suspend engine
      if (audioCtxRef.current && audioCtxRef.current.state === "running") {
        audioCtxRef.current.suspend();
      }
    } else if (statusRef.current === "paused") {
      statusRef.current = "playing";
      setGameStatus("playing");
      // Resume engine
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
    }
  }, []);

  const spawnTrafficCar = useCallback(() => {
    const lane = Math.floor(Math.random() * NUM_LANES);
    const color =
      TRAFFIC_COLORS[Math.floor(Math.random() * TRAFFIC_COLORS.length)];
    gsRef.current.trafficCars.push({
      x: LANE_CENTERS[lane],
      y: -CAR_H,
      color,
      width: CAR_W,
      height: CAR_H,
    });
  }, []);

  const spawnCoin = useCallback(() => {
    const lane = Math.floor(Math.random() * NUM_LANES);
    gsRef.current.coins.push({
      x: LANE_CENTERS[lane],
      y: -20,
      collected: false,
    });
  }, []);

  const checkCollision = useCallback(() => {
    const gs = gsRef.current;
    const px1 = gs.playerX - CAR_W / 2 + 6;
    const px2 = gs.playerX + CAR_W / 2 - 6;
    const py1 = gs.playerY - CAR_H / 2 + 8;
    const py2 = gs.playerY + CAR_H / 2 - 8;
    for (const car of gs.trafficCars) {
      const cx1 = car.x - CAR_W / 2 + 4;
      const cx2 = car.x + CAR_W / 2 - 4;
      const cy1 = car.y - CAR_H / 2;
      const cy2 = car.y + CAR_H / 2;
      if (px1 < cx2 && px2 > cx1 && py1 < cy2 && py2 > cy1) return true;
    }
    return false;
  }, []);

  const checkCoinCollisions = useCallback((onCoinCollected: () => void) => {
    const gs = gsRef.current;
    let anyCollected = false;
    for (const coin of gs.coins) {
      if (coin.collected) continue;
      const dx = gs.playerX - coin.x;
      const dy = gs.playerY - coin.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CAR_W / 2 + COIN_R) {
        coin.collected = true;
        gs.score += 50;
        gs.coins_count += 1;
        anyCollected = true;
      }
    }
    if (anyCollected) onCoinCollected();
  }, []);

  const gameLoop = useCallback(
    (timestamp: number) => {
      const gs = gsRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (statusRef.current !== "playing") {
        drawIdleScene(ctx, gs);
        drawHUD(ctx, gs.score, gs.speed, gs.coins_count);
        rafRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      const delta =
        gs.lastTimestamp === 0
          ? 0
          : Math.min((timestamp - gs.lastTimestamp) / 1000, 0.05);
      gs.lastTimestamp = timestamp;

      gs.speed = Math.min(gs.speed + SPEED_INCREMENT * delta, MAX_SCROLL_SPEED);
      gs.score += Math.round(gs.speed * delta * 0.15);
      gs.roadOffset = (gs.roadOffset + gs.speed * delta) % DASH_PERIOD;

      updateEngineGain(gs.speed);

      const movingLeft =
        gs.keys.has("ArrowLeft") || gs.keys.has("a") || gs.keys.has("A");
      const movingRight =
        gs.keys.has("ArrowRight") || gs.keys.has("d") || gs.keys.has("D");
      if (movingLeft)
        gs.playerX = Math.max(
          ROAD_LEFT + CAR_W / 2,
          gs.playerX - PLAYER_SPEED_X * delta,
        );
      if (movingRight)
        gs.playerX = Math.min(
          ROAD_RIGHT - CAR_W / 2,
          gs.playerX + PLAYER_SPEED_X * delta,
        );

      gs.spawnTimer += delta;
      gs.spawnInterval = Math.max(
        0.6,
        2.0 - (gs.speed - INITIAL_SCROLL_SPEED) / 600,
      );
      if (gs.spawnTimer >= gs.spawnInterval) {
        gs.spawnTimer = 0;
        spawnTrafficCar();
      }

      // Coin spawning
      gs.coinTimer += delta;
      gs.coinInterval = Math.max(
        0.8,
        1.5 - (gs.speed - INITIAL_SCROLL_SPEED) / 1000,
      );
      if (gs.coinTimer >= gs.coinInterval) {
        gs.coinTimer = 0;
        spawnCoin();
      }

      gs.trafficCars = gs.trafficCars
        .map((c) => ({ ...c, y: c.y + gs.speed * delta }))
        .filter((c) => c.y < CANVAS_H + CAR_H);

      // Move coins
      gs.coins = gs.coins
        .map((c) => ({ ...c, y: c.y + gs.speed * delta }))
        .filter((c) => !c.collected && c.y < CANVAS_H + COIN_R);

      checkCoinCollisions(playCoinSound);

      if (checkCollision()) {
        const score = gs.score;
        setFinalScore(score);
        if (score > highScore) setHighScore(score);
        onScoreUpdate?.(score);
        statusRef.current = "gameover";
        setGameStatus("gameover");
        stopEngineSound();
        playCrashSound();
      }

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawRoad(ctx, gs.roadOffset);
      for (const coin of gs.coins) drawCoin(ctx, coin);
      for (const c of gs.trafficCars) drawCar(ctx, c.x, c.y, c.color, false);
      drawCar(ctx, gs.playerX, gs.playerY, "#F4A21D", true);
      drawHUD(ctx, gs.score, gs.speed, gs.coins_count);

      if (Math.round(timestamp / 100) % 2 === 0) {
        setDisplayScore(gs.score);
      }

      rafRef.current = requestAnimationFrame(gameLoop);
    },
    [
      spawnTrafficCar,
      spawnCoin,
      checkCollision,
      checkCoinCollisions,
      highScore,
      onScoreUpdate,
      updateEngineGain,
      playCoinSound,
      playCrashSound,
      stopEngineSound,
    ],
  );

  useEffect(() => {
    rafRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameLoop]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Init audio on first key interaction
      if (!audioInitRef.current) {
        audioInitRef.current = true;
        getAudioCtx();
      }
      gsRef.current.keys.add(e.key);
      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)
      )
        e.preventDefault();
      if (e.key === "p" || e.key === "P" || e.key === "Escape") pauseGame();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      gsRef.current.keys.delete(e.key);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [pauseGame, getAudioCtx]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onTouchStart = (e: TouchEvent) => {
      if (!audioInitRef.current) {
        audioInitRef.current = true;
        getAudioCtx();
      }
      gsRef.current.touchStartX = e.touches[0].clientX;
    };
    const onTouchMove = (e: TouchEvent) => {
      const startX = gsRef.current.touchStartX;
      if (startX === null) return;
      const dx = e.touches[0].clientX - startX;
      if (dx < -10) {
        gsRef.current.keys.add("ArrowLeft");
        gsRef.current.keys.delete("ArrowRight");
      } else if (dx > 10) {
        gsRef.current.keys.add("ArrowRight");
        gsRef.current.keys.delete("ArrowLeft");
      }
    };
    const onTouchEnd = () => {
      gsRef.current.touchStartX = null;
      gsRef.current.keys.delete("ArrowLeft");
      gsRef.current.keys.delete("ArrowRight");
    };
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd);
    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [getAudioCtx]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      stopEngineSound();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, [stopEngineSound]);

  const handleSubmitScore = async () => {
    if (!playerName.trim()) return;
    try {
      await submitScore.mutateAsync({
        playerName: playerName.trim(),
        score: finalScore,
      });
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="relative select-none"
      style={{ width: CANVAS_W, maxWidth: "100%" }}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        tabIndex={0}
        className="block w-full rounded-xl"
        style={{ aspectRatio: "480/640", background: "#1A1A1A" }}
      />

      {gameStatus === "playing" && (
        <button
          type="button"
          data-ocid="game.toggle"
          onClick={pauseGame}
          className="absolute top-3 right-3 z-10 bg-black/50 hover:bg-black/70 text-white rounded-lg px-3 py-2 flex items-center gap-1.5 text-sm font-semibold transition-colors"
        >
          <Pause className="w-4 h-4" />
          <span>PAUSE</span>
        </button>
      )}

      {gameStatus === "start" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-xl backdrop-blur-sm">
          <div className="flex flex-col items-center gap-6 p-8">
            <div className="text-center">
              <p className="text-nitro-muted text-sm font-semibold tracking-[0.2em] uppercase mb-2">
                Ready to Race?
              </p>
              <h2 className="font-display text-5xl font-extrabold text-nitro-orange tracking-tight drop-shadow-lg">
                NITRO RUSH
              </h2>
            </div>
            {highScore > 0 && (
              <div className="flex items-center gap-2 bg-nitro-card/80 px-4 py-2 rounded-lg">
                <Trophy className="w-4 h-4 text-nitro-orange" />
                <span className="text-nitro-muted text-sm">Best: </span>
                <span className="text-nitro-text font-bold">
                  {highScore.toLocaleString()}
                </span>
              </div>
            )}
            <div className="text-nitro-muted text-sm text-center space-y-1">
              <p>&#8592; &#8594; Arrow keys or A/D to steer</p>
              <p>Collect coins for bonus points!</p>
              <p>P / Escape to pause</p>
            </div>
            <Button
              data-ocid="game.primary_button"
              onClick={startGame}
              className="bg-nitro-orange hover:bg-amber-500 text-nitro-bgDeep font-display font-extrabold text-lg px-10 py-6 rounded-xl uppercase tracking-wider shadow-glow animate-pulse-glow"
            >
              START RACE
            </Button>
          </div>
        </div>
      )}

      {gameStatus === "paused" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-xl backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5 p-8">
            <h2 className="font-display text-4xl font-extrabold text-nitro-orange tracking-wider">
              PAUSED
            </h2>
            <div className="flex items-center gap-2 bg-nitro-card/80 px-4 py-2 rounded-lg">
              <Gauge className="w-4 h-4 text-nitro-orange" />
              <span className="text-nitro-muted text-sm">Score: </span>
              <span className="text-nitro-text font-bold">
                {displayScore.toLocaleString()}
              </span>
            </div>
            <Button
              data-ocid="game.secondary_button"
              onClick={pauseGame}
              className="bg-nitro-orange hover:bg-amber-500 text-nitro-bgDeep font-display font-bold text-lg px-8 py-4 rounded-xl uppercase tracking-wider"
            >
              <Play className="w-5 h-5 mr-2" />
              RESUME
            </Button>
          </div>
        </div>
      )}

      {gameStatus === "gameover" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 rounded-xl backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5 p-8 max-w-xs w-full">
            <div className="text-center">
              <p className="text-red-400 text-sm font-bold tracking-[0.2em] uppercase mb-1">
                CRASH!
              </p>
              <h2 className="font-display text-4xl font-extrabold text-nitro-text tracking-tight">
                GAME OVER
              </h2>
            </div>
            <div className="bg-nitro-card/90 rounded-xl px-6 py-4 text-center w-full">
              <p className="text-nitro-muted text-xs uppercase tracking-widest mb-1">
                Final Score
              </p>
              <p className="font-display text-3xl font-extrabold text-nitro-orange">
                {finalScore.toLocaleString()}
              </p>
              {finalScore >= highScore && highScore > 0 && (
                <p className="text-yellow-400 text-xs mt-1 font-semibold">
                  &#127942; New High Score!
                </p>
              )}
            </div>
            <div className="flex flex-col gap-3 w-full">
              <Input
                data-ocid="game.input"
                placeholder="Enter your name..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                className="bg-nitro-card border-border text-nitro-text placeholder:text-nitro-muted text-center font-semibold"
                maxLength={20}
              />
              <Button
                data-ocid="game.submit_button"
                onClick={handleSubmitScore}
                disabled={!playerName.trim() || submitScore.isPending}
                className="bg-nitro-orange hover:bg-amber-500 text-nitro-bgDeep font-display font-bold uppercase tracking-wider w-full"
              >
                {submitScore.isPending ? "Saving..." : "SUBMIT SCORE"}
              </Button>
              {submitScore.isSuccess && (
                <p
                  data-ocid="game.success_state"
                  className="text-green-400 text-xs text-center"
                >
                  Score submitted!
                </p>
              )}
            </div>
            <Button
              data-ocid="game.secondary_button"
              onClick={startGame}
              variant="outline"
              className="border-nitro-muted text-nitro-text hover:bg-nitro-card w-full font-display font-bold uppercase tracking-wider"
            >
              RACE AGAIN
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
