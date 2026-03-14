import { NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/dashboard';

export async function GET() {
  try {
    const data = await getDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Load dashboard failed:', error);
    return NextResponse.json({ error: '加载工作台失败' }, { status: 500 });
  }
}
