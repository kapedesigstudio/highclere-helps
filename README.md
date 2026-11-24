# Highclere Helps deployment

The landing page is a static website. Zoho credentials are used only by GitHub
Actions to create the public webinar feed; the website server does not need them.

The flow is: GitHub Secrets -> GitHub Actions -> public sessions.json on GitHub ->
the visitor's browser. The page reads the public GitHub feed directly.

## 1. Add secrets in GitHub

Open the repository's **Settings -> Secrets and variables -> Actions ->
New repository secret**. Add each value under its exact name:

| Name | Purpose |
| --- | --- |
| `ZOHO_CLIENT_ID` | Zoho OAuth client ID |
| `ZOHO_CLIENT_SECRET` | Zoho OAuth client secret |
| `ZOHO_REFRESH_TOKEN` | Zoho OAuth refresh token |
| `ZOHO_ZSOID` | Zoho organization ID used in the API URL |

The workflow already references these names using `${{ secrets.NAME }}`. Keep
values out of HTML, browser JavaScript, JSON, workflow YAML, and committed files.
The organization ID and client ID are identifiers, but keeping all four in
Actions secrets makes the existing configuration consistent.

For local development, copy `.env.example` to `.env.local`, fill it in privately,
and use Node.js 24:

```powershell
node --env-file=.env.local fetch-sessions.js
```

`.env.local` is ignored by Git. `.env.example` contains blank values and is safe
to commit. Ignoring a file does not remove it from existing commits. If credentials
were ever committed, revoke/rotate them in Zoho first, update GitHub Secrets, and
then address the affected Git history. Making a repository private or deleting a
file does not invalidate a leaked credential.

## 2. Put the website code in the repository

This directory is the repository root: `.github/`, `index.html`, `sessions.js`,
`sessions.json`, `fetch-sessions.js`, `build-site.js`, `.gitignore`, `.env.example`,
and this README belong together. Do not upload `.env.local` to GitHub.

The downloaded copy has no `.git` directory. Apply these files to your actual
GitHub checkout (or upload only the named source files through GitHub). Do not
upload this outer Downloads folder, private environment files, or the ZIP as code.

The prepared workflow runs on changes to the website on `main`, on its roughly
15-minute schedule, and manually. It fetches Zoho webinars, builds the public
folder, saves a `landing-page` download under the workflow run's **Artifacts**,
and commits `sessions.json` back to the default branch. The page reads that public
file directly, so data updates need no server upload. The workflow does not deploy
HTML or JavaScript changes to the server. The Actions token must be allowed to write repository
contents; protected branches may require a different feed storage approach.

## 3. Upload only the public files

From this directory run:

```powershell
node build-site.js
```

Upload the **contents** of `dist/` into the chosen landing-page folder on the server:

```text
index.html
sessions.js
sessions.json
```

For example, `/public_html/highclere-helps/` might serve
`https://your-domain.example/highclere-helps/`. Your host must confirm the actual
mapping. The server only needs static-file hosting over HTTPS; Node.js is not
required there. The bundled `sessions.json` is a snapshot; the page's current
configuration reads the maintained public feed on GitHub instead.

Everything served to a browser is public. The Zoho registration links and public
Forms submission URL are intended to be visible. Never put an OAuth access token,
client secret, or refresh token in these public files. `.gitignore` is not a web
server access rule, so do not upload the repository or `.env.local` to the web root.

The builder copies only the three listed files and rejects unexpected existing
files in `dist/` rather than silently including them in an upload.

## 4. Automatic webinar updates

`sessions.js` reads:

```text
https://raw.githubusercontent.com/kapedesigstudio/highclere-helps/main/sessions.json
```

This repository and JSON file must remain public. The browser needs no GitHub or
Zoho token. Never add a private-repository token or OAuth secret to this script.

The HTML versions its script URL (`sessions.js?v=20261124-2`) so browsers load
the updated feed configuration. Upload both HTML and JavaScript together; change
that version when making future script changes.

After uploading the updated `sessions.js` once, every successful workflow refresh
can reach the hosted page without uploading JSON to A2. The page loads the feed
on opening and polls every five minutes. GitHub's raw-file endpoint currently
caches responses for up to five minutes, so updates are not instantaneous.

Deploy HTML/JavaScript changes to A2 when the code changes. The generic
`landing-page` artifact is a downloadable upload package, not a published site.
If a server Content Security Policy restricts external connections, it must
allow this public feed under `connect-src`. The feed was checked with the
`https://zogenie.com` origin and returns `Access-Control-Allow-Origin: *`.

## 5. Verify the live page

1. Run the workflow manually under **Actions** and confirm it succeeds.
2. Open the landing-page URL and its sibling `sessions.js` URL. Confirm the
   hosted script points to the public GitHub feed above, then hard-refresh.
3. Confirm that feed's `updated` timestamp changes after a successful workflow.
   The sibling JSON on A2 is a snapshot and is no longer used by this script.
4. Check a future webinar's Eastern date/time and registration link. Webinars
   disappear once their scheduled start passes; use future events for testing.
5. Verify the production 1:1 form destination and placeholder links
   before launch. The existing form is named `AngieTestforlandingpage`.

Scheduled Actions can be delayed. Public-repository schedules are disabled after
60 days without repository activity; monitor failures and refresh timestamps.

References: [GitHub Actions secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets),
[removing exposed credentials](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository),
[workflow triggers](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows),
and [GITHUB_TOKEN behavior](https://docs.github.com/en/actions/concepts/security/github_token).
