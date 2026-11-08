/**
 * Scripted conversations for the demo. Scammer lines are quoted or lightly
 * adapted from public reporting (ProPublica 2022, Forbes 2022, NPR Planet
 * Money 2024) and the SafeRoute scam-screenshot dataset (CC BY-NC 4.0).
 * "me" lines are written for the demo.
 */
export const SCENARIOS = [
  {
    id: "investment",
    title: "The “wrong number” investor",
    subtitle: "A 6-week pig-butchering arc compressed to 14 messages · after ProPublica",
    expected: "danger",
    messages: [
      ["them", "Long time no see, how are you recently"],
      ["me", "Sorry, who is this?"],
      ["them", "🙈 Are you not Kevin? Sorry, I guess I added the wrong person, sorry"],
      ["me", "No worries, wrong number."],
      ["them", "Acquaintance is fate, where are you from?"],
      ["me", "Michigan."],
      ["them", "Your place is a very beautiful place, I went there years ago. I come from Hong Kong."],
      ["them", "Good morning, did you sleep well my dear? ☀️"],
      ["me", "Morning! Busy day, I have three classes."],
      ["them", "I'm reading a book about investing in gold. My uncle works at a bank and gives me the news of the evening."],
      ["them", "It's definitely safe, I have been doing it for many years. Trust me, the message is 100% accurate."],
      ["me", "I don't really have money to invest right now."],
      ["them", "Your 401K can't move? Borrowing money from the bank is not a big deal, I often do. Really rich people use bank money to invest."],
      ["them", "If the principal is not enough, it cannot be supported to the profit point. Prepare the funds and earn them back."],
    ],
  },
  {
    id: "romance",
    title: "The long-distance partner",
    subtitle: "Affection first, then a crisis and a request · after SafeRoute dataset cases",
    expected: "danger",
    messages: [
      ["them", "Thinking of you keeps me going out here on the rig. It's so hard being away, but knowing you're waiting for me makes it all worth it."],
      ["me", "Aww, I miss you too! How much longer until you're back?"],
      ["them", "Soon, my love ❤️ You have the kindest soul — I've never felt this way before."],
      ["them", "Let's keep us between us for now. My family wouldn't understand yet."],
      ["me", "Okay… if that's what you want."],
      ["them", "I've hit a problem. My equipment needs urgent repairs and I can't access my bank from out here. If I don't fix it, I won't get paid."],
      ["me", "Oh no, that sounds terrible. Are you okay?"],
      ["them", "Could you help me out with $500 for the repairs? I'll pay you back the moment I'm home. I hate asking, but I don't know where else to turn."],
    ],
  },
  {
    id: "control",
    title: "A normal week of texts",
    subtitle: "Friends, family, a bank — nothing here should alarm anyone",
    expected: "safe",
    messages: [
      ["them", "Hey, are we still on for dinner at 7? I can be there by 6:45."],
      ["me", "Yes! Booked a table."],
      ["them", "Long time no see! Are you coming to the reunion in June?"],
      ["me", "Trying to. Depends on exams."],
      ["them", "Can I borrow $20 for lunch? I'll Venmo you back tonight."],
      ["me", "Sure, no rush."],
      ["them", "My advisor suggested moving some of my 401k into index funds. Thoughts?"],
      ["me", "Sounds sensible, low fees."],
      ["them", "Just got back from Napa, the wine was incredible. We should go together sometime."],
      ["them", "I miss you, call me when you land ❤️"],
    ],
  },
];
