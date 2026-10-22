Feature: Checking it is the right tool before going

  Someone found a tool in the feed or in search, and before they leave for it they
  want to be sure it is the one: the picture, how to use it, who to ask. The card
  answers that without leaving the list, and steps to the next tool if it is not.

  Background:
    Given the "community" catalog
    And I open Community tools

  Scenario: The card leads with what identifies the tool
    When I open the card of "Ops Runbook"
    Then the card shows the screenshot
    And the card shows how to use it
    And the card shows "Dana Lee" as owner
    And the card counts one more open this month

  Scenario: Stepping to the next tool without closing
    When I open the card of the first tool
    And I press the right arrow
    Then the card shows the second tool

  Scenario: Pinning from the card
    Given I am signed in
    When I open the card of "Kit Rules Playground"
    And I pin it
    And I close the card
    Then My tools shows "Kit Rules Playground"

  Scenario: Pinning without signing in asks me to sign in first
    When I open the card of "Ops Runbook"
    And I pin it
    Then I am asked to sign in

  Scenario: A tool that stopped answering says so
    Given "Old Tracker" has failed its daily check for 3 days
    When I open the card of "Old Tracker"
    Then the card says "Not working · 3 days"
    And "Old Tracker" is ranked below every working tool

  Scenario: Enter on the card opens the site
    When I open the card of "Ops Runbook"
    And I press Enter on the card
    Then "https://ops-runbook-1a2b.pages.example.com/" opens in a new tab

  Scenario: Escape closes the card
    When I open the card of "Ops Runbook"
    And I press Escape
    Then the card is closed

  Rule: Typing in the comment box keeps its own keys

  Scenario: Arrow keys in the comment box move the caret
    When I open the card of the first tool
    And I type "abc" in the comment box
    And I press the left arrow
    And I press the left arrow
    And I press the right arrow
    Then the card still shows the first tool
    And the caret in the comment box is at 2

  Scenario: Enter in the comment box sends, it does not open the site
    When I open the card of "Ops Runbook"
    And I type "Works on the night shift too" in the comment box
    And I press Enter
    Then the card's comments show "Works on the night shift too"
    And no site opened

  Rule: The screenshot box holds its place

  Scenario: A tool still capturing shows the placeholder
    Given "Fresh Tool" was just added
    When I open the card of "Fresh Tool"
    Then the card says it is taking a screenshot
    And the screenshot box keeps the shape of a screenshot
