package com.itevents.accountservice.service;

import com.itevents.accountservice.dto.AccountResponse;
import com.itevents.accountservice.dto.ChangePasswordRequest;
import com.itevents.accountservice.dto.UpdateAccountRequest;
import com.itevents.accountservice.entity.Account;
import com.itevents.accountservice.exception.DuplicateResourceException;
import com.itevents.accountservice.exception.InvalidPasswordException;
import com.itevents.accountservice.exception.OperationNotAllowedException;
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
import com.itevents.accountservice.dto.AccountContactResponse;
import com.itevents.accountservice.client.NotificationClient;
import com.itevents.accountservice.client.NotificationType;
import java.util.Map;
import com.itevents.accountservice.dto.AccountIdsResponse;
import org.springframework.data.domain.Page;
@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final NotificationClient notificationClient;
    
    // date d'envoi de l'email de bienvenue (vide = pas encore envoyé)
    
    @Transactional(readOnly = true)
    public AccountResponse getById(Long id) {
        return AccountResponse.from(findOrThrow(id));
    }
    //nouveaux pour notif
        @Transactional(readOnly = true)
    public AccountContactResponse getContact(Long id) {
        Account account = findOrThrow(id);
        return new AccountContactResponse(account.getId(), account.getFirstName(), account.getEmail());
    }
        @Transactional(readOnly = true)
    public AccountIdsResponse getActiveUserIds(int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 200);
        Page<Account> result = accountRepository.search(Role.USER, AccountStatus.ACTIVE, "",
                PageRequest.of(safePage, safeSize, Sort.by("id")));
        return new AccountIdsResponse(result.getContent().stream().map(Account::getId).toList(),result.isLast());
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
        notificationClient.send(account.getId(), NotificationType.PASSWORD_CHANGED, Map.of());
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
    @Transactional
    public AccountResponse updateStatus(Long adminId, Long targetId, AccountStatus status) {
        if (adminId.equals(targetId)) {
            throw new OperationNotAllowedException("You cannot change the status of your own account");
        }

        Account target = findOrThrow(targetId);
        if (target.getRole() == Role.ADMIN) {
            throw new OperationNotAllowedException("The status of an admin account cannot be changed");
        }

        boolean wasActive = target.getAccountStatus() == AccountStatus.ACTIVE;
        boolean isActive = status == AccountStatus.ACTIVE;

        target.setAccountStatus(status);
        Account saved = accountRepository.save(target);

        // email seulement quand le compte devient actif ou cesse de l'être
        if (wasActive != isActive) {
            notificationClient.send(saved.getId(),
                    isActive ? NotificationType.ACCOUNT_ACTIVATED : NotificationType.ACCOUNT_DEACTIVATED,
                    Map.of());
        }

        return AccountResponse.from(saved);
    }
    private Account findOrThrow(Long id) {
        return accountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
    }
}