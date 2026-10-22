import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { Doctor } from '@/types';

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Fetch doctors
    const { data: doctorsData, error: doctorsError } = await supabase
      .from('doctors')
      .select('*')
      .order('full_name', { ascending: true });

    if (doctorsError) {
      console.error('Error fetching doctors:', doctorsError);
      return NextResponse.json({ error: doctorsError.message }, { status: 500 });
    }

    // Fetch assignments with case status to calculate active caseloads
    const { data: assignmentsData } = await supabase
      .from('assignments')
      .select('doctor_id, case_id, cases (id, status)');

    // Map active cases by doctor
    const activePatientsByDoctor: Record<string, string[]> = {};
    const closedCountByDoctor: Record<string, number> = {};

    (assignmentsData || []).forEach((item: any) => {
      const docId = item.doctor_id;
      const caseStatus = item.cases?.status;
      if (caseStatus === 'closed') {
        closedCountByDoctor[docId] = (closedCountByDoctor[docId] || 0) + 1;
      } else {
        if (!activePatientsByDoctor[docId]) activePatientsByDoctor[docId] = [];
        if (item.case_id) activePatientsByDoctor[docId].push(item.case_id);
      }
    });

    const doctors: Doctor[] = (doctorsData || []).map((d: any) => {
      const activeIds = activePatientsByDoctor[d.id] || [];
      const currentCaseload = activeIds.length;
      const isAvailable = d.is_available ?? true;

      return {
        id: d.id,
        name: d.full_name || 'Dr. Physician',
        avatar: d.photo_path || 'demo/doctors/doctor_01.jpg',
        qualifications: d.qualification || 'MBBS, MD',
        registrationNumber: `MCI-2018-${d.id.slice(0, 5).toUpperCase()}`,
        verifiedRegistration: true,
        specializations: [d.specialization || 'General Medicine'],
        yearsOfExperience: d.experience_years || 5,
        languages: ['English', 'Hindi'],
        availabilityStatus: isAvailable 
          ? (currentCaseload >= 8 ? 'IN_CONSULTATION' : 'AVAILABLE')
          : 'OFF_DUTY',
        currentCaseload,
        maxCapacity: 8,
        department: d.specialization || 'General Medicine',
        facility: 'CareFlow General Hospital',
        completedConsultationsCount: closedCountByDoctor[d.id] || 0,
        pendingReviewsCount: currentCaseload,
        activePatientIds: activeIds,
      };
    });

    return NextResponse.json(doctors);
  } catch (err: any) {
    console.error('Unexpected error in GET /api/doctors:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from('doctors')
      .insert({
        full_name: body.name || body.full_name,
        qualification: body.qualifications || body.qualification,
        specialization: Array.isArray(body.specializations) ? body.specializations[0] : (body.specialization || 'General Medicine'),
        experience_years: body.yearsOfExperience || body.experience_years || 5,
        photo_path: body.avatar || body.photo_path || 'demo/doctors/doctor_01.jpg',
        is_available: body.is_available ?? true,
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
