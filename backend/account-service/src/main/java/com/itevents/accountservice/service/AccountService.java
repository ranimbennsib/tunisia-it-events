package com.itevents.accountservice.service;

import com.itevents.accountservice.dto.AccountResponse;
import com.itevents.accountservice.dto.ChangePasswordRequest;
import com.itevents.accountservice.dto.UpdateAccountRequest;
import com.itevents.accountservice.entity.Account;
import com.itevents.accountservice.exception.DuplicateResourceException;
import com.itevents.accountservice.exception.InvalidPasswordException;
import com.itevents.accountservice.exception.ResourceNotFoundException;
import com.itevents.accountservice.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.itevents.accountservice.dto.PageResponse;
import com.itevents.accountservice.entity.AccountStatus;
import com.itevents.accountservice.entity.Role;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public AccountResponse getById(Long id) {
        return AccountResponse.from(findOrThrow(id));
    }

    @Transactional
    public AccountResponse update(Long id, UpdateAccountRequest request) {
        Account account = findOrThrow(id);

        boolean phoneChanged = !account.getPhoneNumber().equals(request.phoneNumber());
        if (phoneChanged && accountRepository.existsByPhoneNumber(request.phoneNumber())) {
            throw new DuplicateResourceException("Phone number already in use");
        }

        account.setLastName(request.lastName());
        account.setFirstName(request.firstName());
        account.setPhoneNumber(request.phoneNumber());

        return AccountResponse.from(accountRepository.save(account));
    }

    @Transactional
    public void changePassword(Long id, ChangePasswordRequest request) {
        Account account = findOrThrow(id);

        if (!passwordEncoder.matches(request.currentPassword(), account.getPassword())) {
            throw new InvalidPasswordException("Current password is incorrect");
        }
        if (passwordEncoder.matches(request.newPassword(), account.getPassword())) {
            throw new InvalidPasswordException("New password must be different from the current one");
        }

        account.setPassword(passwordEncoder.encode(request.newPassword()));
        accountRepository.save(account);
    }
    @Transactional(readOnly = true)
    public PageResponse<AccountResponse> search(Role role, AccountStatus status,
                                                String search, int page, int size) {
        String term = search == null ? "" : search.trim();
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by("createdAt").descending());

        return PageResponse.from(
                accountRepository.search(role, status, term, pageable),
                AccountResponse::from);
    }
    private Account findOrThrow(Long id) {
        return accountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
    }
}