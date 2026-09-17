Feature: Library Management System - Batch 1 enhancements
  As a librarian
  I want due dates computed on issue and shown in the loans list, and inline
  validation on duplicate ISBNs and invalid member emails
  So that book issuing and data entry are accurate and reliable

  Background:
    Given a unique book with a unique ISBN exists in the library

  Scenario: Successfully issue a book and verify due date is shown
    Given a member exists in the library
    When I issue the book to the member
    Then the due date should be shown as 14 days after today

  Scenario: Due date appears correctly in the loans list
    Given a member exists in the library
    And I issue the book to the member
    When I open the return tab
    Then the loans list should show the due date as 14 days after today for that book

  Scenario: Adding a book with a duplicate ISBN shows an inline error
    When I add a book with the same ISBN again
    Then I should see the error "A book with this ISBN already exists."
    And the book should not be added again

  Scenario: Successfully add a book with a unique ISBN
    When I add a new book with a unique ISBN
    Then the book should be added successfully

  Scenario Outline: Adding a member with an invalid email format shows an inline error
    When I add a member with email "<email>"
    Then I should see the error "<error>"
    And the member should not be added

    # The email input is a required field, so a truly empty value never
    # reaches the app's validation logic (the browser blocks the submit).
    # "<blank>" is a sentinel the step definitions translate to a
    # whitespace-only value, which passes the required check but is empty
    # once trimmed server-side.
    Examples:
      | case            | email                 | error                         |
      | missing @       | jane.doe.example.com  | Invalid email format.         |
      | missing domain  | jane.doe@             | Invalid email format.         |
      | blank (spaces)  | <blank>               | Name and email are required   |

  Scenario: Successfully add a member with a valid email format
    When I add a new member with a valid email
    Then the member should be added successfully
