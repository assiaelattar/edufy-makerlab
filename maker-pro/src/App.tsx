import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Layout } from './components/Layout';
import { InstructorLayout } from './layouts/InstructorLayout';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { Resources } from './pages/Resources';
import { Certifications } from './pages/Certifications';
import { Community } from './pages/Community';
import { Login } from './pages/Login';
import { ProjectDetails } from './pages/ProjectDetails';
import { Billing } from './pages/Billing';
import { LearningPath } from './pages/LearningPath';
import { AuthProvider } from './context/AuthContext';
import ProjectDetailsDemo from './pages/demo/ProjectDetailsDemo';
import { PrivateRoute } from './components/PrivateRoute';
import InstructorDashboard from './pages/InstructorDashboard'; // Assuming this is the standalone instructor page
import { CurriculumBuilder } from './pages/instructor/CurriculumBuilder';
import { ProgramStudentsView } from './pages/instructor/ProgramStudentsView';
import { InstructorStudentProfile } from './pages/instructor/StudentProfile';
import { InstructorSettings } from './pages/instructor/InstructorSettings';
import { Settings } from './pages/Settings';
import { AnnouncementsManager } from './pages/instructor/AnnouncementsManager';
import { ParentLoginView } from '../../views/ParentLoginView';
import { ParentDashboardView } from '../../views/ParentDashboardView';

import { AppProvider } from '../../context/AppContext';

const CurriculumBuilderWrapper = () => {
    const { programId } = useParams<{ programId: string }>();
    if (!programId) return <Navigate to="/instructor-dashboard" />;
    return <CurriculumBuilder programId={programId} />;
};

function App() {
    return (
        <AppProvider>
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/parent-login" element={<ParentLoginView />} />
                        <Route path="/parent-dashboard" element={
                            <PrivateRoute requiredRole="parent">
                                <ParentDashboardView />
                            </PrivateRoute>
                        } />

                        {/* Instructor specific route with Layout */}
                        <Route element={<PrivateRoute requiredRole="instructor"><InstructorLayout /></PrivateRoute>}>
                            <Route path="/instructor-dashboard" element={<InstructorDashboard viewMode="dashboard" />} />
                            <Route path="/instructor/curriculum" element={<InstructorDashboard viewMode="curriculum" />} />
                            <Route path="/instructor/roster" element={<InstructorDashboard viewMode="roster" />} />
                            <Route path="/instructor/curriculum/:programId" element={<CurriculumBuilderWrapper />} />
                            <Route path="/instructor/program/:programId/students" element={<ProgramStudentsView />} />
                            <Route path="/instructor/student/:studentId" element={<InstructorStudentProfile />} />
                            <Route path="/instructor/student/:studentId" element={<InstructorStudentProfile />} />
                            <Route path="/instructor/settings" element={<InstructorSettings />} />
                            <Route path="/instructor/announcements" element={<AnnouncementsManager />} />
                        </Route>
                        <Route element={<PrivateRoute />}>
                            <Route element={<Layout />}>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/billing" element={<Billing />} />
                                <Route path="/projects" element={<Projects />} />
                                <Route path="/projects/:id" element={<ProjectDetails />} />
                                <Route path="/resources" element={<Resources />} />
                                <Route path="/learning-path" element={<LearningPath />} />
                                <Route path="/certifications" element={<Certifications />} />
                                <Route path="/community" element={<Community />} />
                                <Route path="/settings" element={<Settings />} />
                            </Route>
                        </Route>


                        <Route path="/project-demo" element={<ProjectDetailsDemo />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </AppProvider>
    );
}

export default App;
