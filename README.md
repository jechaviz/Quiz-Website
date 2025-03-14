# Quiz Game

A sleek, interactive quiz application built with Svelte, featuring a dark theme with purple accents, support for multiple question types, and a Markdown-based quiz parser.

## Features

- **Home Screen**: Welcoming interface with a start button.
- **Quiz Engine**: Supports multiple choice, true/false, fill-in-the-blank, select all, short answer, long answer, and numerical questions.
- **Markdown Parser**: Loads quizzes from a custom Markdown format (see `public/sample_quiz.md`).
- **Responsive Design**: Adapts to desktop and mobile devices.
- **Scoring & Feedback**: Tracks scores and provides immediate feedback on answers.
- **Navigation**: Optional question navigation with a sleek UI.

## Prerequisites

- Node.js (v18 or later recommended)
- npm (v9 or later)

## Setup

1. **Clone the Repository** (if applicable):

```bash
git clone <repository-url>
cd quiz-game
```

## Customization

- *Styles*: Edit src/global.css to tweak the theme (e.g., change #AA2C86 to another color).
- *Quiz Content*: Modify public/sample_quiz.md to add your own questions.
- *Navigation*: Toggle config.allowNavigation in Quiz.svelte to enable/disable question jumping.