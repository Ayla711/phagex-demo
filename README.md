# PhageX — conversation-level scam detector (prototype)

A rule-based, zero-dependency detector for pig-butchering / romance-investment scams. It reads a chat as a sequence, tags manipulation tactics on each message, tracks the conversation through the stages victims describe (Trapping → Raising → Killing → Killed) and raises a warning only when the stage advances toward money. Everything runs in the browser; nothing is uploaded.

Live demo: https://ayla711.github.io/phagex-demo/ · Case study: https://yuanqianayla.com/project/phagex/

## Files

- `index.html`, `style.css`, `app.js` — the demo page
- `phagex-detect.js` — the detector (`analyze(messages)`, `tagMessage(text)`, `TACTICS`)
- `scenarios.js` — three scripted conversations
- `data/pigbutchering_samples.{json,csv}` — the sample set: 115 single lines (86 real scammer lines, 9 training-manual instructions, 20 benign controls) and 32 full conversations from the SafeRoute dataset
- `test.mjs` — evaluation (`node test.mjs`)

## Results (tuned on this same data — treat as a sanity check, not a benchmark)

- 95 real scam lines: 87% receive at least one tactic; 74/83 land on the correct stage
- 20 benign look-alikes: 0 false alarms
- 17 English conversations: 10/11 scams → danger, 4/4 safe → safe; the miss is a pure wrong-number opener that never mentions money (reported as *careful*)

## Sources

Scammer lines are quoted or lightly adapted from ProPublica (2022), Forbes (2022), NPR Planet Money (2024), a leaked 2019 training manual reprinted by SCARS, Acharya et al. (arXiv 2412.15423) and the SafeRoute scam-screenshot dataset (Rickaym/saferoute-scam-screenshots, CC BY-NC 4.0). Full attributions are in `data/pigbutchering_samples.json`.

## License

Code: MIT. Data: see per-source licences above; the SafeRoute rows are CC BY-NC 4.0 and must not be used commercially.
