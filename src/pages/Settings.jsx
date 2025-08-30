import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../api/client";

export const LABELS = {
  user_name: { title: "User Name", prop: "Could be reset (countless times allowed)" },
  group: { title: "Group", prop: "Could not be changed" },
  join_date: { title: "Join Date", prop: "Could not be reset, done automatically" },
  last_detail_update_date: { title: "Last Update Date", prop: "Could not be reset, done automatically" },
  password: { title: "Password", prop: "Could be reset (countless times allowed), need to re-enter the correct old password?" },
  score: { title: "Total Point/Score", prop: "Could not be reset, done automatically" },
  asset: { title: "Total Assets", prop: "Could not be reset, done automatically" },
  setting: { title: "Setting Preference", prop: "Could be reset (countless times allowed)" }
};

export default function Settings() {
  const navigate = useNavigate();

  // profile data
  const [username, setUsername] = useState(null);
  const [email, setEmail] = useState("");

  const [createdAt, setCreatedAt] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [score, setScore] = useState(0);
  const [asset, setAsset] = useState(0);
  const [breed, setBreed] = useState("");
  const [group, setGroup] = useState("");

  // edit state
  const [editingUsername, setEditingUsername] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");

  // ui state
  const [busyField, setBusyField] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = await api("/auth/me");
        setUsername(me.username || "");
        setEmail(me.email || "");
        setCreatedAt(me.createdAt || null);
        setUpdatedAt(me.updatedAt || null);
        setGroup(me.group || "");
        setBreed(me.breed?.name || "");
        setScore(me.score || 0);
        setAsset(me.numPetFood || 0); // or me.asset if backend sends it
      } catch (e) {
        setErr("Failed to load user data");
        console.error("Load user failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // PATCH helper
  async function updateUser(field, value) {
    const result = await api("/setting/me", {
      method: "PATCH",
      body: { [field]: value },
    });
    return result;
  }

  // handlers
  async function saveUsername(e) {
    e.preventDefault();
    setErr(""); setMsg("");
    const value = (usernameInput ?? "").trim();
    if (!value) { setErr("Username cannot be empty."); return; }
    setBusyField("username");
    try {
      await updateUser("username", value);
      setUsername(value);
      setEditingUsername(false);
      setMsg("Username updated successfully!");
    } catch (e) {
      setErr(e.message || "Failed to update username");
    } finally {
      setBusyField("");
    }
  }

  async function saveEmail(e) {
    e.preventDefault();
    setErr(""); setMsg("");
    const value = (emailInput ?? "").trim();
    // very light email check
    if (!/^\S+@\S+\.\S+$/.test(value)) { setErr("Please enter a valid email."); return; }
    setBusyField("email");
    try {
      await updateUser("email", value);
      setEmail(value);
      setEditingEmail(false);
      setMsg("Email updated successfully!");
    } catch (e) {
      setErr(e.message || "Failed to update email");
    } finally {
      setBusyField("");
    }
  }

  return (
    <section className="page">
      {/* Left side nav */}
      <div className="leftside">
        <div className="pagelinkicon" onClick={() => navigate("/")}>
          <img src="/icons/home.png" className="icon" alt="Home" />
          <p className="iconcaption">Home</p>
        </div>
      </div>

      <h1>Settings</h1>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {err && <div className="auth-error" style={{ maxWidth: 520 }}>{err}</div>}
          {msg && <div className="auth-success" style={{ maxWidth: 520, color: "limegreen" }}>{msg}</div>}

          <div className="user-info" style={{ display: "grid", gap: 8, maxWidth: 640 }}>
            {/* Username row */}
            {!editingUsername ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <p style={{ margin: 0 }}><strong>User Name:</strong> {username}</p>
                <button
                  className="btn"
                  onClick={() => { setUsernameInput(username || ""); setEditingUsername(true); }}
                >
                  Edit
                </button>
              </div>
            ) : (
              <form onSubmit={saveUsername} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label htmlFor="username" style={{ minWidth: 100 }}><strong>User Name:</strong></label>
                <input
                  id="username"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  disabled={busyField === "username"}
                />
                <button className="btn primary" disabled={busyField === "username"}>
                  {busyField === "username" ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => { setEditingUsername(false); setUsernameInput(username || ""); }}
                  disabled={busyField === "username"}
                >
                  Cancel
                </button>
              </form>
            )}

            {/* Email row */}
            {!editingEmail ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <p style={{ margin: 0 }}><strong>Email:</strong> {email}</p>
                <button
                  className="btn"
                  onClick={() => { setEmailInput(email || ""); setEditingEmail(true); }}
                >
                  Edit
                </button>
              </div>
            ) : (
              <form onSubmit={saveEmail} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label htmlFor="email" style={{ minWidth: 100 }}><strong>Email:</strong></label>
                <input
                  id="email"
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  disabled={busyField === "email"}
                />
                <button className="btn primary" disabled={busyField === "email"}>
                  {busyField === "email" ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => { setEditingEmail(false); setEmailInput(email || ""); }}
                  disabled={busyField === "email"}
                >
                  Cancel
                </button>
              </form>
            )}

            {/* Read-only fields */}
            <p><strong>Group:</strong> {group}</p>
            <p><strong>Breed:</strong> {breed}</p>
            <p><strong>Join Date:</strong> {createdAt ? new Date(createdAt).toLocaleString() : "-"}</p>
            <p><strong>Last Update Date:</strong> {updatedAt ? new Date(updatedAt).toLocaleString() : "-"}</p>
            <p><strong>Total Score:</strong> {score}</p>
            <p><strong>Total Assets:</strong> {asset}</p>
          </div>
        </>
      )}
    </section>
  );
}
