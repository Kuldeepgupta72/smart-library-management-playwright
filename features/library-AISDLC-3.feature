Feature: AISDLC-3 - Add pagination to members list
  As a librarian
  I want GET /api/members to return paginated results
  So that the member list stays fast and consistent with the books list

  # This story is backend-only (no member-facing pagination UI — see
  # requirements "Out of Scope"), so scenarios call the API directly:
  #   GET  /api/members
  #   GET  /api/members/search
  #   POST /api/members
  #   GET  /api/books  (regression only)
  # rather than driving a UI page object, following the same pattern as
  # AISDLC-2 (library-aisdlc3.steps.ts mirrors library-aisdlc2.steps.ts).

  Scenario: Get default paginated members list
    Given at least one member exists in the library
    When I request the members list with default pagination
    Then the members response should echo page 1 and pageSize 20
    And the members response should contain at most 20 members
    And the members response total and totalPages should be consistent

  Scenario: Get specific page and pageSize of members
    Given a uniquely identifiable member has just been added
    When I request the members list with pageSize 5 for the page containing that member
    Then the members response should echo the requested page and pageSize 5
    And that member should appear in the returned members list

  Scenario: PageSize is clamped to maximum of 100
    When I request the members list with page 1 and pageSize 500
    Then the members response should echo pageSize 100
    And the members request should not fail

  Scenario Outline: Invalid or missing pagination params fall back to defaults
    When I request the members list with page "<page>" and pageSize "<pageSize>"
    Then the members response should echo page 1 and pageSize 20
    And the members request should not fail

    Examples:
      | page | pageSize |
      | abc  | xyz      |
      | -1   | -5       |
      | 0    | 0        |
      |      |          |

  Scenario: Members response contains only id, name, and email fields
    When I request the members list with default pagination
    Then each member in the members response should contain only id, name and email fields

  Scenario: Members search endpoint still returns flat array
    Given a uniquely identifiable member has just been added
    When I search for that member by name
    Then the search response should be a flat array of members, not a paginated envelope
    And that member should appear in the search results

  Scenario: Create member still returns 201
    When I create a new member with a unique name and email
    Then the create member request should return status 201
    And the response should contain the new member's id, name and email

  Scenario: Books endpoint pagination and filters remain unchanged
    When I request the books list with default pagination
    Then the books response should echo page 1 and pageSize 20
    And the books response should contain page, pageSize, total and totalPages fields
    When I request the books list with pageSize 500
    Then the books response should echo pageSize 100
    When I request the books list sorted by author
    Then the returned books should be ordered by author ascending
    When I request the books list filtered by availability "available"
    Then all returned books in the response should be marked as available
