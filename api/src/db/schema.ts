import { sqliteTable, text, integer, real, unique, index, AnySQLiteColumn } from "drizzle-orm/sqlite-core";

// ============================================================================
// CORE HIERARCHY: Owners → Repos → Skills
// ============================================================================

export const owners = sqliteTable(
    "owners",
    {
        id: text("id").primaryKey(),
        slug: text("slug").notNull().unique(),
        name: text("name").notNull(),
        description: text("description"),
        avatarUrl: text("avatar_url"),
        githubUrl: text("github_url"),
        website: text("website"),

        // Aggregated stats
        totalRepos: integer("total_repos").default(0),
        totalSkills: integer("total_skills").default(0),
        totalStars: integer("total_stars").default(0),

        isVerified: integer("is_verified").default(0),
        createdAt: text("created_at"),
        updatedAt: text("updated_at"),
    },
    (table) => ({
        slugIdx: index("idx_owners_slug").on(table.slug),
    })
);

export const repos = sqliteTable(
    "repos",
    {
        id: text("id").primaryKey(),
        ownerId: text("owner_id")
            .notNull()
            .references(() => owners.id, { onDelete: "cascade" }),
        slug: text("slug").notNull(),
        name: text("name").notNull(),
        description: text("description"),
        githubUrl: text("github_url"),

        // GitHub stats
        githubStars: integer("github_stars").default(0),
        githubForks: integer("github_forks").default(0),

        // Aggregated stats
        totalSkills: integer("total_skills").default(0),
        totalInstalls: integer("total_installs").default(0),

        isArchived: integer("is_archived").default(0),
        createdAt: text("created_at"),
        updatedAt: text("updated_at"),
    },
    (table) => ({
        ownerSlugUnique: unique().on(table.ownerId, table.slug),
        ownerIdIdx: index("idx_repos_owner_id").on(table.ownerId),
    })
);

export const skills = sqliteTable(
    "skills",
    {
        id: text("id").primaryKey(),
        repoId: text("repo_id")
            .notNull()
            .references(() => repos.id, { onDelete: "cascade" }),
        slug: text("slug").notNull(),

        // Basic Info
        name: text("name").notNull(),
        shortDescription: text("short_description"),
        fullDescription: text("full_description"),
        version: text("version").default("1.0.0"),

        // Categorization
        category: text("category").default("general"),
        tags: text("tags"), // JSON array: ["react", "typescript", "ui"]

        // Installation & Usage
        installCommand: text("install_command"),
        skillFile: text("skill_file").default("SKILL.md"),
        scope: text("scope").default("global"), // global, project, organization
        compatibility: text("compatibility"), // JSON: {"mcp": ">=1.0.0", "claude": ">=3.5"}

        // Attribution
        author: text("author"),
        license: text("license").default("MIT"),

        // External Links
        npmPackageUrl: text("npm_package_url"),
        sourceUrl: text("source_url"),
        githubUrl: text("github_url"), // Direct link to skill file/folder
        githubOwner: text("github_owner"),
        githubRepo: text("github_repo"),

        // Engagement Metrics
        totalInstalls: integer("total_installs").default(0),
        weeklyInstalls: integer("weekly_installs").default(0),
        dailyInstalls: integer("daily_installs").default(0),
        skillMdContent: text("skill_md_content"),
        totalDownloads: integer("total_downloads").default(0),
        totalViews: integer("total_views").default(0),
        totalLikes: integer("total_likes").default(0),
        totalStars: integer("total_stars").default(0),

        // Quality Metrics
        averageRating: real("average_rating").default(0),
        totalReviews: integer("total_reviews").default(0),

        // Status
        status: text("status").default("published"), // draft, published, deprecated
        isFeatured: integer("is_featured").default(0),
        isVerified: integer("is_verified").default(0),

        createdAt: text("created_at"),
        updatedAt: text("updated_at"),
        indexedAt: text("indexed_at"),
    },
    (table) => ({
        repoSlugUnique: unique().on(table.repoId, table.slug),
        repoIdIdx: index("idx_skills_repo_id").on(table.repoId),
        categoryIdx: index("idx_skills_category").on(table.category),
        statusIdx: index("idx_skills_status").on(table.status),
        featuredIdx: index("idx_skills_featured").on(table.isFeatured),
    })
);

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export const users = sqliteTable(
    "users",
    {
        id: text("id").primaryKey(),
        username: text("username").notNull().unique(),
        email: text("email").unique(),
        githubId: text("github_id").unique(),
        avatarUrl: text("avatar_url"),
        bio: text("bio"),
        role: text("role").default("user"), // user, moderator, admin
        createdAt: text("created_at"),
        lastLoginAt: text("last_login_at"),
    },
    (table) => ({
        usernameIdx: index("idx_users_username").on(table.username),
        githubIdIdx: index("idx_users_github_id").on(table.githubId),
    })
);

