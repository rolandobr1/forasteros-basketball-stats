
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon } from '../utils';

const GoBackButton: React.FC = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1); // Go back to the previous page in history
  };

  return (
    <button
      onClick={handleGoBack}
      className="flex items-center text-white p-2 rounded-full bg-brand-surface hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-accent shadow-md"
      aria-label="Volver a la página anterior"
    >
      <ChevronLeftIcon className="w-5 h-5 mr-1" />
    </button>
  );
};

export default GoBackButton;
