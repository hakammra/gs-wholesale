import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print(f'Wrote {path}')

# .env.example
write_file('.env.example', """
VITE_SUPABASE_URL=https://your-wholesale-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-wholesale-anon-key
""")

# .env
write_file('.env', """
VITE_SUPABASE_URL=https://placeholder-gs-wholesale.supabase.co
VITE_SUPABASE_ANON_KEY=placeholder-anon-key
""")

# .gitignore
write_file('.gitignore', """
node_modules
dist
dist-ssr
*.local
.env
.env.*.local
.DS_Store
*.log
""")

# vite.config.js
write_file('vite.config.js', """
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    open: true
  }
});
""")

# index.html
write_file('index.html', """
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GS Wholesale POS | Computer Products Distribution</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
""")

# src/index.css
write_file('src/index.css', """
:root {
  --bg: #121417;
  --bg-subtle: #181b20;
  --panel: #1f232b;
  --panel-hover: #262c36;
  --panel-active: #2d3440;
  --border: #323946;
  --border-subtle: #252b36;
  --text: #f3f4f6;
  --text-muted: #9ca3af;
  --text-dim: #6b7280;
  
  --primary: #0284c7;
  --primary-hover: #0369a1;
  --primary-subtle: rgba(2, 132, 199, 0.15);
  
  --success: #10b981;
  --success-subtle: rgba(16, 185, 129, 0.15);
  --warning: #f59e0b;
  --warning-subtle: rgba(245, 158, 11, 0.15);
  --danger: #ef4444;
  --danger-subtle: rgba(239, 68, 68, 0.15);
  --info: #3b82f6;
  --info-subtle: rgba(59, 130, 246, 0.15);
  --purple: #8b5cf6;
  --purple-subtle: rgba(139, 92, 246, 0.15);

  --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --radius: 8px;
  --radius-sm: 4px;
  --radius-lg: 12px;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-sans);
  background-color: var(--bg);
  color: var(--text);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

button, input, select, textarea {
  font-family: inherit;
  font-size: 14px;
}

/* Custom Scrollbars */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: var(--bg-subtle);
}
::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--text-dim);
}

/* Base utility classes */
.app-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 270px;
  background: var(--bg-subtle);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  height: 100vh;
  position: sticky;
  top: 0;
  overflow-y: auto;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100vh;
  overflow-y: auto;
}

.header {
  height: 64px;
  background: var(--bg-subtle);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 20;
}

.page-container {
  padding: 24px;
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
}

/* Card */
.card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

/* Form Controls */
.form-group {
  margin-bottom: 16px;
}
.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 6px;
}
.form-input, .form-select, .form-textarea {
  width: 100%;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  padding: 9px 12px;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.form-input:focus, .form-select:focus, .form-textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-subtle);
}
.form-input::placeholder, .form-textarea::placeholder {
  color: var(--text-dim);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  font-weight: 600;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
  text-decoration: none;
  white-space: nowrap;
}
.btn-primary {
  background: var(--primary);
  color: white;
}
.btn-primary:hover {
  background: var(--primary-hover);
}
.btn-secondary {
  background: var(--panel);
  border-color: var(--border);
  color: var(--text);
}
.btn-secondary:hover {
  background: var(--panel-hover);
  border-color: var(--text-dim);
}
.btn-success {
  background: var(--success);
  color: white;
}
.btn-danger {
  background: var(--danger);
  color: white;
}
.btn-warning {
  background: var(--warning);
  color: #1a1a1a;
}
.btn-sm {
  padding: 5px 10px;
  font-size: 12px;
}
.btn-lg {
  padding: 12px 24px;
  font-size: 16px;
}
.btn-icon {
  padding: 8px;
  border-radius: var(--radius-sm);
}

/* Tables */
.table-container {
  overflow-x: auto;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius);
  background: var(--panel);
}
.table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 13.5px;
}
.table th {
  background: var(--bg-subtle);
  color: var(--text-muted);
  font-weight: 700;
  text-transform: uppercase;
  font-size: 11.5px;
  letter-spacing: 0.05em;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}
.table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text);
}
.table tr:last-child td {
  border-bottom: none;
}
.table tbody tr:hover {
  background: var(--panel-hover);
}

/* Badges */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 700;
}
.badge-primary { background: var(--primary-subtle); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.2); }
.badge-success { background: var(--success-subtle); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.2); }
.badge-warning { background: var(--warning-subtle); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.2); }
.badge-danger { background: var(--danger-subtle); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.2); }
.badge-purple { background: var(--purple-subtle); color: #a78bfa; border: 1px solid rgba(167, 139, 250, 0.2); }
.badge-neutral { background: var(--panel-hover); color: var(--text-muted); border: 1px solid var(--border); }

/* Modal Overlay */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  z-index: 50;
  padding: 20px;
  overflow-y: auto;
}
.modal-content {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 650px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
  animation: modalIn 0.15s ease-out;
}
.modal-lg { max-width: 950px; }
.modal-xl { max-width: 1200px; }

@keyframes modalIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}
.modal-body {
  padding: 20px;
  max-height: 80vh;
  overflow-y: auto;
}
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border);
  background: var(--bg-subtle);
}

/* POS Screen Specifics */
.pos-layout {
  display: grid;
  grid-template-columns: 1fr 420px;
  height: calc(100vh - 64px);
  overflow: hidden;
}

.pos-products-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-right: 1px solid var(--border-subtle);
  overflow: hidden;
}

.pos-cart-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--panel);
}

.pos-cart-items {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.pos-cart-summary {
  background: var(--bg-subtle);
  border-top: 1px solid var(--border);
  padding: 16px 20px;
  flex-shrink: 0;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.stat-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.stat-title {
  font-size: 13px;
  color: var(--text-muted);
  font-weight: 600;
}
.stat-value {
  font-size: 22px;
  font-weight: 800;
  color: var(--text);
  margin-top: 2px;
  font-family: var(--font-mono);
}

/* Number Monospace */
.mono {
  font-family: var(--font-mono);
}
""")

print("Base setup files written successfully.")
""")
