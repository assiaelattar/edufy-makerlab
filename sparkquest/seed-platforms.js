
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// Config from services/firebase.ts
const firebaseConfig = {
    apiKey: "AIzaSyCbSdElE-DXh83x02wszjfUcXl9z0iQj1A",
    authDomain: "edufy-makerlab.firebaseapp.com",
    projectId: "edufy-makerlab",
    storageBucket: "edufy-makerlab.firebasestorage.app",
    messagingSenderId: "273507751238",
    appId: "1:273507751238:web:c8306f6177654befa54147",
    measurementId: "G-KZV1Q7T1H2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const platforms = [
    {
        id: 'khan-academy',
        name: 'Khan Academy',
        url: 'https://www.khanacademy.org',
        description: 'Free courses in Math, Science, Computing and more',
        category: 'STEM Learning',
        logo: 'https://cdn.kastatic.org/images/khan-logo-dark-background-2.png',
        color: '#14BF96',
        featured: true,
        status: 'active'
    },
    {
        id: 'phet',
        name: 'PhET Simulations',
        url: 'https://phet.colorado.edu',
        description: 'Interactive science and math simulations',
        category: 'Science',
        logo: 'https://phet.colorado.edu/images/phet-logo-trademarked.png',
        color: '#F36C21',
        featured: false,
        status: 'active'
    },
    {
        id: 'ted-ed',
        name: 'TED-Ed',
        url: 'https://ed.ted.com',
        description: 'Lessons worth sharing',
        category: 'Inspiration',
        logo: 'https://ted-ed-prod-staticassets.s3.amazonaws.com/static-images/new-ted-ed-logo.png',
        color: '#EB0028',
        featured: false,
        status: 'active'
    },
    {
        id: 'scratch',
        name: 'Scratch',
        url: 'https://scratch.mit.edu',
        description: 'Create stories, games, and animations',
        category: 'Creative Coding',
        logo: 'https://scratch.mit.edu/images/logo_sm.png',
        color: '#FF8C1A',
        featured: false,
        status: 'active'
    },
    {
        id: 'code-org',
        name: 'Code.org',
        url: 'https://code.org/learn',
        description: 'Learn Computer Science basics',
        category: 'Coding',
        logo: 'https://code.org/images/logo.svg',
        color: '#7664C8',
        featured: false,
        status: 'active'
    }
];

const seed = async () => {
    console.log('🚀 Seeding Platforms...');
    for (const platform of platforms) {
        try {
            await setDoc(doc(db, 'arcade_platforms', platform.id), platform);
            console.log(`✅ Added ${platform.name}`);
        } catch (e) {
            console.error(`❌ Failed to add ${platform.name}`, e);
        }
    }
    console.log('🎉 Done!');
    process.exit(0);
};

seed();
