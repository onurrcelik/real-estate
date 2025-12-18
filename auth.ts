import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            email: string;
            role: string;
            generation_count: number;
        }
    }
    interface User {
        role?: string;
        generation_count?: number;
    }
}

export const { auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;

                    const supabaseAdmin = createClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL!,
                        process.env.SUPABASE_SERVICE_ROLE_KEY!
                    );

                    const { data: user, error } = await supabaseAdmin
                        .from('clients-real-estate')
                        .select('*')
                        .eq('email', email)
                        .single();

                    if (error || !user) return null;

                    const passwordsMatch = await bcrypt.compare(password, user.password);
                    if (passwordsMatch) {
                        return {
                            id: user.id,
                            email: user.email,
                            role: user.role,
                            generation_count: user.generation_count,
                        };
                    }
                }

                console.log('Invalid credentials');
                return null;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.generation_count = user.generation_count;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                session.user.generation_count = token.generation_count as number;
            }
            return session;
        },
    },
});
