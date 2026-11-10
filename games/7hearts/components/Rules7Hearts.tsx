/** The 7 of Hearts rules, as the list shown inside the shared RulesDialog. */
export function Rules7Hearts() {
  return (
    <ol>
      <li>
        <strong>Three to ten players, seven rounds.</strong> Get rid of your cards first and keep your penalty points as
        low as you can. Lowest total after round seven wins.
      </li>
      <li>
        <strong>The deal.</strong> The full 52-card deck is dealt out, as evenly as it will go. With seven or more players two decks are shuffled together (104 cards) and the table has eight lines, two per suit. Nobody sees anyone
        else&apos;s cards, and there is no draw pile.
      </li>
      <li>
        <strong>The opening.</strong> Whoever holds the 7 of Hearts starts the round by playing it. Play then goes
        clockwise.
      </li>
      <li>
        <strong>Playing a card.</strong> Open a new suit by playing its 7, or extend a suit already on the table one
        step down or one step up: if the 7 and 8 of a suit are out, the 6 and the 9 are next.
      </li>
      <li>
        <strong>Ace is low, King is high.</strong> Every suit runs Ace, 2, 3 up to Queen, King. The run does not wrap
        around.
      </li>
      <li>
        <strong>Passing.</strong> If none of your cards fit, you pass. If any card of yours fits, you have to play one.
      </li>
      <li>
        <strong>Ending a round.</strong> The first player to play their last card goes out and takes no points. Everyone
        else takes the value of the cards they still hold: Ace is 1, face cards are 11, 12 and 13.
      </li>
      <li>
        <strong>Winning.</strong> Points add up across the seven rounds. The lowest total wins.
      </li>
    </ol>
  );
}
