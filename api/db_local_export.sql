-- Ralphy Skills Local Database Export
-- Generated: 2026-01-22T12:12:00.962Z
-- Source: Local D1 (miniflare)

PRAGMA foreign_keys = OFF;

-- Table: categories
DROP TABLE IF EXISTS categories;
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`icon` text,
	`color` text,
	`skill_count` integer DEFAULT 0,
	`sort_order` integer DEFAULT 0
);


-- Table: install_events
DROP TABLE IF EXISTS install_events;
CREATE TABLE `install_events` (
	`id` text PRIMARY KEY NOT NULL,
	`skill_id` text NOT NULL,
	`tool_id` text,
	`user_id` text,
	`client` text DEFAULT 'unknown',
	`client_version` text,
	`ip_address` text,
	`user_agent` text,
	`installed_at` text,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tool_id`) REFERENCES `tools`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);


-- Table: owners
DROP TABLE IF EXISTS owners;
CREATE TABLE `owners` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`avatar_url` text,
	`github_url` text,
	`website` text,
	`total_repos` integer DEFAULT 0,
	`total_skills` integer DEFAULT 0,
	`total_stars` integer DEFAULT 0,
	`is_verified` integer DEFAULT 0,
	`created_at` text,
	`updated_at` text
);


-- Table: prd_categories
DROP TABLE IF EXISTS prd_categories;
CREATE TABLE `prd_categories` (
	`id` text PRIMARY KEY,
	`slug` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`description` text,
	`icon` text,
	`color` text,
	`prd_count` integer DEFAULT 0,
	`sort_order` integer DEFAULT 0
);


-- Table: prd_downloads
DROP TABLE IF EXISTS prd_downloads;
CREATE TABLE `prd_downloads` (
	`id` text PRIMARY KEY,
	`prd_id` text NOT NULL,
	`user_id` text,
	`ip_address` text,
	`downloaded_at` text,
	FOREIGN KEY (`prd_id`) REFERENCES `prds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);


-- Table: prd_likes
DROP TABLE IF EXISTS prd_likes;
CREATE TABLE `prd_likes` (
	`id` text PRIMARY KEY,
	`prd_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text,
	FOREIGN KEY (`prd_id`) REFERENCES `prds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);


-- Table: prd_reviews
DROP TABLE IF EXISTS prd_reviews;
CREATE TABLE `prd_reviews` (
	`id` text PRIMARY KEY,
	`prd_id` text NOT NULL,
	`user_id` text NOT NULL,
	`rating` integer NOT NULL,
	`title` text,
	`review_text` text,
	`helpful_count` integer DEFAULT 0,
	`unhelpful_count` integer DEFAULT 0,
	`status` text DEFAULT 'published',
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`prd_id`) REFERENCES `prds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);


-- Table: prd_views
DROP TABLE IF EXISTS prd_views;
CREATE TABLE `prd_views` (
	`id` text PRIMARY KEY,
	`prd_id` text NOT NULL,
	`user_id` text,
	`ip_address` text,
	`user_agent` text,
	`referrer` text,
	`viewed_at` text,
	FOREIGN KEY (`prd_id`) REFERENCES `prds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);


-- Table: prds
DROP TABLE IF EXISTS prds;
CREATE TABLE `prds` (
	`id` text PRIMARY KEY,
	`slug` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`category` text DEFAULT 'other',
	`tags` text,
	`author` text,
	`author_id` text,
	`version` text DEFAULT '1.0.0',
	`content` text NOT NULL,
	`file_path` text,
	`view_count` integer DEFAULT 0,
	`download_count` integer DEFAULT 0,
	`like_count` integer DEFAULT 0,
	`share_count` integer DEFAULT 0,
	`review_count` integer DEFAULT 0,
	`issue_count` integer DEFAULT 0,
	`average_rating` real DEFAULT 0,
	`status` text DEFAULT 'published',
	`is_featured` integer DEFAULT 0,
	`created_at` text,
	`updated_at` text,
	`published_at` text,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);


-- Table: prompt_categories
DROP TABLE IF EXISTS prompt_categories;
CREATE TABLE `prompt_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`icon` text,
	`color` text,
	`prompt_count` integer DEFAULT 0,
	`sort_order` integer DEFAULT 0
);


-- Table: prompt_collection_items
DROP TABLE IF EXISTS prompt_collection_items;
CREATE TABLE `prompt_collection_items` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`prompt_id` text NOT NULL,
	`sort_order` integer DEFAULT 0,
	`notes` text,
	`added_at` text,
	FOREIGN KEY (`collection_id`) REFERENCES `prompt_collections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`prompt_id`) REFERENCES `prompts`(`id`) ON UPDATE no action ON DELETE cascade
);


