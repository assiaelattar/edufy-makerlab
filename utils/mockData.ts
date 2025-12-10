
import { ToolLink, Asset, GalleryItem, ProjectTemplate } from '../types';

export const MOCK_TOOLS: Partial<ToolLink>[] = [
  { title: 'Arduino IDE', url: 'https://www.arduino.cc/en/software', category: 'coding', description: 'Open-source electronic prototyping platform enabling users to create interactive electronic objects.' },
  { title: 'Tinkercad', url: 'https://www.tinkercad.com/', category: 'design', description: 'Free, easy-to-use app for 3D design, electronics, and coding.' },
  { title: 'Scratch', url: 'https://scratch.mit.edu/', category: 'coding', description: 'Block-based visual programming language and website targeted primarily at children.' },
  { title: 'Canva', url: 'https://www.canva.com/', category: 'multimedia', description: 'Graphic design platform that is used to create social media graphics, presentations, posters, documents and other visual content.' },
  { title: 'Lego Education Spike', url: 'https://education.lego.com/en-us/downloads/spike-app/software/', category: 'robotics', description: 'App for programming LEGO® Education SPIKE™ Prime and SPIKE™ Essential.' },
  { title: 'Blender', url: 'https://www.blender.org/', category: 'design', description: 'Free and open source 3D creation suite.' },
  { title: 'VEXcode VR', url: 'https://vr.vex.com/', category: 'robotics', description: 'Code a virtual robot using block-based coding environment.' }
];

export const MOCK_ASSETS: Partial<Asset>[] = [
  { name: 'Lego Spike Prime Set #1', category: 'robotics', status: 'available', serialNumber: 'SPK-001', notes: 'Complete set, checked 2 days ago.' },
  { name: 'Lego Spike Prime Set #2', category: 'robotics', status: 'in_use', serialNumber: 'SPK-002', assignedToName: 'Adam S.', notes: 'Missing one yellow beam.' },
  { name: 'Raspberry Pi 4 Kit', category: 'computer', status: 'available', serialNumber: 'RPI-2024-X', notes: 'Includes 32GB SD card and case.' },
  { name: '3D Printer (Ender 3)', category: 'tools', status: 'maintenance', serialNumber: 'PRT-END-03', notes: 'Nozzle clogged, needs cleaning.' },
  { name: 'Samsung Tablet A8', category: 'computer', status: 'available', serialNumber: 'TAB-S8-09', notes: 'For controlling robots.' },
  { name: 'Soldering Station', category: 'tools', status: 'available', serialNumber: 'SLD-ST-01', notes: 'Keep in ventilated area.' },
  { name: 'Makey Makey Kit', category: 'robotics', status: 'available', serialNumber: 'MKY-005', notes: 'Good condition.' }
];

export const MOCK_GALLERY: Partial<GalleryItem>[] = [
  { url: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=1000&auto=format&fit=crop', caption: 'Robotics Workshop Day 1', type: 'image' },
  { url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1000&auto=format&fit=crop', caption: 'Coding Class in Session', type: 'image' },
  { url: 'https://images.unsplash.com/photo-1596496050844-461db2612145?q=80&w=1000&auto=format&fit=crop', caption: '3D Printing our Designs', type: 'image' },
  { url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1000&auto=format&fit=crop', caption: 'New Friends at Makerlab', type: 'image' },
  { url: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?q=80&w=1000&auto=format&fit=crop', caption: 'Presentation Day', type: 'image' },
  { url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1000&auto=format&fit=crop', caption: 'Cybersecurity Awareness', type: 'image' },
];

export const MOCK_PROJECT_TEMPLATES: Partial<ProjectTemplate>[] = [
    {
        title: "Mars Rover Challenge",
        description: "Design and code a rover capable of navigating the treacherous terrain of Mars. Focus on durability and autonomous movement.",
        difficulty: "intermediate",
        skills: ["Robotics", "Block Coding", "Problem Solving"],
        defaultSteps: ["Analyze Terrain Maps", "Design Chassis", "Build Prototype", "Code Movement", "Test on Obstacle Course"],
        station: "robotics",
        thumbnailUrl: "https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?q=80&w=1000&auto=format&fit=crop"
    },
    {
        title: "Flappy Bird Clone",
        description: "Create your own version of the classic Flappy Bird game using Scratch or Python. Customise the sprites and physics.",
        difficulty: "beginner",
        skills: ["Game Logic", "Scratch", "Physics"],
        defaultSteps: ["Create Assets", "Code Gravity", "Add Obstacles", "Score System", "Game Over Screen"],
        station: "coding",
        thumbnailUrl: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?q=80&w=1000&auto=format&fit=crop"
    },
    {
        title: "3D Name Tag",
        description: "Learn the basics of Tinkercad by designing a custom name tag for your backpack. Prepare it for 3D printing.",
        difficulty: "beginner",
        skills: ["3D Design", "Tinkercad", "Slicing"],
        defaultSteps: ["Sketch Design", "Model in Tinkercad", "Add Keyring Hole", "Export STL", "Slice for Printer"],
        station: "engineering",
        thumbnailUrl: "https://images.unsplash.com/photo-1631541909061-71e349d1f203?q=80&w=1000&auto=format&fit=crop"
    },
    {
        title: "Stop Motion Movie",
        description: "Produce a 30-second stop motion animation telling a short story. Use Lego or clay figures.",
        difficulty: "intermediate",
        skills: ["Animation", "Storyboarding", "Video Editing"],
        defaultSteps: ["Write Script", "Create Characters", "Film Frames", "Add Sound Effects", "Final Edit"],
        station: "multimedia",
        thumbnailUrl: "https://images.unsplash.com/photo-1523806762236-47eb02e07172?q=80&w=1000&auto=format&fit=crop"
    },
    {
        title: "Personal Brand Logo",
        description: "Design a professional logo for your maker portfolio or future business.",
        difficulty: "advanced",
        skills: ["Graphic Design", "Vector Art", "Branding"],
        defaultSteps: ["Mood Board", "Sketch Concepts", "Digitize in Canva/Illustrator", "Select Color Palette", "Final Export"],
        station: "branding",
        thumbnailUrl: "https://images.unsplash.com/photo-1626785774573-4b799314346d?q=80&w=1000&auto=format&fit=crop"
    }
];
