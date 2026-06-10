import { db } from '@/lib/db';

// GET - List FAQ items (public)
export async function GET() {
  try {
    const faqItems = await db.platformSettings.findMany({
      where: {
        key: {
          startsWith: 'faq_',
        },
      },
      orderBy: { key: 'asc' },
    });

    // Parse the FAQ items - value is expected to be JSON with question/answer
    const faqs = faqItems.map((item) => {
      try {
        const parsed = JSON.parse(item.value);
        return {
          id: item.id,
          key: item.key,
          question: parsed.question || item.key,
          answer: parsed.answer || item.value,
          order: parsed.order || 0,
        };
      } catch {
        // If value is not valid JSON, treat the key as question and value as answer
        return {
          id: item.id,
          key: item.key,
          question: item.key.replace('faq_', '').replace(/_/g, ' '),
          answer: item.value,
          order: 0,
        };
      }
    });

    // Sort by order
    faqs.sort((a, b) => a.order - b.order);

    return Response.json({ faqs });
  } catch (error) {
    console.error('Error fetching FAQ items:', error);
    return Response.json(
      { error: 'Failed to fetch FAQ items' },
      { status: 500 }
    );
  }
}
