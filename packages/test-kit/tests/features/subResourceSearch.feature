Feature: Finding a sub-resource by searching for it

  A resource can own dozens of sub-resources — a cloud console with one account
  per project, a database server with one schema per team. People know the name
  or the id of the sub-resource they need, not the parent it happens to live
  under. So searching for a sub-resource has to surface it, and opening it has
  to land on that one sub-resource instead of dropping the person into a list of
  forty-seven siblings to scroll through.

  Background:
    Given the "sub-resources" catalog

  Scenario: A query matching many sub-resources lists a few and offers the rest
    When I search for "project"
    Then I see the "Cloud Console" resource in the results
    And I see 5 matching sub-resources under "Cloud Console"
    And a row offers 42 more matching sub-resources
    When I show the remaining matching sub-resources
    Then I see 47 matching sub-resources under "Cloud Console"
    And no row offers more matching sub-resources

  Scenario: Opening a matched sub-resource singles it out inside its parent
    When I search for "project"
    And I open the "project-02" sub-resource from the results
    Then the open resource is "Cloud Console"
    And its sub-resource table shows 1 of 47
    And the only sub-resource listed is "project-02"
    And the "project-02" sub-resource is marked as the current one

  Scenario: A sub-resource is findable by its identifier, not just its name
    When I search for "000000000042"
    Then I see the "Cloud Console" resource in the results
    And I see 1 matching sub-resources under "Cloud Console"
    When I open the "project-42" sub-resource from the results
    Then its sub-resource table shows 1 of 47
    And the "project-42" sub-resource is marked as the current one

  Scenario: Matching the parent's own name singles out no sub-resource
    When I search for "Cloud Console"
    Then I see no matching sub-resources under "Cloud Console"
    When I open the "Cloud Console" resource
    Then its sub-resource table shows 47 of 47
    And no sub-resource is marked as the current one

  Scenario: A sub-resource's own page spells out the two-step access chain
    When I open the "Cloud Console" resource
    And I open the "project-02" sub-resource from the resource page
    Then the open sub-resource page is "project-02"
    And it asks for access to "Cloud Console" first, then "project-02"
    When I go back to the parent resource
    Then the open resource is "Cloud Console"

  Scenario: A sub-resource with only approvers still says how to get access
    When I open the "Cloud Console" resource
    And I open the "project-03" sub-resource from the resource page
    Then the open sub-resource page is "project-03"
    And it explains how to get access
    And "owner@example.com" is listed as an approver
