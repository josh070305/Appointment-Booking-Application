import { Request, Response, NextFunction } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ENV } from '../config/env.js';

interface ParsedSlotQuery {
  date?: string; // YYYY-MM-DD
  timeOfDay?: 'morning' | 'afternoon' | 'evening';
  service?: string;
  summary: string;
  source: 'gemini' | 'heuristic';
}

function parseWithHeuristics(query: string, referenceDate: Date = new Date()): ParsedSlotQuery {
  const lower = query.toLowerCase();
  let timeOfDay: 'morning' | 'afternoon' | 'evening' | undefined;
  let service: string | undefined;
  let targetDate: string | undefined;

  // Time of day
  if (lower.includes('morning') || lower.includes('am') || lower.includes('early')) {
    timeOfDay = 'morning';
  } else if (lower.includes('afternoon') || lower.includes('noon') || lower.includes('lunch')) {
    timeOfDay = 'afternoon';
  } else if (lower.includes('evening') || lower.includes('pm') || lower.includes('night')) {
    timeOfDay = 'evening';
  }

  // Service matching
  if (lower.includes('dent') || lower.includes('teeth') || lower.includes('tooth')) {
    service = 'Dental Checkup';
  } else if (lower.includes('cardio') || lower.includes('heart')) {
    service = 'Cardiology Consultation';
  } else if (lower.includes('derma') || lower.includes('skin')) {
    service = 'Dermatology';
  } else if (lower.includes('eye') || lower.includes('vision') || lower.includes('opt')) {
    service = 'Eye Examination';
  } else if (lower.includes('therapy') || lower.includes('physio')) {
    service = 'Physical Therapy';
  } else if (lower.includes('general') || lower.includes('doctor') || lower.includes('consult')) {
    service = 'General Consultation';
  }

  // Date parsing (today, tomorrow, day of week)
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayIndex = daysOfWeek.findIndex(d => lower.includes(d));

  if (lower.includes('today')) {
    targetDate = referenceDate.toISOString().split('T')[0];
  } else if (lower.includes('tomorrow')) {
    const tmrw = new Date(referenceDate);
    tmrw.setDate(tmrw.getDate() + 1);
    targetDate = tmrw.toISOString().split('T')[0];
  } else if (dayIndex !== -1) {
    const currentDay = referenceDate.getDay();
    let diff = dayIndex - currentDay;
    if (diff <= 0) diff += 7; // Next occurrence
    const target = new Date(referenceDate);
    target.setDate(target.getDate() + diff);
    targetDate = target.toISOString().split('T')[0];
  }

  return {
    date: targetDate,
    timeOfDay,
    service,
    summary: `Looking for ${service || 'any service'}${targetDate ? ` on ${targetDate}` : ''}${timeOfDay ? ` (${timeOfDay})` : ''}`,
    source: 'heuristic'
  };
}

export async function parseAssistantQuery(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const { query } = req.body;

  if (!query || typeof query !== 'string') {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_QUERY', message: 'Query string is required' }
    });
    return;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const dayOfWeekStr = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];

  // If Gemini API key is available, attempt AI parsing
  if (ENV.GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `You are an appointment booking natural language parser.
Current date today is: ${todayStr} (${dayOfWeekStr}).

User request: "${query}"

Extract the following JSON strictly with no markdown formatting:
{
  "date": "YYYY-MM-DD or null if not specified",
  "timeOfDay": "morning" | "afternoon" | "evening" | null,
  "service": "search keyword for service or null (e.g. Dental, Cardiology, General Consultation, Dermatology)",
  "summary": "Short 1-sentence friendly confirmation of what the user is searching for"
}`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      const cleanJson = responseText.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      res.status(200).json({
        success: true,
        data: {
          ...parsed,
          source: 'gemini'
        }
      });
      return;
    } catch (geminiError: any) {
      console.warn('Gemini API query parsing failed, falling back gracefully to heuristic parsing:', geminiError.message);
    }
  }

  // Graceful fallback to heuristic parser
  const fallbackResult = parseWithHeuristics(query);
  res.status(200).json({
    success: true,
    data: fallbackResult
  });
}
