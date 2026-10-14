# Publish BizMingle legal pages

The policy URLs submitted to Google Play must be ordinary, public HTML pages. Do not submit a PDF URL.

## Target URLs

- `https://bizmingle.online/privacy-policy`
- `https://bizmingle.online/child-safety`
- `https://bizmingle.online/terms`
- `https://bizmingle.online/delete-account`

## One-time GitHub setup

1. In `Ukwun/Ecommerce-dating-App`, open **Settings → Pages**.
2. Set **Source** to **GitHub Actions**. The existing `publish-legal-pages.yml` workflow publishes the `legal` directory.
3. Add `bizmingle.online` as the custom domain, then enable **Enforce HTTPS** after GitHub finishes provisioning its certificate.
4. In the GitHub account settings, verify `bizmingle.online` for Pages by creating the TXT record GitHub shows. Keep that record after verification.

## Namecheap DNS

Replace the parked records with these records. Remove any conflicting `@` or `www` parking records first.

| Type | Host | Value |
| --- | --- | --- |
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `ukwun.github.io` |

GitHub may take up to 24 hours to issue HTTPS after DNS changes. Do not submit the links to Play Console until all four target URLs load in a private browser window with a valid HTTPS certificate.

## Before Play resubmission

1. Replace the policy body with the final text from the approved PDFs. Keep it as HTML in these files; do not link to the PDFs.
2. Ensure the developer name and contact email exactly match the Google Play developer profile and the active inbox monitored for safety reports.
3. Complete the Play Console Child Safety Standards declaration truthfully: published standards, in-app reporting, enforcement of CSAM reports, legal reporting process, and child-safety contact.
4. Update Play Console's Privacy policy field to `https://bizmingle.online/privacy-policy` and Child Safety Standards URL to `https://bizmingle.online/child-safety`.
5. Keep the Data safety form consistent with the policy and the app's actual data collection and sharing.
