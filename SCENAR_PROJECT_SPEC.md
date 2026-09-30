# Scenar: AI High-Stakes Workplace & Academic Conversation Simulator

## Executive Overview
**Scenar** is an interactive AI high-stakes conversation simulator and negotiation copilot built for the **RevenueCat Shipaton 2026** ($740,000+ Prize Pool).

Scenar helps students, new managers, and professionals master difficult human conversations before the stakes are real - from negotiating job offers and salary raises to appealing university grades and setting tough workplace boundaries.

---

## Targeted Hackathon Categories ($60,000+ Total Potential Sweep)
1. **Next Gen Award (Student Exclusive - $20,000 1st Prize):** Tailored for active students (submitted via UNICAM student credentials). Judged on open-source code & 2-minute demo video without requiring paid Apple/Google developer accounts.
2. **Influencer Award - Career Coaching by Leadership Heather ($20,000 1st Prize):** Specifically targets difficult workplace conversations, active practice, confidence building, boundaries, and saying no.
3. **RevenueCat Design Award ($20,000 1st Prize):** Built with state-of-the-art glassmorphism, custom micro-interactions, responsive tension/confidence meters, and smooth paywall UI animations.

---

## Technical Architecture & RevenueCat Stack

```
+-------------------------------------------------------------------+
|               Scenario Selection & User Profile                   |
+---------------------------------+---------------------------------+
                                  |
                                  v
+---------------------------------+---------------------------------+
|       Real-Time AI Counterparty Engine & Tension Gauge            |
|    (Evaluates assertiveness, tone, filler words & counter-offers) |
+---------------------------------+---------------------------------+
                                  |
                                  v
+---------------------------------+---------------------------------+
|         RevenueCat Entitlement & Paywall Gateway                  |
|    (Powers Free vs. Pro Tiers: `@revenuecat/purchases-js`)         |
+---------------------------------+---------------------------------+
                                  |
                                  v
+---------------------------------+---------------------------------+
|          Post-Roleplay Radar & Tactical Executive Report          |
+-------------------------------------------------------------------+
```

### 1. RevenueCat Integration Layer
- **Package:** `@revenuecat/purchases-js` / REST API
- **Entitlements:**
  - `starter_scenarios` (Free access to 2 basic scenarios)
  - `scenar_pro` ($9.99/mo or $49.99/yr unlock for unlimited scenarios, AI Voice mode, custom scenario builder, and executive scoring transcripts)
- **Paywall UX:** Interactive RevenueCat Paywall v2 with dynamic billing toggle (Monthly vs Annual), 7-day trial countdown, and live entitlement status badge.

### 2. AI Conversation & Emotion Engine
- **Scenarios:**
  - *Academic:* Appealing a grade extension with a strict professor.
  - *Career:* Negotiating a starting salary / compensation package.
  - *Workplace:* Handling unfair feedback or saying "no" to unreasonable manager demands.
- **Evaluation Metrics:** Real-time scoring of Assertiveness, Emotional Regulation, Clarity, and Tactful Boundary Setting.

---

## Setup & Execution
1. Install dependencies: `npm install`
2. Add RevenueCat Web API Key to `.env.local`: `NEXT_PUBLIC_REVENUECAT_API_KEY=your_key`
3. Run dev server: `npm run dev`
