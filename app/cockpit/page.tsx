'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { buildCockpitState, sendApprovedEmail, handleLinkedInApproval, setupKeyboardShortcuts, updateTabTitle, pushActivity, generateMissingMessages, generateAIMessage, fmtEur, fmtDuration } from '@/lib/command/cockpit-engine';
import type { CockpitState, ApprovalItem, CockpitBrief } from '@/lib/command/cockpit-engine';
import { loadAccounts, saveAccounts } from '@/lib/command/store';
import { calcHeatScore } from '@/lib/command/hot-queue';
import { selectTodayStrategy, buildSearchParams, processApolloResults, updateBotMemory, getBotDashboard, scoreProspect, detectTimingFromApollo } from '@/lib/command/apollo-bot';
import type { ApolloProspect, HuntStrategy } from '@/lib/command/apollo-bot';
import type { Account } from '@/types/command';
import { CLAIMS } from '@/lib/claims';

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

:root {
  --bg: #05060E;
  --s1: #07081A;
  --s2: #090A1E;
  --s3: #0C0E24;
  --bd: rgba(255, 255, 255, 0.07);
  --bds: rgba(255, 255, 255, 0.13);
  --bdh: rgba(255, 255, 255, 0.18);
  --t1: rgba(255, 255, 255, 0.94);
  --t2: rgba(255, 255, 255, 0.55);
  --t3: rgba(255, 255, 255, 0.28);
  --t4: rgba(255, 255, 255, 0.10);
  --red: #E5354A;
  --cyan: #00CFC4;
  --gold: #F0A500;
  --grn: #00C98D;
  --vio: #8B5CF6;
  --blue: #3B82F6;
  --teal: #14B8A6;
  --disp: 'Bebas Neue', sans-serif;
  --body: 'Inter', system-ui, sans-serif;
  --mono: 'JetBrains Mono', monospace;
  --nav: 56px;
  --src: 260px;
  --act: 300px;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

body {
  background: var(--bg);
  color: var(--t1);
  font-family: var(--body);
  font-size: 14px;
  line-height: 1.5;
}

.cockpit-grain {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  opacity: 0.03;
  z-index: 1;
  background-image: url('data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="grain"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise" /%3E%3C/filter%3E%3Crect width="100" height="100" filter="url(%23grain)" opacity="1" /%3E%3C/svg%3E');
  background-size: 100px 100px;
}

.cockpit-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  flex-direction: column;
  background: var(--bg);
  position: relative;
}

.cockpit-topbar {
  height: 52px;
  background: var(--s1);
  border-bottom: 1px solid var(--bd);
  display: flex;
  align-items: center;
  padding: 0 20px;
  justify-content: space-between;
  z-index: 100;
}

.cockpit-kpis {
  display: flex;
  gap: 30px;
  flex: 1;
}

