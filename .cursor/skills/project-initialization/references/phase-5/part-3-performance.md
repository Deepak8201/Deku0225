# Phase 5 - Part 3: Web Performance Requirements

> **Step file.** Core Web Vitals, performance budgets, and optimisation strategy. Skipped for BA-only runs and for projects with no web surface.
>
> **Parent:** [requirements.md](../requirements.md) - Phase 5 router
> **Read first:** [overview.md](overview.md) - adaptive mode and the skip-by-default policy that govern every Part
> **Previous step file:** [part-2-architecture.md](part-2-architecture.md) - architecture decisions
> **Next step file:** [part-4-general.md](part-4-general.md) - general requirements

---

## Part 3: Web Performance Requirements

**Conditional:** Ask these questions **only if** the project is identified as Frontend/UI focused (React, Vue, Next.js, etc.) during Phase 3.

### Round 1 - Core Web Vitals & Performance Budgets (3 questions):

```
1. What are your Core Web Vitals targets?
   Default targets (if no specific requirements):
   - LCP (Largest Contentful Paint): < 2.5s
   - FID (First Input Delay): < 100ms
   - CLS (Cumulative Layout Shift): < 0.1
   
   Custom targets:
   (e.g., "LCP < 1.5s for landing pages", "Strict: LCP < 1.8s, FID < 50ms, CLS < 0.05")

2. What is your bundle size budget?
   Options:
   - Strict: < 150KB initial JS (gzipped)
   - Standard: < 200KB initial JS (gzipped) ← Recommended
   - Relaxed: < 300KB initial JS (gzipped)
   - No specific budget
   
   Additional JS loaded on interaction:
   (e.g., "Allow up to 500KB for additional features")

3. What is your target Lighthouse Performance score?
   Options:
   - Aggressive: 95-100 (all pages)
   - Standard: 90-95 (critical pages), 80+ (others) ← Recommended
   - Basic: 80+ (all pages)
   - No specific target
```

### Round 2 - Optimization Strategy (4 questions):

```
4. What is your image optimization strategy?
   (e.g., "Next.js Image component with WebP/AVIF", "Cloudinary for transforms", "Manual optimization", "Not decided")

5. What code splitting approach will you use?
   Options:
   - Route-based splitting (default for Next.js, etc.)
   - Component-based lazy loading
   - Dynamic imports for heavy features
   - Aggressive splitting with granular chunks
   - No specific strategy yet

6. What is your caching strategy?
   (e.g., "Service Worker with Workbox", "CDN caching (CloudFront)", "Redis for API responses", "Not decided")

7. Are there specific performance-critical features?
   (e.g., "Infinite scroll must be smooth", "Real-time updates without lag", "3D visualization must load fast")
```

### Persistence Targets

> Performance values live in `.cursor/skills/performance-context/project-config.json`; the ledger carries only Q-blocks.

| Topic | Authoritative artifact | Field(s) |
|-------|------------------------|----------|
| Core Web Vitals targets (LCP, FID/INP, CLS, FCP, TTI) | `performance-context/project-config.json` | `coreWebVitals.{lcp,fid,cls,fcp,tti}` |
| Bundle size budgets | `performance-context/project-config.json` | `budgets.{js,css,total,images}` |
| Lighthouse score targets | `performance-context/project-config.json` | `lighthouse.{performance,a11y,bestPractices,seo}` |
| Optimization strategies (images, code splitting, caching) | `performance-context/project-config.json` | `optimization.*` |
| Performance-critical features | `performance-context/project-config.json` | `criticalFeatures[]` |
| Monitoring & measurement tooling | `performance-context/project-config.json` + `infrastructure-context/project-config.json` | `monitoring.*` |

Update `Supplemental Source Manifest` row "Performance budgets and Core Web Vitals targets" to point to `performance-context/project-config.json`. Append one Q-block per asked question to Decision Log §5 with `Decision stored in: .cursor/skills/performance-context/project-config.json`.
