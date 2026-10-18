# Vidyalaya One — Starter Portal

A responsive static landing page for PM SHRI Kendriya Vidyalaya No. 1 Itanagar.

## Included
- `index.html` — portal homepage and four application tiles.
- KVS SAMAGAM currently links to `https://samagam.kvs.gov.in/`.
- Timetable & School Duty Hub, Academic Progress & Student Support, and Examination Management Centre are placeholders until their URLs/apps are ready.

## Deploy on Vercel
1. Create a new GitHub repository named `vidyalaya-central-portal`.
2. Upload `index.html` to the repository root.
3. In Vercel, choose **Add New → Project**, import the new repository, and deploy.
4. For this static HTML page, no build command is needed; the root directory should contain `index.html`.

## Important security note
This starter is a public-facing static page unless access is restricted through a suitable deployment/authentication setup. It does not include authentication, staff roles, permissions, or confidential student data. Add secure server-side authentication and authorization before using it for internal or sensitive school operations.
