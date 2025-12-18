import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/auth';

export async function GET() {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        // Fetch user data for limits
        const { data: user, error: userError } = await supabase
            .from('clients-real-estate')
            .select('role, generation_count')
            .eq('id', session.user.id)
            .single();

        const { data, error } = await supabase
            .from('real-estate-generations')
            .select('*')
            .eq('user', session.user.id) // Filter by user ID
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Database Fetch Error:', error);
            return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
        }

        return NextResponse.json({
            generations: data,
            user: user ? {
                role: user.role,
                generation_count: user.generation_count
            } : null
        });
    } catch (error) {
        console.error('History API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await req.json();

        if (!id) {
            return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { error } = await supabase
            .from('real-estate-generations')
            .delete()
            .eq('id', id)
            .eq('user', session.user.id); // Ensure user owns the record

        if (error) {
            console.error('Delete Error:', error);
            return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('History DELETE Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
