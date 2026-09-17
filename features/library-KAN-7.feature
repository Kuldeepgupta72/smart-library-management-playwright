Feature: KAN-7 - View overdue loans list
  As a librarian
  I want to see a list of overdue loans
  So that I can follow up with members and prioritize returns

  Scenario: Overdue-only filtering shows only overdue loans (AC1)
    Given a loan that is overdue by 5 days exists in the library
    And a loan that is not yet due exists in the library
    When I open the Overdue Loans view
    Then only the overdue loan should be shown
    And the not-yet-due loan should not be shown

  Scenario: Overdue loan row displays all required fields (AC2)
    Given a loan that is overdue by 10 days exists in the library
    When I open the Overdue Loans view
    Then the overdue loan row should show the member name, member email, book title, book ISBN, issue date, due date, and 10 days overdue

  Scenario: Empty state message shown when there are no overdue loans (AC3)
    Given there are no overdue loans in the library
    When I open the Overdue Loans view
    Then I should see the "No overdue loans right now." empty state message

  Scenario: A loan due exactly today is not treated as overdue (boundary)
    Given a loan that is due exactly today exists in the library
    When I open the Overdue Loans view
    Then that loan should not be shown in the Overdue Loans view

  Scenario: Existing tabs continue to function unaffected by the Overdue Loans view (regression)
    When I open the Books tab
    Then the Books tab should load without errors
    When I open the Members tab
    Then the Members tab should load without errors
    When I open the Issue Book tab
    Then the Issue Book tab should load without errors
    When I open the Return Book tab
    Then the Return Book tab should load without errors
