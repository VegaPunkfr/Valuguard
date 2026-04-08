#!/usr/bin/env python3
"""
Ghost Tax — Hypothesis Strength Scorer
Scores a commercial hypothesis on 6 dimensions for a total of /100.

Dimensions:
  - Clarity (0-20): Is the hypothesis specific and falsifiable?
  - Observability (0-20): Can we measure the outcome with available tools?
  - Link to Real Signal (0-20): Is it based on an observable market signal?
  - Cost of Error (0-20): How expensive is it if we're wrong?
  - Reversibility (0-10): Can we undo the action if the hypothesis fails?
  - Dependence on Absent Proof (0-10): Does it require proof we don't have?

Grades:
  Strong (>75): Execute immediately
  Acceptable (>50): Test with bounded experiment
  Weak (>25): Needs refinement before testing
  Reject (<=25): Do not pursue

Usage:
    python hypothesis_strength_score.py "DACH CFOs who just changed jobs will convert at >5% from cold email"
    python hypothesis_strength_score.py  # Interactive mode
    python hypothesis_strength_score.py --batch hypotheses.txt  # Score multiple
"""

import sys
import argparse
import textwrap
from dataclasses import dataclass


@dataclass
class Dimension:
    name: str
    max_score: int
    description: str
    scoring_guide: dict[str, int]  # label → score


DIMENSIONS: list[Dimension] = [
    Dimension(
        name="Clarity",
        max_score=20,
        description="Is the hypothesis specific, measurable, and falsifiable?",
        scoring_guide={
            "Vague / unfalsifiable (e.g., 'CFOs want to save money')": 0,
            "Directional but not measurable (e.g., 'outbound will generate interest')": 5,
            "Measurable but broad (e.g., 'cold email will get >2% reply rate')": 10,
            "Specific and falsifiable (e.g., 'DACH fintech CFOs who changed jobs in last 30 days will reply to cold email at >5%')": 15,
            "Fully specified with timeframe, segment, metric, threshold": 20,
        },
    ),
    Dimension(
        name="Observability",
        max_score=20,
        description="Can we measure the outcome with tools we actually have (Apollo, Stripe, Supabase, analytics)?",
        scoring_guide={
            "Cannot measure with any available tool": 0,
            "Requires tool we don't have or manual tracking": 5,
            "Measurable but requires manual effort (spreadsheet tracking)": 10,
            "Measurable with existing tools but requires setup": 15,
            "Directly measurable in existing dashboards/tools": 20,
        },
    ),
    Dimension(
        name="Link to Real Signal",
        max_score=20,
        description="Is this based on an observable market signal, or is it speculation?",
        scoring_guide={
            "Pure speculation / gut feeling": 0,
            "Based on general industry trend (e.g., 'SaaS costs are rising')": 5,
            "Based on specific data point but not validated for our segment": 10,
            "Based on validated signal for adjacent segment": 15,
            "Based on direct observation in our target segment (e.g., beta feedback, reply data)": 20,
        },
    ),
    Dimension(
        name="Cost of Error",
        max_score=20,
        description="If we're wrong, how much does it cost? (Inverted: low cost = high score)",
        scoring_guide={
            "Catastrophic — burns budget, reputation, or months of work": 0,
            "Expensive — significant time/money waste (>EUR 500 or >2 weeks)": 5,
            "Moderate — noticeable cost (EUR 100-500 or 1-2 weeks)": 10,
            "Low — minor cost (<EUR 100 or <1 week)": 15,
            "Negligible — can fail with near-zero cost": 20,
        },
    ),
    Dimension(
        name="Reversibility",
        max_score=10,
        description="Can we undo the action if the hypothesis fails?",
        scoring_guide={
            "Irreversible (public commitment, burned bridges, spent budget)": 0,
            "Partially reversible (some damage remains)": 3,
            "Mostly reversible (can stop and redirect)": 6,
            "Fully reversible (A/B test, can switch back instantly)": 10,
        },
    ),
    Dimension(
        name="Dependence on Absent Proof",
        max_score=10,
        description="Does this require proof/assets we don't have yet? (Inverted: no dependence = high score)",
        scoring_guide={
            "Requires proof we won't have for months (named case studies, benchmark data)": 0,
            "Requires proof we might get soon (first testimonial)": 3,
            "Requires minimal proof (methodology page, free scan demo)": 6,
            "No proof dependency — works with what we have today": 10,
        },
    ),
]


def print_dimension_guide(dim: Dimension, indent: str = "  ") -> None:
    """Print the scoring guide for a dimension."""
    print(f"\n{dim.name} (0-{dim.max_score}): {dim.description}")
    for label, score in dim.scoring_guide.items():
        print(f"{indent}[{score:>2}] {label}")


def get_score_interactive(dim: Dimension) -> int:
    """Interactively get a score for a dimension."""
    print_dimension_guide(dim)
    while True:
        try:
            raw = input(f"\n  Score for {dim.name} (0-{dim.max_score}): ").strip()
            if not raw:
                continue
            score = int(raw)
            if 0 <= score <= dim.max_score:
                return score
            print(f"  Score must be between 0 and {dim.max_score}")
        except ValueError:
            print("  Enter a number")
        except (EOFError, KeyboardInterrupt):
            print("\n  Aborted.")
            sys.exit(1)


