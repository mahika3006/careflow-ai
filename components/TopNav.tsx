'use client';

import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  Plus, 
  Globe, 
  UserCheck, 
  ShieldAlert, 
  Clock, 
  ChevronDown, 
  X,
  Stethoscope,
  HeartPulse,
  PanelLeftOpen
} from 'lucide-react';
import { useCareFlow } from '@/lib/store';
import { UserRole } from '@/types';
import { isOverdue } from '@/lib/triage-rules';
import { DayNightDragger } from '@/components/DayNightDragger';
import { UserAvatar } from '@/components/ui/UserAvatar';

interface TopNavProps {
  onOpenNewIntakeModal: () => void;
  onSelectPatient: (patientId: string) => void;
}

export function TopNav({ onOpenNewIntakeModal, onSelectPatient }: TopNavProps) {
  const { 
    currentRole, 
    setRole, 
    currentLanguage, 
    setLanguage, 
    searchQuery, 
    setSearchQuery,
    patients,
    emergencyAlertCount,
    sidebarCollapsed,
    toggleSidebar
  } = useCareFlow();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Filter overdue cases
  const overduePatients = patients.filter((p) => isOverdue(p) && p.status !== 'DISCHARGED');
  const emergencyPatients = patients.filter(
    (p) => (p.clinicianConfirmedCategory === 'EMERGENCY' || p.provisionalCategory === 'EMERGENCY') && p.status !== 'DISCHARGED'
  );

  const totalAlerts = emergencyAlertCount + overduePatients.length;

  const roleProfiles: Record<UserRole, { name: string; title: string; avatar: string }> = {
    NURSE: {
      name: 'Kavita Patel, RN',
      title: 'Senior Triage Nurse',
      avatar: 'https://images.unsplash.com/photo-1594824813689-53609e25e98f?w=120&auto=format&fit=crop&q=80',
    },
    DOCTOR: {
      name: 'Dr. Vikramaditya Rao',
      title: 'Attending Cardiologist (MD, DM)',
      avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120&auto=format&fit=crop&q=80',
    },
    ADMIN: {
      name: 'Meenakshi Sundaram',
      title: 'Hospital Clinical Administrator',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
    },
    PATIENT: {
      name: 'Rajesh Sharma',
      title: 'Patient Portal Account (PT-8091)',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    },
  };

  const activeProfile = roleProfiles[currentRole];

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left Area: Sidebar Expand Slider Button + Global Search Bar */}
      <div className="flex items-center space-x-3">
        {sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-emerald-700 transition-colors shadow-2xs flex items-center gap-1.5 text-xs font-semibold"
            title="Slide to expand navigation sidebar"
            aria-label="Slide to expand navigation sidebar"
          >
            <PanelLeftOpen className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline text-[11px] font-bold">Expand</span>
          </button>
        )}

        {/* Global Search Bar */}
        <div className="flex items-center w-72 lg:w-96 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient, ID, doctor, or symptom..."
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-all text-slate-800 placeholder-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        {/* Day / Night Shift Dragger Switch */}
        <DayNightDragger />

        {/* Language Selector */}
        <div className="relative">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md border border-slate-200"
          >
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span className="uppercase text-[11px] font-bold">{currentLanguage}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showLangMenu && (
            <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-md shadow-lg py-1 z-40 text-xs">
              <button
                onClick={() => { setLanguage('en'); setShowLangMenu(false); }}
                className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between ${currentLanguage === 'en' ? 'font-bold text-emerald-700' : 'text-slate-700'}`}
              >
                <span>English</span>
                {currentLanguage === 'en' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>}
              </button>
              <button
                onClick={() => { setLanguage('hi'); setShowLangMenu(false); }}
                className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between ${currentLanguage === 'hi' ? 'font-bold text-emerald-700' : 'text-slate-700'}`}
              >
                <span>हिंदी (Hindi)</span>
                {currentLanguage === 'hi' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>}
              </button>
              <button
                onClick={() => { setLanguage('hinglish'); setShowLangMenu(false); }}
                className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between ${currentLanguage === 'hinglish' ? 'font-bold text-emerald-700' : 'text-slate-700'}`}
              >
                <span>Hinglish (Mixed)</span>
                {currentLanguage === 'hinglish' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>}
              </button>
            </div>
          )}
        </div>

        {/* Live Notification Bell with Emergency Count */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 relative border border-slate-200"
            title="Clinical Notifications"
          >
            <Bell className="w-4 h-4 text-slate-700" />
            {totalAlerts > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                {totalAlerts}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-1.5 w-80 bg-white border border-slate-200 rounded-lg shadow-xl py-2 z-40 text-xs">
              <div className="px-3 pb-2 border-b border-slate-100 flex items-center justify-between">
                <span className="font-bold text-slate-900">Clinical Alerts & Escalations</span>
                <span className="text-[10px] font-semibold text-slate-500">{totalAlerts} Active</span>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {emergencyPatients.length === 0 && overduePatients.length === 0 && (
                  <div className="p-4 text-center text-slate-400">
                    No active emergency alerts or overdue reviews.
                  </div>
                )}

                {emergencyPatients.map((p) => (
                  <div
                    key={`alert-em-${p.id}`}
                    onClick={() => {
                      onSelectPatient(p.id);
                      setShowNotifications(false);
                    }}
                    className="p-2.5 hover:bg-red-50/60 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-1.5 text-red-700 font-semibold">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                      <span>{p.name} ({p.id})</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-1">
                      {p.aiAssessment?.warningFlags[0]?.flag || p.incidentDescription}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-red-600 mt-1">
                      <span className="font-bold">EMERGENCY PROTOCOL</span>
                      <span>Waiting: {p.waitingDurationMinutes} min</span>
                    </div>
                  </div>
                ))}

                {overduePatients.map((p) => (
                  <div
                    key={`alert-od-${p.id}`}
                    onClick={() => {
                      onSelectPatient(p.id);
                      setShowNotifications(false);
                    }}
                    className="p-2.5 hover:bg-amber-50/60 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-1.5 text-amber-800 font-semibold">
                      <Clock className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                      <span>{p.name} ({p.id}) - Overdue</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                      <span>SLA: {p.slaMinutes}m</span>
                      <span className="text-amber-700 font-bold">Waited: {p.waitingDurationMinutes}m</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Role Switcher & Active Profile */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center space-x-2 pl-2 pr-3 py-1 bg-slate-50 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors"
          >
            <UserAvatar
              name={activeProfile.name}
              src={activeProfile.avatar}
              size="xs"
            />
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-slate-900 leading-tight">
                {activeProfile.name}
              </div>
              <div className="text-[10px] text-emerald-800 font-medium leading-none">
                {currentRole} • {activeProfile.title.split(' ')[0]}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-lg shadow-xl py-1.5 z-40 text-xs">
              <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Switch Operational Role
              </div>

              {(['NURSE', 'DOCTOR', 'ADMIN', 'PATIENT'] as UserRole[]).map((role) => {
                const prof = roleProfiles[role];
                const isSelected = currentRole === role;
                return (
                  <button
                    key={role}
                    onClick={() => {
                      setRole(role);
                      setShowRoleMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center space-x-2.5 hover:bg-slate-50 transition-colors ${
                      isSelected ? 'bg-emerald-50/60 font-semibold text-emerald-900' : 'text-slate-700'
                    }`}
                  >
                    <UserAvatar name={prof.name} src={prof.avatar} size="xs" />
                    <div className="min-w-0">
                      <div className="text-xs leading-snug">{prof.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{prof.title}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Primary Action Button */}
        {currentRole !== 'PATIENT' && (
          <button
            onClick={onOpenNewIntakeModal}
            className="flex items-center space-x-1.5 bg-[#0F2E22] hover:bg-[#164232] text-white px-3 py-1.5 rounded-md text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Patient Intake</span>
          </button>
        )}
      </div>
    </header>
  );
}
