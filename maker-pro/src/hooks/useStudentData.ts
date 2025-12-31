import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { StudentProject, Enrollment, Badge, AttendanceRecord } from '../types';

export function useStudentData() {
    const { studentProfile } = useAuth();
    const [stats, setStats] = useState({
        projectsCompleted: 0,
        hoursCoded: 0,
        streakDays: 0,
        xp: 0
    });

    const [projects, setProjects] = useState<StudentProject[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [activeEnrollments, setActiveEnrollments] = useState<Enrollment[]>([]);
    const [badges, setBadges] = useState<Badge[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!studentProfile?.id || !db) return;

        setLoading(true);

        // 1. Fetch Projects (Real-time)
        const projectsQuery = query(
            collection(db, 'student_projects'),
            where('studentId', '==', studentProfile.id)
        );

        const unsubProjects = onSnapshot(projectsQuery, (snap) => {
            const projs = snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentProject));
            setProjects(projs);

            // Calculate stats from real data
            const completed = projs.filter(p => p.status === 'published' || p.status === 'delivered').length;
            const xp = completed * 150; // Simple XP logic based on completed projects

            // Future: Calculate hours from attendance or project metadata
            // For now, these remain 0 until we have a reliable data source
            setStats(prev => ({
                ...prev,
                projectsCompleted: completed,
                xp
            }));
        });

        // 2. Fetch Enrollments
        getDocs(query(collection(db, 'enrollments'), where('studentId', '==', studentProfile.id)))
            .then(snap => {
                const enrs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment));
                setEnrollments(enrs);
                setActiveEnrollments(enrs.filter(e => e.status === 'active'));
            });

        // 3. Fetch Badges
        // Usually badges are global, but we highlight ones the student has
        // For now, let's just fetch all badges to display relevant ones if needed, or query earned ones
        if (studentProfile.badges && studentProfile.badges.length > 0) {
            // In a real app we'd fetch all badges once and filter
            // For now let's skip fetching badges detail to save reads unless specific page needs it
        }

        setLoading(false);

        return () => {
            unsubProjects();
        };

    }, [studentProfile?.id]);

    // Derived State
    const activeCourse = activeEnrollments[0]; // Primary course
    const upcomingSessions = activeEnrollments.map(e => ({
        id: e.id,
        programName: e.programName,
        time: e.groupTime || 'Check Schedule', // e.g. "Saturday 10:00"
        day: e.groupTime?.split(' ')[0] || 'Weekly',
        timeOnly: e.groupTime?.split(' ').slice(1).join(' ') || 'TBD'
    }));

    // Calculate progress based on projects
    // improved logic: find projects related to current station/program
    const progress = Math.min(100, Math.round((stats.projectsCompleted / 5) * 100)); // Target of 5 projects per level

    return {
        stats,
        projects,
        enrollments,
        activeEnrollments,
        activeCourse,
        upcomingSessions,
        progress,
        loading
    };
}
