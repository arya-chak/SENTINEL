const BASE = 'http://localhost:8000/api'

export const api = {
  getEntities: () =>
    fetch(`${BASE}/entities`).then(r => r.json()),

  getSimState: () =>
    fetch(`${BASE}/state`).then(r => r.json()),

  getScore: (id: string) =>
    fetch(`${BASE}/entities/${id}/score`).then(r => r.json()),

  getExplain: (id: string) =>
    fetch(`${BASE}/entities/${id}/explain`).then(r => r.json()),

  decide: (id: string, decision: string, classifier_score: number) =>
    fetch(`${BASE}/entities/${id}/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, classifier_score }),
    }).then(r => r.json()),

  command: (id: string, command: string, assigned_target_id?: string) =>
    fetch(`${BASE}/entities/${id}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, assigned_target_id }),
    }).then(r => r.json()),
}
