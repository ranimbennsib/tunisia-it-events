package com.itevents.profileservice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@DiscriminatorValue("USER")
@Getter
@Setter
@NoArgsConstructor
public class UserProfile extends Profile {

    @Enumerated(EnumType.STRING)
    @Column(name = "occupation", length = 20)
    private Occupation occupation;      // optional

    @Column(name = "institution", length = 150)
    private String institution;         // optional
}