// ============================================================================
// ENGAGEMENT SYSTEM
// ============================================================================

export const skillLikes = sqliteTable(
    "skill_likes",
    {
        id: text("id").primaryKey(),
        skillId: text("skill_id")
            .notNull()
            .references(() => skills.id, { onDelete: "cascade" }),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        createdAt: text("created_at"),
    },
    (table) => ({
        skillUserUnique: unique().on(table.skillId, table.userId),
        skillIdIdx: index("idx_skill_likes_skill_id").on(table.skillId),
        userIdIdx: index("idx_skill_likes_user_id").on(table.userId),
    })
);

export const skillViews = sqliteTable(
    "skill_views",
    {
        id: text("id").primaryKey(),
        skillId: text("skill_id")
            .notNull()
            .references(() => skills.id, { onDelete: "cascade" }),
        userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
        ipAddress: text("ip_address"), // For anonymous tracking
        userAgent: text("user_agent"),
        referrer: text("referrer"),
        viewedAt: text("viewed_at"),
    },
    (table) => ({
        skillIdIdx: index("idx_skill_views_skill_id").on(table.skillId),
        viewedAtIdx: index("idx_skill_views_viewed_at").on(table.viewedAt),
    })
);

export const skillReviews = sqliteTable(
    "skill_reviews",
    {
        id: text("id").primaryKey(),
        skillId: text("skill_id")
            .notNull()
            .references(() => skills.id, { onDelete: "cascade" }),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        rating: integer("rating").notNull(), // 1-5 stars
        title: text("title"),
        reviewText: text("review_text"),

        // Community feedback
        helpfulCount: integer("helpful_count").default(0),
        unhelpfulCount: integer("unhelpful_count").default(0),

        // Moderation
        status: text("status").default("published"), // published, flagged, removed

        githubIssueUrl: text("github_issue_url"),
        createdAt: text("created_at"),
        updatedAt: text("updated_at"),
    },
    (table) => ({
        skillIdIdx: index("idx_skill_reviews_skill_id").on(table.skillId),
        userIdIdx: index("idx_skill_reviews_user_id").on(table.userId),
        ratingIdx: index("idx_skill_reviews_rating").on(table.rating),
    })
);

// ============================================================================
// INSTALLATION TRACKING
// ============================================================================

export const tools = sqliteTable(
    "tools",
    {
        id: text("id").primaryKey(),
        name: text("name").notNull().unique(),
        displayName: text("display_name").notNull(),
        description: text("description"),
        iconUrl: text("icon_url"),
        website: text("website"),
        createdAt: text("created_at"),
    },
    (table) => ({
        nameIdx: index("idx_tools_name").on(table.name),
    })
);

export const skillToolInstalls = sqliteTable(
    "skill_tool_installs",
    {
        id: text("id").primaryKey(),
        skillId: text("skill_id")
            .notNull()
            .references(() => skills.id, { onDelete: "cascade" }),
        toolId: text("tool_id")
            .notNull()
            .references(() => tools.id, { onDelete: "cascade" }),
        installCount: integer("install_count").default(0),
        lastInstalledAt: text("last_installed_at"),
        createdAt: text("created_at"),
    },
    (table) => ({
        skillToolUnique: unique().on(table.skillId, table.toolId),
        skillIdIdx: index("idx_skill_tool_installs_skill_id").on(table.skillId),
        toolIdIdx: index("idx_skill_tool_installs_tool_id").on(table.toolId),
    })
);

