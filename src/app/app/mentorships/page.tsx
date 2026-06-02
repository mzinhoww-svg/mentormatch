import { headers } from 'next/headers';
import { requireSession } from '../../../auth/requireSession.js';
import { MentorshipsView } from '../../../ui/views/MentorshipsView.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function Page() {
  const h = await headers();
  const session = await requireSession(h.get('host'), h.get('cookie'));
  return <MentorshipsView currentUserId={session.userId} />;
}
