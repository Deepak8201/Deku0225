# OSPF Modelling Extension - New User Stories Report
**Date:** 2026-10-21  
**Epic:** IP MPLS Metro Ethernet — Resource Inventory

---

## Summary
**Total New Stories:** 15  
**Priority 1 (Critical):** 14  
**Priority 2 (High):** 1

---

## New User Stories (Marked with ➕ Added)

| ID | Story Name | Priority | Scope / Notes |
|---|---|---|---|
| ospf-12 | Create Regular OSPF Process | 1 | Regular (global) process — VRF empty |
| ospf-13 | Create OSPF Process in VRF | 1 | Same entity as ospf-12 with a VRF reference set |
| ospf-14 | Edit OSPF Process | 1 | Edit router-id, reference bandwidth, and other process attributes |
| ospf-15 | Delete OSPF Process | 1 | Auto-removes references (warning, M9); removes child OSPF interfaces |
| ospf-16 | Delete Route Policy | 2 | Auto-removes references (warning, M9); used by OSPF |
| ospf-17 | Delete OSPF Interface | 1 | Leaf record — nothing references it; releases Prefix SID |
| ospf-18 | Create / Edit Prefix List | 1 | Closes part of BUC-058 — filter list documentation |
| ospf-19 | Create / Edit Community List and Extended Community List | 1 | Closes part of BUC-058 — filter list documentation |
| ospf-20 | Create / Edit Access List | 1 | Closes part of BUC-058 — filter list documentation |
| ospf-21 | Create / Edit AS-Path Access List | 1 | Closes part of BUC-058 — filter list documentation |
| ospf-22 | Delete a Filter List Entry | 1 | Delete a line from a filter list with impact warnings |
| ospf-23 | Discover and Reconcile Filter Lists | 1 | Completes BUC-058 — line-by-line matching |
| ospf-24 | Create / Edit Route Policy Statements | 1 | Makes the family activatable; build policies from ordered statements |
| ospf-25 | Manage Redistribution into an OSPF Process | 1 | Replaces single redistribution-policy reference; per-source management |
| ospf-26 | Document PE-CE OSPF: Domain ID and Sham Links | 1 | Record process Domain ID and sham links for PE-CE OSPF |

---

## Categorization by Feature Area

### OSPF Process Management (4 stories)
- **ospf-12:** Create Regular OSPF Process (global routing table)
- **ospf-13:** Create OSPF Process in VRF (VPN-specific routing)
- **ospf-14:** Edit OSPF Process attributes
- **ospf-15:** Delete OSPF Process (with cascade to interfaces)

### Interface Management (1 story)
- **ospf-17:** Delete OSPF Interface

### Route Policy & Redistribution (5 stories)
- **ospf-16:** Delete Route Policy
- **ospf-24:** Create / Edit Route Policy Statements
- **ospf-25:** Manage Redistribution into an OSPF Process
- **ospf-26:** Document PE-CE OSPF: Domain ID and Sham Links

### Filter Lists (5 stories)
- **ospf-18:** Create / Edit Prefix List
- **ospf-19:** Create / Edit Community List and Extended Community List
- **ospf-20:** Create / Edit Access List
- **ospf-21:** Create / Edit AS-Path Access List
- **ospf-22:** Delete a Filter List Entry
- **ospf-23:** Discover and Reconcile Filter Lists

---

## Key Changes from Previous Version

1. **Process Management Expanded:** Three new stories for OSPF Process CRUD operations (ospf-12, ospf-13, ospf-14, ospf-15)
2. **Filter Lists Introduced:** Five new stories for managing Prefix Lists, Community Lists, Access Lists, and AS-Path lists (ospf-18 through ospf-23)
3. **Redistribution Restructured:** ospf-25 replaces a single redistribution-policy reference with per-source management
4. **Route Policy Statements:** ospf-24 enables building activatable policies from statements
5. **PE-CE OSPF Support:** ospf-26 adds Domain ID and Sham Links documentation

---

## Impact Assessment

### High Complexity (Requires UX Design)
- ospf-24: Route Policy Statement builder
- ospf-25: Redistribution source management UI
- ospf-18 to ospf-21: Filter list editors

### Medium Complexity (Standard CRUD)
- ospf-12, ospf-13: Process creation
- ospf-14: Process edit
- ospf-26: PE-CE documentation

### Low Complexity (Delete Operations)
- ospf-15: Delete OSPF Process
- ospf-16: Delete Route Policy
- ospf-17: Delete OSPF Interface
- ospf-22: Delete Filter List Entry
- ospf-23: Discover and reconcile filter lists

---

## Business Requirements Addressed

These new stories close the following business use cases:
- **BUC-058:** Document Prefix Lists, Community Lists, Extended Community Lists, AS-Path Access Lists, Access Lists per NE
- **BUC-059:** Associate route policies to BGP neighbors and OSPF redistribution

---

*Report Generated: 2026-10-21*
