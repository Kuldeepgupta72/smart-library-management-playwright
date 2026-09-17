Feature: AISDLC-2 - Overdue-loan fine calculation and lifecycle
  As a librarian
  I want overdue loans to have a calculated fine that can be paid or waived
  So that I can track and resolve fines owed on overdue books

  # This story is API-only (no member-facing fines UI — see requirements
  # "Out of Scope"), so scenarios call the API directly:
  #   GET  /api/loans/overdue
  #   POST /api/loans/:id/pay-fine
  #   POST /api/loans/:id/waive-fine
  # rather than driving a UI page object.

  Scenario: Fine amount is calculated using the flat rate per day overdue
    Given an overdue loan exists with 3 days overdue
    When I request the overdue loans list
    Then the loan's fine amount should equal the flat rate multiplied by the days overdue

  Scenario: Calculated fine amount is persisted and reused, not recalculated, on a later read
    Given an overdue loan exists with 2 days overdue
    When I request the overdue loans list
    Then the loan's fine amount should equal the flat rate multiplied by the days overdue
    When the loan is backdated further to 6 days overdue
    And I request the overdue loans list again
    Then the loan's fine amount should not have changed from the originally calculated amount

  Scenario: GET /api/loans/overdue keeps existing fields unchanged while additively exposing fine data
    Given an overdue loan exists with 4 days overdue
    When I request the overdue loans list
    Then the response should still include all pre-existing loan fields for that loan
    And the response should additionally include fine_amount, fine_paid and fine_waived for that loan

  Scenario: Paying a fine marks it as paid
    Given an overdue loan exists with 3 days overdue
    And the fine has been calculated
    When I pay the fine for that loan
    Then the pay-fine request should succeed
    And the loan's fine should be marked as paid and not waived

  Scenario: Waiving a fine marks it as waived
    Given an overdue loan exists with 3 days overdue
    And the fine has been calculated
    When I waive the fine for that loan
    Then the waive-fine request should succeed
    And the loan's fine should be marked as waived and not paid

  Scenario: Paying a fine that has already been waived is rejected
    Given an overdue loan exists with 3 days overdue
    And the fine has been calculated
    And the fine for that loan has already been waived
    When I pay the fine for that loan
    Then the request should be rejected with status 400 and message "Fine has already been waived"

  Scenario: Waiving a fine that has already been paid is rejected
    Given an overdue loan exists with 3 days overdue
    And the fine has been calculated
    And the fine for that loan has already been paid
    When I waive the fine for that loan
    Then the request should be rejected with status 400 and message "Fine has already been paid"

  Scenario Outline: Paying or waiving a fine before it has ever been calculated is rejected
    Given an overdue loan exists with 3 days overdue
    And its fine has never been calculated
    When I <action> the fine for that loan
    Then the request should be rejected with status 400 and message "No fine has been calculated for this loan yet"

    Examples:
      | action |
      | pay    |
      | waive  |

  Scenario Outline: Paying or waiving a fine for a non-existent loan returns 404
    When I <action> the fine for the non-existent loan
    Then the request should be rejected with status 404 and message "Loan not found"

    Examples:
      | action |
      | pay    |
      | waive  |
