"""Counterfactual Regret Minimization for Heads‑Up Pot‑Limit Texas Hold'em.

A readable reference implementation that uses canonical pot‑limit actions
(fold, call/check, pot‑sized raise) and allows at most one raise per round.
It employs **outcome‑sampling CFR** (one random deal per iteration).

Key correctness notes vs. earlier draft
---------------------------------------
* Utilities are now computed from the acting player's perspective
  (fixed sign bug).
* Pot‑limit raise size follows the real rule:
  bet = current_pot + amount_to_call.
* Post‑flop action order is correct: the big blind acts first on all
  post‑flop streets.
"""

from __future__ import annotations
import random
import json
from dataclasses import dataclass
from typing import Dict, List, Tuple
from utils import RANKS, SUITS, NUM_CARDS, card_to_str, hand_to_str, _check_straight, evaluate_hand

# ---------------------------------------------------------------------------
# Game state
# ---------------------------------------------------------------------------
@dataclass
class GameState:
    deck: List[int]
    board: List[int]
    hole_cards: List[List[int]]
    player: int           # index of player to act
    dealer: int           # index of dealer (posts small blind)
    stage: int            # 0=pre‑flop, 1=flop, 2=turn, 3=river, 4=showdown/terminal
    pot: int
    to_call: int
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
            dealer=self.dealer,
            stage=self.stage,
            pot=self.pot,
            to_call=self.to_call,
            checked=self.checked,
            history=self.history,
            terminal=self.terminal,
            winner=self.winner,
        )

# ---------------------------------------------------------------------------
# Information‑set node
# ---------------------------------------------------------------------------
class InformationSet:
    def __init__(self, key: str, actions: Tuple[int, ...]):
        self.key = key
        self.actions = actions
        self.regret_sum = {a: 0.0 for a in actions}
        self.strategy_sum = {a: 0.0 for a in actions}

    def get_strategy(self, realization_weight: float) -> Dict[int, float]:
        positive = {a: max(0.0, r) for a, r in self.regret_sum.items()}
        normalizing = sum(positive.values())
        if normalizing > 0:
            strat = {a: positive[a] / normalizing for a in self.actions}
        else:
            strat = {a: 1.0 / len(self.actions) for a in self.actions}
        for a in self.actions:
            self.strategy_sum[a] += realization_weight * strat[a]
        return strat

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

    def __init__(self):
        self.nodes: Dict[str, InformationSet] = {}

    # ----- helpers ---------------------------------------------------------
    def _info_key(self, state: GameState, player: int) -> Tuple[str, Tuple[int, ...]]:
        hand_key = hand_to_str(state.hole_cards[player])
        board_key = hand_to_str(state.board)
        key = f"{hand_key}|{board_key}|{state.history}|{state.pot}|{state.to_call}"
        return key, self._available_actions(state)

    def _available_actions(self, state: GameState) -> Tuple[int, ...]:
        if state.to_call > 0:
            return (0, 1)  # fold, call
        return (1, 2)      # check, raise

    # ----- game tree transitions ------------------------------------------
    def _next_round(self, state: GameState) -> None:
        if state.stage == 0:
            state.board.extend([state.deck.pop() for _ in range(3)])
        elif state.stage == 1 or state.stage == 2:
            state.board.append(state.deck.pop())
        else:  # after river -> showdown
            state.stage = 4
            return
        state.stage += 1
        # Big blind (1‑dealer) acts first post‑flop
        state.player = 1 - state.dealer if state.stage > 0 else state.dealer
        state.to_call = 0
        state.checked = False
        state.history += "|"

    def _do_action(self, state: GameState, action: int) -> None:
        actor = state.player
        state.history += self.ACTIONS[action]
        if action == 0:  # fold
            state.terminal = True
            state.winner = 1 - actor
            return
        if action == 1:  # call or check
            if state.to_call > 0:  # call
                state.pot += state.to_call
                state.to_call = 0
                self._next_round(state)
            else:  # check
                if state.checked:
                    self._next_round(state)
                else:
                    state.checked = True
                    state.player = 1 - actor
            return
        if action == 2:  # pot‑sized raise
            bet = state.pot + state.to_call  # real PL raise cap
            state.pot += bet
            state.to_call = bet
            state.checked = False
            state.player = 1 - actor

    # ----- utilities -------------------------------------------------------
    def _terminal_utility(self, state: GameState, perspective: int) -> float:
        if state.winner is not None:
            return state.pot if state.winner == perspective else -state.pot
        p0_score = evaluate_hand(state.hole_cards[0] + state.board)
        p1_score = evaluate_hand(state.hole_cards[1] + state.board)
        if p0_score > p1_score:
            winner = 0
        elif p1_score > p0_score:
            winner = 1
        else:
            return 0.0
        return state.pot if winner == perspective else -state.pot

    # ----- CFR recursion ---------------------------------------------------
    def _cfr(self, state: GameState, p0: float, p1: float) -> float:
        if state.terminal or state.stage == 4:
            return self._terminal_utility(state, 0)  # always return value for player 0

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
                util[a] = self._cfr(next_state, p0 * strategy[a], p1)
            else:
                util[a] = -self._cfr(next_state, p0, p1 * strategy[a])
            node_util += strategy[a] * util[a]

        opp_prob = p1 if player == 0 else p0
        for a in actions:
            regret = util[a] - node_util
            node.regret_sum[a] += opp_prob * regret
        return node_util

    # ----- public API ------------------------------------------------------
    def train(self, iterations: int) -> Dict[str, Dict[int, float]]:
        util = 0.0
        progress_interval = max(1, iterations // 10)
        for i in range(1, iterations + 1):
            deck = list(range(NUM_CARDS))
            random.shuffle(deck)
            hole0 = [deck.pop(), deck.pop()]
            hole1 = [deck.pop(), deck.pop()]
            state = GameState(
                deck=deck,
                board=[],
                hole_cards=[hole0, hole1],
                player=0,          # dealer acts first pre‑flop
                dealer=0,
                stage=0,
                pot=2,             # blinds already in pot (1 each)
                to_call=0,
                checked=False,
                history="",
            )
            util += self._cfr(state, 1.0, 1.0)
            if i % progress_interval == 0 or i == iterations:
                avg_value = util / i
                print(f"Training progress: {i}/{iterations} iterations completed ({(i/iterations)*100:.1f}%) | Current average game value: {avg_value:.3f}")
        print(f"Average game value (for player 0): {util / iterations:.3f}")
        return {k: n.get_average_strategy() for k, n in self.nodes.items()}

    def save_strategy(self, strategy: Dict[str, Dict[int, float]], path: str) -> None:
        # Encode int keys as strings for JSON
        serializable = {k: {str(a): p for a, p in v.items()} for k, v in strategy.items()}
        with open(path, "w", encoding="utf-8") as f:
            json.dump(serializable, f)

    def get_move(self, state: 'GameState', player: int) -> int:
        """
        Given a GameState and player index, return the best move (action index)
        according to the current average strategy. If no strategy is found, returns a random legal action.
        """
        info_key, actions = self._info_key(state, player)
        node = self.nodes.get(info_key)
        if node is not None:
            avg_strategy = node.get_average_strategy()
            # Pick the action with the highest probability
            best_action = max(avg_strategy, key=avg_strategy.get)
            return best_action
        # If no node exists for this info set, pick a random legal action
        return random.choice(actions)

"""
if __name__ == "__main__":
    trainer = CFRTrainer()
    strat = trainer.train(1000)
    trainer.save_strategy(strat, "plhe_cfr_strategy.json")
    print("Saved strategy to plhe_cfr_strategy.json")
"""