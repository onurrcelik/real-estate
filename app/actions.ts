'use server';

import { signIn, signOut } from '@/lib/auth/auth';
import { AuthError } from 'next-auth';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const DEMO_DOMAIN = '@demo.rinova';

// Define the return type explicitly
export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
): Promise<string | undefined> {
    try {
        // Allow login with just username (e.g., "CompanyX" -> "CompanyX@demo.rinova")
        const emailInput = formData.get('email') as string;
        if (emailInput && !emailInput.includes('@')) {
            formData.set('email', emailInput + DEMO_DOMAIN);
        }

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
    const rawEmail = formData.get('email') as string;
    const password = formData.get('password') as string;

    // Allow registration with just username (e.g. "CompanyX")
    let email = rawEmail;
    if (email && !email.includes('@')) {
        email = email + DEMO_DOMAIN;
        // Update formData for subsequent login
        formData.set('email', email);
    }

    const parsedCredentials = z
        .object({ email: z.string().email(), password: z.string().min(6) })
        .safeParse({ email, password });

    if (!parsedCredentials.success) {
        return 'Invalid email or password (min 6 chars).';
    }

    // Skip validation for demo accounts
    if (!email.endsWith(DEMO_DOMAIN)) {
        // Enhanced Email Validation
        const { validate } = await import('deep-email-validator');
        const valResult = await validate({
            email: email,
            sender: email, // accurate validation requires a sender
            validateRegex: true,
            validateMx: false, // Disable MX check to prevent false positives on valid domains
            validateTypo: true,
            validateDisposable: true,
            validateSMTP: false, // Disable strict mailbox check as requested
        });

        if (!valResult.valid) {
            let errorMessage = 'Invalid email address.';
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const reasons = valResult as any;

            if (reasons.reason === 'typo' && reasons.typo) {
                errorMessage = `Did you mean ${reasons.typo}?`;
            } else if (reasons.reason === 'disposable') {
                errorMessage = 'Disposable email addresses are not allowed.';
            } else if (reasons.reason === 'mx') {
                errorMessage = 'Invalid email domain (no MX records).';
            } else if (reasons.reason === 'smtp') {
                errorMessage = 'Email address does not exist.';
            } else if (reasons.reason === 'regex') {
                errorMessage = 'Invalid email format.';
            }
            return errorMessage;
        }
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
