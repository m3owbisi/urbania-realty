import StaticScene from '@/components/StaticScene';
import data from '@/data/project.json';
export default function Page() { return <StaticScene background={data.amenities.background} active="/amenities" />; }
