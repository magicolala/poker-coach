# Poker Coach Pro 🃏

Welcome to **Poker Coach Pro**, a powerful web-based tool designed to elevate your Texas Hold'em game. This application provides real-time equity calculation, opponent profiling, and data-driven decision support to help you make more informed choices at the poker table.

Whether you're a seasoned player looking to refine your strategy or a newcomer eager to learn, Poker Coach Pro is your personal guide to mastering the odds.

![Poker Coach Pro Screenshot](https://tinyurl.com/222eaydt)
> **Note:** Please replace the placeholder image URL with a real screenshot of your application for a more engaging presentation.

---

## ✨ Features

- **Interactive Card Selector**: Easily input your hole cards and the community cards on the board (Flop, Turn, River).
- **Dynamic Player Configuration**: Set the number of players at the table (2 to 9) and mark them as active or folded for accurate simulation.
- **Advanced Opponent Profiling**: Assign specific playing styles (e.g., *Tight*, *Loose*, *Maniac*) to your opponents, or define them using detailed VPIP, PFR, 3-Bet, and C-Bet stats.
- **Flexible Bet Management**: Input bets for each player on every street to dynamically calculate pot size, pot odds, and the exact amount to call.
- **Monte Carlo Equity Simulation**: Run thousands of hand simulations against opponent ranges to get a precise measure of your hand's equity.
- **Real-time Decision Aid**: Receive an instant recommendation (Fold, Call, Raise) based on your equity versus the required pot odds.
- **Bluff-O-Meter**: A unique tool that estimates the likelihood of an opponent bluffing based on their profile and the board texture.
- **Built-in Presets**: Quickly apply common statistical profiles for different game types, like "Online Micro-Stakes" or "Live $1/$2".

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Make sure you have the following software installed:

- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### Installation & Running

1. **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/poker-coach.git
    ```

    *(Replace `your-username` with your actual GitHub username)*

2. **Navigate to the project directory:**

    ```bash
    cd poker-coach
    ```

3. **Install dependencies:**

    ```bash
    npm install
    ```

4. **Run the development server:**

    ```bash
    npm run dev
    ```

5. **Open the application:**
    Open your web browser and navigate to `http://localhost:5173` (or the address shown in your terminal).

## 🛠️ How to Use

The interface is designed to be intuitive and efficient.

1. **Table Setup**: Begin by setting the number of players at the table and the position of the dealer button.
2. **Player Configuration**: For each opponent, mark them as active or folded. Use the stat inputs (VPIP, PFR, etc.) to define their play style, which automatically assigns a `Range` profile.
3. **Card Input**: Select the `Votre Main & le Board` section and click on a card slot (e.g., `Main 1`, `Flop 2`). Then, pick a card from the `Sélecteur de Cartes` to assign it.
4. **Betting**: As the hand progresses, enter the bets for each active player in the "Mise" field next to their seat. The pot size and amount to call will update automatically.
5. **Run Simulation**: Once your hand and the board are set, click `Lancer la Simulation` to calculate your equity.
6. **Check the Recommendation**: The `Analyse & Décision` card provides a clear, actionable suggestion based on your calculated equity and the pot odds.

## 💻 Tech Stack

- **Core Framework**: [React](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: Built with the excellent [shadcn/ui](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

*This project was bootstrapped with `create-vite`.*
