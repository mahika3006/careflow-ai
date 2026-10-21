'use client';

import React, { useState } from 'react';
import { useCareFlow } from '@/lib/store';
import { Sidebar, NavTab } from '@/components/Sidebar';
import { TopNav } from '@/components/TopNav';
import { OverviewView } from '@/components/views/OverviewView';
import { PatientDashboardView } from '@/components/views/PatientDashboardView';
import { PatientDetailView } from '@/components/views/PatientDetailView';
import { DoctorDashboardView } from '@/components/views/DoctorDashboardView';
import { TriageQueueView } from '@/components/views/TriageQueueView';
import { AppointmentsAssignmentsView } from '@/components/views/AppointmentsAssignmentsView';
import { MedicalRecordsView } from '@/components/views/MedicalRecordsView';
import { ReportsView } from '@/components/views/ReportsView';
import { AnalyticsView } from '@/components/views/AnalyticsView';
import { SettingsView } from '@/components/views/SettingsView';
import { NewPatientModal } from '@/components/modals/NewPatientModal';

export function CareFlowApp() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isNewIntakeOpen, setIsNewIntakeOpen] = useState(false);
  const { setSelectedDoctorId, theme } = useCareFlow();

  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
  };

  const handleOpenDoctorWorkspace = (doctorId: string) => {
    setSelectedDoctorId(doctorId);
    setSelectedPatientId(null);
    setActiveTab('doctors');
  };

  const handlePatientCreated = (patientId: string) => {
    setSelectedPatientId(patientId);
  };

  return (
    <div
      className={`flex h-screen overflow-hidden font-sans transition-colors duration-200 ${
        theme === 'night' ? 'bg-[#0B0F17] text-slate-100' : 'bg-[#F8F9FA] text-slate-900'
      }`}
    >
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setSelectedPatientId(null);
          setActiveTab(tab);
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navigation */}
        <TopNav
          onOpenNewIntakeModal={() => setIsNewIntakeOpen(true)}
          onSelectPatient={handleSelectPatient}
        />

        {/* Dynamic Viewport */}
        <main className="flex-1 overflow-y-auto">
          {selectedPatientId ? (
            <PatientDetailView
              patientId={selectedPatientId}
              onBack={() => setSelectedPatientId(null)}
              onOpenDoctorWorkspace={handleOpenDoctorWorkspace}
            />
          ) : (
            <>
              {activeTab === 'overview' && (
                <OverviewView
                  onSelectPatient={handleSelectPatient}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                />
              )}
              {activeTab === 'patients' && (
                <PatientDashboardView
                  onSelectPatient={handleSelectPatient}
                  onOpenNewIntakeModal={() => setIsNewIntakeOpen(true)}
                />
              )}
              {activeTab === 'doctors' && (
                <DoctorDashboardView
                  onSelectPatient={handleSelectPatient}
                />
              )}
              {activeTab === 'triage-queue' && (
                <TriageQueueView
                  onSelectPatient={handleSelectPatient}
                  onNavigateAssignments={() => setActiveTab('assignments')}
                />
              )}
              {activeTab === 'assignments' && (
                <AppointmentsAssignmentsView
                  onSelectPatient={handleSelectPatient}
                />
              )}
              {activeTab === 'medical-records' && (
                <MedicalRecordsView
                  onSelectPatient={handleSelectPatient}
                />
              )}
              {activeTab === 'reports' && (
                <ReportsView
                  onSelectPatient={handleSelectPatient}
                />
              )}
              {activeTab === 'analytics' && <AnalyticsView />}
              {activeTab === 'settings' && <SettingsView />}
            </>
          )}
        </main>
      </div>

      {/* New Patient Multimodal Intake Modal */}
      <NewPatientModal
        isOpen={isNewIntakeOpen}
        onClose={() => setIsNewIntakeOpen(false)}
        onPatientCreated={handlePatientCreated}
      />
    </div>
  );
}
