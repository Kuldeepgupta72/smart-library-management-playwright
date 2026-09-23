Feature: AISDLC-4 - Enforce email uniqueness on member creation
  As a librarian
  I want POST /api/members to reject a duplicate email
  So that member records stay unambiguous, mirroring how POST /api/books
  already rejects a duplicate ISBN

  # This story is backend-only (isDuplicateEmail in src/validators.ts,
  # idx_members_email_unique in src/db/database.ts, POST /api/members in
  # src/routes/members.ts — no new UI), so scenarios call the API directly:
  #   POST /api/members
  #   GET  /api/members
  #   GET  /api/members/search
  #   POST /api/books, POST /api/loans/issue, POST /api/loans/return (regression only)
  # following the same pattern as AISDLC-3 (library-aisdlc3.steps.ts).
  #
  # Traceability (requirements-AISDLC-4.md):
  #   AC1/FR1 -> Scenario: Reject member creation with duplicate email
  #   AC2/FR2 (isDuplicateEmail helper)        -> no separate E2E scenario;
  #     internal helper, exercised indirectly via AC1/AC4 scenarios below,
  #     already covered by tests/members-email-uniqueness.test.ts
  #   AC3/FR3 (unique index + migration guard) -> no separate E2E scenario;
  #     requires seeding pre-existing duplicate rows before server start,
  #     outside black-box HTTP scope; already covered by the same test file
  #   AC4/FR4 (non-duplicate create unchanged)  -> Scenario: Create member
  #     with unique email succeeds
  #   AC4/FR4 (search unchanged)                -> Scenario: Member search
  #     endpoint is unaffected by uniqueness enforcement
  #   AC4/FR4 (paginated list unchanged, handoff item 4) -> Scenario:
  #     Paginated member list is unaffected by uniqueness enforcement
  #   AC5/FR5 (no new tables/columns/endpoints) -> not runtime-testable;
  #     verified by code/design review, no scenario
  #   Handoff item 5 (regression)               -> Scenario: Regression -
  #     books and loans endpoints remain unaffected

  Scenario: Reject member creation with duplicate email
    Given a member exists with a known email
    When I attempt to create another member with that same email
    Then the create member request should return status 409
    And the response should contain the error "A member with this email already exists."

  Scenario: Create member with unique email succeeds
    When I create a new member with a unique name and email
    Then the create member request should return status 201
    And the response should contain the new member's id, name and email

  Scenario: Member search endpoint is unaffected by uniqueness enforcement
    Given a uniquely identifiable member has just been added
    When I search for that member by name
    Then the search response should be a flat array of members, not a paginated envelope
    And that member should appear in the search results

  Scenario: Paginated member list is unaffected by uniqueness enforcement
    Given at least one member exists in the library
    When I request the members list with default pagination
    Then the members response should echo page 1 and pageSize 20
    And the members response should contain at most 20 members
    And the members response total and totalPages should be consistent

  Scenario: Regression - books and loans endpoints remain unaffected
    When I add a new book with a unique ISBN via the API
    Then the create book request should return status 201
    When I create a new member with a unique name and email
    Then the create member request should return status 201
    When I issue that book to that member via the API
    Then the issue request should succeed with a due date
    When I return that loan via the API
    Then the return request should succeed
