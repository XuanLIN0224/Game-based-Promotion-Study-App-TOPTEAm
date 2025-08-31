/*There are three main functions in the Setting page:
 1. Change username and email
 2. Change password--basically the same process as resetting password
 3. Log out and redirect to log-in page
 */

import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api, clearToken } from "../api/client";


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

  // User info
  const [username, setUsername] = useState(null);
  const [email, setEmail] = useState("");

  const password = "**********";    // Not shown directly for security

  const [createdAt, setCreatedAt] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [score, setScore] = useState(0);
  const [asset, setAsset] = useState(0);
  const [breed, setBreed] = useState("");
  const [group, setGroup] = useState("");

  // Editing states
  // FUNC 1:
  const [editingUsername, setEditingUsername] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  // FUNC 2:
  const [performReset, setPerformReset] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newConfirmPassword, setNewConfirmPassword] = useState("");

  // UI states
  const [busyField, setBusyField] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");   // Active message shown on the UI
  const [loading, setLoading] = useState(true);

  // Read in the user info from the backend
  useEffect(() => {
    (async () => {
      try {
        const me = await api("/auth/me");
        setUsername(me.username || null);
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

  /* PATCH helper--send request to the backend and update personal info */
  // For personal info update
  async function updateUser(field, value) {
    return api("/setting/me", {
      method: "PATCH",
      body: { [field]: value },
    });
  }
  // For password update
  async function updatePassword(oldPwd, newPwd, newConfirmPwd) {
    return api("/setting/password", {
      method: "PATCH",
      body: { oldPassword: oldPwd, newPassword: newPwd, newConfirmPassword: newConfirmPwd },
    });
  }

  /* Handlers */
  /* Handle username update */
  async function saveUsername(e) {
    // Stop the browser from reloading the page
    e.preventDefault();
    setErr(""); setMsg("");
    // Read in the username
    const value = (usernameInput ?? "").trim();
    if (!value) { setErr("Username cannot be empty."); return; }
    // Tell the UI the user personal info--username field is updating
    setBusyField("username");
    try {
      // Update the backend
      await updateUser("username", value);
      // Update username shown on the UI
      setUsername(value);
      // Switch the status to false--not editing
      setEditingUsername(false);
      setMsg("Username updated successfully!");
    } catch (e) {
      setErr(e.message || "Failed to update username");
    } finally {
      setBusyField("");
    }
  }

  /* Handle email update */
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

  /* Handle password update */
  async function resetPassword(e) {
    e.preventDefault();
    // Read in three passwords given by the user
    const oldPwd = (oldPassword ?? "").trim();
    const newPwd = (newPassword ?? "").trim();
    const newConfirmPwd = (newConfirmPassword ?? "").trim();
    // Tell the UI the password field is updating
    setBusyField("password");
    try {
      // Update the backend
      const result = await updatePassword(oldPwd, newPwd, newConfirmPwd);
      // Switch status
      setPerformReset(false);
      setMsg(result.message);
      setOldPassword("");
      setNewPassword("");
      setNewConfirmPassword("");
    } catch (e) {
      setErr(e.message || "Failed to reset password");
    } finally {
      setBusyField("");
    }
  }

  // FUNC 3:
  /* Handle log-out */
  async function handleLogout() {
    try {
      await api("/auth/logout", { method: "POST" });

      // Remove the current token
      clearToken();

      // We are not using cookie--no need to clean

      // Clear the info on the page
      setUsername(null);
      setEmail(null);
      setCreatedAt(null);
      setUpdatedAt(null);
      setGroup(null);
      setBreed(null);
      setScore(null);
      setAsset(null);

      // Navigate back to login
      console.log("HERE--reach");
      navigate("/auth/Login");
    } catch (err) {
      console.error("Logout failed:", err);
      setErr("Failed to logout. Please try again.");
    }
  }


  /** UI Part */
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
              // C1: "editingUsername == false"--display the username--View MODE
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Display the user's username */}
                <p style={{ margin: 0 }}><strong>User Name:</strong> {username}</p>
                {/* if the button "Change" is hit, switch to the Edit MODE */}
                <button
                  className="btn"
                  onClick={() => { setUsernameInput(username || ""); setEditingUsername(true); }}
                >
                  Edit
                </button>
              </div>
            ) : (
              // C2: "editingUsername == true"--allow editing--Edit MODE
              // <form> here: When the user clicks "Save" or presses Enter, call my saveUsername function
              <form onSubmit={saveUsername} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label htmlFor="username" style={{ minWidth: 100 }}><strong>User Name:</strong></label>
                {/* Expected input */}
                <input
                  id="username"
                  value={usernameInput}
                  // Auto-update during user typing-in
                  onChange={(e) => setUsernameInput(e.target.value)}
                  // While “saving”, disable the input so the user can’t change it mid-save
                  disabled={busyField === "username"}
                />
                {/* the "Save" button */}
                <button className="btn primary" disabled={busyField === "username"}>
                  {busyField === "username" ? "Saving…" : "Save"}
                </button>
                {/* the "Cancel" button */}
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


            {/* Password row */}
            {!performReset ? (
              // C1: "performReset == false" -- View MODE
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Display masked password */}
                <p style={{ margin: 0 }}><strong>Password:</strong> ••••••••</p>
                {/* if the button "Change" is hit, switch to the Edit MODE*/}
                <button
                  className="btn"
                  onClick={() => {
                    setOldPassword("");
                    setNewPassword("");
                    setNewConfirmPassword("");
                    setPerformReset(true);
                  }}
                >
                  Change
                </button>
              </div>
            ) : (
              // C2: "editingPassword == true" -- Edit MODE
              <form onSubmit={resetPassword} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 400 }}>
                <label htmlFor="oldPassword"><strong>Old Password:</strong></label>
                <input
                  id="oldPassword"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  disabled={busyField === "password"}
                />

                <label htmlFor="newPassword"><strong>New Password:</strong></label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={busyField === "password"}
                />

                <label htmlFor="newConfirmPassword"><strong>Confirm New Password:</strong></label>
                <input
                  id="newConfirmPassword"
                  type="password"
                  value={newConfirmPassword}
                  onChange={(e) => setNewConfirmPassword(e.target.value)}
                  disabled={busyField === "password"}
                />

                <div style={{ display: "flex", gap: 8 }}>
                  {/* Save button */}
                  <button className="btn primary" disabled={busyField === "password"}>
                    {busyField === "password" ? "Saving…" : "Save"}
                  </button>
                  {/* Cancel button */}
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setPerformReset(false);
                      setOldPassword("");
                      setNewPassword("");
                      setNewConfirmPassword("");
                    }}
                    disabled={busyField === "password"}
                  >
                    Cancel
                  </button>
                </div>

                {/* Forget password link */}
                <Link to="/forgot" className="text-sm" style={{ color: "#2563eb" }}>
                Forgot password?
                </Link>

              </form>
            )}



            {/* Logout */}
            <button className="btn primary" onClick={handleLogout}>
              <p><strong>Log out</strong></p>
            </button>

          </div>
        </>
      )}
    </section>
  );
}
