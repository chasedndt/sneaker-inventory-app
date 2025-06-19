import React from 'react';
import { Link } from 'react-router-dom';

interface UpgradeOverlayProps {
  text: string;
  ctaText?: string;
  ctaLink?: string;
}

const UpgradeOverlay: React.FC<UpgradeOverlayProps> = ({ 
  text,
  ctaText = 'Upgrade Plan',
  ctaLink = '/settings?section=billing'
}) => {
  return (
    <div className="absolute inset-0 bg-gray-800 bg-opacity-75 flex flex-col items-center justify-center z-10 p-4 rounded-md">
      <p className="text-white text-lg font-semibold mb-4 text-center">{text}</p>
      <Link 
        to={ctaLink}
        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
      >
        {ctaText}
      </Link>
    </div>
  );
};

export default UpgradeOverlay;
