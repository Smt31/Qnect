-- Clean up orphaned ANSWER votes
-- These votes reference the answers table which was removed in V12
-- Keeping them causes issues with the voting system

DELETE FROM votes WHERE entity_type = 'ANSWER';
