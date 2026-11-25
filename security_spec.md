# Security Specification — Inventaris Terpadu

## 1. Data Invariants
- Each user profile `/users/{uid}` is strictly bound to `request.auth.uid`.
- Data for an organization `/organizations/{orgId}/*` can only be accessed by authenticated members of that organization or the platform super admin (`mahralkh26@gmail.com`).
- Roles inside `/organizations/{orgId}/members/{uid}` are evaluated dynamically using `get()` and cannot be escalated by unauthorized members.
- Transactions, loans, and assets require valid identification and adhere to schema constraints.
- Auditor role can only read data, never create or modify.

## 2. The Dirty Dozen Payloads (Should be Rejected)
1. **Unauthenticated Read**: Attempting to read `/users/someUser` without auth.
2. **Cross-Tenant Access**: User from Org A attempting to read `/organizations/orgB/assets/asset1`.
3. **Privilege Escalation**: Non-admin attempting to write to `/organizations/orgA/members/{targetUid}` with role `admin`.
4. **Self-Promoted Admin**: User attempting to create their own membership in an existing organization as `admin` without invitation or ownership.
5. **ID Poisoning**: Attempting to create an asset with a 2KB malicious ID string.
6. **Negative Stock Insertion**: Creating an asset with negative quantity.
7. **Cross-User Profile Hijack**: User with uid `user123` attempting to write `/users/user456`.
8. **Auditor Write Bypass**: Auditor attempting to create an asset in `/organizations/orgA/assets/newAsset`.
9. **Field Pollution / Shadow Update**: Adding undeclared arbitrary root field `superToken` to an asset update.
10. **Timestamp Falsification**: Attempting to overwrite immutable `createdAt` with arbitrary past date.
11. **Malicious Organization Creation**: Setting another user's UID as `ownerUid` during organization registration.
12. **Audit Log Tampering**: Regular member attempting to delete or alter logs in `/organizations/orgA/auditLogs`.
