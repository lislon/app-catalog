Feature: The header's section tabs

  The catalog has three sections, and the header names each one with a line
  saying what it holds, so a first-time visitor can tell where to look.

  Background:
    Given the "community" catalog

  Scenario: The three sections are tabs
    Then the section tabs read:
      | Catalog         | Official company apps  |
      | Community tools | Built by colleagues    |
      | Service Desks   | Where to file a ticket |
    And the current section is "Catalog"
    When I open the "Community tools" section
    Then the current section is "Community tools"
    When I open the "Service Desks" section
    Then the current section is "Service Desks"
    When I open the "Catalog" section
    Then the current section is "Catalog"

  Scenario: Catalog stays the current section on a resource's card
    When I open the "Order Service" resource
    Then the current section is "Catalog"

  Scenario: MCP sits next to Sign in
    Then the header actions are "MCP, Toggle theme, Sign in"
    And no section tab is "MCP"

  Scenario: Community tools is hidden when the feature is off
    Given community tools are turned off
    Then the section tabs read:
      | Catalog       | Official company apps  |
      | Service Desks | Where to file a ticket |

  Scenario: A typed-in Community tools address is not found when the feature is off
    Given community tools are turned off
    When I go to "/community"
    Then the page is not found
