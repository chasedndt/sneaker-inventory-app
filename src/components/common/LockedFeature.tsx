import React from 'react';
import { Link } from 'react-router-dom';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

interface LockedFeatureProps {
  title: string;
  description: string;
  ctaText?: string;
  ctaLink?: string;
}

const LockedFeature: React.FC<LockedFeatureProps> = ({ 
  title, 
  description, 
  ctaText = 'Upgrade Plan',
  ctaLink = '/settings?section=billing'
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-md">
      <LockOutlinedIcon sx={{ fontSize: '3rem', color: 'grey.500', mb: 2 }} />
      <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4 text-center">{title}</h2>
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 text-center max-w-md">
        {description}
      </p>
      <Link 
        to={ctaLink}
        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg text-lg transition duration-150 ease-in-out shadow-lg hover:shadow-xl transform hover:scale-105"
      >
        {ctaText}
      </Link>
    </div>
  );
};

export default LockedFeature;
