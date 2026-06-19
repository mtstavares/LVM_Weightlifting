import { redirect } from 'next/navigation';

export default async function LegacyTrainerAthletePage({
  params
}: {
  params: Promise<{ athleteId: string }>;
}) {
  const { athleteId } = await params;
  redirect(`/trainer/athletes/${athleteId}`);
}
