/** The Coat of 10s rules, as the list shown inside the shared RulesDialog. */
export function RulesCoat10s() {
  return (
    <ol>
      <li>
        <strong>Four or six players, two teams.</strong> The host splits the table into Team A and Team B (2 v 2 or 3 v 3).
        Seats alternate between teams all the way round (A1, B1, A2, B2…), and that order never changes.
      </li>
      <li>
        <strong>The deal.</strong> With four players the full 52-card deck is dealt, 13 each. With six, the four 2s are
        removed and everyone gets 8. Ace is high.
      </li>
      <li>
        <strong>Playing a hand.</strong> The leader plays any card; its suit is the led suit. Everyone after them in the
        fixed order must follow that suit if they can. The highest trump wins the hand, otherwise the highest card of the led
        suit. The winner leads the next hand.
      </li>
      <li>
        <strong>Trump isn&apos;t chosen, it&apos;s discovered.</strong> Each round starts with no trump. The first player who
        legally can&apos;t follow suit and plays off-suit names trump for the rest of the round, immediately, even in the
        middle of the hand. It can&apos;t change after that, and you must still follow suit whenever you can.
      </li>
      <li>
        <strong>The four 10s.</strong> Whoever wins a hand captures every card in it. A 10 belongs to the team that wins its
        hand, not the team that played it. 10s have no special power in play.
      </li>
      <li>
        <strong>Coats.</strong> Capture all four 10s in one round and your team earns a coat. If the 10s are split, nothing
        changes. Coats are a running balance: a coat for the team in front adds to its stack, a coat for the other team takes
        one away. Only the team ahead ever shows coats, and the match has no limit.
      </li>
      <li>
        <strong>Who starts the next round.</strong> The first round starts with a random player. After that: a team with
        active coats starts, even if the other team did better. Otherwise the team with more 10s starts; on a 2–2 split, the
        team that won more hands; and if that also ties, the team that started last time. Inside each team the starting
        player rotates, and each team keeps its own place in that rotation.
      </li>
      <li>
        <strong>Ending.</strong> After any round the host can end the match. Teams stay the same between rounds.
      </li>
    </ol>
  );
}
