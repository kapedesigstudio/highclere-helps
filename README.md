# Highclere Helps deployment

The landing page is a static website. Zoho credentials are used only by GitHub
Actions to create the public webinar feed; the website server does not need them.

The flow is: GitHub Secrets -> GitHub Actions -> public sessions.json -> website.

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
and commits `sessions.json` back to the default branch. It does not yet upload
anything to a hosting server. The Actions token must be allowed to write repository
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
required there. Keep `sessions.json` caching short so updates become visible.

Everything served to a browser is public. The Zoho registration links and public
Forms submission URL are intended to be visible. Never put an OAuth access token,
client secret, or refresh token in these public files. `.gitignore` is not a web
server access rule, so do not upload the repository or `.env.local` to the web root.

The builder copies only the three listed files and rejects unexpected existing
files in `dist/` rather than silently including them in an upload.

## 4. Connect automatic server uploads

The server upload step needs the hosting provider, upload method (for example
SFTP/SSH or the provider's deployment integration), server hostname/port, exact
landing-page directory, and intended public URL. Obtain these from the host.

For SFTP, use an account restricted to this landing page where possible. Store
its private SSH key/password in additional GitHub Actions secrets. Obtain the
server's SSH host key/fingerprint through the hosting control panel or provider
and verify it when connecting. Keep the private key out of GitHub source and the
public upload. Hostnames and destination paths can use Actions variables.

Add the upload immediately after the public-package step in the **same workflow**,
so successful scheduled refreshes also reach the server. Upload only `dist/` and
preserve unrelated server files. Uploading once does not keep the live feed fresh.
Commits made with `GITHUB_TOKEN` do not trigger another workflow run or a Pages
build, so a separate push-only deploy workflow is not sufficient for this feed.

GitHub Pages is another possible static host, but it needs its own Pages artifact
and deployment step in this workflow. The generic `landing-page` artifact is a
downloadable upload package, not a published site.

## 5. Verify the live page

1. Run the workflow manually under **Actions** and confirm it succeeds.
2. Open the landing-page URL and its sibling `sessions.js` and `sessions.json` URLs.
3. Confirm the live JSON's `updated` timestamp changes after an automatic upload.
4. Check a future webinar's Eastern date/time and registration link. The bundled
   snapshot contains only a past test webinar, so an empty upcoming list is expected
   until a fresh feed includes a future event.
5. Verify the production 1:1 form destination, mockup badge, and placeholder links
   before launch. The existing form is named `AngieTestforlandingpage`.

Scheduled Actions can be delayed. Public-repository schedules are disabled after
60 days without repository activity; monitor failures and refresh timestamps.

References: [GitHub Actions secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets),
[removing exposed credentials](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository),
[workflow triggers](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows),
and [GITHUB_TOKEN behavior](https://docs.github.com/en/actions/concepts/security/github_token).
