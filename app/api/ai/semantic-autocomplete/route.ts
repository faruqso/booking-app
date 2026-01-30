/**
 * Semantic Service Autocomplete API
 * Path: paid + gateway + vector DB implemented → semantic search; else → fuzzy matching (Fuse.js).
 * When AI Gateway embeddings and a vector store are added, add a branch that tries semantic search when hasBudget.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { SERVICE_DATABASE } from '@/lib/ai/service-database';
import Fuse from 'fuse.js';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.businessId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { query, limit = 10 } = body;

    if (!query || typeof query !== 'string' || query.length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    const fuse = new Fuse(SERVICE_DATABASE, {
      keys: ['name', 'category', 'tags'],
      threshold: 0.4,
      includeScore: true,
    });

    const results = fuse.search(query);
    const suggestions = results
      .slice(0, limit)
      .map((result) => ({
        name: result.item.name,
        category: result.item.category,
        typicalDuration: result.item.typicalDuration,
        priceRange: result.item.priceRange,
        tags: result.item.tags,
        score: result.score,
      }));

    return NextResponse.json({
      suggestions,
      source: 'fuzzy-matching',
      query,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Semantic autocomplete error:', message);
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    );
  }
}
