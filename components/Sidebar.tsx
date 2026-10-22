'use client';

import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Stethoscope, 
  Flame, 
  CalendarClock, 
  FileArchive, 
  FileText, 
  BarChart3, 
  Settings, 
  ShieldAlert,
  Building2,
  Activity,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  History
} from 'lucide-react';
import { useCareFlow } from '@/lib/store';

export type NavTab = 
  | 'overview' 
  | 'patients' 
  | 'doctors' 
  | 'triage-queue' 
  | 'assignments' 
  | 'medical-records' 
  | 'discharged-history'
  | 'reports' 
  | 'analytics' 
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { currentRole, emergencyAlertCount, patients, sidebarCollapsed, toggleSidebar } = useCareFlow();

  const activePatients = patients.filter(p => p.status !== 'DISCHARGED');
  const dischargedPatients = patients.filter(p => p.status === 'DISCHARGED');
  const waitingCount = activePatients.filter(p => p.status === 'WAITING_AI' || p.status === 'TRIAGED').length;

  const navItems = [
    {
      id: 'overview' as NavTab,
      label: 'Overview',
      icon: LayoutDashboard,
      roles: ['NURSE', 'DOCTOR', 'ADMIN', 'PATIENT'],
    },
    {
      id: 'patients' as NavTab,
      label: 'Active Patients',
      icon: Users,
      badge: activePatients.length,
      roles: ['NURSE', 'DOCTOR', 'ADMIN'],
    },
    {
      id: 'discharged-history' as NavTab,
      label: 'Patient History',
      icon: History,
      badge: dischargedPatients.length > 0 ? dischargedPatients.length : undefined,
      roles: ['NURSE', 'DOCTOR', 'ADMIN', 'PATIENT'],
    },
    {
      id: 'doctors' as NavTab,
      label: 'Doctor Dashboard',
      icon: Stethoscope,
      roles: ['DOCTOR', 'ADMIN'],
    },
    {
      id: 'triage-queue' as NavTab,
      label: 'Triage Queue',
      icon: Flame,
      badge: waitingCount,
      alertBadge: emergencyAlertCount > 0 ? emergencyAlertCount : undefined,
      roles: ['NURSE', 'DOCTOR', 'ADMIN'],
    },
    {
      id: 'assignments' as NavTab,
      label: 'Assignments & Matching',
      icon: CalendarClock,
      roles: ['NURSE', 'DOCTOR', 'ADMIN'],
    },
    {
      id: 'medical-records' as NavTab,
      label: 'Medical Records',
      icon: FileArchive,
      roles: ['NURSE', 'DOCTOR', 'ADMIN', 'PATIENT'],
    },
    {
      id: 'reports' as NavTab,
      label: 'Reports & Export',
      icon: FileText,
      roles: ['NURSE', 'DOCTOR', 'ADMIN', 'PATIENT'],
    },
    {
      id: 'analytics' as NavTab,
      label: 'Analytics',
      icon: BarChart3,
      roles: ['ADMIN', 'DOCTOR'],
    },
    {
      id: 'settings' as NavTab,
      label: 'Settings & Rules',
      icon: Settings,
      roles: ['ADMIN'],
    },
  ];

  const visibleItems = navItems.filter((item) => item.roles.includes(currentRole));

  return (
    <aside
      className={`relative bg-[#091D16] text-slate-100 flex flex-col shrink-0 select-none border-r border-[#153D2F]/80 h-screen sticky top-0 transition-all duration-300 ease-in-out z-20 ${
        sidebarCollapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Brand & Hospital Banner with Slider Toggle */}
      <div className={`border-b border-[#153D2F]/80 ${sidebarCollapsed ? 'p-3 flex flex-col items-center' : 'p-4'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400/20 to-teal-500/10 border border-emerald-400/40 flex items-center justify-center text-emerald-300 font-black shadow-lg shadow-emerald-950/40 shrink-0">
              <Activity className="w-5 h-5 text-emerald-300 animate-pulse" />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5 truncate">
                  CareFlow{' '}
                  <span className="text-emerald-400 font-black text-[11px] px-1.5 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-700/60 shadow-xs">
                    AI
                  </span>
                </h1>
                <p className="text-[11px] text-emerald-300/75 font-medium leading-none mt-0.5 truncate">
                  Triage Decision Support
                </p>
              </div>
            )}
          </div>

          {/* Sidebar Slider Collapse / Expand Button */}
          {!sidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg text-emerald-300/70 hover:text-white hover:bg-[#12382B] transition-colors"
              title="Slide sidebar to increase workspace"
              aria-label="Slide to collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Collapsed Mode Expand Button */}
        {sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="mt-3 p-1.5 rounded-lg text-emerald-300/80 hover:text-white hover:bg-[#12382B] transition-colors"
            title="Slide to expand sidebar"
            aria-label="Slide to expand sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}

        {/* Facility Indicator */}
        {!sidebarCollapsed && (
          <div className="mt-3 px-2.5 py-1.5 rounded-lg bg-[#061711] border border-[#133A2C] flex items-center justify-between text-[11px] text-emerald-300">
            <div className="flex items-center space-x-1.5 truncate">
              <Building2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              <span className="truncate font-semibold text-emerald-200">Apex Trauma Center</span>
            </div>
            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded-md bg-emerald-900/90 text-emerald-300 font-mono font-bold tracking-wider">
              LIVE
            </span>
          </div>
        )}
      </div>

      {/* Emergency Alert Banner if active */}
      {emergencyAlertCount > 0 && (
        <div
          className={`mx-2.5 mt-3 rounded-lg border transition-all ${
            sidebarCollapsed
              ? 'p-2 bg-red-950/90 border-red-700 text-center flex flex-col items-center justify-center'
              : 'p-2.5 bg-red-950/80 border-red-700/70 text-red-100 flex items-center justify-between text-xs'
          } animate-pulse-slow shadow-lg shadow-red-950/50`}
        >
          {sidebarCollapsed ? (
            <button
              onClick={() => setActiveTab('triage-queue')}
              title={`${emergencyAlertCount} Stat Emergency Cases - Click to Review`}
              className="relative p-1"
            >
              <ShieldAlert className="w-5 h-5 text-red-400" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white font-bold text-[9px] flex items-center justify-center">
                {emergencyAlertCount}
              </span>
            </button>
          ) : (
            <>
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                <span className="font-bold tracking-tight">{emergencyAlertCount} Stat Emergency</span>
              </div>
              <button
                onClick={() => setActiveTab('triage-queue')}
                className="text-[11px] font-bold text-red-300 hover:text-white underline"
              >
                Review
              </button>
            </>
          )}
        </div>
      )}

      {/* Navigation List */}
      <nav className={`flex-1 space-y-1.5 overflow-y-auto ${sidebarCollapsed ? 'px-2 py-4' : 'px-3 py-4'}`}>
        {!sidebarCollapsed && (
          <div className="px-3 pb-1 text-[10px] font-black uppercase tracking-wider text-emerald-400/60">
            Clinical Operations
          </div>
        )}
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={sidebarCollapsed ? item.label : undefined}
              className={`w-full group relative flex items-center rounded-xl transition-all ${
                sidebarCollapsed
                  ? 'justify-center py-2.5 px-0'
                  : 'justify-between px-3 py-2.5 text-xs'
              } font-medium ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-600/30 to-teal-600/20 text-white font-bold border border-emerald-500/40 shadow-md shadow-emerald-950/30'
                  : 'text-emerald-100/75 hover:bg-[#12382B] hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? 'text-emerald-300 drop-shadow' : 'text-emerald-300/70'
                  }`}
                />
                {!sidebarCollapsed && (
                  <span className="truncate tracking-tight font-medium text-slate-100">
                    {item.label}
                  </span>
                )}
              </div>

              {/* Badges in Expanded Mode */}
              {!sidebarCollapsed && (
                <div className="flex items-center space-x-1 shrink-0">
                  {item.alertBadge !== undefined && (
                    <span className="px-1.5 py-0.5 text-[10px] font-black rounded-full bg-red-600 text-white shadow-xs">
                      {item.alertBadge}
                    </span>
                  )}
                  {item.badge !== undefined && (
                    <span
                      className={`px-2 py-0.5 text-[10px] rounded-md font-bold ${
                        isActive
                          ? 'bg-emerald-800/90 text-emerald-100 border border-emerald-600/60'
                          : 'bg-[#061711] text-emerald-300 border border-[#133A2C]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}

              {/* Alert Indicator Dot in Collapsed Mode */}
              {sidebarCollapsed && item.alertBadge !== undefined && (
                <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-red-500 animate-ping" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Human-in-the-Loop Protocol Footer */}
      <div className={`border-t border-[#153D2F]/80 bg-[#061711]/90 ${sidebarCollapsed ? 'p-3 flex justify-center' : 'p-3.5 text-[11px] text-emerald-300/75 leading-relaxed'}`}>
        {sidebarCollapsed ? (
          <div title="Human-in-the-Loop Protocol: Provisional AI triage requires clinician sign-off">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1.5 font-bold text-emerald-200 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Human-in-the-Loop Protocol
            </div>
            <p className="text-[10px] text-emerald-300/70 leading-normal">
              AI provides provisional triage ranking. All diagnoses & treatments require clinician sign-off.
            </p>
          </>
        )}
      </div>

      {/* Dedicated Visual Sidebar Slider Toggle Pill */}
      <button
        type="button"
        onClick={toggleSidebar}
        title={sidebarCollapsed ? "Slide to expand sidebar" : "Slide to collapse sidebar & increase workspace"}
        aria-label="Toggle sidebar width"
        className="absolute top-1/2 -translate-y-1/2 -right-3.5 z-30 w-7 h-7 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-950/40 border-2 border-[#091D16] transition-transform hover:scale-110 active:scale-95"
      >
        {sidebarCollapsed ? (
          <ChevronRight className="w-4 h-4 text-white" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-white" />
        )}
      </button>

      {/* Interactive slider edge hover zone */}
      <div
        onClick={toggleSidebar}
        title={sidebarCollapsed ? "Click to expand sidebar" : "Click to collapse sidebar"}
        className="absolute top-0 right-0 w-2 h-full hover:bg-emerald-400/30 cursor-pointer transition-colors"
      />
    </aside>
  );
}
