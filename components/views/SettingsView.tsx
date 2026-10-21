'use client';

import React, { useState } from 'react';
import { 
  Settings, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  Lock, 
  FileText, 
  Search, 
  Edit2, 
  Save, 
  UserCheck, 
  AlertTriangle 
} from 'lucide-react';
import { useCareFlow } from '@/lib/store';
import { TriageRule, UrgencyCategory } from '@/types';

export function SettingsView() {
  const { rules, updateRule, auditLogs, currentRole } = useCareFlow();

  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editSla, setEditSla] = useState<number>(10);
  const [editCategory, setEditCategory] = useState<UrgencyCategory>('EMERGENCY');
  const [logSearch, setLogSearch] = useState('');

  const handleStartEdit = (rule: TriageRule) => {
    setEditingRuleId(rule.id);
    setEditSla(rule.slaMinutes);
    setEditCategory(rule.targetCategory);
  };

  const handleSaveRule = (ruleId: string) => {
    updateRule(ruleId, {
      slaMinutes: editSla,
      targetCategory: editCategory,
    });
    setEditingRuleId(null);
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (!logSearch.trim()) return true;
    const q = logSearch.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.actorName.toLowerCase().includes(q) ||
      log.entityId.toLowerCase().includes(q) ||
      (log.rationale && log.rationale.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Clinical Protocol Configuration & Regulatory Audit
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
          Clinician-configurable triage safety rules, SLA timeouts, and tamper-evident audit logs
        </p>
      </div>

      {/* Section 1: Configurable Clinical Triage Safety Rules */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-emerald-700" />
              Clinician-Approved Triage Rule Engine
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Deterministic medical rules evaluated ahead of LLM sorting. Modifying rules requires clinical director authority.
            </p>
          </div>
          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            {rules.filter(r => r.enabled).length} Active Rules
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Rule Name & Clinical Trigger</th>
                <th className="py-2.5 px-3">Category Flag</th>
                <th className="py-2.5 px-3">Assigned Severity</th>
                <th className="py-2.5 px-3">SLA Timeout</th>
                <th className="py-2.5 px-3">Protocol Status</th>
                <th className="py-2.5 px-3 text-right">Settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rules.map((rule) => {
                const isEditing = editingRuleId === rule.id;

                return (
                  <tr key={rule.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3 max-w-sm">
                      <div className="font-bold text-slate-900">{rule.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{rule.conditionDescription}</div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-bold">
                        {rule.category}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      {isEditing ? (
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value as any)}
                          className="p-1 border border-slate-300 rounded text-xs bg-white"
                        >
                          <option value="EMERGENCY">EMERGENCY</option>
                          <option value="URGENT">URGENT</option>
                          <option value="NEEDS_REVIEW">NEEDS_REVIEW</option>
                          <option value="ROUTINE">ROUTINE</option>
                        </select>
                      ) : (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          rule.targetCategory === 'EMERGENCY'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : rule.targetCategory === 'URGENT'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          {rule.targetCategory}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-slate-800">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editSla}
                          onChange={(e) => setEditSla(parseInt(e.target.value, 10))}
                          className="w-16 p-1 border border-slate-300 rounded text-xs"
                        />
                      ) : (
                        <span>{rule.slaMinutes} min</span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <button
                        onClick={() => updateRule(rule.id, { enabled: !rule.enabled })}
                        className={`px-2.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                          rule.enabled
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-slate-100 text-slate-400 border-slate-200'
                        }`}
                      >
                        {rule.enabled ? 'ACTIVE' : 'DISABLED'}
                      </button>
                    </td>

                    <td className="py-3 px-3 text-right">
                      {isEditing ? (
                        <button
                          onClick={() => handleSaveRule(rule.id)}
                          className="px-2.5 py-1 bg-[#0F2E22] text-white rounded text-xs font-bold"
                        >
                          Save
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(rule)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Clinical Audit Trail */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-700" />
              Tamper-Evident Clinical Audit Log ({auditLogs.length} Events)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              HIPAA & NABH compliant chronological trail of all clinical decisions, overrides, assignments, and approvals
            </p>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              placeholder="Search audit actions..."
              className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2 px-3">Timestamp</th>
                <th className="py-2 px-3">Clinician / Actor</th>
                <th className="py-2 px-3">Role</th>
                <th className="py-2 px-3">Action Performed</th>
                <th className="py-2 px-3">Target Entity</th>
                <th className="py-2 px-3">Previous Value ➔ New Value</th>
                <th className="py-2 px-3">Clinical Justification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 font-sans">
                    {log.actorName}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-700 font-sans font-semibold">
                      {log.actorRole}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-emerald-900 font-sans">
                    {log.action}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {log.entityType} ({log.entityId})
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">
                    {log.previousValue ? `${log.previousValue} ➔ ` : ''}
                    <strong className="text-slate-900">{log.newValue || '-'}</strong>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 font-sans text-xs max-w-xs truncate">
                    {log.rationale || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
