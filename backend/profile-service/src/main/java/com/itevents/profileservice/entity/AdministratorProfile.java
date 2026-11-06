package com.itevents.profileservice.entity;

import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.NoArgsConstructor;

@Entity
@DiscriminatorValue("ADMINISTRATOR")
@NoArgsConstructor
public class AdministratorProfile extends Profile {
}