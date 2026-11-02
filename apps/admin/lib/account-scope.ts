export type AccountScope = {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
};

export function isCurrentAccountRequest(
  scope: AccountScope,
  userId: string,
): boolean {
  return scope.isLoaded && scope.isSignedIn && scope.userId === userId;
}

export function isAccountDataVisible(
  scope: AccountScope,
  loadedUserId: string | null,
): boolean {
  return (
    scope.isLoaded &&
    scope.isSignedIn &&
    scope.userId !== null &&
    scope.userId === loadedUserId
  );
}