export const installEvents = sqliteTable(
    "install_events",
    {
        id: text("id").primaryKey(),
        skillId: text("skill_id")
            .notNull()
            .references(() => skills.id, { onDelete: "cascade" }),
        toolId: text("tool_id").references(() => tools.id, { onDelete: "set null" }),
        userId: text("user_id").references(() => users.id, { onDelete: "set null" }),

        // Client info
        client: text("client").default("unknown"), // cli, web, api
        clientVersion: text("client_version"),

        // Analytics
        ipAddress: text("ip_address"),
        userAgent: text("user_agent"),

        installedAt: text("installed_at"),
    },
    (table) => ({
        skillIdIdx: index("idx_install_events_skill_id").on(table.skillId),
        installedAtIdx: index("idx_install_events_installed_at").on(table.installedAt),
    })
);

// ============================================================================
// ISSUE TRACKING
// ============================================================================

export const skillIssues = sqliteTable(
    "skill_issues",
    {
        id: text("id").primaryKey(),
        skillId: text("skill_id")
            .notNull()
            .references(() => skills.id, { onDelete: "cascade" }),
        userId: text("user_id").references(() => users.id, { onDelete: "set null" }),

        issueType: text("issue_type").notNull(), // bug, feature, question, documentation
        title: text("title").notNull(),
        description: text("description"),

        status: text("status").default("open"), // open, in_progress, resolved, closed
        priority: text("priority").default("medium"), // low, medium, high, critical

        githubIssueUrl: text("github_issue_url"),

        createdAt: text("created_at"),
        updatedAt: text("updated_at"),
        resolvedAt: text("resolved_at"),
    },
    (table) => ({
        skillIdIdx: index("idx_skill_issues_skill_id").on(table.skillId),
        statusIdx: index("idx_skill_issues_status").on(table.status),
    })
);

// ============================================================================
// CATEGORIZATION & DISCOVERY
// ============================================================================

export const categories = sqliteTable(
    "categories",
    {
        id: text("id").primaryKey(),
        slug: text("slug").notNull().unique(),
        name: text("name").notNull(),
        description: text("description"),
        icon: text("icon"),
        color: text("color"), // Hex color for UI
        skillCount: integer("skill_count").default(0),
        sortOrder: integer("sort_order").default(0),
    },
    (table) => ({
        slugIdx: index("idx_categories_slug").on(table.slug),
    })
);

// ============================================================================
// SUBMISSION SYSTEM
// ============================================================================

export const skillSubmissions = sqliteTable(
    "skill_submissions",
    {
        id: text("id").primaryKey(),
        githubUrl: text("github_url").notNull(),

        // Submitter info
        submitterName: text("submitter_name"),
        submitterEmail: text("submitter_email"),
        submitterId: text("submitter_id").references(() => users.id, { onDelete: "set null" }),

        // Review process
        status: text("status").default("pending"), // pending, approved, rejected, spam
        reviewedBy: text("reviewed_by").references(() => users.id, { onDelete: "set null" }),
        reviewNotes: text("review_notes"),

        // Analytics
        submitterIp: text("submitter_ip"),
        userAgent: text("user_agent"),

        submittedAt: text("submitted_at"),
        reviewedAt: text("reviewed_at"),
    },
    (table) => ({
        statusIdx: index("idx_skill_submissions_status").on(table.status),
        submittedAtIdx: index("idx_skill_submissions_submitted_at").on(table.submittedAt),
    })
);

// ============================================================================
// PRD (Product Requirements Documents) SYSTEM
// ============================================================================

export const prdCategories = sqliteTable(
    "prd_categories",
    {
        id: text("id").primaryKey(),
        slug: text("slug").notNull().unique(),
        name: text("name").notNull(),
        description: text("description"),
        icon: text("icon"),
        color: text("color"), // Hex color for UI
        prdCount: integer("prd_count").default(0),
        sortOrder: integer("sort_order").default(0),
    },
    (table) => ({
        slugIdx: index("idx_prd_categories_slug").on(table.slug),
    })
);

