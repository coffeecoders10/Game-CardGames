/** The Steal the Jack rules, as the list shown inside the shared RulesDialog. */
export function RulesStealTheJack() {
  return (
    <ol>
      <li>
        <strong>Two to six players, no winners.</strong> Get rid of all your cards. Whoever is left holding cards at the
        end loses the round, and a loss is the only thing that is counted.
      </li>
      <li>
        <strong>The deck.</strong> A full deck without the Jack of Diamonds: 51 cards, all dealt, a card more to some
        players than others. Three Jacks remain, so one of them never finds a partner.
      </li>
      <li>
        <strong>Pairs.</strong> Two cards of the same rank, in any suits, make a pair. Choose both cards yourself and
        discard them to the middle. Nobody checks your hand for you: a pair you miss stays with you.
      </li>
      <li>
        <strong>Opening discards.</strong> One player at a time, everyone discards as many pairs as they like, then taps
        Done.
      </li>
      <li>
        <strong>Taking a card.</strong> On your turn you take one card, blind, from the next player clockwise who still
        has cards. You sit across from them, so you see the backs of their cards the way they would look from the
        other side of the table. Then discard any pairs you can, and pass the turn.
      </li>
      <li>
        <strong>Keep them guessing.</strong> When someone is about to take from you, drag your cards into a new order
        or shuffle them. They see the backs move as you do. A card that is taken is always the one they touched.
      </li>
      <li>
        <strong>Going out.</strong> Run out of cards and you are out for the round. You are skipped, nobody picks from
        you any more, and you watch the rest.
      </li>
      <li>
        <strong>The loser.</strong> When only one player still has cards, they get one last turn to discard any pairs, and then they lose the round: normally the one
        holding the Jack, though not if they skipped a pair they could have made. Deal another round whenever everyone
        is ready.
      </li>
    </ol>
  );
}
