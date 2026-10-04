# Hashtag Pizza CRM Security Specification

## 1. Data Invariants
1. Customer documents must contain valid strings for `name`, `phone`, bounded lengths, valid `tier` from enum (`Bronze`, `Silver`, `Gold`, `VIP`), non-negative `totalOrders`, `totalSpend`, and `loyaltyPoints`.
2. Orders can be submitted by customers (or created by staff). Each order must have a valid `customerPhone` (string <= 20), `orderType` in `['dine-in', 'takeaway', 'delivery']`, bounded `itemsSummary` (string <= 1000), positive `total`, and valid statuses.
3. Customers can only read/list data if authenticated as an Admin (`hashtagpizzainfo@gmail.com` or admins document).
4. Modification of CRM records (customers, campaign updates, admin configurations) requires verified Admin privileges.
5. Injections of unbounded payloads or arbitrary extra properties ("Ghost Fields") are blocked via strict property validation and size bounds.

## 2. The "Dirty Dozen" Payloads
1. **Malicious Customer with 1MB Name (Resource Exhaustion)**: `name` string exceeding 100 characters.
2. **Invalid Customer Tier Injection**: `tier: "SuperGod"` outside allowed enums.
3. **Negative Loyalty Points Exploitation**: `loyaltyPoints: -500`.
4. **Negative Order Total Spoof**: `total: -100`.
5. **Customer Phone Format Poisoning**: `customerPhone` containing executable or SQL script.
6. **Order Type Tampering**: `orderType: "free_food"` outside allowed enums.
7. **Ghost Field Injection in Customer**: Document containing unauthorized `isAdmin: true` attribute.
8. **Unauthorized Campaign Deletion by Non-Admin**: Non-admin attempting to delete marketing campaigns.
9. **Fake Email Verification Spoofing**: Auth token claiming `email: "hashtagpizzainfo@gmail.com"` with `email_verified: false`.
10. **ID Traversal Poisoning**: Document ID with path traversal `../../etc/passwd`.
11. **Order Status Tampering**: Non-admin user attempting to bypass payment and mark unpaid order as `paid`.
12. **Unbounded Items Summary**: `itemsSummary` string exceeding 1000 characters.

## 3. Test Runner Design
All tests must confirm that payloads violating schema constraints, unauthorized access paths, or unverified auth tokens result in `PERMISSION_DENIED`.
