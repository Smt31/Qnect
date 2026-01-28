-- =====================================================
-- MANUAL TABLE CREATION FOR message_deletions
-- Run this in Neon SQL Editor
-- =====================================================

-- Create the table with correct constraints
CREATE TABLE IF NOT EXISTS message_deletions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    message_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    deletion_type VARCHAR(20) NOT NULL,
    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_md_message_msg FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    CONSTRAINT fk_md_user_usr FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT unique_msg_deletion UNIQUE (message_id, user_id),
    CONSTRAINT chk_del_type CHECK (deletion_type IN ('FOR_ME', 'FOR_EVERYONE'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_md_message_user ON message_deletions(message_id, user_id);
CREATE INDEX IF NOT EXISTS idx_md_message_type ON message_deletions(message_id, deletion_type);
CREATE INDEX IF NOT EXISTS idx_md_user ON message_deletions(user_id);

-- Verify creation
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'message_deletions'
ORDER BY ordinal_position;
