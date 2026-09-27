# Test runner script for pytest and verification
import os
import sys

def test_linguistics():
    from backend.agents.tester_agent import tester_agent
    results = tester_agent.run_all_tests()
    for r in results:
        print(f"[{'PASS' if r['passed'] else 'FAIL'}] {r['name']} ({r['category']}): {r['details']}")
        assert r['passed'], f"Test failed: {r['name']} - {r['details']}"

def test_placement():
    from backend.agents.placement_agent import placement_agent
    questions = placement_agent.get_diagnostic_questions()
    assert len(questions) >= 5
    # Simulate correct answers for A1 & A2
    answers = {1: 0, 2: 2, 3: 1, 4: 1}
    eval_result = placement_agent.evaluate_quiz(answers)
    assert eval_result["recommended_level"] in ["A1", "A2", "B1", "B2"]

def test_translation_engine():
    from backend.agents.translation_agent import translation_agent
    res = translation_agent.process_passage("Er rief gestern an. Das ist eine wichtige Entscheidung.", user_level="A2")
    assert len(res) == 2
    # Second sentence has "Entscheidung" which is B1, so it should be highlighted for an A2 learner
    tokens = res[1]['tokens']
    entscheidung = next((t for t in tokens if t['text'] == 'Entscheidung'), None)
    assert entscheidung is not None
    assert entscheidung['is_highlighted'] is True
    assert entscheidung['level'] == 'B1'

if __name__ == "__main__":
    test_linguistics()
    test_placement()
    test_translation_engine()
    print("\nALL TESTS PASSED SUCCESSFULLY!")
