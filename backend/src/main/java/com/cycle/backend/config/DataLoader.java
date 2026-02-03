package com.cycle.backend.config;

import com.cycle.backend.model.Role;
import com.cycle.backend.model.User;
import com.cycle.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataLoader implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataLoader.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        // 테스트 계정이 이미 존재하는지 확인
        if (userRepository.findByUsername("testuser").isEmpty()) {
            // 테스트 계정 생성
            User testUser = new User();
            testUser.setUsername("testuser");
            testUser.setPassword(passwordEncoder.encode("password123"));
            testUser.setRole(Role.USER);

            userRepository.save(testUser);

            logger.info("========================================");
            logger.info("테스트 계정이 생성되었습니다!");
            logger.info("Username: testuser");
            logger.info("Password: password123");
            logger.info("========================================");
        } else {
            logger.info("테스트 계정이 이미 존재합니다.");
        }
    }
}