def compute_grade(total: int) -> tuple[str, str]:
    """Return (grade, recommendation) based on total score."""
    if total > 75:
        return "STRONG", "Execute immediately. This hypothesis is well-formed and low-risk."
    elif total > 50:
        return "ACCEPTABLE", "Test with a bounded experiment. Set a clear kill criteria before starting."
    elif total > 25:
        return "WEAK", "Needs refinement. Clarify the hypothesis, reduce dependencies, or find supporting signals."
    else:
        return "REJECT", "Do not pursue. The hypothesis is too vague, too risky, or too dependent on absent proof."


def format_bar(score: int, max_score: int, width: int = 20) -> str:
    """Create a simple text progress bar."""
    filled = round(score / max_score * width)
    return "[" + "#" * filled + "." * (width - filled) + "]"


def score_hypothesis(hypothesis: str, scores: dict[str, int] | None = None) -> dict:
    """Score a hypothesis, either with provided scores or interactively."""
    print("\n" + "=" * 60)
    print("HYPOTHESIS:")
    for line in textwrap.wrap(hypothesis, width=56):
        print(f"  {line}")
    print("=" * 60)

    dimension_scores: dict[str, int] = {}

    if scores:
        # Use provided scores
        for dim in DIMENSIONS:
            s = scores.get(dim.name, 0)
            s = max(0, min(s, dim.max_score))
            dimension_scores[dim.name] = s
    else:
        # Interactive mode
        print("\nScore each dimension using the guides below.")
        print("Enter a number within the range shown.\n")
        for dim in DIMENSIONS:
            dimension_scores[dim.name] = get_score_interactive(dim)

    # Calculate total
    total = sum(dimension_scores.values())
    grade, recommendation = compute_grade(total)

    # Print results
    print("\n" + "-" * 60)
    print("RESULTS")
    print("-" * 60)

    for dim in DIMENSIONS:
        s = dimension_scores[dim.name]
        bar = format_bar(s, dim.max_score)
        print(f"  {dim.name:<28} {s:>2}/{dim.max_score:<2}  {bar}")

    print(f"\n  {'TOTAL':<28} {total:>2}/100")
    print(f"  {'GRADE':<28} {grade}")
    print(f"\n  Recommendation: {recommendation}")

    # Ghost Tax specific advice
    if dimension_scores.get("Dependence on Absent Proof", 10) <= 3:
        print("\n  ⚠ High proof dependency. Ghost Tax has zero paying customers.")
        print("    Consider: can you test a version of this hypothesis that")
        print("    works with current proof assets (free scan, methodology page)?")

    if dimension_scores.get("Observability", 20) <= 5:
        print("\n  ⚠ Low observability. With EUR 49/month tool budget, you need")
        print("    metrics you can track in Apollo, Stripe, or Supabase.")
        print("    Rethink: what proxy metric could you use?")

    if dimension_scores.get("Cost of Error", 20) <= 5:
        print("\n  ⚠ High cost of error. As a solo founder with limited budget,")
        print("    you cannot afford expensive failures. Find a cheaper test.")

    return {
        "hypothesis": hypothesis,
        "scores": dimension_scores,
        "total": total,
        "grade": grade,
        "recommendation": recommendation,
    }


def score_from_batch_file(filepath: str) -> list[dict]:
    """Score multiple hypotheses from a text file (one per line)."""
    results = []
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            hypotheses = [line.strip() for line in f if line.strip() and not line.startswith("#")]
    except FileNotFoundError:
        print(f"File not found: {filepath}")
        sys.exit(1)

    print(f"\nScoring {len(hypotheses)} hypotheses from {filepath}")
    print("Note: batch mode uses interactive scoring for each hypothesis.\n")

    for i, hypothesis in enumerate(hypotheses, 1):
        print(f"\n{'='*60}")
        print(f"HYPOTHESIS {i}/{len(hypotheses)}")
        result = score_hypothesis(hypothesis)
        results.append(result)

    # Summary table
    print("\n\n" + "=" * 60)
    print("BATCH SUMMARY")
    print("=" * 60)
    print(f"  {'#':<4} {'Score':>5} {'Grade':<12} Hypothesis")
    print(f"  {'─'*4} {'─'*5} {'─'*12} {'─'*35}")
    for i, r in enumerate(results, 1):
        h_short = r["hypothesis"][:35] + "..." if len(r["hypothesis"]) > 35 else r["hypothesis"]
        print(f"  {i:<4} {r['total']:>3}/100 {r['grade']:<12} {h_short}")

    return results


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Score a commercial hypothesis for Ghost Tax",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""\
            Examples:
              python hypothesis_strength_score.py "DACH CFOs who just changed jobs convert at >5%"
              python hypothesis_strength_score.py  # Interactive
              python hypothesis_strength_score.py --batch hypotheses.txt
        """),
    )
    parser.add_argument("hypothesis", nargs="?", help="Hypothesis string to score")
    parser.add_argument("--batch", type=str, help="Path to file with one hypothesis per line")
    args = parser.parse_args()

    if args.batch:
        results = score_from_batch_file(args.batch)
        strong = sum(1 for r in results if r["grade"] == "STRONG")
        print(f"\n  Strong hypotheses: {strong}/{len(results)}")
        return 0

    if args.hypothesis:
        hypothesis = args.hypothesis
    else:
        print("Ghost Tax — Hypothesis Strength Scorer")
        print("Enter your hypothesis (or Ctrl+C to exit):\n")
        try:
            hypothesis = input("> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nExited.")
            return 0

    if not hypothesis:
        print("No hypothesis provided.")
        return 1

    result = score_hypothesis(hypothesis)
    return 0 if result["grade"] in ("STRONG", "ACCEPTABLE") else 1


if __name__ == "__main__":
    sys.exit(main())
