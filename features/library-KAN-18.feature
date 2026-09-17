Feature: KAN-18 - Filter and sort books by availability and author
  As a librarian
  I want to filter and sort the books list by availability and author
  So that I can quickly identify available items and browse effectively

  Scenario: Availability filter shows only matching books
    Given an available book and an issued (not available) book exist in the library
    When I filter the books list by availability "Available"
    Then only my available book should be shown and my issued book should not
    When I filter the books list by availability "Not available"
    Then only my issued book should be shown and my available book should not
    When I filter the books list by availability "All"
    Then both my available book and my issued book should be shown

  Scenario: Sorting the books list by title and by author
    Given two uniquely named books exist in the library for sort testing
    When I sort the books list by "Title (A-Z)"
    Then my two books should appear in title ascending order
    When I sort the books list by "Author (A-Z)"
    Then my two books should appear in author ascending order case-insensitively

  Scenario: Availability filter and sort applied together
    Given an available book and an issued (not available) book exist in the library
    When I filter the books list by availability "Available" and sort by "Author (A-Z)"
    Then only my available book should be shown and my issued book should not
    And my available book should be correctly positioned in author ascending order

  Scenario: Pagination navigates between pages of results
    Given at least 21 books exist in the library so results span multiple pages
    When I open the books list
    Then the pagination label should show page 1 of more than 1 page
    And the Previous page button should be disabled
    When I click the Next page button
    Then the pagination label should show page 2
    And the Previous page button should be enabled
    When I click the Previous page button
    Then the pagination label should show page 1

  Scenario: Reset Filters restores the default unfiltered, Title A-Z, page 1 view
    Given an available book and an issued (not available) book exist in the library
    And I have filtered the books list by availability "Not available" and sorted by "Author (A-Z)"
    When I click the Reset Filters button
    Then the availability filter should be reset to "All"
    And the sort should be reset to "Title (A-Z)"
    And both my available book and my issued book should be shown
