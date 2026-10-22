Feature: Adding a tool nobody listed

  Someone built or found a small tool and wants colleagues to find it next time.
  They paste its address and the page fills in the rest; a colleague on the
  admin list approves it later, but it is live from the moment it is published.

  Background:
    Given the "community" catalog

  Rule: A signed-in person adds and edits

    Background:
      Given I am signed in as "Robin Park"
      And I open Community tools

    Scenario: Paste the address, and the rest fills in
      When I choose to add a tool
      And I paste "https://qc-heatmap-9f8e.pages.example.com/"
      Then the name is filled in from the page title
      And a screenshot preview appears
      When I add "Sam Ortiz" as owner
      And I describe it as "**Per-tile quality** for a run."
      And I tag it with the app "Order Service" and the topic "qc"
      And I publish
      Then I am told it is live now
      And "QC Heatmap" is listed under Newest
      And "QC Heatmap" is marked new, not reviewed
      And "QC Heatmap" was added by "Robin Park"
      And 1 tool is awaiting review

    Scenario: A slow answer for an address I already replaced is ignored
      Given the page "https://slow-tool-4b4b.pages.example.com/" called "Slow Tool" takes 1500 ms to read
      When I choose to add a tool
      And I paste "https://slow-tool-4b4b.pages.example.com/"
      And the site is being read
      And I replace the address with "https://qc-heatmap-9f8e.pages.example.com/"
      Then the name is filled in from the page title
      When the answer for "https://slow-tool-4b4b.pages.example.com/" arrives
      Then the name is filled in from the page title
      And there is something to publish

    Scenario: The person adding it is its first owner
      When I choose to add a tool
      And I paste "https://qc-heatmap-9f8e.pages.example.com/"
      Then the owners are "Robin Park"

    Scenario: The description can be read before it is published
      When I choose to add a tool
      And I paste "https://qc-heatmap-9f8e.pages.example.com/"
      And I describe it as "**Per-tile quality** for a run."
      And I preview the description
      Then the preview shows "Per-tile quality" in bold

    Scenario: A topic is stored the way the next person will type it
      When I choose to add a tool
      And I paste "https://qc-heatmap-9f8e.pages.example.com/"
      And I tag it with the topic "  Plate Maps "
      Then the topics read "plate-maps"

    Scenario: An admin approves a new tool
      Given "QC Heatmap" was added and is not reviewed
      And I am signed in as an admin
      When I open the card of "QC Heatmap"
      And I approve it
      Then "QC Heatmap" is no longer marked new
      And 0 tools are awaiting review

    Scenario: Only admins can approve
      Given "QC Heatmap" was added and is not reviewed
      When I open the card of "QC Heatmap"
      Then there is no way to approve it

    Scenario: An admin archives a tool with a reason
      Given I am signed in as an admin
      When I open the card of "Kit Rules Playground"
      And I archive it because "Replaced by the new rules editor"
      Then the card explains "Replaced by the new rules editor"

    Scenario: The same site twice is caught
      When I choose to add a tool
      And I paste "https://ops-runbook-1a2b.pages.example.com/other-page"
      Then I am warned that "Ops Runbook" is already listed
      When I open that card
      Then the card shows "Ops Runbook"

    Scenario: The same site can still be added on purpose
      When I choose to add a tool
      And I paste "https://ops-runbook-1a2b.pages.example.com/other-page"
      And I add it anyway
      Then the add form asks for a name

    Scenario: An app already in the catalog is not added again
      When I choose to add a tool
      And I paste "https://orders.pages.example.com/today"
      Then I am told it is already in the catalog as "Order Service"
      When I open "Order Service" from the warning
      Then the open resource is "Order Service"

    Scenario: An app already in the catalog can still be added on purpose
      When I choose to add a tool
      And I paste "https://orders.pages.example.com/today"
      And I add it anyway
      Then the add form asks for a name

    Scenario: Not an address
      When I choose to add a tool
      And I paste "ops runbook"
      Then I am told it is not a web address
      And there is nothing to publish yet

    Scenario: A missing name is pointed at
      When I choose to add a tool
      And I paste "https://unknown-page-5a5a.pages.example.com/"
      And I publish
      Then I am told the name is missing
      And the caret is in the name

    Scenario: The owner edits their tool from its card
      When I open the card of "Old Tracker"
      And I edit it
      Then the edit form shows the name "Old Tracker"
      When I rename it to "Old Issue Tracker"
      And I save the changes
      Then the card shows "Old Issue Tracker"

    Scenario: The owner archives their tool from the edit form
      When I open the card of "Old Tracker"
      And I edit it
      And I archive it because "Everything moved to the new tracker"
      Then the card explains "Everything moved to the new tracker"
      When I edit it
      Then the edit form offers no way to archive it

  Rule: Someone not signed in is asked to sign in, then comes back

    Scenario: Pinning without signing in asks me to sign in first
      When I open the card of "Ops Runbook" from an old link
      And I pin it
      Then I am asked to sign in
      And signing in brings me back to "/community/ops-runbook"

    Scenario: Adding without signing in asks me to sign in first
      When I open Community tools
      And I choose to add a tool
      Then I am asked to sign in
      And signing in brings me back to "/community"

    Scenario: A visitor sees no edit or admin controls on a card
      When I open Community tools
      And I open the card of "Old Tracker"
      Then there is no way to edit it
      And there is no way to approve it
