package edu.ucsb.cs156.courses.repositories;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import edu.ucsb.cs156.courses.entities.User;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

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
            s, s, s, s, PageRequest.of(0, 10, Sort.by("email")))
        .getContent();
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

  @Test
  public void search_is_paged_and_sorted() {
    Page<User> first =
        userRepository
            .findByEmailContainingIgnoreCaseOrGivenNameContainingIgnoreCaseOrFamilyNameContainingIgnoreCaseOrFullNameContainingIgnoreCase(
                "a", "a", "a", "a", PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "email")));
    Page<User> second =
        userRepository
            .findByEmailContainingIgnoreCaseOrGivenNameContainingIgnoreCaseOrFamilyNameContainingIgnoreCaseOrFullNameContainingIgnoreCase(
                "a", "a", "a", "a", PageRequest.of(1, 1, Sort.by(Sort.Direction.DESC, "email")));

    assertEquals(2, first.getTotalElements());
    assertEquals(2, first.getTotalPages());
    assertEquals(List.of(dana), first.getContent());
    assertEquals(List.of(chris), second.getContent());
  }

  @Test
  public void saving_two_users_with_same_email_violates_unique_constraint() {
    userRepository.save(User.builder().email("duplicate@ucsb.edu").build());

    assertThrows(
        DataIntegrityViolationException.class,
        () -> userRepository.save(User.builder().email("duplicate@ucsb.edu").build()));
  }

  @Test
  public void saving_two_users_with_different_emails_succeeds() {
    long before = userRepository.count();
    userRepository.save(User.builder().email("first@ucsb.edu").build());
    userRepository.save(User.builder().email("second@ucsb.edu").build());

    assertEquals(before + 2, userRepository.count());
  }
}
