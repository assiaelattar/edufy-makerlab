
/**
 * Client-side Biometric / Passkey Simulation
 * Note: Actual WebAuthn requires a backend to generate challenges.
 * This service uses localStorage to simulate the experience for demo purposes.
 */

const BIOMETRIC_KEY = 'edufy_biometric_enabled_user';

// Check if the device supports WebAuthn (Platform Authenticator like FaceID/TouchID)
export const isBiometricAvailable = async (): Promise<boolean> => {
    if (!window.PublicKeyCredential) return false;
    
    // Check if a platform authenticator (FaceID/TouchID) is available
    try {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        return available;
    } catch (e) {
        return false;
    }
};

// Simulate Registration
export const registerBiometric = async (email: string): Promise<boolean> => {
    if (!window.PublicKeyCredential) {
        alert("Your device does not support biometric authentication.");
        return false;
    }

    try {
        // In a real app, we would fetch options from server
        // Here we just trigger the browser prompt with dummy data to "fake" the native UI experience
        const publicKey: PublicKeyCredentialCreationOptions = {
            challenge: new Uint8Array([1, 2, 3, 4]), // Dummy challenge
            rp: { name: "Edufy Makerlab", id: window.location.hostname },
            user: {
                id: new Uint8Array([1, 2, 3, 4]),
                name: email,
                displayName: email
            },
            pubKeyCredParams: [{ alg: -7, type: "public-key" }],
            authenticatorSelection: { authenticatorAttachment: "platform" },
            timeout: 60000,
            attestation: "direct"
        };

        // This triggers the browser's native FaceID/TouchID prompt
        // It will fail on some browsers if not served over HTTPS or valid domain, but works on localhost/vercel usually.
        await navigator.credentials.create({ publicKey });
        
        // If successful, "store" the user
        localStorage.setItem(BIOMETRIC_KEY, email);
        return true;

    } catch (err) {
        console.warn("Biometric registration simulated or failed:", err);
        // Fallback for simulation if real API fails (e.g. strict domain requirements)
        if (confirm("Browser blocked WebAuthn (Requires valid domain). Enable simulation mode?")) {
            localStorage.setItem(BIOMETRIC_KEY, email);
            return true;
        }
        return false;
    }
};

// Simulate Authentication
export const authenticateBiometric = async (): Promise<string | null> => {
    const storedEmail = localStorage.getItem(BIOMETRIC_KEY);
    if (!storedEmail) return null;

    try {
        // Trigger native UI
        const publicKey: PublicKeyCredentialRequestOptions = {
            challenge: new Uint8Array([1, 2, 3, 4]),
            rpId: window.location.hostname,
            timeout: 60000,
        };

        await navigator.credentials.get({ publicKey });
        return storedEmail;

    } catch (err) {
        console.warn("Biometric auth failed or cancelled", err);
        // Fallback simulation
        // In a real scenario, we wouldn't bypass this.
        // For demo, we might allow a bypass if user confirms "Simulate Success"
        // return storedEmail; // Uncomment to force success for testing
        return null;
    }
};

export const isBiometricEnabled = () => {
    return !!localStorage.getItem(BIOMETRIC_KEY);
};

export const clearBiometric = () => {
    localStorage.removeItem(BIOMETRIC_KEY);
};