-- Table: prompt_collections
DROP TABLE IF EXISTS prompt_collections;
CREATE TABLE `prompt_collections` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`creator_id` text NOT NULL,
	`is_public` integer DEFAULT 1,
	`is_featured` integer DEFAULT 0,
	`tags` text,
	`cover_image` text,
	`prompt_count` integer DEFAULT 0,
	`follower_count` integer DEFAULT 0,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);


-- Table: prompt_copies
DROP TABLE IF EXISTS prompt_copies;
CREATE TABLE `prompt_copies` (
	`id` text PRIMARY KEY NOT NULL,
	`prompt_id` text NOT NULL,
	`user_id` text,
	`copied_variant` text,
	`ip_address` text,
	`copied_at` text,
	FOREIGN KEY (`prompt_id`) REFERENCES `prompts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);


-- Table: prompt_favorites
DROP TABLE IF EXISTS prompt_favorites;
CREATE TABLE `prompt_favorites` (
	`id` text PRIMARY KEY NOT NULL,
	`prompt_id` text NOT NULL,
	`user_id` text NOT NULL,
	`collection_name` text,
	`notes` text,
	`created_at` text,
	FOREIGN KEY (`prompt_id`) REFERENCES `prompts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);


-- Table: prompt_reviews
DROP TABLE IF EXISTS prompt_reviews;
CREATE TABLE `prompt_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`prompt_id` text NOT NULL,
	`user_id` text NOT NULL,
	`rating` integer NOT NULL,
	`title` text,
	`review_text` text,
	`clarity_rating` integer,
	`effectiveness_rating` integer,
	`verified_use_case` text,
	`model_tested` text,
	`helpful_count` integer DEFAULT 0,
	`unhelpful_count` integer DEFAULT 0,
	`status` text DEFAULT 'published',
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`prompt_id`) REFERENCES `prompts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);


-- Table: prompt_usage_reports
DROP TABLE IF EXISTS prompt_usage_reports;
CREATE TABLE `prompt_usage_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`prompt_id` text NOT NULL,
	`user_id` text,
	`model_used` text,
	`was_successful` integer,
	`feedback` text,
	`modifications` text,
	`used_at` text,
	FOREIGN KEY (`prompt_id`) REFERENCES `prompts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);


-- Table: prompt_variables
DROP TABLE IF EXISTS prompt_variables;
CREATE TABLE `prompt_variables` (
	`id` text PRIMARY KEY NOT NULL,
	`prompt_id` text NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`description` text,
	`variable_type` text DEFAULT 'text',
	`default_value` text,
	`placeholder` text,
	`options` text,
	`is_required` integer DEFAULT 0,
	`min_length` integer,
	`max_length` integer,
	`pattern` text,
	`sort_order` integer DEFAULT 0,
	`created_at` text,
	FOREIGN KEY (`prompt_id`) REFERENCES `prompts`(`id`) ON UPDATE no action ON DELETE cascade
);


