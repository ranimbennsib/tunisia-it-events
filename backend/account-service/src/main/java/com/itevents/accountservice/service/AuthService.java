package com.itevents.accountservice.service;

import com.itevents.accountservice.dto.AccountResponse;
import com.itevents.accountservice.dto.LoginRequest;
import com.itevents.accountservice.dto.RegisterOrganizerRequest;
import com.itevents.accountservice.dto.RegisterUserRequest;
import com.itevents.accountservice.entity.Account;
import com.itevents.accountservice.entity.Organizer;
import com.itevents.accountservice.entity.User;
import com.itevents.accountservice.exception.DuplicateResourceException;
import com.itevents.accountservice.exception.InvalidCredentialsException;
import com.itevents.accountservice.repository.AccountRepository;
import com.itevents.accountservice.repository.OrganizerRepository;
import com.itevents.accountservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final OrganizerRepository organizerRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public AccountResponse registerUser(RegisterUserRequest request) {
        String email = normalizeEmail(request.email());
        checkUnique(email, request.phoneNumber());

        User user = new User();
        fillCommonFields(user, request.lastName(), request.firstName(),
                email, request.password(), request.phoneNumber());
        user.setOccupation(request.occupation());
        user.setInstitution(request.institution());

        return AccountResponse.from(userRepository.save(user));
    }

    @Transactional
    public AccountResponse registerOrganizer(RegisterOrganizerRequest request) {
        String email = normalizeEmail(request.email());
        checkUnique(email, request.phoneNumber());

        Organizer organizer = new Organizer();
        fillCommonFields(organizer, request.lastName(), request.firstName(),
                email, request.password(), request.phoneNumber());
        organizer.setOrganizationName(request.organizationName());
        organizer.setDescription(request.description());
        organizer.setWebsite(request.website());
        organizer.setLogo(request.logo());

        return AccountResponse.from(organizerRepository.save(organizer));
    }

    private void checkUnique(String email, String phoneNumber) {
        if (accountRepository.existsByEmail(email)) {
            throw new DuplicateResourceException("Email already in use");
        }
        if (accountRepository.existsByPhoneNumber(phoneNumber)) {
            throw new DuplicateResourceException("Phone number already in use");
        }
    }

    private void fillCommonFields(Account account, String lastName, String firstName,
                                  String email, String rawPassword, String phoneNumber) {
        account.setLastName(lastName);
        account.setFirstName(firstName);
        account.setEmail(email);
        account.setPassword(passwordEncoder.encode(rawPassword));
        account.setPhoneNumber(phoneNumber);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }

    @Transactional(readOnly = true)
    public AccountResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        Account account = accountRepository.findByEmail(email).orElseThrow(() ->  new InvalidCredentialsException("Invalid email or password"));
        if (!passwordEncoder.matches(request.password(), account.getPassword())) {
            throw new InvalidCredentialsException( "Invalid email or password");
        }
        return AccountResponse.from(account);
    }

}