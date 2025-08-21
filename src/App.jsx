import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
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
    <BrowserRouter>
      {/* <NavBar /> */}
      <div className="app">
        <StarBackground count={120} /> 
        <main className='page'>
          <Routes>
            <Route index element={<Home />} />
            <Route path="game" element={<Game />} />
            <Route path="backpack" element={<Backpack />} />
            <Route path="scan" element={<Scan />} />
            <Route path="rank" element={<Rank />} />
            <Route path="quiz" element={<Quiz />} />
            <Route path="shop" element={<Shop />} />
            <Route path="customise" element={<Customise />} />
            <Route path="settings" element={<Settings />} />
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
