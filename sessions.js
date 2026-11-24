(function () {
  "use strict";

  // Webinar data is public. Zoho credentials stay in GitHub Actions.
  // Read the maintained feed directly so hosted copies cannot become stale.
  var feedUrl = "https://raw.githubusercontent.com/kapedesigstudio/highclere-helps/main/sessions.json";
  var displayTimezone = "America/Toronto";
  var list = document.getElementById("session-list");
  var title = document.getElementById("next-session-title");
  var when = document.getElementById("next-session-when");
  var register = document.getElementById("next-session-register");
  var countdown = document.getElementById("count");
  var sessions = [];
  var target = null;

  function normalizeHostId(value) {
    if (typeof value === "string") return value.trim() || null;
    if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
      return String(value);
    }
    return null;
  }

  function formatDate(millis, options) {
    return new Intl.DateTimeFormat("en-CA", Object.assign({
      timeZone: displayTimezone
    }, options)).format(new Date(millis));
  }

  function sessionTime(session) {
    if (!session.startTimeMillis) return session.startTime || "Time to be confirmed";
    return formatDate(session.startTimeMillis, {
      weekday: "long", month: "long", day: "numeric", year: "numeric"
    }) + " · " + formatDate(session.startTimeMillis, {
      hour: "numeric", minute: "2-digit", timeZoneName: "short"
    });
  }

  function showMessage(heading, message) {
    target = null;
    countdown.hidden = true;
    title.textContent = heading;
    when.textContent = message;
    register.href = "#sessions";
    register.textContent = "See sessions";
    var notice = document.createElement("p");
    notice.className = "ses-message";
    notice.textContent = message;
    list.replaceChildren(notice);
  }

  function renderSessions() {
    var now = Date.now();
    var upcoming = sessions.filter(function (session) {
      return !session.startTimeMillis || session.startTimeMillis > now;
    });
    if (!upcoming.length) {
      showMessage("New sessions coming soon", "No upcoming sessions are available. Please check back soon.");
      return;
    }

    var cards = upcoming.map(function (session, index) {
      var card = document.createElement("div");
      card.className = "ses tx in" + (index === 0 ? " active" : "");
      var date = document.createElement("div");
      date.className = "date";
      var month = document.createElement("small");
      var day = document.createElement("b");
      month.textContent = session.startTimeMillis ? formatDate(session.startTimeMillis, { month: "short" }) : "Date";
      day.textContent = session.startTimeMillis ? formatDate(session.startTimeMillis, { day: "numeric" }) : "—";
      date.append(month, day);
      var details = document.createElement("div");
      var heading = document.createElement("h4");
      heading.textContent = session.topic || "Highclere Helps";
      var time = document.createElement("p");
      time.textContent = sessionTime(session);
      details.append(heading, time);
      var link = document.createElement("a");
      link.className = "ses-register";
      link.href = session.registrationLink;
      link.textContent = "Register";
      link.setAttribute("aria-label", "Register for " + heading.textContent + ", " + time.textContent);
      card.append(date, details, link);
      return card;
    });
    list.replaceChildren.apply(list, cards);

    var next = upcoming[0];
    title.textContent = next.topic || "Next session";
    when.textContent = sessionTime(next) + " · Online";
    register.href = next.registrationLink;
    register.textContent = "Register for this session";
    target = next.startTimeMillis;
    countdown.hidden = !target;
    tick();
  }

  function tick() {
    if (!target) return;
    if (target <= Date.now()) {
      renderSessions();
      return;
    }
    var seconds = Math.floor((target - Date.now()) / 1000);
    [Math.floor(seconds / 86400), Math.floor(seconds % 86400 / 3600),
      Math.floor(seconds % 3600 / 60), seconds % 60].forEach(function (value, index) {
      document.getElementById(["cd-d", "cd-h", "cd-m", "cd-s"][index]).textContent = String(value).padStart(2, "0");
    });
  }

  async function loadSessions() {
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 15000);
    try {
      var response = await fetch(feedUrl, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("Session feed unavailable");
      var data = await response.json();
      if (!Array.isArray(data.sessions)) throw new Error("Invalid session feed");
      sessions = data.sessions.map(function (session) {
        if (!session || typeof session !== "object") return null;
        try {
          var url = new URL(session.registrationLink);
          if (url.protocol !== "https:") return null;
          var millis = Number(session.startTimeMillis);
          return {
            topic: typeof session.topic === "string" ? session.topic : "Highclere Helps",
            hostId: normalizeHostId(session.hostId),
            hostEmail: typeof session.hostEmail === "string" ? session.hostEmail.trim() || null : null,
            startTime: typeof session.startTime === "string" ? session.startTime : "",
            startTimeMillis: Number.isFinite(millis) && millis > 0 ? millis : null,
            registrationLink: url.href
          };
        } catch (error) { return null; }
      }).filter(Boolean).sort(function (a, b) {
        return (a.startTimeMillis || Infinity) - (b.startTimeMillis || Infinity);
      });
      renderSessions();
    } catch (error) {
      // Retain previously loaded, still-upcoming sessions during a temporary outage.
      if (sessions.some(function (session) { return !session.startTimeMillis || session.startTimeMillis > Date.now(); })) {
        renderSessions();
      } else {
        showMessage("Session dates unavailable", "We couldn't load session dates. Please try again later or contact Adam.");
      }
    } finally {
      clearTimeout(timeout);
      list.setAttribute("aria-busy", "false");
    }
  }

  loadSessions();
  setInterval(tick, 1000);
  setInterval(loadSessions, 5 * 60 * 1000);
})();
