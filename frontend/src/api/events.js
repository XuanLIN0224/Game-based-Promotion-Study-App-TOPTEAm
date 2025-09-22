import { api } from './client';

export const EventsAPI = {
  getActive: () => api('/events/active'),
  getStatus: (id) => api(`/teacher/events/${id}/status`),
  listAll: () => api('/teacher/events'),
  create: (payload) => api('/teacher/events', { method: 'POST', body: payload }),
  update: (id, payload) => api(`/teacher/events/${id}`, { method: 'PUT', body: payload }),
  remove: (id) => api(`/teacher/events/${id}`, { method: 'DELETE' }),
};