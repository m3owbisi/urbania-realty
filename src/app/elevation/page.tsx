import StaticScene from '@/components/StaticScene';
import data from '@/data/project.json';
export default function Page() { return <StaticScene entry background={data.elevation.background} active="/elevation" />; }
