package com.itevents.accountservice.security;

import com.itevents.accountservice.entity.Account;
import com.itevents.accountservice.entity.Role;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class JwtAuthenticationFilterTest {

    private static final String SECRET = "test-secret-test-secret-test-secret-1234";

    private final JwtService jwtService = new JwtService(SECRET, 30, 7);
    private final JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwtService);

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private Account account(long id, Role role) {
        Account account = new Account();
        account.setId(id);
        account.setRole(role);
        return account;
    }

    private Authentication runFilter(String authorizationHeader) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        if (authorizationHeader != null) {
            request.addHeader("Authorization", authorizationHeader);
        }
        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());
        return SecurityContextHolder.getContext().getAuthentication();
    }

    @Test
    void validAccessTokenAuthenticatesUser() throws Exception {
        String token = jwtService.generateAccessToken(account(5L, Role.USER));

        Authentication auth = runFilter("Bearer " + token);

        assertNotNull(auth);
        assertEquals(Long.valueOf(5L), auth.getPrincipal());
        assertEquals("ROLE_USER", auth.getAuthorities().iterator().next().getAuthority());
    }

    @Test
    void validAccessTokenOfOrganizerHasOrganizerRole() throws Exception {
        Authentication auth = runFilter("Bearer " + jwtService.generateAccessToken(account(8L, Role.ORGANIZER)));

        assertNotNull(auth);
        assertEquals("ROLE_ORGANIZER", auth.getAuthorities().iterator().next().getAuthority());
    }

    @Test
    void validAccessTokenOfAdminHasAdminRole() throws Exception {
        Authentication auth = runFilter("Bearer " + jwtService.generateAccessToken(account(1L, Role.ADMIN)));

        assertNotNull(auth);
        assertEquals("ROLE_ADMIN", auth.getAuthorities().iterator().next().getAuthority());
    }

    @Test
    void refreshTokenIsRejected() throws Exception {
        String refresh = jwtService.generateRefreshToken(account(5L, Role.USER));

        assertNull(runFilter("Bearer " + refresh));
    }

    @Test
    void garbageTokenIsRejected() throws Exception {
        assertNull(runFilter("Bearer abc.def.ghi"));
    }

    @Test
    void tokenSignedWithAnotherSecretIsRejected() throws Exception {
        JwtService other = new JwtService("another-secret-another-secret-9999999", 30, 7);
        String foreignToken = other.generateAccessToken(account(5L, Role.USER));

        assertNull(runFilter("Bearer " + foreignToken));
    }

    @Test
    void missingHeaderIsIgnored() throws Exception {
        assertNull(runFilter(null));
    }

    @Test
    void headerWithoutBearerPrefixIsIgnored() throws Exception {
        String token = jwtService.generateAccessToken(account(5L, Role.USER));

        assertNull(runFilter(token));
    }
}