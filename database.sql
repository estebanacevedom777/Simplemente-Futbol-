CREATE DATABASE IF NOT EXISTS simplemente_futbol
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE simplemente_futbol;

CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(60) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at BIGINT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS listings (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    title VARCHAR(70) NOT NULL,
    category VARCHAR(20) NOT NULL,
    `condition` VARCHAR(20) NOT NULL,
    price INT UNSIGNED NOT NULL,
    city VARCHAR(50) NOT NULL,
    description VARCHAR(240) NOT NULL,
    image VARCHAR(2048) NOT NULL DEFAULT '',
    created_at BIGINT NOT NULL,
    INDEX listings_created_at (created_at),
    CONSTRAINT listings_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS favorites (
    user_id CHAR(36) NOT NULL,
    listing_id VARCHAR(80) NOT NULL,
    PRIMARY KEY (user_id, listing_id),
    CONSTRAINT favorites_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS custom_matches (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    competition VARCHAR(40) NOT NULL,
    kickoff VARCHAR(32) NOT NULL,
    home_team VARCHAR(40) NOT NULL,
    away_team VARCHAR(40) NOT NULL,
    home_odds DECIMAL(7, 2) NOT NULL,
    draw_odds DECIMAL(7, 2) NOT NULL,
    away_odds DECIMAL(7, 2) NOT NULL,
    created_at BIGINT NOT NULL,
    INDEX matches_created_at (created_at),
    CONSTRAINT matches_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
