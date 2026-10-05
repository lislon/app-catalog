Feature: Asking for a correction from the entry itself

  The catalog is only trustworthy if the people who notice it is wrong can say so
  without being asked twice. The person reporting is a passer-by, not a maintainer:
  they came to find out how to get into something, found the entry out of date, and
  will report it only if that costs almost nothing. No login, no form to find, no
  idea which team owns the page.

  So the affordance lives on the entry, words are optional, a screenshot is enough
  on its own, and whoever reported it can see their own report afterwards — because
  reporting into silence is how a person learns not to bother.

  Background:
    Given the "sub-resources" catalog
    When I open the "Cloud Console" resource

  Scenario: Reporting something wrong in a sentence
    When I ask to suggest a change
    Then the composer is open
    When I describe the correction as "The access steps point at a form that 404s."
    And I send the correction
    Then the composer is closed
    And the notes thread shows "The access steps point at a form that 404s."
    And 1 requests are awaiting review

  Scenario: A screenshot carries the report when words would be slower
    When I ask to suggest a change
    And I attach a screenshot
    And I send the correction
    Then the notes thread shows "Screenshot only — no words added."
    And the notes thread shows 1 attached images

  Scenario: Words and evidence together
    When I ask to suggest a change
    And I describe the correction as "Owner left the team."
    And I attach 2 screenshots
    And I send the correction
    Then the notes thread shows "Owner left the team."
    And the notes thread shows 2 attached images

  Scenario: Reporting a second thing without reopening the entry
    When I ask to suggest a change
    And I describe the correction as "First thing."
    And I send the correction
    Then the notes thread shows 1 items
    When I ask to suggest a change
    Then the composer is open
    When I describe the correction as "Second thing."
    And I send the correction
    Then the notes thread shows 2 items
    And 2 requests are awaiting review

  Scenario: A bare flag is a valid report
    When I ask to suggest a change
    And I send the correction
    Then the notes thread shows "Flagged as out of date — no detail given."
    And 1 requests are awaiting review
