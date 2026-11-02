export type AccountScope = {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
};

export function isCurrentAccountRequest(
  current: AccountScope,
  requestUserId: string,
): boolean {
  return (
    current.isLoaded && current.isSignedIn && current.userId === requestUserId
  );
}

export function isAccountDataVisible(
  current: AccountScope,
  loadedUserId: string | null,
): boolean {
  return (
    current.isLoaded &&
    current.isSignedIn &&
    current.userId !== null &&
    loadedUserId === current.userId
  );
}
