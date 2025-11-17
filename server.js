const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// 🎯 ======================
// DATA SESSION
// 🎯 ======================
let SESSION = {
  id: uuidv4(),
  groups: [],
  usedStudents: [] // daftar id mahasiswa yang sudah join
};

// 🎯 Ambil data session
app.get("/api/session", (req, res) => {
  res.json(SESSION);
});

// 🎯 User join kelompok
app.post("/api/join", (req, res) => {
  const { name, groupId, studentId } = req.body;

  if (!name || !groupId || !studentId) {
    return res.status(400).json({ error: "Nama, groupId, dan studentId wajib diisi" });
  }

  // ❌ Student sudah pernah join
  if (SESSION.usedStudents.includes(studentId)) {
    return res.status(400).json({ error: "Anda sudah memilih kelompok. Tidak bisa memilih lagi." });
  }

  const group = SESSION.groups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ error: "Kelompok tidak ditemukan" });

  // ❌ Cek nama tidak boleh duplikat dalam semua kelompok
  const nameExists = SESSION.groups.some(g =>
    g.members.some(m => m.name.toLowerCase() === name.toLowerCase())
  );

  if (nameExists) {
    return res.status(400).json({ error: "Nama ini sudah digunakan. Harap gunakan nama asli Anda." });
  }

  // ❌ kelompok penuh
  if (group.members.length >= group.capacity) {
    return res.status(400).json({ error: "Kelompok penuh" });
  }

  // Tambahkan ke kelompok
  group.members.push({
    id: uuidv4(),
    name,
    studentId
  });

  // Simpan studentId agar tidak bisa join lagi
  SESSION.usedStudents.push(studentId);

  io.emit("session_update", SESSION);
  res.json({ success: true });
});

// 🎯 Admin create session
app.post("/api/create-session", (req, res) => {
  const { groupCount, capacity } = req.body;

  SESSION = {
    id: uuidv4(),
    usedStudents: [],
    groups: []
  };

  for (let i = 1; i <= groupCount; i++) {
    SESSION.groups.push({
      id: uuidv4(),
      name: `Kelompok ${i}`,
      capacity,
      members: []
    });
  }

  io.emit("session_update", SESSION);
  res.json(SESSION);
});

// 🎯 Admin update settings
app.post("/api/update-settings", (req, res) => {
  const { groupCount, capacity } = req.body;

  const newGroups = [];
  for (let i = 0; i < groupCount; i++) {
    if (SESSION.groups[i]) {
      const g = SESSION.groups[i];
      if (g.members.length > capacity) {
        g.members = g.members.slice(0, capacity);
      }
      newGroups.push({ ...g, capacity });
    } else {
      newGroups.push({
        id: uuidv4(),
        name: `Kelompok ${i+1}`,
        capacity,
        members: []
      });
    }
  }

  SESSION.groups = newGroups;
  io.emit("session_update", SESSION);
  res.json(SESSION);
});

// 🎯 Reset semua
app.post("/api/reset-members", (req, res) => {
  SESSION.groups.forEach(g => (g.members = []));
  SESSION.usedStudents = [];
  io.emit("session_update", SESSION);

  res.json({ success: true });
});

// 🎯 Admin hapus anggota
app.post("/api/remove-member", (req, res) => {
  const { groupId, memberId } = req.body;

  const group = SESSION.groups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ error: "Kelompok tidak ditemukan" });

  const member = group.members.find(m => m.id === memberId);
  if (member) {
    SESSION.usedStudents = SESSION.usedStudents.filter(id => id !== member.studentId);
  }

  group.members = group.members.filter(m => m.id !== memberId);

  io.emit("session_update", SESSION);
  res.json({ success: true });
});

// 🎯 Static Files (folder client)
app.use(express.static(path.join(__dirname, "client")));

const PORT = process.env.PORT || 8000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server berjalan di port ${PORT}`);
});
