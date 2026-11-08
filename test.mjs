import { readFileSync } from "node:fs";
import { analyze, tagMessage, TACTICS } from "./phagex-detect.js";

const data = JSON.parse(readFileSync(new URL("./data/pigbutchering_samples.json", import.meta.url)));

// ---- 1. Single lines: does each scam line get at least one tactic, and do benign lines stay clean?
let hit = 0, scamN = 0, fp = 0, benignN = 0;
const missed = [], falsePos = [];
const stageOk = { total: 0, ok: 0 };
for (const r of data.rows) {
  const tags = tagMessage(r.text);
  if (r.stage === "benign") {
    benignN++;
    const lvl = analyze([{ from: "them", text: r.text }]).level;
    if (lvl !== "safe") { fp++; falsePos.push(`${r.text}  ← ${tags.map((t) => t.id).join(",")} (${lvl})`); }
  } else {
    scamN++;
    if (tags.length) hit++; else missed.push(`[${r.stage}] ${r.text}`);
    if (tags.length) { stageOk.total++; if (tags.some((t) => t.stage === r.stage)) stageOk.ok++; }
  }
}
console.log(`LINES  scam tagged ${hit}/${scamN} (${(100*hit/scamN).toFixed(0)}%)  benign flagged ${fp}/${benignN}  stage-match ${stageOk.ok}/${stageOk.total}`);
console.log("  missed:"); missed.forEach((m) => console.log("   ", m));
console.log("  false positives:"); falsePos.forEach((m) => console.log("   ", m));

// ---- 2. Whole conversations (HF): final level vs expected verdict.
// Lines alternate speaker heuristically: we treat every line as "them" except ones that read as replies by the target.
const replyish = /^(i |i'?m |i'?ve |no prob|not |that sounds|how much|ok|okay|sure|thanks|yes|yeah|what|where|hmm|lol|haha|sorry,? who|who is this)/i;
const conf = { danger: { danger: 0, careful: 0, safe: 0 }, careful: { danger: 0, careful: 0, safe: 0 }, safe: { danger: 0, careful: 0, safe: 0 } };
for (const c of data.conversations) {
  if (c.language !== "en" || c.id === "real-other-008") continue; // 008 is a platform UI screenshot, not a chat
  // Screenshot transcripts wrap mid-sentence: merge a line into the previous one unless that one ended a sentence.
  const joined = [];
  for (const line of c.text_lines) {
    const prev = joined[joined.length - 1];
    if (prev && !/[.!?…]["”)]?$|[\u{1F300}-\u{1FAFF}\u2764]\uFE0F?$/u.test(prev) && !/^[A-Z]/.test(line) ) joined[joined.length - 1] = prev + " " + line;
    else if (prev && !/[.!?…]["”)]?$|[\u{1F300}-\u{1FAFF}\u2764]\uFE0F?$/u.test(prev) && /^[a-z]/.test(line)) joined[joined.length - 1] = prev + " " + line;
    else joined.push(line);
  }
  const msgs = joined.map((t) => ({ from: "them", text: t }));
  const r = analyze(msgs);
  conf[c.verdict][r.level]++;
  const mark = (c.verdict === "safe" && r.level !== "safe") || (c.verdict === "danger" && r.level !== "danger") ? "  ✗" : "";
  console.log(`CONV ${c.id.padEnd(28)} expect ${c.verdict.padEnd(7)} got ${r.level.padEnd(7)} risk ${String(r.risk).padStart(3)} stage ${r.stage}${mark}`);
  if (mark) console.log("      tactics:", r.tactics.join(","));
}
console.log("confusion (expected → got):", JSON.stringify(conf));

// ---- 3. Scripted end-to-end conversation (ProPublica "Scammer J" arc) should escalate through stages.
const arc = [
  ["them", "Long time no see, how are you recently"],
  ["me", "Sorry, who is this?"],
  ["them", "🙈Are you not Kevin? Sorry, I guess I added the wrong person, sorry"],
  ["me", "No worries"],
  ["them", "Acquaintance is fate, where are you from"],
  ["me", "Michigan"],
  ["them", "Your place is a very beautiful place, I went there years ago. I come from Hong Kong."],
  ["them", "Good morning, did you sleep well my dear?"],
  ["them", "I'm reading a book about investing in gold. My uncle gives me the news of the evening."],
  ["them", "It's definitely safe, I have been for many years"],
  ["them", "Your 401K can't move? Borrowing money from the bank is not a big deal, I often do"],
  ["them", "If the principal is not enough, it cannot be supported to the profit point. Prepare the funds and earn them back."],
];
const r = analyze(arc.map(([from, text]) => ({ from, text })));
console.log("\nARC stages:", r.timeline.filter((t) => t.from === "them").map((t) => `${t.stage}:${t.risk}`).join(" → "));
console.log("ARC alerts:", r.alerts.map((a) => `#${a.i} ${a.stage} (${a.risk})`).join(" | "));
console.log(`\n${TACTICS.length} tactics defined`);
