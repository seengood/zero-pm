import Header from '@/components/Header';
import ProjectList from '@/components/ProjectList';
import { getProjects } from '@/lib/projects';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: projects } = await getProjects(supabase);

  return (
    <>
      <Header />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <ProjectList initialProjects={projects || []} />
      </main>
    </>
  );
}


