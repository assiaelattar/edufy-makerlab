import { EmailAuthProvider, reauthenticateWithCredential, type User } from 'firebase/auth';

export const reauthenticateForShowcaseDeletion = async (user: User, password: string) => {
  if (!user.email || !user.providerData.some(provider => provider.providerId === 'password')) {
    throw new Error('password-reauthentication-unavailable');
  }
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
  await user.getIdToken(true);
};
