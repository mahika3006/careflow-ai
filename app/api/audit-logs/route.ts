import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { AuditLogEntry } from '@/types';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const logs: AuditLogEntry[] = (data || []).map((row: any) => ({
      id: String(row.id),
      timestamp: row.created_at,
      actorId: row.actor_id || 'system',
      actorName: row.details?.actor_name || (row.actor_type ? `${row.actor_type.toUpperCase()}` : 'System'),
      actorRole: (row.actor_type === 'doctor' ? 'DOCTOR' : (row.actor_type === 'nurse' ? 'NURSE' : (row.actor_type === 'admin' ? 'ADMIN' : 'SYSTEM_AI'))) as any,
      action: row.action || 'Action logged',
      entityType: (row.target_table === 'cases' || row.target_table === 'patients' ? 'PATIENT' : 'TRIAGE_ASSESSMENT') as any,
      entityId: row.target_id || '',
      previousValue: row.details?.previousValue,
      newValue: row.details?.newValue,
      rationale: row.details?.rationale,
    }));

    return NextResponse.json(logs);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from('audit_log')
      .insert({
        actor_type: (body.actorRole || 'nurse').toLowerCase(),
        action: body.action,
        target_table: 'cases',
        target_id: body.entityId && body.entityId.length === 36 ? body.entityId : null,
        details: {
          actor_name: body.actorName,
          entityType: body.entityType,
          previousValue: body.previousValue,
          newValue: body.newValue,
          rationale: body.rationale,
        },
      })
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
