package com.itevents.accountservice.service;

import com.itevents.accountservice.client.ProfileClient;
import com.itevents.accountservice.dto.AccountResponse;
import com.itevents.accountservice.dto.LoginRequest;
import com.itevents.accountservice.dto.LoginResponse;
import com.itevents.accountservice.dto.RegisterRequest;
import com.itevents.accountservice.entity.Account;
import com.itevents.accountservice.entity.AccountStatus;
import com.itevents.accountservice.entity.Role;
import com.itevents.accountservice.exception.AccountNotActiveException;
import com.itevents.accountservice.exception.DuplicateResourceException;
import com.itevents.accountservice.exception.InvalidCredentialsException;
import com.itevents.accountservice.exception.InvalidRegistrationException;
import com.itevents.accountservice.repository.AccountRepository;
import com.itevents.accountservice.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final ProfileClient profileClient;

    // Pas de @Transactional ici : on ne garde pas une transaction ouverte
    // pendant un appel HTTP vers un autre service.
    public AccountResponse register(RegisterRequest request) {
        if (request.role() == Role.ADMIN) {
            throw new InvalidRegistrationException("An admin account cannot be created by registration");
        }

        String email = normalizeEmail(request.email());
        checkUnique(email, request.phoneNumber());

        Account account = new Account();
        account.setLastName(request.lastName());
        account.setFirstName(request.firstName());
        account.setEmail(email);
        account.setPassword(passwordEncoder.encode(request.password()));
        account.setPhoneNumber(request.phoneNumber());
        account.setRole(request.role());

        Account saved = accountRepository.save(account);

        try {
            profileClient.createProfile(saved.getId(), saved.getRole(), request.profile());
        } catch (RuntimeException e) {
            // compensation : pas de compte sans profil
            accountRepository.deleteById(saved.getId());
            try {
                profileClient.deleteProfile(saved.getId());
            } catch (RuntimeException ignored) {
                log.warn("Could not delete profile of account {} during rollback", saved.getId());
            }
            throw e;
        }

        return AccountResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        Account account = accountRepository.findByEmail(email)
                .orElseThrow(() -> new InvalidCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), account.getPassword())) {
            throw new InvalidCredentialsException("Invalid email or password");
        }
        if (account.getAccountStatus() != AccountStatus.ACTIVE) {
            throw new AccountNotActiveException("Account is not active");
        }

        return new LoginResponse(
                jwtService.generateAccessToken(account),
                jwtService.generateRefreshToken(account),
                "Bearer",
                AccountResponse.from(account)
        );
    }

    private void checkUnique(String email, String phoneNumber) {
        if (accountRepository.existsByEmail(email)) {
            throw new DuplicateResourceException("Email already in use");
        }
        if (accountRepository.existsByPhoneNumber(phoneNumber)) {
            throw new DuplicateResourceException("Phone number already in use");
        }
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }
}