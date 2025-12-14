import { UserProfile } from "../types";

export const generateBridgeToken = (userProfile: UserProfile): string => {
    if (!userProfile) return '';

    const payload = {
        uid: userProfile.uid,
        email: userProfile.email,
        name: userProfile.name,
        role: userProfile.role,
        timestamp: Date.now()
    };

    // Simple Base64 encoding for MVP (ensure to replace with JWT in production)
    return btoa(JSON.stringify(payload));
};
