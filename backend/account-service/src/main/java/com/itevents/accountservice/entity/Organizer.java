package com.itevents.accountservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name="organizer")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Organizer extends Account{

    @Column(nullable = false)
    private String organizationName;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private String Website;

    @Column(nullable = false)
    private String logo;

}
