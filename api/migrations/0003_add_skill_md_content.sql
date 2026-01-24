-- Migration: Add skill_md_content to skills table
ALTER TABLE skills ADD COLUMN skill_md_content TEXT;
