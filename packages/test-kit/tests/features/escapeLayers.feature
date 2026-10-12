Feature: Escape closes the layer that opened last

  Escape means "take away the last thing I opened", one layer per press. Two
  overlays on screen at once is where this breaks: a nested overlay registers
  its Escape handling before the one containing it, so anything that orders
  layers by registration sees the CONTAINER as the newer one. Pressing Escape
  in the screenshot viewer then closed the card underneath it and dropped the
  reader on the catalog index.

  Background:
    Given the "screenshots" catalog
    When I open the "Design Tool" resource

  Scenario: Escape in the screenshot viewer returns to the card
    When I open the first screenshot
    Then the screenshot viewer is open
    When I press Escape
    Then the screenshot viewer is closed
    And the resource card is still open

  Scenario: The card closes only on the next Escape
    When I open the first screenshot
    And I press Escape
    And I press Escape
    Then the resource card is closed
