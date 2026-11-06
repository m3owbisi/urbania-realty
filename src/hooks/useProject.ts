import data from '@/data/project.json';
import type { Project } from '@/types/project';

export function useProject(): Project {
  return data;
}
