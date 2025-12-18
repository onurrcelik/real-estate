'use server';

import { signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Define the return type explicitly
export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
): Promise<string | undefined> {
    try {
        await signIn('credentials', formData);
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials.';
                default:
                    return 'Something went wrong.';
            }
        }
        throw error;
    }
}

export async function register(
    prevState: string | undefined,
    formData: FormData,
): Promise<string | undefined> {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const parsedCredentials = z
        .object({ email: z.string().email(), password: z.string().min(6) })
        .safeParse({ email, password });

    if (!parsedCredentials.success) {
        return 'Invalid email or password (min 6 chars).';
    }

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if user exists
    const { data: existingUser } = await supabaseAdmin
        .from('clients-real-estate')
        .select('id')
        .eq('email', email)
        .single();

    if (existingUser) {
        return 'User already exists.';
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { error } = await supabaseAdmin
        .from('clients-real-estate')
        .insert({
            email,
            password: hashedPassword,
        });

    if (error) {
        console.error('Registration error:', error);
        return 'Failed to create account.';
    }

    // Attempt to log in immediately
    try {
        await signIn('credentials', formData);
    } catch (error) {
        if (error instanceof AuthError) {
            // If redirect happens it might throw, but verifying specific types
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Something went wrong logging in after registration.';
                default:
                    // redirect throws an error, so we rethrow strictly unless it's a known auth error
                    throw error;
            }
        }
        throw error; // redirect throws
    }
}

export async function signOutAction() {
    await signOut();
}
