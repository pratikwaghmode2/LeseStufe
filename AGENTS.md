# LeseStufe AI - Project Guidelines & Agent Instructions

This file defines the project standards, tech stack, and conventions for AI agents working within this workspace.

---

## 1. Project Overview

* **Application**: LeseStufe AI (German Level Reader / Graded Text Reader)
* **Goal**: Analyzes and adapts German texts to CEFR levels (A1, A2, B1, B2, C1), provides vocabulary explanations, generates reading comprehension exercises, and exports printable/PDF materials.
* **Workspace Root**: `c:/Users/Pratik/Documents/antigravity/focused-euclid`

---

## 2. Tech Stack & Architecture

### Backend (`/backend`)
* **Framework**: Python 3.10+, FastAPI, Uvicorn
* **Data Validation**: Pydantic v2
* **PDF Processing & Generation**: PyMuPDF (`fitz`), PyPDF, ReportLab
* **Testing**: Pytest
* **Entry Point**: `backend/main.py` (`uvicorn backend.main:app --port 8000`)

### Frontend (`/frontend`)
* **Framework**: React 19, TypeScript
* **Bundler & Tooling**: Vite, Oxlint
* **Styling & UI**: Tailwind CSS v4 (`@tailwindcss/vite`), Lucide React
* **Output**: Single-page application serving from Vite dev server or static `dist/`

---

## 3. Build, Run & Test Commands

* **One-Click Launch**: Run `start.bat` in the project root to start the backend and open the browser.
* **Backend Dev**:
  ```bash
  python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
  ```
* **Backend Tests**:
  ```bash
  pytest backend/tests
  ```
* **Frontend Dev**:
  ```bash
  cd frontend
  npm run dev
  ```
* **Frontend Build**:
  ```bash
  cd frontend
  npm run build
  ```
* **Frontend Lint**:
  ```bash
  cd frontend
  npm run lint
  ```

---

## 4. Coding Standards & Guidelines

### Python (Backend)
* Adhere to PEP 8 standards with descriptive naming.
* Use explicit Pydantic models for request validation and response schemas.
* Preserve existing comments, docstrings, and type annotations when refactoring.
* Handle exceptions gracefully with appropriate HTTP status codes (e.g., `HTTPException`).

### TypeScript / React (Frontend)
* Use functional components with hooks; avoid class components.
* Maintain strict TypeScript types; avoid `any`.
* Keep styling aligned with Tailwind utility classes.
* Ensure responsive design and accessible UI elements.

---

## 5. Security & Operational Constraints

* Never commit API keys, secrets, or `.env` files to git.
* Keep temporary artifacts or scratch files out of repository commits.
* Avoid modifying generated assets in `frontend/dist/` directly; always edit source files in `frontend/src/`.

---

## 6. Custom Rules & Prompts

<!-- Paste any additional custom guidelines, preferences, or rules below -->
