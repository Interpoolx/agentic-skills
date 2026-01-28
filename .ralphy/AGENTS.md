# AGENTS.md

> **AI Coding Assistant Instructions** - This document guides AI tools (GitHub Copilot, Cursor, Claude, etc.) on how to work with this codebase effectively.

---

## Project Overview

**Description**: [Brief description of what this project does]

**Tech Stack**:
- **Framework**: [React/Next.js/Remix/etc.]
- **Language**: [TypeScript/JavaScript]
- **Styling**: [Tailwind/CSS Modules/Styled Components/etc.]
- **State Management**: [Zustand/Redux/Context/TanStack Query/etc.]
- **Routing**: [React Router/Next.js/TanStack Router/etc.]
- **Build Tool**: [Vite/Webpack/Next.js/etc.]

---

## Quick Start

```bash
# Setup
[package manager] install

# Development
[package manager] run dev

# Build
[package manager] run build

# Testing
[package manager] run test

# Linting
[package manager] run lint
```

---

## Project Structure

```
[project-root]/
├── src/                    # Source files
│   ├── components/         # Reusable components
│   ├── features/          # Feature-based modules (optional)
│   ├── pages/             # Page/route components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Third-party library configurations
│   ├── utils/             # Utility functions
│   ├── types/             # TypeScript types/interfaces
│   ├── constants/         # Application constants
│   ├── config/            # Configuration files
│   └── [other-dirs]/      # [Project-specific directories]
├── public/                # Static assets
├── tests/                 # Test files (if not co-located)
└── [config files]         # Package.json, tsconfig, etc.
```

**Notes**:
- Adjust structure based on project needs
- Document any custom directories here
- Explain organizational decisions

---

## Code Conventions

### General Guidelines

- **Language**: Use [TypeScript/JavaScript] for all files
- **Components**: Use functional components with hooks
- **Exports**: Prefer [named/default] exports
- **File Naming**: [PascalCase for components, camelCase for utilities, etc.]
- **Formatting**: [Prettier/ESLint] enforces style automatically

### Component Structure

```tsx
// Preferred component pattern
import { [hooks] } from '[library]';
import type { [types] } from '@/types';

interface [Component]Props {
  // Props definition
}

export function [Component]({ prop1, prop2 }: [Component]Props) {
  // Hooks
  // Event handlers
  // Render logic
  
  return (
    // JSX
  );
}
```

### Naming Conventions

- **Components**: `[convention]` (e.g., PascalCase)
- **Hooks**: `[convention]` (e.g., camelCase with 'use' prefix)
- **Utils**: `[convention]` (e.g., camelCase)
- **Types**: `[convention]` (e.g., PascalCase)
- **Constants**: `[convention]` (e.g., UPPER_SNAKE_CASE)
- **Files**: `[convention]` (e.g., match export name)

### Import Organization

```tsx
// 1. External dependencies
import { useState } from 'react';
import { someLib } from 'some-library';

// 2. Internal modules (use path aliases)
import { Component } from '@/components/Component';
import { useCustomHook } from '@/hooks/useCustomHook';
import { helper } from '@/utils/helper';

// 3. Types
import type { User } from '@/types';

// 4. Relative imports (if any)
import { LocalComponent } from './LocalComponent';

// 5. Styles (if applicable)
import styles from './Component.module.css';
```

---

## Styling Approach

**Primary Method**: [Tailwind/CSS Modules/Styled Components/CSS-in-JS/etc.]

### Guidelines

- [Specific styling conventions for your project]
- [How to handle conditional styles]
- [Theme/design system usage]
- [Responsive design patterns]

**Example**:
```tsx
// [Show example of how styling is done in this project]
```

---

## State Management

**Approach**: [Zustand/Redux/Context API/TanStack Query/etc.]

### Guidelines

- **Global State**: [When and how to use global state]
- **Server State**: [How API data is cached/managed]
- **Component State**: [When to use local state]
- **Form State**: [Form handling approach]

**Location**: [Where state management code lives]

---

## Data Fetching

**Method**: [fetch/axios/TanStack Query/SWR/tRPC/etc.]

### Guidelines

- All API calls should [be in service layer/use custom hooks/etc.]
- Error handling: [Standard error handling pattern]
- Loading states: [How loading is managed]
- Type safety: [How API responses are typed]

**Example**:
```tsx
// [Show example of data fetching pattern]
```

---

## Routing

**Router**: [React Router/Next.js/TanStack Router/etc.]

### Guidelines

- Route definitions: [Where routes are defined]
- Protected routes: [How auth routes are handled]
- Dynamic routes: [Pattern for dynamic segments]
- Navigation: [Preferred navigation method]

---

## Forms & Validation

**Approach**: [React Hook Form/Formik/Custom/etc.]
**Validation**: [Zod/Yup/Custom/etc.]

