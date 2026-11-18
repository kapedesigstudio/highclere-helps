const fs = require("fs");

const { ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_ZSOID } = process.env;

async function getAccessToken() {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: ZOHO_REFRESH_TOKEN,
    client_id: ZOHO_CLIENT_ID,
    client_secret: ZOHO_CLIENT_SECRET,
  });
  const res = await fetch("https://accounts.zohocloud.ca/oauth/v2/token", { method: "POST", body });
  const data = await res.json();
  if (!data.access_token) throw new Error("Token error: " + JSON.stringify(data));
  return data.access_token;
}

async function main() {
  const token = await getAccessToken();
  const url = `https://meeting.zohocloud.ca/api/v2/${ZOHO_ZSOID}/webinar.json?listtype=upcoming&index=1&count=50`;
  const res = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
  const data = await res.json();
  const sessions = (data.session || []).map((s) => ({
    topic: s.topic,
    startTime: s.startTime,
    registrationLink: s.registrationLink,
  }));
  fs.writeFileSync(
    "sessions.json",
    JSON.stringify({ updated: new Date().toISOString(), sessions }, null, 2)
  );
  console.log(`Saved ${sessions.length} sessions`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
