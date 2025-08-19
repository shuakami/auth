import React from 'react';

const LocalLoadingSpinner = () => {
  return (
    <div className="flex justify-center items-center p-8 min-h-[200px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  );
};

export default LocalLoadingSpinner;