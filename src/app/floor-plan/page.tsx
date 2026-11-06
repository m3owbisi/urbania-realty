import StaticScene from '@/components/StaticScene';
import data from '@/data/project.json';
export default function Page() { return <StaticScene background={data.floorPlan.background} active="/floor-plan" />; }
