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

  Scenario: Clicking the card's screenshot opens the site
    When I open the card of "Ops Runbook"
    Then the screenshot opens the site in this tab

  Scenario: The card says when the site was last updated
    Given the site of "Ops Runbook" changed 3 days ago
    When I open the card of "Ops Runbook"
    Then the card says the site was updated "3 days ago"

  Scenario: A site with no known update date shows none
    When I open the card of "Ops Runbook"
    Then the card does not say when the site was updated

  Scenario: Enlarge opens the full-size viewer
    When I open the card of "Ops Runbook"
    And I enlarge the screenshot
    Then the full-size viewer opens

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

  Scenario: A tool that stopped answering says so
    Given "Old Tracker" has failed its daily check for 3 days
    When I open the card of "Old Tracker"
    Then the card says "Not working · 3 days"
    And "Old Tracker" is ranked below every working tool

  Scenario: One day not working reads as one day
    Given "Old Tracker" has failed its daily check for 1 days
    When I open the card of "Old Tracker"
    Then the card's badge reads "Not working · 1 day"

  Scenario: An archived tool says who archived it and when
    Given "Old Tracker" was archived by "Dana Lee"
    When I open the card of "Old Tracker" from an old link
    Then the card says "Archived"
    And the card explains "Archived by Dana Lee on 21 Oct 2026."

  Scenario: A tool dead for a month says it was archived automatically
    Given "Old Tracker" has failed its daily check for 30 days
    When I open the card of "Old Tracker" from an old link
    Then the card explains "Archived automatically on 21 Oct 2026 after 30 days not working."

  Scenario: A tag on the card narrows the feed
    When I open the card of "Kit Rules Playground"
    And I choose the tag "sandbox" on the card
    Then the card is closed
    And every listed tool carries the tag "sandbox"

  Scenario: Enter on the card opens the site
    When I open the card of "Ops Runbook"
    And I press Enter on the card
    Then "https://ops-runbook-1a2b.pages.example.com/" opens in this tab

  Scenario: Escape closes the card
    When I open the card of "Ops Runbook"
    And I press Escape
    Then the card is closed

  Rule: The comment box keeps its own keys

  Scenario: What others found comes before the comment box
    When I open the card of "Ops Runbook"
    Then the comments read first and the comment box comes last

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

  Scenario: A comment I send counts on the tool's row
    When I open the card of "Ops Runbook"
    And I type "Works on the night shift too" in the comment box
    And I press Enter
    Then the card's comments show "Works on the night shift too"
    When I close the card
    Then the row of "Ops Runbook" shows 1 comment

  Rule: The screenshot box holds its place

  Scenario: A tool still capturing shows the placeholder
    Given "Fresh Tool" was just added
    When I open the card of "Fresh Tool"
    Then the card says it is taking a screenshot
    And the screenshot box keeps the shape of a screenshot
    When its first screenshot is taken
    And a few seconds pass
    Then the card shows the screenshot

  Scenario: A tool that will never be captured says so at once
    Given "Off Site Tool" was just added on a host outside the capture list
    When I open the card of "Off Site Tool"
    Then the card says there is no screenshot
