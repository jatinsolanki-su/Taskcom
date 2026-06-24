-- Enterprise Ticket Management System Schema
-- Database: MySQL

CREATE DATABASE IF NOT EXISTS ticket_manager;
USE ticket_manager;

-- Disable foreign key checks temporarily to allow clean drops
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS ticket_activity;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- Table: users
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'Employee') DEFAULT 'Employee' NOT NULL,
    is_disabled TINYINT(1) DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_email (email),
    INDEX idx_user_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: tickets
CREATE TABLE tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status ENUM('Open', 'In Progress', 'Review', 'Resolved', 'Closed') DEFAULT 'Open' NOT NULL,
    priority ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Low' NOT NULL,
    reporter_id INT NOT NULL,
    assignee_id INT NULL,
    category VARCHAR(100) DEFAULT 'General' NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_ticket_reporter FOREIGN KEY (reporter_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_ticket_assignee FOREIGN KEY (assignee_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    
    INDEX idx_ticket_status (status),
    INDEX idx_ticket_priority (priority),
    INDEX idx_ticket_reporter (reporter_id),
    INDEX idx_ticket_assignee (assignee_id),
    INDEX idx_ticket_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: comments
CREATE TABLE comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_comment_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_comment_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    
    INDEX idx_comment_ticket (ticket_id),
    INDEX idx_comment_user (user_id),
    INDEX idx_comment_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: notifications
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    link VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
    
    INDEX idx_notification_user (user_id),
    INDEX idx_notification_unread (user_id, is_read),
    INDEX idx_notification_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: ticket_activity
CREATE TABLE ticket_activity (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    user_id INT NOT NULL,
    activity_type VARCHAR(50) NOT NULL, -- e.g., 'CREATED', 'STATUS_CHANGE', 'ASSIGNEE_CHANGE', 'PRIORITY_CHANGE', 'COMMENT_ADDED', 'DELETED'
    old_value VARCHAR(255) NULL,
    new_value VARCHAR(255) NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_activity_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    
    INDEX idx_activity_ticket (ticket_id),
    INDEX idx_activity_user (user_id),
    INDEX idx_activity_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed initial admin user (Password is 'admin123' - Argon2/bcrypt pre-hashed)
-- Bcrypt hash for 'admin123': $2a$10$3zR/2MvV7pSjP5uE/Nen.OQdY7Zis9L6t1h.zOQp7l7R2O6v32e0K
INSERT INTO users (name, email, password_hash, role) VALUES 
('Enterprise Administrator', 'admin@enterprise.com', '$2a$10$3zR/2MvV7pSjP5uE/Nen.OQdY7Zis9L6t1h.zOQp7l7R2O6v32e0K', 'Admin'),
('Jane Employee', 'employee@enterprise.com', '$2a$10$3zR/2MvV7pSjP5uE/Nen.OQdY7Zis9L6t1h.zOQp7l7R2O6v32e0K', 'Employee');

-- Migration & Installation Instructions:
-- 1. Log into your MySQL database server:
--    mysql -u root -p
-- 2. Execute the schema file:
--    source /path/to/schema.sql;
-- 3. Verify that all tables are created correctly:
--    show tables;
