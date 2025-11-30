import React from 'react';
import { AppTab } from '../types';

interface LayoutProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ activeTab, setActiveTab, children }) => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* Sidebar Navigation for larger screens, Bottom Navigation for smaller screens */}
      <nav className="bg-blue-800 text-white p-4 md:w-64 md:flex-shrink-0 md:min-h-screen fixed bottom-0 left-0 right-0 md:static">
        <div className="hidden md:block text-2xl font-bold mb-6">Smart School</div>
        <ul className="flex justify-around md:flex-col md:space-y-4">
          {Object.values(AppTab).map((tab) => (
            <li key={tab}>
              <button
                onClick={() => setActiveTab(tab)}
                className={`w-full px-4 py-2 rounded-lg text-sm md:text-base transition-colors duration-200
                  ${activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-blue-700 hover:text-gray-100'}`}
              >
                {tab}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow p-4 md:p-8 pt-16 md:pt-8 mb-16 md:mb-0">
        <h1 className="text-3xl font-extrabold text-gray-800 mb-6 md:mb-8 text-center md:text-left">
          {activeTab}
        </h1>
        <div className="bg-white rounded-lg shadow-xl p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;