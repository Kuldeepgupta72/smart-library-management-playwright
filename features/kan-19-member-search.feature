Feature: KAN-19 - Search Members by Name or Email
  As a librarian
  I want to search for members by name or email
  So that I can quickly find a member's record when they visit the library

  Background:
    Given two members exist in the library for search testing

  Scenario: Search members by partial name match
    When I type a partial name into the member search box
    Then only members whose name contains that term should be shown
    And members that do not match should not be shown

  Scenario: Search members by partial email match
    When I type a partial email into the member search box
    Then only members whose email contains that term should be shown

  Scenario: Search with no matching results shows empty state
    When I type a search term that matches no member
    Then I should see the "No members found." message

  Scenario: Clearing the search restores the full members list
    Given I have searched for a member by name
    When I clear the member search box
    Then all members should be visible again
