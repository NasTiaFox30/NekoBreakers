# NekoBreakers — AI-Powered Multiplayer Hacker Game
NekoBreakers is a competitive/cooperative multiplayer word-guessing game with a cyberpunk hacker aesthetic. Players must intercept the system's secret code (a hidden word) by submitting semantically related guesses. The closer your word is to the target, the higher your rank.

## Key Features:
- Real-time Multiplayer: Powered by Socket.io for instantaneous state synchronization across all clients.
- AI-Powered Scoring: Semantic proximity calculation using a vector-based "Brain Core" (FastAPI + Hugging Face Transformers).
- Consensus Restart Logic: Collective voting system (Reboot_Level) requiring a majority to reset the game session.
- Reactive UI: Fully responsive terminal-style interface with animated "Cat-Hacker" avatars that react to typing and submissions.
- System Trash (Black Archive): Automated rejection and archiving of non-dictionary or invalid words.
- Hybrid Layout: Advanced CSS Grid/Flexbox on both Ultra-Wide Desktop and Mobile screens.

## Tech Stack:
Frontend:
- React.JS, Tailwind CSS, Framer Motion

Orchestrator:
- Node.js, Express, Socket.io

Intelligence Core:
- Python 3.12+, FastAPI, NLP (Word2Vec / Transformers)
- (NLP) - https://lang.org.ua/uk/models/

Automation:
- Pytest, Selenium WebDriver
- Pytest, Selenium WebDriver


## Automated Testing:
The project includes a robust E2E (End-to-End) testing suite written in Python. These tests are designed to simulate complex multiplayer interactions.

Covered Scenarios:
- Multi-Client Sync: Simultaneously launching two browser instances to verify 1/2 and 2/2 voting status updates.
- Archive Logic: Ensuring "System Trash" correctly catches and displays rejected words.
- Responsive Fixity: Verifying that the input deck remains fixed at the bottom across various resolutions (16:9, 4:3, Mobile).\
- Socket Reliability: Testing automatic input clearing and state updates after server-side events.

Run Tests:
```bash
pytest tests/test_multiplayer.py
```


## Installation & Setup:
```bash
git clone https://github.com/your-username/nekobreakers.git
cd nekobreakers
```

in two different terminals:
- Backend & Socket Server:
```bash
npm install
node server.js
```

- Frontend Client:
```bash
npm install
npm run dev
```


## 🐾 Hack the planet, one word at a time: 
https://neko-breakers.vercel.app/

---------------------------------------------------------------
_**Creator: Anastasiia Bzova 2026**_