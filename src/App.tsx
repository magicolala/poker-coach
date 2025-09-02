import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Play, Square, RefreshCw, Trash2, Dice6, Info, RotateCw } from "lucide-react";
import { DecisionPanel } from "./components/DecisionPanel";

/**
 * Poker Coach – Equity, Ranges & Bluff-O-Meter (v3.4)
 * UI Refresh:
 *  - Improved layout, spacing, and typography for better readability.
 *  - Enhanced visual hierarchy and component grouping.
 *  - More responsive design for different screen sizes.
 */

type Suit = "s" | "h" | "d" | "c";
const SUITS: Suit[] = ["s", "h", "d", "c"];
const SUIT_SYMBOL: Record<Suit, string> = { s: "\u2660", h: "\u2665", d: "\u2666", c: "\u2663" };
const RANKS = ["2","3","4","5","6","7","8","9","T","J","Q","K","A"] as const;
type RankChar = typeof RANKS[number];
export type CardCode = `${RankChar}${Suit}`;

interface CardObj { r: number; s: number }
const rankToVal: Record<RankChar, number> = {"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"T":10,"J":11,"Q":12,"K":13,"A":14};
const valToRank: Record<number, RankChar> = {2:"2",3:"3",4:"4",5:"5",6:"6",7:"7",8:"8",9:"9",10:"T",11:"J",12:"Q",13:"K",14:"A"};
const parse = (code: CardCode): CardObj => ({ r: rankToVal[code[0] as RankChar], s: SUITS.indexOf(code[1] as Suit) });
const fullDeck = (): CardCode[] => { const d: CardCode[] = []; for (const r of RANKS) for (const s of SUITS) d.push(`${r}${s}` as CardCode); return d; };
const removeFromDeck = (deck: CardCode[], used: Set<string>) => deck.filter(c => !used.has(c));

interface HandRank { cat: number; tiebreak: number[]; packed: number }
const pack = (cat: number, kicks: number[]) => { let v = cat * 1e12; const arr = [...kicks,0,0,0,0,0]; for (let i=0;i<6;i++) v += arr[i] * Math.pow(15, 5-i); return v; };

function evaluate5(cards: CardObj[]): HandRank {
  const ranks = cards.map(c=>c.r).sort((a,b)=>b-a), suits = cards.map(c=>c.s);
  const rc: Record<number, number> = {}, sc: Record<number, number> = {};
  for (const r of ranks) rc[r] = (rc[r]||0)+1; for (const s of suits) sc[s] = (sc[s]||0)+1;
  const isFlush = Object.values(sc).some(v=>v===5);
  const uniq = Array.from(new Set(ranks));
  let straightTop = 0; for (let i=0;i<=uniq.length-5;i++) if (uniq[i]-uniq[i+4]===4) { straightTop = uniq[i]; break; }
  if (!straightTop && uniq.includes(14)) { const w=[5,4,3,2,14]; if (w.every(v=>uniq.includes(v))) straightTop=5; }
  if (isFlush) {
    const flushSuit = +Object.entries(sc).find(([,v])=>v===5)![0];
    const fr = cards.filter(c=>c.s===flushSuit).map(c=>c.r).sort((a,b)=>b-a);
    const frUniq = Array.from(new Set(fr));
    let st = 0; for (let i=0;i<=frUniq.length-5;i++) if (frUniq[i]-frUniq[i+4]===4) { st=frUniq[i]; break; }
    if (!st && frUniq.includes(14)) { const w=[5,4,3,2,14]; if (w.every(v=>frUniq.includes(v))) st=5; }
    if (st) return { cat:8, tiebreak:[st], packed: pack(8,[st]) };
  }
  const groups = Object.entries(rc).map(([r,c])=>({r:+r,c:+c})).sort((a,b)=> b.c - a.c || b.r - a.r);
  if (groups[0]?.c===4) { const four = groups[0].r; const kick = ranks.filter(r=>r!==four).sort((a,b)=>b-a)[0]; return { cat:7, tiebreak:[four, kick], packed: pack(7,[four,kick]) }; }
  if (groups[0]?.c===3 && groups[1]?.c===2) return { cat:6, tiebreak:[groups[0].r, groups[1].r], packed: pack(6,[groups[0].r, groups[1].r]) };
  if (isFlush) { const top5 = ranks.slice().sort((a,b)=>b-a); return { cat:5, tiebreak: top5, packed: pack(5, top5) };
  }
  if (straightTop) return { cat:4, tiebreak:[straightTop], packed: pack(4,[straightTop]) };
  if (groups[0]?.c===3) { const t=groups[0].r; const k=ranks.filter(r=>r!==t).sort((a,b)=>b-a).slice(0,2); return { cat:3, tiebreak:[t,...k], packed: pack(3,[t,...k]) }
  }
  if (groups[0]?.c===2 && groups[1]?.c===2) { const [hp,lp]=[groups[0].r,groups[1].r].sort((a,b)=>b-a); const k=ranks.filter(r=>r!==hp&&r!==lp).sort((a,b)=>b-a)[0]; return { cat:2, tiebreak:[hp,lp,k], packed: pack(2,[hp,lp,k]) }
  }
  if (groups[0]?.c===2) { const p=groups[0].r; const k=ranks.filter(r=>r!==p).sort((a,b)=>b-a).slice(0,3); return { cat:1, tiebreak:[p,...k], packed: pack(1,[p,...k]) }
  }
  const highs = ranks.slice().sort((a,b)=>b-a); return { cat:0, tiebreak: highs, packed: pack(0, highs) };
}

function bestOf7(cards7: CardObj[]): HandRank { let best: HandRank | null = null; const idx=[0,1,2,3,4,5,6]; for(let a=0;a<3;a++) for(let b=a+1;b<4;b++) for(let c=b+1;c<5;c++) for(let d=c+1;d<6;d++) for(let e=d+1;e<7;e++){ const combo=[idx[a],idx[b],idx[c],idx[d],idx[e]].map(i=>cards7[i]); const hr=evaluate5(combo); if(!best||hr.packed>best.packed) best=hr; } return best!; }

export type RangeStyle = "any" | "tight" | "reg" | "loose" | "maniac";
const ranksIdx = (a:number,b:number)=>[Math.max(a,b), Math.min(a,b)] as const;
const isBroadway = (v:number)=> v>=10;

function inRange(style: RangeStyle, c1: CardObj, c2: CardObj): boolean {
  if (style === "any") return true;
  const [hi, lo] = ranksIdx(c1.r, c2.r); const suited = c1.s===c2.s; const pair = hi===lo;
  switch(style){
    case "tight": {
      if (pair) return hi>=8;
      if (suited){
        if (hi===14 && lo>=10) return true;
        if (hi>=13 && lo>=10) return true;
        if ((hi===10&&lo===9)||(hi===9&&lo===8)) return true;
      } else {
        if ((hi===14&&lo>=11)||(hi===13&&lo===12)) return true;
      }
      return false;
    }
    case "reg": {
      if (pair) return hi>=2;
      if (suited){
        if (hi===14) return true;
        if (hi===13&&lo>=9) return true;
        if (hi===12&&lo>=9) return true;
        if (hi===11&&lo>=9) return true;
        if ((hi===10&&lo===9)||(hi===9&&lo===8)) return true;
      } else {
        if ((hi===14&&lo>=10)||(hi===13&&lo>=11)||(hi===12&&lo===11)) return true;
      }
      return false;
    }
    case "loose": {
      if (pair) return true;
      if (suited){
        if (hi===14) return true;
        if (hi>=13) return true;
        if (hi>=10 && lo>=7) return true;
        if (hi===6&&lo===5) return true;
        if (hi===5&&lo===4) return true;
      } else {
        if (hi===14&&lo>=2) return true;
        if (isBroadway(hi)&&isBroadway(lo)) return true;
        if (hi===13&&lo>=9) return true;
      }
      return false;
    }
    case "maniac": {
      if (pair) return true;
      if (suited) return true;
      if (hi>=11) return true;
      if (hi===14) return true;
      if (hi-lo<=2 && hi>=6) return true;
      return Math.random()<0.3;
    }
  }
}

interface SimResult { wins: number; ties: number; losses: number }
const sampleRandom = (arr: CardCode[], n: number, rng: ()=>number) => { const res: CardCode[] = []; const pool = arr.slice(); for (let i=0;i<n;i++){ const j = Math.floor(rng()*pool.length); res.push(pool[j]); pool.splice(j,1);} return res; };
function* pseudoRng(seed:number){ let x = seed||123456789; while(true){ x^=x<<13; x^=x>>>17; x^=x<<5; yield (x>>>0)/4294967296; }}

// UI helpers
const slots = [ { key: "H1", label: "Main 1" }, { key: "H2", label: "Main 2" }, { key: "F1", label: "Flop 1" }, { key: "F2", label: "Flop 2" }, { key: "F3", label: "Flop 3" }, { key: "T", label: "Turn" }, { key: "R", label: "River" } ] as const;
type SlotKey = typeof slots[number]["key"];
type TableSeat = { id: number; active: boolean; range: RangeStyle };
type SeatStats = { vpip:number; pfr:number; af:number; threebet:number; cbet:number };
const defaultStats: SeatStats = { vpip:25, pfr:18, af:2.5, threebet:5, cbet:55 };

function CardButton({ code, disabled, onPick }: { code: CardCode; disabled?: boolean; onPick: (c: CardCode)=>void }) {
  const rank = code[0] as RankChar; const suit = code[1] as Suit; const isRed = suit === "h" || suit === "d";
  return (
    <Button disabled={disabled} variant="outline" onClick={()=>onPick(code)} className={`h-10 w-8 text-sm font-semibold flex flex-col items-center justify-center transition-colors ${disabled ? "opacity-30 cursor-not-allowed" : "bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"}`}>
      <span>{rank}</span>
      <span className={isRed ? "text-red-500" : "text-gray-800 dark:text-gray-300"}>{SUIT_SYMBOL[suit]}</span>
    </Button>
  );
}

function Slot({ label, value, onClear, onFocus, focused }: { label:string; value?: CardCode; onClear:()=>void; onFocus:()=>void; focused:boolean }) {
  const rank = value?.[0] as RankChar | undefined; const suit = value?.[1] as Suit | undefined;
  return (
    <div className={`flex items-center gap-1 p-1 rounded-lg border border-gray-300 dark:border-gray-700 transition-all ${focused ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20" : "bg-gray-50 dark:bg-gray-800/50"}`} onClick={onFocus}>
      <div className="w-14 text-xs text-muted-foreground">{label}</div>
      <div className="w-10 h-10 border border-gray-300 dark:border-gray-700 rounded-md flex items-center justify-center bg-white dark:bg-gray-900 shadow-inner">
        {value ? (
          <div className="text-center">
            <div className="text-base font-bold text-gray-800 dark:text-gray-200">{rank}</div>
            <div className={`font-semibold ${(suit==="h"||suit==="d") ? "text-red-500" : "text-gray-800 dark:text-gray-300"}`}>{suit ? SUIT_SYMBOL[suit] : ""}</div>
          </div>
        ) : <span className="text-2xl text-muted-foreground">?</span>}
      </div>
      <Button variant="ghost" size="icon" onClick={onClear} title="Effacer" className="hover:bg-red-100 dark:hover:bg-red-900/50">
        <Trash2 className="w-4 h-4 text-red-500" />
      </Button>
    </div>
  );
}

type Rec = { label:string; detail:string; kind: "good"|"bad"|"neutral"|"info" };

const pct = (x:number)=> `${(x*100).toFixed(1)}%`;

export default function PokerCoach() {
  const [seatCount, setSeatCount] = useState(6);
  const [autoClassify, setAutoClassify] = useState(true);
  const [stats, setStats] = useState<Record<number, SeatStats>>({});
  const [seats, setSeats] = useState<TableSeat[]>(()=>Array.from({length:6}, (_,i)=>({id:i+1, active:i!==0, range: i===0?"any":"reg"})));
  const [dealerSeat, setDealerSeat] = useState<number>(1);

  useEffect(()=>{ setSeats(prev=>{ const arr = Array.from({length: seatCount}, (_,i)=>{ const found = prev.find(s=>s.id===i+1); return found ?? { id: i+1, active:i!==0, range: (i===0?"any":"reg") as RangeStyle }; }); return arr; }); if (dealerSeat>seatCount) setDealerSeat(1); }, [seatCount]);
  useEffect(()=>{ setStats(prev=>{ const copy = { ...prev } as Record<number, SeatStats>; for (let i=1;i<=seatCount;i++) if (!copy[i]) copy[i] = { ...defaultStats }; return copy; }); }, [seatCount]);

  function inferStyle(s: SeatStats): RangeStyle {
    const { vpip, pfr, af, threebet } = s; const gap = Math.max(0, vpip - pfr);
    if (vpip<=20 && pfr<=16) return "tight";
    if (vpip<=28 && pfr<=22) return (af>3 || threebet>8) ? "loose" : "reg";
    if (vpip>35 && pfr>25 && (af>3.5 || threebet>10)) return "maniac";
    if (vpip>=40 || gap>=18) return af>3 ? "maniac" : "loose";
    return "reg";
  }
  useEffect(()=>{ if (!autoClassify) return; setSeats(prev=> prev.map(s=> s.id===1? s : ({...s, range: inferStyle(stats[s.id]||defaultStats)}))); }, [stats, autoClassify]);

  const orderFromDealer = useMemo(()=> Array.from({length: seatCount}, (_,i)=> ((dealerSeat-1 + i) % seatCount) + 1), [seatCount, dealerSeat]);

  function applyPositionPreset(){
    const styleForRole6: RangeStyle[] = ["loose","maniac","reg","tight","reg","reg"]; // BTN,SB,BB,UTG,HJ,CO
    const styleForRole9: RangeStyle[] = ["loose","maniac","reg","tight","tight","reg","reg","reg","reg"]; // approx
    const styles = seatCount<=6 ? styleForRole6 : styleForRole9;
    setSeats(prev=> prev.map(s=> {
      if (s.id===1) return s;
      const idx = orderFromDealer.indexOf(s.id);
      const style = styles[idx] || "reg";
      return { ...s, range: style };
    }));
  }

  function applyStatsForAll(getStats:(seatId:number)=>SeatStats){ setStats(prev=>{ const obj: Record<number, SeatStats> = { ...prev }; for (let i=2; i<=seatCount; i++) obj[i] = getStats(i); return obj; }); }
  function presetOnlineMicro(){ applyStatsForAll((i)=>{ switch(i){ case 2: return { vpip:18, pfr:15, af:2.6, threebet:5, cbet:60 }; case 3: return { vpip:25, pfr:20, af:2.8, threebet:7, cbet:62 }; case 4: return { vpip:33, pfr:26, af:3.4, threebet:10, cbet:68 }; case 5: return { vpip:46, pfr:34, af:4.0, threebet:14, cbet:75 }; case 6: return { vpip:26, pfr:20, af:2.7, threebet:7, cbet:60 }; case 7: return { vpip:28, pfr:22, af:2.9, threebet:8, cbet:62 }; case 8: return { vpip:34, pfr:26, af:3.2, threebet:9, cbet:66 }; case 9: return { vpip:20, pfr:16, af:2.4, threebet:5, cbet:58 }; default: return { vpip:25, pfr:18, af:2.5, threebet:6, cbet:60 }; } }); }
  function presetLive12(){ applyStatsForAll((i)=>{ switch(i){ case 2: return { vpip:22, pfr:16, af:2.2, threebet:4, cbet:54 }; case 3: return { vpip:28, pfr:20, af:2.3, threebet:5, cbet:55 }; case 4: return { vpip:36, pfr:22, af:2.6, threebet:6, cbet:57 }; case 5: return { vpip:50, pfr:30, af:3.2, threebet:8, cbet:62 }; case 6: return { vpip:30, pfr:20, af:2.4, threebet:5, cbet:55 }; case 7: return { vpip:34, pfr:22, af:2.5, threebet:5, cbet:56 }; case 8: return { vpip:40, pfr:24, af:2.7, threebet:6, cbet:58 }; case 9: return { vpip:24, pfr:16, af:2.1, threebet:4, cbet:54 }; default: return { vpip:28, pfr:19, af:2.3, threebet:5, cbet:55 }; } }); }

  const [cards, setCards] = useState<Record<SlotKey, CardCode | undefined>>({H1:undefined,H2:undefined,F1:undefined,F2:undefined,F3:undefined,T:undefined,R:undefined});
  const [focus, setFocus] = useState<SlotKey>("H1");
  const usedSet = useMemo(()=> new Set(Object.values(cards).filter(Boolean) as string[]), [cards]);

  const [pot, setPot] = useState<number>(10);
  const [playerBets, setPlayerBets] = useState<Record<number, number>>({});

  const [runs, setRuns] = useState(5000);
  const [progress, setProgress] = useState(0);
  const [simRunning, setSimRunning] = useState(false);
  const stopFlag = useRef(false);
  const [result, setResult] = useState<SimResult>({wins:0,ties:0,losses:0});
  const [equity, setEquity] = useState<number>(0);
  const [showDecisionPanel, setShowDecisionPanel] = useState(true);

  function assignCard(slot: SlotKey, code: CardCode) { if (usedSet.has(code)) return; setCards(prev=>({ ...prev, [slot]: code })); const order: SlotKey[] = ["H1","H2","F1","F2","F3","T","R"]; const idx = order.indexOf(slot); setFocus(order[Math.min(idx+1, order.length-1)]); }
  function clearSlot(slot: SlotKey) { setCards(prev=>({ ...prev, [slot]: undefined })); }
  function clearAll() { setCards({H1:undefined,H2:undefined,F1:undefined,F2:undefined,F3:undefined,T:undefined,R:undefined}); setResult({wins:0,ties:0,losses:0}); setEquity(0); setProgress(0); }
  function randomizeHole() { const rng = pseudoRng(Date.now()); const next = () => (rng.next() as any).value as number; const pool = removeFromDeck(fullDeck(), usedSet); const [a,b] = sampleRandom(pool, 2, next); setCards(prev=>({ ...prev, H1:a, H2:b })); setFocus("F1"); }

  const opponents = useMemo(()=> seats.filter(s=>s.id!==1 && s.active).length, [seats]);
  const hero2 = useMemo(()=> (cards.H1 && cards.H2) ? [parse(cards.H1), parse(cards.H2)] : null, [cards.H1, cards.H2]);
  const boardKnown = useMemo(()=> ["F1","F2","F3","T","R"].map(k=>cards[k as SlotKey]).filter(Boolean).map(c=>parse(c as CardCode)) as CardObj[], [cards]);
  const stageName = ()=>{ const n = boardKnown.length; if (n<=0) return "Préflop"; if (n<=3) return "Flop"; if (n===4) return "Turn"; return "River"; };

  useEffect(() => {
    setPlayerBets({});
  }, [boardKnown.length]);

  function dealOppFromRange(pool: CardCode[], rng:()=>number, style: RangeStyle): [CardCode, CardCode] {
    for (let tries=0; tries<200; tries++){
      const i = Math.floor(rng()*pool.length); const a = pool[i]; const afterA = pool.slice(0,i).concat(pool.slice(i+1)); const j = Math.floor(rng()*afterA.length); const b = afterA[j];
      const ok = inRange(style, parse(a), parse(b)) || inRange(style, parse(b), parse(a)); if (ok) return [a,b];
    }
    const i = Math.floor(rng()*pool.length); const a = pool[i]; const afterA = pool.slice(0,i).concat(pool.slice(i+1)); const j = Math.floor(rng()*afterA.length); const b = afterA[j]; return [a,b];
  }

  async function runSim() {
    if (!hero2) return; if (opponents<=0) { setResult({wins: runs, ties:0, losses:0}); setEquity(1); setProgress(100); return; }
    setSimRunning(true); stopFlag.current = false; setProgress(0);
    let wins=0, ties=0, losses=0;
    const used = new Set<string>(); if (cards.H1) used.add(cards.H1); if (cards.H2) used.add(cards.H2); (["F1","F2","F3","T","R"] as SlotKey[]).forEach(k=>{ if (cards[k]) used.add(cards[k]!); });
    const baseDeck = removeFromDeck(fullDeck(), used);
    const rng = pseudoRng(Date.now()); const next = () => (rng.next() as any).value as number;
    const total = runs; const chunk = 300; let done = 0;
    const activeOppSeats = seats.filter(s=>s.id!==1 && s.active);

    while (done < total && !stopFlag.current) {
      const todo = Math.min(chunk, total - done);
      for (let i=0;i<todo;i++) {
        let pool = baseDeck.slice();
        const oppHands: [CardCode,CardCode][] = [];
        for (const s of activeOppSeats) { const [a,b] = dealOppFromRange(pool, next, s.range); pool = pool.filter(c=>c!==a && c!==b); oppHands.push([a,b]); }
        const needBoard = 5 - boardKnown.length; const boardAdds: CardCode[] = needBoard>0 ? sampleRandom(pool, needBoard, next) : [];
        const hero7: CardObj[] = [...hero2, ...boardKnown, ...boardAdds.map(parse)]; const heroRank = bestOf7(hero7).packed;
        let oppBestHigher = false; let tiesCount = 0;
        for (let p=0;p<oppHands.length;p++) { const [oa, ob] = oppHands[p]; const pr = bestOf7([parse(oa),parse(ob),...boardKnown,...boardAdds.map(parse)]).packed; if (pr > heroRank) { oppBestHigher = true; break; } if (pr===heroRank) tiesCount++; }
        if (oppBestHigher) losses++; else if (tiesCount>0) ties += 1/(tiesCount+1); else wins++;
      }
      done += todo; setProgress(Math.round((done/total)*100)); await new Promise(r=>setTimeout(r,0));
    }
    setResult({wins, ties, losses}); const eq = (wins + ties) / Math.max(1, wins+ties+losses); setEquity(eq); setSimRunning(false);
  }
  const stopSim = ()=>{ stopFlag.current = true; setSimRunning(false); };

  const totalPlayerBets = useMemo(() => Object.values(playerBets).reduce((sum, bet) => sum + bet, 0), [playerBets]);
  const currentPot = pot + totalPlayerBets;
  const maxBet = useMemo(() => Math.max(0, ...Object.values(playerBets)), [playerBets]);
  const heroBet = playerBets[1] || 0;
  const toCall = maxBet - heroBet;

  const requiredEquity = useMemo(()=> toCall > 0 ? (toCall / (currentPot + toCall)) : 0, [currentPot, toCall]);
  const recommendation: Rec = useMemo(()=> {
    if (!hero2) return { label:"Sélectionnez votre main", detail:"Choisissez vos deux cartes pour commencer.", kind:"info" };
    if (opponents<=0) return { label:"Check/Bet petit", detail:"Vous êtes seul dans le coup.", kind:"info" };
    if (toCall<=0) {
      if (equity > 0.62) return { label:"Bet (Value)", detail:"Votre équité est forte. Misez environ 2/3 du pot pour valoriser.", kind:"good" };
      if (equity < 0.35) return { label:"Check", detail:"Prudence. Évitez de bluffer sans raison valable.", kind:"neutral" };
      return { label:"Check ou Bet petit", detail:"Équité moyenne, contrôlez la taille du pot.", kind:"neutral" };
    }
    if (equity < requiredEquity - 0.03) return { label:"Fold", detail:`Votre équité (${pct(equity)}) est inférieure à la cote du pot (${pct(requiredEquity)}).`, kind:"bad" };
    if (equity < requiredEquity + 0.03) return { label:"Call", detail:"La décision est marginale, mais la cote du pot justifie de suivre.", kind:"neutral" };
    return { label:"Raise", detail:"Votre avantage d'équité est clair. Relancez 2.5x à 3x.", kind:"good" };
  }, [hero2, opponents, toCall, equity, requiredEquity]);

  function countFlushDrawsOnFlop(b: CardObj[]): number { if (b.length<3) return 0; const sc: Record<number, number> = {}; for (const c of b.slice(0,3)) sc[c.s]=(sc[c.s]||0)+1; const maxSuit = Math.max(...Object.values(sc)); return maxSuit===2?1:0; }
  function countStraightDrawsOnFlop(b: CardObj[]): number { if (b.length<3) return 0; const v = Array.from(new Set(b.slice(0,3).map(x=>x.r))).sort((a,b)=>a-b); let draws=0; const seqs = [[2,3,4],[3,4,5],[4,5,6],[5,6,7],[6,7,8],[7,8,9],[8,9,10],[9,10,11],[10,11,12],[11,12,13],[12,13,14]]; for (const s of seqs) { const hit = s.filter(x=>v.includes(x)).length; if (hit===2) draws++; } return draws; }
  function heroNutsBlockers(hero: CardObj[], b: CardObj[]): number { let score = 0; if (b.length>=3){ const sc: Record<number, number>={}; for(const c of b) sc[c.s]=(sc[c.s]||0)+1; const suit3 = Object.entries(sc).find(([,v])=>v>=3); if (suit3){ const s=+suit3[0]; if (hero.some(c=>c.s===s && c.r===14)) score += 1; } const ranks = b.map(c=>c.r); const need = [10,11,12,13,14]; if (need.some(x=>ranks.includes(x))) { if (hero.some(c=>need.includes(c.r))) score += 1; } } return score; }
  const multiwayPenalty = (nOpp:number)=> nOpp>=3?0.7: nOpp===2?0.85:1;
  const bluffRateEst = useMemo(()=>{ if (!hero2) return 0.0; const street = stageName(); const nOpp = opponents; if (nOpp<=0) return 0.0; const baseMap: Record<RangeStyle, number> = { any:0.35, tight:0.20, reg:0.35, loose:0.55, maniac:0.75 }; const maxBase = seats.filter(s=>s.id!==1 && s.active).reduce((m,s)=> Math.max(m, baseMap[s.range]), 0.0); let drawFactor = 0.3; if (street==="Turn"||street==="River"){ const missFD = countFlushDrawsOnFlop(boardKnown); const missSD = countStraightDrawsOnFlop(boardKnown); const suitsCount: Record<number, number> = {}; for (const c of boardKnown) suitsCount[c.s]=(suitsCount[c.s]||0)+1; const flushCame = Math.max(0,...Object.values(suitsCount))>=5; drawFactor = Math.min(1, 0.3 + 0.25*missFD + 0.2*missSD + (street==="River" && !flushCame ? 0.15 : 0)); } const blockerBonus = hero2 && heroNutsBlockers(hero2, [...boardKnown]) * 0.1; const rate = Math.max(0, Math.min(1, maxBase * drawFactor * multiwayPenalty(nOpp) + (blockerBonus||0))); return rate; }, [seats, opponents, boardKnown, hero2]);

  const StatLabel = ({text, tip}:{text:string; tip:string}) => (
    <div className="flex items-center gap-1 mb-1">
      <span className="uppercase text-[11px] font-medium text-gray-500 dark:text-gray-400">{text}</span>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="p-0.5" title={tip} aria-label={`Aide ${text}`}><Info className="w-3 h-3 text-gray-400 dark:text-gray-500"/></button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs leading-snug bg-gray-800 text-white dark:bg-gray-50 dark:text-gray-900">
            <p>{tip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );

  const rotateDealer = ()=> setDealerSeat(prev => (prev % seatCount) + 1);

  return (
    <div className="min-h-screen w-full bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-200 p-2 sm:p-4 md:p-6">
      <div className="space-y-6">
        <header className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Poker Coach Pro</h1>
            <p className="text-muted-foreground mt-1">Analyse d'équité, profils adverses et aide à la décision</p>
        </header>

        <div className="grid gap-6 md:grid-cols-5">
          <div className="md:col-span-3 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuration de la Table</CardTitle>
                <CardDescription>Définissez les joueurs, leurs styles de jeu (ranges) et les mises.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Joueurs à table</label>
                    <div className="flex items-center gap-2">
                      <Input type="number" min={2} max={9} value={seatCount} onChange={e=>setSeatCount(Math.min(9, Math.max(2, Number(e.target.value)||2)))} className="w-24" />
                      <Badge variant="secondary">Vous êtes au Siège 1</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Bouton Dealer</label>
                    <div className="flex items-center gap-2">
                      <Input type="number" min={1} max={seatCount} value={dealerSeat} onChange={e=> setDealerSeat(Math.min(seatCount, Math.max(1, Number(e.target.value)||1)))} className="w-24" />
                      <Button size="sm" variant="outline" onClick={rotateDealer}><RotateCw className="w-4 h-4 mr-2"/>Suivant</Button>
                    </div>
                     <p className="text-xs text-muted-foreground mt-1">Le dealer est la référence (BTN) pour les presets de position.</p>
                  </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Presets & Raccourcis</label>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-2 text-sm p-2 rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700"><input type="checkbox" checked={autoClassify} onChange={e=>setAutoClassify(e.target.checked)} className="mr-2"/> Auto-classer par stats</label>
                      <Button size="sm" variant="outline" onClick={applyPositionPreset}>Preset Positions</Button>
                      <Button size="sm" variant="outline" onClick={presetOnlineMicro}>Stats Online Micro</Button>
                      <Button size="sm" variant="outline" onClick={presetLive12}>Stats Live 1/2</Button>
                    </div>
                </div>
              </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Joueurs et Styles</CardTitle>
                    <CardDescription>Activez les adversaires et ajustez leurs statistiques de jeu.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                      {seats.map(s=> (
                        <div key={s.id} className={`p-2 rounded-lg border transition-all ${s.id === 1 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-gray-800/50 border-gray-300 dark:border-gray-700'}`}>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button onClick={()=> setSeats(prev=> prev.map(x=> x.id===s.id ? {...x, active: s.id===1 ? false : !x.active } : x))} disabled={s.id===1} variant="outline" className={`font-semibold ${s.id===1 ? "text-blue-700 dark:text-blue-300" : s.active ? "text-green-700 dark:text-green-300" : "text-gray-500"}`}>
                              {s.id===1 ? "Siège 1 (Vous)" : `Siège ${s.id} ${s.active ? "(Actif)" : "(Couché)"}`}
                            </Button>
                            {s.id===dealerSeat && <Badge className="bg-gray-900 text-white dark:bg-white dark:text-gray-900">Dealer</Badge>}
                            {s.id!==1 && (<div className="text-sm">Style: <Badge variant={s.active ? "default" : "secondary"}>{s.range}</Badge></div>)}
                            {s.active && (
                              <div className="flex items-center gap-1 ml-auto">
                                <label htmlFor={`bet-${s.id}`} className="text-xs text-muted-foreground">Mise:</label>
                                <Input
                                  id={`bet-${s.id}`}
                                  type="number"
                                  min={0}
                                  value={playerBets[s.id] || ''}
                                  onChange={e => {
                                    const value = Number(e.target.value);
                                    setPlayerBets(prev => {
                                        const newBets = { ...prev };
                                        if (value > 0) {
                                            newBets[s.id] = value;
                                        } else {
                                            delete newBets[s.id];
                                        }
                                        return newBets;
                                    });
                                  }}
                                  className="h-7 w-20"
                                  placeholder="0"
                                />
                              </div>
                            )}
                          </div>
                          {s.id!==1 && s.active && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-3 gap-y-2 text-xs mt-2 pt-2 border-t border-gray-300 dark:border-gray-700">
                              <div className="flex flex-col">
                                <StatLabel text="VPIP" tip="Voluntarily Put In Pot: % de mains jouées volontairement."/>
                                <Input type="number" value={(stats[s.id]?.vpip ?? defaultStats.vpip)} onChange={e=> setStats(prev=> ({...prev, [s.id]: {...(prev[s.id]||defaultStats), vpip: Number(e.target.value)||0 }}))} className="h-7"/>
                              </div>
                              <div className="flex flex-col">
                                <StatLabel text="PFR" tip="Pre-Flop Raise: % de mains relancées préflop."/>
                                <Input type="number" value={(stats[s.id]?.pfr ?? defaultStats.pfr)} onChange={e=> setStats(prev=> ({...prev, [s.id]: {...(prev[s.id]||defaultStats), pfr: Number(e.target.value)||0 }}))} className="h-7"/>
                              </div>
                              <div className="flex flex-col">
                                <StatLabel text="AF" tip="Aggression Factor: (Bets + Raises) / Calls. Mesure l'agressivité post-flop."/>
                                <Input type="number" value={(stats[s.id]?.af ?? defaultStats.af)} onChange={e=> setStats(prev=> ({...prev, [s.id]: {...(prev[s.id]||defaultStats), af: Number(e.target.value)||0 }}))} className="h-7"/>
                              </div>
                              <div className="flex flex-col">
                                <StatLabel text="3BET" tip="% de sur-relances préflop."/>
                                <Input type="number" value={(stats[s.id]?.threebet ?? defaultStats.threebet)} onChange={e=> setStats(prev=> ({...prev, [s.id]: {...(prev[s.id]||defaultStats), threebet: Number(e.target.value)||0 }}))} className="h-7"/>
                              </div>
                              <div className="flex flex-col">
                                <StatLabel text="C-BET" tip="Continuation Bet: % de mise en continuation au flop."/>
                                <Input type="number" value={(stats[s.id]?.cbet ?? defaultStats.cbet)} onChange={e=> setStats(prev=> ({...prev, [s.id]: {...(prev[s.id]||defaultStats), cbet: Number(e.target.value)||0 }}))} className="h-7"/>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Votre Main & le Board</CardTitle>
                <CardDescription>Sélectionnez vos cartes et celles du board.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 text-center">Votre Main</h4>
                    <div className="flex justify-center gap-2">
                      {slots.slice(0, 2).map(sl => (
                        <Slot key={sl.key} label={sl.label} value={cards[sl.key]} onClear={()=>clearSlot(sl.key)} onFocus={()=>setFocus(sl.key)} focused={focus===sl.key} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 text-center">Board</h4>
                    <div className="flex justify-center flex-wrap gap-2">
                      {slots.slice(2).map(sl => (
                        <Slot key={sl.key} label={sl.label} value={cards[sl.key]} onClear={()=>clearSlot(sl.key)} onFocus={()=>setFocus(sl.key)} focused={focus===sl.key} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={randomizeHole}><Dice6 className="w-4 h-4 mr-2"/>Main Aléatoire</Button>
                  <Button variant="destructive" size="sm" onClick={clearAll}><Trash2 className="w-4 h-4 mr-2"/>Tout Effacer</Button>
                </div>
              </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Sélecteur de Cartes</CardTitle>
                    <CardDescription>Cliquez sur une carte pour l'assigner au champ sélectionné.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800/50">
                        <div className="grid grid-cols-13 gap-1">
                          {RANKS.map(r => (<div key={r} className="text-center text-xs font-mono text-muted-foreground">{r}</div>))}
                          {SUITS.map(s => RANKS.map(r => {
                            const code = `${r}${s}` as CardCode; const disabled = cards[focus] !== code && usedSet.has(code);
                            return (<CardButton key={code} code={code} disabled={disabled} onPick={(c)=> assignCard(focus, c)} />);
                          }))}
                        </div>
                    </div>
                </CardContent>
            </Card>
          </div>
        </div>

        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Analyse & Décision</CardTitle>
                <CardDescription>Évaluez la situation avec l'équité requise, le Bluff-O-Meter et une recommandation.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4 items-start">
                <div className="space-y-4 p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
                    <h3 className="font-semibold">Mises & Cote du Pot</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex-1"><label className="text-xs text-muted-foreground">Pot avant mises</label><Input type="number" min={0} value={pot} onChange={e=>setPot(Math.max(0, Number(e.target.value)||0))} /></div>
                      <div className="flex-1 space-y-1">
                        <label className="text-xs text-muted-foreground">À payer (call)</label>
                        <div className="font-bold text-lg h-10 flex items-center px-3">{toCall}</div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">Pot total après mises: <span className="font-bold">{currentPot}</span></div>
                    <div className="text-sm text-center text-muted-foreground">Équité requise: <span className="font-bold text-base text-gray-800 dark:text-gray-200">{pct(requiredEquity)}</span></div>
                </div>
                <div className="space-y-2 p-4 rounded-lg bg-gray-100 dark:bg-gray-800 text-center">
                    <h3 className="font-semibold">Bluff-O-Meter</h3>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{pct(bluffRateEst)}</div>
                    <p className="text-xs text-muted-foreground">Potentiel de bluff adverse basé sur le profil et le board.</p>
                </div>
                <div className="space-y-2 p-4 rounded-lg bg-gray-100 dark:bg-gray-800 text-center">
                    <h3 className="font-semibold">Bluff-O-Meter</h3>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{pct(bluffRateEst)}</div>
                    <p className="text-xs text-muted-foreground">Potentiel de bluff adverse basé sur le profil et le board.</p>
                </div>
                <div className="flex items-center justify-center">
                  <Button onClick={() => setShowDecisionPanel(true)}>Afficher la recommandation</Button>
                </div>
            </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Simulation Monte Carlo</CardTitle>
            <CardDescription>Estimez votre équité en simulant des milliers de mains contre les ranges adverses.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid lg:grid-cols-2 gap-6 items-center">
              <div className="space-y-4">
                <div>
                    <div className="text-sm text-muted-foreground mb-2">Itérations: <span className="font-semibold text-gray-900 dark:text-gray-100">{runs.toLocaleString()}</span></div>
                    <Slider value={[runs]} min={1000} max={50000} step={1000} onValueChange={([v])=>setRuns(v)} disabled={simRunning} />
                </div>
                <div className="flex items-center gap-2">
                  {!simRunning ? (
                    <Button onClick={runSim} disabled={!hero2 || opponents<1} >
                      <Play className="w-5 h-5 mr-2"/> Lancer la Simulation
                    </Button>
                  ) : (
                    <Button variant="destructive" onClick={stopSim} >
                      <Square className="w-5 h-5 mr-2"/> Stopper
                    </Button>
                  )}
                  <Button variant="outline" onClick={()=>{setResult({wins:0,ties:0,losses:0}); setProgress(0); setEquity(0);}}>
                    <RefreshCw className="w-4 h-4 mr-2"/> Reset
                  </Button>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-muted-foreground">Progression</span>
                        <span className="text-sm font-semibold">{progress}%</span>
                    </div>
                    <Progress value={progress} />
                </div>
                <div className="text-center">
                    <div className="text-3xl font-extrabold tracking-tight">Équité: <span className="px-3 py-1 rounded-lg bg-gray-900 text-white dark:bg-white dark:text-gray-900">{pct(equity)}</span></div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/50"><div className="text-xs text-green-800 dark:text-green-300 font-semibold">Victoires</div><div className="text-lg font-bold">{result.wins.toLocaleString()}</div></div>
                  <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/50"><div className="text-xs text-yellow-800 dark:text-yellow-300 font-semibold">Égalités</div><div className="text-lg font-bold">{result.ties.toFixed(1)}</div></div>
                  <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/50"><div className="text-xs text-red-800 dark:text-red-300 font-semibold">Défaites</div><div className="text-lg font-bold">{result.losses.toLocaleString()}</div></div>
                </div>
              </div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">Note: La simulation suppose que les adversaires jouent selon les ranges définies.</div>
          </CardContent>
        </Card>

        <footer className="text-center text-xs text-muted-foreground py-2">
            <p>⚠️ Outil à but éducatif. Les styles de jeu sont des heuristiques. Calibrez les stats pour de meilleurs résultats.</p>
            <p>Poker Coach Pro v3.4</p>
        </footer>
      </div>
      {showDecisionPanel && <DecisionPanel recommendation={recommendation} onClose={() => setShowDecisionPanel(false)} />}
    </div>
  );
}

// Mini tests (non-disruptive, for development only)
if (typeof window !== 'undefined') {
  try {
    const AKs = [parse("As" as CardCode), parse("Ks" as CardCode)];
    console.assert(inRange("tight", AKs[0], AKs[1])===true, "AKs should be in tight range");
    const Ad2c = [parse("Ad" as CardCode), parse("2c" as CardCode)];
    console.assert(inRange("tight", Ad2c[0], Ad2c[1])===false, "A2o should not be in tight range");
    const royalFlush = ["As","Ks","Qs","Js","Ts"].map(c=>parse(c as CardCode));
    console.assert(evaluate5(royalFlush).cat===8, "Royal flush should be category 8");
  } catch (e) {
    console.warn("Poker coach self-tests failed: ", e);
  }
}