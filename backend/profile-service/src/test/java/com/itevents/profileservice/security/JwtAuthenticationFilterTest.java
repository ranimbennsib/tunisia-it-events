package com.itevents.profileservice.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.*;

class JwtAuthenticationFilterTest {

    private static final String SECRET = "test-secret-test-secret-test-secret-1234";
    private static final SecretKey KEY = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));

    private final JwtAuthenticationFilter filter = new JwtAuthenticationFilter(new JwtService(SECRET));

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private String token(String sub, String role, String type, Duration validity, SecretKey signingKey) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(sub)
                .claim("role", role)
                .claim("type", type)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(validity)))
                .signWith(signingKey)
                .compact();
    }

    private Authentication run(String header) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        if (header != null) {
            request.addHeader("Authorization", header);
        }
        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());
        return SecurityContextHolder.getContext().getAuthentication();
    }

    @Test
    void validAccessTokenAuthenticatesUser() throws Exception {
        Authentication auth = run("Bearer " + token("5", "USER", "access", Duration.ofMinutes(5), KEY));

        assertNotNull(auth);
        assertEquals(5L, auth.getPrincipal());
        assertEquals("ROLE_USER", auth.getAuthorities().iterator().next().getAuthority());
    }

    @Test
    void organizerRoleIsMapped() throws Exception {
        Authentication auth = run("Bearer " + token("8", "ORGANIZER", "access", Duration.ofMinutes(5), KEY));

        assertNotNull(auth);
        assertEquals("ROLE_ORGANIZER", auth.getAuthorities().iterator().next().getAuthority());
    }

    @Test
    void refreshTokenIsRejected() throws Exception {
        assertNull(run("Bearer " + token("5", "USER", "refresh", Duration.ofDays(7), KEY)));
    }

    @Test
    void expiredTokenIsRejected() throws Exception {
        assertNull(run("Bearer " + token("5", "USER", "access", Duration.ofMinutes(-5), KEY)));
    }

    @Test
    void tokenSignedWithAnotherSecretIsRejected() throws Exception {
        SecretKey other = Keys.hmacShaKeyFor("another-secret-another-secret-9999999".getBytes(StandardCharsets.UTF_8));

        assertNull(run("Bearer " + token("5", "USER", "access", Duration.ofMinutes(5), other)));
    }

    @Test
    void nonNumericSubjectIsRejected() throws Exception {
        assertNull(run("Bearer " + token("abc", "USER", "access", Duration.ofMinutes(5), KEY)));
    }

    @Test
    void garbageTokenIsRejected() throws Exception {
        assertNull(run("Bearer abc.def.ghi"));
    }

    @Test
    void missingHeaderIsIgnored() throws Exception {
        assertNull(run(null));
    }

    @Test
    void headerWithoutBearerPrefixIsIgnored() throws Exception {
        assertNull(run(token("5", "USER", "access", Duration.ofMinutes(5), KEY)));
    }
}