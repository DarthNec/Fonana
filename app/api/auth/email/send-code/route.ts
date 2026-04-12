import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import nodemailer from 'nodemailer'
import bcrypt from 'bcryptjs'
import { checkRateLimit, getClientIP } from '@/lib/utils/rateLimit'

export async function POST(req: Request) {
  try {
    // 🔥 RATE LIMITING: 5 запросов в минуту
    const clientIP = getClientIP(req)
    const { limited, remaining, resetAt } = checkRateLimit(clientIP, 5, 60 * 1000)
    
    if (limited) {
      const resetIn = Math.ceil((resetAt - Date.now()) / 1000)
      console.log(`⚠️ [EMAIL SIGNUP] Rate limit exceeded for IP: ${clientIP}`)
      
      return NextResponse.json(
        { 
          error: `Too many requests. Please try again in ${resetIn} seconds.`,
          retryAfter: resetIn
        },
        { 
          status: 429,
          headers: {
            'Retry-After': resetIn.toString(),
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(resetAt).toISOString()
          }
        }
      )
    }
    
    console.log(`✅ [EMAIL SIGNUP] Rate limit OK for IP: ${clientIP}, remaining: ${remaining}`)

    const { email, password } = await req.json()

    // Валидация
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Проверяем формат email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Проверяем длину пароля
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Проверяем, существует ли пользователь с таким email
    const existingUser = await prisma.user.findFirst({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Генерируем 6-значный код
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10)

    // Устанавливаем время истечения кода (10 минут)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    // Удаляем старые коды для этого email (если есть)
    await prisma.emailVerificationCode.deleteMany({
      where: { email: email.toLowerCase() }
    })

    // Сохраняем новый код в базу
    await prisma.emailVerificationCode.create({
      data: {
        email: email.toLowerCase(),
        code: verificationCode,
        password: hashedPassword,
        expiresAt
      }
    })

    // Настраиваем nodemailer
    const transporter = nodemailer.createTransport({
      host: 'mail.privateemail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })

    // Формируем текст письма
    const emailText = `
Welcome to Fonana! 🎨

Your email verification code is:

${verificationCode}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

Best regards,
Fonana Team
    `.trim()

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center;">
              <h1 style="margin: 0; color: #7c3aed; font-size: 28px;">Fonana</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <h2 style="color: #333333; font-size: 24px; margin: 0 0 20px 0;">Welcome to Fonana! 🎨</h2>
              <p style="color: #666666; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                Your email verification code is:
              </p>
              
              <!-- Verification Code -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <div style="background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); color: #ffffff; font-size: 32px; font-weight: bold; padding: 20px 40px; border-radius: 8px; letter-spacing: 8px;">
                      ${verificationCode}
                    </div>
                  </td>
                </tr>
              </table>
              
              <p style="color: #666666; font-size: 14px; line-height: 20px; margin: 20px 0 0 0;">
                This code will expire in <strong>10 minutes</strong>.
              </p>
              
              <p style="color: #999999; font-size: 12px; line-height: 18px; margin: 20px 0 0 0;">
                If you didn't request this code, please ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f8f8f8; border-radius: 0 0 8px 8px;">
              <p style="color: #999999; font-size: 12px; line-height: 18px; margin: 0; text-align: center;">
                Best regards,<br>
                <strong>Fonana Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()

    // Отправляем письмо
    await transporter.sendMail({
      from: `"Fonana" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Fonana Verification Code',
      text: emailText,
      html: emailHtml
    })

    console.log(`✅ [EMAIL SIGNUP] Verification code sent to ${email}`)

    return NextResponse.json({ 
      success: true,
      message: 'Verification code sent to your email'
    }, {
      headers: {
        'X-RateLimit-Limit': '5',
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': new Date(resetAt).toISOString()
      }
    })

  } catch (error) {
    console.error('❌ [EMAIL SIGNUP] Error:', error)
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    )
  }
}
