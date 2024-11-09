import { NextResponse, type NextRequest } from 'next/server';

const notes = [{ id: 1, title: 'Note 1', content: 'Content 1' }];

export const GET = async (req: NextRequest) => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return NextResponse.json({
    records: notes,
  });
};

export const POST = async (req: NextRequest) => {
  const note = await req.json();
  const id = notes.length + 1;
  notes.push({ ...note, id });
  return NextResponse.json({
    id,
  });
};

export const DELETE = async (req: NextRequest) => {
  const { id } = await req.json();
  const index = notes.findIndex((note) => note.id === id);
  if (index !== -1) {
    notes.splice(index, 1);
  }
  return new Response(null, { status: 204 });
};
