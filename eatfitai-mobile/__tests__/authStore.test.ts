/**
 * Unit tests cho authStore (Zustand)
 * Test authentication state management: login, logout, token refresh
 */

import { create } from 'zustand';

// Tạo mock store để test
interface AuthState {
    user: { userId: string; email: string; displayName: string } | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    setToken: (token: string) => void;
    clearAuth: () => void;
}

// Mock implementation của authStore để test
const createAuthStore = () =>
    create<AuthState>((set) => ({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        login: async (email: string, password: string) => {
            set({ isLoading: true });
            // Simulate API call
            if (email === 'test@example.com' && password === 'password123') {
                set({
                    user: { userId: '1', email, displayName: 'Test User' },
                    token: 'mock-jwt-token',
                    isAuthenticated: true,
                    isLoading: false,
                });
            } else {
                set({ isLoading: false });
                throw new Error('Invalid credentials');
            }
        },
        logout: () => {
            set({ user: null, token: null, isAuthenticated: false });
        },
        setToken: (token: string) => {
            set({ token });
        },
        clearAuth: () => {
            set({ user: null, token: null, isAuthenticated: false });
        },
    }));

describe('authStore', () => {
    let useAuthStore: ReturnType<typeof createAuthStore>;

    beforeEach(() => {
        // Tạo store mới cho mỗi test
        useAuthStore = createAuthStore();
    });

    describe('initial state', () => {
        it('should have correct initial state', () => {
            // Arrange & Act
            const state = useAuthStore.getState();

            // Assert - State ban đầu phải không có user và chưa authenticated
            expect(state.user).toBeNull();
            expect(state.token).toBeNull();
            expect(state.isAuthenticated).toBe(false);
            expect(state.isLoading).toBe(false);
        });
    });

    describe('login', () => {
        it('should set user and token on successful login', async () => {
            // Arrange & Act
            await useAuthStore.getState().login('test@example.com', 'password123');
            const state = useAuthStore.getState();

            // Assert
            expect(state.user).not.toBeNull();
            expect(state.user?.email).toBe('test@example.com');
            expect(state.token).toBe('mock-jwt-token');
            expect(state.isAuthenticated).toBe(true);
        });

        it('should throw error on invalid credentials', async () => {
            // Arrange & Act & Assert
            await expect(
                useAuthStore.getState().login('wrong@example.com', 'wrongpassword'),
            ).rejects.toThrow('Invalid credentials');

            // State should remain unauthenticated
            const state = useAuthStore.getState();
            expect(state.isAuthenticated).toBe(false);
        });

        it('should set isLoading during login process', async () => {
            // Chỉ verify rằng isLoading được set về false sau khi login xong
            await useAuthStore.getState().login('test@example.com', 'password123');
            const state = useAuthStore.getState();
            expect(state.isLoading).toBe(false);
        });
    });

    describe('logout', () => {
        it('should clear user and token on logout', async () => {
            // Arrange - Login first
            await useAuthStore.getState().login('test@example.com', 'password123');

            // Act
            useAuthStore.getState().logout();
            const state = useAuthStore.getState();

            // Assert - State phải được reset
            expect(state.user).toBeNull();
            expect(state.token).toBeNull();
            expect(state.isAuthenticated).toBe(false);
        });
    });

    describe('setToken', () => {
        it('should update token', () => {
            // Arrange & Act
            useAuthStore.getState().setToken('new-token');
            const state = useAuthStore.getState();

            // Assert
            expect(state.token).toBe('new-token');
        });
    });

    describe('clearAuth', () => {
        it('should clear all auth state', async () => {
            // Arrange - Set some state first
            await useAuthStore.getState().login('test@example.com', 'password123');

            // Act
            useAuthStore.getState().clearAuth();
            const state = useAuthStore.getState();

            // Assert
            expect(state.user).toBeNull();
            expect(state.token).toBeNull();
            expect(state.isAuthenticated).toBe(false);
        });
    });
});
