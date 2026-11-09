package edu.ucsb.cs156.courses.repositories;

import static org.junit.jupiter.api.Assertions.assertEquals;

import edu.ucsb.cs156.courses.entities.User;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

@DataJpaTest
public class UserRepositoryTests {

  @Autowired UserRepository userRepository;

  User chris;
  User dana;

  @BeforeEach
  public void setUp() {
    chris =
        userRepository.save(
            User.builder()
                .email("cgaucho@ucsb.edu")
                .givenName("Chris")
                .familyName("Gaucho")
                .fullName("Chris Gaucho")
                .build());
    dana =
        userRepository.save(
            User.builder()
                .email("dana@example.com")
                .givenName("Dana")
                .familyName("Lopez")
                .fullName("Dana Lopez")
                .build());
  }

  private List<User> search(String s) {
    return userRepository
        .findByEmailContainingIgnoreCaseOrGivenNameContainingIgnoreCaseOrFamilyNameContainingIgnoreCaseOrFullNameContainingIgnoreCase(
            s, s, s, s);
  }

  @Test
  public void search_matches_given_name_case_insensitively() {
    assertEquals(List.of(chris), search("chr"));
  }

  @Test
  public void search_matches_family_name_case_insensitively() {
    assertEquals(List.of(dana), search("LOP"));
  }

  @Test
  public void search_matches_full_name_with_space() {
    assertEquals(List.of(chris), search("Chris Gau"));
  }

  @Test
  public void search_returns_all_matches() {
    assertEquals(List.of(chris, dana), search("a"));
  }

  @Test
  public void search_with_no_match_returns_empty_list() {
    assertEquals(List.of(), search("zzz"));
  }

  @Test
  public void search_matches_email_case_insensitively() {
    assertEquals(List.of(dana), search("@EXAMPLE"));
  }

  @Test
  public void search_matches_across_email_and_name_fields() {
    assertEquals(List.of(chris, dana), search("a"));
    assertEquals(2, search("@").size());
  }
}
