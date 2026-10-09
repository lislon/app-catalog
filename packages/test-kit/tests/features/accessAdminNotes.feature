Feature: The provisioning detail stays on the access tab

  Two readers open the same access tab. One wants in; the other has to let them
  in. For many entries the only written record of HOW a role is granted — the
  directory group, the pipeline to run — lives in admin notes, so dropping those
  notes from the page leaves the second reader with nothing and no second page
  to go to.

  So the note under a role and the entry's own admin notes both render here, and
  this is the scenario that fails if either one quietly stops.

  Background:
    Given the "sub-resources" catalog
    When I open the "Cloud Console" resource

  Scenario: A role shows the group that grants it
    Then it explains how to get access
    And the access instructions say "Read-only access to every project"
    And the access instructions say "AD Group: CloudConsole_Viewer"

  Scenario: A role with no description still shows its note
    Then the access instructions say "Operator"
    And the access instructions say "AD Group: CloudConsole_Operator"

  Scenario: The entry's own admin notes are on the same tab
    Then the access instructions say "Admin notes"
    And the access instructions say "Run the account-provisioning pipeline once the request is approved"
