import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // Case ID
    const body = await request.json();
    const supabase = createAdminClient();

    // 1. Update case status or priority if provided
    const caseUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.status) {
      if (body.status === 'DISCHARGED') caseUpdates.status = 'closed';
      else if (body.status === 'ASSIGNED') caseUpdates.status = 'assigned';
      else if (body.status === 'TRIAGED') caseUpdates.status = 'under_review';
      else caseUpdates.status = 'waiting';
    }

    if (body.clinicianConfirmedCategory || body.provisionalCategory) {
      const cat = body.clinicianConfirmedCategory || body.provisionalCategory;
      caseUpdates.priority_score = 
        cat === 'EMERGENCY' ? 90 :
        cat === 'URGENT' ? 60 :
        cat === 'NEEDS_REVIEW' ? 40 : 20;
    }

    if (body.incidentDescription) {
      caseUpdates.symptoms_text = body.incidentDescription;
    }

    await supabase.from('cases').update(caseUpdates).eq('id', id);

    // 2. Doctor assignment
    if (body.assignedDoctorId) {
      // Check if assignment exists
      const { data: existing } = await supabase
        .from('assignments')
        .select('id')
        .eq('case_id', id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('assignments')
          .update({ doctor_id: body.assignedDoctorId, assigned_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('assignments')
          .insert({
            case_id: id,
            doctor_id: body.assignedDoctorId,
            assigned_at: new Date().toISOString(),
          });
      }
      // ensure case status is assigned
      await supabase.from('cases').update({ status: 'assigned' }).eq('id', id);
    }

    // 3. Update Vitals if provided
    if (body.vitals) {
      const { data: existingVitals } = await supabase
        .from('vitals')
        .select('id')
        .eq('case_id', id)
        .maybeSingle();

      const bpParts = (body.vitals.bloodPressure || '').split('/');
      const vitalsPayload: Record<string, any> = {
        recorded_at: new Date().toISOString(),
      };
      if (bpParts.length === 2) {
        vitalsPayload.bp_sys = parseInt(bpParts[0], 10) || 120;
        vitalsPayload.bp_dia = parseInt(bpParts[1], 10) || 80;
      }
      if (body.vitals.heartRate !== undefined) vitalsPayload.heart_rate = parseInt(String(body.vitals.heartRate), 10);
      if (body.vitals.spO2 !== undefined) vitalsPayload.spo2 = parseInt(String(body.vitals.spO2), 10);
      if (body.vitals.temperature !== undefined) vitalsPayload.temp_f = parseFloat(String(body.vitals.temperature));
      if (body.vitals.respiratoryRate !== undefined) vitalsPayload.resp_rate = parseInt(String(body.vitals.respiratoryRate), 10);
      if (body.vitals.gcs !== undefined) vitalsPayload.gcs = parseInt(String(body.vitals.gcs), 10);

      if (existingVitals) {
        await supabase.from('vitals').update(vitalsPayload).eq('id', existingVitals.id);
      } else {
        await supabase.from('vitals').insert({ ...vitalsPayload, case_id: id });
      }
    }

    // 4. Update Prescription / Consultation
    if (body.consultation?.prescriptions && body.consultation.prescriptions.length > 0) {
      for (const rx of body.consultation.prescriptions) {
        if (rx.id && !rx.id.startsWith('temp-')) {
          await supabase
            .from('prescriptions')
            .update({
              prescription_text: rx.drugName,
              advice_text: rx.instructions,
              approved_at: rx.approvedByClinician ? new Date().toISOString() : null,
            })
            .eq('id', rx.id);
        } else {
          await supabase
            .from('prescriptions')
            .insert({
              case_id: id,
              doctor_id: body.assignedDoctorId || null,
              prescription_text: rx.drugName,
              advice_text: rx.instructions,
              approved_at: rx.approvedByClinician ? new Date().toISOString() : null,
            });
        }
      }
    }

    // 5. Consent update
    if (body.consentStatus) {
      const { data: caseRow } = await supabase.from('cases').select('patient_id').eq('id', id).single();
      if (caseRow?.patient_id) {
        if (body.consentStatus === 'withdrawn') {
          await supabase
            .from('consents')
            .update({ withdrawn_at: new Date().toISOString() })
            .eq('patient_id', caseRow.patient_id);
        } else {
          await supabase
            .from('consents')
            .update({ withdrawn_at: null, granted_at: new Date().toISOString() })
            .eq('patient_id', caseRow.patient_id);
        }
      }
    }

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    console.error('Error in PATCH /api/patients/[id]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    // Mark case closed and soft-delete patient if needed
    const { data: caseRow } = await supabase.from('cases').select('patient_id').eq('id', id).single();
    if (caseRow?.patient_id) {
      await supabase
        .from('patients')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', caseRow.patient_id);
    }

    await supabase.from('cases').update({ status: 'closed' }).eq('id', id);

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
