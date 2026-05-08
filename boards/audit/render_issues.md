# Render Issues

Browser smoke check performed against `http://localhost:3000` in Brave.

## Checks

- Dashboard loaded and displayed canonical active question counts.
- Browse view loaded and rendered question cards with right-aligned marks badges.
- MCQ/options, fill-in-blank, assertion-reason, statement-based MCQ, CBQ, numerical-accountancy, and chapter/topic tags were visible in Browse/API spot checks.
- API checks passed for `/api/trends` and `/api/questions?subject=all&type=all&marks=all`.
- Verified image-path gate in `audit/FINAL_REPORT.md` is PASS.

## Issues Found And Fixed

- React warned about duplicate option keys when extracted data repeated labels. Fixed by keying rendered options with the option index plus label.

## Remaining Visual Caveats

- Some source PDF text remains semantically degraded from extraction, especially repeated MCQ options and `<` standing in for currency in older board-paper rows. These rows are preserved rather than fabricated; reviewable cases are tracked in `audit/human_review_queue.md`.
