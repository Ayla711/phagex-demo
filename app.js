import { analyze, STAGES } from "./phagex-detect.js";
import { SCENARIOS } from "./scenarios.js";

const $ = (id) => document.getElementById(id);
const chatEl = $("chat"), tabsEl = $("tabs"), alertsEl = $("alerts"), stagesEl = $("stages");
const meterFill = $("meter-fill"), meter = $("meter"), riskNum = $("risk-num"), phoneTitle = $("phone-title");
const nextBtn = $("next"), playBtn = $("play"), resetBtn = $("reset");

const LEVEL_COLOR = { safe: "var(--safe)", careful: "var(--careful)", danger: "var(--danger)" };
const STAGE_TITLE = {
  hook: "First contact looks like a “wrong number”",
  rapport: "Trust is being built fast",
  pitch: "Money has entered a personal conversation",
  pressure: "You're being pushed to pay more, faster",
  extraction: "This is the moment money is lost",
  cutoff: "Contact is being cut off",
};

let scenario = SCENARIOS[0];
let messages = []; // full script
let shown = 0; // how many messages revealed
let timer = null;
let seenAlerts = 0;

function setScenario(s, custom = false) {
  stopPlay();
  scenario = s;
  messages = s.messages.map(([from, text]) => ({ from, text }));
  shown = 0;
  seenAlerts = 0;
  phoneTitle.textContent = custom ? "Pasted conversation" : s.title;
  render();
  [...tabsEl.children].forEach((b) => b.setAttribute("aria-selected", String(b.dataset.id === s.id)));
}

function render() {
  const visible = messages.slice(0, shown);
  const result = analyze(visible);
  // chat
  chatEl.innerHTML = "";
  result.timeline.forEach((t) => {
    const li = document.createElement("li");
    li.className = `msg ${t.from}`;
    li.textContent = t.text;
    if (t.tactics && t.tactics.length) {
      li.classList.add("flagged");
      li.style.setProperty("--flag", LEVEL_COLOR[t.level] || LEVEL_COLOR.careful);
      const tags = document.createElement("div");
      tags.className = "tags";
      t.tactics.forEach((x) => { const s = document.createElement("span"); s.className = "tag"; s.textContent = x.id.replace(/_/g, " "); s.title = x.why; tags.appendChild(s); });
      li.appendChild(tags);
    }
    chatEl.appendChild(li);
  });
  chatEl.scrollTop = chatEl.scrollHeight;
  // meter
  meterFill.style.width = `${result.risk}%`;
  meterFill.style.setProperty("--level", LEVEL_COLOR[result.level]);
  meter.setAttribute("aria-valuenow", result.risk);
  riskNum.textContent = result.risk;
  riskNum.style.color = result.risk ? LEVEL_COLOR[result.level] : "";
  // stages
  const idx = STAGES.indexOf(result.stage);
  [...stagesEl.children].forEach((li) => {
    const i = STAGES.indexOf(li.dataset.stage);
    li.classList.toggle("reached", i <= idx && idx > 0);
    li.classList.toggle("current", i === idx || (result.stage === "cutoff" && li.dataset.stage === "extraction"));
  });
  // alerts
  alertsEl.innerHTML = "";
  if (!result.alerts.length) {
    const p = document.createElement("p");
    p.className = "alerts-empty";
    p.textContent = shown === 0
      ? "Press “Next message” to start. PhageX stays quiet until the conversation turns toward money."
      : result.stage === "none"
        ? "Nothing unusual so far."
        : result.stage === "hook"
          ? "A wrong-number or old-friend opener. Common for scams, but also for real life — no warning yet."
          : "Friendly so far. PhageX is watching for money to come up.";
    alertsEl.appendChild(p);
  } else {
    [...result.alerts].reverse().forEach((a) => {
      const d = document.createElement("div");
      d.className = `alert ${a.level}`;
      d.innerHTML = `<h3>${STAGE_TITLE[a.stage] || a.label}</h3><p class="meta">${a.label} · risk ${a.risk} · message ${a.i + 1}</p><ul>${a.because.map((w) => `<li>${w}</li>`).join("")}</ul>`;
      alertsEl.appendChild(d);
    });
  }
  nextBtn.disabled = shown >= messages.length;
  playBtn.disabled = shown >= messages.length;
}

function step() { if (shown < messages.length) { shown++; render(); } if (shown >= messages.length) stopPlay(); }
function stopPlay() { if (timer) { clearInterval(timer); timer = null; playBtn.textContent = "Play all"; } }

nextBtn.addEventListener("click", step);
playBtn.addEventListener("click", () => {
  if (timer) { stopPlay(); return; }
  playBtn.textContent = "Pause";
  step();
  timer = setInterval(step, 1400);
});
resetBtn.addEventListener("click", () => { stopPlay(); shown = 0; render(); });

SCENARIOS.forEach((s) => {
  const b = document.createElement("button");
  b.className = "tab"; b.role = "tab"; b.dataset.id = s.id;
  b.innerHTML = `<b>${s.title}</b><span>${s.subtitle}</span>`;
  b.addEventListener("click", () => setScenario(s));
  tabsEl.appendChild(b);
});

$("paste-run").addEventListener("click", () => {
  const lines = $("paste-input").value.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return;
  const msgs = lines.map((l) => (/^me\s*:/i.test(l) ? ["me", l.replace(/^me\s*:\s*/i, "")] : ["them", l.replace(/^them\s*:\s*/i, "")]));
  setScenario({ id: "custom", title: "Pasted conversation", messages: msgs }, true);
  shown = msgs.length;
  render();
  document.querySelector(".stage-grid").scrollIntoView({ behavior: "smooth", block: "start" });
});

setScenario(SCENARIOS[0]);
