import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

// Firebase web configuration is public. Database rules control data access.
const app = initializeApp({
  apiKey: "AIzaSyAYh_7B1J8ziQKAaaI3DnSGXx3JvRnLDmw",
  authDomain: "vidyalaya-one-app.firebaseapp.com",
  databaseURL: "https://vidyalaya-one-app-default-rtdb.firebaseio.com",
  projectId: "vidyalaya-one-app",
  storageBucket: "vidyalaya-one-app.firebasestorage.app",
  messagingSenderId: "291644979696",
  appId: "1:291644979696:web:7b72faa797d4f6515c0535"
});
const grid = document.querySelector(".grid");
const fallback = grid.innerHTML;

function renderApplications(value) {
  const entries = value && typeof value === "object" ? Object.values(value) : [];
  const fragment = document.createDocumentFragment();
  for (let entry of entries) {
    if (!entry || typeof entry.title !== "string" || !entry.title.trim() ||
        typeof entry.note !== "string" || typeof entry.url !== "string") continue;
    // Keep the implemented CBSE workspace accessible if an older catalogue still
    // contains its original Coming soon entry.
    if (entry.title === "CBSE BOARD EXAMINATION — PROGRESS MONITORING" || /cbse-mission\.html(?:[?#]|$)/.test(entry.url) || /^mission perfect 100/i.test(entry.title)) {
      entry = {...entry, title: "Mission Perfect 100", url: new URL("cbse-mission.html", location.href).href,
        status: "STUDENTS & TEACHERS", action: "Open Mission Perfect 100"};
    }
    const placeholder = entry.url === "#";
    if (!placeholder) {
      try { if (new URL(entry.url).protocol !== "https:") continue; }
      catch { continue; }
    }
    const card = document.createElement("a");
    card.className = "app-card";
    card.href = entry.url;
    if (placeholder) card.dataset.app = "pending";
    else { card.target = "_blank"; card.rel = "noopener noreferrer"; }
    const top = document.createElement("div"); top.className = "card-top";
    const icon = document.createElement("div"); icon.className = "app-icon";
    icon.setAttribute("aria-hidden", "true"); icon.textContent = entry.icon || "▤";
    const status = document.createElement("span");
    status.className = placeholder ? "status progress" : "status";
    status.textContent = entry.status || (placeholder ? "IN PROGRESS" : "APPLICATION AVAILABLE");
    top.append(icon, status);
    const title = document.createElement("h3"); title.textContent = entry.title;
    const note = document.createElement("p"); note.textContent = entry.note;
    const action = document.createElement("div");
    action.className = placeholder ? "card-action disabled" : "card-action";
    action.textContent = entry.action || (placeholder ? "Coming soon" : "Open application");
    const arrow = document.createElement("span"); arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = placeholder ? "→" : "↗";
    action.append(arrow);
    card.append(top, title, note, action);
    fragment.append(card);
  }
  if (fragment.childNodes.length) grid.replaceChildren(fragment);
  else grid.innerHTML = fallback;
}

onValue(ref(getDatabase(app), "portal/applications"), snapshot => {
  renderApplications(snapshot.val());
}, error => {
  // Preserve the bundled cards when access is locked or connectivity fails.
  console.warn("Live application updates unavailable; showing the bundled portal.", error.code);
});
