import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role') || 'FACULTY';
    const section = searchParams.get('section');

    const db = getDb();
    let query = 'SELECT * FROM evaluation_categories WHERE role = ?';
    const params: any[] = [role.toUpperCase()];

    if (section) {
      query += ' AND section = ?';
      params.push(section);
    }

    query += ' ORDER BY order_num ASC';

    const categories = db.prepare(query).all(...params);

    // Sum max marks
    const totalMaxMarks = categories.reduce((sum: number, c: any) => sum + c.max_marks, 0);

    return NextResponse.json({
      success: true,
      categories,
      totalMaxMarks,
      count: categories.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
