# Project notes

## Shipping workflow

- This project is greenfield.
- Pull requests are not required for now.
- After changes are tested appropriately, commit and push them directly to `main` unless the user requests a different workflow.
- Do not use the lack of a pull request as a reason to reduce verification.

## Production verification

- Browser access is available. Use browser automation against `https://deathbench.com` to verify the real production experience, including relevant console and network errors.
- Also inspect the corresponding Vercel deployment, build output, and logs when deploying or debugging production.
- Do not treat a successful Vercel status as sufficient verification. Monitor the deployment through completion, then confirm the affected route on the custom production domain.