export const prds = sqliteTable(
    "prds",
    {
        id: text("id").primaryKey(),
        slug: text("slug").notNull().unique(),

        // Basic Info
        name: text("name").notNull(),
        description: text("description").notNull(),

        // Categorization
        category: text("category").default("other"),
        tags: text("tags"), // JSON array: ["ai-agent", "automation", "productivity"]

        // Attribution
        author: text("author"),
        authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
        version: text("version").default("1.0.0"),

        // Content
        content: text("content").notNull(), // Full markdown content stored in DB
        filePath: text("file_path"), // Optional - for legacy file-based storage or reference

        // Engagement Metrics
        viewCount: integer("view_count").default(0),
        downloadCount: integer("download_count").default(0),
        likeCount: integer("like_count").default(0),
        shareCount: integer("share_count").default(0),

        // Quality Metrics
        reviewCount: integer("review_count").default(0),
        issueCount: integer("issue_count").default(0),
        averageRating: real("average_rating").default(0),

        // Status
        status: text("status").default("published"), // draft, published, archived
        isFeatured: integer("is_featured").default(0),

        createdAt: text("created_at"),
        updatedAt: text("updated_at"),
        publishedAt: text("published_at"),
    },
    (table) => ({
        slugIdx: index("idx_prds_slug").on(table.slug),
        categoryIdx: index("idx_prds_category").on(table.category),
        statusIdx: index("idx_prds_status").on(table.status),
        featuredIdx: index("idx_prds_featured").on(table.isFeatured),
        authorIdIdx: index("idx_prds_author_id").on(table.authorId),
    })
);

export const prdLikes = sqliteTable(
    "prd_likes",
    {
        id: text("id").primaryKey(),
        prdId: text("prd_id")
            .notNull()
            .references(() => prds.id, { onDelete: "cascade" }),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        createdAt: text("created_at"),
    },
    (table) => ({
        prdUserUnique: unique().on(table.prdId, table.userId),
        prdIdIdx: index("idx_prd_likes_prd_id").on(table.prdId),
        userIdIdx: index("idx_prd_likes_user_id").on(table.userId),
    })
);

export const prdViews = sqliteTable(
    "prd_views",
    {
        id: text("id").primaryKey(),
        prdId: text("prd_id")
            .notNull()
            .references(() => prds.id, { onDelete: "cascade" }),
        userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
        ipAddress: text("ip_address"),
        userAgent: text("user_agent"),
        referrer: text("referrer"),
        viewedAt: text("viewed_at"),
    },
    (table) => ({
        prdIdIdx: index("idx_prd_views_prd_id").on(table.prdId),
        viewedAtIdx: index("idx_prd_views_viewed_at").on(table.viewedAt),
    })
);

export const prdReviews = sqliteTable(
    "prd_reviews",
    {
        id: text("id").primaryKey(),
        prdId: text("prd_id")
            .notNull()
            .references(() => prds.id, { onDelete: "cascade" }),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        rating: integer("rating").notNull(), // 1-5 stars
        title: text("title"),
        reviewText: text("review_text"),

        // Community feedback
        helpfulCount: integer("helpful_count").default(0),
        unhelpfulCount: integer("unhelpful_count").default(0),

        status: text("status").default("published"),
        createdAt: text("created_at"),
        updatedAt: text("updated_at"),
    },
    (table) => ({
        prdIdIdx: index("idx_prd_reviews_prd_id").on(table.prdId),
        userIdIdx: index("idx_prd_reviews_user_id").on(table.userId),
    })
);

export const prdDownloads = sqliteTable(
    "prd_downloads",
    {
        id: text("id").primaryKey(),
        prdId: text("prd_id")
            .notNull()
            .references(() => prds.id, { onDelete: "cascade" }),
        userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
        ipAddress: text("ip_address"),
        downloadedAt: text("downloaded_at"),
    },
    (table) => ({
        prdIdIdx: index("idx_prd_downloads_prd_id").on(table.prdId),
        downloadedAtIdx: index("idx_prd_downloads_downloaded_at").on(table.downloadedAt),
    })
);

// ============================================================================
// PROMPTS LIBRARY SYSTEM
// ============================================================================

export const promptCategories = sqliteTable(
    "prompt_categories",
    {
        id: text("id").primaryKey(),
        slug: text("slug").notNull().unique(),
        name: text("name").notNull(),
        description: text("description"),
        icon: text("icon"),
        color: text("color"), // Hex color for UI
        promptCount: integer("prompt_count").default(0),
        sortOrder: integer("sort_order").default(0),
    },
    (table) => ({
        slugIdx: index("idx_prompt_categories_slug").on(table.slug),
    })
);

