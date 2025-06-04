RANKS = "23456789TJQKA"
SUITS = "cdhs"
NUM_CARDS = 52

def card_to_str(card: int) -> str:
    return RANKS[card % 13] + SUITS[card // 13]

def hand_to_str(cards: list[int]) -> str:
    return "".join(sorted(card_to_str(c) for c in cards))

def _check_straight(mask: int) -> int | None:
    wheel = [12, 3, 2, 1, 0]
    if all(mask >> r & 1 for r in wheel):
        return 3  # five‑high straight
    for high in range(12, 3, -1):
        if all(mask >> (high - i) & 1 for i in range(5)):
            return high
    return None

def evaluate_hand(cards: list[int]) -> tuple[int, tuple]:
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
