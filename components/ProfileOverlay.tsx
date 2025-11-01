import React, { useState } from 'react';
import CloseIcon from './icons/CloseIcon';
import UserIcon from './icons/UserIcon';

interface ProfileOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileOverlay: React.FC<ProfileOverlayProps> = ({ isOpen, onClose }) => {
  const [isLoginView, setIsLoginView] = useState(true);

  // Since this is a UI demo, form submissions will just log to console.
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log(`${isLoginView ? 'Logging in' : 'Signing up'}...`);
    onClose(); // Close overlay on submit for demo purposes
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-zinc-950/90 backdrop-blur-lg transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      aria-hidden={!isOpen}
    >
      <div className="relative w-full h-full">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
          aria-label="Close profile"
        >
          <CloseIcon />
        </button>
        <div className="flex flex-col items-center justify-start pt-24 md:pt-32 px-4">
          <div className="w-full max-w-sm">
            <div className="flex flex-col items-center mb-8">
              <div className="p-4 bg-zinc-800 border-2 border-zinc-700 rounded-full mb-4">
                  <UserIcon />
              </div>
              <h2 className="text-2xl font-bold text-zinc-100">Welcome Back</h2>
              <p className="text-zinc-400">Sign in or create an account to continue.</p>
            </div>
            
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 flex mb-6">
                <button 
                    onClick={() => setIsLoginView(true)}
                    className={`w-1/2 py-2 rounded-lg text-sm font-semibold transition-colors ${isLoginView ? 'bg-blue-600 text-white' : 'text-zinc-300 hover:bg-zinc-800'}`}
                >
                    Login
                </button>
                <button 
                    onClick={() => setIsLoginView(false)}
                    className={`w-1/2 py-2 rounded-lg text-sm font-semibold transition-colors ${!isLoginView ? 'bg-blue-600 text-white' : 'text-zinc-300 hover:bg-zinc-800'}`}
                >
                    Sign Up
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLoginView && (
                 <div>
                    <label htmlFor="name" className="text-sm font-medium text-zinc-400">Name</label>
                    <input
                        id="name"
                        type="text"
                        required
                        placeholder="John Doe"
                        className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                </div>
              )}
              <div>
                <label htmlFor="email" className="text-sm font-medium text-zinc-400">Email Address</label>
                <input
                    id="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
               <div>
                <label htmlFor="password" className="text-sm font-medium text-zinc-400">Password</label>
                <input
                    id="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 focus:ring-blue-500"
              >
                {isLoginView ? 'Login' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileOverlay;