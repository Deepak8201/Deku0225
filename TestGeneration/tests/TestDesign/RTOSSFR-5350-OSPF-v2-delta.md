# RTOSSFR-5350 OSPF Modelling Extension — v2 Delta

This document summarizes what is **new or changed** in the second version of the `[RTOSSFR-5350] OSPF Modelling Extension` design. Use it to prepare test cases for the newly added user stories and validation rules.

---

## 1. New User Stories

### ospf-27 — Manage Export Policies on an OSPF Process

- **Purpose**: Record the route policies an OSPF process applies to everything it advertises. This is the mechanism Junos-configured OSPF actually uses, because Junos has no `redistribute` statement inside OSPF.
- **UI location**: OSPF Process create/edit dialog → **Export Policies** ordered list.
- **Data model**: New `export-policy` ordered leaf-list of Route Policy references on `ospf-process` (`nc-ci/ai-baseext-ip-ospf-process.yang` v6.1.0 / v7.1.0).
- **Key behaviors**:
  - Picker scoped to Route Policies on the same Network Element.
  - Order is preserved; reordering changes configuration.
  - Coexists with **Redistribution rows** (`ospf-25`).
  - A Junos export policy whose match clause says `from protocol bgp` should also appear as a Redistribution row on the same process.
  - Expected to be empty on IOS/IOS-XR.
- **Validations**:
  - **BV-1 Warning**: Same policy appears twice in the export chain → the later entry is unreachable.
  - **BV-2 Warning**: Export policy match clause names a source protocol, but no matching Redistribution row exists on the process.

### ospf-29 — Create / Edit MAC List

- **Purpose**: Document named MAC lists so a Route Policy can filter EVPN MAC/IP routes by MAC address.
- **UI location**: Network Element → **Routing Policy** → **MAC Lists** sub-tab → Entries child tab.
- **Data model**: New `mac-list` child of Network Element with `mac-list-entry` (`mac-address`, `mask`). Added in `nc-ci/ai-baseext-ip-route-policy.yang` v8.1.0.
- **Key behaviors**:
  - A MAC List is a **set**, not an ordered list.
  - Selectable from a Route Policy match clause whose **Match Type** is `MAC List`.
  - A mask widens an entry to a block (e.g., OUI).
- **Validations**:
  - **BV-M1 Error**: Name is required.
  - **BV-M2 Error**: MAC Address is required.
  - **BV-U1 Error**: Name collides within Network Element + list kind.
  - **BV-U2 Error**: Same MAC Address + Mask twice in one list.
  - **BV-4 Warning**: List has no entries.

---

## 2. New / Changed Entities and Attributes

### 2.1 OSPF Process

- **New**: `export-policy` ordered ref-triplet leaf-list (v6.1.0 / v7.1.0).
- **New**: **General Info** group on create/edit with `Name` and `Description`.
- **Renamed**: child list `redistribution` → `ospf-route-redistribution`.
- **Changed**: Detail page no longer has a Summary group; groups reordered to match the create dialog.

### 2.2 OSPF Routing Area

- **New uniqueness rule** (v2): `Area ID + OSPF Version` must be unique across the inventory.
- **New mandatory-field rules**: BV-M1 Name, BV-M2 Area ID, BV-M3 Area Type, BV-M4 OSPF Version.
- **Changed**: Now explicitly a **Location Manager hierarchy unit**; Create/Edit/Delete use LM permissions.

### 2.3 OSPF Interface

- **Removed**: `route-policy` reference triplet (v8.0.0). Interface-level route policy no longer exists; OSPF policy filtering is process-level.
- **New**: **General Info** group on create/edit with `Name` and `Description`.
- **New mandatory-field rules**: BV-M2 OSPF Area, BV-M3 Interface, BV-M4 Authentication Key ID (when Authentication is md5/sha).

### 2.4 Route Policy

- **Removed**: `direction` attribute (v9.0.0). Direction is inferred from the binding that applies the policy.
- **Removed**: Separate `condition` object (v10.0.0). Folded into the match clause as **Match Type** `route-exists` with `route-exists-table` and `condition-name`.
- **New match types**: `evpn-esi`, `evpn-etag`, `evpn-mac-route`, `mac-list`, `route-exists`, `routing-table`, `routing-instance`, `address-family`, `level`, `area`.
- **New match-clause fields**: `Clause Side`, `Match Operator`, `Match Length Type/Min/Max`, `Values` (ordered list), `Negate`.
- **New set types**: Load Balance, Default Action, Route Install Priority, Metric 2, Preference 2, Tag 2, AS Path Expand, Damping, Forwarding Class, Suppress Route, Unsuppress Route.
- **New set operation**: `Subtract` (in addition to Set/Add/Delete).
- **New**: `Name` and `Description` on Statement, Match Clause, and Set Clause.

### 2.5 Filter Lists

- **New entity**: **MAC List** and **MAC List Entry** (see ospf-29).
- **Community List**: New `invert-match` flag in an **Additional Info** group.
- **All filter lists**: `Name` and `Description` added to the list object and to each entry/statement.
- **Access List**: New **Protocol Options** group (`established`, `tcp-flags`, `icmp-type`, `icmp-code`) and **Traffic Match** group (`dscp`, `precedence`, `fragments`, `log`).

### 2.6 Redistribution Row (ospf-25)

