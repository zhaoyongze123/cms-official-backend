from __future__ import annotations

from dataclasses import dataclass
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph
from ai_service.core.providers import Provider, get_provider


class ReviewState(TypedDict):
    article_id: int
    payload: dict[str, Any]
    trace_id: str
    run: dict[str, Any]
    suggestions: list[dict[str, Any]]


@dataclass
class ReviewGraph:
    provider: Provider

    def invoke(self, article_id: int, payload: dict[str, Any], trace_id: str) -> tuple[dict[str, Any], list[dict[str, Any]]]:
        graph = StateGraph(ReviewState)
        graph.add_node("collect_suggestions", self._collect_suggestions)
        graph.add_edge(START, "collect_suggestions")
        graph.add_edge("collect_suggestions", END)
        compiled = graph.compile()
        result = compiled.invoke(
            {
                "article_id": article_id,
                "payload": payload,
                "trace_id": trace_id,
                "run": {},
                "suggestions": [],
            }
        )
        return result["run"], result["suggestions"]

    def _collect_suggestions(self, state: ReviewState) -> ReviewState:
        run, suggestions = self.provider.review_article(
            article_id=state["article_id"],
            payload=state["payload"],
            trace_id=state["trace_id"],
        )
        return {
            **state,
            "run": run.to_dict(),
            "suggestions": [suggestion.to_dict() for suggestion in suggestions],
        }


def build_review_graph(provider: Provider | None = None) -> ReviewGraph:
    return ReviewGraph(provider=provider or get_provider())
