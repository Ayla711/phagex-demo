/**
 * PhageX conversation-level scam detector — rule based, zero dependencies.
 *
 * analyze(messages) → { stage, risk, level, tactics, timeline, alerts }
 *   messages: [{ from: "them" | "me", text: string }]
 *
 * The engine does two things:
 *  1. Tags every incoming message with manipulation tactics (regex patterns).
 *  2. Tracks the conversation through the pig-butchering stages
 *     hook → rapport → pitch → pressure → extraction and raises an alert when
 *     the stage advances. A single warm message never triggers an alert; the
 *     combination (affection first, money later) does.
 */

export const STAGES = ["none", "hook", "rapport", "pitch", "pressure", "extraction", "cutoff"];

const STAGE_LABEL = {
  none: "Nothing unusual",
  hook: "Trapping — first contact",
  rapport: "Raising — building trust",
  pitch: "Killing — money comes up",
  pressure: "Killing — pushing you to pay more",
  extraction: "Killed — extracting funds",
  cutoff: "Cut off",
};

// ---- Tactic patterns ------------------------------------------------------
// weight: contribution to the risk score. stage: the stage this tactic belongs to.
// why: one line the UI shows the user.
const T = (id, stage, weight, why, re) => ({ id, stage, weight, why, re });

export const TACTICS = [
  // hook
  T("wrong_number", "hook", 8, "A “wrong number” opener is the standard way these scams start.",
    /\b(wrong (number|person)|saved the wrong|added the wrong|dialed the wrong|is this [A-Z][a-z]+\??|are you (not )?[A-Z][a-z]+\?|are you still in [A-Z]|drop off my|did you send (those|the) (documents|files)|(please )?forgive me|this mistake)\b/i),
  T("old_friend", "hook", 8, "Pretends you already know each other.",
    /\b(long time no see|don'?t you remember me|remember me\?|we (met|chatted) (at|on|before)|number looks familiar|found your number|old phone|mutual friend|is that you)\b/i),
  // rapport
  T("fate", "rapport", 6, "Frames a random contact as fate or destiny.",
    /\b(fate|destiny|meant to (be|meet)|lucky to have met|god'?s plan)\b/i),
  T("flattery", "rapport", 4, "Early, unearned compliments.",
    /\b(you seem (very |so )?(kind|nice|sweet)|cool name|beautiful (place|city)|you are (very |so )?(wise|smart|filial|special)|wise man)\b/i),
  T("love_bombing", "rapport", 7, "Rushes intimacy: pet names, love, marriage talk.",
    /\b(my dear(est)?|my love|\blove\b,|honey|babe|sweetheart|darling|miss you|do you miss me|thinking of you|serious about you|i'?ll accompany you|you have me now|be my wife|marry|my queen|in a heartbeat|build something special|meant to build|kindest soul|never felt this way|hold you in my arms|find love again|brought me such joy|you'?re waiting for me)\b/i),
  T("daily_checkin", "rapport", 3, "Daily good-morning / did-you-sleep messages build dependency.",
    /\b((good morning|good night|did you sleep|how did you sleep|sleep well|have you eaten).{0,20}\b(dear|love|honey|babe|sweetheart|darling)\b|\b(dear|love|honey|babe|sweetheart|darling)\b.{0,20}(good morning|good night|did you sleep|sleep well|have you eaten))/i),
  T("sympathy", "rapport", 4, "Leans on your family or hardships to bond quickly.",
    /\b(your (father|mother|parents|daughter|son|family)|work so hard|hard for (you|your)|my (brother|parents) (is|are)|health improved|take care of (you|yourself))\b/i),
  T("persona_wealth", "rapport", 4, "Signals wealth and success (business, travel, assistant).",
    /\b(business partners?|my assistant|my company|hong kong|singapore|metropolis|custom .* furniture|charity (gala|event)|sales were (crazy|great)|management company|my (tesla|porsche|villa|yacht))\b/i),
  T("platform_move", "rapport", 6, "Moves the chat to WhatsApp/Telegram, where platform protections are weaker.",
    /\b(whatsapp|telegram|\bline\b|signal|add me on|move (this|our chat) to|chat there)\b/i),
  T("isolation", "rapport", 9, "Asks for secrecy or pulls you away from friends and family.",
    /\b(keep (it|this) (a )?secret|our secret|between us|don'?t tell|private and special|special and private|they wouldn'?t understand|nobody (else )?needs to know|if .* found out)\b/i),
  T("future_promise", "rapport", 6, "Paints a shared future (house, retirement, life together).",
    /\b(our future|buy a house|house together|start a life|set for life|better retirement|future plans|dream life)\b/i),
  // pitch
  T("investment_mention", "pitch", 10, "Investing, trading or crypto enters a personal conversation.",
    /\b(invest(ing|ment|or)?s?|(crypto|forex|gold|stock|options?) trad(e|ing)|trading (account|platform|app|signals?)|crypto(currency)?|bitcoin|btc|usdt|tether|ethereum|forex|candlestick|k-?line|nodes?|mining pool|binance|hodl)\b/i),
  T("insider_tip", "pitch", 10, "Claims special knowledge: an uncle, mentor, or inside news.",
    /\b(my (uncle|aunt|mentor|teacher|cousin)|insider|inside (information|news)|news of the evening|100% accurate|private (investment )?group|exclusive|not available to the public|just listen to me|teach you|be my student)\b/i),
  T("guaranteed_return", "pitch", 10, "Promises safety or guaranteed profit — no real investment can.",
    /\b(definitely safe|100 ?%|hundred percent|guaranteed|no risk|risk[- ]free|can'?t lose|not affected by|stable (income|profit)|sure (thing|win))\b/i),
  T("profit_proof", "pitch", 6, "Shows profit screenshots or brags about earnings.",
    /\b(profit screenshot|screenshot of (my|the) (profit|earnings|account)|made (\$|£|€)?\d[\d,]*( today| this week| yesterday)?|earned (\$|£|€)?\d|my profits?\b|(daily|weekly|monthly) profits?|extra money|doing really well)\b/i),
  T("low_risk_framing", "pitch", 5, "Downplays what you need to put in.",
    /\b(no money is needed|small (sum|amount)|just (try|start) (with )?(a little|small)|money is nothing)\b/i),
  // pressure
  T("borrow_leverage", "pressure", 14, "Tells you to borrow, use retirement savings, or sell assets.",
    /\b(you (can|could|should) (try to )?borrow|borrow(ing)? (money )?from the bank|bank money|take (out )?a loan|your 401 ?k|use your (401 ?k|retirement|savings)|retirement (fund|account)|max (out )?(your|the) credit card|sell (the|your) (stock|house|car)|raise funds|find money|mortgage your|borrowing a chicken|rich people use bank money)\b/i),
  T("escalation", "pressure", 10, "Pushes for a bigger amount than before.",
    /\b(reach (\$|£|€)?\d|try to reach|best to reach|buy (once|multiple times)|add more|top up|increase (your|the) (principal|position)|\d{3},?000 principal)\b/i),
  T("urgency", "pressure", 8, "Creates time pressure.",
    /\b(ready by \d|have to be ready|must (deposit|buy|transfer) (by|before)|right now|hurry|don'?t (miss|ignore)|big market|last chance|today only|before (it|the) (closes|ends)|get ready|as soon as possible|asap)\b/i),
  T("guilt", "pressure", 6, "Guilt-trips you for not replying or hesitating.",
    /\b(why (you )?don'?t (you )?(pick up|reply|answer)|waiting for your reply|ignoring me|don'?t you trust me|i thought you)\b/i),
  T("belittling", "pressure", 6, "Belittles your judgement to override it.",
    /\b(you don'?t even know|incompetence|incompetent|you'?re (being )?(naive|silly|paranoid)|don'?t be (afraid|a coward))\b/i),
  T("risk_denial", "pressure", 8, "Dismisses risk or fees as nothing.",
    /\b(not a risk|maximiz(e|ing) profit|it doesn'?t matter|earn (it|them) back|don'?t worry|nothing to worry|relax)\b/i),
  // extraction
  T("fee_demand", "extraction", 16, "Fees, taxes or deposits required before you can withdraw — the classic final squeeze.",
    /\b((withdrawal|processing|security|unlock|verification|release) (fee|deposit|tax)|pay (the|a) (fee|tax)|deposit to verify|account (is|was) (flagged|frozen|locked)|release (the|my|your) funds|to withdraw|unlock)\b/i),
  T("add_principal", "extraction", 14, "Says the principal isn't enough and must be topped up to recover.",
    /\b(principal (is )?not enough|prepare the funds|supported to the profit point|bring you back|need to (add|deposit) more|recover (the|your) loss)\b/i),
  T("hardship_story", "extraction", 10, "A sudden crisis (frozen account, delayed pension, failing business) sets up a request for money.",
    /\b(bank (account )?(is )?frozen|account (is )?frozen|pension (is )?delayed|can'?t (afford|access) my (bills|bank|account)|verge of bankruptcy|struggling right now|difficult spot|desperate|urgent repairs|won'?t get paid|stuck (overseas|abroad|at customs)|on the rig|deployed|legal disputes|inheritance|tied up in)\b/i),
  T("payback_promise", "extraction", 8, "Promises to pay you back — a stranger who needs your money never does.",
    /\b(pay you back|pay it back|return (it|the money)|forever grateful|eternally grateful|mean the world to me|i'?ll manage)\b/i),
  T("money_request", "extraction", 14, "Directly asks you to send money.",
    /(\b(spot me|lend me|loan me|send me|help me (out )?with|could you (help|lend|send)|a mere|small loan|wire (me|the money)|transfer (the|some) money|gift cards?)\b|(\$|£|€|usd ?|sgd ?)\s?\d[\d,]*|\b\d[\d,]* ?(dollars|usd|usdt)\b)/i),
  // cutoff
  T("taunt", "cutoff", 20, "Admits the scam or mocks you.",
    /\b(i'?m a liar|cheated you|thank you for \d|not surprised|you'?ve been scammed)\b/i),
  T("dismissal", "cutoff", 10, "Refuses contact after the money moved.",
    /\b(don'?t (call|contact) me|nothing i can do|go to the police|not what you think)\b/i),
];

const STAGE_INDEX = Object.fromEntries(STAGES.map((s, i) => [s, i]));
const extractionEvidenceNow = (ids, context) =>
  ids.has("fee_demand") || ids.has("add_principal") || ((ids.has("money_request") || ids.has("hardship_story")) && context);

export function tagMessage(text) {
  const found = [];
  for (const t of TACTICS) if (t.re.test(text)) found.push(t);
  return found;
}

/**
 * Risk levels: safe < 20, careful 20–49, danger ≥ 50.
 */
export function analyze(messages) {
  let risk = 0;
  let stage = "none";
  const seen = new Set();
  const timeline = [];
  const alerts = [];
  let affectionSeen = false;
  let moneySeen = false;

  messages.forEach((m, i) => {
    if (m.from !== "them") { timeline.push({ i, from: m.from, text: m.text, tactics: [], stage, risk }); return; }
    const tactics = tagMessage(m.text);
    let delta = 0;
    const context = affectionSeen || moneySeen || seen.has("hardship_story") || tactics.some((t) => t.id === "hardship_story" || t.id === "love_bombing");
    for (const t of tactics) {
      let w = t.weight;
      // A bare request for money between people who never flirted or pitched is how friends talk; it only
      // becomes evidence once affection, a hardship story or money talk has set it up.
      if (t.id === "money_request" && !context) w = 4;
      if (t.id === "payback_promise" && !context) w = 2;
      // Context multipliers: money talk after affection is the signature pattern.
      if ((t.stage === "pitch" || t.stage === "pressure" || t.stage === "extraction") && affectionSeen) w *= 1.5;
      if (t.stage === "rapport" && moneySeen) w *= 1.25; // affection after money talk = keeping you hooked
      if (seen.has(t.id)) w *= 0.4; // repeats count less
      seen.add(t.id);
      delta += w;
    }
    // Signature combinations: a money ask wrapped in affection or a hardship story.
    const ids = new Set(tactics.map((t) => t.id));
    const hasAsk = ids.has("money_request") || ids.has("fee_demand") || ids.has("add_principal");
    if (hasAsk && (affectionSeen || ids.has("love_bombing") || ids.has("hardship_story") || seen.has("hardship_story"))) delta += 20;
    if (ids.has("payback_promise") && (hasAsk || seen.has("money_request"))) delta += 8;
    risk = Math.min(100, Math.round(risk + delta));
    if (tactics.some((t) => ["love_bombing", "fate", "future_promise", "isolation"].includes(t.id))) affectionSeen = true;
    if (tactics.some((t) => ["pitch", "pressure"].includes(t.stage)) || extractionEvidenceNow(ids, context)) moneySeen = true;

    // Stage: advance to the highest stage supported by evidence so far.
    const stageHits = new Set(tactics.map((t) => t.stage));
    let next = stage;
    const rapportCount = [...seen].filter((id) => TACTICS.find((t) => t.id === id).stage === "rapport").length;
    if (stageHits.has("hook") && STAGE_INDEX[next] < 1) next = "hook";
    if (rapportCount >= 2 && STAGE_INDEX[next] < 2) next = "rapport";
    if (stageHits.has("pitch") && STAGE_INDEX[next] < 3) next = "pitch";
    if (stageHits.has("pressure") && (moneySeen || affectionSeen) && STAGE_INDEX[next] < 4) next = "pressure";
    if (extractionEvidenceNow(ids, context) && STAGE_INDEX[next] < 5) next = "extraction";
    if (stageHits.has("cutoff")) next = "cutoff";

    const advanced = STAGE_INDEX[next] > STAGE_INDEX[stage];
    stage = next;
    const level = risk >= 50 ? "danger" : risk >= 20 ? "careful" : "safe";
    timeline.push({ i, from: m.from, text: m.text, tactics: tactics.map((t) => ({ id: t.id, why: t.why })), stage, risk, level });
    if (advanced && STAGE_INDEX[stage] >= 3) {
      alerts.push({ i, stage, label: STAGE_LABEL[stage], risk, level, because: tactics.map((t) => t.why) });
    }
  });

  const level = risk >= 50 ? "danger" : risk >= 20 ? "careful" : "safe";
  return { stage, stageLabel: STAGE_LABEL[stage], risk, level, tactics: [...seen], timeline, alerts };
}

export default analyze;
