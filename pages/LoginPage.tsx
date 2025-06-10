
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TEAM_PLACEHOLDER_LOGO, APP_TITLE } from '../constants';
import { BasketballIcon } from '../utils'; // Or any other relevant icon

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const handleLogin = () => {
    // Simulate login and navigate to home
    navigate('/home'); // Updated to navigate to /home
  };

  return (
    <div className="min-h-[calc(100vh-150px)] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-brand-surface shadow-2xl rounded-xl p-8 space-y-6">
        <div className="flex flex-col items-center">
          <img 
            src={TEAM_PLACEHOLDER_LOGO} 
            alt="App Logo" 
            className="w-24 h-24 mb-4" 
          />
          <h2 className="text-3xl font-bold text-center text-white">{APP_TITLE}</h2>
          <p className="text-sm text-center text-brand-text-secondary mt-1"> Inicio de Sesión</p>
        </div>

        <div className="space-y-4">
          {/* You could add input fields here for a more realistic look,
              but for pure simulation, they are not functional. */}
          <div>
            <label htmlFor="username" className="sr-only">Usuario</label>
            <input 
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="Usuario"
              className="w-full px-4 py-2.5 rounded-md bg-slate-700 text-white border border-slate-600 focus:border-brand-accent focus:ring-brand-accent placeholder-slate-400 select-auto"
              
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">Contraseña</label>
            <input 
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Contraseña"
              className="w-full px-4 py-2.5 rounded-md bg-slate-700 text-white border border-slate-600 focus:border-brand-accent focus:ring-brand-accent placeholder-slate-400 select-auto"
              
            />
          </div>
        </div>
        
        <p className="text-xs text-center text-slate-400">
          Esta es una pantalla de inicio de sesión simulada.
          No se requiere usuario ni contraseña.
        </p>

        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center px-4 py-3 bg-brand-accent hover:bg-opacity-90 text-white font-semibold rounded-md shadow-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-opacity-75"
        >
                   Acceder a la Aplicación
        </button>
      </div>
    </div>
  );
};

export default LoginPage;