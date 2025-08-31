/* Start point of the React */
import { BrowserRouter, Routes, Route, NavLink, Navigate, Outlet } from 'react-router-dom';
import Home from './pages/Home';
import Game from './pages/Game';
import Backpack from './pages/Backpack';
import Scan from './pages/Scan';
import Rank from './pages/Rank';
import Settings from './pages/Settings';
import Quiz from './pages/Quiz';
import Shop from './pages/Shop';
import Customise from './pages/Customise';
import StarBackground from "./background/StarBackground";
// import './styles.css';

// Auth pages
import Login from './pages/auth/Login';
import RegisterStep1 from './pages/auth/RegisterStep1';
import RegisterStep2 from './pages/auth/RegisterStep2';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Guard: require token to access app routes
// Support auto-log-in
function RequireAuth() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}

function NavBar() {
  return (
    <nav className="nav">
      <NavLink to="/">Home</NavLink>
      <NavLink to="/game">Game</NavLink>
      <NavLink to="/backpack">Backpack</NavLink>
      <NavLink to="/scan">Scan</NavLink>
      <NavLink to="/rank">Rank</NavLink>
      <NavLink to="/quiz">Quiz</NavLink>
      <NavLink to="/shop">Shop</NavLink>
      <NavLink to="/customise">Customise</NavLink>
      <NavLink to="/settings">Settings</NavLink>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter basename="/Game-based-Promotion-Study-App-TOPTEAm">
      {/* <NavBar /> */}
      <div className="app">
        <StarBackground count={120} /> 
        <main className='page'>
          <Routes>
            {/* Public auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register/step1" element={<RegisterStep1 />} />
            <Route path="/register/step2" element={<RegisterStep2 />} />
            <Route path="/forgot" element={<ForgotPassword />} />
            <Route path="/reset" element={<ResetPassword />} />

            {/* Protected app routes */}
            <Route element={<RequireAuth />}>
              <Route index element={<Home />} />
              <Route path="game" element={<Game />} />
              <Route path="backpack" element={<Backpack />} />
              <Route path="scan" element={<Scan />} />
              <Route path="rank" element={<Rank />} />
              <Route path="quiz" element={<Quiz />} />
              <Route path="shop" element={<Shop />} />
              <Route path="customise" element={<Customise />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <footer className='footer'>
          <small>© 2025 TOPTEAm</small>
        </footer>
      </div>
    </BrowserRouter>
  );
}


export default App