export const prompts = sqliteTable(
    "prompts",
    {
        id: text("id").primaryKey(),
        slug: text("slug").notNull().unique(),

        // Basic Info
        title: text("title").notNull(),
        description: text("description").notNull(),

        // Prompt Content
        promptText: text("prompt_text").notNull(), // The actual prompt
        systemPrompt: text("system_prompt"), // Optional system-level instructions

        // Categorization
        category: text("category").default("general"),
        tags: text("tags"), // JSON array: ["coding", "creative-writing", "analysis"]
        useCases: text("use_cases"), // JSON array: ["code-review", "brainstorming"]

        // Model Compatibility
        modelCompatibility: text("model_compatibility"), // JSON: {"claude": ["3.5", "4"], "gpt": ["4"]}
        recommendedModel: text("recommended_model"), // "claude-sonnet-4-5"

        // Prompt Engineering Details
        promptType: text("prompt_type").default("instruction"), // instruction, few-shot, chain-of-thought, role-play
        complexity: text("complexity").default("intermediate"), // beginner, intermediate, advanced, expert
        expectedOutputFormat: text("expected_output_format"), // markdown, json, code, plain-text

        // Variables/Placeholders
        variables: text("variables"), // JSON: [{"name": "topic", "description": "Subject to write about", "required": true}]
        hasVariables: integer("has_variables").default(0),

        // Attribution
        author: text("author"),
        authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
        sourceUrl: text("source_url"), // If prompt adapted from external source
        license: text("license").default("CC-BY-4.0"),

        // Engagement Metrics
        viewCount: integer("view_count").default(0),
        copyCount: integer("copy_count").default(0),
        useCount: integer("use_count").default(0), // Tracks actual usage via API/integrations
        favoriteCount: integer("favorite_count").default(0),
        shareCount: integer("share_count").default(0),

        // Quality Metrics
        averageRating: real("average_rating").default(0),
        reviewCount: integer("review_count").default(0),
        successRate: real("success_rate").default(0), // User-reported success rate

        // Collections/Versioning
        parentPromptId: text("parent_prompt_id").references((): AnySQLiteColumn => prompts.id, { onDelete: "set null" }), // For prompt variations
        version: text("version").default("1.0.0"),

        // Status
        status: text("status").default("published"), // draft, published, archived, flagged
        isFeatured: integer("is_featured").default(0),
        isVerified: integer("is_verified").default(0), // Verified by moderators/experts
        isCommunityChoice: integer("is_community_choice").default(0),

        // Metadata
        estimatedTokens: integer("estimated_tokens"), // Approximate token count
        language: text("language").default("en"), // Prompt language

        createdAt: text("created_at"),
        updatedAt: text("updated_at"),
        publishedAt: text("published_at"),
    },
    (table) => ({
        slugIdx: index("idx_prompts_slug").on(table.slug),
        categoryIdx: index("idx_prompts_category").on(table.category),
        statusIdx: index("idx_prompts_status").on(table.status),
        featuredIdx: index("idx_prompts_featured").on(table.isFeatured),
        authorIdIdx: index("idx_prompts_author_id").on(table.authorId),
        complexityIdx: index("idx_prompts_complexity").on(table.complexity),
        promptTypeIdx: index("idx_prompts_type").on(table.promptType),
    })
);

export const promptFavorites = sqliteTable(
    "prompt_favorites",
    {
        id: text("id").primaryKey(),
        promptId: text("prompt_id")
            .notNull()
            .references(() => prompts.id, { onDelete: "cascade" }),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        collectionName: text("collection_name"), // User can organize favorites into collections
        notes: text("notes"), // Personal notes about the prompt
        createdAt: text("created_at"),
    },
    (table) => ({
        promptUserUnique: unique().on(table.promptId, table.userId),
        promptIdIdx: index("idx_prompt_favorites_prompt_id").on(table.promptId),
        userIdIdx: index("idx_prompt_favorites_user_id").on(table.userId),
    })
);

export const promptViews = sqliteTable(
    "prompt_views",
    {
        id: text("id").primaryKey(),
        promptId: text("prompt_id")
            .notNull()
            .references(() => prompts.id, { onDelete: "cascade" }),
        userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
        ipAddress: text("ip_address"),
        userAgent: text("user_agent"),
        referrer: text("referrer"),
        viewedAt: text("viewed_at"),
    },
    (table) => ({
        promptIdIdx: index("idx_prompt_views_prompt_id").on(table.promptId),
        viewedAtIdx: index("idx_prompt_views_viewed_at").on(table.viewedAt),
    })
);

