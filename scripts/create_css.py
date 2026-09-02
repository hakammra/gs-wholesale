import os

css_content = """
:root {
  --bg: #090d16;
  --panel: #0f172a;
  --panel-hover: #1e293b;
  --bg-subtle: #131d31;
  --bg-input: #0b1120;
  --border: #1e293b;
  --border-subtle: #1e293b;
  --border-focus: #38bdf8;
  
  --text: #f8fafc;
  --text-muted: #94a3b8;
  --text-dim: #64748b;
  
  --primary: #0284c7;
  --primary-hover: #0369a1;
  --primary-subtle: rgba(2, 132, 199, 0.15);
  
  --success: #10b981;
  --success-subtle: rgba(16, 185, 129, 0.15);
  
  --warning: #f59e0b;
  --warning-subtle: rgba(245, 158, 11, 0.15);
  
  --danger: #ef4444;
  --danger-subtle: rgba(239, 68, 68, 0.15);
  
  --purple: #8b5cf6;
  --purple-subtle: rgba(139, 92, 246, 0.15);
  
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -2px rgba(0, 0, 0, 0.2);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.3);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: var(--bg);
  color: var(--text);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.mono {
  font-family: 'JetBrains Mono', monospace;
}

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: var(--bg);
}
::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #475569;
}

/* Card */
.card {
  background-color: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background-color: var(--primary);
  color: #ffffff;
}
.btn-primary:hover:not(:disabled) {
  background-color: var(--primary-hover);
}

.btn-secondary {
  background-color: var(--panel-hover);
  color: var(--text);
  border-color: var(--border);
}
.btn-secondary:hover:not(:disabled) {
  background-color: #334155;
  border-color: #475569;
}

.btn-success {
  background-color: var(--success);
  color: #ffffff;
}
.btn-success:hover:not(:disabled) {
  background-color: #059669;
}

.btn-danger {
  background-color: var(--danger);
  color: #ffffff;
}
.btn-danger:hover:not(:disabled) {
  background-color: #dc2626;
}

.btn-sm {
  padding: 5px 10px;
  font-size: 12px;
}

.btn-lg {
  padding: 12px 20px;
  font-size: 15px;
}

.btn-icon {
  padding: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Forms */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.form-input, .form-select, .form-textarea {
  width: 100%;
  font-family: inherit;
  font-size: 13.5px;
  padding: 8px 12px;
  background-color: var(--bg-input);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color 0.15s ease;
}

.form-input:focus, .form-select:focus, .form-textarea:focus {
  border-color: var(--border-focus);
}

.form-input::placeholder, .form-textarea::placeholder {
  color: var(--text-dim);
}

/* Table */
.table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 13px;
}

.table th {
  background-color: var(--bg-subtle);
  color: var(--text-dim);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
}

.table td {
  padding: 11px 14px;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text);
}

.table tr:hover td {
  background-color: rgba(255, 255, 255, 0.02);
}

/* Badges */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
}

.badge-primary {
  background-color: var(--primary-subtle);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
}

.badge-success {
  background-color: var(--success-subtle);
  color: #34d399;
  border: 1px solid rgba(52, 211, 153, 0.3);
}

.badge-warning {
  background-color: var(--warning-subtle);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.badge-danger {
  background-color: var(--danger-subtle);
  color: #f87171;
  border: 1px solid rgba(248, 113, 113, 0.3);
}

.badge-purple {
  background-color: var(--purple-subtle);
  color: #c084fc;
  border: 1px solid rgba(192, 132, 252, 0.3);
}

.badge-neutral {
  background-color: #1e293b;
  color: var(--text-muted);
  border: 1px solid #334155;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fadeIn 0.2s ease forwards;
}
"""

os.makedirs('src', exist_ok=True)
with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(css_content.strip() + '\n')

print("Created src/index.css")
