/**
 * This file defines the system's top-level React component, holding
 * the structure of the entire application.
 */

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
import Teacher from './pages/Teacher';
import TeacherEvents from './pages/TeacherEvents';
import TeacherQuizEditor from './pages/TeacherQuizEditor';
import StudentQuizArchive from './pages/StudentQuizArchive';
import TeacherSettings from './pages/TeacherSettings';
import TeacherQR from './pages/TeacherQR';
// import './styles.css';

// Auth pages
import Login from './pages/auth/Login';
import RegisterStep1 from './pages/auth/RegisterStep1';
import RegisterStep2 from './pages/auth/RegisterStep2';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';


// Global unifications
import './components/Button.css';
import './components/PageLinkIcon.css';

import { useEffect } from 'react';
import { setOnUnauthorized } from './api/client';
import { useNavigate } from 'react-router-dom';

function AuthEvents() {
  const nav = useNavigate();
  useEffect(() => {
    // 被 api() 捕获到 401 时的统一动作
    setOnUnauthorized(() => nav('/login', { replace: true }));

    // 多标签/跨组件广播的统一动作
    const h = () => nav('/login', { replace: true });
    window.addEventListener('auth:logout', h);

    return () => window.removeEventListener('auth:logout', h);
  }, [nav]);

  return null; // 不渲染任何 UI
}

// Guard: require token to access app routes
// Support auto-log-in
function RequireAuth() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}


function App() {
  return (
    <BrowserRouter basename="/Game-based-Promotion-Study-App-TOPTEAm">
      <AuthEvents /> 
      <div className="app">
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
              <Route path="teacher" element={<Teacher />} />
              <Route path="teacher/events" element={<TeacherEvents />} />
              <Route path="teacher/settings" element={<TeacherSettings />} />
              <Route path="/teacher/quizzes" element={<TeacherQuizEditor/>} />
              <Route path="/teacher/qr" element={<TeacherQR/>} />
              <Route path="/student/archive" element={<StudentQuizArchive/>} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <footer className='footer'>
          <p>© 2025 TOPTEAm</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}


export default App
