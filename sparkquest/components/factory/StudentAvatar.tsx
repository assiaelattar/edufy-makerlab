import React from 'react';

export const studentAvatarUrl = (student?: any) => student?.avatarUrl || student?.photoURL || student?.photoUrl || '';

export const StudentAvatar: React.FC<{ student?: any; name?: string; className?: string; large?: boolean }> = ({ student, name, className = '', large = false }) => {
    const label = name || student?.name || student?.firstName || 'Learner';
    const url = studentAvatarUrl(student);
    return <span className={`sq-student-avatar${large ? ' is-large' : ''} ${className}`.trim()} aria-hidden="true">
        {url ? <img src={url} alt="" loading="lazy" /> : <span>{label.trim().charAt(0).toUpperCase() || 'L'}</span>}
    </span>;
};
