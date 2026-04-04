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

body {
  background: var(--bg);
  color: var(--t1);
  font-family: var(--body);
  font-size: 14px;
  line-height: 1.5;
  overflow: hidden;
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
}

.cockpit-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  flex-direction: column;
  background: var(--bg);
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
}

.cockpit-kpi-value {
  font-family: var(--mono);
  font-size: 16px;
  font-weight: 600;
  color: var(--t1);
}

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
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
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
}

.cockpit-nav-icon:hover {
  background: var(--s2);
  color: var(--t2);
}

.cockpit-nav-icon.active {
  background: var(--vio);
  color: white;
}

.cockpit-view {
  flex: 1;
  display: none;
  overflow: hidden;
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
  width: 4px;
}

.cockpit-leads::-webkit-scrollbar-track {
  background: transparent;
}

.cockpit-leads::-webkit-scrollbar-thumb {
  background: var(--bd);
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
  width: 48px;
  height: 48px;
  flex-shrink: 0;
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
  width: 4px;
}

.cockpit-detail-panel::-webkit-scrollbar-track {
  background: transparent;
}

.cockpit-detail-panel::-webkit-scrollbar-thumb {
  background: var(--bd);
  border-radius: 2px;
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

.cockpit-pipeline-stages {
  display: flex;
  gap: 4px;
  margin-top: 8px;
}

.cockpit-stage {
  flex: 1;
  height: 6px;
  background: var(--s2);
  border-radius: 2px;
  position: relative;
  overflow: hidden;
}

.cockpit-stage.active {
  background: var(--cyan);
}

.cockpit-stage.passed {
  background: var(--grn);
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
  font-weight: 500;
}

.cockpit-jobs-signals {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.cockpit-signal-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--bd);
  border-radius: 3px;
  font-size: 11px;
  color: var(--t2);
  width: fit-content;
}

.cockpit-contact-card {
  padding: 12px;
  background: var(--s2);
  border: 1px solid var(--bd);
  border-radius: 6px;
  margin-top: 8px;
}

.cockpit-contact-name {
  font-weight: 600;
  color: var(--t1);
}

.cockpit-contact-title {
  font-size: 12px;
  color: var(--t2);
}

.cockpit-contact-email {
  font-size: 12px;
  color: var(--cyan);
  margin-top: 6px;
  font-family: var(--mono);
}

.cockpit-bant-score {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
}

.cockpit-bant-item {
  padding: 8px;
  background: var(--s2);
  border: 1px solid var(--bd);
  border-radius: 4px;
}

.cockpit-bant-label {
  font-size: 10px;
  color: var(--t3);
}

.cockpit-bant-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--t1);
  margin-top: 4px;
}

.cockpit-timeline {
  margin-top: 8px;
}

.cockpit-timeline-event {
  padding: 8px 0;
  border-left: 2px solid var(--bd);
  padding-left: 12px;
  position: relative;
  font-size: 12px;
}

.cockpit-timeline-event::before {
  content: '';
  position: absolute;
  left: -5px;
  top: 8px;
  width: 8px;
  height: 8px;
  background: var(--cyan);
  border-radius: 50%;
}

.cockpit-timeline-time {
  color: var(--t3);
  font-size: 11px;
}

.cockpit-timeline-text {
  color: var(--t1);
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
  width: 4px;
}

.cockpit-action-panel::-webkit-scrollbar-track {
  background: transparent;
}

