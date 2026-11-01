CREATE TABLE profile (
                         account_id        BIGINT        PRIMARY KEY,
                         role              VARCHAR(20)   NOT NULL,

    -- USER
                         occupation        VARCHAR(20),
                         institution       VARCHAR(150),

    -- ORGANIZER
                         organization_name VARCHAR(150),
                         description       VARCHAR(2000),
                         website           VARCHAR(255),
                         logo              VARCHAR(500),
                         commission_rate   NUMERIC(5,4),

                         created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                         updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

                         CONSTRAINT chk_profile_role
                             CHECK (role IN ('USER', 'ORGANIZER', 'ADMINISTRATOR')),
                         CONSTRAINT chk_profile_occupation
                             CHECK (occupation IS NULL OR occupation IN ('student', 'employee', 'freelancer', 'jobSeeker')),
                         CONSTRAINT chk_organizer_fields
                             CHECK (role <> 'ORGANIZER' OR organization_name IS NOT NULL),
                         CONSTRAINT chk_commission_range
                             CHECK (commission_rate IS NULL OR (commission_rate >= 0 AND commission_rate <= 1))
);

CREATE INDEX idx_profile_role ON profile(role);