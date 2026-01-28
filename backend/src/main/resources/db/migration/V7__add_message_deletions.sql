-- Migration: Add message deletion functionality
-- Create message_deletions table

CREATE TABLE message_deletions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    message_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    deletion_type VARCHAR(20) NOT NULL,
    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_md_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    CONSTRAINT fk_md_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_deletion UNIQUE (message_id, user_id),
    CONSTRAINT chk_deletion_type CHECK (deletion_type IN ('FOR_ME', 'FOR_EVERYONE'))
);

-- Composite indexes for optimal query performance
CREATE INDEX idx_md_message_user ON message_deletions(message_id, user_id);
CREATE INDEX idx_md_message_type ON message_deletions(message_id, deletion_type);
CREATE INDEX idx_md_user ON message_deletions(user_id);
