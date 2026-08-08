import { NextResponse } from 'next/server';
import { listProjects, createProject } from '@/lib/store';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ projects: listProjects() });
}

export async function POST(req: Request) {
  const { name = '', names = [] } = await req.json();
  const project = createProject(name, Array.isArray(names) ? names : []);
  return NextResponse.json({ project });
}
