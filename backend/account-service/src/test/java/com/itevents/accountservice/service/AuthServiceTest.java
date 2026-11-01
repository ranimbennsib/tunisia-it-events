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
import com.itevents.accountservice.exception.ProfileRejectedException;
import com.itevents.accountservice.exception.ProfileServiceUnavailableException;
import com.itevents.accountservice.repository.AccountRepository;
import com.itevents.accountservice.security.JwtService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock AccountRepository accountRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock JwtService jwtService;
    @Mock ProfileClient profileClient;

    @InjectMocks AuthService authService;

    // ---------- helpers ----------

    private Account existingAccount() {
        Account account = new Account();
        account.setId(1L);
        account.setEmail("ranim@test.com");
        account.setPassword("hash");
        account.setRole(Role.USER);
        return account;
    }

    private RegisterRequest registerRequest(String email, String phone, Role role) {
        Map<String, Object> profile = role == Role.ORGANIZER
                ? Map.of("organizationName", "Tunisia Tech", "description", "IT", "logo", "logo.png")
                : Map.of("occupation", "Student", "institution", "ISI Tunis");
        return new RegisterRequest("Ben Nsib", "Ranim", email, "Password123", phone, role, profile);
    }

    private void stubSave() {
        when(passwordEncoder.encode("Password123")).thenReturn("hashed");
        when(accountRepository.save(any(Account.class))).thenAnswer(inv -> {
            Account a = inv.getArgument(0);
            a.setId(10L);
            return a;
        });
    }

    // ---------- register ----------

    @Test
    void registerUserSavesAccountAndCreatesProfile() {
        stubSave();

        AccountResponse response = authService.register(registerRequest("ranim@test.com", "12345678", Role.USER));

        assertEquals(10L, response.id());
        assertEquals(Role.USER, response.role());
        assertEquals(AccountStatus.ACTIVE, response.accountStatus());
        verify(profileClient).createProfile(eq(10L), eq(Role.USER), any());
    }

    @Test
    void registerOrganizerCreatesOrganizerAccount() {
        stubSave();

        AccountResponse response = authService.register(registerRequest("sami@test.com", "87654321", Role.ORGANIZER));

        assertEquals(Role.ORGANIZER, response.role());
        verify(profileClient).createProfile(eq(10L), eq(Role.ORGANIZER), any());
    }

    @Test
    void registerNormalizesEmail() {
        stubSave();

        AccountResponse response = authService.register(registerRequest("  Ranim@Test.COM ", "12345678", Role.USER));

        assertEquals("ranim@test.com", response.email());
    }

    @Test
    void registerHashesPassword() {
        stubSave();

        authService.register(registerRequest("ranim@test.com", "12345678", Role.USER));

        verify(passwordEncoder).encode("Password123");
    }

    @Test
    void registerRejectsAdminRole() {
        assertThrows(InvalidRegistrationException.class,
                () -> authService.register(registerRequest("pirate@test.com", "33334444", Role.ADMIN)));

        verify(accountRepository, never()).save(any());
        verify(profileClient, never()).createProfile(any(), any(), any());
    }

    @Test
    void registerFailsWhenEmailAlreadyUsed() {
        when(accountRepository.existsByEmail("ranim@test.com")).thenReturn(true);

        assertThrows(DuplicateResourceException.class,
                () -> authService.register(registerRequest("ranim@test.com", "12345678", Role.USER)));

        verify(accountRepository, never()).save(any());
    }

    @Test
    void registerFailsWhenPhoneAlreadyUsed() {
        when(accountRepository.existsByPhoneNumber("12345678")).thenReturn(true);

        assertThrows(DuplicateResourceException.class,
                () -> authService.register(registerRequest("new@test.com", "12345678", Role.USER)));

        verify(accountRepository, never()).save(any());
    }

    @Test
    void registerDeletesAccountWhenProfileIsRejected() {
        stubSave();
        doThrow(new ProfileRejectedException("Profile field is required: institution"))
                .when(profileClient).createProfile(any(), any(), any());

        assertThrows(ProfileRejectedException.class,
                () -> authService.register(registerRequest("ranim@test.com", "12345678", Role.USER)));

        verify(accountRepository).deleteById(10L);
    }

    @Test
    void registerDeletesAccountWhenProfileServiceIsDown() {
        stubSave();
        doThrow(new ProfileServiceUnavailableException("Profile service unavailable"))
                .when(profileClient).createProfile(any(), any(), any());

        assertThrows(ProfileServiceUnavailableException.class,
                () -> authService.register(registerRequest("ranim@test.com", "12345678", Role.USER)));

        verify(accountRepository).deleteById(10L);
    }

    @Test
    void registerStillRollsBackWhenProfileDeletionFails() {
        stubSave();
        doThrow(new ProfileRejectedException("rejected"))
                .when(profileClient).createProfile(any(), any(), any());
        doThrow(new ProfileServiceUnavailableException("down"))
                .when(profileClient).deleteProfile(10L);

        assertThrows(ProfileRejectedException.class,
                () -> authService.register(registerRequest("ranim@test.com", "12345678", Role.USER)));

        verify(accountRepository).deleteById(10L);
    }

    // ---------- login ----------

    @Test
    void loginReturnsTokensWhenCredentialsAreValid() {
        Account account = existingAccount();
        when(accountRepository.findByEmail("ranim@test.com")).thenReturn(Optional.of(account));
        when(passwordEncoder.matches("Password123", "hash")).thenReturn(true);
        when(jwtService.generateAccessToken(account)).thenReturn("access-token");
        when(jwtService.generateRefreshToken(account)).thenReturn("refresh-token");

        LoginResponse response = authService.login(new LoginRequest("ranim@test.com", "Password123"));

        assertEquals("access-token", response.accessToken());
        assertEquals("refresh-token", response.refreshToken());
        assertEquals("Bearer", response.tokenType());
        assertEquals(Role.USER, response.account().role());
    }

    @Test
    void loginNormalizesEmail() {
        Account account = existingAccount();
        when(accountRepository.findByEmail("ranim@test.com")).thenReturn(Optional.of(account));
        when(passwordEncoder.matches("Password123", "hash")).thenReturn(true);
        when(jwtService.generateAccessToken(account)).thenReturn("a");
        when(jwtService.generateRefreshToken(account)).thenReturn("r");

        LoginResponse response = authService.login(new LoginRequest("  Ranim@Test.COM ", "Password123"));

        assertEquals("ranim@test.com", response.account().email());
    }

    @Test
    void loginFailsWhenPasswordIsWrong() {
        when(accountRepository.findByEmail("ranim@test.com")).thenReturn(Optional.of(existingAccount()));
        when(passwordEncoder.matches("Faux12345", "hash")).thenReturn(false);

        assertThrows(InvalidCredentialsException.class,
                () -> authService.login(new LoginRequest("ranim@test.com", "Faux12345")));

        verify(jwtService, never()).generateAccessToken(any());
    }

    @Test
    void loginFailsWhenEmailIsUnknown() {
        when(accountRepository.findByEmail("inconnu@test.com")).thenReturn(Optional.empty());

        assertThrows(InvalidCredentialsException.class,
                () -> authService.login(new LoginRequest("inconnu@test.com", "Password123")));
    }

    @Test
    void loginFailsWhenAccountIsNotActive() {
        Account account = existingAccount();
        account.setAccountStatus(AccountStatus.SUSPENDED);
        when(accountRepository.findByEmail("ranim@test.com")).thenReturn(Optional.of(account));
        when(passwordEncoder.matches("Password123", "hash")).thenReturn(true);

        assertThrows(AccountNotActiveException.class,
                () -> authService.login(new LoginRequest("ranim@test.com", "Password123")));

        verify(jwtService, never()).generateAccessToken(any());
    }

    @Test
    void inactiveAccountWithWrongPasswordGetsInvalidCredentials() {
        Account account = existingAccount();
        account.setAccountStatus(AccountStatus.SUSPENDED);
        when(accountRepository.findByEmail("ranim@test.com")).thenReturn(Optional.of(account));
        when(passwordEncoder.matches("Faux12345", "hash")).thenReturn(false);

        assertThrows(InvalidCredentialsException.class,
                () -> authService.login(new LoginRequest("ranim@test.com", "Faux12345")));
    }
}

