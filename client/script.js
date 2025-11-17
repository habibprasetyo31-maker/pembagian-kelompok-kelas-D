const socket = io();

// ===== CLIENT STATE =====
let studentId = localStorage.getItem("studentId");
if (!studentId) {
  studentId = "STD-" + Math.random().toString(36).substring(2, 10);
  localStorage.setItem("studentId", studentId);
}

const API = (url, data) => {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).then(res => res.json());
};

function showToast(msg, type = "info") {
  const container = document.getElementById("toast-container");
  const div = document.createElement("div");
  div.className = `toast ${type}`;
  div.innerText = msg;
  container.appendChild(div);
  setTimeout(() => div.remove(), 2500);
}

// ===============================
// RENDER GROUP LIST UNTUK USER
// ===============================
function renderGroupsUser(session) {
  const container = document.getElementById("groups");
  if (!container) return;

  container.innerHTML = "";

  session.groups.forEach(g => {
    const box = document.createElement("div");
    box.className = "group-box";

    let filled = g.members.length >= g.capacity;

    box.innerHTML = `
      <h3>${g.name}</h3>
      <p>${g.members.length} / ${g.capacity}</p>
      <button ${filled ? "disabled" : ""} data-id="${g.id}">
        ${filled ? "Penuh" : "Pilih"}
      </button>
    `;

    box.querySelector("button").onclick = () => joinGroup(g.id);
    container.appendChild(box);
  });
}

// ===============================
// JOIN GROUP
// ===============================
async function joinGroup(groupId) {
  const nameField = document.getElementById("name");
  const name = nameField.value.trim();

  if (!name) return showToast("Masukkan nama terlebih dahulu!", "error");

  const res = await API("/api/join", { name, groupId, studentId });

  if (res.error) return showToast(res.error, "error");

  showToast("Berhasil masuk kelompok!", "success");

  nameField.disabled = true;
}

// ===============================
// ADMIN PANEL (AUTO RENDER)
// ===============================
function renderGroupsAdmin(session) {
  const area = document.getElementById("admin_groups");
  if (!area) return;

  area.innerHTML = "";

  session.groups.forEach(g => {
    const div = document.createElement("div");
    div.className = "admin-group";

    let membersHTML = "";
    g.members.forEach(m => {
      membersHTML += `
        <li>
          ${m.name}
          <button onclick="removeMember('${g.id}', '${m.id}')">❌</button>
        </li>
      `;
    });

    div.innerHTML = `
      <h3>${g.name}</h3>
      <p>Kapasitas: ${g.capacity}</p>
      <ul>${membersHTML || "<i>Belum ada anggota</i>"}</ul>
    `;

    area.appendChild(div);
  });
}

async function removeMember(groupId, memberId) {
  await API("/api/remove-member", { groupId, memberId });
  showToast("Anggota dihapus", "info");
}

// ===============================
// LISTEN SOCKET
// ===============================
socket.on("session_update", session => {
  renderGroupsUser(session);
  renderGroupsAdmin(session);
});
