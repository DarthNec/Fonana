import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  // Получаем все переменные, связанные с нашим приложением
  const relevantVars = Object.keys(process.env)
    .filter(key => 
      key.includes('NEXTAUTH') || 
      key.includes('DATABASE') || 
      key === 'NODE_ENV' ||
      key === 'PORT'
    )
    .reduce((acc, key) => {
      acc[key] = process.env[key] || 'not-set';
      return acc;
    }, {} as Record<string, string>);

  // Маскируем чувствительные данные
  const masked = Object.entries(relevantVars).reduce((acc, [key, value]) => {
    if (key.includes('SECRET') || key.includes('PASSWORD')) {
      if (value && value !== 'not-set' && value.length > 10) {
        acc[key] = value.substring(0, 6) + '...' + value.substring(value.length - 4);
      } else {
        acc[key] = value;
      }
    } else {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, string>);

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    pid: process.pid,
    variables: masked,
    envCount: Object.keys(process.env).length,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    nextAuthSecretLength: process.env.NEXTAUTH_SECRET?.length || 0
  });
} 