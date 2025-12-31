import { Badge } from './Badge';

export function OrgStatusBadge({ status }: { status: string }) {
    return <Badge tone={status === 'ACTIVE' ? 'success' : 'danger'}>{status}</Badge>;
}
