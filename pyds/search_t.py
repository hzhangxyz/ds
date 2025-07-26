__all__ = [
    "Search",
]

import typing
from . import ds
from .rule_t import Rule


class Search:

    def __init__(self, limit_size: int = 1000, buffer_size: int = 10000):
        self._search = ds.Search(limit_size, buffer_size)

    def set_limit_size(self, limit_size: int) -> None:
        self._search.set_limit_size(limit_size)

    def set_buffer_size(self, buffer_size: int) -> None:
        self._search.set_buffer_size(buffer_size)

    def reset(self) -> None:
        self._search.reset()

    def add(self, text: str, sep: str | None = None) -> int:
        if sep is not None:
            return self._search.add_multiple(text, sep)
        else:
            return int(self._search.add_single(text))

    def execute(self, callback: typing.Callable[[Rule], bool]) -> int:
        return self._search.execute(lambda candidate: callback(Rule(candidate)))