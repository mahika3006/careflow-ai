import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient();

    const updatePayload: Record<string, any> = {};
    if (typeof body.is_available === 'boolean') {
      updatePayload.is_available = body.is_available;
    }
    if (body.availabilityStatus) {
      updatePayload.is_available = body.availabilityStatus !== 'OFF_DUTY';
    }

    const { data, error } = await supabase
      .from('doctors')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
