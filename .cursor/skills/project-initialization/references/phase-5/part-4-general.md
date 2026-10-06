# Phase 5 - Part 4: General Requirements

> **Step file.** Cross-cutting requirements that do not belong to a single domain.
>
> **Parent:** [requirements.md](../requirements.md) - Phase 5 router
> **Read first:** [overview.md](overview.md) - adaptive mode and the skip-by-default policy that govern every Part
> **Previous step file:** [part-3-performance.md](part-3-performance.md) - web performance requirements
> **Next step file:** [part-5-security.md](part-5-security.md) - security requirements

---

## Part 4: General Requirements Collection

Ask all users (both modes):

```
1. Do you have specific performance goals?
   (e.g., "< 3s Time to Interactive", "< 200KB bundle", "No specific requirements")

2. Which browsers must be supported?
   (e.g., "Modern browsers only", "Including IE11", "Mobile-first")

3. What accessibility level is required?
   - WCAG 2.1 Level A (Basic)
   - WCAG 2.1 Level AA (Standard) ← Recommended
   - WCAG 2.1 Level AAA (Enhanced)
   - No specific requirements

4. SEO requirements?
   (e.g., "Critical - needs SSR", "Not important - SPA is fine")

5. Any other constraints?
   (e.g., "Offline support", "Multi-language", "Must integrate with X API")
```