-- Table: prompt_views
DROP TABLE IF EXISTS prompt_views;
CREATE TABLE `prompt_views` (
	`id` text PRIMARY KEY NOT NULL,
	`prompt_id` text NOT NULL,
	`user_id` text,
	`ip_address` text,
	`user_agent` text,
	`referrer` text,
	`viewed_at` text,
	FOREIGN KEY (`prompt_id`) REFERENCES `prompts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);


-- Table: prompts
DROP TABLE IF EXISTS prompts;
CREATE TABLE `prompts` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`prompt_text` text NOT NULL,
	`system_prompt` text,
	`category` text DEFAULT 'general',
	`tags` text,
	`use_cases` text,
	`model_compatibility` text,
	`recommended_model` text,
	`prompt_type` text DEFAULT 'instruction',
	`complexity` text DEFAULT 'intermediate',
	`expected_output_format` text,
	`variables` text,
	`has_variables` integer DEFAULT 0,
	`author` text,
	`author_id` text,
	`source_url` text,
	`license` text DEFAULT 'CC-BY-4.0',
	`view_count` integer DEFAULT 0,
	`copy_count` integer DEFAULT 0,
	`use_count` integer DEFAULT 0,
	`favorite_count` integer DEFAULT 0,
	`share_count` integer DEFAULT 0,
	`average_rating` real DEFAULT 0,
	`review_count` integer DEFAULT 0,
	`success_rate` real DEFAULT 0,
	`parent_prompt_id` text,
	`version` text DEFAULT '1.0.0',
	`status` text DEFAULT 'published',
	`is_featured` integer DEFAULT 0,
	`is_verified` integer DEFAULT 0,
	`is_community_choice` integer DEFAULT 0,
	`estimated_tokens` integer,
	`language` text DEFAULT 'en',
	`created_at` text,
	`updated_at` text,
	`published_at` text,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`parent_prompt_id`) REFERENCES `prompts`(`id`) ON UPDATE no action ON DELETE set null
);


-- Table: repos
DROP TABLE IF EXISTS repos;
CREATE TABLE `repos` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`github_url` text,
	`github_stars` integer DEFAULT 0,
	`github_forks` integer DEFAULT 0,
	`total_skills` integer DEFAULT 0,
	`total_installs` integer DEFAULT 0,
	`is_archived` integer DEFAULT 0,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`owner_id`) REFERENCES `owners`(`id`) ON UPDATE no action ON DELETE cascade
);


-- Table: skill_issues
DROP TABLE IF EXISTS skill_issues;
CREATE TABLE `skill_issues` (
	`id` text PRIMARY KEY NOT NULL,
	`skill_id` text NOT NULL,
	`user_id` text,
	`issue_type` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'open',
	`priority` text DEFAULT 'medium',
	`github_issue_url` text,
	`created_at` text,
	`updated_at` text,
	`resolved_at` text,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);


-- Table: skill_likes
DROP TABLE IF EXISTS skill_likes;
CREATE TABLE `skill_likes` (
	`id` text PRIMARY KEY NOT NULL,
	`skill_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);


-- Table: skill_reviews
DROP TABLE IF EXISTS skill_reviews;
CREATE TABLE `skill_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`skill_id` text NOT NULL,
	`user_id` text NOT NULL,
	`rating` integer NOT NULL,
	`title` text,
	`review_text` text,
	`helpful_count` integer DEFAULT 0,
	`unhelpful_count` integer DEFAULT 0,
	`status` text DEFAULT 'published',
	`github_issue_url` text,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);


-- Table: skill_submissions
DROP TABLE IF EXISTS skill_submissions;
CREATE TABLE `skill_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`github_url` text NOT NULL,
	`submitter_name` text,
	`submitter_email` text,
	`submitter_id` text,
	`status` text DEFAULT 'pending',
	`reviewed_by` text,
	`review_notes` text,
	`submitter_ip` text,
	`user_agent` text,
	`submitted_at` text,
	`reviewed_at` text,
	FOREIGN KEY (`submitter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);


-- Table: skill_tool_installs
DROP TABLE IF EXISTS skill_tool_installs;
CREATE TABLE `skill_tool_installs` (
	`id` text PRIMARY KEY NOT NULL,
	`skill_id` text NOT NULL,
	`tool_id` text NOT NULL,
	`install_count` integer DEFAULT 0,
	`last_installed_at` text,
	`created_at` text,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tool_id`) REFERENCES `tools`(`id`) ON UPDATE no action ON DELETE cascade
);


-- Table: skill_views
DROP TABLE IF EXISTS skill_views;
CREATE TABLE `skill_views` (
	`id` text PRIMARY KEY NOT NULL,
	`skill_id` text NOT NULL,
	`user_id` text,
	`ip_address` text,
	`user_agent` text,
	`referrer` text,
	`viewed_at` text,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);


