package com.itevents.accountservice.client;

import com.itevents.accountservice.entity.Role;
import com.itevents.accountservice.exception.ProfileRejectedException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@ConditionalOnProperty(name = "profile.client", havingValue = "fake", matchIfMissing = true)
public class FakeProfileClient implements ProfileClient {

    private final Map<Long, Map<String, Object>> profiles = new ConcurrentHashMap<>();

    @Override
    public void createProfile(Long accountId, Role role, Map<String, Object> profile) {
        List<String> required = switch (role) {
            case USER -> List.of("occupation", "institution");
            case ORGANIZER -> List.of("organizationName", "description", "logo");
            default -> throw new ProfileRejectedException("No profile for role " + role);
        };

        for (String field : required) {
            Object value = profile.get(field);
            if (value == null || value.toString().isBlank()) {
                throw new ProfileRejectedException("Profile field is required: " + field);
            }
        }

        profiles.put(accountId, profile);
        log.info("[FAKE profile-service] created profile for account {} ({})", accountId, role);
    }

    @Override
    public void deleteProfile(Long accountId) {
        profiles.remove(accountId);
        log.info("[FAKE profile-service] deleted profile of account {}", accountId);
    }
}