- **New**: `source-level` field for IS-IS source protocol.
- **New**: `Applied To Peer Groups` field (Junos BGP only).
- **New**: **General Info** group with `Name` and `Description`.

---

## 3. New / Changed Business Validations

### 3.1 Severity and Structure

- Many former **Blocking** rules are now labeled **Error**.
- New **Level** column added to rules: **Product** (platform-wide) vs **Project** (domain-specific).

### 3.2 New Mandatory-Field Rules

Every field marked **Yes** or **Cond.** in a create/edit dialog now has its own error rule:

| Entity | New Rules |
|--------|-----------|
| OSPF Process | BV-M1 Process ID, BV-M2 OSPF Version, BV-M3 Address Families, BV-M4 SRGB Lower Bound, BV-M5 SRGB Upper Bound |
| OSPF Routing Area | BV-M1 Name, BV-M2 Area ID, BV-M3 Area Type, BV-M4 OSPF Version |
| OSPF Interface | BV-M2 OSPF Area, BV-M3 Interface, BV-M4 Authentication Key ID |
| Route Policy | BV-M1 Name |
| Prefix List | BV-M1 Name, BV-M2 Address Family, BV-M3 Prefix |
| Community / Extended Community List | BV-M1 Name, BV-M2 Community Type, BV-M3 Match Mode, BV-M4/BV-M5 (mixed cases), BV-M6 Value |
| Access List | BV-M1 Name, BV-M2 Address Family, BV-M3 ACL Type, BV-M4 Action, BV-M5 Source Prefix, BV-M6 Protocol, BV-M7 Source Port, BV-M8 Destination Prefix, BV-M9 Destination Port |
| AS-Path Access List | BV-M1 Name, BV-M2 Regular Expression |
| MAC List | BV-M1 Name, BV-M2 MAC Address |
| Sham Link | BV-M1 Local Endpoint, BV-M2 Remote Endpoint |

### 3.3 Notable New Behavioral Validations

- **OSPF Process BV-6 Error**: NX-OS or Junos redistribution must name a Route Policy.
- **OSPF Process BV-7 Error**: `Applied To Peer Groups` applies to Junos only.
- **OSPF Process BV-8 (OOS) Warning**: Named Route Policy has no match clause selecting the source protocol.
- **Route Policy BV-6 Error**: Community action that names a list must actually select the list.
- **OSPF Interface**: Prefix SID / Node SID now conditioned on parent process having Segment Routing enabled.

---

## 4. UI / Presentation Changes in v2

- **No Summary groups** on detail pages for IP/MPLS objects; pages open directly on `general-info`.
- **Routing Policy** is now a **top-level tab group** on the Network Element, not nested under Routing.
- **No "All OSPF Interfaces" table** at the NE level; interfaces are reached only through OSPF Process → OSPF Interfaces.
- **New MAC Lists sub-tab** under Routing Policy.
- **FHRPs** moved to its own Network Element tab.
- **New / simplified naming rules**:
  - Route Policy: `RM-<nn>` (was `RM-<IN|OUT|BI>-<nn>`).
  - OSPF Routing Area: `ospf-area-<area-id>-<version>`.
  - New: `ML-<nn>` for MAC List, `<ospf-process>_<source-protocol>-<source-instance>` for Redistribution, `<ospf-process>_sham-<local>-<remote>` for Sham Link.

---

## 5. Test Case Preparation Checklist

Use this checklist to scope test cases for the changed stories:

| Story | Test Focus |
|-------|------------|
| **ospf-27** | Create OSPF Process with Export Policies; reorder; duplicate-policy warning; Junos-only peer groups; coexistence with Redistribution rows |
| **ospf-29** | Create MAC List; add entries with/without mask; name uniqueness; duplicate MAC+mask; consume from Route Policy match clause |
| **ospf-24** (updated) | New match types (`route-exists`, EVPN types, `mac-list`); new set types; community action referencing a list; statement reorder warning |
| **ospf-25** (updated) | `source-level`; `Applied To Peer Groups` on Junos BGP; NX-OS/Junos policy-required error |
| **ospf-12/13/14/15** | Name/Description fields; new mandatory rules; Export Policies tab |
| **ospf-05/06/17** | Removal of interface route-policy; new Name/Description; updated mandatory/conditional rules |
| **ospf-01/02/03** | Area ID + OSPF Version uniqueness; mandatory field rules; LM permissions |

---

## 6. Model Version Reference

| Module | v1 | v2 |
|--------|----|----|
| `nc-{ci,ai}-baseext-ip-ospf-process.yang` | v1.0.0 / v5.0.0 | v7.1.0 |
| `nc-{ci,ai}-baseext-ip-ospf-interface.yang` | v6.0.0 | v8.0.0 (CI), v9.0.0 (AI) |
| `nc-{ci,ai}-baseext-ip-route-policy.yang` | v5.0.0 | v11.0.1 |
| `nc-lm-sample-ospf-routing-area.yang` | v1.0.0 | v2.0.0 |

---

## 7. Withdrawn / Folded in v2

- **ospf-28 Create / Edit Condition** is withdrawn. The concept is folded into the Route Policy match clause as **Match Type = route-exists**.
- **Route Policy `direction`** attribute is withdrawn.
- **OSPF Interface `route-policy`** reference is withdrawn.