export const promptCopies = sqliteTable(
    "prompt_copies",
    {
        id: text("id").primaryKey(),
        promptId: text("prompt_id")
            .notNull()
            .references(() => prompts.id, { onDelete: "cascade" }),
        userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
        copiedVariant: text("copied_variant"), // Track if user copied with modifications
        ipAddress: text("ip_address"),
        copiedAt: text("copied_at"),
    },
    (table) => ({
        promptIdIdx: index("idx_prompt_copies_prompt_id").on(table.promptId),
        copiedAtIdx: index("idx_prompt_copies_copied_at").on(table.copiedAt),
    })
);

export const promptUsageReports = sqliteTable(
    "prompt_usage_reports",
    {
        id: text("id").primaryKey(),
        promptId: text("prompt_id")
            .notNull()
            .references(() => prompts.id, { onDelete: "cascade" }),
        userId: text("user_id").references(() => users.id, { onDelete: "set null" }),

        // Usage context
        modelUsed: text("model_used"), // Which AI model they used it with
        wasSuccessful: integer("was_successful"), // 0 = no, 1 = yes, null = not reported

        // Feedback
        feedback: text("feedback"), // Optional user feedback on results
        modifications: text("modifications"), // How they modified the prompt

        usedAt: text("used_at"),
    },
    (table) => ({
        promptIdIdx: index("idx_prompt_usage_reports_prompt_id").on(table.promptId),
        usedAtIdx: index("idx_prompt_usage_reports_used_at").on(table.usedAt),
    })
);

export const promptReviews = sqliteTable(
    "prompt_reviews",
    {
        id: text("id").primaryKey(),
        promptId: text("prompt_id")
            .notNull()
            .references(() => prompts.id, { onDelete: "cascade" }),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),

        rating: integer("rating").notNull(), // 1-5 stars
        title: text("title"),
        reviewText: text("review_text"),

        // Specific ratings
        clarityRating: integer("clarity_rating"), // How clear the prompt is
        effectivenessRating: integer("effectiveness_rating"), // How effective it is

        // Use case verification
        verifiedUseCase: text("verified_use_case"), // What they used it for
        modelTested: text("model_tested"), // Which model they tested with

        // Community feedback
        helpfulCount: integer("helpful_count").default(0),
        unhelpfulCount: integer("unhelpful_count").default(0),

        status: text("status").default("published"),
        createdAt: text("created_at"),
        updatedAt: text("updated_at"),
    },
    (table) => ({
        promptIdIdx: index("idx_prompt_reviews_prompt_id").on(table.promptId),
        userIdIdx: index("idx_prompt_reviews_user_id").on(table.userId),
        ratingIdx: index("idx_prompt_reviews_rating").on(table.rating),
    })
);

