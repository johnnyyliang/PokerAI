"""Counterfactual Regret Minimization for Heads-Up Pot-Limit Texas Hold'em.

This is a simplified implementation that models a two player game with
canonical pot-limit actions (fold, call/check, pot sized raise).  The game
is played with four betting rounds (preflop, flop, turn and river).

The implementation groups bets of a similar size together and abstracts the
betting tree to allow at most a single raise per round.  It is not meant to be
an efficient solver but rather an easy to read reference implementation.
"""

from __future__ import annotations
import random
from dataclasses import dataclass
from typing import Dict, List, Tuple


# ---------------------------------------------------------------------------
# Card helper utilities
# ---------------------------------------------------------------------------
RANKS = "23456789TJQKA"
SUITS = "cdhs"
NUM_CARDS = 52


def card_to_str(card: int) -> str:
    """Return a human readable representation of an integer encoded card."""
    return RANKS[card % 13] + SUITS[card // 13]


def hand_to_str(cards: List[int]) -> str:
    return "".join(sorted(card_to_str(c) for c in cards))


# ---------------------------------------------------------------------------
# Hand evaluation
# ---------------------------------------------------------------------------

def _check_straight(mask: int) -> int | None:
    """Return highest rank of a straight in ``mask`` or ``None``."""
    # Special case wheel straight (A-2-3-4-5)
    wheel = [12, 3, 2, 1, 0]
    if all(mask >> r & 1 for r in wheel):
        return 3  # five-high straight

    for high in range(12, 3, -1):
        if all(mask >> (high - i) & 1 for i in range(5)):
            return high
    return None


def evaluate_hand(cards: List[int]) -> Tuple[int, Tuple]:
    """Evaluate a 7-card Hold'em hand.

    Returns a tuple ``(category, tie_breaker_tuple)`` where larger is better.
    ``category`` ranges from 8 (straight flush) to 0 (high card).
    """
    ranks = [c % 13 for c in cards]
    suits = [c // 13 for c in cards]

    rank_counts = [0] * 13
    for r in ranks:
        rank_counts[r] += 1
    suit_counts = [0] * 4
    for s in suits:
        suit_counts[s] += 1

    flush_suit = next((i for i, c in enumerate(suit_counts) if c >= 5), None)
    rank_mask = 0
    for r in ranks:
        rank_mask |= 1 << r

    # Straight flush
    if flush_suit is not None:
        flush_ranks = [r for r, s in zip(ranks, suits) if s == flush_suit]
        mask = 0
        for r in flush_ranks:
            mask |= 1 << r
        sf = _check_straight(mask)
        if sf is not None:
            return 8, (sf,)

    # Four of a kind
    for r in range(12, -1, -1):
        if rank_counts[r] == 4:
            kicker = max(rr for rr in ranks if rr != r)
            return 7, (r, kicker)

    # Full house
    triple = None
    pair = None
    for r in range(12, -1, -1):
        if rank_counts[r] >= 3 and triple is None:
            triple = r
        elif rank_counts[r] >= 2 and pair is None:
            pair = r
    if triple is not None and pair is not None:
        return 6, (triple, pair)

    # Flush
    if flush_suit is not None:
        flush_cards = sorted((r for r, s in zip(ranks, suits) if s == flush_suit), reverse=True)[:5]
        return 5, tuple(flush_cards)

    # Straight
    straight_high = _check_straight(rank_mask)
    if straight_high is not None:
        return 4, (straight_high,)

    # Three of a kind
    for r in range(12, -1, -1):
        if rank_counts[r] == 3:
            kickers = sorted((rr for rr in ranks if rr != r), reverse=True)[:2]
            return 3, (r, *kickers)

    # Two pair
    pairs = [r for r in range(12, -1, -1) if rank_counts[r] >= 2]
    if len(pairs) >= 2:
        kicker = max(rr for rr in ranks if rr not in pairs[:2])
        return 2, (pairs[0], pairs[1], kicker)

    # One pair
    if pairs:
        pair_rank = pairs[0]
        kickers = sorted((rr for rr in ranks if rr != pair_rank), reverse=True)[:3]
        return 1, (pair_rank, *kickers)

    # High card
    high = sorted(ranks, reverse=True)[:5]
    return 0, tuple(high)


# ---------------------------------------------------------------------------
# Game state description
# ---------------------------------------------------------------------------
@dataclass
class GameState:
    deck: List[int]
    board: List[int]
    hole_cards: List[List[int]]
    player: int
    stage: int
    pot: int
    to_call: int
    bet_made: bool
    checked: bool
    history: str
    terminal: bool = False
    winner: int | None = None

    def clone(self) -> "GameState":
        return GameState(
            deck=list(self.deck),
            board=list(self.board),
            hole_cards=[list(self.hole_cards[0]), list(self.hole_cards[1])],
            player=self.player,
            stage=self.stage,
            pot=self.pot,
            to_call=self.to_call,
            bet_made=self.bet_made,
            checked=self.checked,
            history=self.history,
            terminal=self.terminal,
            winner=self.winner,
        )


# ---------------------------------------------------------------------------
# Information set node
# ---------------------------------------------------------------------------
class InformationSet:
    """Stores regrets and strategy sums for one information set."""

    def __init__(self, key: str, actions: Tuple[int, ...]):
        self.key = key
        self.actions = actions
        self.regret_sum: Dict[int, float] = {a: 0.0 for a in actions}
        self.strategy_sum: Dict[int, float] = {a: 0.0 for a in actions}

    def get_strategy(self, realization_weight: float) -> Dict[int, float]:
        """Return strategy for this node via regret-matching."""
        positive_regrets = {a: max(r, 0.0) for a, r in self.regret_sum.items()}
        normalizing = sum(positive_regrets.values())
        if normalizing > 0:
            strategy = {a: positive_regrets[a] / normalizing for a in self.actions}
        else:
            strategy = {a: 1.0 / len(self.actions) for a in self.actions}
        for a in self.actions:
            self.strategy_sum[a] += realization_weight * strategy[a]
        return strategy

    def get_average_strategy(self) -> Dict[int, float]:
        normalizing = sum(self.strategy_sum.values())
        if normalizing > 0:
            return {a: self.strategy_sum[a] / normalizing for a in self.actions}
        return {a: 1.0 / len(self.actions) for a in self.actions}


# ---------------------------------------------------------------------------
# CFR trainer
# ---------------------------------------------------------------------------
class CFRTrainer:
    ACTIONS = {0: "f", 1: "c", 2: "r"}

    def __init__(self) -> None:
        self.nodes: Dict[str, InformationSet] = {}

    # ----- helper functions -------------------------------------------------
    def _info_key(self, state: GameState, player: int) -> Tuple[str, Tuple[int, ...]]:
        hand_key = hand_to_str(state.hole_cards[player])
        board_key = hand_to_str(state.board)
        key = f"{hand_key}|{board_key}|{state.history}|{state.pot}|{state.to_call}"
        actions = self._available_actions(state)
        return key, actions

    def _available_actions(self, state: GameState) -> Tuple[int, ...]:
        if state.to_call > 0:
            # Response to a bet: fold or call
            return (0, 1)
        # No outstanding bet: check/call or raise (pot sized)
        return (1, 2)

    def _next_round(self, state: GameState) -> None:
        """Advance to the next betting round or showdown."""
        if state.stage == 0:
            state.board.extend([state.deck.pop() for _ in range(3)])
        elif state.stage == 1:
            state.board.append(state.deck.pop())
        elif state.stage == 2:
            state.board.append(state.deck.pop())
        else:
            state.stage = 4  # showdown
            return
        state.stage += 1
        state.player = 0
        state.to_call = 0
        state.bet_made = False
        state.checked = False
        state.history += "|"

    def _do_action(self, state: GameState, action: int) -> None:
        player = state.player
        state.history += self.ACTIONS[action]
        if action == 0:  # fold
            state.terminal = True
            state.winner = 1 - player
            return
        if action == 1:  # call/check
            if state.to_call > 0:
                state.pot += state.to_call
                state.to_call = 0
                self._next_round(state)
            else:  # check
                if state.checked:
                    self._next_round(state)
                else:
                    state.checked = True
                    state.player = 1 - player
            return
        if action == 2:  # pot sized raise
            bet = state.pot
            state.pot += bet
            state.to_call = bet
            state.bet_made = True
            state.checked = False
            state.player = 1 - player

    # ----- terminal utility -------------------------------------------------
    def _terminal_utility(self, state: GameState) -> float:
        if state.winner is not None:
            return state.pot if state.winner == 0 else -state.pot
        # Showdown
        p0_score = evaluate_hand(state.hole_cards[0] + state.board)
        p1_score = evaluate_hand(state.hole_cards[1] + state.board)
        if p0_score > p1_score:
            return state.pot
        if p1_score > p0_score:
            return -state.pot
        return 0.0

    # ----- CFR recursion ----------------------------------------------------
    def _cfr(self, state: GameState, p0: float, p1: float) -> float:
        if state.terminal or state.stage == 4:
            return self._terminal_utility(state)

        player = state.player
        info_key, actions = self._info_key(state, player)
        node = self.nodes.get(info_key)
        if node is None:
            node = InformationSet(info_key, actions)
            self.nodes[info_key] = node
        strategy = node.get_strategy(p0 if player == 0 else p1)

        util: Dict[int, float] = {}
        node_util = 0.0
        for a in actions:
            next_state = state.clone()
            self._do_action(next_state, a)
            if player == 0:
                util[a] = -self._cfr(next_state, p0 * strategy[a], p1)
            else:
                util[a] = -self._cfr(next_state, p0, p1 * strategy[a])
            node_util += strategy[a] * util[a]

        opp_prob = p1 if player == 0 else p0
        for a in actions:
            regret = util[a] - node_util
            node.regret_sum[a] += opp_prob * regret
        return node_util

    # ----- public API -------------------------------------------------------
    def train(self, iterations: int) -> Dict[str, Dict[int, float]]:
        """Train the CFR agent for a given number of iterations."""
        util = 0.0
        for _ in range(iterations):
            deck = list(range(NUM_CARDS))
            random.shuffle(deck)
            hole0 = [deck.pop(), deck.pop()]
            hole1 = [deck.pop(), deck.pop()]
            state = GameState(
                deck=deck,
                board=[],
                hole_cards=[hole0, hole1],
                player=0,
                stage=0,
                pot=2,  # each player posts 1 chip blind
                to_call=0,
                bet_made=False,
                checked=False,
                history="",
            )
            util += self._cfr(state, 1.0, 1.0)
        avg_game_value = util / iterations
        print(f"Average game value: {avg_game_value:.3f}")
        return {k: node.get_average_strategy() for k, node in self.nodes.items()}


if __name__ == "__main__":
    trainer = CFRTrainer()
    strategy = trainer.train(100)
    for key, strat in list(strategy.items())[:10]:
        print(key, strat)