package com.itevents.profileservice.service;

import com.itevents.profileservice.dto.CreateProfileRequest;
import com.itevents.profileservice.dto.ProfileResponse;
import com.itevents.profileservice.dto.ProfileRole;
import com.itevents.profileservice.entity.AdministratorProfile;
import com.itevents.profileservice.entity.OrganizerProfile;
import com.itevents.profileservice.entity.Profile;
import com.itevents.profileservice.entity.UserProfile;
import com.itevents.profileservice.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class ProfileService {

    public record CreationResult(ProfileResponse profile, boolean created) {
    }

    private final ProfileRepository profileRepository;

    @Value("${profile.default-commission-rate:0.1000}")
    private BigDecimal defaultCommissionRate;

    @Transactional
    public CreationResult create(CreateProfileRequest request) {
        // Idempotent: same accountId already has a profile
        Profile existing = profileRepository.findById(request.accountId()).orElse(null);
        if (existing != null) {
            if (roleOf(existing) != request.role()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "A profile with a different role already exists for this account");
            }
            return new CreationResult(toResponse(existing), false);
        }

        Profile profile = switch (request.role()) {
            case USER -> {
                UserProfile user = new UserProfile();
                user.setOccupation(request.occupation());
                user.setInstitution(request.institution());
                yield user;
            }
            case ORGANIZER -> {
                if (request.organizationName() == null || request.organizationName().isBlank()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "organizationName is required for an organizer");
                }
                OrganizerProfile organizer = new OrganizerProfile();
                organizer.setOrganizationName(request.organizationName());
                organizer.setDescription(request.description());
                organizer.setWebsite(request.website());
                organizer.setCommissionRate(defaultCommissionRate);
                yield organizer;
            }
            case ADMINISTRATOR -> new AdministratorProfile();
        };
        profile.setAccountId(request.accountId());

        Profile saved = profileRepository.save(profile);
        return new CreationResult(toResponse(saved), true);
    }

    @Transactional(readOnly = true)
    public ProfileResponse get(Long accountId) {
        Profile profile = profileRepository.findById(accountId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));
        return toResponse(profile);
    }

    private ProfileRole roleOf(Profile profile) {
        if (profile instanceof OrganizerProfile) return ProfileRole.ORGANIZER;
        if (profile instanceof AdministratorProfile) return ProfileRole.ADMINISTRATOR;
        return ProfileRole.USER;
    }

    private ProfileResponse toResponse(Profile profile) {
        if (profile instanceof UserProfile u) {
            return new ProfileResponse(u.getAccountId(), ProfileRole.USER, u.getOccupation(), u.getInstitution(),
                    null, null, null, null, null, u.getCreatedAt());
        }
        if (profile instanceof OrganizerProfile o) {
            return new ProfileResponse(o.getAccountId(), ProfileRole.ORGANIZER, null, null,
                    o.getOrganizationName(), o.getDescription(), o.getWebsite(), o.getLogo(),
                    o.getCommissionRate(), o.getCreatedAt());
        }
        return new ProfileResponse(profile.getAccountId(), ProfileRole.ADMINISTRATOR, null, null,
                null, null, null, null, null, profile.getCreatedAt());
    }
}