export const promptCollections = sqliteTable(
    "prompt_collections",
    {
        id: text("id").primaryKey(),
        slug: text("slug").notNull().unique(),

        // Collection Info
        name: text("name").notNull(),
        description: text("description"),

        // Attribution
        creatorId: text("creator_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),

        // Visibility
        isPublic: integer("is_public").default(1),
        isFeatured: integer("is_featured").default(0),

        // Metadata
        tags: text("tags"), // JSON array
        coverImage: text("cover_image"),

        // Stats
        promptCount: integer("prompt_count").default(0),
        followerCount: integer("follower_count").default(0),

        createdAt: text("created_at"),
        updatedAt: text("updated_at"),
    },
    (table) => ({
        slugIdx: index("idx_prompt_collections_slug").on(table.slug),
        creatorIdIdx: index("idx_prompt_collections_creator_id").on(table.creatorId),
    })
);

export const promptCollectionItems = sqliteTable(
    "prompt_collection_items",
    {
        id: text("id").primaryKey(),
        collectionId: text("collection_id")
            .notNull()
            .references(() => promptCollections.id, { onDelete: "cascade" }),
        promptId: text("prompt_id")
            .notNull()
            .references(() => prompts.id, { onDelete: "cascade" }),

        sortOrder: integer("sort_order").default(0),
        notes: text("notes"), // Collection curator's notes about this prompt

        addedAt: text("added_at"),
    },
    (table) => ({
        collectionPromptUnique: unique().on(table.collectionId, table.promptId),
        collectionIdIdx: index("idx_prompt_collection_items_collection_id").on(table.collectionId),
    })
);

export const promptVariables = sqliteTable(
    "prompt_variables",
    {
        id: text("id").primaryKey(),
        promptId: text("prompt_id")
            .notNull()
            .references(() => prompts.id, { onDelete: "cascade" }),

        // Variable definition
        name: text("name").notNull(), // e.g., "topic", "tone", "length"
        displayName: text("display_name").notNull(), // User-friendly name
        description: text("description"),

        // Type and validation
        variableType: text("variable_type").default("text"), // text, number, select, multiselect, boolean
        defaultValue: text("default_value"),
        placeholder: text("placeholder"),
        options: text("options"), // JSON array for select/multiselect types

        // Constraints
        isRequired: integer("is_required").default(0),
        minLength: integer("min_length"),
        maxLength: integer("max_length"),
        pattern: text("pattern"), // Regex pattern for validation

        sortOrder: integer("sort_order").default(0),
        createdAt: text("created_at"),
    },
    (table) => ({
        promptIdIdx: index("idx_prompt_variables_prompt_id").on(table.promptId),
    })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Owner = typeof owners.$inferSelect;
export type NewOwner = typeof owners.$inferInsert;

export type Repo = typeof repos.$inferSelect;
export type NewRepo = typeof repos.$inferInsert;

export type Skill = typeof skills.$inferSelect;
export type NewSkill = typeof skills.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type SkillLike = typeof skillLikes.$inferSelect;
export type NewSkillLike = typeof skillLikes.$inferInsert;

export type SkillView = typeof skillViews.$inferSelect;
export type NewSkillView = typeof skillViews.$inferInsert;

export type SkillReview = typeof skillReviews.$inferSelect;
export type NewSkillReview = typeof skillReviews.$inferInsert;

export type Tool = typeof tools.$inferSelect;
export type NewTool = typeof tools.$inferInsert;

export type SkillToolInstall = typeof skillToolInstalls.$inferSelect;
export type NewSkillToolInstall = typeof skillToolInstalls.$inferInsert;

export type InstallEvent = typeof installEvents.$inferSelect;
export type NewInstallEvent = typeof installEvents.$inferInsert;

export type SkillIssue = typeof skillIssues.$inferSelect;
export type NewSkillIssue = typeof skillIssues.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type SkillSubmission = typeof skillSubmissions.$inferSelect;
export type NewSkillSubmission = typeof skillSubmissions.$inferInsert;

export type PrdCategory = typeof prdCategories.$inferSelect;
export type NewPrdCategory = typeof prdCategories.$inferInsert;

export type Prd = typeof prds.$inferSelect;
export type NewPrd = typeof prds.$inferInsert;

export type PrdLike = typeof prdLikes.$inferSelect;
export type NewPrdLike = typeof prdLikes.$inferInsert;

export type PrdView = typeof prdViews.$inferSelect;
export type NewPrdView = typeof prdViews.$inferInsert;

export type PrdReview = typeof prdReviews.$inferSelect;
export type NewPrdReview = typeof prdReviews.$inferInsert;

export type PrdDownload = typeof prdDownloads.$inferSelect;
export type NewPrdDownload = typeof prdDownloads.$inferInsert;

export type PromptCategory = typeof promptCategories.$inferSelect;
export type NewPromptCategory = typeof promptCategories.$inferInsert;

export type Prompt = typeof prompts.$inferSelect;
export type NewPrompt = typeof prompts.$inferInsert;

export type PromptFavorite = typeof promptFavorites.$inferSelect;
export type NewPromptFavorite = typeof promptFavorites.$inferInsert;

export type PromptView = typeof promptViews.$inferSelect;
export type NewPromptView = typeof promptViews.$inferInsert;

export type PromptCopy = typeof promptCopies.$inferSelect;
export type NewPromptCopy = typeof promptCopies.$inferInsert;

export type PromptUsageReport = typeof promptUsageReports.$inferSelect;
export type NewPromptUsageReport = typeof promptUsageReports.$inferInsert;

export type PromptReview = typeof promptReviews.$inferSelect;
export type NewPromptReview = typeof promptReviews.$inferInsert;

export type PromptCollection = typeof promptCollections.$inferSelect;
export type NewPromptCollection = typeof promptCollections.$inferInsert;

export type PromptCollectionItem = typeof promptCollectionItems.$inferSelect;
export type NewPromptCollectionItem = typeof promptCollectionItems.$inferInsert;

export type PromptVariable = typeof promptVariables.$inferSelect;
export type NewPromptVariable = typeof promptVariables.$inferInsert;