.cockpit-action-panel::-webkit-scrollbar-thumb {
  background: var(--bd);
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

.cockpit-language-badge {
  display: inline-block;
  padding: 4px 8px;
  background: var(--vio);
  border-radius: 3px;
  font-weight: 600;
  font-size: 11px;
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
  font-size: 12px;
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

.cockpit-message-preview {
  padding: 10px;
  background: var(--s2);
  border: 1px solid var(--bd);
  border-radius: 4px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--t2);
  max-height: 150px;
  overflow-y: auto;
}

.cockpit-message-preview::-webkit-scrollbar {
  width: 3px;
}

.cockpit-message-preview::-webkit-scrollbar-track {
  background: transparent;
}

.cockpit-message-preview::-webkit-scrollbar-thumb {
  background: var(--bd);
  border-radius: 2px;
}

.cockpit-sequence-steps {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.cockpit-sequence-step {
  padding: 6px 8px;
  background: var(--s2);
  border-left: 2px solid var(--bd);
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

.cockpit-empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--t3);
  text-align: center;
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
}

.cockpit-approval-card::-webkit-scrollbar {
  width: 4px;
}

.cockpit-approval-card::-webkit-scrollbar-track {
  background: transparent;
}

.cockpit-approval-card::-webkit-scrollbar-thumb {
  background: var(--bd);
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
}

.cockpit-approval-title {
  flex: 1;
}

.cockpit-approval-company {
  font-size: 24px;
  font-weight: 700;
  color: var(--t1);
}

.cockpit-approval-domain {
  font-size: 13px;
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

.cockpit-apollo-view {
  flex: 1;
  display: flex;
  gap: 1px;
  background: var(--bg);
}

.cockpit-apollo-filters {
  width: 240px;
  background: var(--s1);
  border-right: 1px solid var(--bd);
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cockpit-apollo-filters::-webkit-scrollbar {
  width: 4px;
}

.cockpit-apollo-filters::-webkit-scrollbar-track {
  background: transparent;
}

.cockpit-apollo-filters::-webkit-scrollbar-thumb {
  background: var(--bd);
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

.cockpit-apollo-results {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.cockpit-apollo-results::-webkit-scrollbar {
  width: 4px;
}

.cockpit-apollo-results::-webkit-scrollbar-track {
  background: transparent;
}

.cockpit-apollo-results::-webkit-scrollbar-thumb {
  background: var(--bd);
  border-radius: 2px;
}

.cockpit-apollo-card {
  padding: 14px;
  background: var(--s2);
  border: 1px solid var(--bd);
  border-radius: 6px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.cockpit-apollo-card:hover {
  background: var(--s3);
  border-color: var(--bds);
}

.cockpit-apollo-card-company {
  font-weight: 600;
  color: var(--t1);
}

.cockpit-apollo-card-info {
  font-size: 12px;
  color: var(--t3);
  margin-top: 4px;
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
  width: 4px;
}

.cockpit-sequences-list::-webkit-scrollbar-track {
  background: transparent;
}

.cockpit-sequences-list::-webkit-scrollbar-thumb {
  background: var(--bd);
  border-radius: 2px;
}

.cockpit-sequence-item {
  padding: 14px;
  background: var(--s2);
  border: 1px solid var(--bd);
  border-radius: 6px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.cockpit-sequence-item:hover {
  background: var(--s3);
  border-color: var(--bds);
}

.cockpit-sequence-name {
  font-weight: 600;
  color: var(--t1);
}

.cockpit-sequence-stats {
  font-size: 11px;
  color: var(--t3);
  margin-top: 8px;
  display: flex;
  gap: 12px;
}

.cockpit-sequences-detail {
  flex: 1;
  background: var(--s1);
  padding: 20px;
  overflow-y: auto;
}

.cockpit-sequences-detail::-webkit-scrollbar {
  width: 4px;
}

.cockpit-sequences-detail::-webkit-scrollbar-track {
  background: transparent;
}

.cockpit-sequences-detail::-webkit-scrollbar-thumb {
  background: var(--bd);
  border-radius: 2px;
}

.cockpit-linkedin-view {
  flex: 1;
  display: flex;
  gap: 1px;
  background: var(--bg);
}

.cockpit-linkedin-calendar {
  width: 280px;
  background: var(--s1);
  border-right: 1px solid var(--bd);
  padding: 16px;
  overflow-y: auto;
}

.cockpit-linkedin-calendar::-webkit-scrollbar {
  width: 4px;
}

.cockpit-linkedin-calendar::-webkit-scrollbar-track {
  background: transparent;
}

.cockpit-linkedin-calendar::-webkit-scrollbar-thumb {
  background: var(--bd);
  border-radius: 2px;
}

.cockpit-linkedin-editor {
  flex: 1;
  background: var(--s1);
  border-right: 1px solid var(--bd);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cockpit-linkedin-textarea {
  flex: 1;
  padding: 12px;
  background: var(--s2);
  border: 1px solid var(--bd);
  border-radius: 6px;
  color: var(--t1);
  font-family: var(--body);
  font-size: 13px;
  resize: none;
}

.cockpit-linkedin-textarea::placeholder {
  color: var(--t3);
}

.cockpit-linkedin-intelligence {
  width: 280px;
  background: var(--s1);
  border-left: 1px solid var(--bd);
  padding: 16px;
  overflow-y: auto;
}

.cockpit-linkedin-intelligence::-webkit-scrollbar {
  width: 4px;
}

.cockpit-linkedin-intelligence::-webkit-scrollbar-track {
  background: transparent;
}

.cockpit-linkedin-intelligence::-webkit-scrollbar-thumb {
  background: var(--bd);
  border-radius: 2px;
}

.cockpit-settings-view {
  flex: 1;
  background: var(--s1);
  padding: 40px;
  overflow-y: auto;
}

.cockpit-settings-view::-webkit-scrollbar {
  width: 4px;
}

.cockpit-settings-view::-webkit-scrollbar-track {
  background: transparent;
}

.cockpit-settings-view::-webkit-scrollbar-thumb {
  background: var(--bd);
  border-radius: 2px;
}

.cockpit-settings-section {
  margin-bottom: 32px;
  max-width: 600px;
}

.cockpit-settings-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--t1);
  margin-bottom: 12px;
}

.cockpit-settings-item {
  padding: 12px;
  background: var(--s2);
  border: 1px solid var(--bd);
  border-radius: 6px;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cockpit-settings-label {
  font-size: 13px;
  color: var(--t1);
}

.cockpit-settings-value {
  font-size: 12px;
  color: var(--t3);
  font-family: var(--mono);
}

.fade-in {
  animation: fadeInAnim 0.3s ease-in;
}

@keyframes fadeInAnim {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
`;

type View = 'cockpit' | 'apollo' | 'sequences' | 'linkedin' | 'settings';
type Channel = 'email' | 'linkedin' | 'tel';

interface AppState {
  view: View;
  mode: 'assisté' | 'autonome';
  selectedAccountId: string | null;
  approvalQueueIndex: number;
  selectedChannel: Channel;
  accounts: Account[];
  cockpitState: CockpitState | null;
  apolloSearchQuery: string;
  sequencesDetailId: string | null;
}

export default function CockpitPage() {
  const [state, setState] = useState<AppState>({
    view: 'cockpit',
    mode: 'assisté',
    selectedAccountId: null,
    approvalQueueIndex: 0,
    selectedChannel: 'email',
    accounts: [],
    cockpitState: null,
    apolloSearchQuery: '',
    sequencesDetailId: null,
  });

  const ITEMS_PER_PAGE = 15;
  const [displayedLeads, setDisplayedLeads] = useState(ITEMS_PER_PAGE);
  const [sourceTab, setSourceTab] = useState('Tout');
  const [searchQuery, setSearchQuery] = useState('');
  const leadsEndRef = useRef<HTMLDivElement>(null);

  // Apollo Bot state
  const [todayStrategy, setTodayStrategy] = useState<HuntStrategy>(() => selectTodayStrategy());
  const [todayDescription, setTodayDescription] = useState(() => buildSearchParams(selectTodayStrategy()).description);
  const [huntLoading, setHuntLoading] = useState(false);
  const [lastHuntResults, setLastHuntResults] = useState<ApolloProspect[]>([]);
  const [botDashboard, setBotDashboard] = useState(() => getBotDashboard());

  const handleApproveRef = useRef(() => {});
  const handleSkipRef = useRef(() => {});
  const handleCloseApprovalRef = useRef(() => {});

  useEffect(() => {
    const loadState = async () => {
      const accounts = await loadAccounts();
      const cockpitState = await buildCockpitState();
      setState((s) => ({
        ...s,
        accounts,
        cockpitState,
      }));
      if (accounts.length > 0) {
        setState((s) => ({
          ...s,
          selectedAccountId: accounts[0].id,
        }));
      }
    };
    loadState();

    const unsubscribe = setupKeyboardShortcuts(
      () => handleApproveRef.current(),
      () => handleSkipRef.current(),
      () => handleCloseApprovalRef.current(),
    );

    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    if (!leadsEndRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDisplayedLeads((prev) => prev + ITEMS_PER_PAGE);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(leadsEndRef.current);
    return () => observer.disconnect();
  }, []);

  const handleApprove = useCallback(async () => {
    const item = state.cockpitState?.approvalQueue[state.approvalQueueIndex];
    if (!item) return;

    if (item.channel === 'email') {
      await sendApprovedEmail(item);
    } else if (item.channel === 'linkedin') {
      await handleLinkedInApproval(item);
    }

    pushActivity('✓', `Approved ${item.channel} to ${item.account.company}`);

    setState((s) => ({
      ...s,
      approvalQueueIndex: s.approvalQueueIndex + 1,
    }));
  }, [state.cockpitState?.approvalQueue, state.approvalQueueIndex]);

  const handleSkip = useCallback(() => {
    pushActivity('→', 'Skipped outreach');
    setState((s) => ({
      ...s,
      approvalQueueIndex: s.approvalQueueIndex + 1,
    }));
  }, []);

  const handleCloseApproval = useCallback(() => {
    setState((s) => ({
      ...s,
      approvalQueueIndex: -1,
    }));
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

      const memory = getBotDashboard();
      const prospects = processApolloResults(people, strategy, {
        totalHunts: memory.totalHunts,
        totalProspectsFound: memory.totalProspectsFound,
        creditsUsedThisMonth: memory.creditsUsedThisMonth,
        creditsResetDate: '',
        strategyStats: {} as any,
        domainsAlreadyHunted: [],
        lastHuntByStrategy: {},
      });

      updateBotMemory(strategy, prospects, people.length);
      setLastHuntResults(prospects);
      setBotDashboard(getBotDashboard());

      pushActivity('✓', `${prospects.length} prospects trouvés (score ≥50)`);

      // Switch to Apollo view to show results
      if (prospects.length > 0) {
        setState((s) => ({ ...s, view: 'apollo' }));
      }
    } catch (err) {
      pushActivity('✗', `Erreur chasse : ${(err as Error).message}`);
    } finally {
      setHuntLoading(false);
    }
  }, [huntLoading, todayStrategy]);

  // Keep refs in sync for keyboard shortcuts (avoids stale closures)
  useEffect(() => {
    handleApproveRef.current = handleApprove;
    handleSkipRef.current = handleSkip;
    handleCloseApprovalRef.current = handleCloseApproval;
  }, [handleApprove, handleSkip, handleCloseApproval]);

  const showApprovalOverlay =
    state.approvalQueueIndex >= 0 &&
    state.cockpitState?.approvalQueue &&
    state.approvalQueueIndex < state.cockpitState.approvalQueue.length;

  const currentApprovalItem = showApprovalOverlay
    ? state.cockpitState?.approvalQueue[state.approvalQueueIndex]
    : null;

  const selectedAccount = state.accounts.find((a) => a.id === state.selectedAccountId);

  const filteredAccounts = state.accounts.filter((a) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!a.company.toLowerCase().includes(q) && !a.domain.toLowerCase().includes(q)) return false;
    }
    // Source tab filtering would require a source field on Account; for now show all
    return true;
  });

  const visibleAccounts = filteredAccounts.slice(0, displayedLeads);

  const pipelineStageIndex = (account: Account) => {
    const statusMap: Record<string, number> = {
      new: 0,
      scan_queued: 0,
      scanned: 1,
      qualified: 1,
      outreach_ready: 2,
      contacted: 2,
      replied: 3,
      converted: 3,
      dropped: 4,
      monitoring: 4,
    };
    return statusMap[account.status] || 0;
  };

  const stageLabels = ['Scan', 'Exposition', 'Tension', 'Paiement', 'Monitoring'];

  const countryFlags: Record<string, string> = {
    DE: '🇩🇪',
    NL: '🇳🇱',
    UK: '🇬🇧',
    US: '🇺🇸',
    FR: '🇫🇷',
    AT: '🇦🇹',
    CH: '🇨🇭',
    BE: '🇧🇪',
    ES: '🇪🇸',
    IT: '🇮🇹',
  };

  const getLanguageFromCountry = (country: string): { code: string; name: string } => {
    const langMap: Record<string, { code: string; name: string }> = {
      DE: { code: 'de', name: 'Deutsch' },
      AT: { code: 'de', name: 'Deutsch' },
      CH: { code: 'de', name: 'Deutsch' },
      NL: { code: 'nl', name: 'Nederlands' },
      UK: { code: 'en', name: 'English' },
      US: { code: 'en', name: 'English' },
      FR: { code: 'fr', name: 'Français' },
      BE: { code: 'fr', name: 'Français' },
      ES: { code: 'es', name: 'Español' },
      IT: { code: 'it', name: 'Italiano' },
    };
    return langMap[country] || { code: 'en', name: 'English' };
  };

  const getPriceForCountry = (country: string): number => {
    if (['DE', 'AT', 'CH'].includes(country)) return 590;
    return 490;
  };

  const sourceColors: Record<string, string> = {
    Scan: '#00CFC4',
    Stripe: '#00C98D',
    Apollo: '#8B5CF6',
    Gmail: '#F0A500',
    LinkedIn: '#3B82F6',
    Calendly: '#14B8A6',
  };

  const renderHeatRing = (account: Account, size: number = 48) => {
    const heat = calcHeatScore(account);
    const percentage = Math.min(heat.total / 100, 1);
    const circumference = 2 * Math.PI * (size / 2 - 2);
    const strokeDashoffset = circumference * (1 - percentage);

    let color = '#00CFC4';
    if (heat.total >= 80) color = '#E5354A';
    else if (heat.total >= 60) color = '#F0A500';

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="cockpit-heat-ring">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 2}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="2"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 2}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transform: `rotate(-90deg)`, transformOrigin: `${size / 2}px ${size / 2}px` }}
        />
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dy="0.3em"
          fill={color}
          fontSize={size / 3}
          fontWeight="bold"
          fontFamily="var(--mono)"
        >
          {Math.round(heat.total)}
        </text>
      </svg>
    );
  };

  const renderGrain = () => (
    <svg
      className="cockpit-grain"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" seed="2" />
        <feDisplacementMap in="SourceGraphic" scale="1" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" opacity="0.03" />
    </svg>
  );

  const renderCockpitView = () => (
    <div className="cockpit-view-cockpit">
      <div className="cockpit-source-panel">
        <div className="cockpit-source-header">
          <input
            type="text"
            className="cockpit-source-search"
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="cockpit-source-tabs">
          {['Tout', 'Scan', 'Stripe', 'Apollo', 'Gmail', 'LinkedIn', 'Calendly'].map((tab) => (
            <button
              key={tab}
              className={`cockpit-source-tab ${sourceTab === tab ? 'active' : ''}`}
              onClick={() => setSourceTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="cockpit-leads">
          {visibleAccounts.map((account) => {
            const heat = calcHeatScore(account);
            return (
              <div
                key={account.id}
                className={`cockpit-lead-item ${state.selectedAccountId === account.id ? 'active' : ''}`}
                onClick={() => setState((s) => ({ ...s, selectedAccountId: account.id }))}
              >
                {renderHeatRing(account, 48)}
                <div className="cockpit-lead-info">
                  <div className="cockpit-lead-company">
                    {countryFlags[account.country] || '🌍'} {account.company}
                  </div>
                  <div className="cockpit-lead-meta">
                    {account.industry} • {account.headcount || account.employeeRange}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={leadsEndRef} />
        </div>
      </div>

      <div className="cockpit-detail-panel">
        {selectedAccount ? (
          <>
            <div className="cockpit-detail-section">
              <div className="cockpit-detail-title">Company</div>
              <div className="cockpit-detail-content">
                {selectedAccount.company} ({selectedAccount.domain})
              </div>
              <div className="cockpit-detail-content" style={{ fontSize: '12px', marginTop: '4px' }}>
                {selectedAccount.industry} • {selectedAccount.country}
              </div>
            </div>

            <div className="cockpit-detail-section">
              <div className="cockpit-detail-title">Pipeline Stage</div>
              <div className="cockpit-pipeline-stages">
                {stageLabels.map((stage, idx) => (
                  <div
                    key={stage}
                    className={`cockpit-stage ${
                      idx === pipelineStageIndex(selectedAccount)
                        ? 'active'
                        : idx < pipelineStageIndex(selectedAccount)
                          ? 'passed'
                          : ''
                    }`}
                    title={stage}
                  />
                ))}
              </div>
            </div>

            {/* POURQUOI CE PROSPECT — Apollo Bot Intelligence */}
            {(() => {
              const botProspect = lastHuntResults.find((p) => p.domain === selectedAccount.domain);
              if (!botProspect) return null;
              return (
                <div className="cockpit-detail-section" style={{ background: 'rgba(0,207,196,0.06)', border: '1px solid rgba(0,207,196,0.2)', borderRadius: '6px', padding: '12px' }}>
                  <div className="cockpit-detail-title" style={{ color: 'var(--cyan)' }}>POURQUOI CE PROSPECT</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--t1)', lineHeight: '1.7', marginTop: '6px' }}>
                    {botProspect.whyThisProspect}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--cyan)' }}>
                      Score: {botProspect.score}/100
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--vio)' }}>
                      {botProspect.strategy.replace(/_/g, ' ')}
                    </span>
                    {botProspect.timingUrgency === 'critical' && (
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--red)' }}>
                        URGENT
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="cockpit-detail-section">
              <div className="cockpit-detail-title">Apollo Enrichment</div>
              <div className="cockpit-apollo-grid">
                <div className="cockpit-apollo-item">
                  <div className="cockpit-apollo-label">Headcount</div>
                  <div className="cockpit-apollo-value">{selectedAccount.headcount}</div>
                </div>
                <div className="cockpit-apollo-item">
                  <div className="cockpit-apollo-label">Range</div>
                  <div className="cockpit-apollo-value">{selectedAccount.employeeRange}</div>
                </div>
              </div>
            </div>

            {selectedAccount.signals && selectedAccount.signals.length > 0 && (
              <div className="cockpit-detail-section">
                <div className="cockpit-detail-title">Signals</div>
                <div className="cockpit-jobs-signals">
                  {selectedAccount.signals.slice(0, 5).map((signal, idx) => (
                    <div key={idx} className="cockpit-signal-tag">
                      {'★'.repeat(signal.strength)} {signal.type}: {signal.detail}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedAccount.financeLead && (
              <div className="cockpit-detail-section">
                <div className="cockpit-detail-title">Finance Lead</div>
                <div className="cockpit-contact-card">
                  <div className="cockpit-contact-name">{selectedAccount.financeLead.name}</div>
                  <div className="cockpit-contact-title">{selectedAccount.financeLead.title}</div>
                  {selectedAccount.financeLead.email && (
                    <div className="cockpit-contact-email">{selectedAccount.financeLead.email}</div>
                  )}
                </div>
              </div>
            )}

            <div className="cockpit-detail-section">
              <div className="cockpit-detail-title">BANT Score</div>
              <div className="cockpit-bant-score">
                <div className="cockpit-bant-item">
                  <div className="cockpit-bant-label">Budget</div>
                  <div className="cockpit-bant-value">{fmtEur(getPriceForCountry(selectedAccount.country))}</div>
                </div>
                <div className="cockpit-bant-item">
                  <div className="cockpit-bant-label">Authority</div>
                  <div className="cockpit-bant-value">—</div>
                </div>
              </div>
            </div>

            {selectedAccount.timeline && selectedAccount.timeline.length > 0 && (
              <div className="cockpit-detail-section">
                <div className="cockpit-detail-title">Timeline</div>
                <div className="cockpit-timeline">
                  {selectedAccount.timeline.slice(0, 5).map((event, idx) => (
                    <div key={idx} className="cockpit-timeline-event">
                      <div className="cockpit-timeline-time">
                        {new Date(event.date).toLocaleDateString()}
                      </div>
                      <div className="cockpit-timeline-text">{event.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="cockpit-empty-state" style={{ flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '28px' }}>📋</div>
            <div>Sélectionnez un prospect</div>
            <div style={{ fontSize: '11px', color: 'var(--t3)' }}>
              Détails du lead, pipeline, signaux et contact
            </div>
          </div>
        )}
      </div>

      <div className="cockpit-action-panel">
        {selectedAccount ? (
          <>
            <div className="cockpit-detail-section">
              <div className="cockpit-action-label">Language</div>
              <div className="cockpit-language-badge">
                {getLanguageFromCountry(selectedAccount.country).name}
              </div>
            </div>

            <div className="cockpit-detail-section">
              <div className="cockpit-action-label">Next Action</div>
              <div className="cockpit-action-value">
                {selectedAccount.status === 'new' ? 'Start scan' : 'Follow up'}
              </div>
            </div>

            <div className="cockpit-detail-section">
              <div className="cockpit-action-label">Channel</div>
              <div className="cockpit-channel-selector">
                {(['email', 'linkedin', 'tel'] as const).map((ch) => (
                  <button
                    key={ch}
                    className={`cockpit-channel-btn ${state.selectedChannel === ch ? 'active' : ''}`}
                    onClick={() => setState((s) => ({ ...s, selectedChannel: ch }))}
                  >
                    {ch === 'email' ? '📧' : ch === 'linkedin' ? '🔗' : '☎️'} {ch}
                  </button>
                ))}
              </div>
            </div>

            <div className="cockpit-detail-section">
              <div className="cockpit-action-label">Message</div>
              <div className="cockpit-message-preview">
                {selectedAccount.outreach?.[0]?.body
                  ? selectedAccount.outreach[0].body
                  : selectedAccount.financeLead?.name
                    ? (() => {
                        const lang = getLanguageFromCountry(selectedAccount.country);
                        const price = getPriceForCountry(selectedAccount.country);
                        if (lang.code === 'de') return `Sehr geehrte/r ${selectedAccount.financeLead.name}, Ghost Tax hat bei ${selectedAccount.company} potenzielle SaaS-Überausgaben identifiziert. Für ${price} € erhalten Sie einen vollständigen Audit-Bericht mit konkreten Handlungsempfehlungen.`;
                        if (lang.code === 'fr') return `Bonjour ${selectedAccount.financeLead.name}, Ghost Tax a identifié des dépenses SaaS potentiellement excessives chez ${selectedAccount.company}. Pour ${price} €, recevez un rapport d'audit complet avec des recommandations concrètes.`;
                        return `Hi ${selectedAccount.financeLead.name}, Ghost Tax identified potential SaaS overspending at ${selectedAccount.company}. For €${price}, get a full audit report with actionable recommendations.`;
                      })()
                    : 'No message generated yet'}
              </div>
            </div>

            <div className="cockpit-detail-section">
              <div className="cockpit-action-label">Sequence Steps</div>
              <div className="cockpit-sequence-steps">
                <div className="cockpit-sequence-step first">1. Initial outreach</div>
                <div className="cockpit-sequence-step sending">2. Follow-up (3 days)</div>
                <div className="cockpit-sequence-step">3. Final attempt (5 days)</div>
              </div>
            </div>
          </>
        ) : (
          <div className="cockpit-empty-state" style={{ flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '28px' }}>🎯</div>
            <div>Sélectionnez un prospect</div>
            <div style={{ fontSize: '11px', color: 'var(--t3)' }}>
              Cliquez sur un lead pour voir les actions disponibles
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderApolloView = () => {
    const strategyInfo = buildSearchParams(todayStrategy);
    return (
    <div className="cockpit-apollo-view">
      <div className="cockpit-apollo-filters">
        <div style={{ padding: '10px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '6px', marginBottom: '8px' }}>
          <div style={{ fontSize: '10px', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Stratégie active</div>
          <div style={{ fontSize: '13px', color: '#a78bfa', fontWeight: 600, marginTop: '4px' }}>{todayStrategy.replace(/_/g, ' ')}</div>
          <div style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '4px', lineHeight: '1.5' }}>{strategyInfo.description}</div>
          <div style={{ fontSize: '10px', color: 'var(--t3)', marginTop: '6px' }}>Marchés : {strategyInfo.markets.join(', ')}</div>
        </div>

        <div className="cockpit-filter-group">
          <label className="cockpit-filter-label">Search</label>
          <input
            type="text"
            className="cockpit-filter-input"
            placeholder="Company name..."
            value={state.apolloSearchQuery}
            onChange={(e) => setState((s) => ({ ...s, apolloSearchQuery: e.target.value }))}
          />
        </div>
        <div className="cockpit-filter-group">
          <label className="cockpit-filter-label">Country</label>
          <input type="text" className="cockpit-filter-input" placeholder={strategyInfo.markets.join(', ')} readOnly style={{ opacity: 0.6 }} />
        </div>

        <button className="cockpit-btn-primary" style={{ width: '100%' }} onClick={handleProspecter} disabled={huntLoading}>
          {huntLoading ? '⏳ Chasse en cours...' : `Lancer ${todayStrategy.replace(/_/g, ' ')}`}
        </button>

        {lastHuntResults.length > 0 && (
          <div style={{ fontSize: '11px', color: 'var(--grn)', textAlign: 'center' }}>
            {lastHuntResults.length} prospects trouvés (score ≥ 50)
          </div>
        )}
      </div>

      <div className="cockpit-apollo-results">
        {lastHuntResults.length > 0 ? (
          lastHuntResults.map((prospect, idx) => (
            <div key={`${prospect.domain}-${idx}`} className="cockpit-apollo-card" style={{ borderLeft: `3px solid ${prospect.score >= 80 ? 'var(--red)' : prospect.score >= 60 ? 'var(--gold)' : 'var(--cyan)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="cockpit-apollo-card-company">
                  {countryFlags[prospect.country] || '🌍'} {prospect.company}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '14px', fontWeight: 700, color: prospect.score >= 80 ? 'var(--red)' : prospect.score >= 60 ? 'var(--gold)' : 'var(--cyan)' }}>
                  {prospect.score}
                </div>
              </div>
              <div className="cockpit-apollo-card-info" style={{ marginTop: '4px' }}>
                {prospect.firstName} {prospect.lastName} — {prospect.title}
              </div>
              <div className="cockpit-apollo-card-info">
                {prospect.industry} • {prospect.headcount} emp • {prospect.domain}
              </div>
              {prospect.email && (
                <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: prospect.emailStatus === 'verified' ? 'var(--grn)' : 'var(--gold)', marginTop: '4px' }}>
                  {prospect.email} {prospect.emailStatus === 'verified' ? '✓' : '?'}
                </div>
              )}
              {/* whyThisProspect */}
              <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(0,207,196,0.06)', border: '1px solid rgba(0,207,196,0.15)', borderRadius: '4px', fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--t2)', lineHeight: '1.6' }}>
                {prospect.whyThisProspect}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <span style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(139,92,246,0.15)', borderRadius: '3px', color: '#a78bfa' }}>
                  {prospect.strategy.replace(/_/g, ' ')}
                </span>
                <span style={{ fontSize: '10px', padding: '2px 6px', background: prospect.timingUrgency === 'critical' ? 'rgba(229,53,74,0.15)' : prospect.timingUrgency === 'high' ? 'rgba(240,165,0,0.15)' : 'rgba(0,207,196,0.1)', borderRadius: '3px', color: prospect.timingUrgency === 'critical' ? 'var(--red)' : prospect.timingUrgency === 'high' ? 'var(--gold)' : 'var(--t3)' }}>
                  {prospect.timingSignal.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          ))
        ) : state.accounts.length > 0 ? (
          state.accounts.slice(0, 20).map((account) => (
            <div key={account.id} className="cockpit-apollo-card">
              <div className="cockpit-apollo-card-company">{countryFlags[account.country] || '🌍'} {account.company}</div>
              <div className="cockpit-apollo-card-info">
                {account.industry} • {account.country}
              </div>
              <div className="cockpit-apollo-card-info">{account.headcount} employees</div>
            </div>
          ))
        ) : (
          <div className="cockpit-empty-state" style={{ flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '28px' }}>🔍</div>
            <div>Aucun résultat</div>
            <div style={{ fontSize: '11px', color: 'var(--t3)' }}>
              Cliquez &quot;Lancer {todayStrategy.replace(/_/g, ' ')}&quot; pour démarrer la chasse
            </div>
          </div>
        )}
      </div>
    </div>
    );
  };

  const renderSequencesView = () => (
    <div className="cockpit-sequences-view">
      <div className="cockpit-sequences-list">
        <div className="cockpit-detail-title" style={{ marginBottom: '16px' }}>
          Active Sequences
        </div>
        {['Welcome', 'Nurture', 'Reengagement'].map((name) => (
          <div
            key={name}
            className={`cockpit-sequence-item ${state.sequencesDetailId === name ? 'active' : ''}`}
            onClick={() => setState((s) => ({ ...s, sequencesDetailId: name }))}
          >
            <div className="cockpit-sequence-name">{name}</div>
            <div className="cockpit-sequence-stats">
              <span>📧 12 active</span>
              <span>✓ 8 completed</span>
            </div>
          </div>
        ))}
      </div>

      <div className="cockpit-sequences-detail">
        {state.sequencesDetailId ? (
          <>
            <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>{state.sequencesDetailId} Sequence</h3>
            <div className="cockpit-detail-section">
              <div className="cockpit-detail-title">Steps</div>
              <div className="cockpit-sequence-steps">
                <div className="cockpit-sequence-step first">Day 0: Initial email</div>
                <div className="cockpit-sequence-step sending">Day 3: Follow-up</div>
                <div className="cockpit-sequence-step">Day 7: Final message</div>
              </div>
            </div>
          </>
        ) : (
          <div className="cockpit-empty-state">Select a sequence</div>
        )}
      </div>
    </div>
  );

  const renderLinkedInView = () => (
    <div className="cockpit-linkedin-view">
      <div className="cockpit-linkedin-calendar">
        <div className="cockpit-detail-title" style={{ marginBottom: '12px' }}>
          Calendrier de publication
        </div>
        <p style={{ fontSize: '12px', color: 'var(--t3)', lineHeight: '1.8' }}>
          Lundi : Recrutement & RH
          <br />
          Mercredi : Insights IT/SaaS
          <br />
          Vendredi : Études de cas
        </p>
        <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '4px', fontSize: '10px', color: '#a78bfa' }}>
          Langue : Français (FR)
        </div>
      </div>

      <div className="cockpit-linkedin-editor">
        <textarea
          className="cockpit-linkedin-textarea"
          placeholder="Rédigez votre post LinkedIn en français..."
          defaultValue={state.cockpitState?.linkedinPost?.body || ''}
        />
        <button className="cockpit-btn-primary">Publier le post</button>
      </div>

      <div className="cockpit-linkedin-intelligence">
        <div className="cockpit-detail-title" style={{ marginBottom: '12px' }}>
          Intelligence
        </div>
        <div className="cockpit-detail-section">
          <div className="cockpit-action-label">Pilier</div>
          <div className="cockpit-action-value">{state.cockpitState?.linkedinPost?.pillar || 'Thought Leadership'}</div>
        </div>
        <div className="cockpit-detail-section" style={{ marginTop: '12px' }}>
          <div className="cockpit-action-label">Stratégie du jour</div>
          <div className="cockpit-action-value" style={{ color: '#a78bfa' }}>{todayStrategy.replace(/_/g, ' ')}</div>
        </div>
      </div>
    </div>
  );

  const renderSettingsView = () => (
    <div className="cockpit-settings-view">
      <div className="cockpit-settings-section">
        <h2 className="cockpit-settings-title">Mode</h2>
        <div className="cockpit-settings-item">
          <span className="cockpit-settings-label">Operation Mode</span>
          <button
            className="cockpit-mode-toggle"
            style={{
              background: state.mode === 'autonome' ? 'var(--vio)' : 'var(--s2)',
              border: `1px solid ${state.mode === 'autonome' ? 'var(--vio)' : 'var(--bd)'}`,
              color: state.mode === 'autonome' ? 'white' : 'var(--t2)',
            }}
            onClick={() =>
              setState((s) => ({
                ...s,
                mode: s.mode === 'assisté' ? 'autonome' : 'assisté',
              }))
            }
          >
            {state.mode === 'assisté' ? 'Assisté' : 'Autonome'}
          </button>
        </div>
      </div>

      <div className="cockpit-settings-section">
        <h2 className="cockpit-settings-title">Budget</h2>
        <div className="cockpit-settings-item">
          <span className="cockpit-settings-label">Monthly Budget</span>
          <span className="cockpit-settings-value">€5,000</span>
        </div>
        <div className="cockpit-settings-item">
          <span className="cockpit-settings-label">Spent This Month</span>
          <span className="cockpit-settings-value">€1,240</span>
        </div>
      </div>

      <div className="cockpit-settings-section">
        <h2 className="cockpit-settings-title">System Status</h2>
        <div className="cockpit-settings-item">
          <span className="cockpit-settings-label">Backend</span>
          <span className="cockpit-settings-value" style={{ color: 'var(--grn)' }}>
            ● Online
          </span>
        </div>
        <div className="cockpit-settings-item">
          <span className="cockpit-settings-label">API Sync</span>
          <span className="cockpit-settings-value" style={{ color: 'var(--grn)' }}>
            ● Healthy
          </span>
        </div>
      </div>

      {/* Apollo Bot Dashboard */}
      <div className="cockpit-settings-section" style={{ maxWidth: '700px' }}>
        <h2 className="cockpit-settings-title" style={{ color: 'var(--cyan)' }}>Apollo Bot Intelligence</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
          <div className="cockpit-settings-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
            <span className="cockpit-settings-label" style={{ fontSize: '10px', color: 'var(--t3)' }}>Total Hunts</span>
            <span className="cockpit-settings-value" style={{ fontSize: '18px', color: 'var(--t1)' }}>{botDashboard.totalHunts}</span>
          </div>
          <div className="cockpit-settings-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
            <span className="cockpit-settings-label" style={{ fontSize: '10px', color: 'var(--t3)' }}>Prospects Found</span>
            <span className="cockpit-settings-value" style={{ fontSize: '18px', color: 'var(--t1)' }}>{botDashboard.totalProspectsFound}</span>
          </div>
          <div className="cockpit-settings-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
            <span className="cockpit-settings-label" style={{ fontSize: '10px', color: 'var(--t3)' }}>Domains Hunted</span>
            <span className="cockpit-settings-value" style={{ fontSize: '18px', color: 'var(--t1)' }}>{botDashboard.domainsHunted}</span>
          </div>
        </div>

        {/* Credits bar */}
        <div className="cockpit-settings-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="cockpit-settings-label">Credits Apollo (mois)</span>
            <span className="cockpit-settings-value">{botDashboard.creditsUsedThisMonth} / 416</span>
          </div>
          <div style={{ height: '6px', background: 'var(--s3)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min((botDashboard.creditsUsedThisMonth / 416) * 100, 100)}%`,
              background: botDashboard.creditsUsedThisMonth > 350 ? 'var(--red)' : botDashboard.creditsUsedThisMonth > 250 ? 'var(--gold)' : 'var(--cyan)',
              borderRadius: '3px',
              transition: 'width 0.3s',
            }} />
          </div>
        </div>

        {/* Today's strategy */}
        <div className="cockpit-settings-item" style={{ marginTop: '8px' }}>
          <span className="cockpit-settings-label">Stratégie du jour</span>
          <span className="cockpit-settings-value" style={{ color: 'var(--vio)' }}>
            {botDashboard.todayStrategy.replace(/_/g, ' ').toUpperCase()}
          </span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--t3)', padding: '0 12px', marginTop: '-4px' }}>
          {botDashboard.todayDescription}
        </div>

        {/* Strategy ranking by reply rate */}
        {botDashboard.strategyBreakdown.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: '8px' }}>
              Performance par stratégie
            </div>
            {botDashboard.strategyBreakdown.map((s) => (
              <div key={s.name} className="cockpit-settings-item" style={{ marginBottom: '4px' }}>
                <span className="cockpit-settings-label" style={{ fontSize: '12px' }}>
                  {s.name.replace(/_/g, ' ')}
                </span>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span className="cockpit-settings-value" style={{ fontSize: '11px' }}>{s.found} found</span>
                  <span className="cockpit-settings-value" style={{ fontSize: '11px', color: s.replyRate > 20 ? 'var(--grn)' : s.replyRate > 10 ? 'var(--gold)' : 'var(--t3)' }}>
                    {s.replyRate}% reply
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {botDashboard.bestStrategy && (
          <div className="cockpit-settings-item" style={{ marginTop: '8px', borderColor: 'rgba(0,207,196,0.3)' }}>
            <span className="cockpit-settings-label">Meilleure stratégie</span>
            <span className="cockpit-settings-value" style={{ color: 'var(--grn)' }}>
              {botDashboard.bestStrategy.name.replace(/_/g, ' ')} ({botDashboard.bestStrategy.replyRate}% reply)
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="cockpit-container">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {renderGrain()}

      {/* Topbar */}
      <div className="cockpit-topbar">
        <div
          style={{
            fontFamily: 'var(--disp)',
            fontSize: '18px',
            letterSpacing: '1px',
            color: 'var(--cyan)',
            marginRight: '24px',
            cursor: 'default',
            userSelect: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          GHOST TAX
        </div>
        <div className="cockpit-kpis">
          <div className="cockpit-kpi">
            <div className="cockpit-kpi-label">Pipeline</div>
            <div className="cockpit-kpi-value">
              {fmtEur(state.cockpitState?.pipelineValueEUR || 0)}
            </div>
          </div>
          <div className="cockpit-kpi">
            <div className="cockpit-kpi-label">Revenue</div>
            <div className="cockpit-kpi-value">
              {fmtEur(state.cockpitState?.revenueEUR || 0)}
            </div>
          </div>
          <div className="cockpit-kpi">
            <div className="cockpit-kpi-label">Sent</div>
            <div className="cockpit-kpi-value">{state.cockpitState?.totalSent || 0}</div>
          </div>
          <div className="cockpit-kpi">
            <div className="cockpit-kpi-label">Replied</div>
            <div className="cockpit-kpi-value">{state.cockpitState?.totalReplied || 0}</div>
          </div>
          <div className="cockpit-kpi">
            <div className="cockpit-kpi-label">Follow-ups</div>
            <div className="cockpit-kpi-value">{state.cockpitState?.followUpsDue || 0}</div>
          </div>
        </div>

        <div className="cockpit-sync">
          <div className="cockpit-sync-pulse" />
          Synced
        </div>

        <div style={{ padding: '4px 10px', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '4px', fontSize: '11px', color: '#a78bfa', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
          {todayStrategy.replace(/_/g, ' ').toUpperCase()}
        </div>

        <div className="cockpit-topbar-right">
          <button className="cockpit-btn-primary" onClick={handleProspecter} disabled={huntLoading} style={{ opacity: huntLoading ? 0.6 : 1 }}>
            {huntLoading ? '⏳ Chasse...' : '+ Prospecter'}
          </button>
          <button
            className={`cockpit-mode-toggle ${state.mode === 'autonome' ? 'active' : ''}`}
            onClick={() =>
              setState((s) => ({
                ...s,
                mode: s.mode === 'assisté' ? 'autonome' : 'assisté',
              }))
            }
          >
            {state.mode === 'assisté' ? '✋' : '🤖'}
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="cockpit-main">
        {/* Sidebar */}
        <div className="cockpit-sidebar">
          {[
            { view: 'cockpit', icon: '🎯' },
            { view: 'apollo', icon: '🔍' },
            { view: 'sequences', icon: '📬' },
            { view: 'linkedin', icon: '🔗' },
            { view: 'settings', icon: '⚙️' },
          ].map((item) => (
            <div
              key={item.view}
              className={`cockpit-nav-icon ${state.view === item.view ? 'active' : ''}`}
              onClick={() => setState((s) => ({ ...s, view: item.view as View }))}
              title={item.view}
            >
              {item.icon}
            </div>
          ))}
        </div>

        {/* Views */}
        <div className={`cockpit-view ${state.view === 'cockpit' ? 'active' : ''}`}>
          {renderCockpitView()}
        </div>
        <div className={`cockpit-view ${state.view === 'apollo' ? 'active' : ''}`}>
          {renderApolloView()}
        </div>
        <div className={`cockpit-view ${state.view === 'sequences' ? 'active' : ''}`}>
          {renderSequencesView()}
        </div>
        <div className={`cockpit-view ${state.view === 'linkedin' ? 'active' : ''}`}>
          {renderLinkedInView()}
        </div>
        <div className={`cockpit-view ${state.view === 'settings' ? 'active' : ''}`}>
          {renderSettingsView()}
        </div>
      </div>

      {/* Approval Overlay */}
      {currentApprovalItem && (
        <div className={`cockpit-approval-overlay ${showApprovalOverlay ? 'active' : ''}`}>
          <div className="cockpit-approval-card">
            <div className="cockpit-approval-header">
              {renderHeatRing(currentApprovalItem.account, 80)}
              <div className="cockpit-approval-title">
                <div className="cockpit-approval-company">{currentApprovalItem.account.company}</div>
                <div className="cockpit-approval-domain">{currentApprovalItem.account.domain}</div>
              </div>
            </div>

            <div className="cockpit-approval-content">
              <div className="cockpit-approval-section">
                <div className="cockpit-approval-section-title">Channel</div>
                <div className="cockpit-approval-section-value">{currentApprovalItem.channel}</div>
              </div>

              <div className="cockpit-approval-section">
                <div className="cockpit-approval-section-title">Contact</div>
                <div className="cockpit-approval-section-value">
                  {currentApprovalItem.contactEmail || currentApprovalItem.contactLinkedin || 'Unknown'}
                </div>
              </div>

              <div className="cockpit-approval-section">
                <div className="cockpit-approval-section-title">Confidence</div>
                <div className="cockpit-approval-section-value">{currentApprovalItem.confidenceScore}%</div>
              </div>

              <div className="cockpit-approval-section">
                <div className="cockpit-approval-section-title">Daily Loss</div>
                <div className="cockpit-approval-section-value">
                  {fmtEur(currentApprovalItem.dailyLoss)}
                </div>
              </div>

              <div className="cockpit-approval-section">
                <div className="cockpit-approval-section-title">Message</div>
                <div className="cockpit-approval-message-box">{currentApprovalItem.message.body}</div>
              </div>
            </div>

            <div className="cockpit-approval-actions">
              <button
                className="cockpit-approval-btn cockpit-approval-btn-approve"
                onClick={handleApprove}
              >
                Approve (Enter)
              </button>
              <button
                className="cockpit-approval-btn cockpit-approval-btn-skip"
                onClick={handleSkip}
              >
                Skip (←)
              </button>
            </div>

            <div className="cockpit-approval-footer">
              {state.approvalQueueIndex + 1} / {state.cockpitState?.approvalQueue.length || 0}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
