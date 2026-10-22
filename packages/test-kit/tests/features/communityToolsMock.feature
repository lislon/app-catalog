Feature: Server state a community tools scenario starts from

  Each of these Givens changes what the mock server holds and reloads the page
  where it was, so a scenario can sign in or seed a tool after it has opened
  something and still see the change.

  Background:
    Given the "community" catalog
    When I open the "Order Service" resource

  Scenario: Every Given reloads the page where it was
    Given I am signed in
    And I pinned "Ops Runbook"
    And "Ops Runbook" is tagged with the app "Order Service"
    And "Old Tracker" has failed its daily check for 3 days
    And "QC Heatmap" was added and is not reviewed
    Then the open resource is "Order Service"

  Scenario: Signing in as a directory person or as an admin
    Given I am signed in as "Robin Park"
    And I am signed in as an admin
    Then the open resource is "Order Service"
