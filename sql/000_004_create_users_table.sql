CREATE TABLE thlush_users
(
    id            uuid                     NOT NULL DEFAULT gen_random_uuid(),
    name          character varying        NOT NULL,
    email         character varying        NOT NULL,
    password      character varying        NOT NULL,
    role          character varying        NOT NULL DEFAULT 'billing',
    created_at    timestamp with time zone NOT NULL DEFAULT now(),
    last_login_at timestamp with time zone NULL,
    CONSTRAINT thlush_users_pkey PRIMARY KEY (id),
    CONSTRAINT thlush_users_email_unique UNIQUE (email)
);
