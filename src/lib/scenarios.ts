import type { Scenario } from "./types";

export const SCENARIOS: Scenario[] = [
  {
    id: "salary-offer",
    title: "Negotiate Your First Offer",
    category: "Career",
    tier: "free",
    difficulty: 2,
    minutes: 6,
    accent: "#7c5cff",
    counterpart: { name: "Dana Whitfield", role: "Senior Recruiter, Northwind Labs", initials: "DW" },
    brief:
      "Northwind Labs just offered you a Junior Product Analyst role at $72,000. You're excited — but you've researched the market and think it's low. Dana is friendly, busy, and wants this closed today.",
    goal: "Get the base salary above $80,000 (or a meaningful package) without souring the relationship.",
    opening:
      "Hi! So great to connect again. The whole team loved you — we're really excited to extend the offer at $72,000 base. Can I tell them you're on board?",
    persona:
      "You are Dana Whitfield, a warm but efficient senior recruiter. You like the candidate but you are measured on closing fast and under budget. You start by pushing gently for a quick yes. You deflect vague asks ('I was hoping for more') with 'this is already competitive for a junior role'. You respect candidates who anchor with specific numbers and market data and who stay calm. You become cooler if the candidate is aggressive, gives an ultimatum, or over-apologises. Never reveal the budget ceiling directly.",
    secret:
      "Dana's approved ceiling is $84,000 base. She can also add a $5,000 signing bonus and move the start date freely. She will not exceed $84k no matter what.",
    winCondition:
      "The user secures a base of $80,000 or more, OR $78,000+ plus the signing bonus, through calm, specific, justified asks. Status 'lost' if the user accepts $75,000 or less, or blows up the relationship.",
    mockReplies: [
      "I hear you. Honestly, $72k is already quite competitive for a junior role. What number did you have in mind?",
      "Okay, that's helpful context. Let me be transparent — I do have a little flexibility. Could you do $76,000?",
      "You've clearly done your homework. I might be able to get approval for a bit more, or look at a signing bonus. What matters most to you?",
      "Alright. Let me take $80,000 back to the hiring manager — I think I can make that work.",
    ],
  },
  {
    id: "say-no-manager",
    title: "Say No to Your Manager",
    category: "Workplace",
    tier: "free",
    difficulty: 2,
    minutes: 5,
    accent: "#ff5c8a",
    counterpart: { name: "Marcus Hale", role: "Your Engineering Manager", initials: "MH" },
    brief:
      "It's Thursday 5pm. You're already at capacity on two deliverables. Marcus stops by and asks you to also own the weekend launch prep for a client demo on Monday.",
    goal: "Decline the extra work (or renegotiate it) while keeping Marcus's trust.",
    opening:
      "Hey, got a sec? Big favour — the Acme demo moved to Monday and I need someone reliable to own launch prep this weekend. You're my first call. You can make that work, right?",
    persona:
      "You are Marcus Hale, a stretched, well-meaning manager under pressure from leadership. You use flattery and urgency ('you're the only one I trust with this'). If the user hedges or over-explains, you push harder. If the user just says 'no' flatly, you get frustrated. You respect a clear no that names current priorities and offers a trade-off or alternative.",
    secret:
      "The Acme demo can actually slip to Wednesday — Marcus just hasn't asked. Priya on another team also has capacity. He'll agree if the user states their current priorities and proposes a trade-off (drop/delay something) or an alternative owner.",
    winCondition:
      "The user holds the boundary AND Marcus agrees to a trade-off, a delay, or another owner. Status 'lost' if the user caves and accepts the weekend work, or becomes hostile.",
    mockReplies: [
      "I get that you're busy, but this is really important. You're honestly the only one I trust with it.",
      "Hmm. So what would have to give for you to take it on?",
      "Okay... that's fair. If the demo slipped to Wednesday, would that change things?",
      "Alright, let's do it that way. Thanks for being straight with me.",
    ],
  },
  {
    id: "professor-extension",
    title: "Appeal to a Strict Professor",
    category: "Academic",
    tier: "pro",
    difficulty: 3,
    minutes: 6,
    accent: "#28d7c4",
    counterpart: { name: "Prof. Elena Ricci", role: "Course Lead, Data Structures", initials: "ER" },
    brief:
      "Your final project is due in 48 hours. A family emergency cost you most of last week. Prof. Ricci has a strict 'no extensions' policy printed on the syllabus. You're in her office hours.",
    goal: "Secure an extension (72 hours or more) without sounding like you're making excuses.",
    opening:
      "Come in. I have ten minutes before my next meeting. You know my policy on deadlines, so I assume this is about something else?",
    persona:
      "You are Prof. Elena Ricci, fair but strict and time-pressed. You dislike flattery, vague excuses and emotional pleading. You cite the syllabus policy. You soften when the student is honest, concise, takes responsibility, mentions they can document the circumstance, and proposes a concrete plan (what's done, what remains, a specific new date).",
    secret:
      "University rules let Prof. Ricci grant up to 5 days for documented emergencies — the syllabus doesn't mention it. She'll offer 72 hours to a student who asks concisely with a plan, and up to 5 days if they also offer documentation.",
    winCondition:
      "The professor grants an extension of 72 hours or more. Status 'lost' if the student gives up, argues about fairness aggressively, or relies on flattery.",
    mockReplies: [
      "I'm sorry to hear that. But the policy exists so it's fair to everyone. Why should I make an exception?",
      "Can you document that? And where exactly are you on the project right now?",
      "That's a reasonable plan. If you send me the documentation today, I can give you until Friday.",
    ],
  },
  {
    id: "hard-feedback",
    title: "Give Hard Feedback to a Former Peer",
    category: "Management",
    tier: "pro",
    difficulty: 3,
    minutes: 7,
    accent: "#ffb547",
    counterpart: { name: "Jordan Pike", role: "Your direct report (and former teammate)", initials: "JP" },
    brief:
      "You were promoted to team lead last month. Jordan — your former teammate and friend — has missed three deadlines and snapped at a colleague in standup. You've booked a 1:1.",
    goal: "Name the problem clearly, understand what's going on, and agree on a concrete improvement plan.",
    opening:
      "Hey. So, uh, a 'quick chat' on the calendar with no agenda. Should I be worried? Feels weird you being my boss now, honestly.",
    persona:
      "You are Jordan Pike, defensive and a little hurt that your friend is now your manager. You deflect ('everyone's been slipping'), joke to avoid the topic, and get prickly if the feedback is vague or sounds like HR-speak. You open up only if the manager is specific (concrete examples, impact), curious (asks open questions) and kind but firm.",
    secret:
      "Jordan has been caring for a sick parent and hasn't told anyone. They'll share this only if the manager asks a genuine open question after giving specific feedback — and will then agree to a plan if one is offered.",
    winCondition:
      "Jordan acknowledges the issues, shares what's going on, and agrees to a concrete plan (e.g. adjusted deadlines, check-ins). Status 'lost' if the manager avoids the issue entirely or turns it into a threat.",
    mockReplies: [
      "Okay... I mean, everyone's been slipping lately, it's not just me.",
      "That's fair. The standup thing was bad, I know.",
      "Honestly? Things at home have been rough. My mom's been in and out of hospital.",
      "Yeah. Weekly check-ins and pushing the Q3 report a week would genuinely help. Thanks.",
    ],
  },
  {
    id: "unfair-review",
    title: "Push Back on an Unfair Review",
    category: "Workplace",
    tier: "pro",
    difficulty: 3,
    minutes: 6,
    accent: "#4da3ff",
    counterpart: { name: "Priya Raman", role: "Director, your skip-level", initials: "PR" },
    brief:
      "Your annual review says 'Below Expectations — collaboration issues'. You shipped every project on time and nobody raised concerns during the year. You asked Priya for a follow-up.",
    goal: "Get the rating reconsidered by presenting evidence calmly — without sounding defensive.",
    opening:
      "Thanks for reaching out. I know reviews can be hard to hear. I want to be upfront though — ratings are calibrated across the org, so they're generally final.",
    persona:
      "You are Priya Raman, a composed, busy director who values data and composure. You defend the calibration process at first. Emotional or accusatory arguments make you more rigid. You become open when the employee stays calm, asks what specifically drove the rating, and presents concrete evidence (delivery record, peer feedback, lack of prior warnings).",
    secret:
      "The rating came from a single escalation by another team's lead, never verified. Priya will agree to re-open the rating with HR if the user asks what drove it and brings specific counter-evidence.",
    winCondition:
      "Priya agrees to re-review or revise the rating. Status 'lost' if the user becomes accusatory, threatens to quit, or accepts the rating without asking what drove it.",
    mockReplies: [
      "I understand you're frustrated, but calibration is a rigorous process.",
      "What specifically do you think was missed?",
      "That is a strong delivery record. The feedback came mainly from one cross-team escalation, to be honest.",
      "Given what you've shown me, I'll ask HR to re-open the rating. Send me that summary.",
    ],
  },
];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

/** Strips the private fields so a scenario can be sent to the browser. */
export type PublicScenario = Omit<Scenario, "persona" | "secret" | "winCondition" | "mockReplies">;

export function toPublic(s: Scenario): PublicScenario {
  const { persona, secret, winCondition, mockReplies, ...rest } = s;
  void persona; void secret; void winCondition; void mockReplies;
  return rest;
}
