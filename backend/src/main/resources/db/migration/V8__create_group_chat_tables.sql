-- 1. Groups Table
CREATE TABLE groups (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    avatar_url VARCHAR(255),
    created_by BIGINT NOT NULL,
    is_private BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_group_creator FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- 2. Group Members Table
CREATE TABLE group_members (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role VARCHAR(20) NOT NULL, -- 'ADMIN', 'MEMBER'
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP,
    CONSTRAINT fk_gm_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_gm_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT uq_group_member UNIQUE (group_id, user_id)
);

CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);

-- 3. Group Messages Table
CREATE TABLE group_messages (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    content TEXT,
    message_type VARCHAR(20) NOT NULL, -- 'TEXT', 'IMAGE', 'SYSTEM'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_gmsg_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_gmsg_sender FOREIGN KEY (sender_id) REFERENCES users(user_id)
);

CREATE INDEX idx_group_messages_group_created ON group_messages(group_id, created_at);

-- 4. Group Message Deletions Table
CREATE TABLE group_message_deletions (
    id BIGSERIAL PRIMARY KEY,
    message_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    deletion_type VARCHAR(20) NOT NULL, -- 'FOR_ME', 'FOR_EVERYONE'
    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_gmd_message FOREIGN KEY (message_id) REFERENCES group_messages(id) ON DELETE CASCADE,
    CONSTRAINT fk_gmd_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT uq_gmd_message_user UNIQUE (message_id, user_id)
);

CREATE INDEX idx_gmd_message_user ON group_message_deletions(message_id, user_id);
