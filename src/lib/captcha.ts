import crypto from 'crypto';

const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || 'writercraft-reviewer-captcha-secret-2026';
const CAPTCHA_TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface CaptchaData {
  key: string;
  question: string;
  svg: string;
}

/**
 * Generate a dynamic math captcha challenge (e.g., 7 + 8 = ?)
 */
export function generateMathCaptcha(): CaptchaData {
  const isAddition = Math.random() > 0.35;
  // Single-digit arithmetic (1 ~ 9) ensures standard bounded length (e.g. "8 + 5 = ?")
  let num1 = Math.floor(Math.random() * 9) + 1;
  let num2 = Math.floor(Math.random() * 9) + 1;

  if (!isAddition && num1 < num2) {
    [num1, num2] = [num2, num1]; // Ensure non-negative result
  }

  const op = isAddition ? '+' : '-';
  const answer = isAddition ? num1 + num2 : num1 - num2;
  const question = `${num1} ${op} ${num2} = ?`;
  const timestamp = Date.now();

  // Create HMAC signature
  const payload = `${answer}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', CAPTCHA_SECRET).update(payload).digest('hex');
  const key = Buffer.from(JSON.stringify({ a: answer, t: timestamp, s: hmac })).toString('base64');

  // Generate lightweight textured SVG for aesthetic rendering
  const svg = generateMathSvg(question);

  return { key, question, svg };
}

/**
 * Verify user answer against the encrypted captcha key
 */
export function verifyMathCaptcha(key: string, userAnswer: string | number): boolean {
  if (!key || userAnswer === undefined || userAnswer === null) {
    return false;
  }

  try {
    const raw = Buffer.from(key, 'base64').toString('utf-8');
    const { a, t, s } = JSON.parse(raw);

    // Check expiration (10 minutes)
    if (Date.now() - t > CAPTCHA_TTL_MS) {
      return false;
    }

    // Check signature
    const expectedHmac = crypto.createHmac('sha256', CAPTCHA_SECRET).update(`${a}:${t}`).digest('hex');
    if (s !== expectedHmac) {
      return false;
    }

    // Check answer:
    // 1. Normalize full-width digits (全角数字) to half-width (半角数字)
    // 2. Remove any whitespace
    const cleanStr = String(userAnswer)
      .trim()
      .replace(/[\uFF10-\uFF19]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
      .replace(/\s+/g, '');

    const parsedUser = parseInt(cleanStr, 10);
    if (isNaN(parsedUser)) {
      return false;
    }

    return parsedUser === a;
  } catch {
    return false;
  }
}

/**
 * Generates an SVG representation of the math question with gentle noise lines
 * Uses a 150x40 canvas with ample padding so text is never truncated.
 */
function generateMathSvg(text: string): string {
  const width = 150;
  const height = 40;
  
  // Random subtle slant (-1.5 to 1.5 deg)
  const rotate = (Math.random() * 3 - 1.5).toFixed(1);

  // Dynamic noise lines
  const y1 = 14 + Math.floor(Math.random() * 8);
  const y2 = 12 + Math.floor(Math.random() * 16);
  const y3 = 18 + Math.floor(Math.random() * 10);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" class="select-none">
    <rect width="100%" height="100%" fill="#F1F5F9" rx="8" />
    <path d="M 10,${y1} Q 75,${y2} 140,${y3}" stroke="#CBD5E1" stroke-width="1.5" fill="none" opacity="0.6" />
    <path d="M 12,${y3} Q 75,${y1} 138,${y2}" stroke="#CBD5E1" stroke-width="1.2" fill="none" opacity="0.4" />
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-weight="700" font-size="17" fill="#1E293B" transform="rotate(${rotate} 75 20)" letter-spacing="1">
      ${text}
    </text>
  </svg>`;
}
