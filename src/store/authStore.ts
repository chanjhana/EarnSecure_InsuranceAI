// TODO: Replace with Zustand/Redux/Context implementation.

export type AuthState = {
  token: string | null;
  riderId: string | null;
};

export const initialAuthState: AuthState = {
  token: null,
  riderId: null,
};
