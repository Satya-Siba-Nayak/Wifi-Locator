import React from 'react';

const CompassIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2m9-9h-2M5 12H3m14.243-7.243l-1.414 1.414M6.172 17.828l-1.414 1.414m13.07-1.414l-1.414-1.414M7.586 6.172L6.172 7.586" />
        <path fill="currentColor" d="M12 13l3-4-3-4-3 4 3 4z" />
    </svg>
);

export default CompassIcon;