### Guidelines

- [Form handling pattern]
- [Validation schema location]
- [Error display approach]

---

## Testing

**Framework**: [Vitest/Jest/etc.]
**Component Testing**: [React Testing Library/etc.]
**E2E**: [Playwright/Cypress/etc.]

### Conventions

- Test file location: [Co-located/separate directory]
- Naming: `[pattern].test.[tsx/ts]`
- Focus on: [User behavior/Integration/etc.]

**Example**:
```tsx
// [Show example test structure]
```

---

## Key Patterns & Practices

### DO ✅

- [Project-specific best practice 1]
- [Project-specific best practice 2]
- [Project-specific best practice 3]

### DON'T ❌

- [Anti-pattern to avoid 1]
- [Anti-pattern to avoid 2]
- [Anti-pattern to avoid 3]

---

## Common Tasks

### Adding a New Component

1. [Step-by-step process]
2. [Where to create it]
3. [How to export it]
4. [How to add tests]

### Adding a New Page/Route

1. [Step-by-step process]
2. [File location]
3. [Route registration]
4. [SEO/metadata handling if applicable]

### Adding an API Integration

1. [Step-by-step process]
2. [Type definition]
3. [Service layer creation]
4. [Error handling]

### Adding a New Dependency

```bash
[package manager] add [package]
```
- Verify license compatibility
- Update this file if it affects conventions
- [Any other project-specific requirements]

---

## Environment Variables

**Location**: `.env.local` (or [project-specific])

```bash
# Required variables
[VAR_NAME]=[description]
[VAR_NAME]=[description]

# Optional variables
[VAR_NAME]=[description]
```

**Note**: Never commit `.env.local` - use `.env.example` as template

---

## TypeScript Guidelines

### Type Definitions

- **Location**: [Where types are defined]
- **Shared Types**: [In types/ directory or co-located]
- **API Types**: [Generated/Manual/etc.]

### Best Practices

- Avoid `any` - use `unknown` if type is truly unknown
- [Project-specific TypeScript conventions]
- [How to handle third-party library types]

---

## Performance Considerations

- [Lazy loading strategy]
- [Code splitting approach]
- [Optimization patterns used]
- [Bundle size monitoring]

---

## Accessibility (a11y)

- [Accessibility standards followed]
- [Testing approach for a11y]
- [Key requirements]

---

## Security

- [Authentication/Authorization approach]
- [API security practices]
- [Input sanitization]
- [XSS prevention measures]

---

## Common Pitfalls

### Issue: [Common Problem 1]
**Solution**: [How to avoid/fix it]

### Issue: [Common Problem 2]
**Solution**: [How to avoid/fix it]

---

## Debugging

### Development Tools
- [Browser DevTools extensions used]
- [Logging approach]
- [Debug mode activation]

### Common Debug Commands
```bash
[command]: [description]
[command]: [description]
```

---

## Build & Deployment

### Build Process
```bash
[build command]
```

### Environment-Specific Builds
- **Development**: [configuration]
- **Staging**: [configuration]
- **Production**: [configuration]

### Deployment Checklist
- [ ] Run type check
- [ ] Run linter
- [ ] Run tests
- [ ] [Other project-specific checks]

---

## Git Workflow

### Branch Naming
```
[convention]/[description]
```

### Commit Messages
[Convention used - Conventional Commits/Custom/etc.]

```
[type]: [description]

[optional body]
```

### Pull Request Process
1. [Step 1]
2. [Step 2]
3. [Required checks]

---

## AI Assistant Guidelines

### When Generating Code

1. **Follow existing patterns**: Match the style and structure already in the codebase
2. **Use type safety**: Always provide TypeScript types where applicable
3. **Consider imports**: Use the project's path aliases and import conventions
4. **Match formatting**: Code should pass linting without modifications
5. **Include tests**: Generate tests following project conventions

### When Refactoring

1. **Preserve functionality**: Don't change behavior without explicit request
2. **Maintain type safety**: Ensure types remain accurate
3. **Update related files**: Adjust imports, tests, and documentation
4. **Follow conventions**: Use established patterns even when refactoring

### When Debugging

1. **Check types first**: Many issues are TypeScript-related
2. **Review conventions**: Ensure code follows project guidelines
3. **Consider dependencies**: Check if libraries are used correctly
4. **Verify environment**: Ensure environment variables are set

---

## Additional Resources

- **Documentation**: [Link to docs]
- **Design System**: [Link if applicable]
- **API Documentation**: [Link if applicable]
- **Team Communication**: [Slack/Discord/etc.]

---

## Changelog

Track major changes to this file:

- **[Date]**: [Change description]
- **[Date]**: [Change description]

---

**Last Updated**: [Date]  
**Maintained By**: [Team/Individual]