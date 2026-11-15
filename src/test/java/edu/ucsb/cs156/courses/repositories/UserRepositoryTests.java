package edu.ucsb.cs156.courses.repositories;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import edu.ucsb.cs156.courses.entities.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;

@DataJpaTest
public class UserRepositoryTests {

  @Autowired UserRepository userRepository;

  @Test
  public void saving_two_users_with_same_email_violates_unique_constraint() {
    userRepository.save(User.builder().email("duplicate@ucsb.edu").build());

    assertThrows(
        DataIntegrityViolationException.class,
        () -> userRepository.save(User.builder().email("duplicate@ucsb.edu").build()));
  }

  @Test
  public void saving_two_users_with_different_emails_succeeds() {
    userRepository.save(User.builder().email("first@ucsb.edu").build());
    userRepository.save(User.builder().email("second@ucsb.edu").build());

    assertEquals(2, userRepository.count());
  }
}
