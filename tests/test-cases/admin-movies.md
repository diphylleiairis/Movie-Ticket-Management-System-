# Admin Movie acceptance cases

Requirements: CAT-01, ID-04. See [design](../../docs/design/admin-movies.md).

| Case | Expected result | Automation |
|---|---|---|
| CAT-A01 | Movie opens its child route while preserving the sidebar and browser document | TestCafe |
| CAT-A02 | Valid form creates one ACTIVE Movie with supplied details and genre links; list and Overview refresh | Unit + Integration + TestCafe |
| CAT-A03 | Missing fields, nonpositive/fractional duration, bad slug and non-HTTP(S) poster are rejected without a Movie | Unit + Integration + TestCafe |
| CAT-A04 | Duplicate slug rejects another Movie; form retains inputs and permits correction | Security + Integration + TestCafe |
| CAT-A05 | Anonymous/Customer/Staff cannot list/create; ADMIN mutation needs CSRF | Security + Integration + TestCafe |
| CAT-A06 | Existing genres are reused and new links commit with the Movie | Integration |
| CAT-A07 | List supports both states and bounded server search/pages; Cancel/mobile navigation makes no creation request | Unit + TestCafe |
| CAT-A08 | Creation invalidates cached catalog pages and Overview counts, with existing protection against late reads | Frontend store |
| CAT-A09 | ADMIN/CSRF upload returns a public Supabase poster URL; anonymous/Customer/Staff and missing CSRF cannot upload | Security + Storage adapter |
| CAT-A10 | Empty, oversized, unsupported and MIME-spoofed uploads do not reach Storage; provider failure is sanitized and not retried automatically | Unit + Storage adapter + TestCafe |
| CAT-A11 | Add movie has all borders visible; poster URL/upload/preview are on the right on desktop and stack without clipping on mobile | TestCafe |
| CAT-A12 | Successful upload fills the URL, displays the image and saves that URL with the Movie; failure retains fields/previous poster and allows retry | TestCafe |
