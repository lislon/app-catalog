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
    And it is the selected result
    And "Dana" is highlighted in its owner
    And "runb" is highlighted in its name
    When I press Enter
    Then "https://ops-runbook-1a2b.pages.example.com/" opens in a new tab

  Scenario: Words from the address find it too
    When I open Community tools
    And I search for "sandbox"
    Then the first result is "Kit Rules Playground"
    And the result says it matched the address

  Scenario: Nothing matches, so adding it is one step away
    Given I am signed in
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

  Scenario: Searching makes room for the answer
    Given I am signed in
    And I pinned "Ops Runbook"
    When I open Community tools
    And I search for "kit"
    Then My tools is hidden

  Scenario: My tools is hidden with no pins
    Given I am signed in
    When I open Community tools
    Then Most opened by colleagues still lists every tool
    And My tools is hidden

  Scenario: A visitor who has not signed in is asked to when they pin
    When I open Community tools
    Then Most opened by colleagues still lists every tool
    And My tools is hidden
    When I pin "Kit Rules Playground" from the feed
    Then I am asked to sign in

  Scenario: The star is always in sight, pinned or not
    Given I am signed in
    And I pinned "Ops Runbook"
    When I open Community tools
    Then the star on "Kit Rules Playground" is in sight, unpinned
    And the star on "Ops Runbook" is in sight, pinned

  Scenario: The row itself goes straight to the site
    When I open Community tools
    Then the row of "Ops Runbook" opens its site in a new tab

  Scenario: A row is three stops for the keyboard
    When I open Community tools
    Then tabbing through the row of "Ops Runbook" reaches "site, star, Like, Details"

  Scenario: The row's Details opens the card
    When I open Community tools
    And I choose Details on "Ops Runbook"
    Then the card shows "Ops Runbook"

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

  Rule: Ordering the feed

  Scenario: The feed starts with the most liked, views breaking ties
    Given "Ann Lee, Bo Ray" liked "Old Tracker"
    And "Cy Dee" liked "Kit Rules Playground"
    When I open Community tools
    Then the sort says "Sort by Most liked, descending"
    And the feed reads "Old Tracker, Kit Rules Playground, Ops Runbook"
    And the rows say no date

  Scenario: Popular goes by views this month
    When I open Community tools
    And I sort by "Popular"
    Then the sort says "Sort by Popular, descending"
    And the feed reads "Ops Runbook, Kit Rules Playground, Old Tracker"

  Scenario: Newest puts the latest addition first
    When I open Community tools
    And I sort by "Newest"
    Then the feed reads "Kit Rules Playground, Ops Runbook, Old Tracker"
    And the row of "Kit Rules Playground" says "Added"

  Scenario: Clicking Newest twice sorts oldest first
    When I open Community tools
    And I sort by "Newest"
    And I sort by "Newest"
    Then the sort says "Sort by Newest, ascending"
    And the feed reads "Old Tracker, Ops Runbook, Kit Rules Playground"

  Scenario: Recently updated goes by when the site changed, unknown last
    Given the site of "Kit Rules Playground" changed 3 days ago
    And the site of "Old Tracker" changed 10 days ago
    When I open Community tools
    And I sort by "Recently updated"
    Then the feed reads "Kit Rules Playground, Old Tracker, Ops Runbook"
    And the row of "Kit Rules Playground" says "Updated 3 days ago"

  Scenario: An old link to the newest tools still opens Newest
    When I open Community tools
    And I go to "/community?window=newest"
    Then the sort says "Sort by Newest, descending"
    And the feed reads "Kit Rules Playground, Ops Runbook, Old Tracker"

  Rule: Liking a tool

  Scenario: Liking a tool counts me in, and liking it again takes it back
    Given "Ann Lee, Bo Ray, Cy Dee" liked "Kit Rules Playground"
    And I am signed in
    When I open Community tools
    Then "Kit Rules Playground" has 3 likes, not liked by me
    And pointing at the like of "Kit Rules Playground" says "Liked by Cy Dee, Bo Ray and 1 other"
    When I like "Kit Rules Playground"
    Then "Kit Rules Playground" has 4 likes, liked by me
    When I like "Kit Rules Playground"
    Then "Kit Rules Playground" has 3 likes, not liked by me

  Scenario: A visitor who has not signed in is asked to before liking
    When I open Community tools
    And I like "Ops Runbook"
    Then I am asked to sign in

  Rule: Finding what colleagues built for the app I work in

  Scenario: The app's card points at community tools for it
    Given "Ops Runbook" is tagged with the app "Order Service"
    When I open the "Order Service" resource
    Then the card says there is 1 community tool for it
    When I follow that link
    Then the feed is filtered to "app:order-service"
    And the feed lists "Ops Runbook"

  Scenario: An app with no community tools says nothing about them
    When I open the "Order Service" resource
    Then the card does not mention community tools

  Scenario: A tag chip narrows the feed
    When I open Community tools
    And I choose the tag "sandbox"
    Then every listed tool carries the tag "sandbox"

  Scenario: A tag word finds tools by search
    When I open Community tools
    And I search for "sandbox"
    Then the results include every tool tagged "sandbox"
