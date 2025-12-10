import React, { useState } from 'react';
import { Home, Image as ImageIcon, Box, Heart, HelpCircle, MapPin, Clock, ArrowRight, Star, Search, Calendar, User, Mail } from 'lucide-react';

export const TestDesignView = () => {
    const [activeMenu, setActiveMenu] = useState('home');
    const [selectedPet, setSelectedPet] = useState('dog');

    return (
        <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-[#2D2B6B] flex flex-col text-white shrink-0 rounded-r-[3rem] relative z-10">
                {/* User Profile */}
                <div className="p-8 pb-4">
                    <div className="flex items-center gap-3 bg-[#3D3B7B] p-2 rounded-full pr-6 w-max">
                        <img
                            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
                            alt="User"
                            className="w-10 h-10 rounded-full object-cover border-2 border-amber-400"
                        />
                        <span className="font-medium text-sm">Liana Ford</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 space-y-2 mt-4">
                    {[
                        { id: 'home', icon: Home, label: 'Home' },
                        { id: 'gallery', icon: ImageIcon, label: 'Gallery' },
                        { id: 'masters', icon: Box, label: 'Masters' }, // Using Box as placeholder for the helmet/astronaut icon
                        { id: 'deals', icon: Heart, label: 'Best Deal' },
                        { id: 'help', icon: HelpCircle, label: 'Help' },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveMenu(item.id)}
                            className={`w-full flex items-center gap-4 px-6 py-4 rounded-l-full transition-all relative ${activeMenu === item.id
                                    ? 'bg-[#FFC107] text-[#2D2B6B] font-bold translate-x-4 shadow-lg'
                                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <item.icon size={20} strokeWidth={activeMenu === item.id ? 2.5 : 2} />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>

                {/* Bottom Card */}
                <div className="p-6 mt-auto">
                    <div className="bg-white rounded-3xl p-6 text-center relative overflow-hidden group">
                        <h3 className="text-[#2D2B6B] font-bold text-lg mb-2">Birthday Styling</h3>
                        <p className="text-slate-500 text-xs mb-4">We give your furry friend's birthday styling</p>
                        <button className="bg-[#FFC107] text-[#2D2B6B] font-bold text-sm px-6 py-2 rounded-full hover:bg-amber-400 transition-colors shadow-md">
                            Take It!
                        </button>

                        {/* Dog Illustration Placeholder */}
                        <div className="mt-4 relative h-24">
                            <img
                                src="https://img.freepik.com/free-vector/cute-dog-sticking-tongue-out-cartoon-vector-icon-illustration-animal-nature-icon-concept-isolated_138676-4303.jpg?w=740"
                                className="absolute -bottom-4 -right-4 w-32 object-contain transform group-hover:scale-110 transition-transform"
                                alt="Dog"
                            />
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-5xl mx-auto space-y-8">

                    {/* Top Hero Card */}
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden shadow-sm">
                        <div className="max-w-lg relative z-10">
                            <h1 className="text-3xl font-bold text-[#2D2B6B] mb-4">All The Best For Your Pets</h1>
                            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                                We serve more than 100 breeds of pets at a professional level and at affordable prices, given their anatomical and natural features.
                            </p>

                            <div className="flex flex-wrap items-end gap-6">
                                <div>
                                    <label className="text-[#2D2B6B] font-bold text-sm block mb-2">Date :</label>
                                    <div className="bg-slate-50 px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium text-[#2D2B6B]">
                                        <Calendar size={16} className="text-rose-500" />
                                        12.21.19
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[#2D2B6B] font-bold text-sm block mb-2">Time :</label>
                                    <div className="bg-slate-50 px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium text-[#2D2B6B]">
                                        <Clock size={16} className="text-rose-500" />
                                        7:05 AM
                                    </div>
                                </div>
                                <button className="bg-[#FFC107] text-[#2D2B6B] font-bold px-8 py-3 rounded-full hover:bg-amber-400 transition-colors shadow-lg shadow-amber-200">
                                    Book
                                </button>
                            </div>
                        </div>

                        {/* Cat Illustration */}
                        <div className="absolute top-1/2 -translate-y-1/2 right-12 hidden md:block">
                            <img
                                src="https://img.freepik.com/free-vector/cute-cat-bath-tub-cartoon-vector-icon-illustration-animal-nature-icon-concept-isolated_138676-4308.jpg?w=740"
                                alt="Cat Bathing"
                                className="w-80 object-contain"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Price Section */}
                        <div className="space-y-6">
                            <h2 className="text-[#2D2B6B] font-bold text-2xl">Price</h2>

                            {/* Pet Selector */}
                            <div className="bg-white rounded-full p-2 flex gap-2 w-max shadow-sm">
                                {['cat', 'dog', 'rabbit', 'bird', 'fish'].map((pet) => (
                                    <button
                                        key={pet}
                                        onClick={() => setSelectedPet(pet)}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${selectedPet === pet
                                                ? 'bg-[#2D2B6B] text-white shadow-md'
                                                : 'text-slate-400 hover:bg-slate-50'
                                            }`}
                                    >
                                        {/* Simple icons for demo */}
                                        {pet === 'dog' ? <span className="text-lg">🐶</span> :
                                            pet === 'cat' ? <span className="text-lg">🐱</span> :
                                                <span className="text-lg">🐾</span>}
                                    </button>
                                ))}
                            </div>

                            {/* Service List */}
                            <div className="space-y-4">
                                <div className="bg-white p-4 rounded-2xl flex items-center gap-4 text-[#2D2B6B] font-medium hover:shadow-md transition-shadow cursor-pointer">
                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">✂️</div>
                                    <span>Hygiene Complex</span>
                                </div>

                                {/* Active Card */}
                                <div className="bg-[#FF5A5F] p-6 rounded-[2rem] text-white shadow-xl shadow-rose-200 relative overflow-hidden group cursor-pointer transform hover:scale-[1.02] transition-all">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#FF5A5F] text-xl shadow-sm">🚿</div>
                                            <span className="font-bold text-lg">Bathing</span>
                                        </div>
                                        <ArrowRight className="text-white/80" />
                                    </div>

                                    <div className="space-y-2 mb-6 pl-16">
                                        <div className="flex items-center gap-2 text-sm font-medium text-white/90">
                                            <div className="w-1 h-1 bg-white rounded-full"></div> Drying
                                        </div>
                                        <div className="flex items-center gap-2 text-sm font-medium text-white/90">
                                            <div className="w-1 h-1 bg-white rounded-full"></div> Cleaning Ears
                                        </div>
                                    </div>

                                    <div className="pl-16 font-bold text-sm opacity-90">
                                        from 10$
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-2xl flex items-center gap-4 text-[#2D2B6B] font-medium hover:shadow-md transition-shadow cursor-pointer">
                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">🏠</div>
                                    <span>Home Haircut</span>
                                </div>

                                <div className="bg-white p-4 rounded-2xl flex items-center gap-4 text-[#2D2B6B] font-medium hover:shadow-md transition-shadow cursor-pointer">
                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">👑</div>
                                    <span>Breed Complex</span>
                                </div>
                            </div>
                        </div>

                        {/* Map / Info Section */}
                        <div className="space-y-8">
                            <div className="bg-[#67D5E6] rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-lg shadow-cyan-200 min-h-[400px] flex flex-col">
                                <div className="flex justify-between items-start mb-8 relative z-10">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <MapPin size={18} />
                                            <span className="font-bold">Pet-salon "MasterZoo"</span>
                                        </div>
                                        <p className="text-white/80 text-xs pl-6">1048 5th Ave, New York</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-2 mb-1 justify-end">
                                            <Clock size={18} />
                                            <span className="font-bold">Everyday</span>
                                        </div>
                                        <p className="text-white/80 text-xs">7:00 AM - 9:00 PM</p>
                                    </div>
                                </div>

                                {/* Map Visualization Placeholder */}
                                <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-[2rem] border-2 border-white/30 relative overflow-hidden">
                                    <div className="absolute inset-0 opacity-30" style={{
                                        backgroundImage: 'linear-gradient(#fff 2px, transparent 2px), linear-gradient(90deg, #fff 2px, transparent 2px)',
                                        backgroundSize: '40px 40px'
                                    }}></div>

                                    {/* Map Pin */}
                                    <div className="absolute top-1/2 left-2/3 -translate-x-1/2 -translate-y-1/2">
                                        <div className="w-16 h-16 bg-[#2D2B6B]/20 rounded-full flex items-center justify-center animate-pulse">
                                            <div className="w-8 h-8 bg-[#2D2B6B] rounded-full flex items-center justify-center text-white shadow-lg">
                                                <span className="text-xs">🐾</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Founder Section */}
                            <div>
                                <h3 className="text-[#2D2B6B] font-bold text-xl mb-4">Our founder</h3>
                                <div className="bg-white p-4 rounded-2xl flex items-center gap-4 shadow-sm">
                                    <img
                                        src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150"
                                        alt="Founder"
                                        className="w-12 h-12 rounded-full object-cover"
                                    />
                                    <div className="flex-1">
                                        <h4 className="font-bold text-[#2D2B6B]">Lee Min Soo</h4>
                                        <p className="text-slate-400 text-xs">For expense of offers and advertising: <span className="text-[#2D2B6B] font-medium">hellopets@gmail.com</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