-- Table: skills
DROP TABLE IF EXISTS skills;
CREATE TABLE `skills` (
	`id` text PRIMARY KEY NOT NULL,
	`repo_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`short_description` text,
	`full_description` text,
	`version` text DEFAULT '1.0.0',
	`category` text DEFAULT 'general',
	`tags` text,
	`install_command` text,
	`skill_file` text DEFAULT 'SKILL.md',
	`scope` text DEFAULT 'global',
	`compatibility` text,
	`author` text,
	`license` text DEFAULT 'MIT',
	`npm_package_url` text,
	`github_url` text,
	`total_installs` integer DEFAULT 0,
	`weekly_installs` integer DEFAULT 0,
	`total_downloads` integer DEFAULT 0,
	`total_views` integer DEFAULT 0,
	`total_likes` integer DEFAULT 0,
	`total_stars` integer DEFAULT 0,
	`average_rating` real DEFAULT 0,
	`total_reviews` integer DEFAULT 0,
	`status` text DEFAULT 'published',
	`is_featured` integer DEFAULT 0,
	`is_verified` integer DEFAULT 0,
	`created_at` text,
	`updated_at` text,
	`indexed_at` text,
	FOREIGN KEY (`repo_id`) REFERENCES `repos`(`id`) ON UPDATE no action ON DELETE cascade
);


-- Table: tools
DROP TABLE IF EXISTS tools;
CREATE TABLE `tools` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`description` text,
	`icon_url` text,
	`website` text,
	`created_at` text
);


-- Table: users
DROP TABLE IF EXISTS users;
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`email` text,
	`github_id` text,
	`avatar_url` text,
	`bio` text,
	`role` text DEFAULT 'user',
	`created_at` text,
	`last_login_at` text
);



-- Indexes
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);
CREATE INDEX `idx_categories_slug` ON `categories` (`slug`);
CREATE INDEX `idx_install_events_skill_id` ON `install_events` (`skill_id`);
CREATE INDEX `idx_install_events_installed_at` ON `install_events` (`installed_at`);
CREATE UNIQUE INDEX `owners_slug_unique` ON `owners` (`slug`);
CREATE INDEX `idx_owners_slug` ON `owners` (`slug`);
CREATE UNIQUE INDEX `prompt_categories_slug_unique` ON `prompt_categories` (`slug`);
CREATE INDEX `idx_prompt_categories_slug` ON `prompt_categories` (`slug`);
CREATE INDEX `idx_prompt_collection_items_collection_id` ON `prompt_collection_items` (`collection_id`);
CREATE UNIQUE INDEX `prompt_collection_items_collection_id_prompt_id_unique` ON `prompt_collection_items` (`collection_id`,`prompt_id`);
CREATE UNIQUE INDEX `prompt_collections_slug_unique` ON `prompt_collections` (`slug`);
CREATE INDEX `idx_prompt_collections_slug` ON `prompt_collections` (`slug`);
CREATE INDEX `idx_prompt_collections_creator_id` ON `prompt_collections` (`creator_id`);
CREATE INDEX `idx_prompt_copies_prompt_id` ON `prompt_copies` (`prompt_id`);
CREATE INDEX `idx_prompt_copies_copied_at` ON `prompt_copies` (`copied_at`);
CREATE INDEX `idx_prompt_favorites_prompt_id` ON `prompt_favorites` (`prompt_id`);
CREATE INDEX `idx_prompt_favorites_user_id` ON `prompt_favorites` (`user_id`);
CREATE UNIQUE INDEX `prompt_favorites_prompt_id_user_id_unique` ON `prompt_favorites` (`prompt_id`,`user_id`);
CREATE INDEX `idx_prompt_reviews_prompt_id` ON `prompt_reviews` (`prompt_id`);
CREATE INDEX `idx_prompt_reviews_user_id` ON `prompt_reviews` (`user_id`);
CREATE INDEX `idx_prompt_reviews_rating` ON `prompt_reviews` (`rating`);
CREATE INDEX `idx_prompt_usage_reports_prompt_id` ON `prompt_usage_reports` (`prompt_id`);
CREATE INDEX `idx_prompt_usage_reports_used_at` ON `prompt_usage_reports` (`used_at`);
CREATE INDEX `idx_prompt_variables_prompt_id` ON `prompt_variables` (`prompt_id`);
CREATE INDEX `idx_prompt_views_prompt_id` ON `prompt_views` (`prompt_id`);
CREATE INDEX `idx_prompt_views_viewed_at` ON `prompt_views` (`viewed_at`);
CREATE UNIQUE INDEX `prompts_slug_unique` ON `prompts` (`slug`);
CREATE INDEX `idx_prompts_slug` ON `prompts` (`slug`);
CREATE INDEX `idx_prompts_category` ON `prompts` (`category`);
CREATE INDEX `idx_prompts_status` ON `prompts` (`status`);
CREATE INDEX `idx_prompts_featured` ON `prompts` (`is_featured`);
CREATE INDEX `idx_prompts_author_id` ON `prompts` (`author_id`);
CREATE INDEX `idx_prompts_complexity` ON `prompts` (`complexity`);
CREATE INDEX `idx_prompts_type` ON `prompts` (`prompt_type`);
CREATE INDEX `idx_repos_owner_id` ON `repos` (`owner_id`);
CREATE UNIQUE INDEX `repos_owner_id_slug_unique` ON `repos` (`owner_id`,`slug`);
CREATE INDEX `idx_skill_issues_skill_id` ON `skill_issues` (`skill_id`);
CREATE INDEX `idx_skill_issues_status` ON `skill_issues` (`status`);
CREATE INDEX `idx_skill_likes_skill_id` ON `skill_likes` (`skill_id`);
CREATE INDEX `idx_skill_likes_user_id` ON `skill_likes` (`user_id`);
CREATE UNIQUE INDEX `skill_likes_skill_id_user_id_unique` ON `skill_likes` (`skill_id`,`user_id`);
CREATE INDEX `idx_skill_reviews_skill_id` ON `skill_reviews` (`skill_id`);
CREATE INDEX `idx_skill_reviews_user_id` ON `skill_reviews` (`user_id`);
CREATE INDEX `idx_skill_reviews_rating` ON `skill_reviews` (`rating`);
CREATE INDEX `idx_skill_submissions_status` ON `skill_submissions` (`status`);
CREATE INDEX `idx_skill_submissions_submitted_at` ON `skill_submissions` (`submitted_at`);
CREATE INDEX `idx_skill_tool_installs_skill_id` ON `skill_tool_installs` (`skill_id`);
CREATE INDEX `idx_skill_tool_installs_tool_id` ON `skill_tool_installs` (`tool_id`);
CREATE UNIQUE INDEX `skill_tool_installs_skill_id_tool_id_unique` ON `skill_tool_installs` (`skill_id`,`tool_id`);
CREATE INDEX `idx_skill_views_skill_id` ON `skill_views` (`skill_id`);
CREATE INDEX `idx_skill_views_viewed_at` ON `skill_views` (`viewed_at`);
CREATE INDEX `idx_skills_repo_id` ON `skills` (`repo_id`);
CREATE INDEX `idx_skills_category` ON `skills` (`category`);
CREATE INDEX `idx_skills_status` ON `skills` (`status`);
CREATE INDEX `idx_skills_featured` ON `skills` (`is_featured`);
CREATE UNIQUE INDEX `skills_repo_id_slug_unique` ON `skills` (`repo_id`,`slug`);
CREATE UNIQUE INDEX `tools_name_unique` ON `tools` (`name`);
CREATE INDEX `idx_tools_name` ON `tools` (`name`);
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
CREATE UNIQUE INDEX `users_github_id_unique` ON `users` (`github_id`);
CREATE INDEX `idx_users_username` ON `users` (`username`);
CREATE INDEX `idx_users_github_id` ON `users` (`github_id`);
CREATE INDEX `idx_prd_categories_slug` ON `prd_categories` (`slug`);
CREATE INDEX `idx_prds_slug` ON `prds` (`slug`);
CREATE INDEX `idx_prds_category` ON `prds` (`category`);
CREATE INDEX `idx_prds_status` ON `prds` (`status`);
CREATE INDEX `idx_prds_featured` ON `prds` (`is_featured`);
CREATE INDEX `idx_prds_author_id` ON `prds` (`author_id`);
CREATE INDEX `idx_prd_views_prd_id` ON `prd_views` (`prd_id`);
CREATE INDEX `idx_prd_views_viewed_at` ON `prd_views` (`viewed_at`);
CREATE INDEX `idx_prd_likes_prd_id` ON `prd_likes` (`prd_id`);
CREATE INDEX `idx_prd_likes_user_id` ON `prd_likes` (`user_id`);
CREATE INDEX `idx_prd_reviews_prd_id` ON `prd_reviews` (`prd_id`);
CREATE INDEX `idx_prd_reviews_user_id` ON `prd_reviews` (`user_id`);
CREATE INDEX `idx_prd_reviews_rating` ON `prd_reviews` (`rating`);
CREATE INDEX `idx_prd_downloads_prd_id` ON `prd_downloads` (`prd_id`);
CREATE INDEX `idx_prd_downloads_downloaded_at` ON `prd_downloads` (`downloaded_at`);

PRAGMA foreign_keys = ON;
