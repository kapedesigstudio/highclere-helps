const fs = require("fs");

const { ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_ZSOID } = process.env;

async function readJson(res, label) {
  if (!res.ok) {
    throw new Error(`${label} failed (HTTP ${res.status}). Check your Zoho credentials and API permissions.`);
  }
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`${label} returned invalid JSON.`);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`${label} returned an unexpected response.`);
  }
  if (data.error) {
    throw new Error(`${label} was rejected by Zoho. Check your credentials and API permissions.`);
  }
  return data;
}

function positiveNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" && typeof value !== "string") return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function timezoneName(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const name = value.trim();
  try {
    new Intl.DateTimeFormat("en", { timeZone: name });
    return name;
  } catch {
    return null;
  }
}

async function getAccessToken() {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: ZOHO_REFRESH_TOKEN,
    client_id: ZOHO_CLIENT_ID,
    client_secret: ZOHO_CLIENT_SECRET,
  });
  const res = await fetch("https://accounts.zohocloud.ca/oauth/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await readJson(res, "Token request");
  if (typeof data.access_token !== "string" || !data.access_token.trim()) {
    throw new Error("Token request did not return an access token.");
  }
  return data.access_token;
}

async function main() {
  const missing = Object.entries({
    ZOHO_CLIENT_ID,
    ZOHO_CLIENT_SECRET,
    ZOHO_REFRESH_TOKEN,
    ZOHO_ZSOID,
  }).filter(([, value]) => !value || !value.trim()).map(([name]) => name);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  const token = await getAccessToken();
  const url = `https://meeting.zohocloud.ca/api/v2/${ZOHO_ZSOID}/webinar.json?listtype=upcoming&index=1&count=50`;
  const res = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
  const data = await readJson(res, "Webinar request");
  if (!Array.isArray(data.session)) {
    throw new Error("Webinar request did not return a session array; existing sessions.json was kept.");
  }
  const sessions = data.session.map((s) => {
    if (!s || typeof s !== "object" || Array.isArray(s)) {
      throw new Error("Webinar request returned an invalid session; existing sessions.json was kept.");
    }
    return {
      topic: s.topic,
      startTime: s.startTime,
      startTimeMillis: positiveNumber(s.startTimeMillis),
      timezone: timezoneName(s.timezone),
      duration: positiveNumber(s.duration),
      registrationLink: s.registrationLink,
    };
  });
  fs.writeFileSync(
    "sessions.json",
    JSON.stringify({ updated: new Date().toISOString(), sessions }, null, 2)
  );
  console.log(`Saved ${sessions.length} sessions`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
