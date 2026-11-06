package com.itevents.profileservice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@DiscriminatorValue("ORGANIZER")
@Getter
@Setter
@NoArgsConstructor
public class OrganizerProfile extends Profile {

    @Column(name = "organization_name", length = 150)
    private String organizationName;

    @Column(name = "description", length = 2000)
    private String description;         // optional

    @Column(name = "website", length = 255)
    private String website;             // optional

    @Column(name = "logo", length = 500)
    private String logo;                // optional, URL only

    // Only an administrator can change it. 0.1000 = 10 %
    @Column(name = "commission_rate", precision = 5, scale = 4)
    private BigDecimal commissionRate;
}