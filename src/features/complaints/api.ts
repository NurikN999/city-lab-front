import { request } from '../../shared/lib/api'
import { complaintSchema, type Complaint, type ComplaintCategory } from '../../shared/lib/schemas'

export function sendComplaint(body: { district_id: number; category: ComplaintCategory; text: string }): Promise<Complaint> {
  return request('/complaints', complaintSchema, { method: 'POST', body })
}

export function setComplaintStatus(id: number, status: 'resolved' | 'hidden', token: string): Promise<Complaint> {
  return request(`/complaints/${id}`, complaintSchema, { method: 'PUT', body: { status }, token })
}
