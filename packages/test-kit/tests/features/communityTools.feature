Feature: Getting back to a tool a colleague built

  The person here used a colleague's small tool once, from a chat link, and closed the tab.
  Weeks later they need it again. They remember a word from it, or who made it, never the
  address. They give it a few seconds before they go back to asking around in chat.

  Background:
    Given the "community" catalog

  Scenario: A remembered fragment of the author and the topic is enough
    When I open Community tools
    Then the caret is in the search
    When I search for "dana runb"
    Then the first result is "Ops Runbook"
    And "Dana" is highlighted in its owner
    And "runb" is highlighted in its name
    When I press Enter
    Then "https://ops-runbook-1a2b.pages.example.com/" opens in a new tab

  Scenario: Words from the address find it too
    When I open Community tools
    And I search for "sandbox"
    Then the first result is "Kit Rules Playground"
    And the result says it matched the address

  # The add form arrives with the add flow; until then "Add it" has nowhere to go.
  @todo
  Scenario: Nothing matches, so adding it is one step away
    When I open Community tools
    And I search for "primer calculator"
    Then I see that nothing is listed yet
    When I choose to add it
    Then the add form opens with the name "primer calculator"

  Scenario: Nothing matches
    When I open Community tools
    And I search for "primer calculator"
    Then I see that nothing is listed yet

  Scenario: Pinned tools wait above everyone else's
    Given I am signed in
    And I pinned "Ops Runbook"
    When I open Community tools
    Then My tools shows "Ops Runbook"
    And Most opened by colleagues still lists every tool

  # Opening and closing the card arrive with the card overlay.
  @todo
  Scenario: The tools I opened recently are remembered for me
    Given I am signed in
    When I open the card of "Kit Rules Playground"
    And I close the card
    Then Recently opened shows "Kit Rules Playground"

  Scenario: The tools I opened before are listed
    Given I am signed in
    And I opened "Kit Rules Playground" before
    When I open Community tools
    Then Recently opened shows "Kit Rules Playground"

  Scenario: Recently opened says when
    Given I am signed in
    And I opened "Kit Rules Playground" 2 hours ago
    And I opened "Ops Runbook" 1 day ago
    When I open Community tools
    Then Recently opened shows "Kit Rules Playground" opened "2 h ago"
    And Recently opened shows "Ops Runbook" opened "yesterday"

  Scenario: Recently opened keeps the last five
    Given I am signed in
    And I opened 7 different tools
    When I open Community tools
    Then Recently opened lists "Opened Tool 7, Opened Tool 6, Opened Tool 5, Opened Tool 4, Opened Tool 3"

  Scenario: Searching makes room for the answer
    Given I am signed in
    And I pinned "Ops Runbook"
    When I open Community tools
    And I search for "kit"
    Then My tools is hidden
    And Recently opened is hidden

  Scenario: Nothing pinned yet
    Given I am signed in
    When I open Community tools
    Then My tools says "Keep your tools one click away. Click the star on any tool below and it stays at the top of this page."

  Scenario: A visitor who has not signed in is offered to
    When I open Community tools
    Then My tools says "Sign in to keep your tools one click away"
    And Recently opened is hidden
    When I choose to sign in from My tools
    Then I am asked to sign in

  Scenario: Pinning from the feed
    Given I am signed in
    When I open Community tools
    And I pin "Kit Rules Playground" from the feed
    Then I am told "Pinned to My tools"
    And My tools shows "Kit Rules Playground"

  Scenario: A tool dead for a month leaves the list but not search
    Given "Old Tracker" has failed its daily check for 30 days
    When I open Community tools
    Then Most opened by colleagues does not list "Old Tracker"
    When I search for "tracker"
    Then the results show "Old Tracker" as archived

  Rule: Finding what colleagues built for the app I work in

  Scenario: A tag chip narrows the feed
    When I open Community tools
    And I choose the tag "sandbox"
    Then every listed tool carries the tag "sandbox"

  Scenario: A tag word finds tools by search
    When I open Community tools
    And I search for "sandbox"
    Then the results include every tool tagged "sandbox"
