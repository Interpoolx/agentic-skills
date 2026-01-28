# [Project Name] - Product Requirements Document

> **Template Type**: Basic Project (Simple Features)  
> **Version**: 1.0  
> **Date**: [YYYY-MM-DD]  
> **Status**: Draft
> **Type**: Template

---

## 1. Executive Summary

[Write 2-3 sentences describing what this project does, who it's for, and what problem it solves]

**Example**: This task management app helps remote teams organize their daily work. It provides a simple interface for creating tasks, assigning them to team members, and tracking progress in real-time.

---

## 2. Product Vision

### 2.1 Mission Statement
[1 sentence describing the core purpose]

### 2.2 Product Goals
- [Goal 1 - be specific and measurable]
- [Goal 2]
- [Goal 3]

---

## 3. Problem Statement

### 3.1 Current Pain Points
- [Specific problem users face today]
- [Another pain point]
- [Third pain point]

### 3.2 Why This Matters
[Explain the impact of these problems on users]

---

## 4. Target Audience

**Primary Users**: [Who will use this? E.g., "Small team leads managing 5-10 people"]

**User Persona**:
- **Name**: [Persona name, e.g., "Sarah, Team Lead"]
- **Age**: [25-35]
- **Tech Level**: [Beginner/Intermediate/Advanced]
- **Pain Points**: [What frustrates them?]
- **Goals**: [What do they want to achieve?]

---

## 5. Technical Stack

- **Framework**: [e.g., React 18.2, Next.js 14]
- **Backend**: [e.g., Node.js 20, Express 4.x]
- **Database**: [e.g., PostgreSQL 15, Prisma 5.x]
- **Styling**: [e.g., TailwindCSS 3.4]
- **Auth**: [e.g., NextAuth.js, Supabase Auth]
- **Hosting**: [e.g., Vercel, AWS]

---

## 6. Features & Requirements

### Phase 1: Foundation (Week 1-2) - CRITICAL

- [ ] **Setup Project Structure**
  **Files**: `package.json`, `.gitignore`, `tsconfig.json`
  **Effort**: S (1 day)
  **Acceptance Criteria**:
  - Git repository initialized
  - ESLint and Prettier configured
  - TypeScript strict mode enabled

- [ ] **Database Schema**
  **Files**: `prisma/schema.prisma`
  **Effort**: S (1-2 days)
  **Acceptance Criteria**:
  - [Table 1] created with fields [field1, field2]
  - [Table 2] created with relationships defined
  - Migrations working

- [ ] **Environment Configuration**
  **Files**: `.env.example`, `src/config.ts`
  **Effort**: S (1 day)
  **Acceptance Criteria**:
  - .env.example has all required variables
  - Config validation on startup
  - Secure secrets management

---

### Phase 2: Core Features (Week 3-4) - HIGH

- [ ] **MUST: [Feature Name]**
  **Files**: `src/features/[feature]/`, `src/components/[Component].tsx`
  **Effort**: M (3-5 days)
  **Depends on**: Database Schema
  **Acceptance Criteria**:
  - [ ] User can [specific action]
  - [ ] Data persists correctly
  - [ ] Error handling works
  - [ ] Responsive on mobile

- [ ] **MUST: [Another Feature]**
  **Files**: `src/[path]/[file].ts`
  **Effort**: M (3-5 days)
  **Acceptance Criteria**:
  - [ ] [Specific outcome 1]
  - [ ] [Specific outcome 2]

---

### Phase 3: Enhanced Features (Week 5-6) - MEDIUM

- [ ] **SHOULD: [Enhancement]**
  **Files**: `src/[path]/`
  **Effort**: M (3-4 days)
  **Acceptance Criteria**:
  - [ ] [Criterion 1]
  - [ ] [Criterion 2]

---

### Phase 4: Future Enhancements - LOW

- [ ] **COULD: [Nice-to-have Feature]**
  - [Brief description]
  - Can be deferred to post-MVP

---

## 7. Success Metrics

### Performance
- Page load time: < 2 seconds
- API response time: < 500ms (p95)
- Database queries: < 100ms

### Functionality
- User can complete [core action] in < 3 clicks
- Error rate: < 1% of requests
- Uptime: 99.9%

### Scale
- Support [X] concurrent users
- Handle [Y] requests per day

---

## 8. Non-Functional Requirements

### Security
- All passwords hashed with bcrypt
- HTTPS only in production
- Input validation on all forms

### Accessibility
- WCAG 2.1 Level AA compliance
- Keyboard navigation support
- Screen reader compatible

### Performance
- Lighthouse score > 90
- Core Web Vitals pass
- Bundle size < 200KB

---

## 9. Out of Scope

The following are explicitly NOT included in this PRD:
- [Feature X - to be addressed later]
- [Business decision Y]
- [Integration Z]

---

## 10. Open Questions

- [ ] [Question 1 that needs clarification]
- [ ] [Question 2 from stakeholders]

---

## 11. References

- [Design mockups]: [Link to Figma]
- [API documentation]: [Link to Swagger]
- [Competitive analysis]: [Link to doc]

---

**How to Use This Template**:
1. Replace all `[placeholders]` with actual content
2. Delete sections that don't apply to your project
3. Add file paths in `backticks` wherever you mention code
4. Use MoSCoW priorities: MUST, SHOULD, COULD
5. Include specific acceptance criteria for each feature
6. Run "🔍 Review PRD Quality" in dashboard before converting to tasks
