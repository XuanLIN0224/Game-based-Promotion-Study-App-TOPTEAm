/*There are three main functions in the Setting page:
 1. Change username and email
 2. Change password--basically the same process as resetting password
 3. Log out and redirect to log-in page
 */

import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api, clearToken } from "../api/client";

const BASE = import.meta.env.BASE_URL || '/';

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

  //const password = "**********";    // Not shown directly for security

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
  const [showPassword, setShowPassword] = useState(false);  // Enable the feature of showing passwords typed in by the user
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
    if (!value) { setErr("Username cannot be empty"); return; }
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
    if (!/^\S+@\S+\.\S+$/.test(value)) { setErr("Please enter a valid email"); return; }
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
    if (!oldPwd || !newPwd || !newConfirmPwd) { setErr("Please enter valid passwords"); return; }
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
      setErr("Failed to logout. Please try again");
    }
  }

  // For styling


  /** UI Part */
  return (
    <section className="page page-settings">


      {/* ② page-scoped CSS (affects only elements inside .page-settings) */}
            <style>{`
              /* General Font */
              .page-settings h1{ font-size: 48px; line-height: 1.2; }
              .page-settings p{ font-size: 22px; }
              /* Line spacing */
              .page-settings li {
                line-height: 2;
              }

              .user-info{
                display: grid;
                gap: 8px;
                max-width: 640px;
              }

              /* Each row becomes a 2-column grid: label/value | button */
              .user-info > div{
                display: grid;
                grid-template-columns: 1fr max-content; /* left fills, right hugs */
                align-items: center;
                column-gap: 12px;
                /* optional: stop children from stretching horizontally */
                justify-items: start;
              }


              /* Buttons */
              .page-settings .btn {
                  /* STOP stretching (works in grid or flex parents) */
                  justify-self: start;         /* grid: align to start, don't stretch */
                  flex: 0 0 auto;              /* flex: don't grow/shrink */

                  /* Compact, content-based box */
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  width: max-content;          /* <-- key: hug text in grid/flex */
                  white-space: nowrap;         /* keep label on one line */
                  line-height: 1;              /* tighter height */
                  padding: 2px 8px;            /* smaller frame */
                  min-height: 0;               /* remove tall constraint */

                  /* Visuals */
                  font-size: 1.2em;            /* keep or tweak */
                  font-weight: 600;
                  font-family: "SuperShiny", sans-serif;
                  background: #c0e5d6;
                  color: #888;
                  border: 1px solid rgba(0,0,0,.18);
                  border-radius: 6px;

                  /* spacing */
                  margin-right: 30px;
              }
              .page-settings .btn:hover { filter:brightness(0.98); }
              .page-settings .btn:focus-visible { outline:2px solid #111; outline-offset:2px; }

              /* Buttons with strong/primary action (e.g., "Log out") */
              .page-settings .btn.primary { background:#3c97b5; color:#fff; }
              .page-settings .btn.primary:hover { opacity:.95; }



              /* Text (aligned with the css from the home page) */
              /* Text in View Mode */
              .line {
                font-family: "SuperShiny", sans-serif;
                margin: 0 0 0 0;
                font-size: 1.8em;
              }

              /* Text in Edit Mode */
              .line_hide {
                /* try */
                display: flex;
                align-items: center;
                flex-wrap: wrap;    /* allow wrapping when space is tight */
                font-family: "SuperShiny", sans-serif;
                margin: 0 0 0 0;
                font-size: 1.5em;
                color: #9dc9b7;
              }

              .page-settings .line_hide input{
                flex: 0 0 auto;
                justify-self: start;
                font-size: 1rem;
                width: 600px;
                justify-self: start;
              }

              /* Checkbox */
              .page-settings .line_hide input[type="checkbox"] {
                width: auto !important;
                flex: 0 0 auto !important;
                margin: 0;
                transform: scale(1.3);
                accent-color: #3c97b5;
              }

              .page-settings .checkbox-row {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                white-space: nowrap;
              }

              /* Text navigating to the home page */
              .line_nev_back {
                font-family: "SuperShiny", sans-serif;
                margin: 0 0 0 0;
                font-size: 1.5em;
                color: #3c97b5;
              }

              /* Text popping up as a successful message */
              .line_msg {
                /* Text styles */
                font-family: "SuperShiny", sans-serif;
                margin: 0;
                font-size: 1.4em;
                color: #8cf72f;

                /* Let the frame hug the text instead of full width */
                display: inline-block;
                width: fit-content;

                /* Frame */
                padding: 8px 12px;
                border: 2px solid #8cf72f;  /* the “frame” */
                border-radius: 10px;    /* rounded corners */
                background: rgba(140, 247, 47, 0.08);   /* subtle glow behind text */
              }
              /* Text popping up as a warning message */
              .line_err {
                font-family: "SuperShiny", sans-serif;
                margin: 0 0 0 0;
                font-size: 1.4em;
                color: #ff6e42;

                display: inline-block;
                width: fit-content;

                padding: 8px 12px;
                border: 2px solid #ff6e42;
                border-radius: 10px;
                background: rgba(140, 247, 47, 0.08);
              }


              /* Mobile View Adjustment */
              @media (max-width: 650px){
                /* let buttons size to their content */
                .page-settings p{ font-size: 15px; }
                .page-settings .btn{
                  font-size: 15px;
                  width: fit-content;
                  justify-self: start;    /* prevent grid from stretching this item */
                }

                /* Solve the problem of out-side width when editing */
                  .page-settings .user-info{
                    max-width: 360px !important;
                    width: 80%;
                    margin: 0 auto;
                    justify-items: start;
                  }

                  .page-settings .line_hide{
                    /* Set spacing between elements */
                    font-size: 15.5px;
                    gap: 8px 6px;
                  }

                  /* Let the label ("username/email" in our case) on its own line--above the input box */
                  .page-settings .line_hide label{
                    flex: 0 0 100%;
                  }

                  /* Let the input box be full width on its own line */
                  .page-settings .line_hide input{
                    flex: 0 0 80%;
                  }

                  /* Let the checkbox be smaller */
                  .page-settings .line_hide input[type="checkbox"] {
                     transform: scale(1.1); /* smaller checkbox on phones */
                  }

              }

            `}</style>

      {/* Left side nav */}
      <div className="leftside">
        <div className="pagelinkicon" onClick={() => navigate("/")}>
          <img src={`${BASE}icons/home/home.png` || `${BASE}icons/default/home.png`} className="icon" alt="Home" />
          <p className="iconcaption">Home</p>
        </div>
      </div>


      <h1
        style={{
          fontSize: 50,
          margin: "0 0 16px",   // 16px below
          lineHeight: 4,
          textAlign: "center"
        }}
      >
        Settings
      </h1>


      {loading ? (
        <p className="line_nev_back">Loading...</p>
      ) : (
        <>
          {err && <div className="line_err" style={{ maxWidth: 520 }}>{err}</div>}
          {msg && <div className="line_msg" style={{ maxWidth: 520 }}>{msg}</div>}

          <div className="user-info">
            {/* Username row */}
            {!editingUsername ? (
              // C1: "editingUsername == false"--display the username--View MODE
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Display the user's username */}
                <p className="line" style={{ margin: 0 }}><strong>User Name:</strong> {username}</p>
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
              <form className="line_hide" onSubmit={saveUsername} style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                <p className="line" style={{ margin: 0 }}><strong>Email:</strong> {email}</p>
                <button
                  className="btn"
                  onClick={() => { setEmailInput(email || ""); setEditingEmail(true); }}
                >
                  Edit
                </button>
              </div>
            ) : (
              <form className="line_hide" onSubmit={saveEmail} style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
            <p className="line"><strong>Group:</strong> {group}</p>
            <p className="line"><strong>Breed:</strong> {breed}</p>
            <p className="line"><strong>Join Date:</strong> {createdAt ? new Date(createdAt).toLocaleString() : "-"}</p>
            <p className="line"><strong>Last Update Date:</strong> {updatedAt ? new Date(updatedAt).toLocaleString() : "-"}</p>
            <p className="line"><strong>Total Score:</strong> {score}</p>
            <p className="line"><strong>Total Assets:</strong> {asset}</p>


            {/* Password row */}
            {!performReset ? (
              // C1: "performReset == false" -- View MODE
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Display masked password */}
                <p className="line" style={{ margin: 0 }}><strong>Password:</strong> ••••••••</p>
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
              <form className = "line_hide" onSubmit={resetPassword} style={{ display: "flex", gap: 8, maxWidth: 400 }}>
                <label htmlFor="oldPassword"><strong>Old Password:</strong></label>
                <input
                  id="oldPassword"
                  type={showPassword ? "text":"password"}
                  value={oldPassword}
                  onChange={(e) => {setOldPassword(e.target.value); setErr(""); setMsg(""); }}
                  disabled={busyField === "password"}
                />

                <label htmlFor="newPassword"><strong>New Password:</strong></label>
                  <input
                    id="newPassword"
                    type={showPassword ? "text":"password"}
                    value={newPassword}
                    onChange={(e) => {setNewPassword(e.target.value); setErr(""); setMsg(""); }}
                    disabled={busyField === "password"}
                  />

                <label htmlFor="newConfirmPassword"><strong>Confirm New Password:</strong></label>
                  <input
                    id="newConfirmPassword"
                    type={showPassword ? "text":"password"}
                    value={newConfirmPassword}
                    onChange={(e) => {setNewConfirmPassword(e.target.value); setErr(""); setMsg(""); }}
                    disabled={busyField === "password"}
                  />

                  {/* Show password row (separate class, NOT line_hide) */}
                  <div className="checkbox-row">
                    <input
                      id="showPwd"
                      type="checkbox"
                      checked={showPassword}
                      onChange={(e) => setShowPassword(e.target.checked)}
                    />
                    <label htmlFor="showPwd" className="no-wrap" style={{ color: "#3c97b5", fontWeight: 600 }}>
                      Show password
                    </label>
                  </div>


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
                      setErr(""); setMsg("");
                    }}
                    disabled={busyField === "password"}
                  >
                    Cancel
                  </button>
                </div>

                {/* Forget password link */}
                <Link to="/forgot" className="text-sm" style={{ color: "#3c97b5" }}>
                Forgot password?
                </Link>

              </form>
            )}



            {/* Logout */}
            <button className="btn primary" onClick={handleLogout} style={{marginTop: 30, minWidth: 300}}>
              <p className="line" ><strong>Log out</strong></p>
            </button>

          </div>
        </>
      )}
    </section>
  );
}