.cockpit-kpi {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cockpit-kpi-label {
  font-size: 11px;
  color: var(--t3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.cockpit-kpi-value {
  font-family: var(--disp);
  font-size: 20px;
  font-weight: 700;
  color: var(--t1);
  letter-spacing: -0.02em;
}

/* V3 Topbar classes */
.tb-stat { display: flex; align-items: baseline; gap: 5px; padding: 0 18px; border-right: 1px solid var(--bd); cursor: default; }
.tb-stat:hover { background: rgba(255,255,255,.02); }
.ts-val { font-family: var(--disp); font-size: 20px; letter-spacing: .03em; line-height: 1; }
.ts-lbl { font-family: var(--mono); font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--t3); }
.tb-btn { padding: 5px 12px; border-radius: 5px; border: 1px solid var(--bd); font-family: var(--mono); font-size: 12px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--t2); background: transparent; cursor: pointer; transition: all 140ms; }
.tb-btn:hover { border-color: var(--bds); color: var(--t1); }
.tb-btn.primary { border-color: var(--cyan); color: var(--cyan); }
.tb-btn.primary:hover { background: rgba(0,207,196,.08); }
.tb-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Nav badge (red notification dot) */
.nav-badge { position: absolute; top: 6px; right: 6px; width: 7px; height: 7px; border-radius: 50%; background: var(--red); border: 1.5px solid var(--s1); }

.cockpit-sync {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(0, 207, 196, 0.1);
  border: 1px solid var(--cyan);
  border-radius: 4px;
  font-size: 12px;
  color: var(--cyan);
}

.cockpit-sync-pulse {
  width: 6px;
  height: 6px;
  background: var(--cyan);
  border-radius: 50%;
  animation: pulse-grn 2s infinite;
}

@keyframes pulse-grn {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

@keyframes fill-bar {
  from { width: 0; }
  to { width: 100%; }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes pulse-node {
  0%, 100% { r: 4px; }
  50% { r: 6px; }
}

@keyframes spin-ring {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.cockpit-topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cockpit-btn-primary {
  padding: 8px 14px;
  background: var(--grn);
  border: none;
  border-radius: 4px;
  color: var(--bg);
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.cockpit-btn-primary:hover {
  background: #00b383;
}

.cockpit-mode-toggle {
  padding: 6px 12px;
  background: var(--s2);
  border: 1px solid var(--bd);
  border-radius: 4px;
  color: var(--t2);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.cockpit-mode-toggle.active {
  background: var(--vio);
  color: white;
  border-color: var(--vio);
}

.cockpit-main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.cockpit-sidebar {
  width: var(--nav);
  background: var(--s1);
  border-right: 1px solid var(--bd);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  gap: 12px;
}

.cockpit-nav-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--t3);
  font-size: 18px;
  position: relative;
}

.cockpit-nav-icon:hover {
  color: var(--t2);
  background: rgba(255,255,255,.04);
}

.cockpit-nav-icon.active {
  color: var(--cyan);
  background: rgba(0,207,196,.08);
  border: 1px solid rgba(0,207,196,.15);
}

.cockpit-view {
  flex: 1;
  display: none;
  overflow: hidden;
  flex-direction: row;
}

.cockpit-view.active {
  display: flex;
}

.cockpit-view-cockpit {
  flex: 1;
  display: flex;
  gap: 1px;
  background: var(--bg);
  width: 100%;
}

.cockpit-source-panel {
  width: var(--src);
  background: var(--s1);
  border-right: 1px solid var(--bd);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.cockpit-source-header {
  padding: 12px;
  border-bottom: 1px solid var(--bd);
}

.cockpit-source-search {
  width: 100%;
  padding: 8px 10px;
  background: var(--s2);
  border: 1px solid var(--bd);
  border-radius: 4px;
  color: var(--t1);
  font-family: var(--body);
  font-size: 12px;
}

.cockpit-source-search::placeholder {
  color: var(--t3);
}

.cockpit-source-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 8px;
  border-bottom: 1px solid var(--bd);
  overflow-x: auto;
  scrollbar-width: none;
}

.cockpit-source-tabs::-webkit-scrollbar {
  display: none;
}

.cockpit-source-tab {
  padding: 6px 10px;
  background: transparent;
  border: 1px solid var(--bd);
  border-radius: 3px;
  color: var(--t3);
  font-size: 10px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.cockpit-source-tab:hover {
  border-color: var(--bds);
}

.cockpit-source-tab.active {
  background: var(--vio);
  border-color: var(--vio);
  color: white;
}

.cockpit-leads {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  gap: 8px;
  display: flex;
  flex-direction: column;
}

.cockpit-leads::-webkit-scrollbar {
  width: 3px;
}

.cockpit-leads::-webkit-scrollbar-track {
  background: transparent;
}

.cockpit-leads::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.cockpit-lead-item {
  padding: 10px;
  background: var(--s2);
  border: 1px solid var(--bd);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.cockpit-lead-item:hover {
  background: var(--s3);
  border-color: var(--bds);
}

.cockpit-lead-item.active {
  background: var(--vio);
  border-color: var(--vio);
}

.cockpit-heat-ring {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  position: relative;
}

.cockpit-heat-ring-circle {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
}

.cockpit-heat-ring-circle.heat-cold {
  border-color: var(--t3);
  color: var(--t3);
}

.cockpit-heat-ring-circle.heat-warm {
  border-color: var(--gold);
  color: var(--gold);
}

.cockpit-heat-ring-circle.heat-hot {
  border-color: var(--red);
  color: var(--red);
}

.cockpit-lead-info {
  flex: 1;
  min-width: 0;
}

.cockpit-lead-company {
  font-weight: 600;
  font-size: 13px;
  color: var(--t1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cockpit-lead-meta {
  font-size: 11px;
  color: var(--t3);
  margin-top: 2px;
}

.cockpit-detail-panel {
  flex: 1;
  background: var(--s1);
  border-right: 1px solid var(--bd);
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.cockpit-detail-panel::-webkit-scrollbar {
  width: 3px;
}

.cockpit-detail-panel::-webkit-scrollbar-track {
  background: transparent;
}

.cockpit-detail-panel::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.cockpit-detail-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--bd);
}

.cockpit-avatar {
  width: 48px;
  height: 48px;
  background: var(--vio);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 18px;
  flex-shrink: 0;
}

.cockpit-header-info {
  flex: 1;
}

.cockpit-company-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--t1);
}

.cockpit-company-domain {
  font-size: 12px;
  color: var(--t3);
  margin-top: 2px;
  font-family: var(--mono);
}

.cockpit-detail-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cockpit-detail-title {
  font-size: 11px;
  color: var(--t3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.cockpit-detail-content {
  font-size: 13px;
  color: var(--t1);
  line-height: 1.6;
}

.cockpit-pipeline-container {
  margin-top: 12px;
}

.cockpit-pipeline-node {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  position: relative;
}

.cockpit-pipeline-node::before {
  content: '';
  width: 1px;
  height: 20px;
  background: var(--bd);
  position: absolute;
  left: 7px;
  top: 16px;
}

.cockpit-pipeline-node:last-child::before {
  display: none;
}

.cockpit-pipeline-dot {
  width: 16px;
  height: 16px;
  background: var(--s2);
  border: 2px solid var(--bd);
  border-radius: 50%;
  position: relative;
  z-index: 1;
}

.cockpit-pipeline-dot.active {
  background: var(--cyan);
  border-color: var(--cyan);
  animation: pulse-node 1.5s infinite;
}

.cockpit-pipeline-label {
  margin-left: 12px;
  font-size: 12px;
  color: var(--t2);
}

.cockpit-bant-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 12px;
}

.cockpit-bant-item {
  padding: 10px;
  background: var(--s2);
  border: 1px solid var(--bd);
  border-radius: 4px;
}

.cockpit-bant-label {
  font-size: 10px;
  color: var(--t3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.cockpit-bant-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--t1);
  margin-top: 4px;
  font-family: var(--disp);
}

.cockpit-bant-bar {
  width: 100%;
  height: 4px;
  background: var(--s3);
  border-radius: 2px;
  margin-top: 6px;
  overflow: hidden;
}

.cockpit-bant-fill {
  height: 100%;
  background: var(--grn);
  animation: fill-bar 0.8s ease-out;
}

.cockpit-apollo-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
}

.cockpit-apollo-item {
  padding: 8px;
  background: var(--s2);
  border: 1px solid var(--bd);
  border-radius: 4px;
  font-size: 12px;
}

.cockpit-apollo-label {
  color: var(--t3);
  font-size: 10px;
  margin-bottom: 4px;
}

.cockpit-apollo-value {
  color: var(--t1);
  font-weight: 600;
}

.cockpit-timeline {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cockpit-timeline-event {
  display: flex;
  gap: 12px;
  padding: 8px 0;
  position: relative;
}

.cockpit-timeline-dot {
  width: 8px;
  height: 8px;
  background: var(--cyan);
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
}

.cockpit-timeline-content {
  flex: 1;
  font-size: 12px;
}

.cockpit-timeline-text {
  color: var(--t1);
}

.cockpit-timeline-time {
  color: var(--t3);
  font-size: 11px;
  margin-top: 2px;
}

.cockpit-contact-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.cockpit-contact-card {
  padding: 10px;
  background: var(--s2);
  border: 1px solid var(--bd);
  border-radius: 4px;
}

.cockpit-contact-name {
  font-weight: 600;
  font-size: 13px;
  color: var(--t1);
}

.cockpit-contact-title {
  font-size: 11px;
  color: var(--t3);
  margin-top: 2px;
}

.cockpit-contact-email {
  font-size: 11px;
  color: var(--cyan);
  margin-top: 4px;
  font-family: var(--mono);
}

.cockpit-action-panel {
  width: var(--act);
  background: var(--s1);
  border-left: 1px solid var(--bd);
  padding: 20px 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cockpit-action-panel::-webkit-scrollbar {
  width: 3px;
}

.cockpit-action-panel::-webkit-scrollbar-track {
  background: transparent;
}

.cockpit-action-panel::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.cockpit-action-label {
  font-size: 10px;
  color: var(--t3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.cockpit-action-value {
  font-size: 12px;
  color: var(--t2);
}

.cockpit-sequence-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cockpit-sequence-step {
  padding: 8px;
  background: var(--s2);
  border-left: 3px solid var(--bd);
  border-radius: 2px;
  font-size: 11px;
  color: var(--t2);
}

.cockpit-sequence-step.first {
  border-left-color: var(--grn);
}

.cockpit-sequence-step.sending {
  border-left-color: var(--cyan);
}

.cockpit-message-preview {
  padding: 10px;
  background: var(--s2);
  border: 1px solid var(--bd);
  border-radius: 4px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--t2);
  max-height: 140px;
  overflow-y: auto;
}

.cockpit-message-preview::-webkit-scrollbar {
  width: 3px;
}

.cockpit-message-preview::-webkit-scrollbar-track {
  background: transparent;
}

.cockpit-message-preview::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.cockpit-channel-selector {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cockpit-channel-btn {
  padding: 8px;
  background: var(--s2);
  border: 1px solid var(--bd);
  border-radius: 4px;
  color: var(--t2);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.cockpit-channel-btn:hover {
  background: var(--s3);
  border-color: var(--bds);
}

.cockpit-channel-btn.active {
  background: var(--cyan);
  color: var(--bg);
  border-color: var(--cyan);
}

.cockpit-apollo-view {
  flex: 1;
  display: flex;
  gap: 1px;
  background: var(--bg);
}

.cockpit-apollo-filters {
  width: 280px;
  background: var(--s1);
  border-right: 1px solid var(--bd);
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cockpit-apollo-filters::-webkit-scrollbar {
  width: 3px;
}

.cockpit-apollo-filters::-webkit-scrollbar-track {
  background: transparent;
}

.cockpit-apollo-filters::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.cockpit-filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cockpit-filter-label {
  font-size: 10px;
  color: var(--t3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.cockpit-filter-toggle {
  display: flex;
  gap: 4px;
}

.cockpit-toggle-btn {
  flex: 1;
  padding: 6px;
  background: var(--s2);
  border: 1px solid var(--bd);
  border-radius: 3px;
  color: var(--t3);
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.cockpit-toggle-btn.active {
  background: var(--vio);
  border-color: var(--vio);
  color: white;
}

.cockpit-filter-input {
  padding: 8px 10px;
  background: var(--s2);
  border: 1px solid var(--bd);
  border-radius: 4px;
  color: var(--t1);
  font-family: var(--body);
  font-size: 12px;
}

.cockpit-filter-input::placeholder {
  color: var(--t3);
}

.cockpit-filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.cockpit-filter-tag {
  padding: 4px 8px;
  background: var(--vio);
  border-radius: 3px;
  font-size: 10px;
  color: white;
  display: flex;
  align-items: center;
  gap: 4px;
}

.cockpit-filter-tag-remove {
  cursor: pointer;
  opacity: 0.7;
}

.cockpit-filter-tag-remove:hover {
  opacity: 1;
}

.cockpit-apollo-results {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.cockpit-apollo-results::-webkit-scrollbar {
  width: 3px;
}

.cockpit-apollo-results::-webkit-scrollbar-track {
  background: transparent;
}

.cockpit-apollo-results::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.cockpit-apollo-card {
  padding: 12px;
  background: var(--s2);
  border: 1px solid var(--bd);
  border-radius: 6px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.cockpit-apollo-card:hover {
  background: var(--s3);
  border-color: var(--bds);
}

.cockpit-apollo-card-company {
  font-weight: 600;
  font-size: 13px;
  color: var(--t1);
}

.cockpit-apollo-card-info {
  font-size: 11px;
  color: var(--t3);
  margin-top: 4px;
}

.cockpit-apollo-card-tag {
  display: inline-block;
  padding: 2px 6px;
  background: rgba(0, 207, 196, 0.2);
  border: 1px solid var(--cyan);
  border-radius: 2px;
  font-size: 9px;
  color: var(--cyan);
  margin-top: 6px;
}

.cockpit-sequences-view {
  flex: 1;
  display: flex;
  gap: 1px;
  background: var(--bg);
}

.cockpit-sequences-list {
  flex: 1;
  background: var(--s1);
  border-right: 1px solid var(--bd);
  overflow-y: auto;
  padding: 16px;
}

.cockpit-sequences-list::-webkit-scrollbar {
  width: 3px;
}

.cockpit-sequences-list::-webkit-scrollbar-track {
  background: transparent;
}

.cockpit-sequences-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.cockpit-sequence-item {
  padding: 12px;
  background: var(--s2);
  border: 1px solid var(--bd);
  border-radius: 6px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.cockpit-sequence-item:hover {
  background: var(--s3);
  border-color: var(--bds);
}

.cockpit-sequence-item.active {
  background: var(--vio);
  border-color: var(--vio);
}

.cockpit-sequence-name {
  font-weight: 600;
  font-size: 13px;
  color: var(--t1);
}

.cockpit-sequence-meta {
  font-size: 11px;
  color: var(--t3);
  margin-top: 4px;
}

.cockpit-analytics-strip {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: var(--s2);
  border: 1px solid var(--bd);
  border-radius: 6px;
  margin-bottom: 12px;
}

.cockpit-analytics-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.cockpit-analytics-value {
  font-family: var(--disp);
  font-size: 18px;
  font-weight: 700;
  color: var(--cyan);
}

.cockpit-analytics-label {
  font-size: 10px;
  color: var(--t3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.cockpit-linkedin-view {
  flex: 1;
  display: grid;
  grid-template-columns: 260px 1fr 270px;
  gap: 1px;
  background: var(--bg);
  overflow: hidden;
}

.cockpit-linkedin-calendar {
  background: var(--s1);
  border-right: 1px solid var(--bd);
  padding: 16px;
  overflow-y: auto;
}

.cockpit-linkedin-calendar::-webkit-scrollbar {
  width: 3px;
}

.cockpit-linkedin-calendar::-webkit-scrollbar-track {
  background: transparent;
}

.cockpit-linkedin-calendar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.cockpit-calendar-title {
  font-size: 11px;
  color: var(--t3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
  font-weight: 600;
}

.cockpit-calendar-day {
  padding: 8px;
  margin-bottom: 4px;
  background: var(--s2);
  border: 1px solid var(--bd);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.cockpit-calendar-day:hover {
  background: var(--s3);
  border-color: var(--bds);
}

.cockpit-calendar-day.active {
  background: var(--vio);
  border-color: var(--vio);
  color: white;
}

.cockpit-linkedin-editor {
  background: var(--s1);
  border-right: 1px solid var(--bd);
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cockpit-linkedin-editor::-webkit-scrollbar {
  width: 3px;
}

.cockpit-linkedin-editor::-webkit-scrollbar-track {
  background: transparent;
}

.cockpit-linkedin-editor::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.cockpit-editor-label {
  font-size: 10px;
  color: var(--t3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.cockpit-editor-input {
  padding: 10px;
  background: var(--s2);
  border: 1px solid var(--bd);
  border-radius: 4px;
  color: var(--t1);
  font-family: var(--body);
  font-size: 12px;
  resize: vertical;
  min-height: 80px;
}

.cockpit-editor-input::placeholder {
  color: var(--t3);
}

.cockpit-linkedin-intelligence {
  background: var(--s1);
  border-left: 1px solid var(--bd);
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cockpit-linkedin-intelligence::-webkit-scrollbar {
  width: 3px;
}

.cockpit-linkedin-intelligence::-webkit-scrollbar-track {
  background: transparent;
}

.cockpit-linkedin-intelligence::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.cockpit-intel-box {
  padding: 10px;
  background: var(--s2);
  border: 1px solid var(--bd);
  border-radius: 4px;
}

.cockpit-intel-title {
  font-size: 10px;
  color: var(--t3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
  margin-bottom: 6px;
}

.cockpit-intel-metric {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.cockpit-intel-value {
  font-family: var(--disp);
  font-size: 16px;
  font-weight: 700;
  color: var(--cyan);
}

.cockpit-intel-unit {
  font-size: 11px;
  color: var(--t3);
}

.cockpit-intel-ring {
  width: 120px;
  height: 120px;
  margin: 12px auto;
  position: relative;
}

.cockpit-intel-ring-circle {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: spin-ring 20s linear infinite;
}

.cockpit-intel-ring-circle.ring-outer {
  border-color: var(--red);
}

.cockpit-intel-ring-circle.ring-middle {
  border-color: var(--gold);
  width: 80%;
  height: 80%;
  top: 10%;
  left: 10%;
}

.cockpit-intel-ring-circle.ring-inner {
  border-color: var(--cyan);
  width: 60%;
  height: 60%;
  top: 20%;
  left: 20%;
}

.cockpit-intel-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 2;
  font-size: 13px;
  font-weight: 700;
  color: var(--cyan);
}

.cockpit-settings-view {
  flex: 1;
  background: var(--s1);
  overflow-y: auto;
  padding: 20px;
}

.cockpit-settings-view::-webkit-scrollbar {
  width: 3px;
}

.cockpit-settings-view::-webkit-scrollbar-track {
  background: transparent;
}

.cockpit-settings-view::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.cockpit-settings-section {
  margin-bottom: 32px;
}

.cockpit-settings-heading {
  font-size: 13px;
  font-weight: 700;
  color: var(--t1);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--bd);
}

.cockpit-mode-pills {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.cockpit-mode-pill {
  padding: 8px 14px;
  background: var(--s2);
  border: 1px solid var(--bd);
  border-radius: 20px;
  color: var(--t2);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.cockpit-mode-pill:hover {
  background: var(--s3);
  border-color: var(--bds);
}

.cockpit-mode-pill.active {
  background: var(--vio);
  border-color: var(--vio);
  color: white;
}

.cockpit-bot-dashboard {
  padding: 12px;
  background: var(--s2);
  border: 1px solid var(--bd);
  border-radius: 6px;
  margin-bottom: 12px;
}

.cockpit-dashboard-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 12px;
}

.cockpit-dashboard-label {
  color: var(--t3);
}

.cockpit-dashboard-value {
  color: var(--t1);
  font-weight: 600;
}

.cockpit-credit-bar {
  width: 100%;
  height: 8px;
  background: var(--s3);
  border-radius: 4px;
  overflow: hidden;
  margin-top: 8px;
}

.cockpit-credit-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--cyan), var(--vio));
  width: 65%;
}

.cockpit-system-status {
  padding: 12px;
  background: var(--s2);
  border: 1px solid var(--bd);
  border-radius: 6px;
}

.cockpit-status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 12px;
}

.cockpit-status-dot {
  width: 6px;
  height: 6px;
  background: var(--grn);
  border-radius: 50%;
  animation: pulse-grn 2s infinite;
}

.cockpit-status-label {
  color: var(--t2);
}

.cockpit-hunt-bar {
  height: 3px;
  background: var(--s2);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 8px;
  position: relative;
}

.cockpit-hunt-progress {
  height: 100%;
  background: var(--cyan);
  animation: fill-bar 1.2s ease-out;
}

.cockpit-hunt-loading {
  height: 100%;
  background: var(--gold);
  animation: fill-bar 0.6s ease-out;
}

.cockpit-hunt-success {
  height: 100%;
  background: var(--grn);
  animation: fill-bar 0.8s ease-out;
  opacity: 0;
  animation: fill-bar 0.8s ease-out, fade-in 0.3s ease-out;
}

.cockpit-empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--t3);
  text-align: center;
  font-size: 13px;
  padding: 40px 20px;
}

.cockpit-approval-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
}

.cockpit-approval-overlay.active {
  opacity: 1;
  pointer-events: all;
}

.cockpit-approval-card {
  background: var(--s1);
  border: 1px solid var(--bd);
  border-radius: 12px;
  padding: 40px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: fade-in 0.4s ease-out;
}

.cockpit-approval-card::-webkit-scrollbar {
  width: 4px;
}

.cockpit-approval-card::-webkit-scrollbar-track {
  background: transparent;
}

.cockpit-approval-card::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.cockpit-approval-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--bd);
}

.cockpit-approval-heat {
  width: 80px;
  height: 80px;
  flex-shrink: 0;
}

.cockpit-approval-title {
  flex: 1;
}

.cockpit-approval-company {
  font-size: 20px;
  font-weight: 700;
  color: var(--t1);
}

.cockpit-approval-domain {
  font-size: 12px;
  color: var(--t3);
  margin-top: 4px;
  font-family: var(--mono);
}

.cockpit-approval-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.cockpit-approval-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cockpit-approval-section-title {
  font-size: 11px;
  color: var(--t3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.cockpit-approval-section-value {
  font-size: 13px;
  color: var(--t1);
  line-height: 1.6;
}

.cockpit-approval-message-box {
  padding: 12px;
  background: var(--s2);
  border: 1px solid var(--bd);
  border-radius: 6px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--t1);
  font-family: var(--mono);
  line-height: 1.5;
}

.cockpit-approval-actions {
  display: flex;
  gap: 12px;
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid var(--bd);
}

.cockpit-approval-btn {
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.cockpit-approval-btn-approve {
  background: var(--grn);
  color: var(--bg);
}

.cockpit-approval-btn-approve:hover {
  background: #00b383;
}

.cockpit-approval-btn-skip {
  background: var(--s2);
  border: 1px solid var(--bd);
  color: var(--t2);
}

.cockpit-approval-btn-skip:hover {
  background: var(--s3);
  border-color: var(--bds);
}

.cockpit-approval-footer {
  font-size: 11px;
  color: var(--t3);
  text-align: center;
  margin-top: 16px;
}

/* View transition animations */
.cockpit-view {
  animation: viewFadeIn 0.3s ease-in-out;
}

@keyframes viewFadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Completed pipeline stage indicator */
.cockpit-pipeline-dot.done {
  background: var(--grn);
  box-shadow: 0 0 8px rgba(0, 201, 141, 0.4);
  animation: pulse-grn 2s infinite;
}
`;

interface AppState {
  view: 'cockpit' | 'apollo' | 'sequences' | 'linkedin' | 'settings';
  selectedAccount?: Account;
  cockpitState?: CockpitState;
  apollo: {
    societyToggle: 'companies' | 'people';
    searchQuery: string;
    results: ApolloProspect[];
    selectedProspect?: ApolloProspect;
  };
  sequences: {
    selectedSequence?: string;
  };
  linkedin: {
    selectedDay?: string;
    postText: {
      accroche: string;
      corps: string;
      hashtags: string;
    };
  };
  approvalItem?: ApprovalItem;
  approvalOpen: boolean;
}

export default function CockpitPage() {
  const [appState, setAppState] = useState<AppState>({
    view: 'cockpit',
    cockpitState: undefined,
    apollo: {
      societyToggle: 'companies',
      searchQuery: '',
      results: [],
    },
    sequences: {},
    linkedin: {
      postText: {
        accroche: '',
        corps: '',
        hashtags: '',
      },
    },
    approvalOpen: false,
  });

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [huntLoading, setHuntLoading] = useState(false);
  const [huntSuccess, setHuntSuccess] = useState(false);

  // Apollo Bot state
  const [todayStrategy, setTodayStrategy] = useState<HuntStrategy>(() => selectTodayStrategy());
  const [todayDescription, setTodayDescription] = useState(() => buildSearchParams(selectTodayStrategy()).description);
  const [lastHuntResults, setLastHuntResults] = useState<ApolloProspect[]>([]);
  const [botDashboard, setBotDashboard] = useState(() => getBotDashboard());
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceTab, setSourceTab] = useState('all');
  const [displayedLeads, setDisplayedLeads] = useState(15);
  const leadsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const loaded = await loadAccounts();
      setAccounts(loaded);
      const cockpitData = buildCockpitState();
      setAppState(prev => {
        const next = { ...prev, cockpitState: cockpitData, selectedAccount: loaded.length > 0 ? loaded[0] : null };
        return next as any;
      });
    };
    init();

    const handleApproveKey = () => {};
    const handleSkipKey = () => {};
    const handleEscapeKey = () => setAppState(prev => ({ ...prev, approvalOpen: false }));

    const unsubscribe = setupKeyboardShortcuts(handleApproveKey, handleSkipKey, handleEscapeKey);
    return () => unsubscribe?.();
  }, []);

  // Apollo Bot — Prospecter button handler
  const handleProspecter = useCallback(async () => {
    if (huntLoading) return;
    setHuntLoading(true);
    pushActivity('🔍', `Chasse Apollo : ${todayStrategy.replace(/_/g, ' ')}`);
    try {
      const strategy = todayStrategy;
      const { apolloParams } = buildSearchParams(strategy);
      const res = await fetch(`/api/command/auto-pipeline?strategy=${strategy}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apolloParams),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      const people = data.people || data.results || [];
      const dashboard = getBotDashboard();
      const prospects = processApolloResults(people, strategy, {
        totalHunts: dashboard.totalHunts,
        totalProspectsFound: dashboard.totalProspectsFound,
        creditsUsedThisMonth: dashboard.creditsUsedThisMonth,
        creditsResetDate: '',
        strategyStats: {} as any,
        domainsAlreadyHunted: [],
        lastHuntByStrategy: {},
      });
      updateBotMemory(strategy, prospects, people.length);
      setLastHuntResults(prospects);
      setBotDashboard(getBotDashboard());
      setHuntSuccess(true);
      pushActivity('✓', `${prospects.length} prospects trouvés (score ≥50)`);
      if (prospects.length > 0) {
        setAppState(prev => ({ ...prev, view: 'apollo' }));
      }
      setTimeout(() => setHuntSuccess(false), 3000);
    } catch (err) {
      pushActivity('✗', `Erreur chasse : ${(err as Error).message}`);
    } finally {
      setHuntLoading(false);
    }
  }, [huntLoading, todayStrategy]);

  const handleApolloSearch = async () => {
    // Triggers a hunt with current strategy
    await handleProspecter();
  };

  const handleLinkedInApprove = useCallback(async () => {
    const post = appState.linkedin.postText;
    if (!post.accroche && !post.corps) return;
    const fullText = `${post.accroche}\n\n${post.corps}\n\n${post.hashtags}`;
    pushActivity('📝', `Post LinkedIn programmé (${fullText.length} chars)`);
    // Reset editor
    setAppState(prev => ({
      ...prev,
      linkedin: { ...prev.linkedin, postText: { accroche: '', corps: '', hashtags: '' } }
    }));
  }, [appState.linkedin.postText]);

  const handleApprove = useCallback(async () => {
    if (!appState.selectedAccount || huntLoading) return;
    setHuntLoading(true);
    try {
      const draft = appState.selectedAccount.outreach?.[0];
      if (draft) {
        await sendApprovedEmail({
          account: appState.selectedAccount,
          heat: 0,
          channel: 'email',
          message: { body: draft.body || '', subject: draft.subject, language: 'en' },
          contactEmail: appState.selectedAccount.financeLead?.email,
          exposureLow: appState.selectedAccount.revenueEstimate * 0.8,
          exposureHigh: appState.selectedAccount.revenueEstimate * 1.2,
          dailyLoss: Math.round(appState.selectedAccount.revenueEstimate / 365),
          confidenceScore: 65,
          qualityVerdict: 'approve',
        } as any);
        pushActivity('✓', `Email envoyé → ${appState.selectedAccount.company}`);
      }
      setAppState(prev => ({ ...prev, approvalOpen: false }));
    } catch (err) {
      pushActivity('✗', `Erreur envoi : ${(err as Error).message}`);
    } finally {
      setHuntLoading(false);
    }
  }, [appState.selectedAccount, huntLoading]);

  const renderHeatRing = (heat: number) => {
    let className = 'heat-cold';
    if (heat > 65) className = 'heat-hot';
    else if (heat > 40) className = 'heat-warm';

    return (
      <svg width="32" height="32" viewBox="0 0 32 32" className="cockpit-heat-ring">
        <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: heat > 65 ? 'var(--red)' : heat > 40 ? 'var(--gold)' : 'var(--t3)' }} />
        <text x="16" y="18" textAnchor="middle" fontSize="10" fontWeight="600" fill="currentColor">{Math.round(heat)}</text>
      </svg>
    );
  };

  return (
    <div className="cockpit-container">
      <style>{STYLES}</style>
      <svg className="cockpit-grain" width="100%" height="100%" />

      {/* Topbar */}
      <div className="cockpit-topbar">
        {/* Logo */}
        <div style={{ width: 'var(--nav)', height: '52px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--bd)' }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="7" fill="rgba(0,207,196,0.08)" stroke="rgba(0,207,196,0.2)" strokeWidth="1"/>
            <rect x="6" y="17" width="3" height="6" rx="1" fill="rgba(0,207,196,0.4)"/>
            <rect x="11" y="12" width="3" height="11" rx="1" fill="rgba(0,207,196,0.6)"/>
            <rect x="16" y="8" width="3" height="15" rx="1" fill="#00CFC4"/>
            <rect x="21" y="5" width="3" height="18" rx="1" fill="#00CFC4"/>
          </svg>
        </div>

        {/* KPI Stats */}
        <div style={{ display: 'flex', alignItems: 'stretch', flex: 1, overflow: 'hidden' }}>
          <div className="tb-stat"><span className="ts-val" style={{ color: 'var(--cyan)' }}>{fmtEur(appState.cockpitState?.pipelineValueEUR || 0)}</span><span className="ts-lbl">Pipeline</span></div>
          <div className="tb-stat"><span className="ts-val" style={{ color: 'var(--red)' }}>{accounts.filter(a => calcHeatScore(a).total >= 60).length}</span><span className="ts-lbl">Hot leads</span></div>
          <div className="tb-stat"><span className="ts-val" style={{ color: 'var(--grn)' }}>{fmtEur(appState.cockpitState?.revenueEUR || 0)}</span><span className="ts-lbl">MRR</span></div>
          <div className="tb-stat"><span className="ts-val">{accounts.length}</span><span className="ts-lbl">Prospects</span></div>
          <div className="tb-stat"><span className="ts-val" style={{ color: 'var(--gold)' }}>{appState.cockpitState?.followUpsDue || 0}</span><span className="ts-lbl">À contacter</span></div>
        </div>

        {/* Right section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 14px', marginLeft: 'auto', borderLeft: '1px solid var(--bd)' }}>
          <div className="cockpit-sync">
            <div className="cockpit-sync-pulse"></div>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '12px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'var(--t3)' }}>
              Sync · {todayStrategy.replace(/_/g, ' ')}
            </span>
          </div>
          <button
            className="tb-btn primary"
            onClick={handleProspecter}
            disabled={huntLoading}
          >
            {huntLoading ? '⏳ Chasse...' : '+ Prospecter'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="cockpit-main">
        {/* Sidebar Navigation */}
        <div className="cockpit-sidebar">
          <div
            className={`cockpit-nav-icon ${appState.view === 'cockpit' ? 'active' : ''}`}
            onClick={() => setAppState(prev => ({ ...prev, view: 'cockpit' }))}
            title="Cockpit"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
          </div>
          <div
            className={`cockpit-nav-icon ${appState.view === 'apollo' ? 'active' : ''}`}
            onClick={() => setAppState(prev => ({ ...prev, view: 'apollo' }))}
            title="Apollo Prospection"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M11 8v6M8 11h6" strokeLinecap="round"/></svg>
          </div>
          <div
            className={`cockpit-nav-icon ${appState.view === 'sequences' ? 'active' : ''}`}
            onClick={() => setAppState(prev => ({ ...prev, view: 'sequences' }))}
            title="Séquences"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><path d="M4 6h16M4 12h12M4 18h8" strokeLinecap="round"/></svg>
            {(appState.cockpitState?.followUpsDue || 0) > 0 && <div className="nav-badge" />}
          </div>
          <div
            className={`cockpit-nav-icon ${appState.view === 'linkedin' ? 'active' : ''}`}
            onClick={() => setAppState(prev => ({ ...prev, view: 'linkedin' }))}
            title="LinkedIn CM"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
          </div>
          <div style={{ width: '24px', height: '1px', background: 'var(--bd)', margin: '6px 0' }} />
          <div
            className={`cockpit-nav-icon ${appState.view === 'settings' ? 'active' : ''}`}
            onClick={() => setAppState(prev => ({ ...prev, view: 'settings' }))}
            title="Paramètres"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
          </div>
        </div>

        {/* Cockpit View */}
        <div className={`cockpit-view ${appState.view === 'cockpit' ? 'active' : ''}`}>
          <div className="cockpit-view-cockpit">
            {/* Source Panel */}
            <div className="cockpit-source-panel">
              <div className="cockpit-source-header">
                <input
                  type="text"
                  className="cockpit-source-search"
                  placeholder="Search leads..."
                />
              </div>
              <div className="cockpit-source-tabs">
                <div className="cockpit-source-tab active">Hot Queue</div>
                <div className="cockpit-source-tab">Contacted</div>
                <div className="cockpit-source-tab">Qualified</div>
              </div>
              <div className="cockpit-leads">
                {accounts.filter(a => sourceTab === 'all' || (a as any).source === sourceTab).slice(0, displayedLeads).map((acct, idx) => (
                  <div
                    key={idx}
                    className={`cockpit-lead-item ${idx === 0 ? 'active' : ''}`}
                    onClick={() => setAppState(prev => ({ ...prev, selectedAccount: acct as any }))}
                  >
                    <div className="cockpit-heat-ring">
                      {renderHeatRing(calcHeatScore(acct).total || 0)}
                    </div>
                    <div className="cockpit-lead-info">
                      <div className="cockpit-lead-company">{acct.company}</div>
                      <div className="cockpit-lead-meta">{acct.domain}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detail Panel */}
            <div className="cockpit-detail-panel">
              {appState.selectedAccount ? (
                <>
                  <div className="cockpit-detail-header">
                    <div className="cockpit-avatar">
                      {appState.selectedAccount.company?.charAt(0).toUpperCase()}
                    </div>
                    <div className="cockpit-header-info">
                      <div className="cockpit-company-name">{appState.selectedAccount.company}</div>
                      <div className="cockpit-company-domain">{appState.selectedAccount.domain}</div>
                    </div>
                  </div>

                  <div className="cockpit-detail-section">
                    <div className="cockpit-detail-title">Why This Prospect</div>
                    <div className="cockpit-detail-content">
                      {appState.selectedAccount.hypothesis?.summary || appState.selectedAccount.whyNow || 'Signals indicate potential exposure in IT spend optimization.'}
                    </div>
                  </div>

                  <div className="cockpit-detail-section">
                    <div className="cockpit-detail-title">Pipeline Status</div>
                    <div className="cockpit-pipeline-container">
                      {['new', 'engaged', 'contacted', 'qualified', 'closed'].map((stage, idx) => {
                        const statusOrder = ['new', 'engaged', 'contacted', 'qualified', 'closed'];
                        const currentIdx = statusOrder.indexOf(appState.selectedAccount!.status || 'new');
                        return (
                          <div key={idx} className="cockpit-pipeline-node">
                            <div className={`cockpit-pipeline-dot ${idx === currentIdx ? 'active' : idx < currentIdx ? 'done' : ''}`} />
                            <div className="cockpit-pipeline-label">{stage.charAt(0).toUpperCase() + stage.slice(1)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="cockpit-detail-section">
                    <div className="cockpit-detail-title">BANT Fit</div>
                    <div className="cockpit-bant-grid">
                      {[
                        { label: 'Attackability', value: appState.selectedAccount.attackability || 'unknown' },
                        { label: 'Deal Potential', value: appState.selectedAccount.dealPotential || 'unknown' },
                        { label: 'Conviction', value: appState.selectedAccount.conviction || 'unknown' },
                        { label: 'Solo Fit', value: appState.selectedAccount.solofit || 'unknown' },
                      ].map((dim, idx) => (
                        <div key={idx} className="cockpit-bant-item">
                          <div className="cockpit-bant-label">{dim.label}</div>
                          <div className="cockpit-bant-value" style={{ fontSize: '13px' }}>{dim.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="cockpit-detail-section">
                    <div className="cockpit-detail-title">Company Intel</div>
                    <div className="cockpit-apollo-grid">
                      <div className="cockpit-apollo-item">
                        <div className="cockpit-apollo-label">Revenue Est.</div>
                        <div className="cockpit-apollo-value">{fmtEur(appState.selectedAccount.revenueEstimate || 0)}</div>
                      </div>
                      <div className="cockpit-apollo-item">
                        <div className="cockpit-apollo-label">Employees</div>
                        <div className="cockpit-apollo-value">{appState.selectedAccount.employeeRange || appState.selectedAccount.headcount || '—'}</div>
                      </div>
                      <div className="cockpit-apollo-item">
                        <div className="cockpit-apollo-label">Industry</div>
                        <div className="cockpit-apollo-value">{appState.selectedAccount.industry || '—'}</div>
                      </div>
                      <div className="cockpit-apollo-item">
                        <div className="cockpit-apollo-label">Country</div>
                        <div className="cockpit-apollo-value">{appState.selectedAccount.country || '—'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="cockpit-detail-section">
                    <div className="cockpit-detail-title">Key Contacts</div>
                    <div className="cockpit-contact-cards">
                      {appState.selectedAccount.financeLead?.name ? (
                        <div className="cockpit-contact-card">
                          <div className="cockpit-contact-name">{appState.selectedAccount.financeLead.name}</div>
                          <div className="cockpit-contact-title">{appState.selectedAccount.financeLead.title}</div>
                          {appState.selectedAccount.financeLead.email && (
                            <div className="cockpit-contact-email" style={{ color: appState.selectedAccount.financeLead.emailStatus === 'verified' ? 'var(--grn)' : 'var(--t3)' }}>
                              {appState.selectedAccount.financeLead.email}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ color: 'var(--t3)', fontSize: '12px' }}>No contact enriched yet</div>
                      )}
                    </div>
                  </div>

                  <div className="cockpit-detail-section">
                    <div className="cockpit-detail-title">Timeline</div>
                    <div className="cockpit-timeline">
                      {(appState.selectedAccount.timeline || []).slice(-5).reverse().map((evt, idx) => (
                        <div key={idx} className="cockpit-timeline-event">
                          <div className="cockpit-timeline-dot" />
                          <div className="cockpit-timeline-content">
                            <div className="cockpit-timeline-text">{evt.detail}</div>
                            <div className="cockpit-timeline-time">{new Date(evt.date).toLocaleDateString('fr-FR')}</div>
                          </div>
                        </div>
                      ))}
                      {(!appState.selectedAccount.timeline || appState.selectedAccount.timeline.length === 0) && (
                        <div style={{ color: 'var(--t3)', fontSize: '12px' }}>No timeline events</div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="cockpit-empty-state">Select a prospect to view details</div>
              )}
            </div>

            {/* Action Panel */}
            <div className="cockpit-action-panel">
              <div>
                <div className="cockpit-action-label">Next Action</div>
                <div className="cockpit-action-value">{appState.selectedAccount?.nextAction || 'No action planned'}</div>
              </div>

              <div>
                <div className="cockpit-action-label">Channel</div>
                <div className="cockpit-channel-selector">
                  {['Email', 'LinkedIn', 'Phone'].map((ch) => (
                    <button key={ch} className="cockpit-channel-btn active">
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="cockpit-action-label">Language</div>
                <div className="cockpit-language-badge">{appState.selectedAccount?.detectedLanguage?.toUpperCase() || appState.selectedAccount?.country?.slice(0,2).toUpperCase() || '—'}</div>
              </div>

              <div>
                <div className="cockpit-action-label">Message Preview</div>
                <div className="cockpit-message-preview">
                  {appState.selectedAccount?.outreach?.[0]?.body || 'No message draft available'}
                </div>
              </div>

              <div>
                <div className="cockpit-action-label">Sequence</div>
                <div className="cockpit-sequence-container">
                  {(appState.selectedAccount?.outreach || []).map((draft, idx) => (
                    <div key={idx} className={`cockpit-sequence-step ${idx === 0 ? 'first' : ''}`}>
                      {idx + 1}. {draft.subject || `Step ${idx + 1}`}
                    </div>
                  ))}
                  {(!appState.selectedAccount?.outreach || appState.selectedAccount.outreach.length === 0) && (
                    <div className="cockpit-sequence-step">No sequence steps</div>
                  )}
                </div>
              </div>

              <button
                className="cockpit-btn-primary"
                onClick={() => setAppState(prev => ({ ...prev, approvalOpen: true }))}
                style={{ width: '100%' }}
              >
                Approve & Send
              </button>

              {huntLoading && (
                <div>
                  <div className="cockpit-hunt-bar">
                    <div className="cockpit-hunt-loading"></div>
                  </div>
                </div>
              )}

              {huntSuccess && (
                <div>
                  <div className="cockpit-hunt-bar">
                    <div className="cockpit-hunt-success"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Apollo View */}
        <div className={`cockpit-view ${appState.view === 'apollo' ? 'active' : ''}`}>
          <div className="cockpit-apollo-view">
            <div className="cockpit-apollo-filters">
              <div className="cockpit-filter-group">
                <div className="cockpit-filter-label">Search Type</div>
                <div className="cockpit-filter-toggle">
                  <button
                    className={`cockpit-toggle-btn ${appState.apollo.societyToggle === 'companies' ? 'active' : ''}`}
                    onClick={() => setAppState(prev => ({
                      ...prev,
                      apollo: { ...prev.apollo, societyToggle: 'companies' }
                    }))}
                  >
                    Sociétés
                  </button>
                  <button
                    className={`cockpit-toggle-btn ${appState.apollo.societyToggle === 'people' ? 'active' : ''}`}
                    onClick={() => setAppState(prev => ({
                      ...prev,
                      apollo: { ...prev.apollo, societyToggle: 'people' }
                    }))}
                  >
                    Personnes
                  </button>
                </div>
              </div>

              <div className="cockpit-filter-group">
                <div className="cockpit-filter-label">Search Query</div>
                <input
                  type="text"
                  className="cockpit-filter-input"
                  placeholder="Domain, name, industry..."
                  value={appState.apollo.searchQuery}
                  onChange={(e) => setAppState(prev => ({
                    ...prev,
                    apollo: { ...prev.apollo, searchQuery: e.target.value }
                  }))}
                />
              </div>

              <button className="cockpit-btn-primary" onClick={handleApolloSearch} style={{ width: '100%' }}>
                Search
              </button>

              <div className="cockpit-filter-group">
                <div className="cockpit-filter-label">Active Filters</div>
                <div className="cockpit-filter-tags">
                  <div className="cockpit-filter-tag">
                    Revenue: 1-10M
                    <span className="cockpit-filter-tag-remove">×</span>
                  </div>
                  <div className="cockpit-filter-tag">
                    Tech Stack
                    <span className="cockpit-filter-tag-remove">×</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="cockpit-apollo-results">
              {(appState.apollo.results.length > 0 ? appState.apollo.results : lastHuntResults).length > 0 ? (
                (appState.apollo.results.length > 0 ? appState.apollo.results : lastHuntResults).map((prospect, idx) => (
                  <div key={idx} className="cockpit-apollo-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="cockpit-apollo-card-company">{prospect.company}</div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: prospect.score >= 70 ? 'var(--red)' : prospect.score >= 50 ? 'var(--gold)' : 'var(--t3)' }}>
                        {prospect.score}
                      </div>
                    </div>
                    <div className="cockpit-apollo-card-info">
                      {prospect.domain} · {prospect.headcount} emp · {prospect.industry}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--t2)', marginTop: '4px' }}>{prospect.whyThisProspect}</div>
                  </div>
                ))
              ) : (
                <div className="cockpit-empty-state">Search Apollo to discover new prospects</div>
              )}
            </div>
          </div>
        </div>

        {/* Sequences View */}
        <div className={`cockpit-view ${appState.view === 'sequences' ? 'active' : ''}`}>
          <div className="cockpit-sequences-view">
            {(appState.cockpitState?.approvalQueue || []).length > 0 ? (
              <div className="cockpit-sequences-list">
                <div className="cockpit-sequence-item active">
                  <div className="cockpit-sequence-name">Outreach Queue</div>
                  <div className="cockpit-sequence-meta">
                    {appState.cockpitState?.approvalQueue?.length || 0} pending approvals
                  </div>
                  <div className="cockpit-analytics-strip">
                    <div className="cockpit-analytics-item">
                      <div className="cockpit-analytics-value">{appState.cockpitState?.totalSent || 0}</div>
                      <div className="cockpit-analytics-label">Sent</div>
                    </div>
                    <div className="cockpit-analytics-item">
                      <div className="cockpit-analytics-value">{appState.cockpitState?.totalReplied || 0}</div>
                      <div className="cockpit-analytics-label">Replied</div>
                    </div>
                    <div className="cockpit-analytics-item">
                      <div className="cockpit-analytics-value">{appState.cockpitState?.autoSentCount || 0}</div>
                      <div className="cockpit-analytics-label">Auto-sent</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="cockpit-empty-state">No active sequences</div>
            )}
          </div>
        </div>

        {/* LinkedIn View */}
        <div className={`cockpit-view ${appState.view === 'linkedin' ? 'active' : ''}`}>
          <div className="cockpit-linkedin-view">
            {/* Calendar */}
            <div className="cockpit-linkedin-calendar">
              <div className="cockpit-calendar-title">Schedule</div>
              {['Mon, Apr 7', 'Tue, Apr 8', 'Wed, Apr 9', 'Thu, Apr 10'].map((day, idx) => (
                <div
                  key={idx}
                  className={`cockpit-calendar-day ${idx === 1 ? 'active' : ''}`}
                  onClick={() => setAppState(prev => ({
                    ...prev,
                    linkedin: { ...prev.linkedin, selectedDay: day }
                  }))}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Editor */}
            <div className="cockpit-linkedin-editor">
              <div>
                <div className="cockpit-editor-label">Accroche</div>
                <textarea
                  className="cockpit-editor-input"
                  placeholder="Hook that captures attention..."
                  value={appState.linkedin.postText.accroche}
                  onChange={(e) => setAppState(prev => ({
                    ...prev,
                    linkedin: {
                      ...prev.linkedin,
                      postText: { ...prev.linkedin.postText, accroche: e.target.value }
                    }
                  }))}
                />
              </div>

              <div>
                <div className="cockpit-editor-label">Corps</div>
                <textarea
                  className="cockpit-editor-input"
                  placeholder="Main message body..."
                  value={appState.linkedin.postText.corps}
                  onChange={(e) => setAppState(prev => ({
                    ...prev,
                    linkedin: {
                      ...prev.linkedin,
                      postText: { ...prev.linkedin.postText, corps: e.target.value }
                    }
                  }))}
                />
              </div>

              <div>
                <div className="cockpit-editor-label">Hashtags</div>
                <textarea
                  className="cockpit-editor-input"
                  placeholder="#hashtags #for #reach"
                  value={appState.linkedin.postText.hashtags}
                  onChange={(e) => setAppState(prev => ({
                    ...prev,
                    linkedin: {
                      ...prev.linkedin,
                      postText: { ...prev.linkedin.postText, hashtags: e.target.value }
                    }
                  }))}
                />
              </div>

              <button className="cockpit-btn-primary" onClick={handleLinkedInApprove} style={{ width: '100%' }}>
                Schedule Post
              </button>
            </div>

            {/* Intelligence */}
            <div className="cockpit-linkedin-intelligence">
              <div className="cockpit-intel-box">
                <div className="cockpit-intel-title">Engagement Forecast</div>
                <div className="cockpit-intel-metric">
                  <div className="cockpit-intel-value">12-18</div>
                  <div className="cockpit-intel-unit">engagements</div>
                </div>
              </div>

              <div className="cockpit-intel-box">
                <div className="cockpit-intel-title">InMail Ring</div>
                <div className="cockpit-intel-ring">
                  <svg viewBox="0 0 120 120" width="100%" height="100%">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="var(--red)" strokeWidth="2" opacity="0.3" />
                    <circle cx="60" cy="60" r="40" fill="none" stroke="var(--gold)" strokeWidth="2" opacity="0.5" />
                    <circle cx="60" cy="60" r="30" fill="none" stroke="var(--cyan)" strokeWidth="2" />
                    <text x="60" y="65" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--cyan)">
                      42
                    </text>
                  </svg>
                </div>
              </div>

              <div className="cockpit-intel-box">
                <div className="cockpit-intel-title">Best Time to Post</div>
                <div className="cockpit-intel-metric">
                  <div className="cockpit-intel-value">09:00</div>
                  <div className="cockpit-intel-unit">AM CET</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Settings View */}
        <div className={`cockpit-view ${appState.view === 'settings' ? 'active' : ''}`}>
          <div className="cockpit-settings-view">
            <div className="cockpit-settings-section">
              <div className="cockpit-settings-heading">Execution Mode</div>
              <div className="cockpit-mode-pills">
                <button className="cockpit-mode-pill active">Auto-Approve</button>
                <button className="cockpit-mode-pill">Semi-Auto</button>
                <button className="cockpit-mode-pill">Manual Review</button>
              </div>
            </div>

            <div className="cockpit-settings-section">
              <div className="cockpit-settings-heading">Bot Dashboard</div>
              <div className="cockpit-bot-dashboard">
                <div className="cockpit-dashboard-item">
                  <span className="cockpit-dashboard-label">Total Hunts</span>
                  <span className="cockpit-dashboard-value">{botDashboard.totalHunts}</span>
                </div>
                <div className="cockpit-dashboard-item">
                  <span className="cockpit-dashboard-label">Prospects Found</span>
                  <span className="cockpit-dashboard-value">{botDashboard.totalProspectsFound}</span>
                </div>
                <div className="cockpit-dashboard-item">
                  <span className="cockpit-dashboard-label">Credits Used</span>
                  <span className="cockpit-dashboard-value">{botDashboard.creditsUsedThisMonth}</span>
                </div>
              </div>
            </div>

            <div className="cockpit-settings-section">
              <div className="cockpit-settings-heading">Credits</div>
              <div className="cockpit-credit-bar">
                <div className="cockpit-credit-fill"></div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '8px' }}>
                6,500 / 10,000 credits remaining
              </div>
            </div>

            <div className="cockpit-settings-section">
              <div className="cockpit-settings-heading">System Status</div>
              <div className="cockpit-system-status">
                <div className="cockpit-status-item">
                  <div className="cockpit-status-dot"></div>
                  <span className="cockpit-status-label">Cockpit Engine</span>
                </div>
                <div className="cockpit-status-item">
                  <div className="cockpit-status-dot"></div>
                  <span className="cockpit-status-label">Apollo Bot</span>
                </div>
                <div className="cockpit-status-item">
                  <div className="cockpit-status-dot"></div>
                  <span className="cockpit-status-label">Hot Queue</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      <div className={`cockpit-approval-overlay ${appState.approvalOpen ? 'active' : ''}`}>
        <div className="cockpit-approval-card">
          <div className="cockpit-approval-header">
            <div className="cockpit-approval-heat">
              {appState.selectedAccount && renderHeatRing(calcHeatScore(appState.selectedAccount).total || 0)}
            </div>
            <div className="cockpit-approval-title">
              <div className="cockpit-approval-company">{appState.selectedAccount?.company}</div>
              <div className="cockpit-approval-domain">{appState.selectedAccount?.domain}</div>
            </div>
          </div>

          <div className="cockpit-approval-content">
            <div className="cockpit-approval-section">
              <div className="cockpit-approval-section-title">Recommended Action</div>
              <div className="cockpit-approval-section-value">
                {appState.selectedAccount?.nextAction || 'Send introduction email'}
              </div>
            </div>

            <div className="cockpit-approval-section">
              <div className="cockpit-approval-section-title">Message Preview</div>
              <div className="cockpit-approval-message-box">
                {appState.selectedAccount?.outreach?.[0]?.body || 'No message generated yet'}
              </div>
            </div>

            <div className="cockpit-approval-section">
              <div className="cockpit-approval-section-title">Quality Gate</div>
              <div className="cockpit-approval-section-value">
                {appState.selectedAccount ? `Heat Score: ${Math.round(calcHeatScore(appState.selectedAccount).total)}/100 | Contact Verified: ${appState.selectedAccount.financeLead?.emailStatus === 'verified' ? 'Yes' : 'No'} | Timing: ${appState.selectedAccount.whyNow || 'Unknown'}` : 'N/A'}
              </div>
            </div>
          </div>

          <div className="cockpit-approval-actions">
            <button
              className="cockpit-approval-btn cockpit-approval-btn-approve"
              onClick={handleApprove}
              disabled={huntLoading}
            >
              {huntLoading ? 'Sending...' : '✓ Approve & Send'}
            </button>
            <button
              className="cockpit-approval-btn cockpit-approval-btn-skip"
              onClick={() => setAppState(prev => ({ ...prev, approvalOpen: false }))}
            >
              Skip for Now
            </button>
          </div>

          <div className="cockpit-approval-footer">
            Keyboard shortcut: Space to approve
          </div>
        </div>
      </div>
    </div>
  );
}
