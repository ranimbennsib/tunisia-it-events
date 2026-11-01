package com.itevents.accountservice.config;

import com.itevents.accountservice.entity.Account;
import com.itevents.accountservice.entity.Role;
import com.itevents.accountservice.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class AdminSeeder implements ApplicationRunner {

    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${admin.email}")
    private String adminEmail;

    @Value("${admin.password}")
    private String adminPassword;

    @Override
    public void run(ApplicationArguments args) {
        if (accountRepository.existsByRole(Role.ADMIN)) {
            return;
        }
        if (adminPassword == null || adminPassword.length() < 8) {
            throw new IllegalStateException("ADMIN_PASSWORD must be at least 8 characters");
        }

        Account admin = new Account();
        admin.setLastName("Admin");
        admin.setFirstName("Platform");
        admin.setEmail(adminEmail.trim().toLowerCase());
        admin.setPassword(passwordEncoder.encode(adminPassword));
        admin.setPhoneNumber("00000000");
        admin.setRole(Role.ADMIN);
        accountRepository.save(admin);

        log.info("Initial admin account created: {}", admin.getEmail());
    }
}