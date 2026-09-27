from pathlib import Path
from typing import Any, Dict, List


class UIAgent:
    """Static UX reviewer for the React reading experience."""

    def __init__(self) -> None:
        self.frontend_src = Path(__file__).resolve().parents[2] / "frontend" / "src"

    def audit(self) -> Dict[str, Any]:
        files = list(self.frontend_src.rglob("*.tsx")) + list(self.frontend_src.rglob("*.css"))
        source = "\n".join(path.read_text(encoding="utf-8", errors="ignore") for path in files)
        checks = [
            {
                "name": "Responsive reading layout",
                "passed": all(marker in source for marker in ["sm:", "md:", "max-w-"]),
                "weight": 20,
                "recommendation": "Add mobile-specific spacing checks around dense reader controls.",
            },
            {
                "name": "Action discoverability",
                "passed": source.count("title=") >= 8 and "lucide-react" in source,
                "weight": 20,
                "recommendation": "Add visible labels for the most important actions on compact screens.",
            },
            {
                "name": "Keyboard interaction",
                "passed": "keydown" in source and "onSubmit" in source and 'type="number"' in source,
                "weight": 20,
                "recommendation": "Add a visible focus state audit for dialogs and popovers.",
            },
            {
                "name": "Loading and failure feedback",
                "passed": "Loading" in source and "catch" in source and "disabled=" in source,
                "weight": 20,
                "recommendation": "Replace silent request failures with inline retry feedback where useful.",
            },
            {
                "name": "Theme and visual consistency",
                "passed": "dark:" in source and "reading_theme" in source and "rounded-" in source,
                "weight": 20,
                "recommendation": "Keep card radius and contrast tokens centralized as the UI grows.",
            },
        ]
        score = sum(check["weight"] for check in checks if check["passed"])
        return {
            "score": score,
            "max_score": 100,
            "grade": "Excellent" if score >= 90 else "Good" if score >= 75 else "Needs work",
            "checks": checks,
            "recommendations": [check["recommendation"] for check in checks if not check["passed"]],
            "files_reviewed": len(files),
        }


ui_agent = UIAgent()
