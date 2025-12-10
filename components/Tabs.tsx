import React, { useState } from 'react';

interface Tab {
  label: string;
  icon: React.ReactNode;
  color: string;
}

interface TabsProps {
  tabs: Tab[];
  children: React.ReactNode[];
}

const Tabs: React.FC<TabsProps> = ({ tabs, children }) => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {tabs.map((tab, index) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(index)}
            className={`flex flex-col items-center justify-center p-4 rounded-lg transition-all transform hover:scale-105 ${
              activeTab === index
                ? `${tab.color} text-white shadow-lg`
                : 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-400'
            }`}
          >
            {tab.icon}
            <span className="mt-2 text-sm font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
      <div>
        {children[activeTab]}
      </div>
    </div>
  );
};

export default Tabs;