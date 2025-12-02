import Header from '@/components/Header';
import GanttView from '@/components/GanttView';
import { mockTasks, mockLinks } from '@/services/mockData';

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <GanttView tasks={mockTasks} links={mockLinks} />
      </main>
    </>
  );
}
