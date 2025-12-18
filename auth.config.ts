import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnLogin = nextUrl.pathname.startsWith('/login');
            const isOnRegister = nextUrl.pathname.startsWith('/register');

            if (isOnLogin || isOnRegister) {
                if (isLoggedIn) return Response.redirect(new URL('/', nextUrl));
                return true; // Always allow access to login and register pages
            }

            if (isLoggedIn) return true; // Allow access if logged in

            return false; // Redirect unauthenticated users to login page
        },
    },
    providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;
